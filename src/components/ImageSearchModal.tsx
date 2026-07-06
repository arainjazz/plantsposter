import { useState } from "react";

type Hit = { title: string; thumb: string; full: string };

type Props = {
  onPick: (url: string) => void;
  onClose: () => void;
  initialQuery?: string;
};

export function ImageSearchModal({ onPick, onClose, initialQuery = "" }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search() {
    if (!q.trim()) return;
    setLoading(true); setErr(null); setHits([]);
    try {
      const url = new URL("https://commons.wikimedia.org/w/api.php");
      const params: Record<string, string> = {
        action: "query", generator: "search", gsrnamespace: "6",
        gsrsearch: q, gsrlimit: "24",
        prop: "imageinfo", iiprop: "url|mime", iiurlwidth: "400",
        format: "json", origin: "*",
      };
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const r = await fetch(url.toString());
      const j = await r.json() as { query?: { pages?: Record<string, { title: string; imageinfo?: Array<{ url: string; thumburl?: string; mime?: string }> }> } };
      const pages = j.query?.pages ?? {};
      const list: Hit[] = Object.values(pages)
        .filter((p) => (p.imageinfo?.[0]?.mime ?? "").startsWith("image/"))
        .map((p) => ({
          title: p.title.replace(/^File:/, ""),
          thumb: p.imageinfo![0].thumburl ?? p.imageinfo![0].url,
          full: p.imageinfo![0].url,
        }));
      setHits(list);
      if (!list.length) setErr("没有找到图片，换个关键词试试。");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "搜索失败");
    } finally {
      setLoading(false);
    }
  }

  async function pick(h: Hit) {
    // proxy to data URL to avoid CORS on canvas export
    try {
      const r = await fetch(h.full);
      const blob = await r.blob();
      const reader = new FileReader();
      reader.onload = () => onPick(String(reader.result));
      reader.readAsDataURL(blob);
    } catch {
      onPick(h.full);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 10, padding: 20, width: 720, maxHeight: "80vh",
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>🔍 搜索图片（Wikimedia Commons）</div>
          <button onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={q} autoFocus
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="例如 Helianthemum, cactus, desert steppe..."
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }}
          />
          <button onClick={search} style={{ padding: "8px 14px", background: "#4c8dff", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
            搜索
          </button>
        </div>
        {err && <div style={{ color: "#c00", fontSize: 12 }}>{err}</div>}
        {loading && <div style={{ fontSize: 12, color: "#888" }}>搜索中…</div>}
        <div style={{ overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {hits.map((h) => (
            <button
              key={h.full}
              onClick={() => pick(h)}
              style={{
                border: "1px solid #eee", borderRadius: 6, padding: 0,
                background: "white", cursor: "pointer", overflow: "hidden",
              }}
              title={h.title}
            >
              <img src={h.thumb} alt={h.title} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
              <div style={{ fontSize: 10, padding: 6, textAlign: "left", color: "#555", height: 32, overflow: "hidden" }}>{h.title}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#999" }}>
          图片来自 Wikimedia Commons — 请遵循各图片的许可协议（多为 CC-BY-SA / Public Domain）。
        </div>
      </div>
    </div>
  );
}
