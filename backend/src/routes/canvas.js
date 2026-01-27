const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [canvasResult, settingsResult, hotspotsResult] = await Promise.all([
      pool.query('SELECT width, height FROM canvas_config WHERE id = 1'),
      pool.query('SELECT zoom_on_click, min_zoom, max_zoom FROM settings WHERE id = 1'),
      pool.query('SELECT id, name, type, x, y, width, height, title, description, image, video, sequence FROM hotspots WHERE enabled = TRUE ORDER BY sequence'),
    ]);

    const canvas = canvasResult.rows[0] || { width: 1376, height: 768 };
    const settingsRow = settingsResult.rows[0] || {};
    const settings = {
      zoomOnClick: settingsRow.zoom_on_click ?? 1.5,
      minZoom: settingsRow.min_zoom ?? 0.5,
      maxZoom: settingsRow.max_zoom ?? 3,
    };

    const hotspots = hotspotsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type || 'text',
      region: { x: row.x, y: row.y, width: row.width, height: row.height },
      content: { title: row.title, description: row.description, image: row.image, video: row.video || '' },
      sequence: row.sequence,
    }));

    res.json({ canvas, settings, hotspots });
  } catch (err) {
    console.error('Error fetching canvas data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
