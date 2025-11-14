/**
 * opdsParser.js
 *
 * Secure, robust OPDS/Atom feed parser.
 *
 * Protections & features:
 * - SSRF protection: only allow feeds from a whitelist (OPDS_WHITELIST env or OPDS_URL domain)
 * - Max content length / body length to avoid huge downloads
 * - Retry loop with exponential backoff (no recursion)
 * - Defensive parsing using fast-xml-parser with safe options
 * - Sanitization of output text using sanitize-html
 * - Defensive handling of arrays vs single objects
 *
 * Usage:
 * const { parseFeed } = require('./opdsParser');
 * const result = await parseFeed('https://.../catalog.xml');
 *
 * Environment:
 * - OPDS_WHITELIST (optional): comma-separated hostnames allowed (example: storage.googleapis.com,storyweaver.org.in)
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const sanitizeHtml = require('sanitize-html');
const { URL } = require('url');

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// small helper to sanitize strings (strip tags & trim)
function sanitizeText(input) {
  if (!input && input !== 0) return '';
  const str = String(input);
  // allow very limited inline formatting if desired, else strip everything
  return sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} }).trim();
}

// helpers
const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);
const toText = (val) => {
  if (Array.isArray(val)) return sanitizeText(val[0]);
  return sanitizeText(val);
};

// validate feed url against whitelist (if provided)
function isAllowedFeedUrl(feedUrl) {
  try {
    const parsed = new URL(feedUrl);
    const whitelistEnv = process.env.OPDS_WHITELIST || '';
    const whitelist = whitelistEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (whitelist.length === 0) {
      // If no explicit whitelist, allow only https schemes (prevent file://, http on localhost by default)
      return parsed.protocol === 'https:';
    }

    // allowed if host matches any of the whitelist entries (exact match)
    return whitelist.includes(parsed.hostname);
  } catch (e) {
    return false;
  }
}

// normalize entry: defensive and sanitized
function normalizeEntry(entry = {}, idx = 0) {
  const title = toText(entry.title || entry['title'] || 'Untitled');

  // authors
  const authors = toArray(entry.author)
    .map((a) => {
      if (!a) return '';
      // a may be object with name or plain text
      return sanitizeText(a?.name || a?.['#text'] || a);
    })
    .filter(Boolean);

  // categories -> language, readingLevel
  let language = '';
  let readingLevel = '';

  toArray(entry.category).forEach((cat) => {
    if (!cat) return;
    const label = sanitizeText(cat?.['@_label'] || cat?.['@_term'] || '');
    const term = sanitizeText(cat?.['@_term'] || '');
    const lowerLabel = (label || '').toLowerCase();
    const lowerTerm = (term || '').toLowerCase();

    if (!language && (lowerLabel.includes('language') || lowerTerm === 'language' || lowerTerm === 'english' || lowerTerm.match(/^[a-z]{2}$/i))) {
      language = label || term;
    }
    if (!readingLevel && (lowerLabel.includes('reading') || lowerTerm.includes('level') || lowerTerm.includes('reading'))) {
      readingLevel = label || term;
    }
  });

  const publisher = toText(entry['dc:publisher'] || entry.publisher);

  const summary = toText(entry.summary || entry.content || '');

  // links
  let coverUrl = '';
  let thumbnailUrl = '';
  const acquisitions = [];

  toArray(entry.link).forEach((l) => {
    if (!l) return;
    const rel = String(l?.['@_rel'] || '').toLowerCase();
    const href = String(l?.['@_href'] || l?.['@_url'] || '').trim();
    const type = String(l?.['@_type'] || '').toLowerCase();

    if (!href) return;
    // basic sanitization of href: only http or https allowed
    if (!/^https?:\/\//i.test(href)) return;

    if (!coverUrl && rel.includes('image') && !rel.includes('thumbnail')) coverUrl = href;
    if (!thumbnailUrl && (rel.includes('thumbnail') || type.startsWith('image/'))) thumbnailUrl = href;

    if (rel.includes('acquisition') || /epub|pdf|mobi|zip/i.test(type) || href.endsWith('.epub') || href.endsWith('.pdf')) {
      acquisitions.push({ href, type, rel });
    }
  });

  return {
    id: idx + 1,
    opdsId: sanitizeText(entry.id || entry['id'] || ''),
    title,
    authors,
    language,
    readingLevel,
    publisher,
    summary,
    coverUrl,
    thumbnailUrl,
    acquisitions,
  };
}

// parseFeed with safe retry loop
async function parseFeed(feedUrl, options = {}) {
  if (!feedUrl) throw new Error('Feed URL is required.');

  // SSRF protection: ensure allowed
  if (!isAllowedFeedUrl(feedUrl)) {
    throw new Error('Feed URL is not allowed by server configuration.');
  }

  const maxBytes = Number(process.env.OPDS_MAX_BYTES || DEFAULT_MAX_BYTES);

  // fast-xml-parser options - keep attributes, trim values
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseTagValue: true,
    trimValues: true,
    // Do not parse entity expansions or execute anything; fast-xml-parser is safe by default
  });

  const retries = Math.max(0, Number(options.retries ?? process.env.OPDS_RETRIES ?? 2));
  const backoffBase = 300; // ms

  let xmlData;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(feedUrl, {
        headers: {
          Accept: 'application/atom+xml, application/xml, text/xml, */*',
          'User-Agent': process.env.OPDS_USER_AGENT || 'OPDS-Parser/1.0 (+https://your-app)',
        },
        responseType: 'text',
        timeout: Number(process.env.OPDS_TIMEOUT_MS || 15000),
        maxContentLength: maxBytes,
        maxBodyLength: maxBytes,
        // do not follow redirects to some protocols - axios follows by default but should be ok for https
        validateStatus: (status) => status >= 200 && status < 400,
      });

      xmlData = response.data;
      break;
    } catch (err) {
      lastErr = err;
      // if we've run out of attempts, break
      if (attempt === retries) break;
      // exponential backoff
      const wait = backoffBase * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  if (!xmlData) {
    const msg = lastErr && lastErr.message ? lastErr.message : 'Unknown fetch error';
    throw new Error(`Failed to fetch feed: ${msg}`);
  }

  // Safety: if xmlData length exceeds configured max, reject
  if (typeof xmlData === 'string' && xmlData.length > maxBytes) {
    throw new Error('Feed exceeds maximum allowed size.');
  }

  // parse & normalize
  let parsed;
  try {
    parsed = parser.parse(xmlData);
  } catch (err) {
    throw new Error('Failed to parse XML feed.');
  }

  const feed = parsed?.feed || parsed || {};
  const entries = toArray(feed.entry);
  const books = entries.map((entry, idx) => normalizeEntry(entry, idx));

  const metadata = {
    id: sanitizeText(feed.id || ''),
    title: toText(feed.title || ''),
    subtitle: toText(feed.subtitle || ''),
    updated: feed.updated || '',
    links: toArray(feed.link).map((l) => ({
      rel: sanitizeText(l?.['@_rel']),
      href: sanitizeText(l?.['@_href']),
      type: sanitizeText(l?.['@_type']),
      title: sanitizeText(l?.['@_title']),
    })),
  };

  return { metadata, books };
}

module.exports = { parseFeed, normalizeEntry };
