import { useState } from "react";
import type { PosterPage } from "@/lib/poster-data";
import type { Palette } from "@/lib/poster-ops";
import { exportJpg, exportPdf, exportPng, exportPptx, exportSvg } from "@/lib/poster-export";

type Props = { pages: PosterPage[]; activePageId: string; palette: Palette };

export function ExportMenu({ pages, activePageId, palette }: Props) {
  const [open, setOpen] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [pdfMode, setPdfMode] = useState<"standard" | "print">("standard");
  const [scope, setScope] = useState<"current" | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];
  const activeBlocks = activePage.blocks;

  async function run(kind: string, fn: () => Promise<void> | void) {
    setBusy(kind);
    try { await fn(); }
    finally { setBusy(null); setOpen(false); }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "#4c8dff", color: "white", border: "none",
          padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        ↓ Download
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            width: 300, background: "white", border: "1px solid #e5e5e5",
            borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            padding: 12, zIndex: 20, fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: "#888" }}>
            页面范围 (PDF / PPTX)
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <label style={{ fontSize: 12 }}>
              <input type="radio" checked={scope === "all"} onChange={() => setScope("all")} /> 全部 {pages.length} 页
            </label>
            <label style={{ fontSize: 12 }}>
              <input type="radio" checked={scope === "current"} onChange={() => setScope("current")} /> 仅当前页
            </label>
          </div>

          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: "#888" }}>
            选择格式
          </div>

          <div style={row}>
            <button style={optBtn} disabled={busy !== null} onClick={() => run("png", () => exportPng(activeBlocks, palette, transparent))}>
              PNG (当前页)
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#666" }}>
              <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> 透明
            </label>
          </div>

          <button style={optBtn} disabled={busy !== null} onClick={() => run("jpg", () => exportJpg(activeBlocks, palette))}>
            JPG (当前页)
          </button>

          <div style={row}>
            <button
              style={optBtn}
              disabled={busy !== null}
              onClick={() =>
                run("pdf", () =>
                  exportPdf(scope === "all" ? pages : [activePage], palette, pdfMode),
                )
              }
            >
              PDF (A3)
            </button>
            <select
              value={pdfMode}
              onChange={(e) => setPdfMode(e.target.value as "standard" | "print")}
              style={{ fontSize: 11, padding: "4px 6px", border: "1px solid #ddd", borderRadius: 4 }}
            >
              <option value="standard">标准</option>
              <option value="print">打印</option>
            </select>
          </div>

          <button style={optBtn} disabled={busy !== null} onClick={() => run("svg", () => exportSvg(activeBlocks, palette))}>
            SVG (当前页 · 矢量)
          </button>

          <button
            style={optBtn}
            disabled={busy !== null}
            onClick={() => run("pptx", () => exportPptx(scope === "all" ? pages : [activePage], palette))}
          >
            PPTX (PowerPoint)
          </button>

          {busy && <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>正在导出 {busy}…</div>}
        </div>
      )}
    </div>
  );
}

const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", marginBottom: 6 };
const optBtn: React.CSSProperties = {
  flex: 1, padding: "8px 10px", background: "#f7f7f5", border: "1px solid #e0e0e0",
  borderRadius: 4, cursor: "pointer", fontSize: 13, textAlign: "left",
  marginBottom: 6, width: "100%",
};
