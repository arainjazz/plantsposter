// Poster is authored in a virtual canvas of 1240 x 1754 (A3 portrait aspect).
// All image blocks default to null (dashed placeholder) so users can drop their
// own art in Canva-style. Use Inspector's upload button to replace any slot.

export const POSTER_W = 1240;
export const POSTER_H = 1754;
export const POSTER_BG = "#f7f2e4";
export const POSTER_INK = "#2a2622";
export const POSTER_ACCENT = "#b0692b";
export const POSTER_MUTED = "#7a6f5f";

export type TextBlock = {
  id: string;
  type: "text";
  x: number; y: number; w: number;
  text: string;
  fontSize: number;
  color: string;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  fontStyle?: "normal" | "italic";
  fontFamily?: "serif" | "sans" | "display" | "kai" | "wenkai" | "mono" | "playfair" | "inter";
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase";
};

export type ImageBlock = {
  id: string;
  type: "image";
  x: number; y: number; w: number; h: number;
  src: string | null;
  label: string;
};

export type Block = TextBlock | ImageBlock;

export type PosterPage = {
  id: string;
  name: string;
  blocks: Block[];
  autoName?: boolean; // if true, title auto-derives from largest text block
};

export const INITIAL_BLOCKS: Block[] = [
  // ── Header ────────────────────────────────────────────────
  { id: "hdr-fam-label", type: "text", x: 60, y: 40, w: 200,
    text: "科 · FAMILY", fontSize: 14, color: POSTER_ACCENT,
    fontWeight: 600, fontFamily: "sans", letterSpacing: 1.5 },
  { id: "hdr-fam-cn", type: "text", x: 60, y: 66, w: 240,
    text: "半日花科", fontSize: 20, color: POSTER_INK,
    fontWeight: 700, fontFamily: "sans" },
  { id: "hdr-fam-en", type: "text", x: 60, y: 92, w: 240,
    text: "Cistaceae", fontSize: 15, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },

  { id: "hdr-title-en", type: "text", x: 420, y: 40, w: 400, align: "center",
    text: "ORDOS PLANTSPEDIA", fontSize: 16, color: POSTER_INK,
    fontWeight: 600, fontFamily: "sans", letterSpacing: 3 },
  { id: "hdr-title-cn", type: "text", x: 420, y: 66, w: 400, align: "center",
    text: "鄂尔多斯植物精选百科", fontSize: 18, color: POSTER_INK,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },

  { id: "hdr-gen-label", type: "text", x: 980, y: 40, w: 200, align: "right",
    text: "属 · GENUS", fontSize: 14, color: POSTER_ACCENT,
    fontWeight: 600, fontFamily: "sans", letterSpacing: 1.5 },
  { id: "hdr-gen-cn", type: "text", x: 940, y: 66, w: 240, align: "right",
    text: "半日花属", fontSize: 20, color: POSTER_INK,
    fontWeight: 700, fontFamily: "sans" },
  { id: "hdr-gen-en", type: "text", x: 940, y: 92, w: 240, align: "right",
    text: "Helianthemum", fontSize: 15, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },

  // ── Big title ─────────────────────────────────────────────
  { id: "title", type: "text", x: 60, y: 150, w: 600,
    text: "半 日 花", fontSize: 84, color: POSTER_INK,
    fontWeight: 700, fontFamily: "display", letterSpacing: 4 },
  { id: "title-latin", type: "text", x: 60, y: 260, w: 600,
    text: "Helianthemum songaricum\nSchrenk ex Fisch. & C.A.Mey.",
    fontSize: 16, color: POSTER_INK, fontWeight: 500,
    fontFamily: "serif", fontStyle: "italic", lineHeight: 1.35 },
  { id: "title-en", type: "text", x: 60, y: 320, w: 600,
    text: "Songar sunrose · Songar rockrose", fontSize: 15,
    color: POSTER_MUTED, fontWeight: 400, fontFamily: "sans" },
  { id: "title-sub", type: "text", x: 60, y: 348, w: 700,
    text: "荒漠砾坡上的黄色残遗小灌木 · A yellow-flowered relict shrub of stony deserts",
    fontSize: 15, color: POSTER_ACCENT, fontWeight: 600, fontFamily: "sans" },

  // ── Main illustration slot ────────────────────────────────
  { id: "img-main", type: "image", x: 60, y: 400, w: 620, h: 640,
    src: null, label: "主图·半日花植株插画" },

  // ── Seasonal rhythm ───────────────────────────────────────
  { id: "sec-season", type: "text", x: 720, y: 160, w: 460,
    text: "SEASONAL RHYTHM · 物 候", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-season-sub", type: "text", x: 720, y: 190, w: 460,
    text: "砾坡一岁  from new shoots to winter cushion", fontSize: 14,
    color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "sec-season-body", type: "text", x: 720, y: 224, w: 460,
    text: "春季萌发枝叶，夏季开黄色单花，随后形成蒴果；寒季保留贴地木质枝。\nShoots develop in spring, flowers open in summer and capsules follow; low woody branches persist through winter.",
    fontSize: 12, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },

  // 4 season images (new)
  { id: "season-img-1", type: "image", x: 720, y: 300, w: 105, h: 78,
    src: null, label: "春·new shoots" },
  { id: "season-img-2", type: "image", x: 835, y: 300, w: 105, h: 78,
    src: null, label: "夏·yellow bloom" },
  { id: "season-img-3", type: "image", x: 950, y: 300, w: 105, h: 78,
    src: null, label: "秋·seed capsule" },
  { id: "season-img-4", type: "image", x: 1065, y: 300, w: 105, h: 78,
    src: null, label: "冬·woody cushion" },

  { id: "season-1-cn", type: "text", x: 720, y: 388, w: 105, align: "center",
    text: "春", fontSize: 20, color: POSTER_INK, fontWeight: 700, fontFamily: "display" },
  { id: "season-1-en", type: "text", x: 720, y: 416, w: 105, align: "center",
    text: "new shoots", fontSize: 11, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },
  { id: "season-2-cn", type: "text", x: 835, y: 388, w: 105, align: "center",
    text: "夏", fontSize: 20, color: POSTER_INK, fontWeight: 700, fontFamily: "display" },
  { id: "season-2-en", type: "text", x: 835, y: 416, w: 105, align: "center",
    text: "yellow bloom", fontSize: 11, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },
  { id: "season-3-cn", type: "text", x: 950, y: 388, w: 105, align: "center",
    text: "秋", fontSize: 20, color: POSTER_INK, fontWeight: 700, fontFamily: "display" },
  { id: "season-3-en", type: "text", x: 950, y: 416, w: 105, align: "center",
    text: "seed capsule", fontSize: 11, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },
  { id: "season-4-cn", type: "text", x: 1065, y: 388, w: 105, align: "center",
    text: "冬", fontSize: 20, color: POSTER_INK, fontWeight: 700, fontFamily: "display" },
  { id: "season-4-en", type: "text", x: 1065, y: 416, w: 105, align: "center",
    text: "woody cushion", fontSize: 11, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },

  // ── Global range ──────────────────────────────────────────
  { id: "sec-range", type: "text", x: 720, y: 460, w: 460,
    text: "GLOBAL RANGE · 全 球 分 布", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-range-sub", type: "text", x: 720, y: 490, w: 460,
    text: "中亚至中国北方的间断荒漠分布  a disjunct Central Asian desert range",
    fontSize: 13, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "img-map", type: "image", x: 720, y: 520, w: 460, h: 220,
    src: null, label: "全球分布图 (GBIF + POWO)" },
  { id: "sec-range-caption", type: "text", x: 720, y: 750, w: 460,
    text: "红点为154个经筛选GBIF记录；黄色为Kew POWO及中国研究支持的粗略原生范围，不是精确边界。",
    fontSize: 11, color: POSTER_MUTED, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },

  // ── Field identification ──────────────────────────────────
  { id: "sec-field", type: "text", x: 720, y: 810, w: 460,
    text: "FIELD IDENTIFICATION · 识 别 手 记", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-field-sub", type: "text", x: 720, y: 840, w: 460,
    text: "四个关键形态  diagnostic traits", fontSize: 13,
    color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },

  // 4 trait images (new) + shifted titles/bodies
  { id: "trait-img-1", type: "image", x: 720, y: 875, w: 60, h: 60,
    src: null, label: "刺状枝端" },
  { id: "trait-1-title", type: "text", x: 790, y: 878, w: 160,
    text: "刺状枝端", fontSize: 14, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "trait-1-body", type: "text", x: 790, y: 902, w: 160,
    text: "密集对生枝以短刺状顶端收束。\nDense branchlets end in a short spine.",
    fontSize: 10, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.4 },

  { id: "trait-img-2", type: "image", x: 960, y: 875, w: 60, h: 60,
    src: null, label: "微小反卷叶" },
  { id: "trait-2-title", type: "text", x: 1030, y: 878, w: 160,
    text: "微小反卷叶", fontSize: 14, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "trait-2-body", type: "text", x: 1030, y: 902, w: 160,
    text: "革质叶仅5–7mm，边缘反卷。\nLeathery leaves 5–7mm, revolute.",
    fontSize: 10, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.4 },

  { id: "trait-img-3", type: "image", x: 720, y: 955, w: 60, h: 60,
    src: null, label: "白色短柔毛" },
  { id: "trait-3-title", type: "text", x: 790, y: 958, w: 160,
    text: "白色短柔毛", fontSize: 14, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "trait-3-body", type: "text", x: 790, y: 982, w: 160,
    text: "幼枝、叶和萼片密被白毛。\nShoots and sepals pale-pubescent.",
    fontSize: 10, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.4 },

  { id: "trait-img-4", type: "image", x: 960, y: 955, w: 60, h: 60,
    src: null, label: "顶生黄色单花" },
  { id: "trait-4-title", type: "text", x: 1030, y: 958, w: 160,
    text: "顶生黄色单花", fontSize: 14, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "trait-4-body", type: "text", x: 1030, y: 982, w: 160,
    text: "花径1–1.2cm，五瓣黄花。\nSolitary yellow flowers c.1–1.2 cm.",
    fontSize: 10, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.4 },

  // ── Description (left column, below main image) ───────────
  { id: "desc-cn", type: "text", x: 60, y: 1060, w: 620,
    text: "矮小垫状灌木，高约5–12 cm；枝密而对生，常以刺状枝端收束。叶革质、边缘反卷并密被白色短柔毛；枝端单生黄色五瓣花。",
    fontSize: 14, color: POSTER_INK, fontWeight: 500, fontFamily: "sans", lineHeight: 1.6 },
  { id: "desc-en", type: "text", x: 60, y: 1128, w: 620,
    text: "A 5–12 cm cushion shrub with dense opposite, spine-tipped branches, tiny leathery revolute leaves and solitary yellow flowers.",
    fontSize: 12, color: POSTER_MUTED, fontWeight: 400, fontFamily: "serif", fontStyle: "italic", lineHeight: 1.55 },

  // ── Important note ────────────────────────────────────────
  { id: "sec-note", type: "text", x: 60, y: 1200, w: 620,
    text: "IMPORTANT NOTE · 重 要 提 示", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-note-sub", type: "text", x: 60, y: 1230, w: 620,
    text: "一组植物，两种分类口径  One plant complex, two taxonomic readings",
    fontSize: 13, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "sec-note-body", type: "text", x: 60, y: 1262, w: 620,
    text: "原始描述以花瓣形状与干后颜色、萼片纵肋和花梗姿态区分两类群；但中国植物志将 H. ordosicum 并入半日花，Kew POWO 仍接受为内蒙古特有种。",
    fontSize: 12, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.55 },

  // ── Similar species (bottom left) with 2 images ───────────
  { id: "sec-sim", type: "text", x: 60, y: 1400, w: 620,
    text: "SIMILAR SPECIES · 相 似 种", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-sim-sub", type: "text", x: 60, y: 1430, w: 620,
    text: "花瓣、萼片纵肋与花梗姿态  petals, sepal ribs & pedicel posture",
    fontSize: 12, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },

  { id: "sim-img-1", type: "image", x: 60, y: 1470, w: 75, h: 95,
    src: null, label: "H. songaricum" },
  { id: "sim-1-title", type: "text", x: 145, y: 1472, w: 210,
    text: "半日花 H. songaricum", fontSize: 12, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "sim-1-body", type: "text", x: 145, y: 1496, w: 210,
    text: "花瓣宽楔形、橘黄色，干后不变色；萼片3条褐色纵肋；花期花梗下弯。",
    fontSize: 10, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },

  { id: "sim-img-2", type: "image", x: 380, y: 1470, w: 75, h: 95,
    src: null, label: "H. ordosicum" },
  { id: "sim-2-title", type: "text", x: 465, y: 1472, w: 210,
    text: "鄂尔多斯半日花 H. ordosicum", fontSize: 12, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "sim-2-body", type: "text", x: 465, y: 1496, w: 210,
    text: "花瓣倒卵形，鲜黄、干后淡粉红；萼片5条绿色纵肋；花期花梗直立。",
    fontSize: 10, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },

  // ── Typical habitat (right col, with 1 image) ──────────────
  { id: "sec-habitat", type: "text", x: 720, y: 1055, w: 460,
    text: "TYPICAL HABITAT · 典 型 生 境", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-habitat-sub", type: "text", x: 720, y: 1085, w: 460,
    text: "荒漠草原的石质山地与砾坡  rocky hills and gravel slopes",
    fontSize: 13, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "img-habitat", type: "image", x: 720, y: 1115, w: 460, h: 165,
    src: null, label: "典型生境·砾坡" },
  { id: "sec-habitat-body", type: "text", x: 720, y: 1290, w: 460,
    text: "常见于海拔1000–1400m的石质山地、坡地和荒漠草原；在西鄂尔多斯可成为独特荒漠群落的建群种。",
    fontSize: 12, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },
  { id: "sec-habitat-cap", type: "text", x: 720, y: 1345, w: 460,
    text: "鄂托克 Otog, Ordos  ·  砾坡 gravel slope  ·  荒漠草原 steppe-desert",
    fontSize: 11, color: POSTER_MUTED, fontWeight: 500, fontFamily: "serif", fontStyle: "italic" },

  // ── Ecology rows (right column) ───────────────────────────
  { id: "eco-1-l", type: "text", x: 720, y: 1385, w: 100,
    text: "LIGHT · 光照", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-1-v", type: "text", x: 840, y: 1385, w: 340,
    text: "开阔地全日照  Full sun / open exposure",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },
  { id: "eco-2-l", type: "text", x: 720, y: 1413, w: 100,
    text: "WATER · 水分", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-2-v", type: "text", x: 840, y: 1413, w: 340,
    text: "极旱少雨  Xeric; low rainfall",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },
  { id: "eco-3-l", type: "text", x: 720, y: 1441, w: 100,
    text: "HABIT · 习性", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-3-v", type: "text", x: 840, y: 1441, w: 340,
    text: "矮小垫状灌木  Dwarf cushion shrub",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },
  { id: "eco-4-l", type: "text", x: 720, y: 1469, w: 100,
    text: "TEMP · 温度", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-4-v", type: "text", x: 840, y: 1469, w: 340,
    text: "温带大陆性干旱  Temperate continental arid",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },
  { id: "eco-5-l", type: "text", x: 720, y: 1497, w: 100,
    text: "SOIL · 土壤", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-5-v", type: "text", x: 840, y: 1497, w: 340,
    text: "石质山地与砾坡  Rocky hills / gravel slopes",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },

  // ── Humanities (bottom, with 1 image) ─────────────────────
  { id: "img-humanities", type: "image", x: 60, y: 1605, w: 300, h: 130,
    src: null, label: "半日花核心区" },
  { id: "sec-hum", type: "text", x: 380, y: 1610, w: 500,
    text: "HUMANITIES · 植 物 人 文", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-hum-sub", type: "text", x: 380, y: 1640, w: 500,
    text: "保护一簇植物，也保护两条荒漠记忆  Conserving two desert lineages",
    fontSize: 12, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "sec-hum-body", type: "text", x: 380, y: 1675, w: 500,
    text: "核心区｜西鄂尔多斯南部设“半日花核心区”，保护完整荒漠群落。\n谱系｜伊犁与西鄂尔多斯种群显著分化，需分别监测。",
    fontSize: 11, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.55 },

  { id: "credit", type: "text", x: 900, y: 1725, w: 300, align: "right",
    text: "Made by REVI studio copilot with AI",
    fontSize: 10, color: POSTER_MUTED, fontWeight: 400,
    fontFamily: "serif", fontStyle: "italic" },
];

export function makeEmptyPage(name: string): PosterPage {
  return {
    id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    autoName: true,
    blocks: [
      {
        id: `blank-title-${Date.now()}`,
        type: "text",
        x: 60, y: 80, w: 1120,
        text: name,
        fontSize: 56, color: POSTER_INK, fontWeight: 700, fontFamily: "display",
      },
    ],
  };
}

export function clonePage(page: PosterPage, name?: string): PosterPage {
  const suffix = Math.random().toString(36).slice(2, 6);
  return {
    id: `page-${Date.now()}-${suffix}`,
    name: name ?? `${page.name} 副本`,
    autoName: page.autoName,
    blocks: page.blocks.map((b) => ({ ...b, id: `${b.id}-c${suffix}` })),
  };
}

// Pick a human-readable name from the visually dominant text block on a page.
export function deriveAutoName(blocks: Block[]): string | null {
  const texts = blocks.filter((b): b is TextBlock => b.type === "text" && !!b.text?.trim());
  if (!texts.length) return null;
  const top = [...texts].sort((a, b) => b.fontSize - a.fontSize)[0];
  const first = top.text.split(/\n/)[0].trim().replace(/\s+/g, "").slice(0, 14);
  return first || null;
}

export function blockPatch(blocks: Block[], id: string, patch: Partial<Block>): Block[] {
  return blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b));
}
