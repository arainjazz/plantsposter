import fs from "node:fs/promises";

const SOURCE = "public/banrihua-editor-20plants.json";
const OUTPUTS = [SOURCE, "banrihua-editor-20plants.json"];
const SSR_OUTPUT = "src/lib/default-plants-ssr.json";
const CACHE = ".map-audit-cache.json";
const ACCESSED = new Date().toISOString().slice(0, 10);
const rangeCountries = {
  "Helianthemum songaricum": ["CN", "KZ", "KG", "UZ"],
  "Tetraena mongolica": ["CN"],
  "Ammopiptanthus mongolicus": ["CN", "MN"],
  "Potaninia mongolica": ["CN", "MN"],
  "Leptodermis ordosica": ["CN"],
  "Artemisia ordosica": ["CN"],
  "Artemisia sphaerocephala": ["CN", "MN"],
  "Juniperus sabina": ["CN", "MN", "KZ", "KG", "RU", "UA", "RO", "HU", "SK", "CZ", "AT", "DE", "IT", "FR", "ES"],
  "Salix gordejevii": ["CN", "MN", "RU"],
  "Caragana korshinskii": ["CN", "MN"],
  "Reaumuria soongorica": ["CN", "MN", "KZ", "KG", "UZ", "TM"],
  "Nitraria tangutorum": ["CN"],
  "Haloxylon ammodendron": ["CN", "MN", "KZ", "KG", "UZ", "TM"],
  "Pugionium cornutum": ["CN", "MN"],
  "Tugarinovia mongolica": ["CN", "MN"],
  "Allium mongolicum": ["CN", "MN", "KZ", "RU"],
  "Cistanche deserticola": ["CN", "MN"],
  "Xanthoceras sorbifolium": ["CN"],
  "Prunus mongolica": ["CN", "MN"],
  "Nostoc flagelliforme": [],
};
const spatialBounds = {
  "Nostoc flagelliforme": { minLat: 30, maxLat: 55, minLon: 73, maxLon: 125 },
};

const copy = {
  "Helianthemum songaricum": {
    range: "中亚至中国北方的间断荒漠记录 · Disjunct records from Central Asia to northern China",
    noteSub: "隔离种群不能视作同一保护单元 · Isolated Populations Need Separate Care",
    note: "伊犁与西鄂尔多斯种群相距遥远；分布点只表示已记录地点，不能填补两地之间的空白。\nThe Ili and western Ordos populations are widely separated; occurrence dots do not imply continuous habitat between them.",
    humSub: "“songaricum”记录准噶尔地名 · A Name Rooted in Dzungaria",
    hum: "种加词 songaricum 源自 Songaria（准噶尔旧称），把这一物种的命名史与中亚荒漠地理联系起来。\nThe epithet songaricum derives from Songaria, an older name for Dzungaria, linking the species name to Central Asian geography.",
  },
  "Tetraena mongolica": {
    range: "中国西鄂尔多斯狭域特有 · Narrow endemic of western Ordos, China",
    noteSub: "狭域分布的国家重点保护植物 · A Protected Narrow Endemic",
    note: "四合木天然分布很窄，孤立种群易受采矿、道路和生境破碎化影响；保护重点是原生群落，而非只保存单株。\nIts tiny, fragmented range makes habitat loss a greater risk than the loss of any single plant; intact native communities are the conservation priority.",
    humSub: "四瓣果实写进了中文名 · Four Valves, One Memorable Name",
    hum: "成熟蒴果通常裂成四瓣，“四合木”把可观察的果实特征直接写进名称，也便于野外识别。\nThe Chinese name refers to the capsule splitting into four valves, turning a diagnostic fruit character into a memorable field name.",
  },
  "Ammopiptanthus mongolicus": {
    range: "蒙古南部与中国北方荒漠 · Deserts of southern Mongolia and northern China",
    noteSub: "严寒荒漠中的常绿阔叶灌木 · Evergreen in a Freezing Desert",
    note: "它在冬季严寒、长期干旱的荒漠仍保持革质叶，是温带荒漠少见的常绿阔叶灌木；这比泛称“活化石”更具识别和研究价值。\nIts leathery leaves persist through cold, arid winters—an unusual evergreen strategy among temperate-desert broad-leaved shrubs.",
    humSub: "沙中越冬的绿色标志 · A Winter-Green Desert Landmark",
    hum: "“沙冬青”准确概括了它在沙砾荒漠中越冬常绿的特征；迁地繁育应服务于野生种群恢复，不能替代原生生境。\nIts Chinese name literally evokes a winter-green shrub of sandy deserts; ex-situ propagation should support, not replace, wild habitat conservation.",
  },
  "Potaninia mongolica": {
    range: "蒙古高原与中国北方戈壁 · Gobi records across Mongolia and northern China",
    noteSub: "单型属与国家重点保护价值 · A Monotypic, Protected Lineage",
    note: "绵刺是绵刺属现存唯一物种；保护它同时保存一条独立的蔷薇科演化支系。地图中的少量记录反映采集不足，不代表其余区域没有种群。\nAs the only species of Potaninia, it represents an entire rosaceous lineage; sparse records also reflect limited collecting effort.",
    humSub: "棉毛宿萼造就“绵刺”之名 · Cottony Calyx, Thorny Form",
    hum: "果实被密生棉毛的宿存萼包裹，配合刺状枝条，形成“绵刺”这一直接来自形态的名称。\nA fruit wrapped in a cottony persistent calyx, set among spine-like branches, gives the plant its descriptive Chinese name.",
  },
  "Leptodermis ordosica": {
    latin: "Leptodermis ordosica H.C.Fu & E.W.Ma",
    range: "中国鄂尔多斯高原狭域特有 · Narrow endemic of the Ordos Plateau, China",
    noteSub: "先确认学名，再谈推广利用 · Identity Before Horticultural Use",
    note: "本页原命名人组合有误，已按权威分类记录改为 H.C.Fu & E.W.Ma。狭域特有植物的园林利用必须使用可追溯繁殖材料，避免采挖野生株。\nThe author citation has been corrected to H.C.Fu & E.W.Ma; any horticultural use should rely on traceable propagation, not wild collection.",
    humSub: "ordosica 把产地写入学名 · Ordos Written into the Name",
    hum: "种加词 ordosica 直接指向鄂尔多斯；它首先是一种地域特有植物，而不是可随意移植的普通“野丁香”。\nThe epithet ordosica records its Ordos identity: this is a regional endemic, not a generic wild ornamental available for unrestricted collecting.",
  },
  "Artemisia ordosica": {
    range: "中国北方沙地，核心在鄂尔多斯周边 · Northern Chinese sandy lands, centred on Ordos",
    noteSub: "耐沙埋不等于适合所有荒漠 · Sand-Burial Tolerance Has Limits",
    note: "鄂尔多斯蒿能在活动沙地萌蘖并耐受一定沙埋，但固沙配置仍需匹配当地种源、沙丘稳定度和水分条件，不能跨区套用。\nIt resprouts and tolerates some burial, but restoration must still match local provenance, dune mobility and water availability.",
    humSub: "从流沙先锋到恢复工程材料 · From Pioneer to Restoration Plant",
    hum: "它长期用于中国北方沙地植被恢复；工程价值来自乡土种源和群落配置，而不是“单一种下去就能治沙”。\nIt is widely used in northern China’s sandy-land restoration, where local seed sources and mixed communities matter more than single-species planting.",
  },
  "Artemisia sphaerocephala": {
    range: "蒙古与中国北方沙地 · Sandy regions of Mongolia and northern China",
    noteSub: "种子黏液是关键适沙结构 · Seed Mucilage Anchors Life in Sand",
    note: "种子遇水形成黏液层，可黏附沙粒并调节吸水；这是有实证的适沙特征，比笼统的“基因家族扩张”更适合公众理解。\nWhen wetted, the seed coat forms mucilage that binds sand and regulates hydration—a directly observed adaptation to mobile dunes.",
    humSub: "白沙蒿籽胶的材料价值 · A Natural Hydrocolloid",
    hum: "白沙蒿籽胶是一类天然多糖水胶体，已被研究用于食品结构和材料应用；这项利用应与野生种群保护分开评价。\nIts seed gum is a natural polysaccharide hydrocolloid studied for food and material uses; utilization should be assessed separately from wild conservation.",
  },
  "Juniperus sabina": {
    range: "欧洲至中亚和东亚山地广布 · Widespread in mountains from Europe to East Asia",
    noteSub: "精油可致中毒，禁止自行内服 · Toxic Oil—Do Not Self-Medicate",
    note: "枝叶精油含多种有毒萜类，尤其富含 sabinyl acetate 的材料可造成严重刺激和器官损伤；不能把风险简单归因于 sabinene，也不应自行内服。\nIts foliage oil contains a toxic terpene mixture, often rich in sabinyl acetate; toxicity cannot be attributed to sabinene alone, and ingestion is unsafe.",
    humSub: "园林地被，而不是家庭药材 · Groundcover, Not Home Medicine",
    hum: "匍匐株形、常绿和耐寒使其成为岩石园及坡地绿化植物；园艺价值不等于药用安全。\nIts creeping evergreen habit suits rock gardens and slope planting, but ornamental value must never be confused with medicinal safety.",
  },
  "Salix gordejevii": {
    range: "蒙古、俄罗斯东南部与中国北方沙地 · Mongolia, SE Russia and northern Chinese sands",
    noteSub: "河柳与沙柳不能只凭叶形判断 · Identify Willows with Flowers and Fruit",
    note: "黄柳与近缘柳属植物叶形变异和重叠明显；可靠鉴定应同时查看花序、苞片、子房毛被与生境，不能只看一张叶片照片。\nLeaf shape overlaps among related willows; reliable identification also needs catkins, bracts, ovary hairs and habitat.",
    humSub: "活枝扦插服务沙地恢复 · Living Cuttings for Sandy-Land Repair",
    hum: "柳属枝条易生根，黄柳可用乡土插条参与沙地恢复；使用当地种源可降低误引种和遗传混杂风险。\nWillow cuttings root readily and can support sandy-land restoration; local provenance reduces misidentification and genetic mixing.",
  },
  "Caragana korshinskii": {
    range: "蒙古高原至中国北部和西北部 · Mongolian Plateau to northern and NW China",
    noteSub: "固氮灌木也受水分上限约束 · Nitrogen Fixation Does Not Create Water",
    note: "根瘤共生可增加氮输入，但在极干旱地过密栽植仍会加剧土壤水分消耗；恢复密度必须服从长期水量平衡。\nRoot nodules add nitrogen, but dense planting in very dry sites can still deplete soil water; restoration density must respect long-term water balance.",
    humSub: "柠条利用要兼顾灌丛更新 · Fodder Use with Regeneration",
    hum: "柠条常用于防护林和饲草，但平茬、放牧与采种强度应给灌丛留出更新周期。\nIt is used in shelterbelts and as forage, but cutting, grazing and seed harvest must allow enough time for shrub regeneration.",
  },
  "Reaumuria soongorica": {
    range: "中亚至中国西北和北部荒漠 · Deserts from Central Asia to northern and NW China",
    noteSub: "盐腺排盐，而非笼统“耐盐” · Salt Glands Make Tolerance Visible",
    note: "叶表盐腺能排出吸收的盐分，盐晶可在叶面出现；这是红砂适应盐渍荒漠的直接结构证据。\nLeaf salt glands excrete absorbed salts, sometimes leaving visible crystals—a structural basis for survival in saline deserts.",
    humSub: "不要把药理筛选写成临床功效 · Screening Is Not Medical Proof",
    hum: "红砂提取物见于实验研究，但体外活性不等于安全有效的民间药方；本页不再宣称未经临床验证的治疗用途。\nExtracts appear in laboratory studies, but in-vitro activity is not proof of a safe or effective remedy; unverified medical claims are omitted.",
  },
  "Nitraria tangutorum": {
    range: "中国西北与北中部盐碱荒漠 · Saline deserts of NW and north-central China",
    noteSub: "白刺属鉴定需结合果核与分子证据 · Nitraria Needs Careful Identification",
    note: "白刺属种间形态重叠明显，单靠果色或灌丛外形容易误判；分布图仅采用匹配到唐古特白刺的记录。\nNitraria species overlap in appearance; fruit-stone characters and, where needed, molecular data are safer than fruit colour alone.",
    humSub: "盐地野果的地方利用 · A Local Fruit of Saline Lands",
    hum: "成熟果实在部分产区被食用或加工，但野外采收应保留供鸟兽取食和天然更新的果实。\nRipe fruits are eaten or processed in parts of its range, but wild harvest should leave enough fruit for wildlife and natural regeneration.",
  },
  "Haloxylon ammodendron": {
    range: "中亚至中国西北荒漠 · Deserts of Central Asia and northwestern China",
    noteSub: "绿色嫩枝承担主要光合作用 · Green Shoots Replace Broad Leaves",
    note: "梭梭叶片退化成微小鳞片，主要光合作用由当年绿色嫩枝完成，从而降低蒸腾面积。它是肉苁蓉的重要寄主，但不应写成所有肉苁蓉的“唯一寄主”。\nTiny scale leaves reduce water loss while green current-year shoots photosynthesize; it is a major Cistanche host, not a universal sole host.",
    humSub: "固沙林与肉苁蓉产业相互绑定 · Shelterbelts and Cistanche Cultivation",
    hum: "人工梭梭林可同时承担防护和肉苁蓉接种载体，但水量、林龄和采收强度决定这一模式能否持续。\nPlanted saxaul can support both shelterbelts and Cistanche inoculation, provided water balance, stand age and harvest intensity remain sustainable.",
  },
  "Pugionium cornutum": {
    range: "蒙古与中国北方沙地 · Sandy lands of Mongolia and northern China",
    noteSub: "角状果实是可靠识别点 · Horned Fruits Confirm Identity",
    note: "成熟果实具有成对角状翅，是沙芥属重要识别特征；仅凭嫩叶无法排除其他十字花科植物。\nThe paired horn-like wings of mature fruits are diagnostic; young leaves alone cannot safely distinguish it from other brassicas.",
    humSub: "沙地野菜必须可持续采收 · A Desert Vegetable, Harvested Carefully",
    hum: "部分地区食用嫩茎叶；采收应避开受污染地块，并保留足够植株完成开花结籽。\nYoung shoots are eaten in parts of its range; harvest should avoid contaminated sites and leave enough plants to flower and seed.",
  },
  "Tugarinovia mongolica": {
    range: "蒙古南部与中国内蒙古荒漠 · Deserts of southern Mongolia and Inner Mongolia, China",
    noteSub: "单型属，误采代价很高 · A Monotypic Genus with Little Margin for Loss",
    note: "革苞菊属仅含这一物种，局部种群损失会削弱整个属的遗传与形态多样性；稀少记录不能被解读为可采集。\nTugarinovia contains only this species, so loss of local populations erodes diversity across the whole genus; rarity is not permission to collect.",
    humSub: "革质总苞写进了中文名 · Leathery Bracts in the Name",
    hum: "“革苞菊”指向其坚韧、革质的总苞片，这是比泛称“荒漠模式植物”更具体的观察线索。\nThe Chinese name points to its tough, leathery involucral bracts—a concrete field character rather than a vague claim of scientific importance.",
  },
  "Allium mongolicum": {
    range: "蒙古高原及中国北方干旱区 · Mongolian Plateau and arid northern China",
    noteSub: "可食用不等于可凭叶片采集 · Edible, but Identification Comes First",
    note: "无花、无鳞茎特征时，线形叶不足以可靠鉴定蒙古韭；野采还需避开道路、矿区和受污染土壤。\nLinear leaves alone are insufficient for identification without flowers and bulbs; collecting sites must also be free of road, mining and soil contamination.",
    humSub: "荒漠草原上的地方蔬菜 · A Regional Steppe Vegetable",
    hum: "蒙古韭的嫩叶和花序在部分地区作为风味蔬菜；可持续利用应以栽培或轮采替代连根挖取。\nLeaves and umbels are used as a regional vegetable; cultivation or rotational harvest is safer than uprooting wild plants.",
  },
  "Cistanche deserticola": {
    range: "中国西北与蒙古荒漠中的寄生记录 · Parasitic records in NW China and Mongolian deserts",
    noteSub: "保护寄生植物必须同时保护寄主 · Protect the Host to Protect the Parasite",
    note: "肉苁蓉没有叶绿素，依靠吸器连接梭梭等寄主根系；只移栽花序或单独保存种子不能形成独立种群。\nLacking chlorophyll, it connects to host roots through a haustorium; conserving flowers or seeds alone cannot sustain a population without hosts.",
    humSub: "药材需求推动人工接种栽培 · Cultivation Answers Medicinal Demand",
    hum: "它是受管制的传统药材；在人工梭梭林中接种可降低野采压力，但产品来源仍需合法、可追溯。\nIt is a regulated traditional medicinal material; inoculation in planted saxaul can reduce wild harvest when production is legal and traceable.",
  },
  "Xanthoceras sorbifolium": {
    range: "原产中国北方，栽培记录更广 · Native to northern China, cultivated more widely",
    noteSub: "油用价值不等于全株可食 · Oil Crop Does Not Mean Every Part Is Food",
    note: "文冠果种仁含油并可加工利用，但果壳、种皮和压榨副产物富含皂苷等成分，不能把“油料树”误写成全株可直接食用或入药。\nIts kernels yield useful oil, but shells, seed coats and press residues contain abundant saponins; an oil crop is not an all-purpose edible or remedy.",
    humSub: "从庭院花木到北方木本油料 · Ornamental Tree and Woody Oil Crop",
    hum: "白花与变色花心使它成为观赏树，种子又支持木本油料开发；两种用途都依赖经过选择的栽培材料。\nShowy flowers support ornamental planting while seeds support woody-oil development; both uses depend on selected cultivated material.",
  },
  "Prunus mongolica": {
    range: "蒙古南部与中国北方荒漠山地 · Desert mountains of southern Mongolia and northern China",
    noteSub: "它不是栽培扁桃的野生替代品 · Not a Wild Substitute for Almond",
    note: "蒙古扁桃果实小、果肉薄并密被毛，不能因中文名含“扁桃”就当作商品杏仁采食；可靠鉴定需结合枝刺、叶和核果。\nIts small, hairy drupes are not commercial almonds; identification should combine spines, leaves and fruit characters.",
    humSub: "珍贵的是野生基因库，而非果量 · Value Lies in Wild Diversity",
    hum: "作为耐旱蔷薇科野生种，它的价值在于原生种群的遗传多样性；迁地保存应记录采种地点和母株。\nAs a drought-adapted wild rosaceous species, its value lies in genetic diversity; ex-situ collections should retain provenance and maternal records.",
  },
  "Nostoc flagelliforme": {
    range: "主要见于中国北方与西北干旱草原 · Mainly arid steppes of northern and NW China",
    noteSub: "它是蓝细菌，采集会剥伤地表 · A Cyanobacterium—Harvest Damages Soil",
    note: "发菜不是维管植物，而是陆生蓝细菌群体。传统搂采会破坏生物土壤结皮并加剧风蚀，中国已禁止采集、收购、加工和销售野生发菜。\nIt is a terrestrial cyanobacterial colony, not a vascular plant; raking damages biological soil crusts, and China prohibits wild collection and trade.",
    humSub: "“发财”谐音背后的消费转向 · From Lucky Homophone to No-Harvest Policy",
    hum: "“发菜”因谐音“发财”进入节庆饮食；今天更有价值的文化选择，是用合法替代食材保留寓意而不破坏荒漠。\nIts lucky homophone once drove festive demand; legal substitutes can preserve the symbolism without damaging desert soil crusts.",
  },
};

function findText(page, base) {
  return page.blocks.find(
    (b) => b.type === "text" && (b.id === base || b.id.startsWith(`${base}-`)),
  );
}

function scientificName(page) {
  const raw = findText(page, "title-latin")?.text ?? "";
  return raw.match(/^[A-Z][a-z-]+\s+[a-z-]+/)?.[0] ?? null;
}

function escapeXml(value) {
  return value.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&apos;",
  );
}

async function gbifMap(scientific, basePaths) {
  const fetchJson = async (url, attempts = 4) => {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        if (attempt === attempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  };
  const match = await fetchJson(
    `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientific)}`,
  );
  if (!match.usageKey || match.confidence < 90) throw new Error(`Low-confidence GBIF match: ${scientific}`);

  const query = new URLSearchParams({
    taxon_key: String(match.usageKey),
    has_coordinate: "true",
    has_geospatial_issue: "false",
    occurrence_status: "PRESENT",
  });
  for (const country of rangeCountries[scientific] ?? []) query.append("country", country);
  const countJson = await fetchJson(`https://api.gbif.org/v1/occurrence/search?${query}&limit=0`);
  const count = countJson.count ?? 0;
  const pageSize = 25;
  const maxOffset = Math.max(0, Math.min(count - pageSize, 99_900));
  const offsets = [...new Set([0, 0.5, 1].map((p) => Math.floor((maxOffset * p) / pageSize) * pageSize))];
  const pages = [];
  for (const offset of offsets) {
    pages.push(
      await fetchJson(
        `https://api.gbif.org/v1/occurrence/search?${query}&limit=${pageSize}&offset=${offset}`,
      ),
    );
  }

  const cells = new Map();
  const bounds = spatialBounds[scientific];
  for (const row of pages.flatMap((p) => p.results ?? [])) {
    const lat = Number(row.decimalLatitude);
    const lon = Number(row.decimalLongitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (bounds && (lat < bounds.minLat || lat > bounds.maxLat || lon < bounds.minLon || lon > bounds.maxLon)) continue;
    const key = `${Math.floor(lat / 3)},${Math.floor(lon / 3)}`;
    if (!cells.has(key)) cells.set(key, row);
  }
  const records = [...cells.values()].slice(0, 100);
  const noVerifiedPoints = !records.length;
  if (noVerifiedPoints && scientific !== "Nostoc flagelliforme") {
    throw new Error(`No usable GBIF coordinates: ${scientific}`);
  }

  const circles = { native: [], introduced: [], unknown: [] };
  for (const row of records) {
    const x = 2.6865 * row.decimalLongitude + 449.3127;
    const y = -3.4451 * row.decimalLatitude + 339.3522;
    const means = String(row.establishmentMeans ?? "").toLowerCase();
    const kind = means.includes("introduced") ? "introduced" : means.includes("native") ? "native" : "unknown";
    const fill = kind === "native" ? "#3a7d2e" : kind === "introduced" ? "#d97706" : "#64748b";
    circles[kind].push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.2" fill="${fill}" stroke="#fff" stroke-width="0.7" opacity="0.92"/>`);
  }
  const accepted = match.scientificName ?? scientific;
  const source = noVerifiedPoints
    ? `GBIF taxonKey ${match.usageKey}; no usable coordinates in the reference extent; no points plotted; accessed ${ACCESSED}`
    : `GBIF taxonKey ${match.usageKey}; ${count} records in known native-range countries; coordinate/status filters; accessed ${ACCESSED}`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 780" width="950" height="780">
<style>.ttl{font:700 22px Arial,sans-serif;fill:#2a2622}.sub{font:400 12px Arial,sans-serif;fill:#6b6357}.cap{font:400 11px Arial,sans-serif;fill:#4a443c}.lg{font:500 13px Arial,sans-serif;fill:#2a2622}</style>
<g fill="#e8dcc4" stroke="#8a7a5a" stroke-width="0.35">${basePaths}</g>
<g stroke="#b9a87e" stroke-width="0.55" stroke-dasharray="2 3" opacity="0.35"><line x1="0" y1="339.35" x2="950" y2="339.35"/><line x1="0" y1="258.61" x2="950" y2="258.61"/><line x1="0" y1="420.09" x2="950" y2="420.09"/></g>
<g>${circles.introduced.join("")}${circles.unknown.join("")}${circles.native.join("")}</g>
<g transform="translate(0,640)"><text class="ttl" x="24" y="26">${escapeXml(accepted)} · Global Distribution</text><text class="sub" x="24" y="46">${noVerifiedPoints ? "No verified GBIF coordinates available for this reference extent" : "Verified GBIF occurrences within reference native-range countries"}</text><g transform="translate(24,70)"><circle cx="8" cy="8" r="6" fill="#3a7d2e"/><text class="lg" x="24" y="12">Native · 原生</text><circle cx="180" cy="8" r="6" fill="#d97706"/><text class="lg" x="196" y="12">Introduced · 引入</text><circle cx="390" cy="8" r="6" fill="#64748b"/><text class="lg" x="406" y="12">Unknown · 属性未定</text></g><text class="cap" x="24" y="118">${escapeXml(source)}</text><text class="cap" x="24" y="136">${noVerifiedPoints ? "This avoids displaying unsourced hand-placed distribution points." : "Real coordinates; 3° grid deduplication reduces collection-hotspot bias."}</text></g></svg>`;
  return {
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
    key: match.usageKey,
    accepted,
    count,
    plotted: records.length,
  };
}

const state = JSON.parse(await fs.readFile(SOURCE, "utf8"));
const baseSvg = await fs.readFile("public/world-map.svg", "utf8");
const basePaths = (baseSvg.match(/<path\b[\s\S]*?(?:\/>|<\/path>)/gi) ?? [])
  .map((path) =>
    path
      .replace(/\s(?:style|fill|stroke|stroke-width|stroke-dasharray|stroke-linejoin|stroke-linecap|opacity|(?:inkscape|sodipodi):[\w-]+)="[^"]*"/gi, "")
      .replace(/\s+\/?>$/, (end) => (end.includes("/") ? "/>" : ">")),
  )
  .join("\n");

let cachedMaps = {};
try {
  cachedMaps = JSON.parse(await fs.readFile(CACHE, "utf8"));
} catch {
  // The first pass starts with an empty cache.
}
const maps = new Map(Object.entries(cachedMaps));
for (const [scientific, map] of maps) {
  const svg = Buffer.from(map.dataUrl.split(",")[1], "base64").toString("utf8");
  const repaired = svg.replace(
    /(<g fill="#e8dcc4" stroke="#8a7a5a" stroke-width="0\.35">)[\s\S]*?(<\/g>)/,
    `$1${basePaths}$2`,
  );
  maps.set(scientific, {
    ...map,
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(repaired, "utf8").toString("base64")}`,
  });
}
const uniqueTaxa = [...new Set(state.pages.map(scientificName))];
const requested = Number.parseInt(process.argv[2] ?? "2", 10);
let fetched = 0;
for (const scientific of uniqueTaxa) {
  if (maps.has(scientific) || fetched >= requested) continue;
  console.log(`GBIF ${scientific}`);
  maps.set(scientific, await gbifMap(scientific, basePaths));
  fetched += 1;
}
if (fetched) {
  await fs.writeFile(CACHE, `${JSON.stringify(Object.fromEntries(maps), null, 2)}\n`);
}
if (maps.size < uniqueTaxa.length) {
  console.log(`Map cache ${maps.size}/${uniqueTaxa.length}; run again to continue.`);
  process.exit(0);
}
const audit = [];
for (const page of state.pages) {
  const scientific = scientificName(page);
  if (!scientific || !copy[scientific]) throw new Error(`Missing reviewed copy for ${page.name}: ${scientific}`);
  const reviewed = copy[scientific];
  const replacements = {
    "sec-range-sub": reviewed.range,
    "sec-note-sub": reviewed.noteSub,
    "sec-note-body": reviewed.note,
    "sec-hum-sub": reviewed.humSub,
    "sec-hum-body": reviewed.hum,
    ...(reviewed.latin ? { "title-latin": reviewed.latin } : {}),
  };
  for (const [id, text] of Object.entries(replacements)) {
    const block = findText(page, id);
    if (!block) throw new Error(`Missing ${id} on ${page.name}`);
    block.text = text;
  }
  for (const block of page.blocks) {
    if (block.type === "text") block.text = block.text.replaceAll("\\n", "\n");
  }
  const mapBlock = page.blocks.find((b) => b.type === "image" && b.id.includes("img-map"));
  if (!mapBlock) throw new Error(`Missing map image on ${page.name}`);
  mapBlock.src = maps.get(scientific).dataUrl;
  audit.push({ page: page.name, scientific, ...maps.get(scientific) });
}

const json = `${JSON.stringify(state, null, 2)}\n`;
for (const output of OUTPUTS) await fs.writeFile(output, json);
// The SSR seed must remain compact: the client immediately replaces it with
// the published/full state, while embedding data URLs here would exceed the
// Cloudflare Worker script-size limit.
const ssrState = structuredClone(state);
for (const page of ssrState.pages) {
  for (const block of page.blocks) {
    if (block.type === "image") block.src = null;
  }
}
await fs.writeFile(SSR_OUTPUT, `${JSON.stringify(ssrState, null, 2)}\n`);
await fs.writeFile(
  "content-audit-2026-07-13.json",
  `${JSON.stringify({ accessed: ACCESSED, mapMethod: "GBIF occurrence/search; known native-range country filter; PRESENT; coordinate=true; geospatial_issue=false; stratified pages; 3-degree grid deduplication", pages: audit.map(({ dataUrl, ...row }) => row) }, null, 2)}\n`,
);
console.log(`Updated ${state.pages.length} pages / ${maps.size} taxa.`);
