import { useState } from "react";

type Hit = {
  title: string;
  thumb: string;
  full: string;
  license?: string;
  creator?: string;
  source?: string;
};

type Source = "openverse" | "wikimedia";

type Props = {
  onPick: (url: string) => void;
  onClose: () => void;
  initialQuery?: string;
};

export function ImageSearchModal({ onPick, onClose, initialQuery = "" }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [source, setSource] = useState<Source>("openverse");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function searchOpenverse(query: string): Promise<Hit[]> {
    // Openverse: 800M+ 张 CC / 公有领域图片（跨 Flickr、维基共享、博物馆等）
    const url = new URL("https://api.openverse.org/v1/images/");
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", "24");
    url.searchParams.set("license_type", "all-cc,commercial,modification");
    const r = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`Openverse ${r.status}`);
    const j = (await r.json()) as {
      results?: Array<{
        title?: string;
        url: string;
        thumbnail?: string;
        license?: string;
        license_version?: string;
        creator?: string;
        source?: string;
      }>;
    };
    return (j.results ?? []).map((it) => ({
      title: it.title ?? "",
      thumb: it.thumbnail || it.url,
      full: it.url,
      license: [it.license, it.license_version].filter(Boolean).join(" ").toUpperCase(),
      creator: it.creator,
      source: it.source,
    }));
  }

  async function searchWikimedia(query: string): Promise<Hit[]> {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    const params: Record<string, string> = {
      action: "query", generator: "search", gsrnamespace: "6",
      gsrsearch: query, gsrlimit: "24",
      prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "400",
      format: "json", origin: "*",
    };
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = await fetch(url.toString());
    const j = (await r.json()) as {
      query?: {
        pages?: Record<string, {
          title: string;
          imageinfo?: Array<{
            url: string;
            thumburl?: string;
            mime?: string;
            extmetadata?: Record<string, { value?: string }>;
          }>;
        }>;
      };
    };
    const pages = j.query?.pages ?? {};
    return Object.values(pages)
      .filter((p) => (p.imageinfo?.[0]?.mime ?? "").startsWith("image/"))
      .map((p) => {
        const info = p.imageinfo![0];
        const meta = info.extmetadata ?? {};
        return {
          title: p.title.replace(/^File:/, ""),
          thumb: info.thumburl ?? info.url,
          full: info.url,
          license: meta.LicenseShortName?.value,
          creator: (meta.Artist?.value ?? "").replace(/<[^>]+>/g, ""),
          source: "Wikimedia Commons",
        };
      });
  }

  async function search() {
    if (!q.trim()) return;
    setLoading(true); setErr(null); setHits([]);
    try {
      const list = source === "openverse" ? await searchOpenverse(q) : await searchWikimedia(q);
      setHits(list);
      if (!list.length) setErr("没有找到图片，换个关键词或数据源试试。");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "搜索失败");
    } finally {
      setLoading(false);
    }
  }

  async function pick(h: Hit) {
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
          background: "white", borderRadius: 10, padding: 20, width: 760, maxHeight: "82vh",
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>🔍 搜索合法开源图片</div>
          <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
            {(["openverse", "wikimedia"] as Source[]).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                style={{
                  padding: "4px 10px", fontSize: 12, borderRadius: 999,
                  border: "1px solid " + (source === s ? "#2a2622" : "#ddd"),
                  background: source === s ? "#2a2622" : "white",
                  color: source === s ? "white" : "#333", cursor: "pointer",
                }}
              >
                {s === "openverse" ? "Openverse（全网 CC / 公有领域）" : "Wikimedia Commons"}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={q} autoFocus
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="例如 Helianthemum, desert steppe, cactus flower..."
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
                background: "white", cursor: "pointer", overflow: "hidden", textAlign: "left",
              }}
              title={`${h.title}\n${h.creator ?? ""}${h.license ? " · " + h.license : ""}`}
            >
              <img src={h.thumb} alt={h.title} style={{ width: "100%", height: 120, objectFit: "cover", display: "block", background: "#f4f4f4" }} />
              <div style={{ fontSize: 10, padding: 6, color: "#555", height: 46, overflow: "hidden" }}>
                <div style={{ fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title || "(untitled)"}</div>
                <div style={{ opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[h.creator, h.license, h.source].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#999" }}>
          结果来自 Openverse（聚合 Flickr、维基共享、博物馆等）与 Wikimedia Commons — 均为 CC / 公有领域许可，使用时请按图片许可注明来源与作者。
        </div>
      </div>
    </div>
  );
}
