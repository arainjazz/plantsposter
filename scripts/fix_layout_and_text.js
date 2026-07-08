const fs = require('fs');

const data = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

// 1. Remove sec-range-caption from all pages
data.pages.forEach(page => {
  page.blocks = page.blocks.filter(b => !b.id.includes('sec-range-caption'));
});

// 2. Fix page 0 (半日花)
const page0 = data.pages[0];
const p0Blocks = page0.blocks;

function updateBlock(id, newText) {
  const block = p0Blocks.find(b => b.id.includes(id));
  if (block) {
    block.text = newText;
  }
}

updateBlock('sim-1-body', '花瓣宽楔形、橘黄色，干后不变色；萼片3条褐色纵肋；花期花梗下弯。\\nPetals broadly cuneate, orange-yellow, not changing color when dry; sepals with 3 brown ribs; pedicels reflexed during anthesis.');
updateBlock('sim-2-body', '花瓣倒卵形，鲜黄、干后淡粉红；萼片5条绿色纵肋；花期花梗直立。\\nPetals obovate, bright yellow, turning pale pink when dry; sepals with 5 green ribs; pedicels erect during anthesis.');
updateBlock('sec-hum-body', "核心区｜西鄂尔多斯南部设“半日花核心区”，保护完整荒漠群落。\\n谱系｜伊犁与西鄂尔多斯种群显著分化，需分别监测。\\nCore Area | A 'Helianthemum Core Area' is established in southern Ordos to protect the intact desert community.\\nLineage | The Ili and western Ordos populations are significantly differentiated and require separate monitoring.");
updateBlock('sec-note-sub', '古地中海退却的生命遗存 · A Living Relic of the Retreating Tethys Sea');
updateBlock('sec-note-body', '半日花是古地中海（特提斯海）沿岸植物区系退却后遗留下来的残遗种。在距今千万年的地质变迁与气候干旱化过程中，它顽强地在鄂尔多斯高原的荒漠环境中存活至今，对研究亚洲中部荒漠植被起源和古地理环境变迁具有不可估量的科学价值。\\nHelianthemum songaricum is a relict species left behind by the retreat of the ancient Mediterranean (Tethys) flora. Over tens of millions of years of geological changes and climatic aridification, it has stubbornly survived in the desert environment of the Ordos Plateau. It holds immeasurable scientific value for studying the origin of desert vegetation in Central Asia and paleogeographic environmental changes.');

// 3. Adjust font sizes to prevent overlap on all pages
data.pages.forEach(page => {
  page.blocks.forEach(block => {
    if (block.type !== 'text') return;
    
    const id = block.id;
    const len = block.text ? block.text.length : 0;
    
    if (id.includes('sec-habitat-body') && len > 120) {
      block.fontSize = 9;
      block.lineHeight = 1.3;
    } else if (id.includes('sec-hum-body') && len > 120) {
      block.fontSize = 9;
      block.lineHeight = 1.3;
    } else if (id.includes('sec-note-body') && len > 120) {
      block.fontSize = 9;
      block.lineHeight = 1.3;
    } else if (id.includes('sec-season-body') && len > 120) {
      block.fontSize = 9;
      block.lineHeight = 1.3;
    } else if (id.includes('trait-') && id.includes('-body') && len > 80) {
      block.fontSize = 8;
      block.lineHeight = 1.3;
    } else if (id.includes('sim-') && id.includes('-body') && len > 60) {
      block.fontSize = 8;
      block.lineHeight = 1.3;
    } else if (id.includes('desc') && !id.includes('-en') && len > 100) {
      block.fontSize = 11;
      block.lineHeight = 1.4;
    } else if (id.includes('desc-en') && len > 200) {
      block.fontSize = 10;
      block.lineHeight = 1.4;
    }
  });
});

fs.writeFileSync('banrihua-editor-20plants.json', JSON.stringify(data, null, 2));
console.log('Successfully applied all fixes!');
