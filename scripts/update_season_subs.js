const fs = require('fs');

const data = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

const seasonSubs = [
  "砾坡一岁  from new shoots to winter cushion", // 0: 半日花
  "残遗一岁  a relic's seasonal journey", // 1: 四合木
  "严冬常绿  an evergreen presence in the desert", // 2: 蒙古沙冬青
  "荒漠顽生  from spring awakening to winter dormancy", // 3: 绵刺
  "灌丛岁月  seasonal rhythm of the desert lilac", // 4: 鄂尔多斯野丁香
  "沙丘先锋  a pioneer's journey through the seasons", // 5: 鄂尔多斯蒿
  "固沙一生  stabilizing the sands year-round", // 6: 白沙蒿
  "岩石常青  evergreen foliage against the harsh winter", // 7: 叉子圆柏
  "迎风抽枝  sprouting against the desert winds", // 8: 黄柳
  "旱地金黄  a golden display in the arid landscape", // 9: 柠条锦鸡儿
  "盐碱求生  surviving the saline-alkali extremes", // 10: 红砂
  "沙漠红果  from spring blooms to autumn berries", // 11: 唐古特白刺
  "荒漠脊梁  the backbone of the desert through four seasons", // 12: 梭梭
  "旱地绿意  green shoots amidst the arid sands", // 13: 沙芥
  "砾石花开  blooming on the gravel slopes", // 14: 革苞菊
  "原野葱茏  wild flavors of the desert steppe", // 15: 蒙古韭
  "沙海寄生  a parasitic journey under the sand", // 16: 肉苁蓉
  "花果一岁  from blossoms to oil-rich seeds", // 17: 文冠果
  "旱谷春华  spring blooms in the arid valleys", // 18: 蒙古扁桃
  "随雨复苏  awakening with the desert rains"  // 19: 发菜
];

data.pages.forEach((page, index) => {
  const block = page.blocks.find(b => b.id.includes('sec-season-sub'));
  if (block) {
    block.text = seasonSubs[index] || seasonSubs[0];
  }
});

fs.writeFileSync('banrihua-editor-20plants.json', JSON.stringify(data, null, 2));
console.log('Successfully updated season subs!');
