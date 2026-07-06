import type { Block, TextBlock } from "@/lib/poster-data";
import { POSTER_ACCENT, POSTER_BG, POSTER_INK, POSTER_MUTED } from "@/lib/poster-data";

export type Operation =
  | { type: "update_text"; id: string; text: string }
  | {
      type: "update_style";
      id: string;
      fontSize?: number;
      color?: string;
      fontWeight?: number;
      fontStyle?: "normal" | "italic";
      align?: "left" | "center" | "right";
      lineHeight?: number;
      letterSpacing?: number;
      fontFamily?: "serif" | "sans" | "display";
      textTransform?: "none" | "uppercase";
    }
  | { type: "replace_all"; find: string; replace: string; caseSensitive?: boolean }
  | {
      type: "recolor_scheme";
      background?: string;
      ink?: string;
      accent?: string;
      muted?: string;
    };

export type Palette = {
  background: string;
  ink: string;
  accent: string;
  muted: string;
};

export const DEFAULT_PALETTE: Palette = {
  background: POSTER_BG,
  ink: POSTER_INK,
  accent: POSTER_ACCENT,
  muted: POSTER_MUTED,
};

export function applyOperations(
  blocks: Block[],
  palette: Palette,
  ops: Operation[],
): { blocks: Block[]; palette: Palette } {
  let nextBlocks = blocks;
  let nextPalette = palette;

  for (const op of ops) {
    switch (op.type) {
      case "update_text": {
        nextBlocks = nextBlocks.map((b) =>
          b.id === op.id && b.type === "text" ? { ...b, text: op.text } : b,
        );
        break;
      }
      case "update_style": {
        nextBlocks = nextBlocks.map((b) => {
          if (b.id !== op.id || b.type !== "text") return b;
          const t = b as TextBlock;
          return {
            ...t,
            ...(op.fontSize != null ? { fontSize: op.fontSize } : {}),
            ...(op.color ? { color: op.color } : {}),
            ...(op.fontWeight ? { fontWeight: op.fontWeight as TextBlock["fontWeight"] } : {}),
            ...(op.fontStyle ? { fontStyle: op.fontStyle } : {}),
            ...(op.align ? { align: op.align } : {}),
            ...(op.lineHeight != null ? { lineHeight: op.lineHeight } : {}),
            ...(op.letterSpacing != null ? { letterSpacing: op.letterSpacing } : {}),
            ...(op.fontFamily ? { fontFamily: op.fontFamily } : {}),
            ...(op.textTransform ? { textTransform: op.textTransform } : {}),
          };
        });
        break;
      }
      case "replace_all": {
        const flags = op.caseSensitive ? "g" : "gi";
        const escaped = op.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(escaped, flags);
        nextBlocks = nextBlocks.map((b) =>
          b.type === "text" ? { ...b, text: b.text.replace(re, op.replace) } : b,
        );
        break;
      }
      case "recolor_scheme": {
        const prev = nextPalette;
        nextPalette = {
          background: op.background ?? prev.background,
          ink: op.ink ?? prev.ink,
          accent: op.accent ?? prev.accent,
          muted: op.muted ?? prev.muted,
        };
        // Also swap colors in existing blocks that used old palette values.
        nextBlocks = nextBlocks.map((b) => {
          if (b.type !== "text") return b;
          let c = b.color;
          if (c === prev.ink) c = nextPalette.ink;
          else if (c === prev.accent) c = nextPalette.accent;
          else if (c === prev.muted) c = nextPalette.muted;
          return { ...b, color: c };
        });
        break;
      }
    }
  }

  return { blocks: nextBlocks, palette: nextPalette };
}
