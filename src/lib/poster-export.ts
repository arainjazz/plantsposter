import type { Block, TextBlock, ImageBlock, PosterPage } from "@/lib/poster-data";
import { POSTER_H, POSTER_W, isSvgSrc } from "@/lib/poster-data";
import type { Palette } from "@/lib/poster-ops";

const FONT_FAMILY: Record<NonNullable<TextBlock["fontFamily"]>, string> = {
  serif: '"Noto Serif SC", "Source Han Serif SC", Georgia, "Songti SC", serif',
  sans: '"Noto Sans SC", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  display: '"ZCOOL XiaoWei", "Noto Serif SC", "Songti SC", Georgia, serif',
  kai: '"Ma Shan Zheng", "KaiTi", "STKaiti", cursive',
  wenkai: '"LXGW WenKai TC", "KaiTi", "STKaiti", serif',
  mono: '"JetBrains Mono", "Menlo", "Courier New", monospace',
  playfair: '"Playfair Display", Georgia, serif',
  inter: '"Inter", "Noto Sans SC", "PingFang SC", sans-serif',
};

// Cache loaded images by src.
const imageCache = new Map<string, HTMLImageElement>();
function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

async function preloadImages(blocks: Block[]): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  await Promise.all(
    blocks
      .filter((b): b is ImageBlock => b.type === "image" && !!b.src)
      .map(async (b) => {
        try {
          map.set(b.src!, await loadImage(b.src!));
        } catch {
          /* ignore */
        }
      }),
  );
  return map;
}

function parseRgba(input: string): { r: number; g: number; b: number; a: number } | null {
  const hex = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(input.trim());
  if (hex)
    return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16), a: 1 };
  const rgba = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i.exec(input);
  if (rgba)
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] == null ? 1 : Number(rgba[4]),
    };
  return null;
}

function rgbaCss(c: { r: number; g: number; b: number; a: number }) {
  return `rgba(${c.r},${c.g},${c.b},${c.a})`;
}

function firstColor(input: string, fallback = "#f7f2e4") {
  const match = input.match(/#[\da-fA-F]{6}|rgba?\([^)]*\)/);
  return match?.[0] ?? fallback;
}

type LinearGradientSpec = {
  angle: number;
  stops: Array<{ color: string; offset: number }>;
};

// BackgroundPicker currently writes two-stop rgba()/hex gradients. Keep the
// parser deliberately strict enough to reject malformed CSS, but allow decimal
// offsets and embedded commas inside rgba() values.
function parseLinearGradient(background: string): LinearGradientSpec | null {
  const css = background.trim();
  const head = /^linear-gradient\(\s*([-\d.]+)deg\s*,\s*/i.exec(css);
  if (!head) return null;
  if (!css.endsWith(")")) return null;
  const body = css.slice(head[0].length, -1).trim();
  const stopPattern = /(#[\da-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))\s+([-\d.]+)%/gi;
  const stops: LinearGradientSpec["stops"] = [];
  let match: RegExpExecArray | null;
  while ((match = stopPattern.exec(body))) {
    stops.push({
      color: match[1].trim(),
      offset: Math.max(0, Math.min(1, Number(match[2]) / 100)),
    });
  }
  if (stops.length < 2) return null;
  return { angle: Number(head[1]), stops };
}

function gradientEndpoints(angle: number) {
  // CSS angles start at north and rotate clockwise; Canvas uses ordinary x/y
  // coordinates. Project the page corners onto the CSS direction so 0/90/180
  // degree gradients reach the exact same edges as the browser.
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const length = Math.abs(POSTER_W * dx) + Math.abs(POSTER_H * dy);
  const cx = POSTER_W / 2;
  const cy = POSTER_H / 2;
  return {
    x1: cx - (dx * length) / 2,
    y1: cy - (dy * length) / 2,
    x2: cx + (dx * length) / 2,
    y2: cy + (dy * length) / 2,
  };
}

function paintBackground(ctx: CanvasRenderingContext2D, background: string) {
  if (!background || background === "transparent" || background === "rgba(0,0,0,0)") return;
  const gradient = parseLinearGradient(background);
  if (gradient) {
    const { x1, y1, x2, y2 } = gradientEndpoints(gradient.angle);
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.stops.forEach((stop) => g.addColorStop(stop.offset, stop.color));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = background;
  }
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
}

// Source-rect of `img` that the editor actually shows inside an image block:
// the image is object-fit into the media box (the block expanded by its
// non-destructive crop offsets) — "fill" for SVGs, "cover" (centered) for
// everything else — and the block then windows [crop.left, crop.top, w, h]
// of that box. Exports must draw this rect, not the whole image, or photos
// come out stretched and crops are ignored.
function visibleSourceRect(
  img: HTMLImageElement,
  ib: ImageBlock,
): { sx: number; sy: number; sw: number; sh: number } {
  const left = Math.max(0, ib.crop?.left ?? 0);
  const right = Math.max(0, ib.crop?.right ?? 0);
  const top = Math.max(0, ib.crop?.top ?? 0);
  const bottom = Math.max(0, ib.crop?.bottom ?? 0);
  const mediaW = ib.w + left + right;
  const mediaH = ib.h + top + bottom;
  const iw = img.naturalWidth || mediaW;
  const ih = img.naturalHeight || mediaH;
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  if (!(ib.src && isSvgSrc(ib.src))) {
    const cover = Math.max(mediaW / iw, mediaH / ih);
    sw = mediaW / cover;
    sh = mediaH / cover;
    sx = (iw - sw) / 2;
    sy = (ih - sh) / 2;
  }
  const kx = sw / mediaW;
  const ky = sh / mediaH;
  return { sx: sx + left * kx, sy: sy + top * ky, sw: ib.w * kx, sh: ib.h * ky };
}

async function imageToDataUrl(src: string): Promise<string> {
  const img = await loadImage(src);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.92);
}

export async function renderPosterToCanvas(
  blocks: Block[],
  palette: Palette,
  scale = 2,
  background?: string,
): Promise<HTMLCanvasElement> {
  const imgs = await preloadImages(blocks);
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W * scale;
  canvas.height = POSTER_H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  paintBackground(ctx, background ?? palette.background);

  for (const b of blocks) {
    if (b.type === "image") {
      const ib = b as ImageBlock;
      const img = ib.src ? imgs.get(ib.src) : null;
      if (img) {
        const s = visibleSourceRect(img, ib);
        ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, ib.x, ib.y, ib.w, ib.h);
      } else {
        ctx.fillStyle = "rgba(0,0,0,0.04)";
        ctx.fillRect(ib.x, ib.y, ib.w, ib.h);
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(ib.x, ib.y, ib.w, ib.h);
        ctx.setLineDash([]);
        ctx.fillStyle = palette.muted;
        ctx.font = `italic 14px ${FONT_FAMILY.serif}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ib.label, ib.x + ib.w / 2, ib.y + ib.h / 2);
      }
      continue;
    }
    const t = b as TextBlock;
    const family = FONT_FAMILY[t.fontFamily ?? "sans"];
    const style = t.fontStyle === "italic" ? "italic" : "normal";
    ctx.fillStyle = t.color;
    ctx.font = `${style} ${t.fontWeight ?? 400} ${t.fontSize}px ${family}`;
    ctx.textAlign = (t.align ?? "left") as CanvasTextAlign;
    ctx.textBaseline = "top";

    const lineHeight = t.fontSize * (t.lineHeight ?? 1.4);
    const lines = wrapLines(ctx, t.text, t.w, t.letterSpacing ?? 0);
    let anchorX = t.x;
    if (t.align === "center") anchorX = t.x + t.w / 2;
    else if (t.align === "right") anchorX = t.x + t.w;
    lines.forEach((line, i) => {
      drawLineWithSpacing(
        ctx,
        line,
        anchorX,
        t.y + i * lineHeight,
        t.letterSpacing ?? 0,
        t.align ?? "left",
        t.textTransform === "uppercase",
      );
    });
  }

  return canvas;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  letterSpacing: number,
): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      out.push("");
      continue;
    }
    let cur = "";
    for (const ch of Array.from(paragraph)) {
      const test = cur + ch;
      const w = measureWithSpacing(ctx, test, letterSpacing);
      if (w > maxWidth && cur) {
        out.push(cur);
        cur = ch;
      } else cur = test;
    }
    if (cur) out.push(cur);
  }
  return out;
}
function measureWithSpacing(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  if (!spacing) return ctx.measureText(text).width;
  const chars = Array.from(text);
  return (
    chars.reduce((acc, c) => acc + ctx.measureText(c).width, 0) +
    spacing * Math.max(0, chars.length - 1)
  );
}
function drawLineWithSpacing(
  ctx: CanvasRenderingContext2D,
  line: string,
  anchorX: number,
  y: number,
  spacing: number,
  align: "left" | "center" | "right",
  upper: boolean,
) {
  const text = upper ? line.toUpperCase() : line;
  if (!spacing) {
    ctx.fillText(text, anchorX, y);
    return;
  }
  const chars = Array.from(text);
  const width = measureWithSpacing(ctx, text, spacing);
  let x = anchorX;
  if (align === "center") x = anchorX - width / 2;
  else if (align === "right") x = anchorX - width;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (const c of chars) {
    ctx.fillText(c, x, y);
    x += ctx.measureText(c).width + spacing;
  }
  ctx.textAlign = prevAlign;
}

export async function renderPosterToSVG(
  blocks: Block[],
  palette: Palette,
  background?: string,
): Promise<string> {
  const bg = background ?? palette.background;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${POSTER_W}" height="${POSTER_H}" viewBox="0 0 ${POSTER_W} ${POSTER_H}">`,
  );
  if (bg.startsWith("linear-gradient")) {
    const colors = bg.match(/#[\da-fA-F]{6}|rgba?\([^)]*\)/g) ?? ["#f7f2e4", "#d7c7a6"];
    parts.push(
      `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${colors[0]}"/><stop offset="100%" stop-color="${colors[1] ?? colors[0]}"/></linearGradient></defs>`,
    );
    parts.push(`<rect width="${POSTER_W}" height="${POSTER_H}" fill="url(#bg)"/>`);
  } else if (bg && bg !== "rgba(0,0,0,0)" && bg !== "transparent") {
    parts.push(`<rect width="${POSTER_W}" height="${POSTER_H}" fill="${bg}"/>`);
  }
  for (const b of blocks) {
    if (b.type === "image") {
      if (b.src) {
        try {
          const dataUrl = await imageToDataUrl(b.src);
          parts.push(
            `<image x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" href="${dataUrl}" preserveAspectRatio="xMidYMid slice"/>`,
          );
        } catch {
          parts.push(
            `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="rgba(0,0,0,0.04)"/>`,
          );
        }
      } else {
        parts.push(
          `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.15)" stroke-dasharray="6 6"/>`,
          `<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2}" font-family="serif" font-style="italic" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="${palette.muted}">${esc(b.label)}</text>`,
        );
      }
      continue;
    }
    const t = b;
    const family = FONT_FAMILY[t.fontFamily ?? "sans"];
    const lineHeight = t.fontSize * (t.lineHeight ?? 1.4);
    const anchor = t.align === "center" ? "middle" : t.align === "right" ? "end" : "start";
    const x = t.align === "center" ? t.x + t.w / 2 : t.align === "right" ? t.x + t.w : t.x;
    const lines = t.text.split("\n");
    parts.push(
      `<text x="${x}" y="${t.y + t.fontSize}" font-family='${family}' font-size="${t.fontSize}" font-weight="${t.fontWeight}" font-style="${t.fontStyle ?? "normal"}" letter-spacing="${t.letterSpacing ?? 0}" text-anchor="${anchor}" fill="${t.color}">${lines
        .map(
          (l, i) =>
            `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${esc(t.textTransform === "uppercase" ? l.toUpperCase() : l)}</tspan>`,
        )
        .join("")}</text>`,
    );
  }
  parts.push("</svg>");
  return parts.join("");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cleanName(name?: string): string {
  return (name || "poster")
    .replace(/[\\/:*?"<>|\n\r\t]/g, "_")
    .trim()
    .slice(0, 60);
}

export async function exportPng(
  blocks: Block[],
  palette: Palette,
  transparent: boolean,
  name?: string,
  background?: string,
) {
  const canvas = await renderPosterToCanvas(
    blocks,
    palette,
    3,
    transparent ? "rgba(0,0,0,0)" : background,
  );
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${cleanName(name)}.png`);
      resolve();
    }, "image/png");
  });
}

export async function exportJpg(
  blocks: Block[],
  palette: Palette,
  name?: string,
  background?: string,
) {
  const canvas = await renderPosterToCanvas(blocks, palette, 3, background);
  await new Promise<void>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) downloadBlob(blob, `${cleanName(name)}.jpg`);
        resolve();
      },
      "image/jpeg",
      0.95,
    );
  });
}

// ── WYSIWYG PDF export ─────────────────────────────────────────────────────
// A3 page in mm. PDF is intentionally rendered through a browser DOM mirror:
// it uses the same CSS gradient, object-fit/crop and font shaping engine as the
// editor. Re-laying text with jsPDF caused substituted fonts, different CJK
// line breaks and baseline drift, while drawing raw images stretched crops.
const A3_W_MM = 297;
const A3_H_MM = 420;

function applyStyles(el: HTMLElement, styles: Record<string, string>) {
  Object.assign(el.style, styles);
}

function createPosterDom(page: PosterPage, palette: Palette): HTMLDivElement {
  const root = document.createElement("div");
  root.dataset.posterExportRoot = "true";
  root.setAttribute("aria-hidden", "true");
  applyStyles(root, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "-2147483647",
    width: `${POSTER_W}px`,
    height: `${POSTER_H}px`,
    overflow: "hidden",
    boxSizing: "border-box",
    background: page.background ?? palette.background,
    pointerEvents: "none",
  });

  for (const block of page.blocks) {
    if (block.type === "text") {
      const text = document.createElement("div");
      applyStyles(text, {
        position: "absolute",
        left: `${block.x}px`,
        top: `${block.y}px`,
        width: `${block.w}px`,
        margin: "0",
        padding: "0",
        border: "0",
        boxSizing: "border-box",
        fontFamily: FONT_FAMILY[block.fontFamily ?? "sans"],
        fontSize: `${block.fontSize}px`,
        fontWeight: String(block.fontWeight ?? 400),
        fontStyle: block.fontStyle ?? "normal",
        color: block.color,
        textAlign: block.align ?? "left",
        lineHeight: String(block.lineHeight ?? 1.4),
        letterSpacing: block.letterSpacing ? `${block.letterSpacing}px` : "normal",
        textTransform: block.textTransform ?? "none",
        whiteSpace: "pre-wrap",
        wordBreak: "normal",
      });
      text.textContent = block.text;
      root.appendChild(text);
      continue;
    }

    const crop = {
      left: Math.max(0, block.crop?.left ?? 0),
      right: Math.max(0, block.crop?.right ?? 0),
      top: Math.max(0, block.crop?.top ?? 0),
      bottom: Math.max(0, block.crop?.bottom ?? 0),
    };
    const frame = document.createElement("div");
    applyStyles(frame, {
      position: "absolute",
      left: `${block.x}px`,
      top: `${block.y}px`,
      width: `${block.w}px`,
      height: `${block.h}px`,
      overflow: "hidden",
      boxSizing: "border-box",
    });
    if (block.src) {
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.alt = block.label;
      img.decoding = "async";
      applyStyles(img, {
        position: "absolute",
        left: `${-crop.left}px`,
        top: `${-crop.top}px`,
        width: `${block.w + crop.left + crop.right}px`,
        height: `${block.h + crop.top + crop.bottom}px`,
        objectFit: isSvgSrc(block.src) ? "fill" : "cover",
        objectPosition: "50% 50%",
        maxWidth: "none",
        pointerEvents: "none",
      });
      img.src = block.src;
      frame.appendChild(img);
    } else {
      applyStyles(frame, {
        border: "2px dashed rgba(0,0,0,0.25)",
        background: "rgba(0,0,0,0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: palette.muted,
        fontFamily: FONT_FAMILY.serif,
        fontStyle: "italic",
        fontSize: "14px",
        textAlign: "center",
        padding: "6px",
      });
      frame.textContent = block.label;
    }
    root.appendChild(frame);
  }
  return root;
}

async function waitForPosterDom(root: HTMLElement, blocks: Block[]) {
  const fontLoads = blocks
    .filter((b): b is TextBlock => b.type === "text" && !!b.text)
    .map((t) => {
      const descriptor = `${t.fontStyle ?? "normal"} ${t.fontWeight ?? 400} ${t.fontSize}px ${FONT_FAMILY[t.fontFamily ?? "sans"]}`;
      return document.fonts.load(descriptor, t.text.slice(0, 64)).catch(() => []);
    });
  const imageLoads = Array.from(root.querySelectorAll("img")).map(async (img) => {
    if (!img.complete) {
      await new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }
    if (img.naturalWidth > 0) await img.decode().catch(() => undefined);
  });
  await Promise.all([...fontLoads, ...imageLoads]);
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

async function renderPosterDomToCanvas(
  page: PosterPage,
  palette: Palette,
  scale: number,
): Promise<HTMLCanvasElement> {
  const root = createPosterDom(page, palette);
  document.body.appendChild(root);
  try {
    await waitForPosterDom(root, page.blocks);
    const { default: html2canvas } = await import("html2canvas-pro");
    return await html2canvas(root, {
      scale,
      width: POSTER_W,
      height: POSTER_H,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      imageTimeout: 30_000,
      logging: false,
      onclone: (_doc, clonedRoot) => {
        (clonedRoot as HTMLElement).style.zIndex = "0";
      },
    });
  } finally {
    root.remove();
  }
}

// Rasterise an image src at HIGH resolution for crisp export. Renders at
// `scale`× the on-poster block size (~300 DPI on A3), so vector SVG maps come
// out sharp and photos keep the same quality the old full-page raster produced.
// Transparency is preserved (PNG) unless the source is an opaque JPEG, so
// transparent range maps composite over the page background instead of turning
// black. Returns the data URL and the format for jsPDF.addImage.
async function imageToHiResDataUrl(
  ib: ImageBlock,
  scale = 3,
): Promise<{ dataUrl: string; fmt: "PNG" | "JPEG" }> {
  const src = ib.src!;
  const img = await loadImage(src);
  const w = Math.max(1, Math.round((ib.w || img.naturalWidth) * scale));
  const h = Math.max(1, Math.round((ib.h || img.naturalHeight) * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const s = visibleSourceRect(img, ib);
  ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, 0, 0, w, h);
  const opaque = /^data:image\/jpe?g/.test(src) || /\.jpe?g(?:[?#]|$)/i.test(src);
  return opaque
    ? { dataUrl: c.toDataURL("image/jpeg", 0.95), fmt: "JPEG" }
    : { dataUrl: c.toDataURL("image/png"), fmt: "PNG" };
}

// Filesystem-safe base name for exports, derived from page name(s).
function exportBaseName(pages: PosterPage[]): string {
  const clean = (s: string) =>
    (s || "poster")
      .replace(/[\\/:*?"<>|\n\r\t]/g, "_")
      .trim()
      .slice(0, 60);
  if (pages.length === 1) return clean(pages[0].name);
  return `${clean(pages[0].name)}_等${pages.length}页`;
}

export async function exportPdf(pages: PosterPage[], palette: Palette, mode: "print" | "standard") {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a3" });
  for (let i = 0; i < pages.length; i++) {
    let canvas: HTMLCanvasElement;
    try {
      canvas = await renderPosterDomToCanvas(pages[i], palette, mode === "print" ? 3 : 2);
    } catch (error) {
      // A browser extension or a third-party image without CORS must not make
      // export unusable. The Canvas renderer remains a safe degraded fallback.
      console.error(
        "WYSIWYG PDF rendering failed; using Canvas fallback:",
        error instanceof Error ? error.message : error,
      );
      canvas = await renderPosterToCanvas(
        pages[i].blocks,
        palette,
        mode === "print" ? 3 : 2,
        pages[i].background,
      );
    }
    if (i > 0) pdf.addPage("a3", "portrait");
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, A3_W_MM, A3_H_MM);
  }
  pdf.save(`${exportBaseName(pages)}${mode === "print" ? "_print" : ""}.pdf`);
}

export async function exportSvg(
  blocks: Block[],
  palette: Palette,
  name?: string,
  background?: string,
) {
  const svg = await renderPosterToSVG(blocks, palette, background);
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${cleanName(name)}.svg`);
}

export async function exportPptx(pages: PosterPage[], palette: Palette) {
  const mod = await import("pptxgenjs");
  const PptxGenJS = mod.default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "A3P", width: 11.69, height: 16.54 });
  pptx.layout = "A3P";

  const toInX = (px: number) => (px / POSTER_W) * 11.69;
  const toInY = (px: number) => (px / POSTER_H) * 16.54;

  for (const page of pages) {
    const slide = pptx.addSlide();
    const bg = parseRgba(firstColor(page.background ?? palette.background));
    slide.background = {
      color: bg
        ? [bg.r, bg.g, bg.b].map((n) => n.toString(16).padStart(2, "0")).join("")
        : "F7F2E4",
    };

    for (const b of page.blocks) {
      if (b.type === "image") {
        if (b.src) {
          try {
            const { dataUrl } = await imageToHiResDataUrl(b, 3);
            slide.addImage({
              data: dataUrl,
              x: toInX(b.x),
              y: toInY(b.y),
              w: toInX(b.w),
              h: toInY(b.h),
            });
            continue;
          } catch {
            /* fall through */
          }
        }
        slide.addShape("rect", {
          x: toInX(b.x),
          y: toInY(b.y),
          w: toInX(b.w),
          h: toInY(b.h),
          fill: { color: "F5F0E4" },
          line: { color: "888888", dashType: "dash", width: 0.5 },
        });
        slide.addText(b.label, {
          x: toInX(b.x),
          y: toInY(b.y),
          w: toInX(b.w),
          h: toInY(b.h),
          align: "center",
          valign: "middle",
          italic: true,
          color: palette.muted.replace("#", ""),
          fontSize: 11,
        });
        continue;
      }
      const t = b;
      slide.addText(t.text, {
        x: toInX(t.x),
        y: toInY(t.y),
        w: toInX(t.w),
        h: toInY(t.fontSize * (t.lineHeight ?? 1.4) * Math.max(1, t.text.split("\n").length) + 20),
        // Accurate point size: the A3 slide is 16.54in (1190.88pt) tall,
        // mapping POSTER_H px → pt so the text is the same visual size.
        fontSize: Math.max(1, Math.round((t.fontSize * 16.54 * 72) / POSTER_H)),
        color: t.color.replace("#", ""),
        bold: (t.fontWeight ?? 400) >= 600,
        italic: t.fontStyle === "italic",
        align: (t.align ?? "left") as "left" | "center" | "right",
        lineSpacingMultiple: t.lineHeight ?? 1.4,
        fontFace:
          t.fontFamily === "display"
            ? "ZCOOL XiaoWei"
            : t.fontFamily === "serif"
              ? "Noto Serif SC"
              : "Noto Sans SC",
        charSpacing: t.letterSpacing ? t.letterSpacing * 5 : 0,
      });
    }
  }

  await pptx.writeFile({ fileName: `${exportBaseName(pages)}.pptx` });
}
