import { readFileSync, writeFileSync } from "node:fs";

const sourceName = "黄柳";
const copyId = "page-huangliu-leaf-flower-fruit-illustration-20260719";
const copyName = "黄柳复制 2";
const mainImage = "/illustrations/huangliu-scientific/main-plant-leaf-flower-fruit.png";
const suffix = "-leaf-flower-fruit";

const defaultJobs = [
  ["public/banrihua-editor-20plants.json", "public/banrihua-editor-20plants.json"],
  ["src/lib/default-plants-ssr.json", "src/lib/default-plants-ssr.json"],
];
const suppliedPaths = process.argv.slice(2);
const jobs = suppliedPaths.length === 0 ? defaultJobs : [[suppliedPaths[0], suppliedPaths[1] ?? suppliedPaths[0]]];

for (const [inputPath, outputPath] of jobs) {
  const state = JSON.parse(readFileSync(inputPath, "utf8"));
  state.pages = state.pages.filter((page) => page.id !== copyId && page.name !== copyName);

  const sourceIndex = state.pages.findIndex((page) => page.name === sourceName);
  if (sourceIndex < 0) throw new Error(`${inputPath}: missing ${sourceName}`);

  const copy = structuredClone(state.pages[sourceIndex]);
  copy.id = copyId;
  copy.name = copyName;
  copy.autoName = false;
  copy.blocks = copy.blocks.map((block) => ({
    ...block,
    id: `${block.id}${suffix}`,
    ...(block.id === "img-main-cf3xm" ? { src: mainImage } : {}),
    ...(block.id === "img-map-cf3xm" || block.id === "img-habitat-cf3xm" ? { src: null } : {}),
  }));

  state.pages.splice(sourceIndex + 1, 0, copy);
  state.activeId = copyId;
  writeFileSync(outputPath, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`${outputPath}: added ${copyName} with only the main scientific illustration`);
}
