#!/usr/bin/env node
// Split a full editor state JSON for Supabase storage:
//  - every data: URL image block is written out as a content-addressed file
//    under <outDir>/images/ and its src replaced with the public bucket URL
//  - each page is written to <outDir>/state/pages/<pageId>.json
//  - <outDir>/state/manifest.json holds page order, palette, activeId, version
//  - <outDir>/state/latest.json is the reassembled slim full state
//
// Usage: node scripts/split-state-for-supabase.mjs <input.json> <outDir> <publicUrlBase>
//   publicUrlBase e.g. https://xxx.supabase.co/storage/v1/object/public/poster-images
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [input, outDir, publicBase] = process.argv.slice(2);
if (!input || !outDir || !publicBase) {
  console.error("usage: split-state-for-supabase.mjs <input.json> <outDir> <publicUrlBase>");
  process.exit(1);
}

const MIME_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const state = JSON.parse(fs.readFileSync(input, "utf8"));
const imagesDir = path.join(outDir, "images");
const pagesDir = path.join(outDir, "state", "pages");
fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(pagesDir, { recursive: true });

let extracted = 0;
const seen = new Map(); // hash -> filename
for (const page of state.pages) {
  for (const block of page.blocks ?? []) {
    if (typeof block.src !== "string" || !block.src.startsWith("data:")) continue;
    const comma = block.src.indexOf(",");
    const header = block.src.slice(5, comma); // e.g. image/jpeg;base64
    const mime = header.split(";")[0];
    const isB64 = /;base64$/i.test(header);
    const payload = block.src.slice(comma + 1);
    const buf = isB64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16);
    const ext = MIME_EXT[mime] ?? "bin";
    const name = `${hash}.${ext}`;
    if (!seen.has(hash)) {
      fs.writeFileSync(path.join(imagesDir, name), buf);
      seen.set(hash, name);
    }
    block.src = `${publicBase.replace(/\/+$/, "")}/${name}`;
    extracted++;
  }
}

for (const page of state.pages) {
  fs.writeFileSync(path.join(pagesDir, `${page.id}.json`), JSON.stringify(page));
}

const manifest = {
  version: 1,
  updatedAt: new Date().toISOString(),
  activeId: state.activeId,
  palette: state.palette,
  pageOrder: state.pages.map((p) => ({ id: p.id, name: p.name })),
};
fs.writeFileSync(path.join(outDir, "state", "manifest.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(outDir, "state", "latest.json"), JSON.stringify(state));

const latestBytes = fs.statSync(path.join(outDir, "state", "latest.json")).size;
console.log(`pages: ${state.pages.length}`);
console.log(`extracted image blocks: ${extracted} (${seen.size} unique files)`);
console.log(`latest.json: ${(latestBytes / 1048576).toFixed(2)}MB`);
