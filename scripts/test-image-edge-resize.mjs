import { readFile } from "node:fs/promises";
import puppeteer from "puppeteer";

const state = JSON.parse(await readFile("public/banrihua-editor-20plants.json", "utf8"));
const posterPage = state.pages.find((page) => page.name === "鄂尔多斯蒿 · 科学插图版");
const imageBlock = posterPage?.blocks.find(
  (block) =>
    block.type === "image" && (block.id === "img-main" || block.id.startsWith("img-main-")),
);

if (!posterPage || !imageBlock) throw new Error("Image resize test fixture was not found");

const baseUrl = process.env.IMAGE_RESIZE_BASE_URL ?? "http://127.0.0.1:8081";
const cases = [
  { handle: "n", dx: 0, dy: -28, grows: "height", moves: "top" },
  { handle: "e", dx: 28, dy: 0, grows: "width" },
  { handle: "s", dx: 0, dy: 28, grows: "height" },
  { handle: "w", dx: -28, dy: 0, grows: "width", moves: "left" },
];

const browser = await puppeteer.launch({ headless: true });
const results = [];

try {
  for (const testCase of cases) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1600, height: 1100, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}/${encodeURIComponent(posterPage.name)}`, {
      waitUntil: "networkidle0",
    });

    const blockSelector = `[data-block-id="${imageBlock.id}"]`;
    await page.waitForSelector(blockSelector);
    const image = await page.$(`${blockSelector} > :first-child`);
    if (!image) throw new Error(`Image element not found for ${testCase.handle}`);
    await image.click();

    const handleSelector = `${blockSelector} [data-resize-handle="${testCase.handle}"]`;
    await page.waitForSelector(handleSelector);

    const measure = () =>
      page.$eval(`${blockSelector} > :first-child`, (element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      });

    const before = await measure();
    const handle = await page.$(handleSelector);
    const handleRect = await handle?.boundingBox();
    if (!handleRect) throw new Error(`Resize handle not measurable: ${testCase.handle}`);

    const startX = handleRect.x + handleRect.width / 2;
    const startY = handleRect.y + handleRect.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + testCase.dx, startY + testCase.dy, { steps: 5 });
    await page.mouse.up();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const after = await measure();
    const sizeDelta = after[testCase.grows] - before[testCase.grows];
    if (sizeDelta < 20) {
      throw new Error(
        `${testCase.handle} edge did not expand: ${JSON.stringify({ before, after })}`,
      );
    }
    if (testCase.moves && after[testCase.moves] >= before[testCase.moves] - 20) {
      throw new Error(
        `${testCase.handle} edge did not move outward: ${JSON.stringify({ before, after })}`,
      );
    }

    results.push({ handle: testCase.handle, sizeDelta: Math.round(sizeDelta) });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
