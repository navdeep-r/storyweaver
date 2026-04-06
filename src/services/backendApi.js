/**
 * backendApi.js — Frontend API Client
 *
 * A thin wrapper around the browser's Fetch API for communicating with the
 * StoryWeaver backend. Automatically selects the correct base URL based on
 * the Vite environment mode:
 *
 * - Development: http://localhost:5000 (local backend server)
 * - Production:  https://storyweaver-9b0g.onrender.com (Render deployment)
 *
 * @module backendApi
 */

/** True when running via `npm run dev` (Vite dev server). */
const isDevelopment = import.meta.env.MODE === 'development';

/** Base URL for all API requests, environment-dependent. */
const API_URL = isDevelopment ? 'http://localhost:5000' : 'https://storyweaver-9b0g.onrender.com';

/**
 * Fetch a paginated list of books from the backend.
 *
 * Constructs a query string from the provided params object and makes a GET
 * request to `/api/books`. Undefined, null, and empty-string values are
 * automatically excluded from the query string.
 *
 * @param {Object} [params={}] - Query parameters to pass to the API.
 * @param {number} [params.page] - Page number (1-indexed).
 * @param {number} [params.perPage] - Number of books per page.
 * @param {string} [params.language] - Language filter.
 * @param {string} [params.authors] - Comma-separated author filter.
 * @param {string} [params.publishers] - Comma-separated publisher filter.
 * @param {string} [params.readingLevels] - Comma-separated reading level filter.
 * @param {string} [params.q] - Free-text search query.
 * @returns {Promise<Object>} API response: { total, page, perPage, books[], facets }.
 * @throws {Error} If the HTTP response status is not OK.
 */
export async function fetchBooks(params = {}) {
  const url = new URL(`${API_URL}/api/books`);

  // Append only non-empty parameters to the query string
  Object.keys(params).forEach(k => {
    const v = params[k];
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch books: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Check backend health status.
 *
 * Makes a GET request to the `/health` endpoint and returns the response
 * (includes cache timestamp and available language count).
 *
 * @returns {Promise<Object>} Health response: { status, cachedAt, languages }.
 * @throws {Error} If the health check fails.
 */
export async function health() {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error('health check failed');
  return res.json();
}

/** Default export for convenient destructured imports. */
const backendApi = { fetchBooks, health };

export default backendApi;