require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function seed() {
  const dataPath = path.resolve(__dirname, '../../../js/data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Canvas config
    await client.query(
      `INSERT INTO canvas_config (id, width, height) VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET width=$1, height=$2`,
      [data.canvas.width, data.canvas.height]
    );

    // Settings
    await client.query(
      `INSERT INTO settings (id, zoom_on_click, min_zoom, max_zoom) VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET zoom_on_click=$1, min_zoom=$2, max_zoom=$3`,
      [data.settings.zoomOnClick, data.settings.minZoom, data.settings.maxZoom]
    );

    // Hotspots
    await client.query('DELETE FROM hotspots');
    for (const h of data.hotspots) {
      await client.query(
        `INSERT INTO hotspots (id, name, enabled, x, y, width, height, title, description, image, sequence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [h.id, h.name, h.enabled !== false, h.region.x, h.region.y, h.region.width, h.region.height, h.content.title, h.content.description || '', h.content.image || '', h.sequence]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded: canvas, settings, ${data.hotspots.length} hotspots`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
