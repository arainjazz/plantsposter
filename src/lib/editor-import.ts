import type { Block, PosterPage } from "@/lib/poster-data";
import { POSTER_ACCENT, POSTER_INK, POSTER_MUTED } from "@/lib/poster-data";

export type ImportResult = {
  page: PosterPage;
  message: string;
};

const textBase = {
  type: "text" as const,
  color: POSTER_INK,
  fontWeight: 400 as const,
  fontFamily: "sans" as const,
  lineHeight: 1.45,
};

export async function importDocumentAsPage(file: File): Promise<ImportResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html" || ext === "htm") return importHtml(file);
  if (ext === "pdf" || ext === "pptx") return importBinaryDocument(file, ext.toUpperCase());
  throw new Error("请选择 PDF、PPTX、HTML，或半日花 JSON 保存文件");
}

async function importHtml(file: File): Promise<ImportResult> {
  const html = await file.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = clean(doc.querySelector("h1")?.textContent || doc.title || file.name).slice(0, 60);
  const bodyText = Array.from(doc.body.querySelectorAll("h1,h2,h3,p,li,blockquote"))
    .map((el) => clean(el.textContent || ""))
    .filter(Boolean)
    .slice(0, 36)
    .join("\n");
  const now = Date.now();
  const blocks: Block[] = [
    { id: `import-title-${now}`, ...textBase, x: 72, y: 72, w: 850, text: title || file.name, fontSize: 46, fontWeight: 700, fontFamily: "display" },
    { id: `import-meta-${now}`, ...textBase, x: 72, y: 142, w: 850, text: `HTML 导入 · ${file.name}`, fontSize: 15, color: POSTER_ACCENT, fontWeight: 700, letterSpacing: 1.2 },
    { id: `import-body-${now}`, ...textBase, x: 72, y: 205, w: 960, text: bodyText || "HTML 文件没有可导入的正文文本。", fontSize: 22, lineHeight: 1.55 },
    { id: `import-note-${now}`, ...textBase, x: 72, y: 1650, w: 950, text: "导入后可双击文字直接编辑，或用 AI Agent 继续排版。", fontSize: 14, color: POSTER_MUTED },
  ];
  return {
    page: { id: `page-import-${now}`, name: `导入·${title || file.name}`, blocks, autoName: false },
    message: "HTML 已导入为可编辑文字页面。",
  };
}

async function importBinaryDocument(file: File, kind: string): Promise<ImportResult> {
  const now = Date.now();
  const size = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  const blocks: Block[] = [
    { id: `import-doc-title-${now}`, ...textBase, x: 72, y: 80, w: 900, text: `${kind} 文件导入`, fontSize: 54, fontWeight: 700, fontFamily: "display" },
    { id: `import-doc-name-${now}`, ...textBase, x: 72, y: 175, w: 900, text: file.name, fontSize: 24, fontWeight: 700, color: POSTER_ACCENT },
    { id: `import-doc-info-${now}`, ...textBase, x: 72, y: 230, w: 900, text: `文件大小：${size}\n导入时间：${new Date().toLocaleString()}\n\n已创建为本地导入页面。PDF / PPTX 的原始版式解析需要浏览器外部转换；你可以继续把关键内容复制进页面，或导入 HTML 版本获得可编辑文本。`, fontSize: 22, lineHeight: 1.55 },
    { id: `import-doc-bg-${now}`, type: "image", x: 72, y: 410, w: 960, h: 600, src: null, label: `${kind} 内容占位槽` },
    { id: `import-doc-footer-${now}`, ...textBase, x: 72, y: 1650, w: 960, text: "建议：将 PDF/PPTX 转为 HTML 后导入，可获得更好的文本拆分与再编辑效果。", fontSize: 14, color: POSTER_MUTED },
  ];
  return {
    page: { id: `page-import-${now}`, name: `导入·${file.name}`, blocks, autoName: false },
    message: `${kind} 已添加为导入页面。`,
  };
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
