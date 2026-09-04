import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type ImageRow,
  type IndexStatus,
  type Root,
  type Settings,
  thumbUrl,
  fileUrl,
  formatBytes,
  formatDate,
} from "./lib/api";

type SortKey = "mtime" | "size" | "name";

export default function App() {
  const [roots, setRoots] = useState<Root[]>([]);
  const [newPath, setNewPath] = useState("");
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [health, setHealth] = useState<string>("");

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState<SortKey>("mtime");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [items, setItems] = useState<ImageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [suggestions, setSuggestions] = useState<{ name: string; use_count: number }[]>([]);
  const [selected, setSelected] = useState<(ImageRow & { tags: string[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const indexing = status?.state === "running" || status?.state === "paused" || status?.state === "cancelling";

  const refreshRoots = useCallback(async () => {
    setRoots(await api.roots());
  }, []);

  const refreshSearch = useCallback(async () => {
    try {
      const res = await api.search({ q: debouncedQ, sort, order, limit: 120, offset: 0 });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [debouncedQ, sort, order]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    refreshRoots().catch((e) => setError(String(e)));
    api.settings().then(setSettings).catch(() => {});
    api.ollamaHealth().then((h) => {
      setHealth(h.ok ? (h.error ? `Ollama up — ${h.error}` : "Ollama connected") : `Ollama: ${h.error}`);
    });
  }, [refreshRoots]);

  useEffect(() => {
    refreshSearch();
  }, [refreshSearch]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await api.indexStatus();
        if (alive) setStatus(s);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, indexing ? 800 : 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [indexing]);

  useEffect(() => {
    if (status?.state === "idle" && status.finishedAt) {
      refreshSearch();
      refreshRoots();
    }
  }, [status?.state, status?.finishedAt, refreshSearch, refreshRoots]);

  useEffect(() => {
    const last = q.trim().split(/\s+/).pop() ?? "";
    if (!last) {
      api.tags("").then(setSuggestions).catch(() => {});
      return;
    }
    api.tags(last.toLowerCase()).then(setSuggestions).catch(() => {});
  }, [q]);

  async function addRoot() {
    if (!newPath.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.addRoot(newPath.trim());
      setNewPath("");
      await refreshRoots();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeRoot(id: number) {
    if (!confirm("Remove this root and its indexed images?")) return;
    await api.deleteRoot(id);
    await refreshRoots();
    await refreshSearch();
  }

  async function openDetail(id: number) {
    const img = await api.image(id);
    setSelected(img);
  }

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    const next = await api.saveSettings(settings);
    setSettings(next);
    const h = await api.ollamaHealth();
    setHealth(h.ok ? (h.error ? `Ollama up — ${h.error}` : "Ollama connected") : `Ollama: ${h.error}`);
    setShowSettings(false);
  }

  const progressPct = useMemo(() => {
    if (!status || !status.total) return 0;
    return Math.round((status.processed / status.total) * 100);
  }, [status]);

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-ink-700 bg-ink-900">
        <div className="border-b border-ink-700 px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight text-white">Local Image Tags</h1>
          <p className="mt-1 text-xs text-slate-400">Ollama vision · local SQLite · NSFW-ok</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Folder roots
            </h2>
            <div className="space-y-2">
              {roots.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-100">
                        {r.label || r.path}
                      </div>
                      <div className="truncate font-mono text-[11px] text-slate-500" title={r.path}>
                        {r.path}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {r.image_count ?? 0} indexed
                      </div>
                    </div>
                    <button
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => removeRoot(r.id)}
                      title="Remove root"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {!roots.length && (
                <p className="text-xs text-slate-500">No folders yet. Paste a Windows path below.</p>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-md border border-ink-600 bg-ink-950 px-2 py-1.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-accent focus:outline-none"
                placeholder="D:\Photos\Library"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRoot()}
              />
              <button
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-blue-300 disabled:opacity-50"
                onClick={addRoot}
                disabled={busy}
              >
                Add
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Indexing
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md bg-ink-700 px-3 py-1.5 text-xs hover:bg-ink-600 disabled:opacity-40"
                disabled={indexing || !roots.length}
                onClick={() => api.startIndex().then(setStatus)}
              >
                Start
              </button>
              <button
                className="rounded-md bg-ink-700 px-3 py-1.5 text-xs hover:bg-ink-600 disabled:opacity-40"
                disabled={status?.state !== "running"}
                onClick={() => api.pauseIndex().then(setStatus)}
              >
                Pause
              </button>
              <button
                className="rounded-md bg-ink-700 px-3 py-1.5 text-xs hover:bg-ink-600 disabled:opacity-40"
                disabled={status?.state !== "paused"}
                onClick={() => api.resumeIndex().then(setStatus)}
              >
                Resume
              </button>
              <button
                className="rounded-md bg-ink-700 px-3 py-1.5 text-xs text-rose-300 hover:bg-ink-600 disabled:opacity-40"
                disabled={!indexing}
                onClick={() => api.cancelIndex().then(setStatus)}
              >
                Cancel
              </button>
            </div>
            {status && (
              <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                <div>
                  State: <span className="text-slate-200">{status.state}</span>
                  {status.total > 0 && (
                    <>
                      {" "}
                      · {status.processed}/{status.total} ({progressPct}%)
                    </>
                  )}
                </div>
                <div>
                  tagged {status.tagged} · skipped {status.skipped} · errors {status.errors}
                </div>
                {status.currentPath && (
                  <div className="truncate font-mono" title={status.currentPath}>
                    {status.currentPath}
                  </div>
                )}
                {status.lastError && (
                  <div className="text-amber-400/90">{status.lastError}</div>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Settings
            </h2>
            <p className="mb-2 text-[11px] text-slate-500">{health || "Checking Ollama…"}</p>
            <button
              className="rounded-md border border-ink-600 px-3 py-1.5 text-xs hover:bg-ink-800"
              onClick={() => setShowSettings(true)}
            >
              Edit Ollama / model
            </button>
          </section>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {indexing && (
          <div className="border-b border-amber-900/50 bg-amber-950/40 px-4 py-2 text-sm text-amber-100">
            Indexing {status?.processed}/{status?.total} ({progressPct}%)
            {status?.state === "paused" ? " — paused" : ""}
            {status?.currentPath ? (
              <span className="ml-2 font-mono text-xs text-amber-200/70">
                {status.currentPath}
              </span>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 bg-ink-900/80 px-4 py-3">
          <div className="relative min-w-[240px] flex-1">
            <input
              className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 text-sm placeholder:text-slate-600 focus:border-accent focus:outline-none"
              placeholder="Search tags (AND) — e.g. blonde beach sunset"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {suggestions.length > 0 && q.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-ink-600 bg-ink-800 shadow-xl">
                {suggestions.slice(0, 12).map((s) => (
                  <button
                    key={s.name}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-ink-700"
                    onClick={() => {
                      const parts = q.trim().split(/\s+/);
                      parts[parts.length - 1] = s.name;
                      setQ(parts.join(" ") + " ");
                    }}
                  >
                    <span>{s.name}</span>
                    <span className="text-xs text-slate-500">{s.use_count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400">
            Sort
            <select
              className="rounded-md border border-ink-600 bg-ink-950 px-2 py-1.5 text-sm text-slate-200"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="mtime">Date</option>
              <option value="size">Size</option>
              <option value="name">Name</option>
            </select>
          </label>
          <button
            className="rounded-md border border-ink-600 px-2 py-1.5 text-xs hover:bg-ink-800"
            onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
          >
            {order === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
          <div className="text-xs text-slate-400">
            <span className="text-slate-200">{total}</span> results
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/50 px-4 py-2 text-sm text-rose-200">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {!items.length ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-500">
              <p className="text-sm">No images yet.</p>
              <p className="mt-1 text-xs">Add a folder root and start indexing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((img) => (
                <button
                  key={img.id}
                  className="group overflow-hidden rounded-lg border border-ink-700 bg-ink-800 text-left transition hover:border-accent/60"
                  onClick={() => openDetail(img.id)}
                >
                  <div className="aspect-square overflow-hidden bg-ink-950">
                    <img
                      src={thumbUrl(img.id)}
                      alt={img.rel_path}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="truncate px-2 py-1.5 font-mono text-[10px] text-slate-400">
                    {img.rel_path}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border border-ink-600 bg-ink-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[90vh] flex-1 items-center justify-center bg-black">
              <img
                src={fileUrl(selected.id)}
                alt={selected.rel_path}
                className="max-h-[90vh] max-w-full object-contain"
              />
            </div>
            <div className="flex w-80 shrink-0 flex-col border-l border-ink-700">
              <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                <h3 className="font-medium">Details</h3>
                <button className="text-slate-400 hover:text-white" onClick={() => setSelected(null)}>
                  ✕
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Path</div>
                  <div className="break-all font-mono text-xs text-slate-300">{selected.path}</div>
                </div>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>{formatBytes(selected.size_bytes)}</span>
                  <span>{formatDate(selected.mtime_ms)}</span>
                  {selected.width && selected.height && (
                    <span>
                      {selected.width}×{selected.height}
                    </span>
                  )}
                </div>
                {selected.caption && (
                  <div>
                    <div className="text-xs text-slate-500">Caption / raw</div>
                    <p className="text-xs text-slate-300">{selected.caption}</p>
                  </div>
                )}
                <div>
                  <div className="mb-1 text-xs text-slate-500">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.tags ?? []).map((t) => (
                      <button
                        key={t}
                        className="rounded-full bg-ink-700 px-2 py-0.5 text-xs hover:bg-accent/30"
                        onClick={() => {
                          setQ((prev) => {
                            const parts = postProcessLocal(prev);
                            if (!parts.includes(t)) parts.push(t);
                            return parts.join(" ");
                          });
                          setSelected(null);
                        }}
                      >
                        {t}
                      </button>
                    ))}
                    {!selected.tags?.length && (
                      <span className="text-xs text-slate-500">No tags</span>
                    )}
                  </div>
                </div>
                {selected.error && (
                  <div className="text-xs text-amber-400">Index error: {selected.error}</div>
                )}
              </div>
              <div className="border-t border-ink-700 p-4">
                <button
                  className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink-950 hover:bg-blue-300"
                  onClick={() => api.reveal(selected.id)}
                >
                  Reveal in Explorer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && settings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowSettings(false)}
        >
          <form
            className="w-full max-w-md space-y-3 rounded-xl border border-ink-600 bg-ink-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveSettings}
          >
            <h3 className="text-lg font-medium">Settings</h3>
            <label className="block text-xs text-slate-400">
              Ollama URL
              <input
                className="mt-1 w-full rounded-md border border-ink-600 bg-ink-950 px-3 py-2 font-mono text-sm"
                value={settings.ollamaUrl}
                onChange={(e) => setSettings({ ...settings, ollamaUrl: e.target.value })}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Vision model
              <input
                className="mt-1 w-full rounded-md border border-ink-600 bg-ink-950 px-3 py-2 font-mono text-sm"
                value={settings.ollamaModel}
                onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Max send size (px)
              <input
                className="mt-1 w-full rounded-md border border-ink-600 bg-ink-950 px-3 py-2 font-mono text-sm"
                value={settings.maxImagePx}
                onChange={(e) => setSettings({ ...settings, maxImagePx: e.target.value })}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Thumb size (px)
              <input
                className="mt-1 w-full rounded-md border border-ink-600 bg-ink-950 px-3 py-2 font-mono text-sm"
                value={settings.thumbSize}
                onChange={(e) => setSettings({ ...settings, thumbSize: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-slate-400 hover:bg-ink-800"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-ink-950"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function postProcessLocal(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}
