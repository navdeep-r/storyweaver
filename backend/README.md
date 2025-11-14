# Backend (OPDS parsing API)

This folder contains the server-side OPDS parsing logic and a small Express server that exposes a paginated/filterable JSON API.

Files
- `opdsParser.js` — parses the OPDS (Atom) feed and normalizes entries.
- `server.js` — Express server that exposes `/api/books` and `/health`.

Environment
- `OPDS_URL` — optional environment variable that points to the OPDS feed URL. Defaults to the StoryWeaver English catalog used in the project.
- `PORT` — optional server port (defaults to 5000).

Run locally
1. Install dependencies in the project root (if not already done):

```powershell
npm install
```

2. Start the backend server (from the project root):

```powershell
npm run backend
# or
node backend/server.js
```

The server runs on `http://localhost:5000` by default.

Endpoints
- `GET /api/books?page=1&perPage=50&language=english&author=smith&q=search` — paginated and filterable list of books.
  - Query params support comma-separated values for multi-select (e.g., `language=en,hi`).
  - Supports `q` for free-text search over title/author/summary.
- `GET /health` — basic health check and cache metadata.

Notes
- The backend caches parsed results for a short period (10 minutes by default in the implementation) to avoid re-parsing the XML on every request.
- Move heavy parsing work to the backend to prevent browser OOM errors when loading large OPDS catalogs.

Deployment
- You can containerize `backend/server.js` or run it behind a process manager. Ensure `fast-xml-parser` and `axios` are installed.

Security
- This is a dev/demo server. If exposing the endpoint publicly, add CORS restrictions, authentication, rate-limiting and other hardening as appropriate.
