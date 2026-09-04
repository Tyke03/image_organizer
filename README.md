# Local Image Tags

Personal local image tag library. Indexes folders recursively with Ollama vision,
stores tags in SQLite, and supports progressive AND tag search. NSFW-friendly — no cloud AI.

Windows-oriented utility (Reveal in Explorer) with cross-platform node code.

## Stack

- server/ — Express + TypeScript (tsx) + better-sqlite3 + sharp
- client/ — Vite + React + TypeScript + Tailwind
- workspaces — root scripts run API :8787 and Vite :5173 together

## Prerequisites

1. node.js 20+
2. Ollama running locally (https://ollama.com)
3. Pull a vision model (default qwen3.8-ctx8k:latest):

```bash
ollama pull qwen3.8-ctx8k:latest
```

If unavailable, pull any vision model and set it in Settings.

## Setup

```bash
cd local-image-tags
npm install
npm run dev
```

- UI: http://127.0.0.1:5173
- API: http://127.0.0.1:8787
- DB: data/library.db (gitignored)


## Usage

1. Paste a folder path into Folder roots (Windows example: D:\\Photos\\Library) and click Add.
2. Confirm Ollama health in the sidebar (or Settings).
3. Click Start to index — images are resized with sharp (max 768px JPEG) and tagged via Ollama.
4. Search with space-separated tags (AND): blonde beach sunset
5. Click a thumbnail for tags/caption/path; Reveal in Explorer selects the file on Windows.

## Ollama vision API

Primary: native POST /api/chat with messages[].images (base64 JPEG).

Fallback: OpenAI-compatible POST /v1/chat/completions with image_url data URIs.

Settings (ollamaUrl, ollamaModel, maxImagePx, thumbSize) persist in SQLite settings table.

## API overview

- GET/POST/DELETE /api/roots
- POST /api/index/start  body: { rootId? }
- POST /api/index/pause | resume | cancel
- GET /api/index/status
- GET /api/search?q=&sort=mtime|size|name&order=asc|desc&limit=&offset=
- GET /api/tags?prefix=
- GET /api/images/:id/thumb
- GET /api/images/:id/file
- GET /api/images/:id
- POST /api/images/:id/reveal  (explorer /select on win32)
- GET/PUT /api/settings
- GET /api/ollama/health

## Tests

Tag post-processing is a pure function in server/src/lib/tags.ts:

```bash
npm test
```

## Incremental indexing

Fingerprint path|mtimeMs|sizeBytes — unchanged files skipped on re-index.

## Scripts

- npm run dev — API + Vite
- npm test — tag unit tests
- npm run build — build client + server
- npm start — run compiled server

## Notes / gaps (v1)

- Folder picker is text path input (Windows paste).
- Thumbs generated on request (HTTP cache headers only).
- One indexing job at a time.
- No Docker; run locally next to Ollama.
