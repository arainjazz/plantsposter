// Poster is authored in a virtual canvas of 1240 x 1754 (A3 portrait aspect).
// Blocks are positioned in that space and scaled to the on-screen canvas.
export const POSTER_W = 1240;
export const POSTER_H = 1754;
export const POSTER_BG = "#f7f2e4";
export const POSTER_INK = "#2a2622";
export const POSTER_ACCENT = "#b0692b"; // warm ochre for section labels
export const POSTER_MUTED = "#7a6f5f";

export type TextBlock = {
  id: string;
  type: "text";
  x: number; // px in virtual canvas
  y: number;
  w: number;
  text: string;
  fontSize: number; // px in virtual canvas
  color: string;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  fontStyle?: "normal" | "italic";
  fontFamily?: "serif" | "sans" | "display";
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number; // px
  textTransform?: "none" | "uppercase";
};

export type ImageBlock = {
  id: string;
  type: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  src: string | null;
  label: string; // placeholder label if src is null
};

export type Block = TextBlock | ImageBlock;

// Positions eyeballed from the Canva reference PNG.
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
    text: "春季萌发枝叶，夏季开黄色单花，随后形成蒴果；寒季保留贴地木质枝。具体时间随地区与年景变化。\nShoots develop in spring, flowers open in summer and capsules follow; low woody branches persist through winter.",
    fontSize: 13, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.55 },

  { id: "season-1-cn", type: "text", x: 720, y: 340, w: 90, align: "center",
    text: "春", fontSize: 22, color: POSTER_INK, fontWeight: 700, fontFamily: "display" },
  { id: "season-1-en", type: "text", x: 720, y: 372, w: 90, align: "center",
    text: "new shoots", fontSize: 12, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },
  { id: "season-2-cn", type: "text", x: 830, y: 340, w: 90, align: "center",
    text: "夏", fontSize: 22, color: POSTER_INK, fontWeight: 700, fontFamily: "display" },
  { id: "season-2-en", type: "text", x: 830, y: 372, w: 90, align: "center",
    text: "yellow bloom", fontSize: 12, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },
  { id: "season-3-cn", type: "text", x: 940, y: 340, w: 90, align: "center",
    text: "秋", fontSize: 22, color: POSTER_INK, fontWeight: 700, fontFamily: "display" },
  { id: "season-3-en", type: "text", x: 940, y: 372, w: 90, align: "center",
    text: "seed capsule", fontSize: 12, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },
  { id: "season-4-cn", type: "text", x: 1050, y: 340, w: 90, align: "center",
    text: "冬", fontSize: 22, color: POSTER_INK, fontWeight: 700, fontFamily: "display" },
  { id: "season-4-en", type: "text", x: 1050, y: 372, w: 90, align: "center",
    text: "woody cushion", fontSize: 12, color: POSTER_MUTED,
    fontWeight: 400, fontFamily: "serif", fontStyle: "italic" },

  // ── Global range ──────────────────────────────────────────
  { id: "sec-range", type: "text", x: 720, y: 440, w: 460,
    text: "GLOBAL RANGE · 全 球 分 布", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-range-sub", type: "text", x: 720, y: 470, w: 460,
    text: "中亚至中国北方的间断荒漠分布  a disjunct Central Asian desert range",
    fontSize: 13, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "img-map", type: "image", x: 720, y: 500, w: 460, h: 260,
    src: null, label: "全球分布图 (GBIF + POWO)" },
  { id: "sec-range-caption", type: "text", x: 720, y: 770, w: 460,
    text: "红点为154个经筛选GBIF记录；黄色为Kew POWO及中国研究支持的粗略原生范围，不是精确边界。\nRed: 154 filtered GBIF records. Yellow: coarse native range from Kew POWO and Chinese studies; not an exact boundary.",
    fontSize: 11, color: POSTER_MUTED, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },

  // ── Field identification ──────────────────────────────────
  { id: "sec-field", type: "text", x: 720, y: 860, w: 460,
    text: "FIELD IDENTIFICATION · 识 别 手 记", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-field-sub", type: "text", x: 720, y: 890, w: 460,
    text: "四个关键形态  diagnostic traits", fontSize: 13,
    color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },

  { id: "trait-1-title", type: "text", x: 720, y: 930, w: 220,
    text: "刺状枝端", fontSize: 15, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "trait-1-body", type: "text", x: 720, y: 955, w: 220,
    text: "密集对生枝常以短刺状顶端收束。\nDense opposite branchlets often end in a short spine.",
    fontSize: 11, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },
  { id: "trait-2-title", type: "text", x: 960, y: 930, w: 220,
    text: "微小反卷叶", fontSize: 15, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "trait-2-body", type: "text", x: 960, y: 955, w: 220,
    text: "叶多仅5–7 mm，革质，全缘而边缘反卷。\nTiny 5–7 mm leathery leaves with rolled margins.",
    fontSize: 11, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },
  { id: "trait-3-title", type: "text", x: 720, y: 1020, w: 220,
    text: "白色短柔毛", fontSize: 15, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "trait-3-body", type: "text", x: 720, y: 1045, w: 220,
    text: "幼枝、叶片和萼片密被白毛。\nYoung shoots, leaves and sepals are pale-pubescent.",
    fontSize: 11, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },
  { id: "trait-4-title", type: "text", x: 960, y: 1020, w: 220,
    text: "顶生黄色单花", fontSize: 15, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "trait-4-body", type: "text", x: 960, y: 1045, w: 220,
    text: "花径约1–1.2 cm，五瓣，黄色至橙黄色。\nSolitary terminal flowers, c.1–1.2 cm wide.",
    fontSize: 11, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },

  // ── Description (left column, below main image) ───────────
  { id: "desc-cn", type: "text", x: 60, y: 1080, w: 620,
    text: "矮小垫状灌木，高约5–12 cm；枝密而对生，常以刺状枝端收束。叶革质、边缘反卷并密被白色短柔毛；枝端单生黄色五瓣花。",
    fontSize: 14, color: POSTER_INK, fontWeight: 500, fontFamily: "sans", lineHeight: 1.6 },
  { id: "desc-en", type: "text", x: 60, y: 1148, w: 620,
    text: "A 5–12 cm cushion shrub with dense opposite, spine-tipped branches, tiny leathery revolute leaves and solitary yellow flowers.",
    fontSize: 12, color: POSTER_MUTED, fontWeight: 400, fontFamily: "serif", fontStyle: "italic", lineHeight: 1.55 },

  // ── Important note ────────────────────────────────────────
  { id: "sec-note", type: "text", x: 60, y: 1220, w: 620,
    text: "IMPORTANT NOTE · 重 要 提 示", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-note-sub", type: "text", x: 60, y: 1250, w: 620,
    text: "一组植物，两种分类口径  One plant complex, two taxonomic readings",
    fontSize: 13, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "sec-note-body", type: "text", x: 60, y: 1284, w: 620,
    text: "原始描述以花瓣形状与干后颜色、萼片纵肋和花梗姿态区分两类群；但中国植物志将 H. ordosicum 并入半日花，Kew POWO仍接受为内蒙古特有种。\nThe original diagnosis separates them by petals, sepal ribs and pedicel posture; Flora of China merges H. ordosicum, while Kew POWO accepts it.",
    fontSize: 12, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.55 },

  // ── Similar species (bottom left) ─────────────────────────
  { id: "sec-sim", type: "text", x: 60, y: 1440, w: 620,
    text: "SIMILAR SPECIES · 相 似 种", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-sim-sub", type: "text", x: 60, y: 1470, w: 620,
    text: "花瓣、萼片纵肋与花梗姿态  petals, sepal ribs & pedicel posture",
    fontSize: 12, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "sim-1-title", type: "text", x: 60, y: 1520, w: 300,
    text: "半日花 H. songaricum", fontSize: 13, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "sim-1-body", type: "text", x: 60, y: 1545, w: 300,
    text: "新疆原型：花瓣宽楔形、橘黄色，干后不变色；萼片3条褐色纵肋；花期花梗下弯。\nXinjiang type: broad-cuneate orange-yellow petals; 3 brown sepal ribs; pedicel bends down.",
    fontSize: 10, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },
  { id: "sim-2-title", type: "text", x: 380, y: 1520, w: 300,
    text: "鄂尔多斯半日花 H. ordosicum", fontSize: 13, color: POSTER_INK, fontWeight: 700, fontFamily: "sans" },
  { id: "sim-2-body", type: "text", x: 380, y: 1545, w: 300,
    text: "花瓣倒卵形，鲜黄、干后淡粉红；萼片5条绿色纵肋；花期花梗直立。\nObovate yellow petals fading pale pink when dry; 5 green ribs; pedicel erect.",
    fontSize: 10, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.5 },

  // ── Typical habitat (middle bottom) ───────────────────────
  { id: "sec-habitat", type: "text", x: 720, y: 1100, w: 460,
    text: "TYPICAL HABITAT · 典 型 生 境", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-habitat-sub", type: "text", x: 720, y: 1130, w: 460,
    text: "荒漠草原的石质山地与砾坡  rocky hills and gravel slopes",
    fontSize: 13, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "sec-habitat-body", type: "text", x: 720, y: 1170, w: 460,
    text: "常见于海拔1000–1400 m的石质山地、坡地和荒漠草原；在西鄂尔多斯可成为独特荒漠群落的建群种。\nRocky hills and slopes at 1000–1400 m; locally dominant in a distinctive western-Ordos desert community.",
    fontSize: 12, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.55 },
  { id: "sec-habitat-cap", type: "text", x: 720, y: 1245, w: 460,
    text: "鄂托克 Otog, Ordos  ·  砾坡 gravel slope  ·  荒漠草原 steppe-desert",
    fontSize: 11, color: POSTER_MUTED, fontWeight: 500, fontFamily: "serif", fontStyle: "italic" },

  // ── Ecology rows (right column) ───────────────────────────
  { id: "eco-1-l", type: "text", x: 720, y: 1300, w: 100,
    text: "LIGHT · 光照", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-1-v", type: "text", x: 840, y: 1300, w: 340,
    text: "开阔地全日照  Full sun / open exposure",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },
  { id: "eco-2-l", type: "text", x: 720, y: 1332, w: 100,
    text: "WATER · 水分", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-2-v", type: "text", x: 840, y: 1332, w: 340,
    text: "极旱少雨  Xeric; low rainfall",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },
  { id: "eco-3-l", type: "text", x: 720, y: 1364, w: 100,
    text: "HABIT · 习性", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-3-v", type: "text", x: 840, y: 1364, w: 340,
    text: "矮小垫状灌木  Dwarf cushion shrub",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },
  { id: "eco-4-l", type: "text", x: 720, y: 1396, w: 100,
    text: "TEMP · 温度", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-4-v", type: "text", x: 840, y: 1396, w: 340,
    text: "温带大陆性干旱  Temperate continental arid",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },
  { id: "eco-5-l", type: "text", x: 720, y: 1428, w: 100,
    text: "SOIL · 土壤", fontSize: 12, color: POSTER_ACCENT, fontWeight: 700, fontFamily: "sans" },
  { id: "eco-5-v", type: "text", x: 840, y: 1428, w: 340,
    text: "石质山地与砾坡  Rocky hills / gravel slopes",
    fontSize: 12, color: POSTER_INK, fontWeight: 500, fontFamily: "sans" },

  // ── Humanities (bottom) ───────────────────────────────────
  { id: "sec-hum", type: "text", x: 380, y: 1615, w: 500,
    text: "HUMANITIES · 植 物 人 文", fontSize: 15, color: POSTER_ACCENT,
    fontWeight: 700, fontFamily: "sans", letterSpacing: 2 },
  { id: "sec-hum-sub", type: "text", x: 380, y: 1645, w: 500,
    text: "保护一簇植物，也保护两条荒漠记忆  Conserving two desert lineages",
    fontSize: 12, color: POSTER_INK, fontWeight: 600, fontFamily: "sans" },
  { id: "sec-hum-body", type: "text", x: 380, y: 1682, w: 500,
    text: "核心区｜西鄂尔多斯南部设“半日花核心区”。CORE ZONE｜A core zone protects its desert community.\n谱系｜伊犁与西鄂尔多斯种群显著分化。LINEAGES｜Both regional lineages need distinct monitoring.",
    fontSize: 11, color: POSTER_INK, fontWeight: 400, fontFamily: "sans", lineHeight: 1.55 },

  { id: "credit", type: "text", x: 900, y: 1720, w: 300, align: "right",
    text: "Made by REVI studio copilot with AI",
    fontSize: 10, color: POSTER_MUTED, fontWeight: 400,
    fontFamily: "serif", fontStyle: "italic" },
];

export function blockPatch(blocks: Block[], id: string, patch: Partial<Block>): Block[] {
  return blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b));
}
