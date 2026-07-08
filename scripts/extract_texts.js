const fs = require("fs");
const data = JSON.parse(fs.readFileSync("banrihua-editor-20plants.json", "utf-8"));

const targetPrefixes = ["sec-habitat-body", "sec-hum-body", "sec-range-caption"];
const map = {};

for (let i = 0; i < data.pages.length; i++) {
  const page = data.pages[i];
  for (const block of page.blocks) {
    if (block.type === "text") {
      const baseId = block.id.split("-c")[0];
      if (targetPrefixes.includes(baseId)) {
        if (!/[a-zA-Z]/.test(block.text)) {
          if (!map[block.text]) {
            map[block.text] = { pages: [] };
          }
          map[block.text].pages.push(page.name);
        }
      }
    }
  }
}

fs.writeFileSync("texts_to_translate.json", JSON.stringify(Object.keys(map), null, 2));
console.log("Wrote " + Object.keys(map).length + " unique strings to texts_to_translate.json");
