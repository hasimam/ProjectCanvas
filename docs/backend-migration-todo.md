# Backend Migration Todo

## Phase 1: Scaffold Backend Project

- [x] Create `backend/` directory
- [x] Create `backend/package.json` with dependencies (express, pg, cors, express-rate-limit, dotenv, nodemon)
- [x] Create `backend/.env.example` with all variable names and comments
- [x] Create `backend/.gitignore` (node_modules, .env, etc.)
- [x] Create `backend/src/index.js` — Express app with health check
- [x] Create `backend/src/db/pool.js` — Neon connection pool using `DATABASE_URL`
- [x] Create `backend/src/db/schema.sql` — table definitions (canvas_config, settings, hotspots)
- [x] Create `backend/src/middleware/auth.js` — Bearer token validation
- [x] Create `backend/src/middleware/cors.js` — CORS config from env
- [x] Create `backend/src/middleware/rateLimit.js` — rate limiter config
- [x] Create `backend/src/routes/canvas.js` — `GET /api/canvas` (public, returns nested JSON)
- [x] Create `backend/src/routes/admin.js` — admin CRUD endpoints
- [x] Create `backend/Dockerfile`
- [x] Create `backend/fly.toml`
- [x] Run `npm install` and verify app starts locally with `npm run dev`

## Phase 2: Database Setup (Neon)

- [x] Create Neon project (EU Central region)
- [x] Copy `DATABASE_URL` connection string
- [x] Run `schema.sql` against Neon via Node.js pg driver
- [x] Create `backend/src/db/seed.js` — reads `js/data.json`, inserts into all tables
- [x] Run seed script: seeded 34 hotspots
- [x] Verify data via local API (12 enabled hotspots returned)
- [x] Test `GET /api/canvas` locally returns correct nested JSON matching `data.json` shape

## Phase 3: CLI Sync Script

- [x] Create `backend/scripts/sync-data.js`
- [x] Implement `--file <path>` flag — read JSON and upsert to DB
- [x] Implement `--replace` flag — delete all then insert
- [x] Implement `--export --out <path>` flag — dump DB to JSON file
- [x] Add field validation (id, name, region.x/y/width/height, content.title, sequence)
- [ ] Test upsert: modify a hotspot in JSON, run sync, verify DB updated
- [ ] Test replace: run with `--replace`, verify clean state
- [ ] Test export: run `--export`, compare output with original `data.json`

## Phase 4: Deploy API to Fly.io

- [x] Install Fly CLI (`brew install flyctl` or curl installer)
- [x] Run `fly auth login`
- [x] Run `cd backend && fly apps create projectcanvas-api`
- [x] Set secrets: `fly secrets set DATABASE_URL=... ADMIN_TOKEN=... CORS_ORIGIN=...`
- [x] Deploy: `fly deploy`
- [x] Test health: `curl https://projectcanvas-api.fly.dev/health` → OK
- [x] Test public API: `curl https://projectcanvas-api.fly.dev/api/canvas` → 12 hotspots
- [x] Verify JSON response matches expected format
- [ ] Test CORS: confirm browser requests from non-allowed origins are rejected
- [ ] Test rate limiting: send 61+ requests in a minute, confirm 429 response
- [x] Test admin auth: 401 without token, 200 with token

## Phase 5: Frontend Changes

- [x] Create `js/config.js` with `API_BASE_URL` (initially empty string for local dev)
- [x] Add `<script src="js/config.js"></script>` to `index.html` before `app.js`
- [x] Update `loadData()` in `js/app.js` to use `CONFIG.API_BASE_URL` with `data.json` fallback
- [x] Add error handling: show user-friendly message if API fails
- [ ] Test locally: `API_BASE_URL = ''` → loads from `data.json` (existing behavior)
- [ ] Test locally: `API_BASE_URL = 'http://localhost:3001'` → loads from local API
- [ ] Verify design mode still works on localhost (uses `data.json` fallback)

## Phase 6: Deploy Frontend to Vercel

- [ ] Create `vercel.json` if needed (should work without it for static sites)
- [ ] Connect repo to Vercel (import from GitHub)
- [ ] Set root directory to `.` (project root)
- [ ] Update `js/config.js` with production Fly.io URL
- [ ] Deploy to Vercel
- [ ] Update Fly.io CORS_ORIGIN to match Vercel domain: `fly secrets set CORS_ORIGIN="https://your-app.vercel.app"`
- [ ] Test on Vercel: canvas loads, hotspots work, modals open, navigation works
- [ ] Test on mobile: pan/zoom, tap hotspots, modal display
- [ ] Test error state: temporarily break API URL, confirm error message shows

## Phase 7: Parallel Run & Verification

- [ ] Confirm GitHub Pages still works (unchanged, uses `data.json`)
- [ ] Confirm Vercel works (uses Fly.io API)
- [ ] Compare behavior side-by-side: same hotspots, same positions, same modals
- [ ] Test with slow connection (throttle in DevTools)
- [ ] Check Fly.io logs for errors: `fly logs`
- [ ] Monitor for cold-start latency issues
- [ ] Share Vercel URL with testers if applicable

## Phase 8: Cutover

- [ ] Update primary URL/DNS to point to Vercel (if using custom domain)
- [ ] Keep GitHub Pages live as fallback
- [ ] After 1-2 weeks of stable Vercel, proceed with cleanup:
  - [ ] Remove `js/data.json` from the repo (data now lives in DB only)
  - [ ] Add `js/data.json` to `.gitignore` (in case design mode exports create it)
  - [ ] Disable GitHub Pages in repo settings
  - [ ] Update any links/bookmarks to new URL

## Notes

- Generate admin token: `openssl rand -hex 32`
- All services in US East for minimal latency (Neon, Fly.io iad region)
- Fly.io free tier: 3 shared VMs, auto-sleep when idle
- Neon free tier: 0.5 GB storage, auto-suspend after 5 min inactivity
- First request after sleep may be slow (1-2s) — this is acceptable for this app
