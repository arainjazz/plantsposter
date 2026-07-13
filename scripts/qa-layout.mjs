import fs from "node:fs/promises";
import puppeteer from "puppeteer";

const state = JSON.parse(await fs.readFile("public/banrihua-editor-20plants.json", "utf8"));
const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:8081";
const cachePath = process.env.QA_CACHE_PATH ?? ".layout-audit-cache.json";
let cached = [];
try {
  cached = JSON.parse(await fs.readFile(cachePath, "utf8"));
} catch {
  // First QA pass.
}
const checked = new Map(cached.map((entry) => [entry.page, entry]));
const limit = Number.parseInt(process.argv[2] ?? "5", 10);
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1100, deviceScaleFactor: 1 });
let processed = 0;

for (const posterPage of state.pages) {
  if (checked.has(posterPage.name) || processed >= limit) continue;
  await page.goto(`${baseUrl}/${encodeURIComponent(posterPage.name)}`, { waitUntil: "networkidle0" });
  await new Promise((resolve) => setTimeout(resolve, 300));
  const measurements = await page.evaluate((blocks) => {
    const scaled = [...document.querySelectorAll("div")].find(
      (el) => el.style.width === "1240px" && el.style.height === "1754px" && el.style.transform.startsWith("scale"),
    );
    if (!scaled) throw new Error("poster canvas not found");
    const scale = Number(scaled.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? 1);
    const children = [...scaled.children].slice(0, blocks.length);
    return children.map((el, index) => {
      const child = el.firstElementChild;
      const rect = child.getBoundingClientRect();
      const base = scaled.getBoundingClientRect();
      return {
        id: blocks[index].id,
        type: blocks[index].type,
        x: (rect.left - base.left) / scale,
        y: (rect.top - base.top) / scale,
        w: rect.width / scale,
        h: rect.height / scale,
        expectedX: blocks[index].x,
        expectedY: blocks[index].y,
      };
    });
  }, posterPage.blocks);
  const texts = measurements.filter((m) => m.type === "text");
  const collisions = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      if (overlapX > 12 && overlapY > 3) collisions.push({ a: a.id, b: b.id, overlapX, overlapY });
    }
  }
  const outOfCanvas = measurements.filter((m) => m.y + m.h > 1754 || m.x + m.w > 1240);
  checked.set(posterPage.name, { page: posterPage.name, collisions, outOfCanvas, measurements });
  processed += 1;
  await fs.writeFile(cachePath, `${JSON.stringify([...checked.values()], null, 2)}\n`);
}

await browser.close();
if (checked.size < state.pages.length) {
  console.log(`Layout cache ${checked.size}/${state.pages.length}; run again to continue.`);
  process.exit(0);
}
const result = state.pages.map((posterPage) => checked.get(posterPage.name));
await fs.writeFile(process.env.QA_OUTPUT_PATH ?? "layout-audit-2026-07-13.json", `${JSON.stringify(result, null, 2)}\n`);
const issues = result.flatMap((r) => r.collisions.map((c) => ({ page: r.page, ...c })));
console.log(JSON.stringify({ pages: result.length, collisions: issues.length, outOfCanvas: result.flatMap((r) => r.outOfCanvas).length, issues }, null, 2));
