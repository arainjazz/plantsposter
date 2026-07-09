import type { Block, TextBlock, ImageBlock, PosterPage } from "@/lib/poster-data";
import { POSTER_H, POSTER_W } from "@/lib/poster-data";
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

function paintBackground(ctx: CanvasRenderingContext2D, background: string) {
  if (!background || background === "transparent" || background === "rgba(0,0,0,0)") return;
  const gradient =
    /linear-gradient\(([-\d.]+)deg,\s*([^,]+(?:,[^,]+)*?)\s+0%,\s*([^,]+(?:,[^,]+)*?)\s+100%\)/i.exec(
      background,
    );
  if (gradient) {
    const angle = (Number(gradient[1]) * Math.PI) / 180;
    const cx = POSTER_W / 2;
    const cy = POSTER_H / 2;
    const len = Math.sqrt(POSTER_W * POSTER_W + POSTER_H * POSTER_H) / 2;
    const x = Math.cos(angle) * len;
    const y = Math.sin(angle) * len;
    const g = ctx.createLinearGradient(cx - x, cy - y, cx + x, cy + y);
    g.addColorStop(0, gradient[2].trim());
    g.addColorStop(1, gradient[3].trim());
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = background;
  }
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
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
): Promise<HTMLCanvasElement> {
  const imgs = await preloadImages(blocks);
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W * scale;
  canvas.height = POSTER_H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  paintBackground(ctx, palette.background);

  for (const b of blocks) {
    if (b.type === "image") {
      const ib = b as ImageBlock;
      const img = ib.src ? imgs.get(ib.src) : null;
      if (img) {
        ctx.drawImage(img, ib.x, ib.y, ib.w, ib.h);
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

export async function renderPosterToSVG(blocks: Block[], palette: Palette): Promise<string> {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${POSTER_W}" height="${POSTER_H}" viewBox="0 0 ${POSTER_W} ${POSTER_H}">`,
  );
  if (palette.background.startsWith("linear-gradient")) {
    const colors = palette.background.match(/#[\da-fA-F]{6}|rgba?\([^)]*\)/g) ?? [
      "#f7f2e4",
      "#d7c7a6",
    ];
    parts.push(
      `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${colors[0]}"/><stop offset="100%" stop-color="${colors[1] ?? colors[0]}"/></linearGradient></defs>`,
    );
    parts.push(`<rect width="${POSTER_W}" height="${POSTER_H}" fill="url(#bg)"/>`);
  } else if (
    palette.background &&
    palette.background !== "rgba(0,0,0,0)" &&
    palette.background !== "transparent"
  ) {
    parts.push(`<rect width="${POSTER_W}" height="${POSTER_H}" fill="${palette.background}"/>`);
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
  return (name || "poster").replace(/[\\/:*?"<>|\n\r\t]/g, "_").trim().slice(0, 60);
}

export async function exportPng(
  blocks: Block[],
  palette: Palette,
  transparent: boolean,
  name?: string,
) {
  const canvas = await renderPosterToCanvas(
    blocks,
    transparent ? { ...palette, background: "rgba(0,0,0,0)" } : palette,
    3,
  );
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${cleanName(name)}.png`);
      resolve();
    }, "image/png");
  });
}

export async function exportJpg(blocks: Block[], palette: Palette, name?: string) {
  const canvas = await renderPosterToCanvas(blocks, palette, 3);
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

// ── Editable (vector) PDF export ───────────────────────────────────────────
// A3 page in mm and the poster→page transforms.
const A3_W_MM = 297;
const A3_H_MM = 420;
const MM_X = A3_W_MM / POSTER_W;
const MM_Y = A3_H_MM / POSTER_H;
const PT_PER_MM = 2.834645669;

// Real fonts used by the poster (matching the on-screen Google webfonts), as
// jsPDF-compatible TrueType. jsPDF subsets these in the output so files stay
// small; we cache the ~23 MB of source fonts in IndexedDB so they download
// only once, ever.
const FONT_SOURCES: Record<string, string> = {
  NotoSans: "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/google-fonts/NotoSansSC%5Bwght%5D.ttf",
  ZCOOL: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf",
};

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

// ── font cache (IndexedDB) ──
const FONT_DB = "banrihua-fonts";
const FONT_STORE = "ttf";
function fontDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FONT_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(FONT_STORE)) req.result.createObjectStore(FONT_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function fontCacheGet(key: string): Promise<string | null> {
  try {
    const db = await fontDb();
    return await new Promise((resolve) => {
      const r = db.transaction(FONT_STORE, "readonly").objectStore(FONT_STORE).get(key);
      r.onsuccess = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
async function fontCachePut(key: string, val: string): Promise<void> {
  try {
    const db = await fontDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(FONT_STORE, "readwrite");
      tx.objectStore(FONT_STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

const fontMem = new Map<string, Promise<string>>();
async function loadFontB64(name: string): Promise<string> {
  let p = fontMem.get(name);
  if (!p) {
    p = (async () => {
      const cached = await fontCacheGet(name);
      if (cached) return cached;
      const res = await fetch(FONT_SOURCES[name]);
      if (!res.ok) throw new Error(`font ${name} ${res.status}`);
      const b64 = arrayBufferToBase64(await res.arrayBuffer());
      void fontCachePut(name, b64);
      return b64;
    })().catch((e) => {
      fontMem.delete(name);
      throw e;
    });
    fontMem.set(name, p);
  }
  return p;
}

const CJK_RE = /[㐀-鿿豈-﫿]/;

// Measure the exact visual line breaks the browser produces for a text block,
// so the PDF layout matches the screen (which uses a DOM div with pre-wrap).
function measureVisualLines(t: TextBlock): string[] {
  if (typeof document === "undefined") return t.text.split("\n");
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    left: "-99999px",
    top: "0",
    visibility: "hidden",
    width: `${t.w}px`,
    fontFamily: FONT_FAMILY[t.fontFamily ?? "sans"],
    fontSize: `${t.fontSize}px`,
    fontWeight: String(t.fontWeight ?? 400),
    fontStyle: t.fontStyle ?? "normal",
    lineHeight: String(t.lineHeight ?? 1.4),
    letterSpacing: t.letterSpacing ? `${t.letterSpacing}px` : "normal",
    textTransform: t.textTransform ?? "none",
    whiteSpace: "pre-wrap",
    wordBreak: "normal",
  } as CSSStyleDeclaration);
  const raw = t.textTransform === "uppercase" ? t.text : t.text; // CSS handles transform for measuring
  div.textContent = raw;
  document.body.appendChild(div);
  const node = div.firstChild as Text | null;
  const lines: string[] = [];
  if (node) {
    const range = document.createRange();
    const chars = Array.from(t.text);
    let cur = "";
    let prevTop: number | null = null;
    let offset = 0;
    for (const ch of chars) {
      if (ch === "\n") {
        lines.push(cur);
        cur = "";
        prevTop = null;
        offset += ch.length;
        continue;
      }
      try {
        range.setStart(node, offset);
        range.setEnd(node, offset + ch.length);
        const top = range.getBoundingClientRect().top;
        if (prevTop !== null && top - prevTop > 1) {
          lines.push(cur);
          cur = "";
        }
        prevTop = top;
      } catch {
        /* ignore */
      }
      cur += ch;
      offset += ch.length;
    }
    lines.push(cur);
  }
  document.body.removeChild(div);
  return lines.length ? lines : [t.text];
}

// Rasterise an image src at HIGH resolution for crisp export. Renders at
// `scale`× the on-poster block size (~300 DPI on A3), so vector SVG maps come
// out sharp and photos keep the same quality the old full-page raster produced.
// Transparency is preserved (PNG) unless the source is an opaque JPEG, so
// transparent range maps composite over the page background instead of turning
// black. Returns the data URL and the format for jsPDF.addImage.
async function imageToHiResDataUrl(
  src: string,
  targetWpx: number,
  targetHpx: number,
  scale = 3,
): Promise<{ dataUrl: string; fmt: "PNG" | "JPEG" }> {
  const img = await loadImage(src);
  const w = Math.max(1, Math.round((targetWpx || img.naturalWidth) * scale));
  const h = Math.max(1, Math.round((targetHpx || img.naturalHeight) * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  const opaque = /^data:image\/jpe?g/.test(src);
  return opaque
    ? { dataUrl: c.toDataURL("image/jpeg", 0.95), fmt: "JPEG" }
    : { dataUrl: c.toDataURL("image/png"), fmt: "PNG" };
}

// Filesystem-safe base name for exports, derived from page name(s).
function exportBaseName(pages: PosterPage[]): string {
  const clean = (s: string) => (s || "poster").replace(/[\\/:*?"<>|\n\r\t]/g, "_").trim().slice(0, 60);
  if (pages.length === 1) return clean(pages[0].name);
  return `${clean(pages[0].name)}_等${pages.length}页`;
}

// Fallback: the old rasterised export (one flattened image per page).
async function exportPdfRaster(
  pages: PosterPage[],
  palette: Palette,
  mode: "print" | "standard",
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a3" });
  for (let i = 0; i < pages.length; i++) {
    const canvas = await renderPosterToCanvas(pages[i].blocks, palette, mode === "print" ? 3 : 2);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage("a3", "portrait");
    pdf.addImage(dataUrl, "JPEG", 0, 0, A3_W_MM, A3_H_MM);
  }
  pdf.save(`${exportBaseName(pages)}${mode === "print" ? "_print" : ""}.pdf`);
}

// Which embedded/built-in PDF font to use for a text block so it matches the
// on-screen webfont: sans→Noto Sans SC, display→ZCOOL XiaoWei, serif→Noto Sans
// SC when it contains CJK (no CJK serif TTF is jsPDF-embeddable) or the built-in
// Times serif for Latin-only labels (scientific names).
function pdfFontFor(t: TextBlock): string {
  const fam = t.fontFamily ?? "sans";
  if (fam === "display") return "ZCOOL";
  if (fam === "serif") return CJK_RE.test(t.text) ? "NotoSans" : "times";
  return "NotoSans";
}

export async function exportPdf(pages: PosterPage[], palette: Palette, mode: "print" | "standard") {
  try {
    const { jsPDF } = await import("jspdf");
    const [notoSans, zcool] = await Promise.all([loadFontB64("NotoSans"), loadFontB64("ZCOOL")]);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a3" });
    pdf.addFileToVFS("NotoSansSC.ttf", notoSans);
    pdf.addFont("NotoSansSC.ttf", "NotoSans", "normal");
    pdf.addFileToVFS("ZCOOL.ttf", zcool);
    pdf.addFont("ZCOOL.ttf", "ZCOOL", "normal");

    for (let pi = 0; pi < pages.length; pi++) {
      if (pi > 0) pdf.addPage("a3", "portrait");
      const page = pages[pi];

      // Background (solid; gradients approximated by their first colour).
      const bg = page.background ?? palette.background;
      if (bg && bg !== "transparent" && bg !== "rgba(0,0,0,0)") {
        const c = parseRgba(firstColor(bg));
        if (c) {
          pdf.setFillColor(c.r, c.g, c.b);
          pdf.rect(0, 0, A3_W_MM, A3_H_MM, "F");
        }
      }

      for (const b of page.blocks) {
        if (b.type === "image") {
          const ib = b as ImageBlock;
          if (!ib.src) continue;
          try {
            const { dataUrl, fmt } = await imageToHiResDataUrl(
              ib.src,
              ib.w,
              ib.h,
              mode === "print" ? 3.5 : 3,
            );
            pdf.addImage(dataUrl, fmt, ib.x * MM_X, ib.y * MM_Y, ib.w * MM_X, ib.h * MM_Y, undefined, "SLOW");
          } catch {
            /* skip unreadable image */
          }
          continue;
        }

        const t = b as TextBlock;
        if (!t.text) continue;
        const c = parseRgba(t.color) ?? { r: 34, g: 34, b: 34, a: 1 };
        const fontPt = t.fontSize * MM_Y * PT_PER_MM; // exact on-screen size
        pdf.setFont(pdfFontFor(t), "normal");
        pdf.setFontSize(fontPt);
        pdf.setTextColor(c.r, c.g, c.b);
        pdf.setCharSpace(t.letterSpacing ? t.letterSpacing * MM_X : 0);

        // Exact on-screen line breaks (browser pre-wrap) and line spacing.
        const lines = measureVisualLines(t);
        const align = (t.align ?? "left") as "left" | "center" | "right";
        const anchorXpx = align === "center" ? t.x + t.w / 2 : align === "right" ? t.x + t.w : t.x;
        const lineHeightPx = t.fontSize * (t.lineHeight ?? 1.4);
        const leadPx = (lineHeightPx - t.fontSize) / 2; // CSS half-leading

        // Approximate the on-screen weight: the embedded face is a single
        // weight, so simulate heavier weights with a proportional glyph stroke
        // (≈ the screen gradation across 400–900).
        const weight = t.fontWeight ?? 400;
        const strokeMm = weight > 400 ? ((weight - 400) / 300) * 0.03 * fontPt : 0;
        if (strokeMm > 0) {
          pdf.setDrawColor(c.r, c.g, c.b);
          pdf.setLineWidth(strokeMm);
        }
        lines.forEach((line, i) => {
          const text = t.textTransform === "uppercase" ? line.toUpperCase() : line;
          const yTopPx = t.y + i * lineHeightPx + leadPx;
          pdf.text(text, anchorXpx * MM_X, yTopPx * MM_Y, {
            align,
            baseline: "top",
            ...(strokeMm > 0 ? { renderingMode: "fillThenStroke" } : {}),
          });
        });
        if (strokeMm > 0) pdf.setLineWidth(0);
        pdf.setCharSpace(0);
      }
    }

    pdf.save(`${exportBaseName(pages)}${mode === "print" ? "_print" : ""}.pdf`);
  } catch (e) {
    // Any failure (font load, parsing, etc.) → never break export; use raster.
    console.error("vector PDF failed, falling back to raster:", e instanceof Error ? e.message : e);
    await exportPdfRaster(pages, palette, mode);
  }
}

export async function exportSvg(blocks: Block[], palette: Palette, name?: string) {
  const svg = await renderPosterToSVG(blocks, palette);
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
    const bg = parseRgba(firstColor(palette.background));
    slide.background = {
      color: bg
        ? [bg.r, bg.g, bg.b].map((n) => n.toString(16).padStart(2, "0")).join("")
        : "F7F2E4",
    };

    for (const b of page.blocks) {
      if (b.type === "image") {
        if (b.src) {
          try {
            const { dataUrl } = await imageToHiResDataUrl(b.src, b.w, b.h, 3);
            slide.addImage({ data: dataUrl, x: toInX(b.x), y: toInY(b.y), w: toInX(b.w), h: toInY(b.h) });
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
