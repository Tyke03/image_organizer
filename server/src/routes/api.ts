import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { db, getSettings, setSettings } from "../db.js";
import {
  startIndex,
  pauseIndex,
  resumeIndex,
  cancelIndex,
  getIndexStatus,
} from "../indexer.js";
import { ollamaHealth } from "../ollama.js";
import { postProcessTags } from "../lib/tags.js";

export const api = Router();

// ---- Roots ----
api.get("/roots", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*,
        (SELECT COUNT(*) FROM images i WHERE i.root_id = r.id) AS image_count
       FROM roots r ORDER BY r.id`
    )
    .all();
  res.json(rows);
});

api.post("/roots", (req, res) => {
  const rawPath = String(req.body?.path ?? "").trim();
  if (!rawPath) return res.status(400).json({ error: "path required" });
  const resolved = path.resolve(rawPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return res.status(400).json({ error: "path must be an existing directory" });
  }
  const label = String(req.body?.label ?? path.basename(resolved));
  try {
    const info = db
      .prepare("INSERT INTO roots (path, label) VALUES (?, ?)")
      .run(resolved, label);
    const row = db.prepare("SELECT * FROM roots WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) return res.status(409).json({ error: "root already exists" });
    throw e;
  }
});

api.delete("/roots/:id", (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM roots WHERE id = ?").run(id);
  if (!info.changes) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ---- Index ----
api.post("/index/start", (req, res) => {
  const rootId = req.body?.rootId != null ? Number(req.body.rootId) : undefined;
  res.json(startIndex(rootId));
});

api.post("/index/pause", (_req, res) => res.json(pauseIndex()));
api.post("/index/resume", (_req, res) => res.json(resumeIndex()));
api.post("/index/cancel", (_req, res) => res.json(cancelIndex()));
api.get("/index/status", (_req, res) => res.json(getIndexStatus()));

// ---- Search (progressive AND tags) ----
api.get("/search", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const sort = String(req.query.sort ?? "mtime");
  const order = String(req.query.order ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const sortCol =
    sort === "size" ? "i.size_bytes" : sort === "name" ? "i.rel_path" : "i.mtime_ms";

  const terms = postProcessTags(q);

  let sql: string;
  const params: unknown[] = [];

  if (!terms.length) {
    sql = `
      SELECT i.*,
        (SELECT GROUP_CONCAT(t.name, ',') FROM image_tags it
           JOIN tags t ON t.id = it.tag_id WHERE it.image_id = i.id) AS tags
      FROM images i
      ORDER BY ${sortCol} ${order}
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);
  } else {
    // Progressive AND: image must have every queried tag
    const placeholders = terms.map(() => "?").join(",");
    sql = `
      SELECT i.*,
        (SELECT GROUP_CONCAT(t.name, ',') FROM image_tags it
           JOIN tags t ON t.id = it.tag_id WHERE it.image_id = i.id) AS tags
      FROM images i
      WHERE i.id IN (
        SELECT it.image_id
        FROM image_tags it
        JOIN tags t ON t.id = it.tag_id
        WHERE t.name IN (${placeholders})
        GROUP BY it.image_id
        HAVING COUNT(DISTINCT t.name) = ?
      )
      ORDER BY ${sortCol} ${order}
      LIMIT ? OFFSET ?
    `;
    params.push(...terms, terms.length, limit, offset);
  }

  const items = db.prepare(sql).all(...params);

  let total: number;
  if (!terms.length) {
    total = (db.prepare("SELECT COUNT(*) AS c FROM images").get() as { c: number }).c;
  } else {
    const placeholders = terms.map(() => "?").join(",");
    total = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM (
            SELECT it.image_id
            FROM image_tags it
            JOIN tags t ON t.id = it.tag_id
            WHERE t.name IN (${placeholders})
            GROUP BY it.image_id
            HAVING COUNT(DISTINCT t.name) = ?
          )`
        )
        .get(...terms, terms.length) as { c: number }
    ).c;
  }

  res.json({ items, total, limit, offset, terms });
});

// ---- Tags autocomplete ----
api.get("/tags", (req, res) => {
  const prefix = String(req.query.prefix ?? "").toLowerCase().trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  if (!prefix) {
    const rows = db
      .prepare("SELECT name, use_count FROM tags ORDER BY use_count DESC, name LIMIT ?")
      .all(limit);
    return res.json(rows);
  }
  const rows = db
    .prepare(
      "SELECT name, use_count FROM tags WHERE name LIKE ? ORDER BY use_count DESC, name LIMIT ?"
    )
    .all(`${prefix}%`, limit);
  res.json(rows);
});

// ---- Image media ----
api.get("/images/:id/thumb", async (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT path FROM images WHERE id = ?").get(id) as
    | { path: string }
    | undefined;
  if (!row || !fs.existsSync(row.path)) return res.status(404).end();

  const settings = getSettings();
  const size = Number(settings.thumbSize) || 256;
  try {
    const buf = await sharp(row.path)
      .rotate()
      .resize({ width: size, height: size, fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.send(buf);
  } catch {
    res.status(500).json({ error: "thumb failed" });
  }
});

api.get("/images/:id/file", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT path FROM images WHERE id = ?").get(id) as
    | { path: string }
    | undefined;
  if (!row || !fs.existsSync(row.path)) return res.status(404).end();
  res.sendFile(path.resolve(row.path));
});

api.get("/images/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM images WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "not found" });
  const tags = db
    .prepare(
      `SELECT t.name FROM image_tags it JOIN tags t ON t.id = it.tag_id
       WHERE it.image_id = ? ORDER BY t.name`
    )
    .all(id) as { name: string }[];
  res.json({ ...row, tags: tags.map((t) => t.name) });
});

api.post("/images/:id/reveal", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT path FROM images WHERE id = ?").get(id) as
    | { path: string }
    | undefined;
  if (!row) return res.status(404).json({ error: "not found" });
  const filePath = row.path;

  if (process.platform === "win32") {
    // explorer /select,"C:\path\to\file.jpg"
    spawn("explorer", [`/select,${filePath}`], {
      detached: true,
      stdio: "ignore",
    }).unref();
    return res.json({ ok: true, action: "select" });
  }

  // Elsewhere: open containing folder (xdg-open / open)
  const dir = path.dirname(filePath);
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  try {
    spawn(cmd, [dir], { detached: true, stdio: "ignore" }).unref();
    res.json({ ok: true, action: "folder", path: dir });
  } catch (e) {
    res.json({
      ok: false,
      action: "noop",
      path: filePath,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

// ---- Settings ----
api.get("/settings", (_req, res) => res.json(getSettings()));

api.put("/settings", (req, res) => {
  const body = req.body ?? {};
  const allowed = ["ollamaUrl", "ollamaModel", "maxImagePx", "thumbSize"];
  const partial: Record<string, string> = {};
  for (const k of allowed) {
    if (body[k] != null) partial[k] = String(body[k]);
  }
  res.json(setSettings(partial));
});

// ---- Ollama ----
api.get("/ollama/health", async (_req, res) => {
  res.json(await ollamaHealth());
});
