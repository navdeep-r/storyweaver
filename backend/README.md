# Backend — OPDS Parsing API

The backend is a Node.js Express server that fetches, parses, and caches [OPDS (Open Publication Distribution System)](https://opds.io/) catalog feeds from StoryWeaver. It exposes a paginated, filterable JSON API consumed by the React frontend.

## Files

| File              | Purpose                                                             |
| ----------------- | ------------------------------------------------------------------- |
| `server.js`       | Express application with endpoints, caching, filtering, and security middleware. |
| `opdsParser.js`   | Standalone OPDS/Atom XML parser with SSRF protection, retry logic, and entry normalisation. |
| `opds_cache.json` | Auto-generated file-based cache (gitignored). Persists parsed feeds across server restarts. |

## Architecture

```
Client Request
      │
      ▼
  [Rate Limiter] ─► [CORS] ─► [Helmet] ─► [Compression]
      │
      ▼
  /api/books handler
      │
      ├── No language param? ─► Return language list from main catalog
      │
      └── Language param present?
              │
              ├── Cache hit (< 10 min)? ─► Return cached books + facets
              │
              └── Cache miss? ─► Fetch language OPDS feed
                                   │
                                   ├── Parse XML (opdsParser.js)
                                   ├── Compute facets
                                   ├── Cache result (Redis / File / Memory)
                                   └── Return paginated, filtered, sanitised response
```

## Environment Variables

| Variable           | Default                          | Description                              |
| ------------------ | -------------------------------- | ---------------------------------------- |
| `PORT`             | `5000`                           | Server listen port                       |
| `ALLOWED_ORIGINS`  | `http://localhost:5173,...`       | Comma-separated CORS origins             |
| `REDIS_URL`        | (empty — uses file/memory cache) | Redis connection string                  |
| `OPDS_URL`         | StoryWeaver catalog URL          | Root OPDS catalog feed                   |
| `OPDS_WHITELIST`   | (empty)                          | Allowed feed hostnames for SSRF protection |
| `OPDS_MAX_BYTES`   | `5242880` (5 MB)                 | Max feed download size                   |
| `OPDS_RETRIES`     | `2`                              | Fetch retry attempts                     |
| `OPDS_TIMEOUT_MS`  | `15000`                          | Fetch timeout in ms                      |
| `CACHE_TTL_MS`     | `600000` (10 min)                | Cache time-to-live in ms                 |

## Running Locally

```bash
# From the project root
cd backend
npm install
npm start
# or with auto-reload:
npm run dev
```

The server starts on `http://localhost:5000`.

## Endpoints

### `GET /api/books`

Paginated, filterable book list.

**Parameters:**

| Param          | Type   | Required | Description                                     |
| -------------- | ------ | -------- | ----------------------------------------------- |
| `page`         | number | No       | Page number (default `1`)                       |
| `perPage`      | number | No       | Items per page (default `50`, max `200`)        |
| `language`     | string | No       | Language filter (single value)                  |
| `authors`      | string | No       | Comma-separated author filter                   |
| `publishers`   | string | No       | Comma-separated publisher filter                |
| `readingLevels`| string | No       | Comma-separated reading level filter            |
| `q`            | string | No       | Free-text search (title, author, summary)       |

**Response shape:**

```json
{
  "total": 1234,
  "page": 1,
  "perPage": 50,
  "books": [{ "id": 1, "title": "...", "authors": [...], ... }],
  "facets": {
    "languages": {},
    "authors": {},
    "publishers": {},
    "categories": {},
    "readingLevels": {}
  }
}
```

### `GET /health`

Health check returning cache status.

```json
{ "status": "ok", "cachedAt": 1712400000000, "languages": 25 }
```

## Caching

Three-tier strategy (checked in order):

1. **Redis** — If `REDIS_URL` is set. 1-hour TTL.
2. **File** — `opds_cache.json` on disk. Survives restarts.
3. **In-memory** — JavaScript object. Zero-latency but volatile.

Each language feed is cached independently with a configurable TTL (default 10 minutes).

## Security Considerations

- **CORS**: Only whitelisted origins are permitted.
- **Rate limiting**: 200 requests per 15-minute window.
- **Helmet**: Standard security headers.
- **SSRF protection**: Feed URLs validated against HTTPS-only or explicit hostname whitelist.
- **Input validation**: Query parameters are validated before processing.
- **Output sanitisation**: All text fields are stripped of HTML.
- **Size limits**: Feeds larger than `OPDS_MAX_BYTES` are rejected.

## Deployment

The backend is currently deployed on [Render](https://render.com) at `https://storyweaver-9b0g.onrender.com`.

For other environments, ensure all dependencies from `package.json` are installed. The server can run behind PM2, Docker, or any Node.js-compatible hosting platform.
