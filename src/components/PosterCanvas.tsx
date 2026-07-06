import { Block, TextBlock, ImageBlock, POSTER_H, POSTER_W } from "@/lib/poster-data";
import type { Palette } from "@/lib/poster-ops";
import { CSSProperties, useRef } from "react";

const FAMILY: Record<string, string> = {
  serif: '"Noto Serif SC", "Source Han Serif SC", Georgia, "Songti SC", serif',
  sans: '"Noto Sans SC", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  display:
    '"Noto Serif SC", "Songti SC", "STSong", "Source Han Serif SC", Georgia, serif',
};

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type Props = {
  blocks: Block[];
  palette: Palette;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, patch: { x: number; y: number; w: number; h?: number }) => void;
  displayWidth: number;
};

type DragState =
  | { kind: "move"; id: string; startX: number; startY: number; origX: number; origY: number }
  | {
      kind: "resize";
      id: string;
      handle: Handle;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
      isText: boolean;
    };

export function PosterCanvas({ blocks, palette, selectedId, onSelect, onMove, onResize, displayWidth }: Props) {
  const scale = displayWidth / POSTER_W;
  const height = POSTER_H * scale;
  const dragRef = useRef<DragState | null>(null);

  function startMove(e: React.PointerEvent, b: Block) {
    e.stopPropagation();
    onSelect(b.id);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "move",
      id: b.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: b.x,
      origY: b.y,
    };
  }

  function startResize(e: React.PointerEvent, b: Block, handle: Handle) {
    e.stopPropagation();
    onSelect(b.id);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const h = b.type === "image" ? b.h : 100;
    dragRef.current = {
      kind: "resize",
      id: b.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origX: b.x,
      origY: b.y,
      origW: b.w,
      origH: h,
      isText: b.type === "text",
    };
  }

  function onDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    if (d.kind === "move") {
      onMove(d.id, Math.round(d.origX + dx), Math.round(d.origY + dy));
      return;
    }
    let { origX: x, origY: y, origW: w, origH: h } = d;
    if (d.handle.includes("e")) w = Math.max(20, d.origW + dx);
    if (d.handle.includes("s")) h = Math.max(20, d.origH + dy);
    if (d.handle.includes("w")) { w = Math.max(20, d.origW - dx); x = d.origX + (d.origW - w); }
    if (d.handle.includes("n")) { h = Math.max(20, d.origH - dy); y = d.origY + (d.origH - h); }
    // shift = aspect lock (only for images)
    if (!d.isText && e.shiftKey) {
      const ratio = d.origW / d.origH;
      if (Math.abs(w - d.origW) > Math.abs(h - d.origH)) h = w / ratio; else w = h * ratio;
    }
    onResize(d.id, {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: d.isText ? undefined : Math.round(h),
    });
  }

  function endDrag(e: React.PointerEvent) {
    if (dragRef.current) {
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }
    dragRef.current = null;
  }

  return (
    <div
      onClick={() => onSelect(null)}
      onPointerMove={onDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        width: displayWidth,
        height,
        background: palette.background,
        position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: POSTER_W,
          height: POSTER_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {blocks.map((b) => {
          const selected = selectedId === b.id;
          return (
            <div key={b.id} style={{ position: "absolute", left: b.x, top: b.y }}>
              {b.type === "text" ? (
                <TextEl block={b} selected={selected} onPointerDown={(e) => startMove(e, b)} />
              ) : (
                <ImageEl block={b} palette={palette} selected={selected} onPointerDown={(e) => startMove(e, b)} />
              )}
              {selected && (
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
      </div>
    </div>
  );
}

function ResizeHandles({
  w, h, isText, onStart,
}: {
  w: number;
  h: number | undefined;
  isText: boolean;
  onStart: (handle: Handle, e: React.PointerEvent) => void;
}) {
  // For text (auto-height) show only side handles that adjust width.
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
      {handles.filter(x => x.visible).map((x) => (
        <div
          key={x.h}
          onPointerDown={(e) => onStart(x.h, e)}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: x.l - size / 2,
            top: x.t - size / 2,
            width: size,
            height: size,
            background: "white",
            border: "2px solid #4c8dff",
            borderRadius: 2,
            cursor: x.cursor,
            touchAction: "none",
            zIndex: 10,
          }}
        />
      ))}
    </>
  );
}

function TextEl({
  block,
  selected,
  onPointerDown,
}: {
  block: TextBlock;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const style: CSSProperties = {
    width: block.w,
    fontFamily: FAMILY[block.fontFamily ?? "sans"],
    fontSize: block.fontSize,
    fontWeight: block.fontWeight,
    fontStyle: block.fontStyle,
    color: block.color,
    textAlign: block.align ?? "left",
    lineHeight: block.lineHeight ?? 1.4,
    letterSpacing: block.letterSpacing ? `${block.letterSpacing}px` : undefined,
    textTransform: block.textTransform,
    whiteSpace: "pre-wrap",
    cursor: "move",
    userSelect: "none",
    touchAction: "none",
    outline: selected ? "2px solid #4c8dff" : "none",
    outlineOffset: 4,
    borderRadius: 2,
  };
  return (
    <div style={style} onPointerDown={onPointerDown} onClick={(e) => e.stopPropagation()}>
      {block.text}
    </div>
  );
}

function ImageEl({
  block,
  palette,
  selected,
  onPointerDown,
}: {
  block: ImageBlock;
  palette: Palette;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: block.w,
        height: block.h,
        border: block.src ? "none" : "2px dashed rgba(0,0,0,0.25)",
        background: block.src ? "transparent" : "rgba(0,0,0,0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: palette.muted,
        fontFamily: FAMILY.serif,
        fontStyle: "italic",
        fontSize: 14,
        textAlign: "center",
        padding: 6,
        boxSizing: "border-box",
        cursor: "move",
        userSelect: "none",
        touchAction: "none",
        outline: selected ? "2px solid #4c8dff" : "none",
        outlineOffset: 4,
        overflow: "hidden",
      }}
    >
      {block.src ? (
        <img
          src={block.src}
          alt={block.label}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
        />
      ) : (
        block.label
      )}
    </div>
  );
}
