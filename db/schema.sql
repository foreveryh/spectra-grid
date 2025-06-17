-- D1 schema for `photo_meta` database
-- Run via: wrangler d1 execute DB --file db/schema.sql

CREATE TABLE IF NOT EXISTS photos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT    NOT NULL,
  r2_key        TEXT    NOT NULL UNIQUE,
  thumb_key     TEXT    NOT NULL UNIQUE,
  dominant_rgb  TEXT    NOT NULL,
  hue           INTEGER NOT NULL,
  saturation    REAL    NOT NULL,
  lightness     REAL    NOT NULL,
  is_bw         INTEGER NOT NULL DEFAULT 0,
  palette       TEXT,
  created_at    INTEGER NOT NULL,
  is_deleted    INTEGER NOT NULL DEFAULT 0,
  purged        INTEGER NOT NULL DEFAULT 0
);

-- Helpful indices
CREATE INDEX IF NOT EXISTS idx_hue      ON photos(hue);
CREATE INDEX IF NOT EXISTS idx_created  ON photos(created_at); 