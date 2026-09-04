export type Root = {
  id: number;
  path: string;
  label: string | null;
  created_at: string;
  image_count?: number;
};

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

export type ImageRow = {
  id: number;
  root_id: number;
  path: string;
  rel_path: string;
  mtime_ms: number;
  size_bytes: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  indexed_at: string | null;
  error: string | null;
  tags?: string | string[];
};

export type Settings = {
  ollamaUrl: string;
  ollamaModel: string;
  maxImagePx: string;
  thumbSize: string;
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  roots: () => json<Root[]>("/api/roots"),
  addRoot: (path: string, label?: string) =>
    json<Root>("/api/roots", { method: "POST", body: JSON.stringify({ path, label }) }),
  deleteRoot: (id: number) => json<{ ok: boolean }>(`/api/roots/${id}`, { method: "DELETE" }),

  startIndex: (rootId?: number) =>
    json<IndexStatus>("/api/index/start", {
      method: "POST",
      body: JSON.stringify(rootId != null ? { rootId } : {}),
    }),
  pauseIndex: () => json<IndexStatus>("/api/index/pause", { method: "POST" }),
  resumeIndex: () => json<IndexStatus>("/api/index/resume", { method: "POST" }),
  cancelIndex: () => json<IndexStatus>("/api/index/cancel", { method: "POST" }),
  indexStatus: () => json<IndexStatus>("/api/index/status"),

  search: (params: {
    q: string;
    sort: string;
    order: string;
    limit?: number;
    offset?: number;
  }) => {
    const sp = new URLSearchParams({
      q: params.q,
      sort: params.sort,
      order: params.order,
      limit: String(params.limit ?? 60),
      offset: String(params.offset ?? 0),
    });
    return json<{ items: ImageRow[]; total: number; terms: string[] }>(`/api/search?${sp}`);
  },

  tags: (prefix = "") =>
    json<{ name: string; use_count: number }[]>(
      `/api/tags?prefix=${encodeURIComponent(prefix)}`
    ),

  image: (id: number) =>
    json<ImageRow & { tags: string[] }>(`/api/images/${id}`),

  reveal: (id: number) =>
    json<{ ok: boolean }>(`/api/images/${id}/reveal`, { method: "POST" }),

  settings: () => json<Settings>("/api/settings"),
  saveSettings: (s: Partial<Settings>) =>
    json<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(s) }),

  ollamaHealth: () =>
    json<{
      ok: boolean;
      url: string;
      model: string;
      models?: string[];
      error?: string;
    }>("/api/ollama/health"),
};

export function thumbUrl(id: number) {
  return `/api/images/${id}/thumb`;
}

export function fileUrl(id: number) {
  return `/api/images/${id}/file`;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(ms: number) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}
