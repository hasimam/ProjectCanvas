require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const outIdx = args.indexOf('--out');
const replace = args.includes('--replace');
const doExport = args.includes('--export');

async function syncFromFile(filePath) {
  const data = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert canvas + settings
    if (data.canvas) {
      await client.query(
        `INSERT INTO canvas_config (id, width, height) VALUES (1, $1, $2)
         ON CONFLICT (id) DO UPDATE SET width=$1, height=$2`,
        [data.canvas.width, data.canvas.height]
      );
    }
    if (data.settings) {
      await client.query(
        `INSERT INTO settings (id, zoom_on_click, min_zoom, max_zoom) VALUES (1, $1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET zoom_on_click=$1, min_zoom=$2, max_zoom=$3`,
        [data.settings.zoomOnClick, data.settings.minZoom, data.settings.maxZoom]
      );
    }

    if (data.hotspots) {
      if (replace) await client.query('DELETE FROM hotspots');
      let count = 0;
      for (const h of data.hotspots) {
        if (!h.id || !h.name || !h.region || !h.content || h.sequence == null) {
          console.warn(`Skipping invalid hotspot: ${JSON.stringify(h).slice(0, 80)}`);
          continue;
        }
        await client.query(
          `INSERT INTO hotspots (id, name, enabled, x, y, width, height, title, description, image, sequence)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE SET name=$2, enabled=$3, x=$4, y=$5, width=$6, height=$7, title=$8, description=$9, image=$10, sequence=$11`,
          [h.id, h.name, h.enabled !== false, h.region.x, h.region.y, h.region.width, h.region.height, h.content.title, h.content.description || '', h.content.image || '', h.sequence]
        );
        count++;
      }
      console.log(`Synced ${count} hotspots${replace ? ' (replace mode)' : ''}`);
    }

    await client.query('COMMIT');
    console.log('Sync complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sync failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function exportData(outPath) {
  const [canvasResult, settingsResult, hotspotsResult] = await Promise.all([
    pool.query('SELECT width, height FROM canvas_config WHERE id = 1'),
    pool.query('SELECT zoom_on_click, min_zoom, max_zoom FROM settings WHERE id = 1'),
    pool.query('SELECT * FROM hotspots ORDER BY sequence'),
  ]);

  const canvas = canvasResult.rows[0] || { width: 1376, height: 768 };
  const sr = settingsResult.rows[0] || {};
  const settings = { zoomOnClick: sr.zoom_on_click ?? 1.5, minZoom: sr.min_zoom ?? 0.5, maxZoom: sr.max_zoom ?? 3 };
  const hotspots = hotspotsResult.rows.map(row => {
    const h = {
      id: row.id, name: row.name,
      region: { x: row.x, y: row.y, width: row.width, height: row.height },
      content: { title: row.title, description: row.description, image: row.image },
      sequence: row.sequence,
    };
    if (!row.enabled) h.enabled = false;
    return h;
  });

  const json = JSON.stringify({ canvas, settings, hotspots }, null, 2);
  if (outPath) {
    fs.writeFileSync(path.resolve(outPath), json, 'utf-8');
    console.log(`Exported to ${outPath}`);
  } else {
    process.stdout.write(json);
  }
}

async function main() {
  if (doExport) {
    await exportData(outIdx !== -1 ? args[outIdx + 1] : null);
  } else if (fileIdx !== -1) {
    await syncFromFile(args[fileIdx + 1]);
  } else {
    console.log('Usage:\n  --file <path> [--replace]  Sync JSON to DB\n  --export [--out <path>]    Export DB to JSON');
  }
  await pool.end();
}

main();
