const fs = require('fs');
const data = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

const bilingualFields = [
  'trait-1-body', 'trait-2-body', 'trait-3-body', 'trait-4-body',
  'eco-1-v', 'eco-2-v', 'eco-3-v', 'eco-4-v', 'eco-5-v',
  'sec-note-sub', 'sec-note-body',
  'sec-habitat-sub', 'sec-range-sub',
  'sec-hum-sub'
];

data.pages.slice(1).forEach((page, i) => {
  const texts = page.blocks.filter(b => b.type === 'text').map(b => ({ id: b.id.split('-c')[0], text: b.text }));
  
  let hasMissing = false;
  let missingInfo = [];
  texts.forEach(t => {
    if (bilingualFields.includes(t.id)) {
      // Check if it lacks english alphabet characters entirely
      if (!/[a-zA-Z]/.test(t.text)) {
        missingInfo.push(`${t.id}: ${t.text}`);
        hasMissing = true;
      }
    }
  });
  
  if (hasMissing) {
    console.log(`Page ${i + 2} (${page.name}) missing English in bilingual fields:`);
    missingInfo.forEach(info => console.log(`  ${info}`));
  }
});
