import { readFileSync, writeFileSync } from "fs";
import { INITIAL_BLOCKS, makeEmptyPage, type PosterPage, type Block, type TextBlock } from "@/lib/poster-data";
import { DEFAULT_PALETTE } from "@/lib/poster-ops";

// Load .env manually for standalone script
const envText = readFileSync(".env", "utf-8");
const env: Record<string, string> = {};
for (const line of envText.split("\n")) {
  const [k, v] = line.split("=");
  if (k && v) env[k.trim()] = v.trim();
}
const API_KEY = env.GEMINI_API_KEY;
if (!API_KEY) throw new Error("GEMINI_API_KEY not found in .env");

const PLANTS = [
  "四合木 Tetraena mongolica",
  "蒙古沙冬青 Ammopiptanthus mongolicus",
  "绵刺 Potaninia mongolica",
  "鄂尔多斯野丁香 Leptodermis ordosica",
  "鄂尔多斯蒿 Artemisia ordosica",
  "白沙蒿 Artemisia sphaerocephala",
  "叉子圆柏 Juniperus sabina",
  "黄柳 Salix gordejevii",
  "柠条锦鸡儿 Caragana korshinskii",
  "红砂 Reaumuria soongorica",
  "唐古特白刺 Nitraria tangutorum",
  "梭梭 Haloxylon ammodendron",
  "沙芥 Pugionium cornutum",
  "革苞菊 Tugarinovia mongolica",
  "蒙古韭 Allium mongolicum",
  "肉苁蓉 Cistanche deserticola",
  "文冠果 Xanthoceras sorbifolium",
  "蒙古扁桃 Prunus mongolica",
  "发菜 Nostoc flagelliforme",
];

const SCHEMA = {
  type: "object",
  properties: {
    famCn: { type: "string" },
    famEn: { type: "string" },
    genCn: { type: "string" },
    genEn: { type: "string" },
    title: { type: "string", description: "中文名，字之间加空格，例如 '四 合 木'" },
    titleLatin: { type: "string", description: "完整的拉丁学名，含命名人" },
    titleEn: { type: "string", description: "英文俗名" },
    titleSub: { type: "string", description: "中英对照的一句话总结，例如 '荒漠砾坡上的黄色残遗小灌木 · A yellow-flowered relict shrub of stony deserts'" },
    descCn: { type: "string", description: "植物中文简介（形态和基本特征）" },
    descEn: { type: "string", description: "植物英文简介" },
    secSeasonBody: { type: "string", description: "四季物候描述，中英双语，2句话内" },
    season1En: { type: "string", description: "春季简短英文，例如 'new shoots'" },
    season2En: { type: "string", description: "夏季简短英文，例如 'yellow bloom'" },
    season3En: { type: "string", description: "秋季简短英文，例如 'seed capsule'" },
    season4En: { type: "string", description: "冬季简短英文，例如 'woody cushion'" },
    secRangeSub: { type: "string", description: "分布总结，中英双语，1句话" },
    trait1Title: { type: "string", description: "识别特征1标题（如 刺状枝端）" },
    trait1Body: { type: "string", description: "识别特征1描述，中英双语" },
    trait2Title: { type: "string", description: "识别特征2标题" },
    trait2Body: { type: "string", description: "识别特征2描述，中英双语" },
    trait3Title: { type: "string", description: "识别特征3标题" },
    trait3Body: { type: "string", description: "识别特征3描述，中英双语" },
    trait4Title: { type: "string", description: "识别特征4标题" },
    trait4Body: { type: "string", description: "识别特征4描述，中英双语" },
    secNoteSub: { type: "string", description: "重要提示副标题，中英双语" },
    secNoteBody: { type: "string", description: "重要提示正文！极其重要：根据该植物的最新科学发现、保护现状、分类争议、基因突破、毒性预警或打破常识的信息来写。不要写泛泛之谈。中英双语。" },
    sim1Title: { type: "string", description: "相似种1中文+拉丁名" },
    sim1Body: { type: "string", description: "相似种1的区别特征" },
    sim2Title: { type: "string", description: "相似种2中文+拉丁名" },
    sim2Body: { type: "string", description: "相似种2的区别特征" },
    secHabitatSub: { type: "string", description: "生境副标题，中英双语" },
    secHabitatBody: { type: "string", description: "生境详细描述，中文" },
    secHabitatCap: { type: "string", description: "生境地点标签，例如 '鄂托克 Otog, Ordos · 砾坡 gravel slope'" },
    eco1v: { type: "string", description: "光照要求，中文 · 英文" },
    eco2v: { type: "string", description: "水分要求，中文 · 英文" },
    eco3v: { type: "string", description: "习性，中文 · 英文" },
    eco4v: { type: "string", description: "温度/气候，中文 · 英文" },
    eco5v: { type: "string", description: "土壤要求，中文 · 英文" },
    secHumSub: { type: "string", description: "植物人文副标题，中英双语" },
    secHumBody: { type: "string", description: "植物人文/保护/文化价值描述，中文" },
  },
  required: [
    "famCn", "famEn", "genCn", "genEn", "title", "titleLatin", "titleEn", "titleSub",
    "descCn", "descEn", "secSeasonBody", "season1En", "season2En", "season3En", "season4En",
    "secRangeSub", "trait1Title", "trait1Body", "trait2Title", "trait2Body", "trait3Title", "trait3Body", "trait4Title", "trait4Body",
    "secNoteSub", "secNoteBody", "sim1Title", "sim1Body", "sim2Title", "sim2Body",
    "secHabitatSub", "secHabitatBody", "secHabitatCap",
    "eco1v", "eco2v", "eco3v", "eco4v", "eco5v", "secHumSub", "secHumBody"
  ]
};

const SYSTEM_PROMPT = `
You are a botanical expert generating highly structured data for "Ordos Plantspedia", a premium bilingual Chinese-English botanical encyclopedia.
You will be given a plant species name. Output a JSON object following the exact schema.

CRITICAL RULES:
1. **Morphological Purity for Traits**: The 'trait' fields (1-4) are STRICTLY for morphological/botanical field identification (Flower, Fruit, Seed, Leaves, Habit). DO NOT put any human uses (medicine, food, culture, gardening) in these fields. 
2. **Important Note**: The 'secNoteBody' MUST NOT be generic. It must highlight something highly specific and non-intuitive, such as: recent taxonomic disputes, genomic sequencing breakthroughs, critical conservation updates, specific toxicities, or symbiotic relationships.
3. **Bilingual formatting**: Follow the schema instructions closely. Many fields require "Chinese · English" or "Chinese text \\n English text" formats.
4. Be precise and scientific. Use accurate botanical terminology. 
`;

async function fetchPlantData(plantName: string): Promise<any> {
  console.log(`Generating data for ${plantName}...`);
  let retries = 5;
  while (retries > 0) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Generate data for plant: ${plantName}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
          temperature: 0.3,
        }
      })
    });
    
    if (res.status === 429) {
      console.log(`Rate limited on ${plantName}, sleeping for 60 seconds...`);
      await new Promise(r => setTimeout(r, 60000));
      retries--;
      continue;
    }
    
    if (!res.ok) {
      throw new Error(`Failed to fetch for ${plantName}: ${await res.text()}`);
    }
    
    const json = await res.json();
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error(`Empty response for ${plantName}`);
    return JSON.parse(content);
  }
  throw new Error(`Failed to fetch for ${plantName} after 5 retries due to rate limits`);
}

const ID_MAP: Record<string, string> = {
  "hdr-fam-cn": "famCn",
  "hdr-fam-en": "famEn",
  "hdr-gen-cn": "genCn",
  "hdr-gen-en": "genEn",
  "title": "title",
  "title-latin": "titleLatin",
  "title-en": "titleEn",
  "title-sub": "titleSub",
  "desc-cn": "descCn",
  "desc-en": "descEn",
  "sec-season-body": "secSeasonBody",
  "season-1-en": "season1En",
  "season-2-en": "season2En",
  "season-3-en": "season3En",
  "season-4-en": "season4En",
  "sec-range-sub": "secRangeSub",
  "trait-1-title": "trait1Title",
  "trait-1-body": "trait1Body",
  "trait-2-title": "trait2Title",
  "trait-2-body": "trait2Body",
  "trait-3-title": "trait3Title",
  "trait-3-body": "trait3Body",
  "trait-4-title": "trait4Title",
  "trait-4-body": "trait4Body",
  "sec-note-sub": "secNoteSub",
  "sec-note-body": "secNoteBody",
  "sim-1-title": "sim1Title",
  "sim-1-body": "sim1Body",
  "sim-2-title": "sim2Title",
  "sim-2-body": "sim2Body",
  "sec-habitat-sub": "secHabitatSub",
  "sec-habitat-body": "secHabitatBody",
  "sec-habitat-cap": "secHabitatCap",
  "eco-1-v": "eco1v",
  "eco-2-v": "eco2v",
  "eco-3-v": "eco3v",
  "eco-4-v": "eco4v",
  "eco-5-v": "eco5v",
  "sec-hum-sub": "secHumSub",
  "sec-hum-body": "secHumBody",
};

async function main() {
  const pages: PosterPage[] = [];
  
  // 1. Include the original template page (半日花)
  pages.push({
    id: "page-1",
    name: "封面·半日花",
    autoName: true,
    blocks: INITIAL_BLOCKS
  });

  // 2. Generate and append 20 new pages
  for (let i = 0; i < PLANTS.length; i++) {
    const plant = PLANTS[i];
    try {
      const data = await fetchPlantData(plant);
      
      const suffix = Math.random().toString(36).slice(2, 6);
      const newBlocks: Block[] = INITIAL_BLOCKS.map(block => {
        const cloned = { ...block, id: `${block.id}-c${suffix}` };
        
        // If it's a text block and we have mapped data for it, replace the text
        if (cloned.type === "text") {
          const mapKey = ID_MAP[block.id];
          if (mapKey && data[mapKey]) {
            (cloned as TextBlock).text = data[mapKey];
          }
        }
        return cloned;
      });
      
      pages.push({
        id: `page-${Date.now()}-${suffix}`,
        name: plant.split(" ")[0],
        autoName: true,
        blocks: newBlocks,
      });
      
    } catch (err) {
      console.error(`Error processing ${plant}: `, err);
    }
  }
  
  const state = {
    pages,
    activeId: "page-1",
    palette: DEFAULT_PALETTE
  };
  
  writeFileSync("banrihua-editor-20plants.json", JSON.stringify(state, null, 2));
  console.log("Successfully wrote banrihua-editor-20plants.json");
}

main().catch(console.error);
