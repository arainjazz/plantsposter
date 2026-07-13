import fs from "node:fs/promises";

const files = [
  "public/banrihua-editor-20plants.json",
  "banrihua-editor-20plants.json",
  "src/lib/default-plants-ssr.json",
];

const compactCopy = {
  蒙古沙冬青: {
    "trait-1-body": "革质叶密被绒毛，冬季不落。\nLeathery tomentose leaves persist in winter.",
    "trait-2-body": "黄色蝶形花排成总状花序。\nYellow papilionaceous flowers form racemes.",
    "trait-3-body": "扁平密毛荚果，常含1–2粒种子。\nFlattened tomentose pods contain 1–2 seeds.",
    "trait-4-body": "垫状或半球形常绿灌木。\nCushion to hemispherical evergreen shrub.",
  },
  白沙蒿: {
    "trait-1-body": "幼枝和叶密被白绒毛，植株灰白。\nWhite tomentum gives a grey-white cast.",
    "trait-3-body": "小型线形叶，两面被白柔毛。\nSmall linear leaves are white-tomentose.",
  },
  梭梭: {
    "trait-2-body": "鳞片叶贴枝；绿色嫩枝光合作用。\nScale leaves appress stems; green shoots photosynthesize.",
    "trait-3-body": "小胞果具5枚膜质翅，借风传播。\nUtricles bear five membranous wind-dispersal wings.",
    "sec-habitat-body": "生于荒漠沙地、砾地与盐渍土；能耐旱耐盐。\nOccurs on desert sands, gravel and saline soils; drought- and salt-tolerant.",
  },
  革苞菊: {
    "eco-4-v": "耐寒耐旱 · Cold- and drought-hardy",
  },
  文冠果: {
    "trait-3-body": "羽状复叶；9–17枚锐锯齿小叶。\nOdd-pinnate leaves with 9–17 sharply serrated leaflets.",
  },
};

function hasBaseId(block, base) {
  return block.type === "text" && (block.id === base || block.id.startsWith(`${base}-`));
}

for (const file of files) {
  const state = JSON.parse(await fs.readFile(file, "utf8"));
  for (const page of state.pages) {
    for (const block of page.blocks) {
      if (hasBaseId(block, "title-latin")) block.y = 275;
      if (hasBaseId(block, "sec-season-body")) block.y = 240;
      if (hasBaseId(block, "sec-habitat-cap")) block.y = 1365;
      if (hasBaseId(block, "sim-1-body") || hasBaseId(block, "sim-2-body")) block.y = 1515;
      if (/^trait-[1-4]-body(?:-|$)/.test(block.id)) {
        block.fontSize = 8;
        block.lineHeight = 1.25;
      }
      if (/^trait-[34]-title(?:-|$)/.test(block.id)) block.y = 970;
      if (/^trait-[34]-body(?:-|$)/.test(block.id)) block.y = 994;
      for (const [base, text] of Object.entries(compactCopy[page.name] ?? {})) {
        if (hasBaseId(block, base)) block.text = text;
      }
    }
    if (page.name === "鄂尔多斯野丁香") {
      const title = page.blocks.find((block) => hasBaseId(block, "title"));
      if (title) title.fontSize = 60;
    }
  }
  await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`);
}

console.log("Applied collision-safe text spacing to all poster data copies.");
