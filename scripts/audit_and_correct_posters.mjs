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
// GBIF's accepted N. flagelliforme concept currently has no usable China
// coordinates; its returned points are foreign misidentifications. Use only
// clearly-labelled provincial reference markers from published Chinese range
// accounts, rather than presenting invented GBIF occurrences.
const manualRangeMaps = {
  "Nostoc flagelliforme": {
    source: "中国区域分布资料（内蒙古、宁夏、甘肃、新疆、青海、陕西）的省域代表位置",
    points: [
      [111.7, 41.5], // Inner Mongolia: Siziwang Banner study area
      [106.3, 37.6], // Ningxia dry steppe
      [103.1, 38.6], // Gansu dry steppe
      [98.4, 37.4], // Qinghai dry steppe
      [86.0, 42.8], // Xinjiang dry steppe
      [109.8, 38.4], // northern Shaanxi
    ],
  },
};

const copy = {
  "Helianthemum songaricum": {
    range: "中亚至中国北方的间断荒漠记录 · Disjunct records from Central Asia to northern China",
    noteSub: "隔离种群不能视作同一保护单元 · Isolated Populations Need Separate Care",
    note: "伊犁与西鄂尔多斯种群相距遥远；分布点只表示已记录地点，不能填补两地之间的空白。\nThe Ili and western Ordos populations are widely separated; occurrence dots do not imply continuous habitat between them.",
    humSub: "1841 年的学名把准噶尔写进植物志 · Dzungaria in an 1841 Name",
    hum: "Kew 记录该学名发表于 1841 年；种加词 songaricum 源自 Songaria（准噶尔旧称），把采集、命名与中亚荒漠地理连在一起。\nPublished in 1841, its epithet records Songaria, an older name for Dzungaria, linking botanical naming with Central Asian geography.",
  },
  "Tetraena mongolica": {
    range: "中国西鄂尔多斯狭域特有 · Narrow endemic of western Ordos, China",
    noteSub: "狭域分布的国家重点保护植物 · A Protected Narrow Endemic",
    note: "四合木天然分布很窄，孤立种群易受采矿、道路和生境破碎化影响；保护重点是原生群落，而非只保存单株。\nIts tiny, fragmented range makes habitat loss a greater risk than the loss of any single plant; intact native communities are the conservation priority.",
    humSub: "把果实特征写进地方植物名 · A Field Character Becomes a Name",
    hum: "“四合木”以成熟蒴果常裂成四瓣得名。把识别特征写入名称，是荒漠植物被地方观察、记忆和传授的一种方式。\nIts Chinese name recalls a capsule that usually opens into four valves—field observation turned into local botanical memory.",
  },
  "Ammopiptanthus mongolicus": {
    range: "蒙古南部与中国北方荒漠 · Deserts of southern Mongolia and northern China",
    noteSub: "严寒荒漠中的常绿阔叶灌木 · Evergreen in a Freezing Desert",
    note: "它在冬季严寒、长期干旱的荒漠仍保持革质叶，是温带荒漠少见的常绿阔叶灌木；这比泛称“活化石”更具识别和研究价值。\nIts leathery leaves persist through cold, arid winters—an unusual evergreen strategy among temperate-desert broad-leaved shrubs.",
    humSub: "“沙冬青”是冬季识别的地方名字 · A Winter Name for a Desert Shrub",
    hum: "在多数荒漠灌木落叶的季节，沙冬青仍保留革质绿叶；这个直白的中文名把长期野外观察转化成了易传的识别线索。\nWhen many desert shrubs are leafless, its leathery leaves remain green; the Chinese name preserves that practical winter field cue.",
  },
  "Potaninia mongolica": {
    range: "蒙古高原与中国北方戈壁 · Gobi records across Mongolia and northern China",
    noteSub: "单型属与国家重点保护价值 · A Monotypic, Protected Lineage",
    note: "绵刺是绵刺属现存唯一物种；保护它同时保存一条独立的蔷薇科演化支系。地图中的少量记录反映采集不足，不代表其余区域没有种群。\nAs the only species of Potaninia, it represents an entire rosaceous lineage; sparse records also reflect limited collecting effort.",
    humSub: "“绵刺”以手感和形态进入地方词汇 · Cottony and Thorny, in One Name",
    hum: "果实外的棉毛宿萼与刺状枝条共同构成“绵刺”之名。它不是抽象标签，而是野外接触时可见、可触的形态描述。\nCottony persistent calyces and spine-like branches make “Mian-ci” a tactile, descriptive field name rather than an abstract label.",
  },
  "Leptodermis ordosica": {
    latin: "Leptodermis ordosica H.C.Fu & E.W.Ma",
    range: "中国鄂尔多斯高原狭域特有 · Narrow endemic of the Ordos Plateau, China",
    noteSub: "狭域特有种的利用边界 · Use Propagated Material Only",
    note: "野外种群分布狭窄；园林引种、种子交换或科研取样应使用可追溯的人工繁殖材料，避免采挖野生母株。\nIts wild range is narrow. Cultivation, seed exchange and research sampling should use traceable propagated material, never excavated wild parent plants.",
    humSub: "ordosica 是一条写进拉丁名的产地记录 · Ordos Recorded in Latin",
    hum: "种加词 ordosica 直接指向鄂尔多斯。对地方植物志而言，学名不只用于分类，也留下了发现地与区域自然史的线索。\nThe epithet ordosica points directly to Ordos: a Latin name can also preserve a clue to place and local natural history.",
  },
  "Artemisia ordosica": {
    range: "中国北方沙地，核心在鄂尔多斯周边 · Northern Chinese sandy lands, centred on Ordos",
    noteSub: "耐沙埋不等于适合所有荒漠 · Sand-Burial Tolerance Has Limits",
    note: "鄂尔多斯蒿能在活动沙地萌蘖并耐受一定沙埋，但固沙配置仍需匹配当地种源、沙丘稳定度和水分条件，不能跨区套用。\nIt resprouts and tolerates some burial, but restoration must still match local provenance, dune mobility and water availability.",
    humSub: "治沙工程里的“鄂尔多斯蒿” · A Shrub in Sand-Recovery Practice",
    hum: "鄂尔多斯蒿是毛乌素等沙地恢复研究中的常见对象；固沙后，土壤、结皮和群落会继续改变，工程不是“种下就结束”。\nA familiar subject of Mu Us restoration studies, it shows that soil, crusts and communities keep changing after dunes are stabilized.",
  },
  "Artemisia sphaerocephala": {
    range: "蒙古与中国北方沙地 · Sandy regions of Mongolia and northern China",
    noteSub: "种子黏液是关键适沙结构 · Seed Mucilage Anchors Life in Sand",
    note: "种子遇水形成黏液层，可黏附沙粒并调节吸水；这是有实证的适沙特征，比笼统的“基因家族扩张”更适合公众理解。\nWhen wetted, the seed coat forms mucilage that binds sand and regulates hydration—a directly observed adaptation to mobile dunes.",
    humSub: "沙地种子也进入了食品材料研究 · Seed Gum as a Food Material",
    hum: "白沙蒿种子胶是天然多糖水胶体；研究已将其用于面制品质构、食品配料与包装材料。原料利用应优先采用规范来源。\nIts seed gum is a natural hydrocolloid studied for noodles, food ingredients and packaging; sourcing should be traceable and responsible.",
  },
  "Juniperus sabina": {
    range: "欧洲至中亚和东亚山地广布 · Widespread in mountains from Europe to East Asia",
    noteSub: "精油可致中毒，禁止自行内服 · Toxic Oil—Do Not Self-Medicate",
    note: "枝叶精油含多种有毒萜类，尤其富含 sabinyl acetate 的材料可造成严重刺激和器官损伤；不能把风险简单归因于 sabinene，也不应自行内服。\nIts foliage oil contains a toxic terpene mixture, often rich in sabinyl acetate; toxicity cannot be attributed to sabinene alone, and ingestion is unsafe.",
    humSub: "维吾尔医药文献中的历史记录 · A Record in Uyghur Medical History",
    hum: "文献记载其果实在新疆维吾尔医药中被称作“新疆圆柏实”，宋代《注医典》已有相关记录；历史使用不等于可自行服用。\nLiterature records its fruit in Uyghur medicine as Xinjiang yuanbai shi, with a Song-era text cited; historical use is not a safety endorsement.",
  },
  "Salix gordejevii": {
    range: "蒙古、俄罗斯东南部与中国北方沙地 · Mongolia, SE Russia and northern Chinese sands",
    noteSub: "河柳与沙柳不能只凭叶形判断 · Identify Willows with Flowers and Fruit",
    note: "黄柳与近缘柳属植物叶形变异和重叠明显；可靠鉴定应同时查看花序、苞片、子房毛被与生境，不能只看一张叶片照片。\nLeaf shape overlaps among related willows; reliable identification also needs catkins, bracts, ovary hairs and habitat.",
    humSub: "黄柳是科尔沁恢复工程的常用灌木 · A Horqin Restoration Shrub",
    hum: "黄柳被用于科尔沁沙地的沙丘复绿；研究也提示，迎风坡根系暴露后的水分胁迫会造成衰亡，工程需要持续管护。\nUsed in Horqin dune revegetation, it also shows why restoration needs follow-up: exposed roots on windward slopes can trigger water stress and dieback.",
  },
  "Caragana korshinskii": {
    range: "蒙古高原至中国北部和西北部 · Mongolian Plateau to northern and NW China",
    noteSub: "固氮灌木也受水分上限约束 · Nitrogen Fixation Does Not Create Water",
    note: "根瘤共生可增加氮输入，但在极干旱地过密栽植仍会加剧土壤水分消耗；恢复密度必须服从长期水量平衡。\nRoot nodules add nitrogen, but dense planting in very dry sites can still deplete soil water; restoration density must respect long-term water balance.",
    humSub: "防护带、饲草与氮循环的同一株灌木 · Shelterbelt and Forage Together",
    hum: "柠条在北方干旱半干旱区兼具防护带、固氮恢复和补充饲草用途；水分不足仍是栽植成活与经营强度的硬约束。\nIn dry northern China it serves as shelterbelt, nitrogen-fixing restoration shrub and supplementary forage, all constrained by water availability.",
  },
  "Reaumuria soongorica": {
    range: "中亚至中国西北和北部荒漠 · Deserts from Central Asia to northern and NW China",
    noteSub: "盐腺排盐，而非笼统“耐盐” · Salt Glands Make Tolerance Visible",
    note: "叶表盐腺能排出吸收的盐分，盐晶可在叶面出现；这是红砂适应盐渍荒漠的直接结构证据。\nLeaf salt glands excrete absorbed salts, sometimes leaving visible crystals—a structural basis for survival in saline deserts.",
    humSub: "荒漠植被调查中的建群灌木 · A Reference Shrub for Desert Monitoring",
    hum: "红砂常被作为戈壁—荒漠群落的建群或优势灌木记录。它在样地调查中的价值，是帮助人们比较放牧、干旱与恢复后的群落变化。\nOften recorded as a dominant desert shrub, it helps vegetation surveys compare how grazing, drought and restoration reshape a community.",
  },
  "Nitraria tangutorum": {
    range: "中国西北与北中部盐碱荒漠 · Saline deserts of NW and north-central China",
    noteSub: "白刺属鉴定需结合果核与分子证据 · Nitraria Needs Careful Identification",
    note: "白刺属种间形态重叠明显，单靠果色或灌丛外形容易误判；分布图仅采用匹配到唐古特白刺的记录。\nNitraria species overlap in appearance; fruit-stone characters and, where needed, molecular data are safer than fruit colour alone.",
    humSub: "盐碱地里的“沙漠樱桃” · A Saline-Land Wild Fruit",
    hum: "唐古特白刺成熟果可鲜食、制果酒和提取天然色素；地方利用说明盐碱荒漠并非“无产出”，但采收须保留自然更新的果实。\nIts ripe fruit is eaten, fermented and used for natural pigments—a local product of saline desert, provided harvest leaves fruit for regeneration.",
  },
  "Haloxylon ammodendron": {
    range: "中亚至中国西北荒漠 · Deserts of Central Asia and northwestern China",
    noteSub: "绿色嫩枝承担主要光合作用 · Green Shoots Replace Broad Leaves",
    note: "梭梭叶片退化成微小鳞片，主要光合作用由当年绿色嫩枝完成，从而降低蒸腾面积。它是肉苁蓉的重要寄主，但不应写成所有肉苁蓉的“唯一寄主”。\nTiny scale leaves reduce water loss while green current-year shoots photosynthesize; it is a major Cistanche host, not a universal sole host.",
    humSub: "梭梭林与肉苁蓉栽培的共生经济 · Saxaul and Cistanche Cultivation",
    hum: "肉苁蓉主要寄生梭梭根系，人工梭梭林因此连接防护林建设与药材栽培；寄生率受寄主种源和管理条件影响，并非必然成功。\nBecause Cistanche mainly parasitizes saxaul roots, planted stands link shelterbelts with cultivation—but success depends on host provenance and management.",
  },
  "Pugionium cornutum": {
    range: "蒙古与中国北方沙地 · Sandy lands of Mongolia and northern China",
    noteSub: "角状果实是可靠识别点 · Horned Fruits Confirm Identity",
    note: "成熟果实具有成对角状翅，是沙芥属重要识别特征；仅凭嫩叶无法排除其他十字花科植物。\nThe paired horn-like wings of mature fruits are diagnostic; young leaves alone cannot safely distinguish it from other brassicas.",
    humSub: "“沙芥”是被长期食用的荒漠野菜 · A Long-Used Desert Vegetable",
    hum: "沙芥既是固沙先锋植物，也被当地长期作为鲜食和腌制蔬菜；营养研究强调其膳食纤维、蛋白质和维生素，但不应以采挖替代栽培。\nA sand-fixing pioneer and long-used vegetable, it has been studied for fibre, protein and vitamins; cultivation is preferable to destructive wild harvest.",
  },
  "Tugarinovia mongolica": {
    range: "蒙古南部与中国内蒙古荒漠 · Deserts of southern Mongolia and Inner Mongolia, China",
    noteSub: "单型属，误采代价很高 · A Monotypic Genus with Little Margin for Loss",
    note: "革苞菊属仅含这一物种，局部种群损失会削弱整个属的遗传与形态多样性；稀少记录不能被解读为可采集。\nTugarinovia contains only this species, so loss of local populations erodes diversity across the whole genus; rarity is not permission to collect.",
    humSub: "1928 年发表的地方单型属 · A Local Monotypic Genus, Published in 1928",
    hum: "革苞菊属在 1928 年发表，现仅含这一物种及两个被接受的变种。它把一小片荒漠的地方自然史带入了全球植物分类体系。\nPublished in 1928, the genus has one species with two accepted varieties—local desert history carried into global plant classification.",
  },
  "Allium mongolicum": {
    range: "蒙古高原及中国北方干旱区 · Mongolian Plateau and arid northern China",
    noteSub: "可食用不等于可凭叶片采集 · Edible, but Identification Comes First",
    note: "无花、无鳞茎特征时，线形叶不足以可靠鉴定蒙古韭；野采还需避开道路、矿区和受污染土壤。\nLinear leaves alone are insufficient for identification without flowers and bulbs; collecting sites must also be free of road, mining and soil contamination.",
    humSub: "沙葱进入游牧饮食与调味传统 · A Steppe Allium in Local Foodways",
    hum: "蒙古韭又称沙葱；内蒙古民族植物学记录了野生葱属用于食物、饲草、药用和文化。嫩叶可作凉拌、腌制或配肉调味。\nKnown as sha cong, it belongs to wild Allium traditions of food, forage and culture; tender leaves are used fresh, pickled or with meat.",
  },
  "Cistanche deserticola": {
    range: "中国西北与蒙古荒漠中的寄生记录 · Parasitic records in NW China and Mongolian deserts",
    noteSub: "保护寄生植物必须同时保护寄主 · Protect the Host to Protect the Parasite",
    note: "肉苁蓉没有叶绿素，依靠吸器连接梭梭等寄主根系；只移栽花序或单独保存种子不能形成独立种群。\nLacking chlorophyll, it connects to host roots through a haustorium; conserving flowers or seeds alone cannot sustain a population without hosts.",
    humSub: "从野生药材到寄主协同栽培 · From Wild Collection to Host-Based Cultivation",
    hum: "肉苁蓉人工接种研究围绕种子萌发、吸器形成与梭梭幼根连接展开；可持续生产的单位不是一株药材，而是完整健康的寄主系统。\nCultivation follows seed germination, haustorium formation and attachment to young saxaul roots; the production unit is a healthy host system, not a lone stem.",
  },
  "Xanthoceras sorbifolium": {
    range: "原产中国北方，栽培记录更广 · Native to northern China, cultivated more widely",
    noteSub: "油用价值不等于全株可食 · Oil Crop Does Not Mean Every Part Is Food",
    note: "文冠果种仁可作为油料原料；果壳、种皮和压榨副产物含皂苷等成分，不宜作为常规食物或自行入药。\nIts kernels can be used as an oil raw material, while shells, seed coats and press residues contain saponins and are not ordinary food or self-medication.",
    humSub: "从花木到木本油料与生物柴油原料 · Ornamental Tree, Oil Crop, Biofuel",
    hum: "文冠果种仁油富含不饱和脂肪酸，可用于食用油研究，也被开发为生物柴油原料；不同产地种源的含油量和脂肪酸组成会变化。\nKernel oil is rich in unsaturated fatty acids and studied for food and biodiesel; oil yield and composition vary among provenances.",
  },
  "Prunus mongolica": {
    range: "蒙古南部与中国北方荒漠山地 · Desert mountains of southern Mongolia and northern China",
    noteSub: "它不是栽培扁桃的野生替代品 · Not a Wild Substitute for Almond",
    note: "蒙古扁桃果实小、果肉薄并密被毛，不能因中文名含“扁桃”就当作商品杏仁采食；可靠鉴定需结合枝刺、叶和核果。\nIts small, hairy drupes are not commercial almonds; identification should combine spines, leaves and fruit characters.",
    humSub: "荒漠扁桃是耐旱育种的野生基因库 · A Wild Resource for Drought Research",
    hum: "蒙古扁桃在戈壁极端干旱中表现出耐旱性；其基因组与转录组研究正为蔷薇属耐旱、脂肪酸等性状提供候选资源。\nIts Gobi drought tolerance makes it a genomic resource for Prunus research on water stress and fatty-acid traits, not a substitute for commercial almonds.",
  },
  "Nostoc flagelliforme": {
    range: "主要见于中国北方与西北干旱草原 · Mainly arid steppes of northern and NW China",
    noteSub: "它是蓝细菌，采集会剥伤地表 · A Cyanobacterium—Harvest Damages Soil",
    note: "发菜不是维管植物，而是陆生蓝细菌群体。传统搂采会破坏生物土壤结皮并加剧风蚀，中国已禁止采集、收购、加工和销售野生发菜。\nIt is a terrestrial cyanobacterial colony, not a vascular plant; raking damages biological soil crusts, and China prohibits wild collection and trade.",
    humSub: "从“发财”谐音到禁止采集的公共选择 · From Lucky Homophone to Protection",
    hum: "“发菜”曾因谐音“发财”进入节庆饮食。国务院 2000 年通知明确禁止采集，并取缔野生发菜收购、加工、销售和出口。\nIts lucky homophone once drove festive demand; a 2000 State Council notice banned wild harvest and its trade, processing and export.",
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

function mapDataUrl(pointMarkup, basePaths) {
  // The SVG intentionally contains map geometry only. Source, status and
  // legend stay in sec-range-caption, a normal editable text block below it.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 640" width="950" height="640">
<g fill="#e8dcc4" stroke="#8a7a5a" stroke-width="0.35">${basePaths}</g>
<g stroke="#b9a87e" stroke-width="0.55" stroke-dasharray="2 3" opacity="0.35"><line x1="0" y1="339.35" x2="950" y2="339.35"/><line x1="0" y1="258.61" x2="950" y2="258.61"/><line x1="0" y1="420.09" x2="950" y2="420.09"/></g>
<g>${pointMarkup}</g>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function cachedPointMarkup(svg) {
  const match =
    svg.match(/<g>([\s\S]*?)<\/g>\s*<g transform="translate\(0,640\)">/) ??
    svg.match(/<g>([\s\S]*?)<\/g>\s*<\/svg>/);
  if (!match) throw new Error("Unable to recover cached map points");
  // Teal means a quality-filtered GBIF occurrence whose establishment status
  // is unrecorded; grey is deliberately not used as a visual dead end.
  return match[1].replaceAll('fill="#64748b"', 'fill="#147d8b"');
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

  const baseQuery = new URLSearchParams({
    taxon_key: String(match.usageKey),
    has_coordinate: "true",
    has_geospatial_issue: "false",
    occurrence_status: "PRESENT",
  });
  // Query every known native-range country independently. Appending several
  // `country` parameters can be interpreted as a restrictive intersection by
  // APIs/proxies; that was why a widespread taxon such as Juniperus sabina
  // could acquire European dots while losing China altogether.
  const countries = rangeCountries[scientific]?.length ? rangeCountries[scientific] : [null];
  const pageSize = 80;
  const countryPages = await Promise.all(
    countries.map(async (country) => {
      const query = new URLSearchParams(baseQuery);
      if (country) query.set("country", country);
      const first = await fetchJson(`https://api.gbif.org/v1/occurrence/search?${query}&limit=${pageSize}&offset=0`);
      const count = Number(first.count ?? 0);
      if (count <= pageSize) return { count, pages: [first] };
      const middle = Math.floor(Math.max(0, count - pageSize) / (pageSize * 2)) * pageSize;
      const offsets = [...new Set([0, middle])];
      const pages = await Promise.all(
        offsets.map((offset) =>
          offset === 0
            ? first
            : fetchJson(`https://api.gbif.org/v1/occurrence/search?${query}&limit=${pageSize}&offset=${offset}`),
        ),
      );
      return { count, pages };
    }),
  );
  const count = countryPages.reduce((total, row) => total + row.count, 0);
  const pages = countryPages.flatMap((row) => row.pages);

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
  const manual = manualRangeMaps[scientific];
  const records = manual
    ? manual.points.map(([decimalLongitude, decimalLatitude]) => ({ decimalLongitude, decimalLatitude }))
    : [...cells.values()].slice(0, 100);
  const noVerifiedPoints = !records.length;
  if (noVerifiedPoints) {
    throw new Error(`No usable GBIF coordinates: ${scientific}`);
  }

  const circles = { native: [], introduced: [], unknown: [] };
  for (const row of records) {
    const x = 2.6865 * row.decimalLongitude + 449.3127;
    const y = -3.4451 * row.decimalLatitude + 339.3522;
    const means = String(row.establishmentMeans ?? "").toLowerCase();
    const kind = means.includes("introduced") ? "introduced" : means.includes("native") ? "native" : "unknown";
    const fill = kind === "native" ? "#3a7d2e" : kind === "introduced" ? "#d97706" : "#147d8b";
    circles[kind].push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.2" fill="${fill}" stroke="#fff" stroke-width="0.7" opacity="0.92"/>`);
  }
  const accepted = match.scientificName ?? scientific;
  return {
    dataUrl: mapDataUrl(
      `${circles.introduced.join("")}${circles.unknown.join("")}${circles.native.join("")}`,
      basePaths,
    ),
    ...(manual ? { source: manual.source } : { key: match.usageKey }),
    accepted,
    count: manual ? records.length : count,
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

let priorAudit = { pages: [] };
try {
  priorAudit = JSON.parse(await fs.readFile("content-audit-2026-07-13.json", "utf8"));
} catch {
  // A first-time audit has no historical metadata to preserve.
}
const priorMapMetadata = new Map((priorAudit.pages ?? []).map((row) => [row.scientific, row]));

const MAP_CAPTION =
  "青绿色点：参考分布范围内筛选的 GBIF 坐标；橙色点：GBIF 标注的引入记录。点位不等于连续边界；来源与日期可直接编辑。";

function mapCaption(map) {
  if (map?.source) {
    return `青绿色点：文献列举省域的代表位置（不是采集坐标）。数据：${map.source}，核查 ${ACCESSED}；点位不等于连续边界。`;
  }
  const provenance = map?.key
    ? `数据：GBIF taxonKey ${map.key}，参考分布国家筛选 ${map.count} 条记录，核查 ${ACCESSED}。`
    : "数据：GBIF 坐标记录，核查日期可直接编辑。";
  return `青绿色点：GBIF 未标注建立状态的参考范围内记录；橙色点：GBIF 标注的引入记录。${provenance} 点位不等于连续边界。`;
}

function pageCommonName(page) {
  const title = findText(page, "title")?.text ?? page.name;
  return title.replace(/\s+/g, "").replace(/^封面·/, "") || page.name;
}

function setSpeciesImageLabels(page, scientific) {
  const common = pageCommonName(page);
  const slot = (id) => {
    if (id.includes("img-map")) return "全球分布记录图";
    if (id.includes("img-main")) return "主图：植株、叶、花或果实";
    if (id.includes("season-img-1")) return "春季物候";
    if (id.includes("season-img-2")) return "夏季物候";
    if (id.includes("season-img-3")) return "秋季物候";
    if (id.includes("season-img-4")) return "冬季物候";
    if (id.includes("trait-img")) return "识别特征图";
    if (id.includes("sim-img")) return "相似种对照图";
    if (id.includes("img-habitat")) return "典型生境";
    if (id.includes("img-humanities")) return "生活、生产或地方知识相关图";
    return "物种相关配图";
  };
  for (const block of page.blocks) {
    if (block.type === "image") block.label = `${common}（${scientific}）${slot(block.id)}`;
  }
}

function ensureRangeCaption(page) {
  const existing = findText(page, "sec-range-caption");
  if (existing) return existing;
  const mapBlock = page.blocks.find((block) => block.type === "image" && block.id.includes("img-map"));
  if (!mapBlock) throw new Error(`Missing map block on ${page.name}`);
  const suffix = mapBlock.id.slice("img-map".length);
  const caption = {
    id: `sec-range-caption${suffix}`,
    type: "text",
    x: mapBlock.x,
    y: mapBlock.y + mapBlock.h + 10,
    w: mapBlock.w,
    text: MAP_CAPTION,
    fontSize: 10,
    color: "#7a6f5f",
    fontWeight: 400,
    fontFamily: "sans",
    lineHeight: 1.4,
  };
  const mapIndex = page.blocks.indexOf(mapBlock);
  page.blocks.splice(mapIndex + 1, 0, caption);
  return caption;
}

let cachedMaps = {};
try {
  cachedMaps = JSON.parse(await fs.readFile(CACHE, "utf8"));
} catch {
  // The first pass starts with an empty cache.
}
const maps = new Map(Object.entries(cachedMaps));
// Older runs wrote completed SVGs directly into the state file but did not
// retain the optional cache. Reuse those verified coordinates rather than
// forcing another 20-taxon GBIF fetch merely to change map presentation.
if (maps.size === 0) {
  for (const page of state.pages) {
    const scientific = scientificName(page);
    const mapBlock = page.blocks.find((block) => block.type === "image" && block.id.includes("img-map"));
    if (!scientific || !mapBlock?.src) continue;
    const svg = Buffer.from(mapBlock.src.split(",")[1], "base64").toString("utf8");
    const prior = priorMapMetadata.get(scientific);
    const key = prior?.key ?? svg.match(/GBIF taxonKey\s+(\d+)/i)?.[1] ?? null;
    const count = prior?.count ?? Number(svg.match(/taxonKey\s+\d+;\s+(\d+)\s+records/i)?.[1] ?? 0);
    maps.set(scientific, {
      dataUrl: mapBlock.src,
      key,
      accepted: prior?.accepted ?? scientific,
      count,
      plotted: prior?.plotted ?? 0,
    });
  }
}
const forceTaxa = new Set((process.env.FORCE_TAXA ?? "").split(",").map((name) => name.trim()).filter(Boolean));
for (const scientific of forceTaxa) maps.delete(scientific);
for (const [scientific, map] of maps) {
  const svg = Buffer.from(map.dataUrl.split(",")[1], "base64").toString("utf8");
  maps.set(scientific, {
    ...map,
    dataUrl: mapDataUrl(cachedPointMarkup(svg), basePaths),
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
  // These location captions were templated and repeated. The habitat paragraph
  // and its editable ecological fields remain; only the redundant pseudo-photo
  // caption is removed.
  page.blocks = page.blocks.filter(
    (block) => !(block.type === "text" && (block.id === "sec-habitat-cap" || block.id.startsWith("sec-habitat-cap-"))),
  );
  ensureRangeCaption(page);
  const rangeMap = maps.get(scientific);
  if (!rangeMap) throw new Error(`Missing map data for ${page.name}`);
  const replacements = {
    "sec-range-sub": reviewed.range,
    "sec-range-caption": mapCaption(rangeMap),
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
  const caption = findText(page, "sec-range-caption");
  caption.fontSize = 10;
  caption.lineHeight = 1.4;
  setSpeciesImageLabels(page, scientific);
  const mapBlock = page.blocks.find((b) => b.type === "image" && b.id.includes("img-map"));
  if (!mapBlock) throw new Error(`Missing map image on ${page.name}`);
  mapBlock.src = rangeMap.dataUrl;
  audit.push({ page: page.name, scientific, ...rangeMap });
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
  `${JSON.stringify({ accessed: ACCESSED, mapMethod: "GBIF occurrence/search; each known native-range country queried independently; PRESENT; coordinate=true; geospatial_issue=false; first and middle pages; 3-degree grid deduplication", pages: audit.map(({ dataUrl, ...row }) => row) }, null, 2)}\n`,
);
console.log(`Updated ${state.pages.length} pages / ${maps.size} taxa.`);
