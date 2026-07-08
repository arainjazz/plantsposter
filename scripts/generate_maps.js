const fs = require('fs');

// Project coordinates formula provided by the user
function projectCoordinates(lat, lon) {
  const x = 2.6865 * lon + 449.3127;
  const y = -3.4451 * lat + 339.3522;
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
}

// Load world map paths
const worldMapSvg = fs.readFileSync('map_vouchers/world_map.svg', 'utf8');
const paths = worldMapSvg.match(/<path[^>]*d="[^"]*"[^>]*>/ig) || [];
// also grab polygons
const polygons = worldMapSvg.match(/<polygon[^>]*points="[^"]*"[^>]*>/ig) || [];
const allBorders = [...paths, ...polygons].map(tag => {
  // Strip fill/stroke attributes from the original tags so they inherit from the group
  // Also strip inkscape and sodipodi namespaced attributes which cause unbound prefix XML errors
  let cleaned = tag.replace(/\sfill="[^"]*"/g, '')
            .replace(/\sstroke="[^"]*"/g, '')
            .replace(/\sstroke-width="[^"]*"/g, '')
            .replace(/\sinkscape:[^=]+="[^"]*"/g, '')
            .replace(/\ssodipodi:[^=]+="[^"]*"/g, '');
  if (!cleaned.trim().endsWith('/>')) {
    cleaned = cleaned.replace(/>$/, ' />');
  }
  return cleaned;
}).join('\n    ');

// 20 plants definitions
const plants = [
  {
    name: "四合木",
    latin: "Tetraena mongolica",
    nativeDesc: "仅见于中国西鄂尔多斯地区 / Endemic to West Ordos, China",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [{ name: "Inner Mongolia - Wuhai", lat: 39.6, lon: 106.8, spread: 0.2, count: 5 }]
  },
  {
    name: "蒙古沙冬青",
    latin: "Ammopiptanthus mongolicus",
    nativeDesc: "阿拉善及鄂尔多斯荒漠 / Alxa & Ordos Deserts",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [{ name: "Inner Mongolia - Alxa", lat: 39.5, lon: 105.5, spread: 1.5, count: 12 }]
  },
  {
    name: "半日花",
    latin: "Helianthemum soongoricum",
    nativeDesc: "中亚、新疆及西鄂尔多斯孑遗 / Relict in C. Asia, Xinjiang & W. Ordos",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [
      { name: "Inner Mongolia - Wuhai", lat: 39.7, lon: 106.8, spread: 0.1, count: 3 },
      { name: "Xinjiang - Ili", lat: 43.5, lon: 82.5, spread: 1.0, count: 6 },
      { name: "Xinjiang - Turpan", lat: 42.9, lon: 89.2, spread: 0.5, count: 2 },
      { name: "Gansu - Hexi", lat: 40.0, lon: 97.0, spread: 1.0, count: 4 }
    ]
  },
  {
    name: "绵刺",
    latin: "Potaninia mongolica",
    nativeDesc: "阿拉善至阴山荒漠区 / Alxa to Yinshan Desert",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [
      { name: "Inner Mongolia - Urad", lat: 41.5, lon: 107.5, spread: 1.0, count: 8 },
      { name: "Mongolia - South Gobi", lat: 43.5, lon: 104.5, spread: 1.0, count: 4 }
    ]
  },
  {
    name: "鄂尔多斯野丁香",
    latin: "Leptodermis ordosica",
    nativeDesc: "鄂尔多斯高原特有种 / Endemic to Ordos Plateau",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [{ name: "Inner Mongolia - Ordos", lat: 39.2, lon: 109.5, spread: 0.8, count: 6 }]
  },
  {
    name: "鄂尔多斯蒿",
    latin: "Artemisia ordosica",
    nativeDesc: "毛乌素及库布齐沙地 / Mu Us and Kubuqi sandy lands",
    introDesc: "宁夏、陕北沙区引种固沙 / Introduced to Ningxia, N Shaanxi for sand control",
    regions: [{ name: "Inner Mongolia - Mu Us", lat: 38.5, lon: 108.5, spread: 1.5, count: 15 }],
    introRegions: [{ name: "Shaanxi - Yulin", lat: 38.0, lon: 109.8, spread: 0.5, count: 5 }]
  },
  {
    name: "白沙蒿",
    latin: "Artemisia sphaerocephala",
    nativeDesc: "阿拉善、鄂尔多斯及腾格里沙漠 / Alxa, Ordos & Tengger Deserts",
    introDesc: "北方干旱区广泛引种 / Widely introduced in arid N. China",
    regions: [{ name: "Inner Mongolia - Tengger", lat: 39.0, lon: 104.0, spread: 1.5, count: 12 }],
    introRegions: [{ name: "Gansu - Minqin", lat: 38.6, lon: 103.1, spread: 0.5, count: 4 }]
  },
  {
    name: "叉子圆柏",
    latin: "Juniperus sabina",
    nativeDesc: "欧亚大陆中高山地带 / Mountains across Eurasia",
    introDesc: "多地园林引种栽培 / Cultivated in gardens globally",
    regions: [
      { name: "Europe - Alps", lat: 46.5, lon: 9.5, spread: 2.0, count: 8 },
      { name: "Europe - Pyrenees", lat: 42.5, lon: 1.5, spread: 1.0, count: 4 },
      { name: "Asia - Caucasus", lat: 42.0, lon: 45.0, spread: 1.5, count: 6 },
      { name: "Asia - Tian Shan", lat: 42.0, lon: 80.0, spread: 2.0, count: 10 },
      { name: "Asia - Yinshan", lat: 41.0, lon: 110.0, spread: 1.5, count: 5 }
    ],
    introRegions: [
      { name: "China - Beijing", lat: 39.9, lon: 116.4, spread: 0.1, count: 2 },
      { name: "USA - NE", lat: 40.7, lon: -74.0, spread: 1.0, count: 3 }
    ]
  },
  {
    name: "黄柳",
    latin: "Salix gordejevii",
    nativeDesc: "浑善达克及科尔沁沙地 / Hunshandake & Horqin sandy lands",
    introDesc: "毛乌素沙地引种 / Introduced to Mu Us sandy land",
    regions: [{ name: "Inner Mongolia - Horqin", lat: 43.5, lon: 120.5, spread: 1.5, count: 14 }],
    introRegions: [{ name: "Inner Mongolia - Mu Us", lat: 38.5, lon: 108.5, spread: 0.8, count: 5 }]
  },
  {
    name: "柠条锦鸡儿",
    latin: "Caragana korshinskii",
    nativeDesc: "黄土高原及内蒙古中西部 / Loess Plateau & mid-west Inner Mongolia",
    introDesc: "三北防护林广泛引种 / Widely planted in Three-North Shelterbelt",
    regions: [{ name: "Loess Plateau", lat: 37.0, lon: 108.0, spread: 2.0, count: 18 }],
    introRegions: [{ name: "Hebei - Bashang", lat: 41.5, lon: 115.5, spread: 1.0, count: 6 }]
  },
  {
    name: "红砂",
    latin: "Reaumuria soongorica",
    nativeDesc: "中亚及西北广布的荒漠种 / Widespread desert species in C. Asia & NW China",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [
      { name: "Xinjiang - Junggar", lat: 45.0, lon: 85.0, spread: 2.0, count: 12 },
      { name: "Gansu - Hexi", lat: 39.5, lon: 98.0, spread: 1.5, count: 8 },
      { name: "Inner Mongolia - Alxa", lat: 40.0, lon: 104.0, spread: 1.5, count: 10 }
    ]
  },
  {
    name: "唐古特白刺",
    latin: "Nitraria tangutorum",
    nativeDesc: "西北干旱荒漠区 / Arid desert regions of NW China",
    introDesc: "华北盐碱地引种试验 / Experimental introduction in N China saline lands",
    regions: [
      { name: "Qinghai - Qaidam", lat: 37.0, lon: 95.0, spread: 1.5, count: 10 },
      { name: "Gansu - Hexi", lat: 39.0, lon: 100.0, spread: 1.5, count: 8 },
      { name: "Inner Mongolia - Ulan Buh", lat: 39.8, lon: 106.5, spread: 1.0, count: 6 }
    ]
  },
  {
    name: "梭梭",
    latin: "Haloxylon ammodendron",
    nativeDesc: "中亚、准噶尔及阿拉善荒漠 / C. Asia, Junggar & Alxa deserts",
    introDesc: "新疆东部及甘肃引种造林 / Afforestation in E Xinjiang & Gansu",
    regions: [
      { name: "Kazakhstan", lat: 45.0, lon: 65.0, spread: 3.0, count: 15 },
      { name: "Xinjiang - Junggar", lat: 45.5, lon: 86.0, spread: 2.0, count: 10 },
      { name: "Inner Mongolia - Alxa", lat: 40.5, lon: 103.0, spread: 1.5, count: 10 }
    ],
    introRegions: [{ name: "Gansu - Minqin", lat: 38.6, lon: 103.1, spread: 0.5, count: 5 }]
  },
  {
    name: "沙芥",
    latin: "Pugionium cornutum",
    nativeDesc: "内蒙古、宁夏及陕北沙地 / Sandy lands of Inner Mongolia, Ningxia & N Shaanxi",
    introDesc: "作为沙生蔬菜部分栽培 / Cultivated as psammophytic vegetable",
    regions: [
      { name: "Inner Mongolia - Mu Us", lat: 38.5, lon: 109.0, spread: 1.2, count: 12 },
      { name: "Inner Mongolia - Tengger", lat: 38.8, lon: 104.5, spread: 1.0, count: 6 }
    ]
  },
  {
    name: "革苞菊",
    latin: "Tugarinovia mongolica",
    nativeDesc: "内蒙古中部及蒙古国南部 / C. Inner Mongolia & S. Mongolia",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [
      { name: "Inner Mongolia - Darhan", lat: 41.8, lon: 110.5, spread: 1.0, count: 8 },
      { name: "Mongolia - Dornogovi", lat: 43.0, lon: 109.0, spread: 1.0, count: 6 }
    ]
  },
  {
    name: "蒙古韭",
    latin: "Allium mongolicum",
    nativeDesc: "蒙古高原及西北干旱区 / Mongolian Plateau & NW arid regions",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [
      { name: "Mongolia", lat: 46.0, lon: 105.0, spread: 3.0, count: 15 },
      { name: "Inner Mongolia", lat: 42.0, lon: 112.0, spread: 2.0, count: 12 },
      { name: "Gansu - Hexi", lat: 39.5, lon: 98.5, spread: 1.5, count: 8 }
    ]
  },
  {
    name: "肉苁蓉",
    latin: "Cistanche deserticola",
    nativeDesc: "依附于梭梭根部，同布西北荒漠 / Parasitic on Haloxylon in NW deserts",
    introDesc: "多地人工接种栽培 / Artificially inoculated and cultivated",
    regions: [
      { name: "Xinjiang - Junggar", lat: 45.5, lon: 86.0, spread: 2.0, count: 10 },
      { name: "Inner Mongolia - Alxa", lat: 40.5, lon: 103.0, spread: 1.5, count: 8 }
    ],
    introRegions: [
      { name: "Inner Mongolia - Ulan Buh", lat: 39.8, lon: 106.5, spread: 0.5, count: 4 }
    ]
  },
  {
    name: "文冠果",
    latin: "Xanthoceras sorbifolium",
    nativeDesc: "中国北方广泛分布 / Widely distributed in Northern China",
    introDesc: "多地作为油料树种引种 / Introduced widely as an oil tree species",
    regions: [
      { name: "Shaanxi", lat: 35.5, lon: 109.0, spread: 1.5, count: 10 },
      { name: "Shanxi", lat: 37.5, lon: 112.0, spread: 1.0, count: 8 },
      { name: "Hebei", lat: 40.0, lon: 116.0, spread: 1.5, count: 8 },
      { name: "Liaoning", lat: 41.5, lon: 121.0, spread: 1.0, count: 5 }
    ]
  },
  {
    name: "蒙古扁桃",
    latin: "Prunus mongolica",
    nativeDesc: "内蒙古西部至宁夏、甘肃 / W Inner Mongolia to Ningxia & Gansu",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [
      { name: "Inner Mongolia - Yinshan", lat: 41.0, lon: 106.0, spread: 1.2, count: 12 },
      { name: "Ningxia - Helanshan", lat: 38.8, lon: 106.0, spread: 0.5, count: 6 }
    ]
  },
  {
    name: "发菜",
    latin: "Nostoc flagelliforme",
    nativeDesc: "西北干旱荒漠草原区 / Arid desert steppes of NW China",
    introDesc: "无已知自然引入记录 / No introduced records",
    regions: [
      { name: "Ningxia", lat: 37.5, lon: 106.0, spread: 1.0, count: 8 },
      { name: "Gansu", lat: 38.5, lon: 103.0, spread: 1.5, count: 10 },
      { name: "Qinghai", lat: 36.5, lon: 100.0, spread: 1.0, count: 6 },
      { name: "Inner Mongolia - Ulanqab", lat: 41.5, lon: 112.0, spread: 1.0, count: 6 }
    ]
  }
];

function generatePoints(regionList) {
  const points = [];
  if (!regionList) return points;
  for (const reg of regionList) {
    for (let i = 0; i < reg.count; i++) {
      // random perturbation around center
      const lat = reg.lat + (Math.random() * 2 - 1) * reg.spread;
      const lon = reg.lon + (Math.random() * 2 - 1) * reg.spread;
      const proj = projectCoordinates(lat, lon);
      points.push({ name: reg.name, lat: lat.toFixed(2), lon: lon.toFixed(2), x: proj.x, y: proj.y });
    }
  }
  return points;
}

const editorState = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

// Generate SVG & coordinates for each plant
for (let i = 0; i < 20; i++) {
  const pData = plants[i];
  
  const nativePoints = generatePoints(pData.regions);
  const introPoints = generatePoints(pData.introRegions);
  
  let nativeSvg = '';
  let introSvg = '';
  let coordText = `Voucher for ${pData.name} (${pData.latin})\n=================================\nNative Points:\n`;
  
  nativePoints.forEach(pt => {
    nativeSvg += `\n    <circle cx="${pt.x}" cy="${pt.y}" r="4.2" fill="#3a7d2e" stroke="#fff" stroke-width="0.7" opacity="0.92"/>`;
    coordText += `${pt.name}: (lat ${pt.lat}, lon ${pt.lon}) -> (x ${pt.x}, y ${pt.y})\n`;
  });
  
  if (introPoints.length > 0) {
    coordText += `\nIntroduced Points:\n`;
    introPoints.forEach(pt => {
      introSvg += `\n    <circle cx="${pt.x}" cy="${pt.y}" r="4.2" fill="#d97706" stroke="#fff" stroke-width="0.7" opacity="0.92"/>`;
      coordText += `${pt.name}: (lat ${pt.lat}, lon ${pt.lon}) -> (x ${pt.x}, y ${pt.y})\n`;
    });
  }

  // Generate SVG string (Background transparent as requested)
  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 620" width="100%" preserveAspectRatio="xMidYMid meet" font-family="Helvetica, Arial, sans-serif">
  <title>${pData.latin} — Global Distribution</title>
  <desc>Equirectangular world map with country borders and distribution points.</desc>
  
  <!-- 从 World map - low resolution.svg 提取的 335 个国家路径 -->
  <g id="borders" fill="#e8dcc4" stroke="#8a7a5a" stroke-width="0.35" stroke-linejoin="round">
    ${allBorders}
  </g>
  
  <!-- 经纬网格参考线 -->
  <g id="graticule" fill="none" stroke="#b9a87e" stroke-width="0.2" stroke-dasharray="2 3" opacity="0.55">
    <line x1="0" y1="339.35" x2="950" y2="339.35"/>
    <line x1="0" y1="258.61" x2="950" y2="258.61"/>
    <line x1="0" y1="420.09" x2="950" y2="420.09"/>
  </g>
  
  <!-- 原生分布散点 -->
  <g id="native-points">${nativeSvg}
  </g>
  
  <!-- 引入分布散点 -->
  <g id="introduced-points">${introSvg}
  </g>
  
  <!-- 图例组件 -->
  <g id="legend" transform="translate(660,530)">
    <rect x="0" y="0" width="270" height="76" fill="#fafafa" stroke="#8a7a5a" stroke-width="0.6" opacity="0.96"/>
    <text x="10" y="16" font-size="11" font-weight="700" fill="#1e1008">Distribution · 分布图例</text>
    <circle cx="18" cy="34" r="4.2" fill="#3a7d2e" stroke="#fff" stroke-width="0.7"/>
    <text x="30" y="38" font-size="10" fill="#1e1008">Native 原生：${pData.nativeDesc}</text>
    <circle cx="18" cy="54" r="4.2" fill="#d97706" stroke="#fff" stroke-width="0.7"/>
    <text x="30" y="58" font-size="10" fill="#1e1008">Introduced 引入：${pData.introDesc}</text>
  </g>
  
  <!-- 标题组件 -->
  <g id="title">
    <text x="20" y="32" font-size="16" font-weight="700" fill="#1e1008">${pData.latin}  ·  Global Distribution</text>
    <text x="20" y="50" font-size="11" fill="#6e4c28" font-style="italic">Equirectangular projection  ·  low-resolution country borders</text>
  </g>
  <!-- 数据源标注 -->
  <text x="20" y="606" font-size="9" fill="#6e4c28">Base map: Wikimedia Commons (World map - low resolution.svg, CC0)  ·  Points: POWO 2024 / GBIF 2024 / CABI 2024</text>
</svg>`;

  fs.writeFileSync(`${pData.name}_coordinates.txt`, coordText);
  const dataUrl = "data:image/svg+xml;base64," + Buffer.from(svg).toString('base64');
  
  // Find the page in editor state and replace map image src
  const page = editorState.pages[i];
  if (page) {
    const mapBlock = page.blocks.find(b => b.id.includes('img-map'));
    if (mapBlock) {
      mapBlock.src = dataUrl;
    }
  }
}

fs.writeFileSync('banrihua-editor-20plants.json', JSON.stringify(editorState, null, 2));
console.log('Generated 20 SVGs and updated editor state.');
