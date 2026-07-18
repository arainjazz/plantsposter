import { readFileSync, writeFileSync } from "node:fs";

const pageId = "page-huangliu-leaf-flower-fruit-illustration-20260719";
const suffix = "-leaf-flower-fruit";
const root = "/illustrations/huangliu-scientific/details";
const assets = {
  [`season-img-1-cf3xm${suffix}`]: `${root}/season-spring.png`,
  [`season-img-2-cf3xm${suffix}`]: `${root}/season-summer.png`,
  [`season-img-3-cf3xm${suffix}`]: `${root}/season-autumn.png`,
  [`season-img-4-cf3xm${suffix}`]: `${root}/season-winter.png`,
  [`trait-img-1-cf3xm${suffix}`]: `${root}/trait-twigs.png`,
  [`trait-img-2-cf3xm${suffix}`]: `${root}/trait-leaves.png`,
  [`trait-img-3-cf3xm${suffix}`]: `${root}/trait-catkins.png`,
  [`trait-img-4-cf3xm${suffix}`]: `${root}/trait-fruit.png`,
  [`sim-img-1-cf3xm${suffix}`]: `${root}/sim-gordejevii.png`,
  [`sim-img-2-cf3xm${suffix}`]: `${root}/sim-microstachya.png`,
  [`img-humanities-cf3xm${suffix}`]: `${root}/humanities-restoration.png`,
};
const excluded = new Set([
  `img-map-cf3xm${suffix}`,
  `img-habitat-cf3xm${suffix}`,
]);

const defaults = [
  ["public/banrihua-editor-20plants.json", "public/banrihua-editor-20plants.json"],
  ["src/lib/default-plants-ssr.json", "src/lib/default-plants-ssr.json"],
];
const supplied = process.argv.slice(2);
const jobs = supplied.length === 0 ? defaults : [[supplied[0], supplied[1] ?? supplied[0]]];

for (const [inputPath, outputPath] of jobs) {
  const state = JSON.parse(readFileSync(inputPath, "utf8"));
  const page = state.pages.find((item) => item.id === pageId);
  if (!page) throw new Error(`${inputPath}: missing 黄柳复制 2`);

  const available = new Set(page.blocks.map((block) => block.id));
  for (const id of Object.keys(assets)) {
    if (!available.has(id)) throw new Error(`${inputPath}: missing image slot ${id}`);
  }

  page.blocks = page.blocks.map((block) => ({
    ...block,
    ...(assets[block.id] ? { src: assets[block.id] } : {}),
    ...(excluded.has(block.id) ? { src: null } : {}),
  }));
  writeFileSync(outputPath, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`${outputPath}: filled ${Object.keys(assets).length} 黄柳复制 2 illustration slots`);
}
