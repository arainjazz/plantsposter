import { readFileSync, writeFileSync } from "node:fs";

const FILES = ["public/banrihua-editor-20plants.json", "src/lib/default-plants-ssr.json"];

const COPY_ID = "page-korshinskii-scientific-illustration-20260716";
const COPY_NAME = "柠条锦鸡儿复制";
const SOURCE_NAME = "柠条锦鸡儿";

const IMAGE_PATHS = {
  "img-main-c1cw1": "/illustrations/korshinskii-scientific/main-plant.png",
  "season-img-1-c1cw1": "/illustrations/korshinskii-scientific/season-spring.png",
  "season-img-2-c1cw1": "/illustrations/korshinskii-scientific/season-summer.png",
  "season-img-3-c1cw1": "/illustrations/korshinskii-scientific/season-autumn.png",
  "season-img-4-c1cw1": "/illustrations/korshinskii-scientific/season-winter.png",
  "trait-img-1-c1cw1": "/illustrations/korshinskii-scientific/trait-leaf.png",
  "trait-img-2-c1cw1": "/illustrations/korshinskii-scientific/trait-flower.png",
  "trait-img-3-c1cw1": "/illustrations/korshinskii-scientific/trait-pod.png",
  "trait-img-4-c1cw1": "/illustrations/korshinskii-scientific/trait-branch.png",
  "sim-img-1-c1cw1": "/illustrations/korshinskii-scientific/similar-microphylla.png",
  "sim-img-2-c1cw1": "/illustrations/korshinskii-scientific/similar-truncata.png",
  "img-habitat-c1cw1": "/illustrations/korshinskii-scientific/habitat.png",
  "img-humanities-c1cw1": "/illustrations/korshinskii-scientific/humanities.png",
};

for (const file of FILES) {
  const state = JSON.parse(readFileSync(file, "utf8"));
  const sourceIndex = state.pages.findIndex((page) => page.name === SOURCE_NAME);
  if (sourceIndex < 0) throw new Error(`${file}: missing ${SOURCE_NAME}`);

  state.pages = state.pages.filter((page) => page.id !== COPY_ID && page.name !== COPY_NAME);
  const refreshedSourceIndex = state.pages.findIndex((page) => page.name === SOURCE_NAME);
  const source = state.pages[refreshedSourceIndex];
  const copy = structuredClone(source);
  copy.id = COPY_ID;
  copy.name = COPY_NAME;
  copy.autoName = false;
  copy.blocks = copy.blocks.map((block) => {
    const originalId = block.id;
    return {
      ...block,
      id: `${originalId}-img2copy`,
      ...(IMAGE_PATHS[originalId] ? { src: IMAGE_PATHS[originalId] } : {}),
    };
  });

  state.pages.splice(refreshedSourceIndex + 1, 0, copy);
  state.activeId = COPY_ID;
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
  console.log(
    `${file}: added ${COPY_NAME} with ${Object.keys(IMAGE_PATHS).length} generated images`,
  );
}
