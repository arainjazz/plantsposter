const fs = require('fs');

const data = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

// Update page 0 sec-habitat-body
data.pages[0].blocks.find(b => b.id.includes('sec-habitat-body')).text = "常见于海拔1000–1400m的石质山地、坡地和荒漠草原；在西鄂尔多斯可成为独特荒漠群落的建群种。\\nCommon on rocky mountains, slopes, and desert steppes at altitudes of 1000–1400m; in western Ordos, it can become a constructive species of unique desert communities.";
data.pages[0].blocks.find(b => b.id.includes('sec-habitat-body')).fontSize = 9;
data.pages[0].blocks.find(b => b.id.includes('sec-habitat-body')).lineHeight = 1.3;

// Update page 11 sec-hum-body
data.pages[11].blocks.find(b => b.id.includes('sec-hum-body')).text = "唐古特白刺在荒漠化防治和生态修复中发挥着关键作用，其发达的根系能有效固沙，改善土壤结构。其果实富含维生素C，可生食或制成果酱、酿酒，在当地被视为重要的野生果品。在传统医学中，其果实和叶片也被用于治疗某些疾病。它还是荒漠地区牲畜的优质饲料来源。\\n*Nitraria tangutorum* plays a key role in desertification control and ecological restoration. Its developed root system can effectively fix sand and improve soil structure. Its fruits are rich in Vitamin C, can be eaten raw, made into jam, or brewed into wine, and are considered an important wild fruit locally. In traditional medicine, its fruits and leaves are also used to treat certain diseases. It is also a high-quality forage source for livestock in desert regions.";
data.pages[11].blocks.find(b => b.id.includes('sec-hum-body')).fontSize = 9;
data.pages[11].blocks.find(b => b.id.includes('sec-hum-body')).lineHeight = 1.3;

// Update page 16 sec-hum-body
data.pages[16].blocks.find(b => b.id.includes('sec-hum-body')).text = "肉苁蓉在中国拥有悠久的药用历史，被誉为“沙漠人参”，是传统中药材中的上品。它具有补肾阳、益精血、润肠通便的功效，常用于治疗肾虚阳痿、不孕不育、腰膝酸软、肠燥便秘等症。由于其独特的药用价值和野生资源的日益枯竭，肉苁蓉已被列入《濒危野生动植物种国际贸易公约》（CITES）附录II，并被中国列为国家二级重点保护野生植物。目前，人工种植梭梭并嫁接肉苁蓉已成为保护和可持续利用这一珍贵资源的有效途径，不仅有助于肉苁蓉的繁衍，也对荒漠化防治和生态恢复具有重要意义。\\n*Cistanche deserticola* has a long history of medicinal use in China, known as 'Desert Ginseng', and is a premium traditional Chinese medicine. It is effective in tonifying kidney yang, benefiting essence and blood, and moisturizing the intestines, commonly used to treat conditions like kidney deficiency and constipation. Due to its unique medicinal value and the depletion of wild resources, it has been listed in Appendix II of CITES and is a national second-class protected wild plant in China. Currently, cultivating *Haloxylon* and grafting *Cistanche* has become an effective way to protect and sustainably use this precious resource, aiding both its propagation and desertification control.";
data.pages[16].blocks.find(b => b.id.includes('sec-hum-body')).fontSize = 9;
data.pages[16].blocks.find(b => b.id.includes('sec-hum-body')).lineHeight = 1.3;

fs.writeFileSync('banrihua-editor-20plants.json', JSON.stringify(data, null, 2));
console.log('Successfully patched the last 3 missing blocks!');
