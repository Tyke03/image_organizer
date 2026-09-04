import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { db, fingerprint } from "./db.js";
import { tagImage } from "./ollama.js";

const IMAGE_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".avif",
]);

export type IndexStatus = {
  state: "idle" | "running" | "paused" | "cancelling";
  rootId: number | null;
  total: number;
  processed: number;
  skipped: number;
  tagged: number;
  errors: number;
  currentPath: string | null;
  lastError: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

const status: IndexStatus = {
  state: "idle",
  rootId: null,
  total: 0,
  processed: 0,
  skipped: 0,
  tagged: 0,
  errors: 0,
  currentPath: null,
  lastError: null,
  startedAt: null,
  finishedAt: null,
};

let pauseRequested = false;
let cancelRequested = false;
let runPromise: Promise<void> | null = null;

function walkImages(rootPath: string): string[] {
  const out: string[] = [];
  const stack = [rootPath];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (IMAGE_EXT.has(ext)) out.push(full);
      }
    }
  }
  return out;
}

function upsertTagsForImage(imageId: number, tags: string[]) {
  const findTag = db.prepare("SELECT id FROM tags WHERE name = ?");
  const insertTag = db.prepare("INSERT INTO tags (name, use_count) VALUES (?, 0)");
  const link = db.prepare(
    "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)"
  );
  const bump = db.prepare("UPDATE tags SET use_count = use_count + 1 WHERE id = ?");
  const clear = db.prepare("DELETE FROM image_tags WHERE image_id = ?");

  const tx = db.transaction((names: string[]) => {
    // decrement old tags
    const old = db
      .prepare("SELECT tag_id FROM image_tags WHERE image_id = ?")
      .all(imageId) as { tag_id: number }[];
    for (const { tag_id } of old) {
      db.prepare(
        "UPDATE tags SET use_count = CASE WHEN use_count > 0 THEN use_count - 1 ELSE 0 END WHERE id = ?"
      ).run(tag_id);
    }
    clear.run(imageId);
    for (const name of names) {
      let row = findTag.get(name) as { id: number } | undefined;
      if (!row) {
        const info = insertTag.run(name);
        row = { id: Number(info.lastInsertRowid) };
      }
      const r = link.run(imageId, row.id);
      if (r.changes > 0) bump.run(row.id);
    }
  });
  tx(tags);
}

async function processOne(rootId: number, rootPath: string, filePath: string) {
  status.currentPath = filePath;
  const stat = fs.statSync(filePath);
  const mtimeMs = Math.floor(stat.mtimeMs);
  const sizeBytes = stat.size;
  const fp = fingerprint(filePath, mtimeMs, sizeBytes);
  const rel = path.relative(rootPath, filePath);

  const existing = db
    .prepare("SELECT id, fingerprint FROM images WHERE path = ?")
    .get(filePath) as { id: number; fingerprint: string } | undefined;

  if (existing && existing.fingerprint === fp) {
    status.skipped++;
    status.processed++;
    return;
  }

  let width: number | null = null;
  let height: number | null = null;
  try {
    const meta = await sharp(filePath).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
  } catch {
    // non-fatal
  }

  let tags: string[] = [];
  let caption: string | null = null;
  let error: string | null = null;

  try {
    const result = await tagImage(filePath);
    tags = result.tags;
    caption = result.caption;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    status.errors++;
    status.lastError = error;
  }

  const upsert = db.prepare(`
    INSERT INTO images (root_id, path, rel_path, mtime_ms, size_bytes, width, height, caption, indexed_at, error, fingerprint)
    VALUES (@root_id, @path, @rel_path, @mtime_ms, @size_bytes, @width, @height, @caption, datetime('now'), @error, @fingerprint)
    ON CONFLICT(path) DO UPDATE SET
      root_id = excluded.root_id,
      rel_path = excluded.rel_path,
      mtime_ms = excluded.mtime_ms,
      size_bytes = excluded.size_bytes,
      width = excluded.width,
      height = excluded.height,
      caption = excluded.caption,
      indexed_at = excluded.indexed_at,
      error = excluded.error,
      fingerprint = excluded.fingerprint
  `);

  upsert.run({
    root_id: rootId,
    path: filePath,
    rel_path: rel,
    mtime_ms: mtimeMs,
    size_bytes: sizeBytes,
    width,
    height,
    caption,
    error,
    fingerprint: fp,
  });

  const row = db.prepare("SELECT id FROM images WHERE path = ?").get(filePath) as {
    id: number;
  };
  if (tags.length) {
    upsertTagsForImage(row.id, tags);
    status.tagged++;
  }
  status.processed++;
}

async function run(rootId?: number) {
  pauseRequested = false;
  cancelRequested = false;
  status.state = "running";
  status.startedAt = new Date().toISOString();
  status.finishedAt = null;
  status.processed = 0;
  status.skipped = 0;
  status.tagged = 0;
  status.errors = 0;
  status.lastError = null;
  status.currentPath = null;

  const roots = rootId
    ? (db.prepare("SELECT id, path FROM roots WHERE id = ?").all(rootId) as {
        id: number;
        path: string;
      }[])
    : (db.prepare("SELECT id, path FROM roots").all() as { id: number; path: string }[]);

  if (!roots.length) {
    status.state = "idle";
    status.finishedAt = new Date().toISOString();
    status.lastError = "No roots configured";
    return;
  }

  const jobs: { rootId: number; rootPath: string; file: string }[] = [];
  for (const r of roots) {
    status.rootId = r.id;
    const files = walkImages(r.path);
    for (const f of files) jobs.push({ rootId: r.id, rootPath: r.path, file: f });
  }
  status.total = jobs.length;

  for (const job of jobs) {
    if (cancelRequested) break;
    while (pauseRequested && !cancelRequested) {
      status.state = "paused";
      await new Promise((r) => setTimeout(r, 250));
    }
    if (cancelRequested) break;
    status.state = "running";
    status.rootId = job.rootId;
    try {
      await processOne(job.rootId, job.rootPath, job.file);
    } catch (e) {
      status.errors++;
      status.processed++;
      status.lastError = e instanceof Error ? e.message : String(e);
    }
  }

  status.currentPath = null;
  status.state = "idle";
  status.finishedAt = new Date().toISOString();
  if (cancelRequested) status.lastError = status.lastError ?? "Cancelled";
}

export function getIndexStatus(): IndexStatus {
  return { ...status };
}

export function startIndex(rootId?: number): IndexStatus {
  if (status.state === "running" || status.state === "paused") {
    return getIndexStatus();
  }
  runPromise = run(rootId).finally(() => {
    runPromise = null;
  });
  return getIndexStatus();
}

export function pauseIndex(): IndexStatus {
  if (status.state === "running") pauseRequested = true;
  return getIndexStatus();
}

export function resumeIndex(): IndexStatus {
  if (status.state === "paused") {
    pauseRequested = false;
    status.state = "running";
  }
  return getIndexStatus();
}

export function cancelIndex(): IndexStatus {
  if (status.state === "running" || status.state === "paused") {
    cancelRequested = true;
    pauseRequested = false;
    status.state = "cancelling";
  }
  return getIndexStatus();
}
