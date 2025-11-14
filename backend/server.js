const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const Redis = require('ioredis');
const { parseFeed } = require('./opdsParser');
const sanitizeHtml = require('sanitize-html');

const app = express();

app.use(helmet());
app.use(compression());

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,https://storyweaver-zeta.vercel.app';
const allowedOrigins = allowedOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS policy: origin not allowed'));
    }
  }
}));

// --- Rate limiter ---
const limiter = rateLimit({
  windowMs: Number(/*process.env.RATE_LIMIT_WINDOW_MS ||*/ 15 * 60 * 1000),
  max: Number(/*process.env.RATE_LIMIT_MAX ||*/ 200),
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

const REDIS_URL = /*process.env.REDIS_URL || */'';
const CACHE_FILE = /*process.env.CACHE_FILE || */path.resolve(__dirname, 'opds_cache.json');
let redisClient = null;
let useRedis = false;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL);
    useRedis = true;
    redisClient.on('error', (e) => console.error('Redis error', e && e.message ? e.message : e));
  } catch (err) {
    console.warn('Failed to init Redis, falling back to file cache', err && err.message ? err.message : err);
    useRedis = false;
  }
}


let inMemoryCache = {
  main: { fetchedAt: 0, languages: {} },
  languages: {}
};

// helper: persist to file (async)
async function persistToFileCache(obj) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(obj), { encoding: 'utf8' });
  } catch (err) {
    console.warn('Failed to write cache file:', err && err.message ? err.message : err);
  }
}

// helper: read file cache
async function readFileCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

// internal: get cache (from redis or file or in-memory)
async function getCacheObject() {
  if (useRedis && redisClient) {
    try {
      const raw = await redisClient.get('opds_cache_v1');
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn('Redis read failed', err && err.message ? err.message : err);
    }
  }

  // try file
  const fileCache = await readFileCache();
  if (fileCache) return fileCache;

  // fallback to in-memory
  return inMemoryCache;
}

// internal: set cache object
async function setCacheObject(obj) {
  inMemoryCache = obj;
  if (useRedis && redisClient) {
    try {
      await redisClient.set('opds_cache_v1', JSON.stringify(obj), 'EX', 60 * 60); // 1h TTL in redis (best-effort)
    } catch (err) {
      console.warn('Redis write failed', err && err.message ? err.message : err);
    }
  }
  // also persist to file (best-effort)
  persistToFileCache(obj).catch(() => { });
}

// OPDS source (MAIN catalog — contains facet links to language catalogs)
const OPDS_URL = /*process.env.OPDS_URL || */'https://storage.googleapis.com/story-weaver-e2e-production/catalog/catalog.xml';
const CACHE_TTL_MS = Number(/*process.env.CACHE_TTL_MS || */1000 * 60 * 10); // default 10 minutes

// --- Helpers for caching and parsing main vs language feeds ---

/**
 * parseMainCatalog()
 * - Ensures main catalog (catalog.xml) is parsed and cached.
 * - Builds main.languages map: { "<LanguageTitle>": { title, href } }
 */
async function parseMainCatalog(force = false) {
  const cacheObj = await getCacheObject();

  // If cached main is fresh, return it
  if (!force && cacheObj && cacheObj.main && cacheObj.main.fetchedAt && (Date.now() - cacheObj.main.fetchedAt) < CACHE_TTL_MS) {
    return cacheObj.main;
  }

  // parse main catalog feed
  try {
    const parsed = await parseFeed(OPDS_URL, { retries: Number(/*process.env.OPDS_RETRIES || */2) });
    const links = parsed?.metadata?.links || [];

    // find facet links (OPDS uses rel="http://opds-spec.org/facet")
    const languages = {};
    links.forEach((l) => {
      const rel = (l.rel || '').toLowerCase();
      const type = (l.type || '').toLowerCase();
      const title = l.title || l.title === '' ? l.title : ''; // keep title if present
      // treat any link with 'facet' in rel as language facet; also accept kind=navigation or opds facet group
      if (rel && rel.includes('facet') && l.href) {
        const key = String(title || l.href).trim();
        languages[key] = { title: key, href: l.href };
      }
    });

    // update cache object
    const newCache = await getCacheObject(); // start from existing cache
    newCache.main = { fetchedAt: Date.now(), languages };
    // keep existing language caches (newCache.languages)
    await setCacheObject(newCache);

    return newCache.main;
  } catch (err) {
    // on failure, return whatever is in cache (could be empty)
    console.error('parseMainCatalog error:', err && err.message ? err.message : err);
    const current = (await getCacheObject()).main || { fetchedAt: 0, languages: {} };
    return current;
  }
}

/**
 * parseLanguageFeed(languageTitle)
 * - languageTitle: as provided in main title keys (case-sensitive match)
 * - Returns cached language feed if fresh, otherwise fetches and caches.
 */
async function parseLanguageFeed(languageTitle) {
  const cacheObj = await getCacheObject();
  const langKey = String(languageTitle || '').trim();
  if (!langKey) {
    return null;
  }

  // ensure main is present to find the href
  const main = await parseMainCatalog();

  const langInfo = main.languages && main.languages[langKey];
  if (!langInfo || !langInfo.href) {
    // language not found in main catalog
    return null;
  }

  // check per-language cache
  const existingLang = cacheObj.languages && cacheObj.languages[langKey];
  if (existingLang && existingLang.fetchedAt && (Date.now() - existingLang.fetchedAt) < CACHE_TTL_MS) {
    return existingLang;
  }

  // fetch and parse the language feed
  try {
    const parsed = await parseFeed(langInfo.href, { retries: Number(/*process.env.OPDS_RETRIES || */2) });
    const books = Array.isArray(parsed.books) ? parsed.books : [];

    // compute facets for this language feed
    const facets = { languages: {}, publishers: {}, authors: {}, readingLevels: {} };
    books.forEach((b) => {
      if (b.language) facets.languages[b.language] = (facets.languages[b.language] || 0) + 1;
      if (b.publisher) facets.publishers[b.publisher] = (facets.publishers[b.publisher] || 0) + 1;
      if (Array.isArray(b.authors)) b.authors.forEach((a) => { facets.authors[a] = (facets.authors[a] || 0) + 1; });
      if (b.readingLevel) facets.readingLevels[b.readingLevel] = (facets.readingLevels[b.readingLevel] || 0) + 1;
    });

    // create language cache object
    const langCacheObj = { fetchedAt: Date.now(), books, facets };
    const newCache = await getCacheObject();
    newCache.languages = newCache.languages || {};
    newCache.languages[langKey] = langCacheObj;
    await setCacheObject(newCache);

    return langCacheObj;
  } catch (err) {
    console.error(`parseLanguageFeed(${langKey}) error:`, err && err.message ? err.message : err);
    // return existing cached value (maybe null) or null
    const fallback = (await getCacheObject()).languages?.[langKey] || null;
    return fallback;
  }
}

// helper: safely parse list params (allow comma-separated values)
function parseListParam(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => String(x || '').split(',').map(s => s.trim()).filter(Boolean));
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

function safeSanitizeForResponse(book) {
  // Only include safe fields (and sanitized text)
  return {
    id: book.id,
    opdsId: String(book.opdsId || ''),
    title: sanitizeHtml(String(book.title || ''), { allowedTags: [], allowedAttributes: {} }),
    authors: (book.authors || []).map(a => sanitizeHtml(String(a || ''), { allowedTags: [], allowedAttributes: {} })),
    language: sanitizeHtml(String(book.language || ''), { allowedTags: [], allowedAttributes: {} }),
    readingLevel: sanitizeHtml(String(book.readingLevel || ''), { allowedTags: [], allowedAttributes: {} }),
    publisher: sanitizeHtml(String(book.publisher || ''), { allowedTags: [], allowedAttributes: {} }),
    summary: sanitizeHtml(String(book.summary || ''), { allowedTags: [], allowedAttributes: {} }),
    coverUrl: book.coverUrl || '',
    thumbnailUrl: book.thumbnailUrl || '',
    acquisitions: Array.isArray(book.acquisitions) ? book.acquisitions.map(a => ({ href: a.href || '', type: a.type || '', rel: a.rel || '' })) : []
  };
}

// ensureParsed(language) — main entrypoint for other code
// - if language is falsy: return object with empty books and facets.languages populated from main catalog (counts = 0)
// - if language supplied: return parsed language cache (books + facets)
async function ensureParsed(language) {
  try {
    // Ensure main catalog loaded (we need languages list)
    const main = await parseMainCatalog();

    const tenMinutes = CACHE_TTL_MS;
    

    // If no language requested -> empty books; return languages list in facets
    if (!language) {
      // build languages facets object using cached per-language counts when available
      const cacheObj = await getCacheObject();
      const languagesFacet = {};
      Object.keys(main.languages || {}).forEach((k) => {
        const len = cacheObj && cacheObj.languages && cacheObj.languages[k] && Array.isArray(cacheObj.languages[k].books)
          ? cacheObj.languages[k].books.length
          : 0;
        languagesFacet[k] = len;
      });

      return {
        fetchedAt: main.fetchedAt || 0,
        books: [], // IMPORTANT: empty per Option A
        facets: {
          languages: languagesFacet,
          publishers: {},
          authors: {},
          readingLevels: {}
        }
      };
    }

    // language was provided -> fetch language feed (or use cache)
    const langKey = String(language).trim();
    if (!langKey) {
      // treat as no-language — return languages with cached counts if present
      const cacheObj = await getCacheObject();
      const languagesFacet = {};
      Object.keys(main.languages || {}).forEach((k) => {
        const len = cacheObj && cacheObj.languages && cacheObj.languages[k] && Array.isArray(cacheObj.languages[k].books)
          ? cacheObj.languages[k].books.length
          : 0;
        languagesFacet[k] = len;
      });

      return {
        fetchedAt: main.fetchedAt || 0,
        books: [],
        facets: {
          languages: languagesFacet,
          publishers: {},
          authors: {},
          readingLevels: {}
        }
      };
    }

    const langCache = await parseLanguageFeed(langKey);
    if (!langCache) {
      // language not found or parsing failed -> return empty books (do not throw)
      return {
        fetchedAt: main.fetchedAt || 0,
        books: [],
        facets: {
          languages: Object.keys(main.languages || {}).reduce((acc, k) => { acc[k] = 0; return acc; }, {}),
          publishers: {},
          authors: {},
          readingLevels: {}
        }
      };
    }

    // Return the language cache (books and computed facets)
    return {
      fetchedAt: langCache.fetchedAt || 0,
      books: Array.isArray(langCache.books) ? langCache.books : [],
      facets: langCache.facets || { languages: {}, publishers: {}, authors: {}, readingLevels: {} }
    };
  } catch (err) {
    console.error('ensureParsed error:', err && err.message ? err.message : err);
    // fallback to empty response (do not throw)
    const cacheObj = await getCacheObject();
    const mainLangs = (cacheObj.main && cacheObj.main.languages) || {};
    const languagesFacet = {};
    Object.keys(mainLangs).forEach((k) => {
      const len = cacheObj && cacheObj.languages && cacheObj.languages[k] && Array.isArray(cacheObj.languages[k].books)
        ? cacheObj.languages[k].books.length
        : 0;
      languagesFacet[k] = len;
    });

    return {
      fetchedAt: cacheObj.main?.fetchedAt || 0,
      books: [],
      facets: {
        languages: languagesFacet,
        publishers: {},
        authors: {},
        readingLevels: {}
      }
    };
  }
}

// --- Input validation middleware for /api/books (simple) ---
function validateBooksQuery(req, res, next) {
  const q = String(req.query.q || '');
  if (q.length > 200) return res.status(400).json({ error: 'Search query too long' });

  const perPage = Number(req.query.perPage || 50);
  if (!Number.isInteger(perPage) || perPage <= 0 || perPage > 200) return res.status(400).json({ error: 'Invalid perPage' });

  // optional: check page
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page <= 0 || page > 10000) return res.status(400).json({ error: 'Invalid page' });

  next();
}

app.get('/api/books', validateBooksQuery, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.min(parseInt(req.query.perPage || '50', 10), 200);

    // parse query params safely (support single language param)
    const qLanguages = parseListParam(req.query.language || req.query.languages);
    const qLanguage = qLanguages.length ? qLanguages[0] : undefined; // single-select language per Option A
    const qReading = parseListParam(req.query.readingLevel || req.query.readingLevels).map(s => String(s).toLowerCase());
    const qAuthors = parseListParam(req.query.author || req.query.authors).map(s => String(s).toLowerCase());
    const qPublisher = parseListParam(req.query.publisher || req.query.publishers).map(s => String(s).toLowerCase());
    const q = String(req.query.q || '').toLowerCase().trim();

    // ensureParsed respects Option A: if no language -> books empty
    const data = await ensureParsed(qLanguage);

    let filtered = Array.isArray(data.books) ? data.books.slice() : [];

    // apply other filters on top of language feed (if language feed present)
    if (qReading.length) {
      filtered = filtered.filter(b => b.readingLevel && qReading.some(qv => String(b.readingLevel).toLowerCase().includes(qv)));
    }
    if (qAuthors.length) {
      filtered = filtered.filter(b => Array.isArray(b.authors) && b.authors.some(a => qAuthors.some(qv => String(a).toLowerCase().includes(qv))));
    }
    if (qPublisher.length) {
      filtered = filtered.filter(b => b.publisher && qPublisher.some(qv => b.publisher.toLowerCase().includes(qv)));
    }
    if (q) {
      filtered = filtered.filter(b =>
        (b.title && String(b.title).toLowerCase().includes(q)) ||
        (Array.isArray(b.authors) && b.authors.some(a => String(a).toLowerCase().includes(q))) ||
        (b.summary && String(b.summary).toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageBooks = filtered.slice(start, end).map(safeSanitizeForResponse);

    // Return facets:
    // - If language not provided, data.facets contains only languages (with counts 0) and empty others
    // - If language provided, data.facets contains dynamic facets for that language
    res.json({
      total,
      page,
      perPage,
      books: pageBooks,
      facets: data.facets || {}
    });
  } catch (err) {
    console.error('GET /api/books error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to serve books' });
  }
});

app.get('/health', async (req, res) => {
  try {
    const main = await parseMainCatalog();
    // count languages available
    const langCount = Object.keys(main.languages || {}).length;
    res.json({ status: 'ok', cachedAt: main.fetchedAt || 0, languages: langCount });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'health check failed' });
  }
});

const PORT = Number(/*process.env.PORT || */5000);
app.listen(PORT, () => console.log(`backend server running on ${PORT}`));
