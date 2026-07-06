import { Block, TextBlock, ImageBlock, POSTER_H, POSTER_W } from "@/lib/poster-data";
import type { Palette } from "@/lib/poster-ops";
import { CSSProperties, useRef } from "react";

const FAMILY: Record<string, string> = {
  serif: '"Noto Serif SC", "Source Han Serif SC", Georgia, "Songti SC", serif',
  sans: '"Noto Sans SC", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  display:
    '"Noto Serif SC", "Songti SC", "STSong", "Source Han Serif SC", Georgia, serif',
};

type Props = {
  blocks: Block[];
  palette: Palette;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  displayWidth: number;
};

export function PosterCanvas({ blocks, palette, selectedId, onSelect, onMove, displayWidth }: Props) {
  const scale = displayWidth / POSTER_W;
  const height = POSTER_H * scale;
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  function startDrag(e: React.PointerEvent, b: Block) {
    e.stopPropagation();
    onSelect(b.id);
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: b.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: b.x,
      origY: b.y,
    };
  }
  function onDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    onMove(d.id, Math.round(d.origX + dx), Math.round(d.origY + dy));
  }
  function endDrag(e: React.PointerEvent) {
    if (dragRef.current) {
      try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
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
        {blocks.map((b) =>
          b.type === "text" ? (
            <TextEl key={b.id} block={b} selected={selectedId === b.id} onPointerDown={(e) => startDrag(e, b)} />
          ) : (
            <ImageEl key={b.id} block={b} palette={palette} selected={selectedId === b.id} onPointerDown={(e) => startDrag(e, b)} />
          ),
        )}
      </div>
    </div>
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
    position: "absolute",
    left: block.x,
    top: block.y,
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
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.w,
        height: block.h,
        border: block.src ? "none" : "2px dashed rgba(0,0,0,0.2)",
        background: block.src ? "transparent" : "rgba(0,0,0,0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: palette.muted,
        fontFamily: FAMILY.serif,
        fontStyle: "italic",
        fontSize: 16,
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
