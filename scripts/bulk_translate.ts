import { readFileSync, writeFileSync } from "fs";

const envText = readFileSync(".env", "utf-8");
const env: Record<string, string> = {};
for (const line of envText.split("\n")) {
  const [k, v] = line.split("=");
  if (k && v) env[k.trim()] = v.trim();
}
const API_KEY = env.GEMINI_API_KEY;

async function bulkTranslate(texts: string[]): Promise<string[]> {
  console.log("Translating", texts.length, "texts in bulk...");
  const prompt = `
I will give you a JSON array of Chinese texts.
For each text, provide a bilingual version formatted EXACTLY as:
[Original Chinese Text]
[English Translation]

Return a JSON array of these bilingual strings in the exact same order.
Make sure the English is scientific and natural.

Input texts:
${JSON.stringify(texts, null, 2)}
`;

  let retries = 5;
  while (retries > 0) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        }
      })
    });
    
    if (res.status === 429) {
      console.log("Rate limited, sleeping 60s...");
      await new Promise(r => setTimeout(r, 60000));
      retries--;
      continue;
    }
    
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(content);
  }
  throw new Error("Failed after retries");
}

async function main() {
  const data = JSON.parse(readFileSync("banrihua-editor-20plants.json", "utf-8"));
  
  const textsToTranslate: { pageIdx: number; blockId: string; text: string }[] = [];
  
  // Also collect sec-range-caption
  const targetPrefixes = ["sec-habitat-body", "sec-hum-body", "sec-range-caption"];
  
  for (let i = 0; i < data.pages.length; i++) {
    const page = data.pages[i];
    for (const block of page.blocks) {
      if (block.type === "text") {
        const baseId = block.id.split("-c")[0];
        if (targetPrefixes.includes(baseId)) {
          // Only translate if it doesn't already have English characters
          if (!/[a-zA-Z]/.test(block.text)) {
            textsToTranslate.push({
              pageIdx: i,
              blockId: block.id,
              text: block.text
            });
          }
        }
      }
    }
  }
  
  if (textsToTranslate.length === 0) {
    console.log("No texts need translation.");
    return;
  }
  
  const rawTexts = textsToTranslate.map(t => t.text);
  
  // Split into chunks of 30 just in case
  const results: string[] = [];
  for (let i = 0; i < rawTexts.length; i += 30) {
    const chunk = rawTexts.slice(i, i + 30);
    const translatedChunk = await bulkTranslate(chunk);
    results.push(...translatedChunk);
  }
  
  for (let i = 0; i < textsToTranslate.length; i++) {
    const info = textsToTranslate[i];
    const page = data.pages[info.pageIdx];
    const block = page.blocks.find((b: any) => b.id === info.blockId);
    if (block) {
      block.text = results[i];
    }
  }
  
  writeFileSync("banrihua-editor-20plants.json", JSON.stringify(data, null, 2));
  console.log("Successfully translated and saved banrihua-editor-20plants.json!");
}

main().catch(console.error);
