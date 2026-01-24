# Operations Guide

## Prerequisites

- Node.js installed
- Terminal access to the `ProjectCanvas` folder
- Backend `.env` file configured (already done)

---

## 1. Start Local Server

```bash
cd /Users/hasanalimam/repos/ProjectCanvas
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

To stop: press `Ctrl+C` in the terminal.

---

## 2. Edit Hotspots (Add / Delete / Change Text)

### Step 1: Export current data from database

```bash
cd /Users/hasanalimam/repos/ProjectCanvas/backend
node scripts/sync-data.js --export --out ../js/data.json
```

This downloads the latest hotspots from the database into `js/data.json`.

### Step 2: Start local server and open design mode

```bash
cd /Users/hasanalimam/repos/ProjectCanvas
python3 -m http.server 8000
```

Open http://localhost:8000 and activate design mode (click the hidden design toggle).

### Step 3: Make your changes

- **Add hotspot:** Use the design mode UI to create a new hotspot region
- **Delete hotspot:** Remove it in design mode
- **Change text:** Edit the title/description in design mode

### Step 4: Export JSON

Use the design mode export button — it copies the JSON to your clipboard.

### Step 5: Save the JSON

Paste the clipboard content into `js/data.json` (replace the file contents).

### Step 6: Sync to database

```bash
cd /Users/hasanalimam/repos/ProjectCanvas/backend
node scripts/sync-data.js --file ../js/data.json --replace
```

Done. Changes appear immediately on https://projectcanvas-chi.vercel.app (no redeploy needed).

---

## 3. Change the Main View Image

### Step 1: Replace the image file

Replace `resources/complete_design.png` with your new image (keep the same filename).

### Step 2: Push to GitHub

```bash
cd /Users/hasanalimam/repos/ProjectCanvas
git add resources/complete_design.png
git commit -m "Update main canvas image"
git push
```

### Step 3: Redeploy to Vercel

```bash
vercel deploy --prod --yes
```

The new image will appear on the live site.

---

## 4. Quick Reference Commands

| Task | Command |
|------|---------|
| Start local server | `python3 -m http.server 8000` |
| Stop local server | `Ctrl+C` |
| Export DB → JSON | `cd backend && node scripts/sync-data.js --export --out ../js/data.json` |
| Sync JSON → DB | `cd backend && node scripts/sync-data.js --file ../js/data.json --replace` |
| Redeploy frontend | `vercel deploy --prod --yes` |
| Check API health | `curl https://projectcanvas-api.fly.dev/health` |

---

## Notes

- `js/data.json` is a temporary working file — the database is the source of truth
- Hotspot changes (text, position, add/delete) don't need a Vercel redeploy — they sync via the API
- Image changes need a Vercel redeploy (images are static files)
- The local server always loads from `js/data.json` (design mode), not the API
