const fs = require('fs');

const data = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

// 1. Remove map caption text
const captionText = "红点为154个经筛选GBIF记录；黄色为Kew POWO及中国研究支持的粗略原生范围，不是精确边界。\nRed dots indicate 154 filtered GBIF records; yellow shading represents the approximate native range supported by Kew POWO and Chinese research, not an exact boundary.";

// 2. Phenology text to replace
const defaultPhenology = "砾坡一岁\nFrom new shoots to winter cushion";

// specific phenology logic:
const phenologyMap = [
  "砾坡一岁\nFrom new shoots to winter cushion", // 0: 半日花
  "荒漠遗痕\nAncient survivor in the desert", // 1: 四合木
  "沙海绿洲\nEvergreen oasis in the sand", // 2: 蒙古沙冬青
  "戈壁刺甲\nThorny armor of the Gobi", // 3: 绵刺
  "幽香荒原\nFragrance of the barren land", // 4: 鄂尔多斯野丁香
  "流沙固主\nGuardian of the shifting sands", // 5: 鄂尔多斯蒿
  "沙海飞蓬\nFlying canopy of the sand sea", // 6: 白沙蒿
  "匍匐翠柏\nCreeping emerald of the dunes", // 7: 叉子圆柏
  "金黄柳色\nGolden hues of the sandy willow", // 8: 黄柳
  "锦鸡迎春\nGolden blooms greeting spring", // 9: 柠条锦鸡儿
  "红砂碧叶\nRed sands and jade leaves", // 10: 红砂
  "白刺红果\nRed berries among white thorns", // 11: 唐古特白刺
  "大漠梭影\nSilhouette of the vast desert", // 12: 梭梭
  "沙海翠芥\nEmerald mustard of the sands", // 13: 沙芥
  "革苞傲霜\nLeathery bracts braving the frost", // 14: 革苞菊
  "草原葱香\nOnion scent of the steppe", // 15: 蒙古韭
  "沙漠人参\nGinseng of the desert", // 16: 肉苁蓉
  "文冠花开\nBlossoms of the yellowhorn", // 17: 文冠果
  "粉桃迎春\nPink peach welcoming spring", // 18: 蒙古扁桃
  "荒漠黑金\nBlack gold of the wasteland" // 19: 发菜
];

data.pages.forEach((page, i) => {
  page.blocks.forEach(block => {
    if (block.type === 'text') {
      // 1. Remove map caption
      if (block.text === captionText || block.text.includes("Red dots indicate 154 filtered GBIF records")) {
        block.text = "";
      }
      
      // 4. Fix phenology
      if (block.id.includes('sec-season-sub')) {
        block.text = phenologyMap[i];
      }
    }
  });
});

// 2 & 3 & 4. Fix 半日花 (Page 0)
const p0 = data.pages[0];
p0.blocks.forEach(block => {
  if (block.id.includes('sec-sim-body')) {
    block.text = "新疆半日花（H. xinjiangense）：分布于新疆，叶片略宽，花期稍晚。\nXinjiang Sunrose (H. xinjiangense): Distributed in Xinjiang, with slightly wider leaves and a later flowering period.";
  }
  if (block.id.includes('sec-human-body')) {
    block.text = "半日花是古地中海植物区系的孑遗物种，见证了亚洲中部旱化的历史，具有极高的科学研究价值。其“半日即谢”的特性也常被赋予珍惜时光的文化意蕴。\nAs a relict species of the ancient Mediterranean flora, it witnesses the aridification of Central Asia and holds high scientific value. Its \"half-day blooming\" is often associated with the cultural meaning of cherishing time.";
  }
  if (block.id.includes('sec-notes-body')) {
    block.text = "最新研究表明，半日花在极端干旱胁迫下会快速启动特定的抗旱基因网络，这为其在未来气候变化下的适应性进化提供了分子层面的证据。目前已被列为国家二级重点保护野生植物。\nRecent studies show it rapidly activates specific drought-resistance gene networks under extreme stress, providing molecular evidence for its adaptive evolution under climate change. It is listed as a Class II state-protected plant.";
  }
});

fs.writeFileSync('banrihua-editor-20plants.json', JSON.stringify(data, null, 2));
console.log('Fixed content issues');
