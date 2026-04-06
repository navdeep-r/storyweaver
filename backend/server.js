/**
 * server.js — StoryWeaver Backend API Server
 *
 * An Express server that acts as a caching proxy between the React frontend
 * and the StoryWeaver OPDS catalog feeds. Responsibilities:
 *
 * 1. **Catalog Discovery**: Fetches the root OPDS catalog to discover
 *    available languages (represented as facet links).
 *
 * 2. **Language Feed Parsing**: On demand, fetches and parses language-specific
 *    OPDS feeds, extracting book entries and computing facet counts.
 *
 * 3. **Caching**: Three-tier cache (Redis → File → In-Memory) with a
 *    configurable TTL to avoid redundant XML parsing.
 *
 * 4. **API**: Exposes `/api/books` (paginated, filterable) and `/health`.
 *
 * 5. **Security**: CORS whitelist, Helmet headers, rate limiting, input
 *    validation, and output sanitisation.
 *
 * @module server
 */

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

// ──────────────────────────────────────────────────────────
// Middleware Stack
// ──────────────────────────────────────────────────────────

/** Helmet adds security headers (CSP, HSTS, X-Frame-Options, etc.) */
app.use(helmet());

/** Gzip compression for all responses */
app.use(compression());

/**
 * CORS configuration.
 * Allowed origins are read from the ALLOWED_ORIGINS env variable (comma-separated).
 * Requests with no origin (e.g., curl, mobile apps) are always allowed.
 */
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,https://storyweaver-zeta.vercel.app';
const allowedOrigins = allowedOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS policy: origin not allowed'));
    }
  }
}));

/**
 * Rate limiter: caps each IP to 200 requests per 15-minute window.
 * Uses standard (RateLimit-*) headers; legacy X-RateLimit-* headers are disabled.
 */
const limiter = rateLimit({
  windowMs: Number(15 * 60 * 1000), // 15 minutes
  max: Number(200),
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// ──────────────────────────────────────────────────────────
// Cache Layer (Redis → File → In-Memory)
// ──────────────────────────────────────────────────────────

/** Redis connection URL. Empty string disables Redis caching. */
const REDIS_URL = '';
/** Path to the file-based cache. Falls back to backend/opds_cache.json. */
const CACHE_FILE = path.resolve(__dirname, 'opds_cache.json');

let redisClient = null;
let useRedis = false;

// Attempt to connect to Redis if configured
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

/**
 * In-memory cache object. Structure:
 * {
 *   main: { fetchedAt: number, languages: { [name]: { title, href } } },
 *   languages: { [name]: { fetchedAt, books[], facets } }
 * }
 */
let inMemoryCache = {
  main: { fetchedAt: 0, languages: {} },
  languages: {}
};

/**
 * Write the cache object to disk as JSON.
 * Best-effort — errors are logged but do not interrupt the request.
 *
 * @param {Object} obj - Cache object to persist.
 */
async function persistToFileCache(obj) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(obj), { encoding: 'utf8' });
  } catch (err) {
    console.warn('Failed to write cache file:', err && err.message ? err.message : err);
  }
}

/**
 * Read the cache from the file system.
 *
 * @returns {Promise<Object|null>} Parsed cache object, or null if unavailable.
 */
async function readFileCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

/**
 * Retrieve the current cache object from the highest-priority available source.
 * Priority: Redis → File → In-Memory.
 *
 * @returns {Promise<Object>} The cache object.
 */
async function getCacheObject() {
  // Try Redis first
  if (useRedis && redisClient) {
    try {
      const raw = await redisClient.get('opds_cache_v1');
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn('Redis read failed', err && err.message ? err.message : err);
    }
  }

  // Fall back to file cache
  const fileCache = await readFileCache();
  if (fileCache) return fileCache;

  // Last resort: in-memory cache
  return inMemoryCache;
}

/**
 * Update the cache across all tiers.
 * Writes to in-memory immediately, then best-effort to Redis and file.
 *
 * @param {Object} obj - Updated cache object.
 */
async function setCacheObject(obj) {
  inMemoryCache = obj;

  // Write to Redis with 1-hour TTL (best-effort)
  if (useRedis && redisClient) {
    try {
      await redisClient.set('opds_cache_v1', JSON.stringify(obj), 'EX', 60 * 60);
    } catch (err) {
      console.warn('Redis write failed', err && err.message ? err.message : err);
    }
  }

  // Also persist to file (best-effort, fire-and-forget)
  persistToFileCache(obj).catch(() => { });
}

// ──────────────────────────────────────────────────────────
// OPDS Feed Fetching & Parsing
// ──────────────────────────────────────────────────────────

/** Root OPDS catalog URL (contains language facet links). */
const OPDS_URL = 'https://storage.googleapis.com/story-weaver-e2e-production/catalog/catalog.xml';
/** Cache time-to-live in milliseconds. */
const CACHE_TTL_MS = Number(1000 * 60 * 10); // 10 minutes

/**
 * Parse the root OPDS catalog to discover available languages.
 *
 * The root catalog contains facet links (rel="http://opds-spec.org/facet")
 * pointing to language-specific feeds. This function extracts those links
 * and caches the result.
 *
 * @param {boolean} [force=false] - Force a re-fetch even if the cache is fresh.
 * @returns {Promise<Object>} Main catalog data: { fetchedAt, languages }.
 */
async function parseMainCatalog(force = false) {
  const cacheObj = await getCacheObject();

  // Return cached main catalog if still fresh
  if (!force && cacheObj && cacheObj.main && cacheObj.main.fetchedAt && (Date.now() - cacheObj.main.fetchedAt) < CACHE_TTL_MS) {
    return cacheObj.main;
  }

  try {
    const parsed = await parseFeed(OPDS_URL, { retries: Number(2) });
    const links = parsed?.metadata?.links || [];

    // Extract language facet links from the catalog's <link> elements.
    // Each facet link has rel containing "facet" and points to a language feed.
    const languages = {};
    links.forEach((l) => {
      const rel = (l.rel || '').toLowerCase();
      const title = l.title || l.title === '' ? l.title : '';

      if (rel && rel.includes('facet') && l.href) {
        const key = String(title || l.href).trim();
        languages[key] = { title: key, href: l.href };
      }
    });

    // Merge into existing cache (preserve per-language caches)
    const newCache = await getCacheObject();
    newCache.main = { fetchedAt: Date.now(), languages };
    await setCacheObject(newCache);

    return newCache.main;
  } catch (err) {
    // On failure, return stale cache (graceful degradation)
    console.error('parseMainCatalog error:', err && err.message ? err.message : err);
    const current = (await getCacheObject()).main || { fetchedAt: 0, languages: {} };
    return current;
  }
}

/**
 * Parse a language-specific OPDS feed.
 *
 * Resolves the feed URL from the main catalog's language map, fetches
 * and parses the XML, computes facets, and caches the result.
 *
 * @param {string} languageTitle - Language key (case-sensitive, matches the
 *   facet link title from the main catalog).
 * @returns {Promise<Object|null>} Language cache: { fetchedAt, books[], facets },
 *   or null if the language is not found.
 */
async function parseLanguageFeed(languageTitle) {
  const cacheObj = await getCacheObject();
  const langKey = String(languageTitle || '').trim();
  if (!langKey) return null;

  // Look up the feed URL from the main catalog
  const main = await parseMainCatalog();
  const langInfo = main.languages && main.languages[langKey];
  if (!langInfo || !langInfo.href) return null;

  // Return cached language data if still fresh
  const existingLang = cacheObj.languages && cacheObj.languages[langKey];
  if (existingLang && existingLang.fetchedAt && (Date.now() - existingLang.fetchedAt) < CACHE_TTL_MS) {
    return existingLang;
  }

  try {
    // Fetch and parse the language-specific feed
    const parsed = await parseFeed(langInfo.href, { retries: Number(2) });
    const books = Array.isArray(parsed.books) ? parsed.books : [];

    // Log a sample book for debugging during development
    if (books.length > 0) {
      const b = books[0];
      console.log('[TEMP TEST] Parsed book sample:', {
        title: b.title,
        language: b.language,
        readingLevel: b.readingLevel,
        publisher: b.publisher,
        contributors: b.contributors,
      });
    }

    // Compute facet counts from all books in this language feed.
    // These facets power the filter sidebar counts in the frontend.
    const facets = { languages: {}, publishers: {}, authors: {}, readingLevels: {}, categories: {} };
    books.forEach((b) => {
      if (b.language) facets.languages[b.language] = (facets.languages[b.language] || 0) + 1;
      if (b.publisher) facets.publishers[b.publisher] = (facets.publishers[b.publisher] || 0) + 1;
      if (Array.isArray(b.authors)) b.authors.forEach((a) => { facets.authors[a] = (facets.authors[a] || 0) + 1; });
      if (b.readingLevel) facets.readingLevels[b.readingLevel] = (facets.readingLevels[b.readingLevel] || 0) + 1;
      if (Array.isArray(b.categories)) b.categories.forEach((c) => { facets.categories[c] = (facets.categories[c] || 0) + 1; });
    });

    // Cache the parsed result
    const langCacheObj = { fetchedAt: Date.now(), books, facets };
    const newCache = await getCacheObject();
    newCache.languages = newCache.languages || {};
    newCache.languages[langKey] = langCacheObj;
    await setCacheObject(newCache);

    return langCacheObj;
  } catch (err) {
    console.error(`parseLanguageFeed(${langKey}) error:`, err && err.message ? err.message : err);
    // Graceful degradation: return stale cache if available
    const fallback = (await getCacheObject()).languages?.[langKey] || null;
    return fallback;
  }
}

// ──────────────────────────────────────────────────────────
// Request Helpers
// ──────────────────────────────────────────────────────────

/**
 * Parse a query parameter that may contain comma-separated values.
 * Handles both string and array inputs (Express may provide either).
 *
 * @param {string|string[]} v - Raw query parameter value.
 * @returns {string[]} Array of individual trimmed values.
 */
function parseListParam(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => String(x || '').split(',').map(s => s.trim()).filter(Boolean));
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Sanitise a book object for safe inclusion in API responses.
 * Strips all HTML from text fields and constrains the shape to known-safe keys.
 *
 * @param {Object} book - Raw book object from the parser.
 * @returns {Object} Sanitised book object.
 */
function safeSanitizeForResponse(book) {
  return {
    id: book.id,
    opdsId: String(book.opdsId || ''),
    title: sanitizeHtml(String(book.title || ''), { allowedTags: [], allowedAttributes: {} }),
    authors: (book.authors || []).map(a => sanitizeHtml(String(a || ''), { allowedTags: [], allowedAttributes: {} })),
    contributors: (book.contributors || []).map(c => ({
      name: sanitizeHtml(String(c?.name || ''), { allowedTags: [], allowedAttributes: {} }),
      role: c?.role ? sanitizeHtml(String(c.role), { allowedTags: [], allowedAttributes: {} }) : null
    })),
    categories: (book.categories || []).map(c => sanitizeHtml(String(c || ''), { allowedTags: [], allowedAttributes: {} })),
    language: sanitizeHtml(String(book.language || ''), { allowedTags: [], allowedAttributes: {} }),
    readingLevel: sanitizeHtml(String(book.readingLevel || ''), { allowedTags: [], allowedAttributes: {} }),
    publisher: sanitizeHtml(String(book.publisher || ''), { allowedTags: [], allowedAttributes: {} }),
    summary: sanitizeHtml(String(book.summary || ''), { allowedTags: [], allowedAttributes: {} }),
    coverUrl: book.coverUrl || '',
    thumbnailUrl: book.thumbnailUrl || '',
    acquisitions: Array.isArray(book.acquisitions) ? book.acquisitions.map(a => ({ href: a.href || '', type: a.type || '', rel: a.rel || '' })) : []
  };
}

/**
 * Main data retrieval function.
 *
 * Behaviour depends on whether a language is specified:
 * - **No language**: Returns empty books array with `facets.languages` populated
 *   from the main catalog (so the frontend can render the language overlay).
 * - **With language**: Returns parsed books and computed facets for that language.
 *
 * @param {string|undefined} language - Language key to scope the response.
 * @returns {Promise<{fetchedAt: number, books: Object[], facets: Object}>}
 */
async function ensureParsed(language) {
  try {
    const main = await parseMainCatalog();

    if (!language) {
      // No language selected — return only the language list.
      // Book counts are populated from cached per-language feeds (if available).
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
        books: [], // Empty — user must select a language first
        facets: {
          languages: languagesFacet,
          publishers: {},
          authors: {},
          readingLevels: {},
          categories: {}
        }
      };
    }

    // Language was provided — fetch/cache the language-specific feed
    const langKey = String(language).trim();
    if (!langKey) {
      // Empty string treated as no-language
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
          readingLevels: {},
          categories: {}
        }
      };
    }

    const langCache = await parseLanguageFeed(langKey);
    if (!langCache) {
      // Language not found in catalog or parsing failed
      return {
        fetchedAt: main.fetchedAt || 0,
        books: [],
        facets: {
          languages: Object.keys(main.languages || {}).reduce((acc, k) => { acc[k] = 0; return acc; }, {}),
          publishers: {},
          authors: {},
          readingLevels: {},
          categories: {}
        }
      };
    }

    return {
      fetchedAt: langCache.fetchedAt || 0,
      books: Array.isArray(langCache.books) ? langCache.books : [],
      facets: langCache.facets || { languages: {}, publishers: {}, authors: {}, readingLevels: {}, categories: {} }
    };
  } catch (err) {
    // Graceful degradation: return whatever is cached, with empty books
    console.error('ensureParsed error:', err && err.message ? err.message : err);
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
        readingLevels: {},
        categories: {}
      }
    };
  }
}

// ──────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────

/**
 * Input validation middleware for the /api/books endpoint.
 * Rejects malformed query parameters early with 400 responses.
 */
function validateBooksQuery(req, res, next) {
  const q = String(req.query.q || '');
  if (q.length > 200) return res.status(400).json({ error: 'Search query too long' });

  const perPage = Number(req.query.perPage || 50);
  if (!Number.isInteger(perPage) || perPage <= 0 || perPage > 200) return res.status(400).json({ error: 'Invalid perPage' });

  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page <= 0 || page > 10000) return res.status(400).json({ error: 'Invalid page' });

  next();
}

/**
 * GET /api/books
 *
 * Paginated, filterable book listing.
 * Accepts query params: page, perPage, language, authors, publishers,
 * readingLevels, q (free-text search).
 *
 * Returns: { total, page, perPage, books[], facets }
 */
app.get('/api/books', validateBooksQuery, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.min(parseInt(req.query.perPage || '50', 10), 200);

    // Parse filter parameters (support singular and plural param names)
    const qLanguages = parseListParam(req.query.language || req.query.languages);
    const qLanguage = qLanguages.length ? qLanguages[0] : undefined; // Single-select language
    const qReading = parseListParam(req.query.readingLevel || req.query.readingLevels).map(s => String(s).toLowerCase());
    const qAuthors = parseListParam(req.query.author || req.query.authors).map(s => String(s).toLowerCase());
    const qPublisher = parseListParam(req.query.publisher || req.query.publishers).map(s => String(s).toLowerCase());
    const q = String(req.query.q || '').toLowerCase().trim();

    // Fetch data (respects language gate: no language = no books)
    const data = await ensureParsed(qLanguage);

    let filtered = Array.isArray(data.books) ? data.books.slice() : [];

    // Apply server-side filters on top of the language feed
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
      // Free-text search across title, authors, and summary
      filtered = filtered.filter(b =>
        (b.title && String(b.title).toLowerCase().includes(q)) ||
        (Array.isArray(b.authors) && b.authors.some(a => String(a).toLowerCase().includes(q))) ||
        (b.summary && String(b.summary).toLowerCase().includes(q))
      );
    }

    // Paginate the filtered results
    const total = filtered.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageBooks = filtered.slice(start, end).map(safeSanitizeForResponse);

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

/**
 * GET /health
 *
 * Health check endpoint. Returns cache status and the number of
 * discovered languages.
 */
app.get('/health', async (req, res) => {
  try {
    const main = await parseMainCatalog();
    const langCount = Object.keys(main.languages || {}).length;
    res.json({ status: 'ok', cachedAt: main.fetchedAt || 0, languages: langCount });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'health check failed' });
  }
});

// ──────────────────────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────────────────────

const PORT = Number(5000);
app.listen(PORT, () => console.log(`backend server running on ${PORT}`));
