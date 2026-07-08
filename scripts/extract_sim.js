const fs = require('fs');

const data = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

const simTexts = [];

data.pages.forEach((p, i) => {
  p.blocks.filter(b => b.type === 'text' && (b.id.includes('sim-1-body') || b.id.includes('sim-2-body'))).forEach(b => {
    if (!/[a-zA-Z]/.test(b.text)) {
      simTexts.push({
        pageIndex: i,
        blockId: b.id,
        text: b.text
      });
    }
  });
});

fs.writeFileSync('texts_to_translate_sim.json', JSON.stringify(simTexts, null, 2));
console.log('Saved ' + simTexts.length + ' strings to translate.');
