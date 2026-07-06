import { Block, TextBlock, ImageBlock, POSTER_H, POSTER_W } from "@/lib/poster-data";
import type { Palette } from "@/lib/poster-ops";
import { CSSProperties, useRef, useState } from "react";

export const FAMILY: Record<string, string> = {
  serif: '"Noto Serif SC", "Source Han Serif SC", Georgia, "Songti SC", serif',
  sans: '"Noto Sans SC", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  display: '"ZCOOL XiaoWei", "Noto Serif SC", "Songti SC", Georgia, serif',
  kai: '"Ma Shan Zheng", "KaiTi", "STKaiti", cursive',
  wenkai: '"LXGW WenKai TC", "KaiTi", "STKaiti", serif',
  mono: '"JetBrains Mono", "Menlo", "Courier New", monospace',
  playfair: '"Playfair Display", Georgia, serif',
  inter: '"Inter", "Noto Sans SC", "PingFang SC", sans-serif',
};

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type Props = {
  blocks: Block[];
  palette: Palette;
  selectedIds: Set<string>;
  onSelectIds: (ids: string[], additive?: boolean) => void;
  onMoveMany: (dx: number, dy: number) => void;
  onResize: (id: string, patch: { x: number; y: number; w: number; h?: number }) => void;
  onImageContextMenu: (id: string, clientX: number, clientY: number) => void;
  displayWidth: number;
};

type MoveState = { kind: "move"; startX: number; startY: number; committedDx: number; committedDy: number };
type ResizeState = {
  kind: "resize"; id: string; handle: Handle;
  startX: number; startY: number;
  origX: number; origY: number; origW: number; origH: number; isText: boolean;
};
type MarqueeState = { kind: "marquee"; startX: number; startY: number; curX: number; curY: number; additive: boolean };
type DragState = MoveState | ResizeState | MarqueeState | null;

export function PosterCanvas({
  blocks, palette, selectedIds, onSelectIds, onMoveMany, onResize, onImageContextMenu, displayWidth,
}: Props) {
  const scale = displayWidth / POSTER_W;
  const height = POSTER_H * scale;
  const dragRef = useRef<DragState>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const containerRef = useRef<HTMLDivElement>(null);

  function startBlockPointer(e: React.PointerEvent, b: Block) {
    e.stopPropagation();
    const additive = e.metaKey || e.ctrlKey || e.shiftKey;
    if (additive) {
      const next = new Set(selectedIds);
      if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
      onSelectIds(Array.from(next));
    } else if (!selectedIds.has(b.id)) {
      onSelectIds([b.id]);
    }
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { kind: "move", startX: e.clientX, startY: e.clientY, committedDx: 0, committedDy: 0 };
  }

  function startResize(e: React.PointerEvent, b: Block, handle: Handle) {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const h = b.type === "image" ? b.h : 100;
    dragRef.current = {
      kind: "resize", id: b.id, handle,
      startX: e.clientX, startY: e.clientY,
      origX: b.x, origY: b.y, origW: b.w, origH: h,
      isText: b.type === "text",
    };
  }

  function startMarquee(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "marquee",
      startX: x, startY: y, curX: x, curY: y,
      additive: e.metaKey || e.ctrlKey || e.shiftKey,
    };
    if (!(e.metaKey || e.ctrlKey || e.shiftKey)) onSelectIds([]);
    rerender();
  }

  function onDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "move") {
      const dx = Math.round((e.clientX - d.startX) / scale);
      const dy = Math.round((e.clientY - d.startY) / scale);
      const stepDx = dx - d.committedDx;
      const stepDy = dy - d.committedDy;
      if (stepDx !== 0 || stepDy !== 0) {
        onMoveMany(stepDx, stepDy);
        d.committedDx = dx;
        d.committedDy = dy;
      }
      return;
    }
    if (d.kind === "resize") {
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      let { origX: x, origY: y, origW: w, origH: h } = d;
      if (d.handle.includes("e")) w = Math.max(20, d.origW + dx);
      if (d.handle.includes("s")) h = Math.max(20, d.origH + dy);
      if (d.handle.includes("w")) { w = Math.max(20, d.origW - dx); x = d.origX + (d.origW - w); }
      if (d.handle.includes("n")) { h = Math.max(20, d.origH - dy); y = d.origY + (d.origH - h); }
      if (!d.isText && e.shiftKey) {
        const ratio = d.origW / d.origH;
        if (Math.abs(w - d.origW) > Math.abs(h - d.origH)) h = w / ratio; else w = h * ratio;
      }
      onResize(d.id, {
        x: Math.round(x), y: Math.round(y), w: Math.round(w),
        h: d.isText ? undefined : Math.round(h),
      });
      return;
    }
    if (d.kind === "marquee") {
      const rect = containerRef.current!.getBoundingClientRect();
      d.curX = (e.clientX - rect.left) / scale;
      d.curY = (e.clientY - rect.top) / scale;
      rerender();
    }
  }

  function endDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (d?.kind === "marquee") {
      const x1 = Math.min(d.startX, d.curX);
      const x2 = Math.max(d.startX, d.curX);
      const y1 = Math.min(d.startY, d.curY);
      const y2 = Math.max(d.startY, d.curY);
      if (Math.abs(x2 - x1) > 3 && Math.abs(y2 - y1) > 3) {
        const hits = blocks.filter((b) => {
          const bw = b.w;
          const bh = b.type === "image" ? b.h : 30;
          return b.x < x2 && b.x + bw > x1 && b.y < y2 && b.y + bh > y1;
        }).map((b) => b.id);
        if (d.additive) {
          const merged = new Set(selectedIds);
          hits.forEach((id) => merged.add(id));
          onSelectIds(Array.from(merged));
        } else {
          onSelectIds(hits);
        }
      }
    }
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    dragRef.current = null;
    rerender();
  }

  const marquee = dragRef.current?.kind === "marquee" ? dragRef.current : null;
  const soloSelected = selectedIds.size === 1 ? blocks.find((b) => selectedIds.has(b.id)) : null;

  return (
    <div
      ref={containerRef}
      onPointerDown={startMarquee}
      onPointerMove={onDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        width: displayWidth, height,
        background: palette.background,
        position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.05)",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: POSTER_W, height: POSTER_H,
        transform: `scale(${scale})`, transformOrigin: "top left",
      }}>
        {blocks.map((b) => {
          const selected = selectedIds.has(b.id);
          return (
            <div key={b.id} style={{ position: "absolute", left: b.x, top: b.y }}>
              {b.type === "text" ? (
                <TextEl block={b} selected={selected} onPointerDown={(e) => startBlockPointer(e, b)} />
              ) : (
                <ImageEl
                  block={b}
                  palette={palette}
                  selected={selected}
                  onPointerDown={(e) => startBlockPointer(e, b)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!selectedIds.has(b.id)) onSelectIds([b.id]);
                    onImageContextMenu(b.id, e.clientX, e.clientY);
                  }}
                />
              )}
              {selected && soloSelected?.id === b.id && (
                <ResizeHandles
                  w={b.w}
                  h={b.type === "image" ? b.h : undefined}
                  isText={b.type === "text"}
                  onStart={(h, e) => startResize(e, b, h)}
                />
              )}
            </div>
          );
        })}

        {marquee && (
          <div
            style={{
              position: "absolute",
              left: Math.min(marquee.startX, marquee.curX),
              top: Math.min(marquee.startY, marquee.curY),
              width: Math.abs(marquee.curX - marquee.startX),
              height: Math.abs(marquee.curY - marquee.startY),
              border: "1.5px dashed #4c8dff",
              background: "rgba(76,141,255,0.08)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

function ResizeHandles({ w, h, isText, onStart }: {
  w: number; h: number | undefined; isText: boolean;
  onStart: (handle: Handle, e: React.PointerEvent) => void;
}) {
  const handles: Array<{ h: Handle; l: number; t: number; cursor: string; visible: boolean }> = [
    { h: "nw", l: 0, t: 0, cursor: "nwse-resize", visible: !isText },
    { h: "n",  l: w / 2, t: 0, cursor: "ns-resize", visible: !isText },
    { h: "ne", l: w, t: 0, cursor: "nesw-resize", visible: !isText },
    { h: "e",  l: w, t: (h ?? 20) / 2, cursor: "ew-resize", visible: true },
    { h: "se", l: w, t: h ?? 20, cursor: "nwse-resize", visible: !isText },
    { h: "s",  l: w / 2, t: h ?? 20, cursor: "ns-resize", visible: !isText },
    { h: "sw", l: 0, t: h ?? 20, cursor: "nesw-resize", visible: !isText },
    { h: "w",  l: 0, t: (h ?? 20) / 2, cursor: "ew-resize", visible: true },
  ];
  const size = 12;
  return (
    <>
      {handles.filter((x) => x.visible).map((x) => (
        <div
          key={x.h}
          onPointerDown={(e) => { e.stopPropagation(); onStart(x.h, e); }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", left: x.l - size / 2, top: x.t - size / 2,
            width: size, height: size,
            background: "white", border: "2px solid #4c8dff", borderRadius: 2,
            cursor: x.cursor, touchAction: "none", zIndex: 10,
          }}
        />
      ))}
    </>
  );
}

function TextEl({ block, selected, onPointerDown }: {
  block: TextBlock; selected: boolean; onPointerDown: (e: React.PointerEvent) => void;
}) {
  const style: CSSProperties = {
    width: block.w,
    fontFamily: FAMILY[block.fontFamily ?? "sans"] ?? FAMILY.sans,
    fontSize: block.fontSize,
    fontWeight: block.fontWeight,
    fontStyle: block.fontStyle,
    color: block.color,
    textAlign: block.align ?? "left",
    lineHeight: block.lineHeight ?? 1.4,
    letterSpacing: block.letterSpacing ? `${block.letterSpacing}px` : undefined,
    textTransform: block.textTransform,
    whiteSpace: "pre-wrap",
    cursor: "move", userSelect: "none", touchAction: "none",
    outline: selected ? "2px solid #4c8dff" : "none",
    outlineOffset: 4, borderRadius: 2,
  };
  return <div style={style} onPointerDown={onPointerDown}>{block.text}</div>;
}

function ImageEl({ block, palette, selected, onPointerDown, onContextMenu }: {
  block: ImageBlock; palette: Palette; selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      style={{
        width: block.w, height: block.h,
        border: block.src ? "none" : "2px dashed rgba(0,0,0,0.25)",
        background: block.src ? "transparent" : "rgba(0,0,0,0.03)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: palette.muted,
        fontFamily: FAMILY.serif, fontStyle: "italic", fontSize: 14,
        textAlign: "center", padding: 6, boxSizing: "border-box",
        cursor: "move", userSelect: "none", touchAction: "none",
        outline: selected ? "2px solid #4c8dff" : "none",
        outlineOffset: 4, overflow: "hidden",
      }}
    >
      {block.src ? (
        <img src={block.src} alt={block.label} draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
      ) : (
        <>
          {block.label}
          <div style={{ position: "absolute", fontSize: 10, marginTop: 40, opacity: 0.6 }}>右键上传/搜索/去背景</div>
        </>
      )}
    </div>
  );
}
