const fs = require("fs");

const translations = [
  "核心区｜西鄂尔多斯南部设“半日花核心区”，保护完整荒漠群落。\\n谱系｜伊犁与西鄂尔多斯种群显著分化，需分别监测。",
  "Core Area | A 'Helianthemum Core Area' is established in southern Ordos to protect the intact desert community.\\nLineage | The Ili and western Ordos populations are significantly differentiated and require separate monitoring.",

  "四合木主要生长在荒漠、半荒漠地区的砾石坡、石质山坡、洪积扇边缘以及轻度盐渍化的沙地或粘土质土壤上。它对干旱、贫瘠和盐碱环境具有极强的适应性，常形成稀疏的灌丛或与其它旱生植物混生。",
  "四合木主要生长在荒漠、半荒漠地区的砾石坡、石质山坡、洪积扇边缘以及轻度盐渍化的沙地或粘土质土壤上。它对干旱、贫瘠和盐碱环境具有极强的适应性，常形成稀疏的灌丛或与其它旱生植物混生。\\n*Tetraena mongolica* primarily grows on gravel slopes, rocky hillsides, edges of alluvial fans, and slightly salinized sandy or clay soils in desert and semi-desert regions. It has extreme adaptability to drought, barrenness, and saline-alkali environments, often forming sparse scrubs or mixing with other xerophytic plants.",

  "四合木作为中国特有的孑遗植物，是研究古地理、古气候和植物区系演化的重要材料。其独特的抗旱、抗盐碱特性使其在荒漠化防治和生态修复方面具有潜在价值。由于其极度濒危的现状，它也是生物多样性保护的旗舰物种之一，对维护荒漠生态系统的稳定性和完整性具有不可替代的生态学意义。",
  "四合木作为中国特有的孑遗植物，是研究古地理、古气候和植物区系演化的重要材料。其独特的抗旱、抗盐碱特性使其在荒漠化防治和生态修复方面具有潜在价值。由于其极度濒危的现状，它也是生物多样性保护的旗舰物种之一，对维护荒漠生态系统的稳定性和完整性具有不可替代的生态学意义。\\nAs an endemic relict plant of China, *Tetraena mongolica* is an important material for studying paleogeography, paleoclimate, and flora evolution. Its unique drought and salt-alkali resistance gives it potential value in desertification control and ecological restoration. Due to its critically endangered status, it is also a flagship species for biodiversity conservation, holding irreplaceable ecological significance for maintaining the stability and integrity of desert ecosystems.",

  "蒙古沙冬青主要生长在干旱、半干旱地区的砾石戈壁、固定或半固定沙丘、山前洪积扇以及干河床等生境中，偏爱排水良好、光照充足的沙质或砾质土壤。",
  "蒙古沙冬青主要生长在干旱、半干旱地区的砾石戈壁、固定或半固定沙丘、山前洪积扇以及干河床等生境中，偏爱排水良好、光照充足的沙质或砾质土壤。\\n*Ammopiptanthus mongolicus* primarily grows in habitats such as gravel deserts, fixed or semi-fixed sand dunes, piedmont alluvial fans, and dry riverbeds in arid and semi-arid regions, preferring well-drained, sun-exposed sandy or gravelly soils.",

  "蒙古沙冬青是荒漠生态系统中的关键物种，具有极强的抗旱、抗寒和耐贫瘠能力，是优良的固沙、防风、保持水土的先锋植物。其深根系有助于稳定沙丘，改善土壤结构。由于其独特的生态价值和作为第三纪残遗植物的科学意义，它在生态恢复和生物多样性保护中占有重要地位。",
  "蒙古沙冬青是荒漠生态系统中的关键物种，具有极强的抗旱、抗寒和耐贫瘠能力，是优良的固沙、防风、保持水土的先锋植物。其深根系有助于稳定沙丘，改善土壤结构。由于其独特的生态价值和作为第三纪残遗植物的科学意义，它在生态恢复和生物多样性保护中占有重要地位。\\n*Ammopiptanthus mongolicus* is a key species in desert ecosystems, possessing extremely strong drought, cold, and barrenness resistance. It is an excellent pioneer plant for sand fixation, windbreak, and soil and water conservation. Its deep root system helps stabilize sand dunes and improve soil structure. Due to its unique ecological value and scientific significance as a Tertiary relict plant, it plays an important role in ecological restoration and biodiversity conservation.",

  "绵刺主要生长在干旱荒漠地区的砾石坡、沙砾地、固定或半固定沙丘边缘以及戈壁滩上。它对极端干旱、贫瘠的土壤和强烈的风蚀具有高度适应性，常与其他旱生灌木和草本植物混生，形成独特的荒漠植被群落。",
  "绵刺主要生长在干旱荒漠地区的砾石坡、沙砾地、固定或半固定沙丘边缘以及戈壁滩上。它对极端干旱、贫瘠的土壤和强烈的风蚀具有高度适应性，常与其他旱生灌木和草本植物混生，形成独特的荒漠植被群落。\\n*Potaninia mongolica* primarily grows on gravel slopes, sandy gravel lands, edges of fixed or semi-fixed sand dunes, and Gobi deserts in arid regions. It is highly adapted to extreme drought, barren soils, and strong wind erosion, often mixing with other xerophytic shrubs and herbs to form unique desert vegetation communities.",

  "绵刺作为荒漠生态系统的关键物种，在防风固沙、保持水土方面发挥着重要作用。其独特的形态和对极端环境的适应性使其成为研究植物进化和荒漠生态的宝贵材料。由于其分布区狭窄且生境脆弱，绵刺被列为国家二级重点保护野生植物，需要加强保护。",
  "绵刺作为荒漠生态系统的关键物种，在防风固沙、保持水土方面发挥着重要作用。其独特的形态和对极端环境的适应性使其成为研究植物进化和荒漠生态的宝贵材料。由于其分布区狭窄且生境脆弱，绵刺被列为国家二级重点保护野生植物，需要加强保护。\\nAs a key species in desert ecosystems, *Potaninia mongolica* plays an important role in windbreak, sand fixation, and soil and water conservation. Its unique morphology and adaptability to extreme environments make it a valuable material for studying plant evolution and desert ecology. Due to its narrow distribution and fragile habitat, *Potaninia mongolica* is listed as a national second-class protected wild plant, requiring strengthened conservation.",

  "鄂尔多斯野丁香主要生长在鄂尔多斯高原的沙地、半固定沙丘、砾石坡以及干旱的草原边缘。它对贫瘠的土壤和干旱的环境有很强的适应性，常与沙生植物群落伴生。",
  "鄂尔多斯野丁香主要生长在鄂尔多斯高原的沙地、半固定沙丘、砾石坡以及干旱的草原边缘。它对贫瘠的土壤和干旱的环境有很强的适应性，常与沙生植物群落伴生。\\n*Leptodermis ordosica* primarily grows in sandy lands, semi-fixed sand dunes, gravel slopes, and the edges of arid steppes on the Ordos Plateau. It has strong adaptability to barren soils and arid environments, often associating with psammophytic plant communities.",

  "鄂尔多斯野丁香作为鄂尔多斯高原的特有植物，在防风固沙、水土保持方面发挥着重要作用。其独特的适应性和观赏价值也使其成为当地生态旅游和园林绿化中具有潜力的乡土植物。",
  "鄂尔多斯野丁香作为鄂尔多斯高原的特有植物，在防风固沙、水土保持方面发挥着重要作用。其独特的适应性和观赏价值也使其成为当地生态旅游和园林绿化中具有潜力的乡土植物。\\nAs an endemic plant to the Ordos Plateau, *Leptodermis ordosica* plays an important role in windbreak, sand fixation, and soil and water conservation. Its unique adaptability and ornamental value also make it a potential native plant for local ecotourism and landscaping.",

  "鄂尔多斯蒿主要生长在流动或半固定的沙丘、沙地、沙质荒漠以及砾质沙地，是典型的荒漠先锋植物。它能适应极度干旱和贫瘠的沙质土壤环境。",
  "鄂尔多斯蒿主要生长在流动或半固定的沙丘、沙地、沙质荒漠以及砾质沙地，是典型的荒漠先锋植物。它能适应极度干旱和贫瘠的沙质土壤环境。\\n*Artemisia ordosica* primarily grows in mobile or semi-fixed sand dunes, sandy lands, sandy deserts, and gravelly sandy lands, being a typical desert pioneer plant. It can adapt to extremely arid and barren sandy soil environments.",

  "鄂尔多斯蒿是鄂尔多斯地区最重要的固沙植物之一，在防风固沙、水土保持和荒漠化防治中发挥着不可替代的作用。它能有效改善沙地生态环境，为其他植物和动物提供栖息地，是构建当地生态屏障的关键物种。其独特的适应机制也为干旱区生态修复提供了宝贵的科学研究价值。",
  "鄂尔多斯蒿是鄂尔多斯地区最重要的固沙植物之一，在防风固沙、水土保持和荒漠化防治中发挥着不可替代的作用。它能有效改善沙地生态环境，为其他植物和动物提供栖息地，是构建当地生态屏障的关键物种。其独特的适应机制也为干旱区生态修复提供了宝贵的科学研究价值。\\n*Artemisia ordosica* is one of the most important sand-fixing plants in the Ordos region, playing an irreplaceable role in windbreak, sand fixation, soil and water conservation, and desertification control. It effectively improves the sandy ecological environment, provides habitats for other plants and animals, and is a key species for building the local ecological barrier. Its unique adaptation mechanism also provides valuable scientific research value for ecological restoration in arid areas.",

  "白沙蒿主要生长在流动或半流动沙丘、沙地、沙质戈壁滩以及沙质荒漠的边缘。它对沙埋、干旱和贫瘠土壤具有极强的适应性，常形成优势群落，是荒漠生态系统中的重要组成部分。",
  "白沙蒿主要生长在流动或半流动沙丘、沙地、沙质戈壁滩以及沙质荒漠的边缘。它对沙埋、干旱和贫瘠土壤具有极强的适应性，常形成优势群落，是荒漠生态系统中的重要组成部分。\\n*Artemisia sphaerocephala* primarily grows in mobile or semi-mobile sand dunes, sandy lands, sandy Gobi, and the edges of sandy deserts. It has extremely strong adaptability to sand burial, drought, and barren soils, often forming dominant communities as an important component of desert ecosystems.",

  "白沙蒿在中国的“三北”防护林体系建设和荒漠化治理中发挥着不可替代的作用。它能有效固定流沙，改善土壤结构，为其他植物的生长创造条件，是荒漠生态系统恢复和重建的关键物种。其茎秆也可作为燃料或牲畜冬季饲料，具有一定的经济价值。",
  "白沙蒿在中国的“三北”防护林体系建设和荒漠化治理中发挥着不可替代的作用。它能有效固定流沙，改善土壤结构，为其他植物的生长创造条件，是荒漠生态系统恢复和重建的关键物种。其茎秆也可作为燃料或牲畜冬季饲料，具有一定的经济价值。\\n*Artemisia sphaerocephala* plays an irreplaceable role in the construction of the 'Three-North' Shelterbelt System and desertification control in China. It can effectively fix shifting sand, improve soil structure, and create conditions for the growth of other plants, making it a key species for the restoration and reconstruction of desert ecosystems. Its stems can also be used as fuel or winter forage for livestock, possessing certain economic value.",

  "叉子圆柏主要生长在山地岩石坡、干燥山坡、林缘或疏林中，尤其偏爱石质或沙质土壤。它对干旱和寒冷环境具有很强的适应性，常作为先锋植物出现在恶劣的生境中。",
  "叉子圆柏主要生长在山地岩石坡、干燥山坡、林缘或疏林中，尤其偏爱石质或沙质土壤。它对干旱和寒冷环境具有很强的适应性，常作为先锋植物出现在恶劣的生境中。\\n*Juniperus sabina* primarily grows on mountainous rocky slopes, dry hillsides, forest margins, or open woodlands, especially preferring rocky or sandy soils. It has strong adaptability to arid and cold environments, often appearing as a pioneer plant in harsh habitats.",

  "叉子圆柏因其独特的匍匐形态、耐旱耐寒的特性以及常绿的叶片，常被用作园林绿化中的地被植物、岩石园植物或边坡绿化材料，具有良好的观赏价值和水土保持功能。然而，由于其全株有毒，特别是果实和叶片，在传统医药中的应用需极其谨慎，且现代医学已不推荐内服。在生态上，它能有效固沙和保持水土，对维护荒漠和半荒漠地区的生态平衡具有重要作用。",
  "叉子圆柏因其独特的匍匐形态、耐旱耐寒的特性以及常绿的叶片，常被用作园林绿化中的地被植物、岩石园植物或边坡绿化材料，具有良好的观赏价值和水土保持功能。然而，由于其全株有毒，特别是果实和叶片，在传统医药中的应用需极其谨慎，且现代医学已不推荐内服。在生态上，它能有效固沙和保持水土，对维护荒漠和半荒漠地区的生态平衡具有重要作用。\\nDue to its unique creeping habit, drought and cold resistance, and evergreen leaves, *Juniperus sabina* is often used as a ground cover, rock garden plant, or slope greening material in landscaping, offering good ornamental value and soil/water conservation functions. However, as the whole plant is toxic (especially fruits and leaves), its application in traditional medicine requires extreme caution, and modern medicine no longer recommends internal use. Ecologically, it effectively fixes sand and conserves soil and water, playing an important role in maintaining the ecological balance of desert and semi-desert regions.",

  "黄柳主要生长在流动或半固定的沙丘、沙地、河岸沙滩以及荒漠边缘的砾石沙质地带。它能忍受强风、干旱和沙埋，是典型的沙生植物群落的优势种。",
  "黄柳主要生长在流动或半固定的沙丘、沙地、河岸沙滩以及荒漠边缘的砾石沙质地带。它能忍受强风、干旱和沙埋，是典型的沙生植物群落的优势种。\\n*Salix gordejevii* primarily grows in mobile or semi-fixed sand dunes, sandy lands, riparian sandy beaches, and gravelly sandy areas at the edge of deserts. It can withstand strong winds, drought, and sand burial, being a dominant species in typical psammophytic plant communities.",

  "黄柳因其卓越的固沙能力，被广泛应用于中国北方地区的防风固沙和荒漠化治理工程中，是生态屏障建设的关键树种。此外，传统医学中也记载其枝叶具有清热解毒的功效，但现代药理研究尚不充分。",
  "黄柳因其卓越的固沙能力，被广泛应用于中国北方地区的防风固沙和荒漠化治理工程中，是生态屏障建设的关键树种。此外，传统医学中也记载其枝叶具有清热解毒的功效，但现代药理研究尚不充分。\\nDue to its outstanding sand-fixing ability, *Salix gordejevii* is widely used in windbreak, sand fixation, and desertification control projects in northern China, serving as a key tree species for ecological barrier construction. In addition, traditional medicine records that its branches and leaves have heat-clearing and detoxifying effects, though modern pharmacological research is still insufficient.",

  "柠条锦鸡儿主要生长在荒漠、半荒漠地区的沙地、沙丘、砾石坡、山坡以及干旱河谷地带。它对土壤类型要求不严，能在贫瘠、干旱的沙质或砾质土壤中良好生长，是典型的旱生植物。",
  "柠条锦鸡儿主要生长在荒漠、半荒漠地区的沙地、沙丘、砾石坡、山坡以及干旱河谷地带。它对土壤类型要求不严，能在贫瘠、干旱的沙质或砾质土壤中良好生长，是典型的旱生植物。\\n*Caragana korshinskii* primarily grows in sandy lands, sand dunes, gravel slopes, hillsides, and arid river valleys in desert and semi-desert regions. It is not strict about soil types and can grow well in barren, arid sandy or gravelly soils, being a typical xerophytic plant.",

  "柠条锦鸡儿是中国北方重要的防风固沙植物，广泛应用于荒漠化治理和生态恢复工程。其枝条可作薪柴，叶片和嫩枝是牲畜的优质饲料。在传统医学中，其根、茎、叶也有药用价值。由于其在生态系统中的关键作用，柠条锦鸡儿在保护生物多样性和维持区域生态平衡方面具有不可替代的地位。",
  "柠条锦鸡儿是中国北方重要的防风固沙植物，广泛应用于荒漠化治理和生态恢复工程。其枝条可作薪柴，叶片和嫩枝是牲畜的优质饲料。在传统医学中，其根、茎、叶也有药用价值。由于其在生态系统中的关键作用，柠条锦鸡儿在保护生物多样性和维持区域生态平衡方面具有不可替代的地位。\\n*Caragana korshinskii* is an important windbreak and sand-fixing plant in northern China, widely used in desertification control and ecological restoration projects. Its branches can be used as firewood, and its leaves and tender shoots are high-quality forage for livestock. In traditional medicine, its roots, stems, and leaves also have medicinal value. Due to its key role in the ecosystem, *Caragana korshinskii* holds an irreplaceable position in protecting biodiversity and maintaining regional ecological balance.",

  "红砂主要生长在荒漠、半荒漠地区的盐碱地、沙丘、砾石坡和干河床。它对盐分和干旱有极强的耐受性，常形成优势群落或与梭梭、白刺等其他旱生盐生植物混生。其根系发达，能有效固沙。",
  "红砂主要生长在荒漠、半荒漠地区的盐碱地、沙丘、砾石坡和干河床。它对盐分和干旱有极强的耐受性，常形成优势群落或与梭梭、白刺等其他旱生盐生植物混生。其根系发达，能有效固沙。\\n*Reaumuria soongorica* primarily grows in saline-alkali lands, sand dunes, gravel slopes, and dry riverbeds in desert and semi-desert regions. It has extremely strong tolerance to salinity and drought, often forming dominant communities or mixing with other xerophytic halophytes like *Haloxylon ammodendron* and *Nitraria*. Its well-developed root system can effectively fix sand.",

  "红砂是荒漠地区重要的固沙植物，其发达的根系和耐旱耐盐特性使其成为防风固沙、改善生态环境的先锋树种。在传统医学中，红砂的某些部位被用于治疗特定疾病，具有一定的药用价值，但需进一步研究验证。其独特的适应机制也为植物生理学研究提供了宝贵材料。",
  "红砂是荒漠地区重要的固沙植物，其发达的根系和耐旱耐盐特性使其成为防风固沙、改善生态环境的先锋树种。在传统医学中，红砂的某些部位被用于治疗特定疾病，具有一定的药用价值，但需进一步研究验证。其独特的适应机制也为植物生理学研究提供了宝贵材料。\\n*Reaumuria soongorica* is an important sand-fixing plant in desert regions. Its developed root system and drought/salt tolerance make it a pioneer tree species for windbreak, sand fixation, and ecological improvement. In traditional medicine, certain parts of *Reaumuria soongorica* are used to treat specific diseases, possessing certain medicinal value, but this requires further research and verification. Its unique adaptation mechanisms also provide valuable material for plant physiology research.",

  "唐古特白刺主要生长在干旱、半干旱地区的盐碱地、沙丘、砾石坡、河滩及湖滨地带。它能忍受高盐分和极度干旱的环境，常形成大面积的灌丛，是荒漠生态系统中的优势物种。",
  "唐古特白刺主要生长在干旱、半干旱地区的盐碱地、沙丘、砾石坡、河滩及湖滨地带。它能忍受高盐分和极度干旱的环境，常形成大面积的灌丛，是荒漠生态系统中的优势物种。\\n*Nitraria tangutorum* primarily grows in saline-alkali lands, sand dunes, gravel slopes, river floodplains, and lakeshores in arid and semi-arid regions. It can tolerate high salinity and extremely arid environments, often forming large-area scrubs as a dominant species in desert ecosystems.",

  "梭梭主要生长在干旱荒漠、半荒漠地区的沙丘、沙地、砾石滩以及盐渍化土壤中。它对极端干旱、高温、强风和贫瘠土壤具有极强的适应能力，是典型的旱生和盐生植物。其发达的根系能深入地下，有效吸收水分并固定流沙，是荒漠生态系统中的重要组成部分。",
  "梭梭主要生长在干旱荒漠、半荒漠地区的沙丘、沙地、砾石滩以及盐渍化土壤中。它对极端干旱、高温、强风和贫瘠土壤具有极强的适应能力，是典型的旱生和盐生植物。其发达的根系能深入地下，有效吸收水分并固定流沙，是荒漠生态系统中的重要组成部分。\\n*Haloxylon ammodendron* primarily grows in sand dunes, sandy lands, gravel beaches, and salinized soils in arid desert and semi-desert regions. It has extremely strong adaptability to extreme drought, high temperature, strong winds, and barren soils, being a typical xerophyte and halophyte. Its developed root system can penetrate deep underground to effectively absorb water and fix shifting sand, making it an important component of desert ecosystems.",

  "梭梭是荒漠地区重要的固沙植物，对于防治荒漠化、改善生态环境具有不可替代的作用，被誉为“沙漠英雄树”。其木材坚硬，可作燃料，但因其生态价值，目前多受保护。更重要的是，它是名贵中药材肉苁蓉的唯一寄主，肉苁蓉的生长与梭梭的健康息息相关，因此梭梭的保护也直接关系到肉苁蓉这一药用资源的存续。",
  "梭梭是荒漠地区重要的固沙植物，对于防治荒漠化、改善生态环境具有不可替代的作用，被誉为“沙漠英雄树”。其木材坚硬，可作燃料，但因其生态价值，目前多受保护。更重要的是，它是名贵中药材肉苁蓉的唯一寄主，肉苁蓉的生长与梭梭的健康息息相关，因此梭梭的保护也直接关系到肉苁蓉这一药用资源的存续。\\n*Haloxylon ammodendron* is an important sand-fixing plant in desert regions, playing an irreplaceable role in preventing desertification and improving the ecological environment, earning it the title 'Desert Hero Tree'. Its hard wood can be used as fuel, but due to its ecological value, it is mostly protected today. More importantly, it is the sole host of the precious traditional Chinese medicine *Cistanche deserticola*. The growth of *Cistanche* is closely tied to the health of *Haloxylon*, so the protection of *Haloxylon* directly concerns the survival of this medicinal resource.",

  "沙芥广泛生长于荒漠、半荒漠地区的沙丘、沙地、砾石滩以及盐碱地边缘，是典型的旱生和盐生植物。它能适应贫瘠、干旱且盐碱化的土壤环境。",
  "沙芥广泛生长于荒漠、半荒漠地区的沙丘、沙地、砾石滩以及盐碱地边缘，是典型的旱生和盐生植物。它能适应贫瘠、干旱且盐碱化的土壤环境。\\n*Pugionium cornutum* grows widely in sand dunes, sandy lands, gravel beaches, and the edges of saline-alkali lands in desert and semi-desert regions, being a typical xerophyte and halophyte. It can adapt to barren, arid, and salinized soil environments.",

  "沙芥在荒漠生态系统中扮演着重要的固沙角色，其发达的根系有助于稳定沙土，防止风蚀和土地沙化，对荒漠化治理具有重要意义。此外，其嫩茎叶在当地被视为一种独特的野菜，具有一定的食用价值，富含多种营养物质。它也是研究植物适应极端环境的优良材料，为荒漠生态恢复提供科学依据。",
  "沙芥在荒漠生态系统中扮演着重要的固沙角色，其发达的根系有助于稳定沙土，防止风蚀和土地沙化，对荒漠化治理具有重要意义。此外，其嫩茎叶在当地被视为一种独特的野菜，具有一定的食用价值，富含多种营养物质。它也是研究植物适应极端环境的优良材料，为荒漠生态恢复提供科学依据。\\n*Pugionium cornutum* plays an important sand-fixing role in desert ecosystems. Its developed root system helps stabilize sandy soil, preventing wind erosion and desertification, which is of great significance to desertification control. In addition, its tender stems and leaves are regarded as a unique wild vegetable locally, possessing certain edible value and rich in various nutrients. It is also excellent material for studying plant adaptation to extreme environments, providing scientific basis for desert ecological restoration.",

  "革苞菊主要生长于干旱的荒漠、半荒漠地区的砾石坡、沙丘边缘、戈壁滩以及石质山坡上。它偏爱排水良好、光照充足的沙质或砾质土壤，能够耐受极端的干旱和昼夜温差。",
  "革苞菊主要生长于干旱的荒漠、半荒漠地区的砾石坡、沙丘边缘、戈壁滩以及石质山坡上。它偏爱排水良好、光照充足的沙质或砾质土壤，能够耐受极端的干旱和昼夜温差。\\n*Tugarinovia mongolica* primarily grows on gravel slopes, edges of sand dunes, Gobi deserts, and rocky hillsides in arid desert and semi-desert regions. It prefers well-drained, sun-exposed sandy or gravelly soils and can tolerate extreme drought and large diurnal temperature differences.",

  "革苞菊作为亚洲中部荒漠生态系统中的特有物种，在维持生物多样性和生态平衡方面具有重要作用。其独特的适应机制使其成为研究植物抗旱性和极端环境生存策略的模式植物。由于其分布范围有限且生境脆弱，应加强对其种群和生境的保护。",
  "革苞菊作为亚洲中部荒漠生态系统中的特有物种，在维持生物多样性和生态平衡方面具有重要作用。其独特的适应机制使其成为研究植物抗旱性和极端环境生存策略的模式植物。由于其分布范围有限且生境脆弱，应加强对其种群和生境的保护。\\nAs an endemic species in the desert ecosystems of Central Asia, *Tugarinovia mongolica* plays an important role in maintaining biodiversity and ecological balance. Its unique adaptation mechanism makes it a model plant for studying plant drought resistance and survival strategies in extreme environments. Due to its limited distribution range and fragile habitat, protection of its populations and habitats should be strengthened.",

  "蒙古韭主要生长在干旱的草原、沙地、砾石坡、山坡石缝中以及荒漠边缘。它对贫瘠、干燥的土壤具有很强的适应性，常形成小片群落。",
  "蒙古韭主要生长在干旱的草原、沙地、砾石坡、山坡石缝中以及荒漠边缘。它对贫瘠、干燥的土壤具有很强的适应性，常形成小片群落。\\n*Allium mongolicum* primarily grows in arid steppes, sandy lands, gravel slopes, rock crevices on hillsides, and desert margins. It has strong adaptability to barren, dry soils and often forms small communities.",

  "蒙古韭在当地被用作野菜，其鳞茎和叶片具有独特的风味，常被采摘食用。由于其对干旱环境的强大适应性，它在生态恢复和防沙固沙方面具有潜在价值。然而，过度采挖可能对其野生种群造成压力，需要关注其可持续利用和保护。",
  "蒙古韭在当地被用作野菜，其鳞茎和叶片具有独特的风味，常被采摘食用。由于其对干旱环境的强大适应性，它在生态恢复和防沙固沙方面具有潜在价值。然而，过度采挖可能对其野生种群造成压力，需要关注其可持续利用和保护。\\n*Allium mongolicum* is used as a wild vegetable locally. Its bulbs and leaves have a unique flavor and are frequently harvested for food. Due to its strong adaptability to arid environments, it has potential value in ecological restoration and sand fixation. However, over-harvesting may exert pressure on its wild populations, requiring attention to its sustainable use and conservation.",

  "文冠果适应性强，常生长于海拔500-2000米的山地阳坡、丘陵、沟壑、荒漠边缘及石质坡地。喜光，耐旱，耐瘠薄，是典型的旱生植物。",
  "文冠果适应性强，常生长于海拔500-2000米的山地阳坡、丘陵、沟壑、荒漠边缘及石质坡地。喜光，耐旱，耐瘠薄，是典型的旱生植物。\\n*Xanthoceras sorbifolium* is highly adaptable, typically growing on sunny mountain slopes, hills, ravines, desert margins, and rocky slopes at altitudes of 500-2000 meters. It is light-demanding, drought-tolerant, and barren-tolerant, making it a typical xerophytic plant.",

  "文冠果不仅是优良的观赏植物，其种子油可食用、可制生物柴油，榨油后的饼粕可作饲料或肥料。其根、叶、花、果均可入药，具有清热解毒、活血化瘀等功效。由于其极强的抗旱、耐瘠薄特性，在北方干旱半干旱地区的生态修复、防风固沙和荒漠化治理中发挥着重要作用，具有显著的生态和经济价值。",
  "文冠果不仅是优良的观赏植物，其种子油可食用、可制生物柴油，榨油后的饼粕可作饲料或肥料。其根、叶、花、果均可入药，具有清热解毒、活血化瘀等功效。由于其极强的抗旱、耐瘠薄特性，在北方干旱半干旱地区的生态修复、防风固沙和荒漠化治理中发挥着重要作用，具有显著的生态和经济价值。\\n*Xanthoceras sorbifolium* is not only an excellent ornamental plant, but its seed oil is edible and can be made into biodiesel, while the pressed meal can be used as feed or fertilizer. Its roots, leaves, flowers, and fruits can all be used in medicine, possessing effects such as clearing heat, detoxifying, and promoting blood circulation to remove blood stasis. Due to its extremely strong drought and barrenness resistance, it plays an important role in ecological restoration, windbreak, sand fixation, and desertification control in arid and semi-arid regions of northern China, holding significant ecological and economic value.",

  "蒙古扁桃主要生长于荒漠、半荒漠地区的砾石坡、沙丘边缘、干旱河谷和山麓地带。它对干旱、贫瘠和盐碱土壤具有很强的适应性，常形成灌丛或与其它旱生植物混生。",
  "蒙古扁桃主要生长于荒漠、半荒漠地区的砾石坡、沙丘边缘、干旱河谷和山麓地带。它对干旱、贫瘠和盐碱土壤具有很强的适应性，常形成灌丛或与其它旱生植物混生。\\n*Prunus mongolica* primarily grows on gravel slopes, edges of sand dunes, arid river valleys, and foothills in desert and semi-desert regions. It has strong adaptability to drought, barrenness, and saline-alkali soils, often forming scrubs or mixing with other xerophytic plants.",

  "蒙古扁桃在荒漠生态系统中扮演着重要的先锋植物角色，有助于固沙和改善土壤。其极强的抗旱、抗寒和抗盐碱能力使其成为研究植物逆境适应机制的宝贵材料，也是未来培育抗逆作物的重要基因资源。在当地，其果实有时被采集，但因绒毛较多，食用价值不高，主要用于野生动物食物来源。",
  "蒙古扁桃在荒漠生态系统中扮演着重要的先锋植物角色，有助于固沙和改善土壤。其极强的抗旱、抗寒和抗盐碱能力使其成为研究植物逆境适应机制的宝贵材料，也是未来培育抗逆作物的重要基因资源。在当地，其果实有时被采集，但因绒毛较多，食用价值不高，主要用于野生动物食物来源。\\n*Prunus mongolica* plays an important pioneer plant role in desert ecosystems, helping to fix sand and improve soil. Its extremely strong drought, cold, and salt-alkali resistance makes it valuable material for studying plant stress adaptation mechanisms, as well as an important genetic resource for breeding stress-resistant crops in the future. Locally, its fruits are sometimes collected, but due to excessive pubescence, their edible value is low, mainly serving as a food source for wildlife.",

  "发菜主要生长在荒漠、半荒漠地区的石质或沙质土壤表面，尤其是在降雨后短暂湿润的环境中。它能耐受极端干旱和高温，通过固氮作用为贫瘠的土壤提供氮源。",
  "发菜主要生长在荒漠、半荒漠地区的石质或沙质土壤表面，尤其是在降雨后短暂湿润的环境中。它能耐受极端干旱和高温，通过固氮作用为贫瘠的土壤提供氮源。\\n*Nostoc flagelliforme* primarily grows on the surface of rocky or sandy soils in desert and semi-desert regions, especially in transiently moist environments after rainfall. It can tolerate extreme drought and high temperatures, providing a nitrogen source for barren soils through nitrogen fixation.",

  "发菜在中国传统文化中因其谐音“发财”而备受珍视，常用于年节菜肴。然而，过度采挖导致其野外资源濒临灭绝，国家已明令禁止采挖和销售野生发菜。其在生态系统中作为重要的固氮生物，对荒漠土壤的肥力维持和生态修复具有不可替代的作用。",
  "发菜在中国传统文化中因其谐音“发财”而备受珍视，常用于年节菜肴。然而，过度采挖导致其野外资源濒临灭绝，国家已明令禁止采挖和销售野生发菜。其在生态系统中作为重要的固氮生物，对荒漠土壤的肥力维持和生态修复具有不可替代的作用。\\n*Nostoc flagelliforme* is highly valued in traditional Chinese culture because its name sounds like 'getting rich' in Chinese, making it a common dish during the Lunar New Year. However, over-harvesting has pushed wild resources to the brink of extinction, and the state has strictly prohibited the gathering and sale of wild *Nostoc flagelliforme*. As an important nitrogen-fixing organism in the ecosystem, it plays an irreplaceable role in maintaining the fertility of desert soils and ecological restoration.",
  
  "红点为154个经筛选GBIF记录；黄色为Kew POWO及中国研究支持的粗略原生范围，不是精确边界。",
  "红点为154个经筛选GBIF记录；黄色为Kew POWO及中国研究支持的粗略原生范围，不是精确边界。\\nRed dots indicate 154 filtered GBIF records; yellow shading represents the approximate native range supported by Kew POWO and Chinese research, not an exact boundary."
];

const dict = {};
for (let i = 0; i < translations.length; i += 2) {
  dict[translations[i].replace(/\\n/g, '\n')] = translations[i + 1].replace(/\\n/g, '\n');
}

const data = JSON.parse(fs.readFileSync("banrihua-editor-20plants.json", "utf-8"));
for (let i = 0; i < data.pages.length; i++) {
  const page = data.pages[i];
  for (const block of page.blocks) {
    if (block.type === "text" && dict[block.text]) {
      block.text = dict[block.text];
    }
  }
}
fs.writeFileSync("banrihua-editor-20plants.json", JSON.stringify(data, null, 2));
console.log("Successfully replaced translated texts!");
