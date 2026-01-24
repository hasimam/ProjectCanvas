CREATE TABLE IF NOT EXISTS canvas_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    zoom_on_click REAL NOT NULL DEFAULT 1.5,
    min_zoom REAL NOT NULL DEFAULT 0.5,
    max_zoom REAL NOT NULL DEFAULT 3.0,
    CHECK (id = 1)
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
