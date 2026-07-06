import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PosterCanvas } from "@/components/PosterCanvas";
import { Inspector } from "@/components/Inspector";
import { AiChat } from "@/components/AiChat";
import { ExportMenu } from "@/components/ExportMenu";
import type { Block, TextBlock, ImageBlock } from "@/lib/poster-data";
import { INITIAL_BLOCKS, POSTER_H, POSTER_W } from "@/lib/poster-data";
import { applyOperations, DEFAULT_PALETTE, type Operation, type Palette } from "@/lib/poster-ops";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "半日花 · 植物图鉴 AI 编辑器" },
      {
        name: "description",
        content:
          "把 Canva 上的『半日花 Helianthemum songaricum』A3 竖版科普海报搬到浏览器里，用 AI 编辑文字、样式和配色，一键导出 PNG / JPG / PDF / SVG / PPTX。",
      },
      { property: "og:title", content: "半日花 · 植物图鉴 AI 编辑器" },
      {
        property: "og:description",
        content: "Canva 风格的植物科普海报编辑器，支持 AI 指令编辑与多格式下载。",
      },
    ],
  }),
  component: Editor,
});

function Editor() {
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);
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
      // fit within available area preserving A3 portrait aspect
      const wByHeight = availH * (POSTER_W / POSTER_H);
      setDisplayWidth(Math.max(320, Math.min(availW, wByHeight)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selected = useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? null,
    [blocks, selectedId],
  );

  function patchSelected(patch: Partial<TextBlock>) {
    if (!selectedId) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === selectedId && b.type === "text" ? { ...b, ...patch } : b)),
    );
  }

  function setImage(src: string | null) {
    if (!selectedId) return;
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === selectedId && b.type === "image" ? ({ ...(b as ImageBlock), src }) : b,
      ),
    );
  }

  function apply(ops: Operation[]) {
    setBlocks((prevBlocks) => {
      setPalette((prevPal) => {
        const { blocks: nb, palette: np } = applyOperations(prevBlocks, prevPal, ops);
        // Because we're inside nested setState, only palette can be safely set here.
        // We defer the blocks assignment through outer return below.
        // But we already computed nb; store it via closure.
        queueMicrotask(() => setBlocks(nb));
        return np;
      });
      return prevBlocks;
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr 320px",
        gridTemplateRows: "56px 1fr",
        height: "100vh",
        fontFamily:
          '"Noto Sans SC", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
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
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          🌾 Ordos Plantspedia · Editor
        </div>
        <div style={{ color: "#888", fontSize: 12 }}>
          半日花 Helianthemum songaricum ｜ A3 竖版
        </div>
        <div style={{ marginLeft: "auto" }}>
          <ExportMenu blocks={blocks} palette={palette} />
        </div>
      </header>

      {/* Left: AI chat */}
      <aside style={{ borderRight: "1px solid #e5e5e5", background: "white" }}>
        <AiChat blocks={blocks} onApplyOperations={apply} />
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
          displayWidth={displayWidth}
        />
      </main>

      {/* Right: inspector */}
      <aside
        style={{
          borderLeft: "1px solid #e5e5e5",
          background: "white",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #eee",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          属性面板
        </div>
        <Inspector block={selected} onChange={patchSelected} onChangeImage={setImage} />
      </aside>
    </div>
  );
}
