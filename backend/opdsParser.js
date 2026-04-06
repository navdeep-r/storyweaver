/**
 * opdsParser.js
 *
 * Secure, robust OPDS (Open Publication Distribution System) / Atom feed parser.
 *
 * This module is responsible for fetching remote OPDS XML catalogs, parsing
 * them into structured JSON, and normalising each book entry into a
 * consistent shape suitable for the API response layer.
 *
 * Security protections:
 * - SSRF protection via URL whitelist (defaults to HTTPS-only)
 * - Maximum content length enforcement to prevent memory exhaustion
 * - Retry loop with exponential backoff (iterative, no recursion)
 * - Defensive XML parsing using fast-xml-parser with safe defaults
 * - All output text sanitised through sanitize-html
 *
 * @module opdsParser
 *
 * @example
 *   const { parseFeed } = require('./opdsParser');
 *   const result = await parseFeed('https://example.com/catalog.xml');
 *   // result.books — normalised book entries
 *   // result.metadata — feed-level metadata (title, links, etc.)
 *
 * @env {string} OPDS_WHITELIST - Comma-separated hostnames allowed for feed
 *   URLs. If empty, only HTTPS URLs are permitted.
 * @env {number} OPDS_MAX_BYTES - Maximum feed size in bytes (default: 5 MB).
 * @env {number} OPDS_RETRIES - Number of retry attempts on fetch failure (default: 2).
 * @env {number} OPDS_TIMEOUT_MS - HTTP timeout in milliseconds (default: 15000).
 * @env {string} OPDS_USER_AGENT - Custom User-Agent header for feed requests.
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const sanitizeHtml = require('sanitize-html');
const { URL } = require('url');

/** Maximum allowed feed size in bytes. Prevents OOM from unexpectedly large feeds. */
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Strip all HTML tags from a string, returning only plain text.
 * Returns an empty string for falsy inputs (except `0`).
 *
 * @param {*} input - Raw input value (may contain HTML).
 * @returns {string} Sanitised plain text.
 */
function sanitizeText(input) {
  if (!input && input !== 0) return '';
  const str = String(input);
  return sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Coerce a value into an array.
 * - Arrays pass through unchanged.
 * - Truthy non-array values are wrapped in a single-element array.
 * - Falsy values produce an empty array.
 *
 * This is necessary because fast-xml-parser returns a single object when
 * there is one child element, and an array when there are multiple.
 *
 * @param {*} val - Input value.
 * @returns {Array}
 */
const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

/**
 * Extract plain text from a value that may be an array or scalar.
 * Takes the first element if given an array.
 *
 * @param {*} val - Input value.
 * @returns {string} Sanitised plain text.
 */
const toText = (val) => {
  if (Array.isArray(val)) return sanitizeText(val[0]);
  return sanitizeText(val);
};

/**
 * Validate a feed URL against the configured whitelist.
 *
 * If no OPDS_WHITELIST is set, only HTTPS URLs are permitted (preventing
 * file:// and plain HTTP access to internal resources — SSRF protection).
 *
 * @param {string} feedUrl - The feed URL to validate.
 * @returns {boolean} Whether the URL is allowed.
 */
function isAllowedFeedUrl(feedUrl) {
  try {
    const parsed = new URL(feedUrl);
    const whitelistEnv = process.env.OPDS_WHITELIST || '';
    const whitelist = whitelistEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (whitelist.length === 0) {
      // No explicit whitelist — only allow HTTPS to prevent SSRF
      return parsed.protocol === 'https:';
    }

    // Strict hostname match against whitelist entries
    return whitelist.includes(parsed.hostname);
  } catch (e) {
    return false;
  }
}

/**
 * Normalise a single OPDS <entry> element into a flat book object.
 *
 * Extracts and sanitises all relevant metadata:
 * - Title, authors, contributors (with roles)
 * - Categories, language, reading level
 * - Publisher, summary/description
 * - Cover image URL, thumbnail URL
 * - Acquisition links (download URLs for PDF, EPUB, etc.)
 *
 * @param {Object} entry - Parsed XML entry object from fast-xml-parser.
 * @param {number} idx - Zero-based entry index (used to generate a sequential ID).
 * @returns {Object} Normalised book object.
 */
function normalizeEntry(entry = {}, idx = 0) {
  const title = toText(entry.title || entry['title'] || 'Untitled');

  // Extract author names from <author><name>...</name></author> elements
  const authors = toArray(entry.author)
    .map((a) => {
      if (!a) return '';
      return sanitizeText(a?.name || a?.['#text'] || a);
    })
    .filter(Boolean);

  // Extract contributors (illustrators, translators, etc.) from <contributor> or <dc:contributor>
  const contributors = toArray(entry.contributor || entry['dc:contributor'])
    .map((c) => {
      if (!c) return null;

      const name = sanitizeText(c?.name || c?.['#text'] || '');
      if (!name) return null;

      // Role may be stored as an attribute or child element
      const role = sanitizeText(c?.['@_role'] || c?.role || '');

      return {
        name,
        role: role || null,
      };
    })
    .filter(Boolean);

  // Parse <category> elements to extract language and reading level.
  // OPDS uses categories with labels/terms to encode various metadata.
  let language = '';
  let readingLevel = '';

  toArray(entry.category).forEach((cat) => {
    if (!cat) return;
    const label = sanitizeText(cat?.['@_label'] || cat?.['@_term'] || '');
    const term = sanitizeText(cat?.['@_term'] || '');
    const lowerLabel = (label || '').toLowerCase();
    const lowerTerm = (term || '').toLowerCase();

    // Detect reading level categories by label/term patterns
    const isReadingLevel =
      lowerLabel.includes('reading level') ||
      lowerLabel.startsWith('level') ||
      lowerTerm.startsWith('level') ||
      lowerTerm.includes('reading');

    // Detect language categories (first match wins)
    if (!language && (lowerLabel.includes('language') || lowerTerm === 'language' || lowerTerm === 'english' || lowerTerm.match(/^[a-z]{2}$/i))) {
      language = (label && !/^[a-z]{2}$/i.test(label) ? label : term).trim();
    }
    if (!readingLevel && isReadingLevel) {
      readingLevel = (label || term).trim();
    }
  });

  // Publisher from Dublin Core metadata or plain publisher element
  const publisher = sanitizeText(
    entry['dcterms:publisher'] ||
    entry.publisher ||
    ''
  );

  // Description/summary — fall back to <content> if <summary> is absent
  const summary = toText(entry.summary || entry.content || '');

  // Parse <link> elements for cover images and acquisition (download) URLs
  let coverUrl = '';
  let thumbnailUrl = '';
  const acquisitions = [];

  toArray(entry.link).forEach((l) => {
    if (!l) return;
    const rel = String(l?.['@_rel'] || '').toLowerCase();
    const href = String(l?.['@_href'] || l?.['@_url'] || '').trim();
    const type = String(l?.['@_type'] || '').toLowerCase();

    if (!href) return;
    // Only allow HTTP(S) URLs — prevent injection of data: or javascript: URIs
    if (!/^https?:\/\//i.test(href)) return;

    // Cover image: rel contains 'image' but not 'thumbnail'
    if (!coverUrl && rel.includes('image') && !rel.includes('thumbnail')) coverUrl = href;
    // Thumbnail: rel contains 'thumbnail' or type starts with 'image/'
    if (!thumbnailUrl && (rel.includes('thumbnail') || type.startsWith('image/'))) thumbnailUrl = href;

    // Acquisition links: download URLs for ebooks
    if (rel.includes('acquisition') || /epub|pdf|mobi|zip/i.test(type) || href.endsWith('.epub') || href.endsWith('.pdf')) {
      acquisitions.push({ href, type, rel });
    }
  });

  // Extract all category labels for the categories facet
  const categories = toArray(entry.category)
    .map(cat => sanitizeText(cat?.['@_label'] || cat?.['@_term'] || ''))
    .filter(Boolean);

  return {
    id: idx + 1,
    opdsId: sanitizeText(entry.id || entry['id'] || ''),
    title,
    authors,
    contributors,
    categories,
    language,
    readingLevel,
    publisher,
    summary,
    coverUrl,
    thumbnailUrl,
    acquisitions,
  };
}

/**
 * Fetch and parse an OPDS/Atom feed from a remote URL.
 *
 * Implements a retry loop with exponential backoff to handle transient
 * network failures. The parsed result contains feed-level metadata and
 * an array of normalised book entries.
 *
 * @param {string} feedUrl - URL of the OPDS feed to fetch.
 * @param {Object} [options] - Parsing options.
 * @param {number} [options.retries=2] - Number of retry attempts on failure.
 * @returns {Promise<{metadata: Object, books: Object[]}>} Parsed feed data.
 * @throws {Error} If the URL is disallowed, all retries fail, or parsing fails.
 */
async function parseFeed(feedUrl, options = {}) {
  if (!feedUrl) throw new Error('Feed URL is required.');

  // SSRF protection: reject disallowed URLs before making any request
  if (!isAllowedFeedUrl(feedUrl)) {
    throw new Error('Feed URL is not allowed by server configuration.');
  }

  const maxBytes = Number(process.env.OPDS_MAX_BYTES || DEFAULT_MAX_BYTES);

  // Configure XML parser with safe defaults:
  // - Preserve attributes (prefixed with @_)
  // - Parse tag values into native types
  // - Trim whitespace from values
  // - No entity expansion or code execution (fast-xml-parser is safe by default)
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseTagValue: true,
    trimValues: true,
  });

  const retries = Math.max(0, Number(options.retries ?? process.env.OPDS_RETRIES ?? 2));
  const backoffBase = 300; // Initial backoff delay in ms

  let xmlData;
  let lastErr;

  // Iterative retry loop with exponential backoff (300ms, 600ms, 1200ms, ...)
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
        validateStatus: (status) => status >= 200 && status < 400,
      });

      xmlData = response.data;
      break; // Success — exit retry loop
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break; // No more retries
      // Wait with exponential backoff before next attempt
      const wait = backoffBase * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  if (!xmlData) {
    const msg = lastErr && lastErr.message ? lastErr.message : 'Unknown fetch error';
    throw new Error(`Failed to fetch feed: ${msg}`);
  }

  // Reject feeds that somehow exceeded the size limit
  if (typeof xmlData === 'string' && xmlData.length > maxBytes) {
    throw new Error('Feed exceeds maximum allowed size.');
  }

  // Parse raw XML into a JavaScript object
  let parsed;
  try {
    parsed = parser.parse(xmlData);
  } catch (err) {
    throw new Error('Failed to parse XML feed.');
  }

  // The root element is typically <feed> for OPDS/Atom feeds
  const feed = parsed?.feed || parsed || {};
  const entries = toArray(feed.entry);
  const books = entries.map((entry, idx) => normalizeEntry(entry, idx));

  // Extract feed-level metadata (title, links to facets/navigation, etc.)
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
