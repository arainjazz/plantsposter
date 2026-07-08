const fs = require('fs');

const data = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

// We want to ensure the 4 right-column sections do not overlap.
// They are ordered from top to bottom: habitat -> human -> sim -> notes
data.pages.forEach((page, i) => {
  // Find the blocks
  const bHabT = page.blocks.find(b => b.id.includes('sec-habitat-title'));
  const bHabB = page.blocks.find(b => b.id.includes('sec-habitat-body'));
  const bHumT = page.blocks.find(b => b.id.includes('sec-human-title'));
  const bHumB = page.blocks.find(b => b.id.includes('sec-human-body'));
  const bSimT = page.blocks.find(b => b.id.includes('sec-sim-title'));
  const bSimB = page.blocks.find(b => b.id.includes('sec-sim-body'));
  const bNotT = page.blocks.find(b => b.id.includes('sec-notes-title'));
  const bNotB = page.blocks.find(b => b.id.includes('sec-notes-body'));

  // Calculate approximate height of a text block
  // A line of text at fontSize 8 fits about 30 Chinese chars or 60 English chars.
  // Average mix: 1 line per 45 characters.
  // lineHeight is 1.3, so height = lines * fontSize * 1.3
  function calcHeight(block) {
    if (!block || !block.text) return 0;
    const linesCount = block.text.split('\n').map(line => Math.ceil(line.length / 45)).reduce((a, b) => a + b, 0);
    return Math.max(1, linesCount) * (block.fontSize || 8) * (block.lineHeight || 1.3) + 12; // 12px padding
  }

  // Base Y for habitat
  let currentY = 180; // Starting Y position

  if (bHabT && bHabB) {
    bHabT.y = currentY;
    bHabB.y = currentY + 16;
    currentY = bHabB.y + calcHeight(bHabB);
  }

  if (bHumT && bHumB) {
    bHumT.y = currentY;
    bHumB.y = currentY + 16;
    currentY = bHumB.y + calcHeight(bHumB);
  }

  if (bSimT && bSimB) {
    bSimT.y = currentY;
    bSimB.y = currentY + 16;
    currentY = bSimB.y + calcHeight(bSimB);
  }

  if (bNotT && bNotB) {
    bNotT.y = currentY;
    bNotB.y = currentY + 16;
    currentY = bNotB.y + calcHeight(bNotB);
  }
  
  // also adjust font size specifically to fit everything if currentY > 800
  if (currentY > 800) {
    [bHabB, bHumB, bSimB, bNotB].forEach(b => {
      if (b) {
        b.fontSize = 7;
        b.lineHeight = 1.2;
      }
    });
  }
});

fs.writeFileSync('banrihua-editor-20plants.json', JSON.stringify(data, null, 2));
console.log('Fixed overlapping issues');
