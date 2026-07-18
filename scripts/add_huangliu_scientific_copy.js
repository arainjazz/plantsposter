import { readFileSync, writeFileSync } from "node:fs";

const files = ["public/banrihua-editor-20plants.json", "src/lib/default-plants-ssr.json"];
const sourceName = "黄柳";
const copyId = "page-huangliu-scientific-illustration-20260719";
const copyName = "黄柳复制";

const removedBlockIds = new Set([
  "sec-range-cf3xm",
  "sec-range-sub-cf3xm",
  "img-map-cf3xm",
  "sec-range-caption-cf3xm",
  "sec-habitat-cf3xm",
  "sec-habitat-sub-cf3xm",
  "img-habitat-cf3xm",
  "sec-habitat-body-cf3xm",
  "eco-1-l-cf3xm",
  "eco-1-v-cf3xm",
  "eco-2-l-cf3xm",
  "eco-2-v-cf3xm",
  "eco-3-l-cf3xm",
  "eco-3-v-cf3xm",
  "eco-4-l-cf3xm",
  "eco-4-v-cf3xm",
  "eco-5-l-cf3xm",
  "eco-5-v-cf3xm",
]);

const fieldBlockIds = new Set([
  "sec-field-cf3xm",
  "sec-field-sub-cf3xm",
  "trait-img-1-cf3xm",
  "trait-1-title-cf3xm",
  "trait-1-body-cf3xm",
  "trait-img-2-cf3xm",
  "trait-2-title-cf3xm",
  "trait-2-body-cf3xm",
  "trait-img-3-cf3xm",
  "trait-3-title-cf3xm",
  "trait-3-body-cf3xm",
  "trait-img-4-cf3xm",
  "trait-4-title-cf3xm",
  "trait-4-body-cf3xm",
]);

for (const file of files) {
  const state = JSON.parse(readFileSync(file, "utf8"));
  const sourceIndex = state.pages.findIndex((page) => page.name === sourceName);
  if (sourceIndex < 0) throw new Error(`${file}: missing ${sourceName}`);

  state.pages = state.pages.filter((page) => page.id !== copyId && page.name !== copyName);
  const refreshedSourceIndex = state.pages.findIndex((page) => page.name === sourceName);
  const source = state.pages[refreshedSourceIndex];
  const copy = structuredClone(source);

  copy.id = copyId;
  copy.name = copyName;
  copy.autoName = false;
  copy.blocks = copy.blocks
    .filter((block) => !removedBlockIds.has(block.id))
    .map((block) => ({
      ...block,
      id: `${block.id}-img2copy`,
      ...(block.id === "img-main-cf3xm"
        ? { src: "/illustrations/huangliu-scientific/main-plant.png" }
        : {}),
      ...(fieldBlockIds.has(block.id) ? { y: block.y - 350 } : {}),
    }));

  state.pages.splice(refreshedSourceIndex + 1, 0, copy);
  state.activeId = copyId;
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`${file}: added ${copyName} with a transparent scientific main illustration`);
}
