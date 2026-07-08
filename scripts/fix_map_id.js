const fs = require('fs');

const editorState = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

for (let i = 0; i < 20; i++) {
  const page = editorState.pages[i];
  if (page) {
    // We already generated SVGs in the script and converted them to data URLs?
    // Wait, since I overwrote `mapBlock` with a wrong ID in the last script, I need to regenerate.
    
    // I can just reuse the logic from `scripts/generate_maps.js` but fix the id.
  }
}
