# StoryWeaver Library

A full-stack web application for browsing, filtering, and collecting books from the [StoryWeaver](https://storyweaver.org.in/) open-source book platform. The app consumes **OPDS (Open Publication Distribution System)** catalog feeds exported by StoryWeaver and presents them through a modern, responsive interface with faceted search, multi-format cart management, and theming support.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Backend](#backend)
  - [Server (`server.js`)](#server-serverjs)
  - [OPDS Parser (`opdsParser.js`)](#opds-parser-opdsparserjs)
  - [API Reference](#api-reference)
  - [Caching Strategy](#caching-strategy)
  - [Security](#security)
- [Frontend](#frontend)
  - [Application Entry Point](#application-entry-point)
  - [State Management](#state-management)
  - [Components](#components)
  - [Services](#services)
  - [Theming](#theming)
  - [Styling](#styling)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Overview

StoryWeaver Library solves a practical problem: the official StoryWeaver platform publishes thousands of children's books across dozens of languages, but browsing and bulk-selecting books from their OPDS feeds is cumbersome. This application:

1. **Parses OPDS/Atom XML feeds** on the backend, normalising book metadata into clean JSON.
2. **Serves a paginated, filterable API** that the frontend consumes.
3. **Presents a rich browsing experience** with language selection, multi-facet filtering (authors, publishers, categories, reading levels), free-text search, and an animated book grid.
4. **Provides a cart system** for collecting books in specific formats (PDF, EPUB) with its own dedicated filter sidebar, bulk operations, and pagination.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React SPA)              │
│                                                     │
│  LanguageOverlay ─► BookBrowser ─► BookGrid/Cards   │
│          │               │              │           │
│          │          FilterSidebar   BookDetailsModal │
│          │                                          │
│          └──── CartPanel ─► CartView ─► CartTable    │
│                                   │                 │
│                            CartFilterSidebar        │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────────┐    │
│  │ AppContext   │◄──►│  backendApi.js (fetch)   │    │
│  │ (useReducer)│    └──────────┬───────────────┘    │
│  └─────────────┘               │                    │
└────────────────────────────────┼────────────────────┘
                                 │ HTTP
┌────────────────────────────────┼────────────────────┐
│              Express Backend   │                    │
│                                ▼                    │
│  ┌──────────────┐    ┌──────────────────────┐       │
│  │  server.js   │───►│   opdsParser.js      │       │
│  │  /api/books  │    │   (XML ─► JSON)      │       │
│  │  /health     │    └──────────────────────┘       │
│  └──────┬───────┘                                   │
│         │  Caching: Redis ─► File ─► In-Memory      │
└─────────┼───────────────────────────────────────────┘
          │
          ▼
   StoryWeaver OPDS Feed
   (storage.googleapis.com)
```

The backend acts as a proxy and caching layer between the browser and the raw OPDS XML feeds. This prevents browser out-of-memory issues when parsing large catalogs and enables server-side filtering and pagination.

---

## Tech Stack

### Frontend

| Technology       | Purpose                                  |
| ---------------- | ---------------------------------------- |
| React 18         | UI framework                             |
| Vite 7           | Build tool and dev server                |
| React Router 7   | Client-side routing                      |
| Framer Motion 10 | Animations and layout transitions        |
| Tailwind CSS 3   | Utility-first styling                    |
| Heroicons        | Icon set                                 |
| Axios            | HTTP client (used only on the backend)   |

### Backend

| Technology       | Purpose                                    |
| ---------------- | ------------------------------------------ |
| Express 4        | HTTP server                                |
| fast-xml-parser  | XML-to-JSON parsing for OPDS feeds         |
| sanitize-html    | Output sanitisation                        |
| ioredis          | Optional Redis caching                     |
| compression      | Gzip response compression                  |
| helmet           | Security headers                           |
| express-rate-limit | Request rate limiting                    |
| cors             | Cross-origin resource sharing              |

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- A network connection (the backend fetches OPDS feeds from Google Cloud Storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/navdeep-r/storyweaver.git
cd storyweaver/project

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Running the Application

You need to start both the backend server and the frontend dev server.

**Terminal 1 — Backend:**

```bash
npm run backend
# Starts Express on http://localhost:5000
```

**Terminal 2 — Frontend:**

```bash
npm run dev
# Starts Vite dev server on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser. You will be greeted with a language selection overlay. Choose a language to begin browsing.

---

## Project Structure

```
project/
├── backend/
│   ├── opdsParser.js        # OPDS/Atom XML feed parser
│   ├── server.js            # Express API server
│   ├── opds_cache.json      # File-based cache (auto-generated, gitignored)
│   ├── package.json         # Backend dependencies
│   └── README.md            # Backend-specific documentation
│
├── src/
│   ├── main.jsx             # React DOM entry point
│   ├── App.jsx              # Root component with Router and AppProvider
│   ├── App.css              # CSS custom properties for theming
│   ├── index.css            # Global styles, Tailwind directives, scrollbar customisation
│   │
│   ├── context/
│   │   └── AppContext.jsx   # Global state management (useReducer + Context)
│   │
│   ├── services/
│   │   └── backendApi.js    # API client for backend communication
│   │
│   └── components/
│       ├── BookBrowser.jsx          # Main page layout (sidebar + grid + cart)
│       ├── BookGrid.jsx             # Paginated responsive book grid
│       ├── BookCard.jsx             # Individual book card with cover and format buttons
│       ├── BookDetailsModal.jsx     # Full-detail modal with portal rendering
│       ├── Header.jsx               # App header with search bar and cart indicator
│       ├── FilterSidebar.jsx        # Sidebar with language and facet filters
│       ├── FilterSection.jsx        # Generic collapsible filter (button-based)
│       ├── CheckboxFilterSection.jsx # Checkbox-based filter with search and select-all
│       ├── LanguageOverlay.jsx      # Full-screen language selection gate
│       ├── ThemeToggle.jsx          # Light / Dark / Sepia theme cycler
│       ├── CartPanel.jsx            # Floating cart button and overlay toggle
│       ├── CartView.jsx             # Full-page cart overlay
│       ├── CartHeader.jsx           # Cart-specific header with search
│       ├── CartTable.jsx            # Paginated cart table with bulk operations
│       ├── CartFilterSidebar.jsx    # Filter sidebar scoped to cart contents
│       ├── LoadingSpinner.jsx       # Skeleton card grid loading state
│       └── ErrorMessage.jsx         # Error display component
│
├── index.html               # HTML shell
├── package.json              # Frontend dependencies and scripts
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration (dark mode, sepia palette)
├── postcss.config.js         # PostCSS plugins
├── eslint.config.js          # ESLint flat config
└── .gitignore
```

---

## Backend

### Server (`server.js`)

The Express server is the backbone of the data pipeline. It handles:

- **OPDS catalog discovery**: On first request, the server fetches the root catalog (`catalog.xml`), extracts facet links for each available language, and caches the result.
- **Language-specific feed parsing**: When a language is selected on the frontend, the server fetches and parses that language's OPDS feed, extracting all book entries and computing facets (author counts, publisher counts, category counts, reading level counts).
- **Pagination and filtering**: The `/api/books` endpoint applies server-side filters (language, authors, publishers, reading levels, free-text search) and returns a paginated slice with facets.
- **Response sanitisation**: All book metadata is sanitised through `sanitize-html` before being returned to the client.

### OPDS Parser (`opdsParser.js`)

A dedicated module responsible for:

- **Fetching XML feeds** with retry logic (exponential backoff, configurable retry count).
- **SSRF protection**: Only HTTPS URLs are allowed by default; an explicit whitelist can be configured via the `OPDS_WHITELIST` environment variable.
- **XML parsing**: Uses `fast-xml-parser` with safe defaults (no entity expansion, attribute preservation).
- **Entry normalisation**: Each OPDS `<entry>` is transformed into a flat, consistent JSON object with fields like `title`, `authors`, `contributors`, `categories`, `language`, `readingLevel`, `publisher`, `summary`, `coverUrl`, `thumbnailUrl`, and `acquisitions`.
- **Size limits**: Rejects feeds exceeding a configurable byte limit (`OPDS_MAX_BYTES`, default 5 MB).

### API Reference

#### `GET /api/books`

Returns a paginated list of books with facets.

| Parameter       | Type   | Default | Description                                              |
| --------------- | ------ | ------- | -------------------------------------------------------- |
| `page`          | number | `1`     | Page number (1-indexed)                                  |
| `perPage`       | number | `50`    | Items per page (max 200)                                 |
| `language`      | string | —       | Language filter (single value, case-sensitive)           |
| `authors`       | string | —       | Comma-separated author names                             |
| `publishers`    | string | —       | Comma-separated publisher names                          |
| `readingLevels` | string | —       | Comma-separated reading levels                           |
| `q`             | string | —       | Free-text search over title, authors, and summary        |

**Response:**

```json
{
  "total": 1234,
  "page": 1,
  "perPage": 50,
  "books": [ { "id": 1, "title": "...", ... } ],
  "facets": {
    "languages": { "English": 500 },
    "authors": { "Author Name": 12 },
    "publishers": { "Publisher": 45 },
    "categories": { "Fiction": 100 },
    "readingLevels": { "Level 1": 200 }
  }
}
```

When no language is provided, `books` is empty and `facets.languages` contains all available languages (used to populate the language selection overlay). This is by design — the user must select a language before books are loaded.

#### `GET /health`

Returns server health status and cache metadata.

```json
{
  "status": "ok",
  "cachedAt": 1712400000000,
  "languages": 25
}
```

### Caching Strategy

The server uses a three-tier caching strategy, checked in order:

1. **Redis** (optional): If `REDIS_URL` is set, cached data is stored with a 1-hour TTL. Suitable for production deployments.
2. **File system**: A local JSON file (`opds_cache.json`) is written to disk on every cache update. This persists across server restarts.
3. **In-memory**: A JavaScript object acts as the final fallback. Fast but lost on restart.

Cache entries have a configurable TTL (default 10 minutes). The main catalog and each language feed are cached independently.

### Security

The backend implements several security measures:

| Measure                | Implementation                                               |
| ---------------------- | ------------------------------------------------------------ |
| **CORS**               | Origin whitelist via `ALLOWED_ORIGINS` env variable           |
| **Rate limiting**      | 200 requests per 15-minute window per IP                     |
| **Helmet**             | Security headers (CSP, HSTS, etc.)                           |
| **SSRF protection**    | Feed URL validation against HTTPS-only or explicit whitelist |
| **Input validation**   | Query parameter validation middleware                        |
| **Output sanitisation**| All text fields stripped of HTML via `sanitize-html`          |
| **Size limits**        | Maximum feed download size (5 MB default)                    |
| **Compression**        | Gzip response compression via `compression` middleware       |

---

## Frontend

### Application Entry Point

The app boots through the standard Vite pipeline:

1. `index.html` loads `src/main.jsx`.
2. `main.jsx` mounts the React tree inside `<StrictMode>`.
3. `App.jsx` wraps everything in `<BrowserRouter>` and `<AppProvider>` (global state), then renders `<BookBrowser>` as a catch-all route.

### State Management

All application state lives in `src/context/AppContext.jsx`, built on React's `useReducer` and `createContext`.

#### State Shape

```
{
  facets          // { languages, authors, publishers, categories, readingLevels } — counts per value
  filters         // Derived from facets: keys of each facet as arrays (for rendering filter lists)
  selected        // Active filter selections: { language, authors[], publishers[], categories[], readingLevels[], q }
  books           // Current page of books from the API
  total           // Total matching books (for pagination)
  page / perPage  // Pagination state

  cart            // Array of { book, format, language } items added by the user
  cartFacets      // Facets computed from cart contents (for cart-specific filtering)
  cartSelected    // Active cart filter selections
  cartSelectedItems // Indices of selected cart items (for bulk operations)
  cartPage / cartPerPage

  hydrated        // Whether sessionStorage hydration is complete
  loading / error // UI state flags
}
```

#### Key Design Decisions

- **Language gate**: No books are fetched until a language is selected. The initial API call returns only the language facet list.
- **Facet locking**: When a language is active, the language facet list is preserved from the initial catalog fetch and is not overwritten by language-specific responses.
- **Session persistence**: `facets`, `selected`, `page`, `cart`, and `cartFacets` are persisted to `sessionStorage` on every change and hydrated synchronously on mount.
- **Content-based deduplication**: Cart items are identified by a composite hash of `title + authors + publisher + opdsId + language`, preventing true duplicates while allowing the same book in different languages.

### Components

#### Layout Components

| Component         | Role                                                                            |
| ----------------- | ------------------------------------------------------------------------------- |
| `BookBrowser`     | Top-level page layout. Composes Header, LanguageOverlay, FilterSidebar, BookGrid, and CartPanel. |
| `Header`          | Sticky header with animated branding, debounced search input, cart badge, and theme toggle. |
| `LanguageOverlay` | Full-screen modal shown on first load (or when no language is selected). Displays a grid of available languages. Disappears once a language is chosen. |

#### Book Display Components

| Component          | Role                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| `BookGrid`         | Responsive CSS grid displaying book cards. Includes pagination controls and "Add All EPUB/PDF" batch buttons. |
| `BookCard`         | Compact card with cover image, title, author, language/level tags, and format buttons. Hover reveals a "View" overlay that opens the detail modal. Uses Framer Motion for enter/exit animations. |
| `BookDetailsModal` | Portal-rendered modal showing full book details: cover, title, authors, contributors, description, metadata tags, action buttons (Preview, Add to Shelf), and download format buttons. Escape key closes it. Body scroll is locked while open. |

#### Filter Components

| Component              | Role                                                                      |
| ---------------------- | ------------------------------------------------------------------------- |
| `FilterSidebar`        | Container for all browse-mode filters. Renders a `CheckboxFilterSection` for languages (single-select) and one each for authors, publishers, and categories (multi-select). |
| `FilterSection`        | Button-based collapsible filter with animations. Sorts items by facet count. Used as a lower-level generic filter. |
| `CheckboxFilterSection`| Checkbox-based filter with built-in search, select-all toggle, smart sorting (selected items first, then by count), and a configurable 100-item cap to prevent lag. |

#### Cart Components

| Component           | Role                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| `CartPanel`         | Floating action button (bottom-right) that toggles the cart overlay. Shows item count badge. |
| `CartView`          | Full-page overlay containing `CartHeader`, `CartFilterSidebar`, and `CartTable`. Shows empty state with a "Browse Books" CTA when the cart is empty. Escape key closes it. |
| `CartHeader`        | Cart-specific header with search bar (filters by book title), item count, "Back to Library" button, and theme toggle. |
| `CartTable`         | Paginated data table with columns for title, author, publisher, language, category, and format. Supports row selection via checkboxes, select-all, bulk remove, download all, and clear all. Responsive — columns are progressively hidden on smaller screens. |
| `CartFilterSidebar` | Filter sidebar scoped to cart contents. Dynamically builds filter options from `cartFacets` (only shows filters with available values). |

#### Utility Components

| Component        | Role                                                       |
| ---------------- | ---------------------------------------------------------- |
| `ThemeToggle`    | Cycles through light → dark → sepia themes. Applies theme class to document root. Renders context-appropriate icons. |
| `LoadingSpinner` | Renders a grid of skeleton book cards with pulse animations to match the book grid layout. |
| `ErrorMessage`   | Displays an error alert with icon and message text.        |

### Services

#### `backendApi.js`

A thin wrapper around the browser `fetch` API. Provides two functions:

- `fetchBooks(params)` — Calls `GET /api/books` with query parameters. Returns parsed JSON.
- `health()` — Calls `GET /health` for connectivity checks.

The base URL switches between `http://localhost:5000` (development) and `https://storyweaver-9b0g.onrender.com` (production) based on `import.meta.env.MODE`.

### Theming

The app supports three visual themes, toggled via the `ThemeToggle` component:

| Theme  | Class   | Description                                     |
| ------ | ------- | ----------------------------------------------- |
| Light  | (none)  | Default white background with slate text         |
| Dark   | `.dark` | Slate-900 background with light text             |
| Sepia  | `.sepia`| Warm parchment tones (custom sepia palette)      |

Theme state is managed via CSS custom properties defined in both `App.css` and `index.css`. Tailwind's `darkMode: "class"` setting enables the `.dark:` variant prefix. The sepia palette is defined as a custom colour scale in `tailwind.config.js`.

### Styling

- **Tailwind CSS**: All component styling uses Tailwind utility classes. Responsive breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`) ensure the layout adapts from mobile to ultra-wide screens.
- **CSS Custom Properties**: Theme colours are defined as CSS variables (`--bg-primary`, `--text-primary`, etc.) and switched by the `.dark` and `.sepia` class selectors.
- **Custom Scrollbars**: Webkit and Firefox scrollbars are styled to match the active theme.
- **Framer Motion**: Used extensively for enter/exit animations, hover effects, layout animations in the grid, and spring-based modal transitions.

---

## Deployment

### Frontend

The frontend is a static SPA. Build it with:

```bash
npm run build
```

The output in `dist/` can be deployed to any static hosting service (Vercel, Netlify, GitHub Pages, etc.). The production deployment is on Vercel at `https://storyweaver-zeta.vercel.app`.

### Backend

The backend is a standalone Node.js server. It can be deployed to:

- **Render** (current production): `https://storyweaver-9b0g.onrender.com`
- **Any container platform**: Dockerise `backend/server.js` with its `package.json` and dependencies.
- **Process managers**: Run behind PM2 or systemd for automatic restarts.

Ensure `fast-xml-parser`, `axios`, `sanitize-html`, `express`, `cors`, `helmet`, `compression`, and `express-rate-limit` are installed in the deployment environment.

---

## Environment Variables

### Backend

| Variable              | Default                                            | Description                                |
| --------------------- | -------------------------------------------------- | ------------------------------------------ |
| `PORT`                | `5000`                                             | Server port                                |
| `ALLOWED_ORIGINS`     | `http://localhost:5173,https://storyweaver-zeta.vercel.app` | Comma-separated allowed CORS origins |
| `REDIS_URL`           | (empty)                                            | Redis connection string (optional)         |
| `CACHE_FILE`          | `backend/opds_cache.json`                          | Path to file-based cache                   |
| `OPDS_URL`            | StoryWeaver catalog URL                            | Root OPDS catalog feed URL                 |
| `OPDS_WHITELIST`      | (empty)                                            | Comma-separated allowed feed hostnames     |
| `OPDS_MAX_BYTES`      | `5242880` (5 MB)                                   | Maximum feed download size                 |
| `OPDS_RETRIES`        | `2`                                                | Number of retry attempts for feed fetching |
| `OPDS_TIMEOUT_MS`     | `15000`                                            | Feed fetch timeout in milliseconds         |
| `OPDS_USER_AGENT`     | `OPDS-Parser/1.0`                                 | User-Agent header sent with feed requests  |
| `CACHE_TTL_MS`        | `600000` (10 min)                                  | Cache time-to-live in milliseconds         |

### Frontend

| Variable              | Description                                 |
| --------------------- | ------------------------------------------- |
| `MODE` (Vite built-in)| `development` or `production` — controls API base URL |

---

## License

This project is private. Contact the repository owner for licensing information.
