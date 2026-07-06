import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PosterCanvas } from "@/components/PosterCanvas";
import { Inspector } from "@/components/Inspector";
import { AiChat } from "@/components/AiChat";
import { ExportMenu } from "@/components/ExportMenu";
import { PageTabs } from "@/components/PageTabs";
import type { Block, TextBlock, ImageBlock, PosterPage } from "@/lib/poster-data";
import { INITIAL_BLOCKS, POSTER_H, POSTER_W, makeEmptyPage, clonePage, deriveAutoName } from "@/lib/poster-data";
import { applyOperations, DEFAULT_PALETTE, type Operation, type Palette } from "@/lib/poster-ops";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "半日花 · 植物图鉴 AI 编辑器" },
      { name: "description", content: "Canva 风格的 A3 植物科普海报编辑器，支持拖动、多页面、AI 编辑与多格式导出。" },
      { property: "og:title", content: "半日花 · 植物图鉴 AI 编辑器" },
      { property: "og:description", content: "多页面、可拖动、AI 驱动的植物海报编辑器。" },
    ],
  }),
  component: Editor,
});

function Editor() {
  const [pages, setPages] = useState<PosterPage[]>([
    { id: "page-1", name: "封面·半日花", autoName: false, blocks: INITIAL_BLOCKS },
  ]);
  const [activeId, setActiveId] = useState<string>("page-1");
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [displayWidth, setDisplayWidth] = useState(600);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const availW = el.clientWidth - 48;
      const availH = el.clientHeight - 48;
      const wByHeight = availH * (POSTER_W / POSTER_H);
      setDisplayWidth(Math.max(320, Math.min(availW, wByHeight)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activePage = pages.find((p) => p.id === activeId) ?? pages[0];
  const blocks = activePage.blocks;

  const selected = useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? null,
    [blocks, selectedId],
  );

  function updateActiveBlocks(mapFn: (bs: Block[]) => Block[]) {
    setPages((prev) => prev.map((p) => (p.id === activeId ? { ...p, blocks: mapFn(p.blocks) } : p)));
  }

  function patchSelected(patch: Partial<TextBlock>) {
    if (!selectedId) return;
    updateActiveBlocks((bs) =>
      bs.map((b) => (b.id === selectedId && b.type === "text" ? { ...b, ...patch } : b)),
    );
  }
  function setImage(src: string | null) {
    if (!selectedId) return;
    updateActiveBlocks((bs) =>
      bs.map((b) => (b.id === selectedId && b.type === "image" ? ({ ...(b as ImageBlock), src }) : b)),
    );
  }
  function moveBlock(id: string, x: number, y: number) {
    updateActiveBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, x, y } : b)));
  }
  function resizeBlock(id: string, patch: { x: number; y: number; w: number; h?: number }) {
    updateActiveBlocks((bs) =>
      bs.map((b) => {
        if (b.id !== id) return b;
        if (b.type === "image") {
          return { ...b, x: patch.x, y: patch.y, w: patch.w, h: patch.h ?? b.h };
        }
        return { ...b, x: patch.x, y: patch.y, w: patch.w };
      }),
    );
  }

  // Auto-rename active page from its dominant title text when autoName is true.
  useEffect(() => {
    if (!activePage.autoName) return;
    const suggested = deriveAutoName(activePage.blocks);
    if (suggested && suggested !== activePage.name) {
      setPages((prev) =>
        prev.map((p) => (p.id === activePage.id ? { ...p, name: suggested } : p)),
      );
    }
  }, [activePage.blocks, activePage.autoName, activePage.id, activePage.name]);

  function apply(ops: Operation[]) {
    const { blocks: nb, palette: np } = applyOperations(blocks, palette, ops);
    updateActiveBlocks(() => nb);
    setPalette(np);
  }

  // ── page ops ────────────────────────────────────────────
  function addPage() {
    const p = makeEmptyPage(`新页面 ${pages.length + 1}`);
    setPages((prev) => [...prev, p]);
    setActiveId(p.id);
    setSelectedId(null);
  }
  function duplicatePage(id: string) {
    const src = pages.find((p) => p.id === id);
    if (!src) return;
    const c = clonePage(src);
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const out = [...prev];
      out.splice(i + 1, 0, c);
      return out;
    });
    setActiveId(c.id);
    setSelectedId(null);
  }
  function deletePage(id: string) {
    setPages((prev) => {
      const out = prev.filter((p) => p.id !== id);
      if (id === activeId && out.length > 0) setActiveId(out[0].id);
      return out;
    });
    setSelectedId(null);
  }
  function renamePage(id: string, name: string) {
    // User-typed name freezes autoName so it stops overriding.
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, name, autoName: false } : p)));
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr 320px",
        gridTemplateRows: "56px 1fr auto",
        height: "100vh",
        fontFamily: '"Noto Sans SC", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
        background: "#efece5",
        color: "#222",
      }}
    >
      {/* Header */}
      <header
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          background: "white",
          borderBottom: "1px solid #e5e5e5",
          gap: 16,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>🌾 Ordos Plantspedia · Editor</div>
        <div style={{ color: "#888", fontSize: 12 }}>
          半日花 Helianthemum songaricum ｜ A3 竖版 ｜ {pages.length} 页
        </div>
        <div style={{ marginLeft: "auto" }}>
          <ExportMenu pages={pages} activePageId={activeId} palette={palette} />
        </div>
      </header>

      {/* Left: AI chat */}
      <aside style={{ borderRight: "1px solid #e5e5e5", background: "white" }}>
        <AiChat
          blocks={blocks}
          selectedImageId={selected?.type === "image" ? selected.id : null}
          onApplyOperations={apply}
        />
      </aside>

      {/* Center: poster canvas */}
      <main
        ref={stageRef}
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          overflow: "auto",
          padding: 24,
        }}
      >
        <PosterCanvas
          blocks={blocks}
          palette={palette}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={moveBlock}
          onResize={resizeBlock}
          displayWidth={displayWidth}
        />
      </main>

      {/* Right: inspector */}
      <aside style={{ borderLeft: "1px solid #e5e5e5", background: "white", overflowY: "auto" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #eee", fontSize: 13, fontWeight: 600 }}>
          属性面板
        </div>
        <Inspector block={selected} onChange={patchSelected} onChangeImage={setImage} />
      </aside>

      {/* Bottom: page tabs — spans all columns */}
      <div style={{ gridColumn: "1 / -1" }}>
        <PageTabs
          pages={pages}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setSelectedId(null); }}
          onAdd={addPage}
          onDuplicate={duplicatePage}
          onDelete={deletePage}
          onRename={renamePage}
        />
      </div>
    </div>
  );
}
