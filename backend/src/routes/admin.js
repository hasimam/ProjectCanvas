const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();
router.use(auth);

// Create or update a hotspot
router.post('/hotspots', async (req, res) => {
  try {
    const { id, name, enabled = true, region, content, sequence } = req.body;
    if (!id || !name || !region || !content || sequence == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await pool.query(
      `INSERT INTO hotspots (id, name, enabled, x, y, width, height, title, description, image, sequence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET name=$2, enabled=$3, x=$4, y=$5, width=$6, height=$7, title=$8, description=$9, image=$10, sequence=$11`,
      [id, name, enabled, region.x, region.y, region.width, region.height, content.title, content.description || '', content.image || '', sequence]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error upserting hotspot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a specific hotspot
router.put('/hotspots/:id', async (req, res) => {
  try {
    const { name, enabled, region, content, sequence } = req.body;
    const result = await pool.query(
      `UPDATE hotspots SET name=COALESCE($1,name), enabled=COALESCE($2,enabled), x=COALESCE($3,x), y=COALESCE($4,y),
       width=COALESCE($5,width), height=COALESCE($6,height), title=COALESCE($7,title),
       description=COALESCE($8,description), image=COALESCE($9,image), sequence=COALESCE($10,sequence)
       WHERE id=$11`,
      [name, enabled, region?.x, region?.y, region?.width, region?.height, content?.title, content?.description, content?.image, sequence, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating hotspot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a hotspot
router.delete('/hotspots/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM hotspots WHERE id=$1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting hotspot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk replace all data
router.post('/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { canvas, settings, hotspots } = req.body;
    await client.query('BEGIN');

    if (canvas) {
      await client.query(
        `INSERT INTO canvas_config (id, width, height) VALUES (1, $1, $2)
         ON CONFLICT (id) DO UPDATE SET width=$1, height=$2`,
        [canvas.width, canvas.height]
      );
    }
    if (settings) {
      await client.query(
        `INSERT INTO settings (id, zoom_on_click, min_zoom, max_zoom) VALUES (1, $1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET zoom_on_click=$1, min_zoom=$2, max_zoom=$3`,
        [settings.zoomOnClick, settings.minZoom, settings.maxZoom]
      );
    }
    if (hotspots) {
      await client.query('DELETE FROM hotspots');
      for (const h of hotspots) {
        await client.query(
          `INSERT INTO hotspots (id, name, enabled, x, y, width, height, title, description, image, sequence)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [h.id, h.name, h.enabled !== false, h.region.x, h.region.y, h.region.width, h.region.height, h.content.title, h.content.description || '', h.content.image || '', h.sequence]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in bulk update:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Export full DB as JSON
router.get('/export', async (req, res) => {
  try {
    const [canvasResult, settingsResult, hotspotsResult] = await Promise.all([
      pool.query('SELECT width, height FROM canvas_config WHERE id = 1'),
      pool.query('SELECT zoom_on_click, min_zoom, max_zoom FROM settings WHERE id = 1'),
      pool.query('SELECT * FROM hotspots ORDER BY sequence'),
    ]);

    const canvas = canvasResult.rows[0] || { width: 1376, height: 768 };
    const settingsRow = settingsResult.rows[0] || {};
    const settings = {
      zoomOnClick: settingsRow.zoom_on_click ?? 1.5,
      minZoom: settingsRow.min_zoom ?? 0.5,
      maxZoom: settingsRow.max_zoom ?? 3,
    };

    const hotspots = hotspotsResult.rows.map(row => {
      const h = {
        id: row.id,
        name: row.name,
        region: { x: row.x, y: row.y, width: row.width, height: row.height },
        content: { title: row.title, description: row.description, image: row.image },
        sequence: row.sequence,
      };
      if (!row.enabled) h.enabled = false;
      return h;
    });

    res.json({ canvas, settings, hotspots });
  } catch (err) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
