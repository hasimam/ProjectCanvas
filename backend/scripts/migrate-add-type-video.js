/**
 * Migration: Add type and video columns to hotspots table
 * Run with: node scripts/migrate-add-type-video.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../src/db/pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding type and video columns to hotspots table...');

    // Add type column (default 'text' for existing hotspots)
    await client.query(`
      ALTER TABLE hotspots
      ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text'
    `);
    console.log('Added type column');

    // Add video column
    await client.query(`
      ALTER TABLE hotspots
      ADD COLUMN IF NOT EXISTS video TEXT NOT NULL DEFAULT ''
    `);
    console.log('Added video column');

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
