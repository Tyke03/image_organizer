import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "library.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS roots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  root_id INTEGER NOT NULL REFERENCES roots(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  rel_path TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  caption TEXT,
  indexed_at TEXT,
  error TEXT,
  fingerprint TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_root ON images(root_id);
CREATE INDEX IF NOT EXISTS idx_images_mtime ON images(mtime_ms);
CREATE INDEX IF NOT EXISTS idx_images_size ON images(size_bytes);
CREATE INDEX IF NOT EXISTS idx_images_name ON images(rel_path);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  use_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_use ON tags(use_count DESC);

CREATE TABLE IF NOT EXISTS image_tags (
  image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (image_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_image_tags_tag ON image_tags(tag_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

const DEFAULTS: Record<string, string> = {
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "qwen3.8-ctx8k:latest",
  maxImagePx: "768",
  thumbSize: "256",
};

export function getSetting(key: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? DEFAULTS[key] ?? "";
}

export function getSettings(): Record<string, string> {
  const out = { ...DEFAULTS };
  for (const row of db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[]) {
    out[row.key] = row.value;
  }
  return out;
}

export function setSettings(partial: Record<string, string>) {
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  const tx = db.transaction((entries: [string, string][]) => {
    for (const [k, v] of entries) upsert.run(k, v);
  });
  tx(Object.entries(partial));
  return getSettings();
}

export function fingerprint(filePath: string, mtimeMs: number, sizeBytes: number): string {
  return `${filePath}|${mtimeMs}|${sizeBytes}`;
}

export { DB_PATH, DATA_DIR, ROOT_DIR };
