# Backend Migration Plan (Neon + Fly.io + Vercel)

## Goals
- Protect data from being directly accessible in source files or git.
- Prevent casual copying/scraping of the full dataset.
- Allow you (admin) to update data safely via CLI.
- Preserve current frontend behavior and visual layout.
- Run the new version in parallel with GitHub Pages until verified.

## Threat Model & Data Protection Strategy

**What we're protecting against:**
- Users viewing `data.json` in DevTools/GitHub (eliminated by removing the file).
- Users cloning the repo and getting all data (eliminated by DB storage).
- Casual scraping of the public API.

**Protection layers:**
1. **No static data file** — data lives only in the database.
2. **Origin-restricted API** — CORS only allows your Vercel domain.
3. **Rate limiting** — 60 requests/minute per IP on the public endpoint.
4. **Referrer/origin validation** — API rejects requests without valid origin header.
5. **No bulk export on public endpoint** — only returns enabled hotspots.

**Acknowledged limitation:**
A determined user can still see the API response in DevTools since the frontend must receive the data to render it. The above layers make it significantly harder to automate extraction or reuse the data elsewhere, but they cannot make browser-rendered data fully invisible.

## Current State (Baseline)
- Static frontend served via GitHub Pages.
- Data loaded from `js/data.json` in the browser.
- No authentication or backend.
- No `package.json` or build step.

## Target Architecture
```
┌─────────────┐       ┌─────────────────┐       ┌──────────────┐
│   Vercel    │──────▶│   Fly.io API    │──────▶│  Neon (PG)   │
│  (Frontend) │ HTTPS │  (Express.js)   │  TLS  │  (Database)  │
└─────────────┘       └─────────────────┘       └──────────────┘
                             ▲
                             │ CLI (admin)
                      ┌──────┴──────┐
                      │ sync script │
                      └─────────────┘
```

- **Neon (Postgres)**: source of truth for hotspots, canvas config, and settings.
- **Backend API on Fly.io**: secure data access + admin updates.
- **Frontend on Vercel**: static hosting with API calls to Fly.io.

## Project Structure

Everything lives in this repo under a `backend/` subfolder:

```
ProjectCanvas/
├── index.html
├── css/styles.css
├── js/app.js                    # Modified to fetch from API
├── resources/
├── backend/
│   ├── package.json
│   ├── .env.example             # Template for env vars
│   ├── src/
│   │   ├── index.js             # Express app entry point
│   │   ├── routes/
│   │   │   ├── canvas.js        # GET /api/canvas
│   │   │   └── admin.js         # POST /api/admin/*
│   │   ├── middleware/
│   │   │   ├── auth.js          # Bearer token check
│   │   │   ├── cors.js          # CORS configuration
│   │   │   └── rateLimit.js     # Rate limiting
│   │   └── db/
│   │       ├── pool.js          # Neon connection pool
│   │       ├── schema.sql       # Table definitions
│   │       └── seed.js          # Seed from data.json
│   ├── scripts/
│   │   └── sync-data.js         # CLI sync tool
│   ├── fly.toml                 # Fly.io config
│   └── Dockerfile               # Container for Fly.io
├── vercel.json                  # Vercel config (if needed)
└── docs/
```

## Data Model

### Database Schema (`backend/src/db/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS canvas_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    CHECK (id = 1)  -- singleton row
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    zoom_on_click REAL NOT NULL DEFAULT 1.5,
    min_zoom REAL NOT NULL DEFAULT 0.5,
    max_zoom REAL NOT NULL DEFAULT 3.0,
    CHECK (id = 1)  -- singleton row
);

CREATE TABLE IF NOT EXISTS hotspots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    sequence INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hotspots_enabled ON hotspots(enabled);
CREATE INDEX IF NOT EXISTS idx_hotspots_sequence ON hotspots(sequence);
```

### DB-to-JSON Mapping

The database stores hotspots flat, but the API reconstructs the nested JSON shape the frontend expects:

```
DB Column       →  JSON Path
─────────────────────────────
x, y            →  hotspot.region.x, hotspot.region.y
width, height   →  hotspot.region.width, hotspot.region.height
title           →  hotspot.content.title
description     →  hotspot.content.description
image           →  hotspot.content.image
```

The `GET /api/canvas` response matches the current `data.json` structure exactly:
```json
{
  "canvas": { "width": 1376, "height": 768 },
  "settings": { "zoomOnClick": 1.5, "minZoom": 0.5, "maxZoom": 3 },
  "hotspots": [
    {
      "id": "4",
      "name": "رفاه الذهبي",
      "region": { "x": 815, "y": 133, "width": 129, "height": 39 },
      "content": { "title": "رفاه الذهبي", "description": "...", "image": "" },
      "sequence": 4
    }
  ]
}
```

Note: The public endpoint only returns hotspots where `enabled = TRUE`. The `enabled` field is omitted from the response (all returned hotspots are implicitly enabled).

## Environment Variables

### Fly.io (`backend/.env.example`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon connection string | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require` |
| `ADMIN_TOKEN` | Secret token for admin endpoints | `a-long-random-string-here` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://your-app.vercel.app` |
| `PORT` | Server port (Fly sets this) | `8080` |
| `NODE_ENV` | Environment | `production` |
| `RATE_LIMIT_MAX` | Max requests per window | `60` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `60000` |

### Vercel (Frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Fly.io API base URL | `https://your-app.fly.dev` |

Since the frontend has no build step, the API URL will be set in a small config file (`js/config.js`) rather than a build-time env var.

## API Design (Fly.io)

### Public Endpoints

| Method | Path | Description | Protection |
|--------|------|-------------|------------|
| `GET` | `/api/canvas` | Returns canvas + settings + enabled hotspots | CORS + Rate limit |
| `GET` | `/health` | Health check (for Fly.io) | None |

### Admin Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/admin/hotspots` | Create or update a single hotspot | Bearer token |
| `PUT` | `/api/admin/hotspots/:id` | Update a specific hotspot | Bearer token |
| `DELETE` | `/api/admin/hotspots/:id` | Delete a hotspot | Bearer token |
| `POST` | `/api/admin/bulk` | Replace full dataset (canvas + settings + all hotspots) | Bearer token |
| `GET` | `/api/admin/export` | Export full DB as JSON (including disabled) | Bearer token |

### CORS Configuration

```javascript
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET'],  // Public only needs GET
    allowedHeaders: ['Content-Type'],
};

// Admin routes use separate CORS allowing all methods + Authorization header
const adminCorsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
```

### Rate Limiting

```javascript
// 60 requests per minute per IP
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 60,
    standardHeaders: true,
    legacyHeaders: false,
});
// Applied only to /api/canvas
```

## Auth & Admin
- Single admin token stored as env var on Fly.io.
- Admin endpoints require `Authorization: Bearer <token>` header.
- Token should be 32+ random characters (generate with `openssl rand -hex 32`).
- Updates happen via CLI sync script (no admin UI needed).
- To rotate: update the env var on Fly.io and redeploy.

## Frontend Changes

### Config File (`js/config.js` — new file)

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-app.fly.dev',
    // Set to '' to fall back to local data.json (for development)
};
```

### Data Loading Change (`js/app.js`)

Replace the current `loadData()` fetch:

```javascript
// Before:
const response = await fetch('js/data.json');

// After:
const apiUrl = CONFIG.API_BASE_URL
    ? `${CONFIG.API_BASE_URL}/api/canvas`
    : 'js/data.json';
const response = await fetch(apiUrl);
```

### Error Handling

```javascript
async function loadData() {
    try {
        const apiUrl = CONFIG.API_BASE_URL
            ? `${CONFIG.API_BASE_URL}/api/canvas`
            : 'js/data.json';
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        // ... existing processing logic unchanged
    } catch (error) {
        console.error('Failed to load data:', error);
        // Show user-friendly error state
        document.getElementById('canvas-container').innerHTML =
            '<div style="text-align:center;padding:2rem;color:#666;">Unable to load content. Please try again later.</div>';
    }
}
```

### Design Mode

Design mode continues to work on localhost by fetching from `js/data.json` (fallback when `CONFIG.API_BASE_URL` is empty). The `generateJSON()` / `saveDesign()` functions remain unchanged — they export JSON to clipboard which you then sync via CLI.

## Local Development Workflow

### Running the Backend Locally

```bash
cd backend
cp .env.example .env
# Edit .env with your Neon DATABASE_URL and a test ADMIN_TOKEN
# Set CORS_ORIGIN=http://localhost:8080

npm install
npm run dev   # nodemon src/index.js
```

### Running the Frontend Locally

```bash
# From project root — just serve static files
npx serve .
# Or use Python:
python3 -m http.server 8000
```

For local dev, set `js/config.js` → `API_BASE_URL: 'http://localhost:3001'` (or whatever port the backend runs on).

### Testing the Full Stack Locally

1. Start backend on port 3001
2. Start frontend on port 8000
3. Set `CORS_ORIGIN=http://localhost:8000` in backend `.env`
4. Set `API_BASE_URL=http://localhost:3001` in `js/config.js`

## Database Migrations

For this small app, migrations are handled via the schema file:

- `backend/src/db/schema.sql` uses `CREATE TABLE IF NOT EXISTS` — safe to re-run.
- For future schema changes, add numbered migration files:
  ```
  backend/src/db/
  ├── schema.sql          # Initial schema
  ├── migrations/
  │   ├── 001_add_color.sql
  │   └── 002_add_category.sql
  ```
- Run migrations manually: `psql $DATABASE_URL -f backend/src/db/migrations/001_add_color.sql`
- Alternatively, adopt a migration tool (e.g., `node-pg-migrate`) if schema changes become frequent.

## Image / Asset Hosting

Current state: all `image` fields are empty strings. When you add images:

- **Option A (recommended for now):** Store images in `resources/` folder, deploy with frontend on Vercel. The `image` field stores a relative path like `resources/photo1.png`. No backend change needed.
- **Option B (future):** Use Vercel Blob or Cloudflare R2 for uploaded images. The `image` field stores a full URL.

Since images are static assets (not user-uploaded), Option A is simpler and sufficient.

## Deployment Plan

### Phase 1: Backend Setup
1. Create Neon project → get `DATABASE_URL`.
2. Run `schema.sql` against Neon to create tables.
3. Run `seed.js` to populate from `js/data.json`.
4. Verify data with `psql` or Neon dashboard.

### Phase 2: Fly.io API
1. `cd backend && fly launch` — create app.
2. Set secrets: `fly secrets set DATABASE_URL=... ADMIN_TOKEN=... CORS_ORIGIN=...`
3. Deploy: `fly deploy`
4. Test: `curl https://your-app.fly.dev/api/canvas`
5. Verify response matches `data.json` structure.

### Phase 3: Vercel Frontend
1. Connect repo to Vercel (root directory deployment).
2. Update `js/config.js` with Fly.io URL.
3. Deploy and verify the canvas loads from API.
4. Test on mobile and desktop.

### Phase 4: Parallel Run & Cutover
1. Both GitHub Pages and Vercel serve the app simultaneously.
2. GitHub Pages continues using local `data.json` (unchanged).
3. Vercel uses the Fly.io API.
4. Test Vercel thoroughly (navigation, modals, zoom, mobile).
5. Once satisfied, update DNS / share Vercel URL as primary.
6. Keep GitHub Pages live for 1-2 weeks as fallback.
7. After confirmation, remove `js/data.json` from the repo and disable GitHub Pages.

## CLI Sync Workflow

### Usage

```bash
cd backend

# Sync from a JSON file to the database (upsert)
node scripts/sync-data.js --file ../js/data.json

# Replace all data (delete existing, insert fresh)
node scripts/sync-data.js --file ../js/data.json --replace

# Export database back to JSON file
node scripts/sync-data.js --export --out ../js/data-export.json
```

### What the Script Does

1. Reads the JSON file (same format as `data.json`).
2. Validates required fields (id, name, region, content, sequence).
3. Connects to Neon using `DATABASE_URL`.
4. Upserts `canvas_config` and `settings` (singleton rows).
5. For hotspots:
   - `--replace` mode: deletes all rows, inserts fresh.
   - Default mode: upserts each hotspot by `id`.
6. Reports success/failure counts.

### Export (DB → JSON)

The `--export` flag queries the full database (including disabled hotspots) and writes it in the exact `data.json` format. Useful for backup or updating the local file for design mode.

## Fly.io Configuration (`backend/fly.toml`)

```toml
app = "projectcanvas-api"
primary_region = "iad"  # US East (close to Neon)

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  path = "/health"
  interval = "30s"
  timeout = "5s"
```

## Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ ./src/
COPY scripts/ ./scripts/
EXPOSE 8080
CMD ["node", "src/index.js"]
```

## Risks / Considerations

| Risk | Mitigation |
|------|-----------|
| CORS misconfiguration | Test with browser DevTools; set exact origin, not wildcard |
| Latency (Vercel → Fly.io → Neon) | All in US East region; response is small (~5KB) |
| Neon cold starts (free tier) | First request may be slow (~1-2s); app shows loading state |
| Admin token leaked | Rotate via `fly secrets set`; never commit to git |
| Rate limit too aggressive | Start at 60/min; adjust based on real usage |
| Fly.io machine sleeps | `auto_start_machines = true` handles this; first request wakes it |

## Milestones

- **M1:** Backend project scaffolded (`package.json`, Express app, Dockerfile) — runs locally.
- **M2:** DB schema created on Neon + data seeded from `data.json`.
- **M3:** API deployed to Fly.io, `GET /api/canvas` returns correct data.
- **M4:** Frontend on Vercel reads from Fly.io API successfully.
- **M5:** Admin sync script works (upsert + replace + export).
- **M6:** Both versions running in parallel, Vercel verified on mobile/desktop.
- **M7:** Cutover complete, GitHub Pages retired, `data.json` removed from repo.

## Dependencies (backend/package.json)

```json
{
  "name": "projectcanvas-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18",
    "pg": "^8.11",
    "cors": "^2.8",
    "express-rate-limit": "^7.1",
    "dotenv": "^16.3"
  },
  "devDependencies": {
    "nodemon": "^3.0"
  }
}
```
