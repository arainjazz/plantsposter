import { Block, TextBlock, ImageBlock, POSTER_H, POSTER_W } from "@/lib/poster-data";
import type { Palette } from "@/lib/poster-ops";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";

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

export type ResizePatch = { id: string; x: number; y: number; w: number; h?: number };

type Props = {
  blocks: Block[];
  palette: Palette;
  selectedIds: Set<string>;
  onSelectIds: (ids: string[], additive?: boolean) => void;
  onMoveMany: (dx: number, dy: number) => void;
  onResize: (id: string, patch: { x: number; y: number; w: number; h?: number }) => void;
  onResizeMany?: (patches: ResizePatch[]) => void;
  onChangeText: (id: string, text: string) => void;
  onImageContextMenu: (id: string, clientX: number, clientY: number) => void;
  displayWidth: number;
};

type MoveState = { kind: "move"; startX: number; startY: number; committedDx: number; committedDy: number };
type ResizeState = {
  kind: "resize"; id: string; handle: Handle;
  startX: number; startY: number;
  origX: number; origY: number; origW: number; origH: number; isText: boolean;
};
type GroupResizeState = {
  kind: "group-resize"; handle: Handle;
  startX: number; startY: number;
  bboxX: number; bboxY: number; bboxW: number; bboxH: number;
  originals: Array<{ id: string; x: number; y: number; w: number; h: number; isText: boolean }>;
};
type MarqueeState = { kind: "marquee"; startX: number; startY: number; curX: number; curY: number; additive: boolean };
type DragState = MoveState | ResizeState | GroupResizeState | MarqueeState | null;

export function PosterCanvas({
  blocks, palette, selectedIds, onSelectIds, onMoveMany, onResize, onResizeMany, onChangeText, onImageContextMenu, displayWidth,
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

  function startGroupResize(e: React.PointerEvent, handle: Handle, bbox: { x: number; y: number; w: number; h: number }) {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const originals = blocks
      .filter((b) => selectedIds.has(b.id))
      .map((b) => ({
        id: b.id, x: b.x, y: b.y, w: b.w,
        h: b.type === "image" ? b.h : 100,
        isText: b.type === "text",
      }));
    dragRef.current = {
      kind: "group-resize", handle,
      startX: e.clientX, startY: e.clientY,
      bboxX: bbox.x, bboxY: bbox.y, bboxW: bbox.w, bboxH: bbox.h,
      originals,
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
    if (d.kind === "group-resize") {
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      const hasH = d.handle.includes("e") || d.handle.includes("w");
      const hasV = d.handle.includes("n") || d.handle.includes("s");
      let newX = d.bboxX, newY = d.bboxY, newW = d.bboxW, newH = d.bboxH;
      if (d.handle.includes("e")) newW = Math.max(30, d.bboxW + dx);
      if (d.handle.includes("s")) newH = Math.max(30, d.bboxH + dy);
      if (d.handle.includes("w")) { newW = Math.max(30, d.bboxW - dx); newX = d.bboxX + (d.bboxW - newW); }
      if (d.handle.includes("n")) { newH = Math.max(30, d.bboxH - dy); newY = d.bboxY + (d.bboxH - newH); }
      // Hold Shift for uniform (aspect-locked) scaling; default = per-axis so the
      // axis you're NOT dragging (and paragraph vertical spacing) stays put.
      if (e.shiftKey && hasH && hasV) {
        const ratio = d.bboxW / d.bboxH;
        if (Math.abs(newW - d.bboxW) > Math.abs(newH - d.bboxH)) newH = newW / ratio;
        else newW = newH * ratio;
        if (d.handle.includes("w")) newX = d.bboxX + (d.bboxW - newW);
        if (d.handle.includes("n")) newY = d.bboxY + (d.bboxH - newH);
      }
      const sx = hasH ? newW / d.bboxW : 1;
      const sy = hasV ? newH / d.bboxH : 1;
      const patches: ResizePatch[] = d.originals.map((o) => {
        const relX = (o.x - d.bboxX) / d.bboxW;
        const relY = (o.y - d.bboxY) / d.bboxH;
        const x = Math.round(newX + relX * newW);
        const y = Math.round(newY + relY * newH);
        const w = Math.max(20, Math.round(o.w * sx));
        const h = Math.max(20, Math.round(o.h * sy));
        return o.isText ? { id: o.id, x, y, w } : { id: o.id, x, y, w, h };
      });
      if (onResizeMany) onResizeMany(patches);
      else patches.forEach((p) => onResize(p.id, p));
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

  // Compute group bbox when multi-selected
  const groupBBox = useMemo(() => {
    if (selectedIds.size < 2) return null;
    const sel = blocks.filter((b) => selectedIds.has(b.id));
    if (sel.length < 2) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of sel) {
      const bh = b.type === "image" ? b.h : 40;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + bh);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [blocks, selectedIds]);

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
                <TextEl block={b} selected={selected} onChangeText={onChangeText} onPointerDown={(e) => startBlockPointer(e, b)} />
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

        {groupBBox && (
          <div
            style={{
              position: "absolute",
              left: groupBBox.x, top: groupBBox.y,
              width: groupBBox.w, height: groupBBox.h,
              border: "1.5px dashed #4c8dff",
              pointerEvents: "none",
              zIndex: 9,
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <ResizeHandles
                w={groupBBox.w}
                h={groupBBox.h}
                isText={false}
                onStart={(h, e) => startGroupResize(e, h, groupBBox)}
              />
            </div>
          </div>
        )}

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

function TextEl({ block, selected, onChangeText, onPointerDown }: {
  block: TextBlock; selected: boolean; onChangeText: (id: string, text: string) => void; onPointerDown: (e: React.PointerEvent) => void;
}) {
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
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
    cursor: editing ? "text" : "move", userSelect: editing ? "text" : "none", touchAction: "none",
    outline: editing ? "2px solid #b0692b" : selected ? "2px solid #4c8dff" : "none",
    outlineOffset: 4, borderRadius: 2,
  };
  useEffect(() => {
    if (!editing) return;
    editRef.current?.focus();
    editRef.current?.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
  }, [editing]);
  if (editing) {
    const lines = Math.max(1, block.text.split("\n").length);
    return (
      <textarea
        ref={editRef}
        value={block.text}
        onChange={(e) => onChangeText(block.id, e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setEditing(false); } }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          ...style,
          minHeight: block.fontSize * (block.lineHeight ?? 1.4) * lines + 12,
          resize: "none",
          overflow: "hidden",
          border: "none",
          background: "rgba(255,255,255,0.78)",
          padding: 0,
          margin: 0,
        }}
      />
    );
  }
  return <div style={style} onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }} onPointerDown={onPointerDown}>{block.text}</div>;
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
          style={{ width: "100%", height: "100%", objectFit: block.src.startsWith("data:image/svg+xml") ? "fill" : "cover", pointerEvents: "none" }} />
      ) : (
        <>
          {block.label}
          <div style={{ position: "absolute", fontSize: 10, marginTop: 40, opacity: 0.6 }}>右键上传/搜索/去背景</div>
        </>
      )}
    </div>
  );
}
