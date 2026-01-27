# Operations Guide

## Prerequisites

- Node.js installed
- Terminal access to the `ProjectCanvas` folder
- Backend `.env` file configured with `DATABASE_URL`
- Fly.io CLI installed (for backend deploys)

---

## 1. Start Local Server

```bash
cd /Users/hasanalimam/repos/ProjectCanvas
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

To stop: press `Ctrl+C` in the terminal.

---

## 2. Hotspot Types

There are **3 types** of hotspots:

| Type | What it shows | Color in Design Mode |
|------|---------------|---------------------|
| **text** | Title + Markdown description + optional small image | Blue |
| **image** | Title + full-size image | Purple |
| **video** | Title + auto-playing video | Orange |

---

## 3. Add/Edit Hotspots

### Step 1: Export current data from database

```bash
cd /Users/hasanalimam/repos/ProjectCanvas/backend
node scripts/sync-data.js --export --out ../js/data.json
```

### Step 2: Start local server

```bash
cd /Users/hasanalimam/repos/ProjectCanvas
python3 -m http.server 8000
```

Open http://localhost:8000

### Step 3: Enter Design Mode

Click the pencil icon (bottom-right control panel) to enter design mode.

### Step 4: Add Hotspots

Click one of the three buttons:
- **+ Text** — Creates a text hotspot (blue)
- **+ Image** — Creates an image hotspot (purple)
- **+ Video** — Creates a video hotspot (orange)

### Step 5: Position and Resize

- **Drag** the hotspot to move it
- **Drag corners** to resize
- **Click the label** to edit the ID

### Step 6: Export JSON

Click **"Copy JSON"** button — this copies the hotspot data to your clipboard.

### Step 7: Update data.json

Paste the clipboard content into `js/data.json` (replace file contents).

### Step 8: Add Content

Edit `js/data.json` to add:

**For text hotspots:**
```json
{
  "id": "1",
  "name": "My Hotspot",
  "type": "text",
  "content": {
    "title": "العنوان",
    "description": "Your markdown content here",
    "image": ""
  }
}
```

**For image hotspots:**
```json
{
  "id": "2",
  "type": "image",
  "content": {
    "title": "صورة",
    "description": "",
    "image": "https://res.cloudinary.com/YOUR_CLOUD/image/upload/v123/photo.jpg"
  }
}
```

**For video hotspots:**
```json
{
  "id": "3",
  "type": "video",
  "content": {
    "title": "فيديو",
    "description": "",
    "image": "",
    "video": "https://res.cloudinary.com/YOUR_CLOUD/video/upload/v123/video.mp4"
  }
}
```

### Step 9: Sync to Database

```bash
cd /Users/hasanalimam/repos/ProjectCanvas/backend
node scripts/sync-data.js --file ../js/data.json --replace
```

Done! Changes appear immediately on the live site.

---

## 4. Writing Formatted Text (Markdown)

Text hotspots support **Markdown formatting**.

### Supported Formatting

| Syntax | Result |
|--------|--------|
| `## عنوان` | Heading |
| `**نص**` | **Bold** |
| `*نص*` | *Italic* |
| `- عنصر` | Bullet list |
| `1. عنصر` | Numbered list |
| `> اقتباس` | Blockquote |
| `[نص](url)` | Link |
| `<span style="color:red">نص</span>` | Colored text |

### Workflow: Write in VS Code, Convert to JSON

**Step 1:** Create a markdown file in `content/` folder:
```
content/hotspot-15.md
```

**Step 2:** Write your content with Markdown formatting

**Step 3:** Preview in VS Code: `Cmd+Shift+V`

**Step 4:** Convert to JSON-escaped string:
```bash
node scripts/md-to-json.js content/hotspot-15.md --copy
```

**Step 5:** Paste the result as the `"description"` value in `data.json`

### Color Examples

```markdown
<span style="color:#e74c3c">نص أحمر</span>
<span style="color:#27ae60">نص أخضر</span>
<span style="color:#3498db">نص أزرق</span>
```

---

## 5. Media Hosting (Images & Videos)

### Recommended: Cloudinary

1. Create free account at [cloudinary.com](https://cloudinary.com)
2. Upload images/videos via their dashboard
3. Copy the URL (must start with `https://res.cloudinary.com/...`)

### URL Format

**Images:**
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v123456/filename.jpg
```

**Videos:**
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/v123456/filename.mp4
```

### Wrong URL Format (won't work)

```
https://collection.cloudinary.com/...  ❌
https://cloudinary.com/console/...     ❌
```

---

## 6. Change the Main Canvas Image

### Step 1: Replace the image file

Replace `resources/complete_design.png` with your new image (keep the same filename).

### Step 2: Commit and Push

```bash
git add resources/complete_design.png
git commit -m "Update main canvas image"
git push
```

Vercel auto-deploys on push. The new image will appear on the live site.

---

## 7. Deploy Backend Changes

If you modify backend code (routes, schema, etc.):

```bash
cd /Users/hasanalimam/repos/ProjectCanvas/backend
fly deploy
```

---

## 8. Database Migration

If adding new database columns, create a migration script in `backend/scripts/` and run:

```bash
cd /Users/hasanalimam/repos/ProjectCanvas/backend
node scripts/migrate-add-type-video.js
```

---

## 9. Quick Reference Commands

| Task | Command |
|------|---------|
| Start local server | `python3 -m http.server 8000` |
| Stop local server | `Ctrl+C` |
| Export DB → JSON | `cd backend && node scripts/sync-data.js --export --out ../js/data.json` |
| Sync JSON → DB | `cd backend && node scripts/sync-data.js --file ../js/data.json --replace` |
| Convert MD → JSON | `node scripts/md-to-json.js content/file.md --copy` |
| Deploy backend | `cd backend && fly deploy` |
| Check API health | `curl https://projectcanvas-api.fly.dev/health` |

---

## 10. Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend API   │     │   Database      │
│   (Vercel)      │────▶│   (Fly.io)      │────▶│   (Neon)        │
│                 │     │                 │     │                 │
│ - HTML/CSS/JS   │     │ - Express.js    │     │ - PostgreSQL    │
│ - Static images │     │ - REST API      │     │ - Hotspot data  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**URLs:**
- Frontend: https://projectcanvas-chi.vercel.app
- API: https://projectcanvas-api.fly.dev
- Health check: https://projectcanvas-api.fly.dev/health

---

## 11. Notes

- `js/data.json` is a working file — the database is the source of truth
- Hotspot changes sync via API — no Vercel redeploy needed
- Image file changes need a git push (Vercel auto-deploys)
- Local server always uses `js/data.json`, production uses the API
- Design mode is only visible on localhost
- Videos auto-play when modal opens (may be muted by browser)
- Markdown supports RTL Arabic text automatically

---

## 12. Troubleshooting

### Hotspot not showing
- Check `"enabled": true` in data.json
- Verify JSON syntax is valid
- Hard refresh browser: `Cmd+Shift+R`

### Image not loading
- Verify URL starts with `https://res.cloudinary.com/`
- Check URL is accessible (open in browser)
- Ensure `"type": "image"` is set

### Video not playing
- Check video URL format (must be direct .mp4 link)
- Ensure `"type": "video"` is set
- Some browsers block autoplay — user can click play

### Modal shows wrong content
- Hard refresh: `Cmd+Shift+R`
- Clear browser cache

### JSON sync failed
- Check `backend/.env` has correct `DATABASE_URL`
- Verify JSON syntax: `node -e "JSON.parse(require('fs').readFileSync('js/data.json'))"`
