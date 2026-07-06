import { Block, TextBlock, ImageBlock, POSTER_H, POSTER_W } from "@/lib/poster-data";
import type { Palette } from "@/lib/poster-ops";
import { CSSProperties } from "react";

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
  displayWidth: number; // css px width of rendered canvas
};

export function PosterCanvas({ blocks, palette, selectedId, onSelect, displayWidth }: Props) {
  const scale = displayWidth / POSTER_W;
  const height = POSTER_H * scale;

  return (
    <div
      onClick={() => onSelect(null)}
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
            <TextEl
              key={b.id}
              block={b}
              selected={selectedId === b.id}
              onSelect={(id) => onSelect(id)}
            />
          ) : (
            <ImageEl
              key={b.id}
              block={b}
              palette={palette}
              selected={selectedId === b.id}
              onSelect={(id) => onSelect(id)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function TextEl({
  block,
  selected,
  onSelect,
}: {
  block: TextBlock;
  selected: boolean;
  onSelect: (id: string) => void;
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
    cursor: "pointer",
    outline: selected ? "2px solid #4c8dff" : "none",
    outlineOffset: 4,
    borderRadius: 2,
  };
  return (
    <div
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
    >
      {block.text}
    </div>
  );
}

function ImageEl({
  block,
  palette,
  selected,
  onSelect,
}: {
  block: ImageBlock;
  palette: Palette;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.w,
        height: block.h,
        border: "2px dashed rgba(0,0,0,0.2)",
        background: "rgba(0,0,0,0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: palette.muted,
        fontFamily: FAMILY.serif,
        fontStyle: "italic",
        fontSize: 16,
        cursor: "pointer",
        outline: selected ? "2px solid #4c8dff" : "none",
        outlineOffset: 4,
      }}
    >
      {block.src ? (
        <img src={block.src} alt={block.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        block.label
      )}
    </div>
  );
}
