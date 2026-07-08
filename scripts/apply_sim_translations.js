const fs = require('fs');

const data = JSON.parse(fs.readFileSync('banrihua-editor-20plants.json', 'utf8'));

const translations = [
  "锦鸡儿属植物通常有羽状复叶和蝶形花，果实为荚果，与绵刺的单叶和棉毛状果实明显不同。",
  "锦鸡儿属植物通常有羽状复叶和蝶形花，果实为荚果，与绵刺的单叶和棉毛状果实明显不同。\\n*Caragana* species typically have pinnate leaves and papilionaceous flowers, with pods as fruits, distinctly different from *Potaninia*'s simple leaves and cotton-like fruits.",

  "沙棘的叶片为线形或披针形，花小不显，果实为橙黄色浆果状，无绵刺特有的棉毛状萼片。",
  "沙棘的叶片为线形或披针形，花小不显，果实为橙黄色浆果状，无绵刺特有的棉毛状萼片。\\n*Hippophae rhamnoides* has linear or lanceolate leaves, inconspicuous small flowers, and orange-yellow berry-like fruits, lacking the cotton-like sepals typical of *Potaninia*.",

  "主要区别在于叶形。长圆叶野丁香的叶片通常为长圆形或长圆状披针形，而鄂尔多斯野丁香的叶片为椭圆形至卵形，且通常更小。花色上，长圆叶野丁香多为白色或淡粉色。",
  "主要区别在于叶形。长圆叶野丁香的叶片通常为长圆形或长圆状披针形，而鄂尔多斯野丁香的叶片为椭圆形至卵形，且通常更小。花色上，长圆叶野丁香多为白色或淡粉色。\\nThe main difference lies in the leaf shape. *Leptodermis oblonga* typically has oblong or oblong-lanceolate leaves, while *L. ordosica* has elliptic to ovate leaves that are usually smaller. Regarding flower color, *L. oblonga* is mostly white or pale pink.",

  "甘肃野丁香通常植株更高大，花色多为白色，且花序通常更密集。鄂尔多斯野丁香则矮小呈垫状，花色为粉红色至紫红色，花序较疏散。",
  "甘肃野丁香通常植株更高大，花色多为白色，且花序通常更密集。鄂尔多斯野丁香则矮小呈垫状，花色为粉红色至紫红色，花序较疏散。\\n*Leptodermis kansuensis* is usually taller, with mostly white flowers and denser inflorescences. *L. ordosica* is dwarf and cushion-like, with pink to purplish-red flowers and looser inflorescences.",

  "籽蒿的叶片通常为二回羽状深裂，裂片线形，植株整体绿色或灰绿色，不似白沙蒿的显著灰白色。其头状花序也较白沙蒿小且排列更疏散。",
  "籽蒿的叶片通常为二回羽状深裂，裂片线形，植株整体绿色或灰绿色，不似白沙蒿的显著灰白色。其头状花序也较白沙蒿小且排列更疏散。\\n*Artemisia siversiana* leaves are usually bipinnatisect with linear lobes, and the whole plant is green or grayish-green, unlike the distinct grayish-white of *A. sphaerocephala*. Its capitula are also smaller and more loosely arranged.",

  "乌拉尔蒿的叶片通常为一至二回羽状全裂，裂片丝状，植株通常较高大，且头状花序排列方式和苞片形态与白沙蒿有明显差异。",
  "乌拉尔蒿的叶片通常为一至二回羽状全裂，裂片丝状，植株通常较高大，且头状花序排列方式和苞片形态与白沙蒿有明显差异。\\n*Artemisia dracunculus* leaves are usually 1-2 pinnatisect with filiform lobes, the plant is usually taller, and its capitula arrangement and bract morphology differ significantly from *A. sphaerocephala*.",

  "圆柏通常为乔木或高大灌木，叶片以鳞形叶为主，刺形叶多见于幼苗或萌生枝。而叉子圆柏多为匍匐或平展的低矮灌木，二型叶片特征更明显。",
  "圆柏通常为乔木或高大灌木，叶片以鳞形叶为主，刺形叶多见于幼苗或萌生枝。而叉子圆柏多为匍匐或平展的低矮灌木，二型叶片特征更明显。\\n*Juniperus chinensis* is usually a tree or tall shrub, predominantly with scale leaves, while needle leaves are mostly seen on seedlings or sprouts. *J. sabina* is mostly a creeping or spreading dwarf shrub with more pronounced dimorphic leaves.",

  "刺柏的叶片全部为刺形叶，不具鳞形叶。叉子圆柏则同时具有刺形叶和鳞形叶，且其球果成熟时呈蓝黑色，刺柏的球果多为紫黑色。",
  "刺柏的叶片全部为刺形叶，不具鳞形叶。叉子圆柏则同时具有刺形叶和鳞形叶，且其球果成熟时呈蓝黑色，刺柏的球果多为紫黑色。\\n*Juniperus formosana* has entirely needle leaves and no scale leaves. *J. sabina* has both needle and scale leaves, and its mature cones are blue-black, whereas *J. formosana* cones are mostly purplish-black.",

  "小叶柳的叶片通常更小，呈椭圆形或倒卵形，且植株通常更为低矮或匍匐。黄柳的叶片则为线状披针形，且植株多为直立灌木。",
  "小叶柳的叶片通常更小，呈椭圆形或倒卵形，且植株通常更为低矮或匍匐。黄柳的叶片则为线状披针形，且植株多为直立灌木。\\n*Salix microstachya* leaves are usually smaller, elliptic or obovate, and the plant is generally lower or creeping. *Salix gordejevii* leaves are linear-lanceolate, and the plant is mostly an erect shrub.",

  "沙柳的叶片通常较黄柳宽大，呈披针形或倒披针形，且背面通常无明显的灰白色。沙柳的枝条也常比黄柳粗壮。",
  "沙柳的叶片通常较黄柳宽大，呈披针形或倒披针形，且背面通常无明显的灰白色。沙柳的枝条也常比黄柳粗壮。\\n*Salix cheilophila* leaves are usually wider than *S. gordejevii*, being lanceolate or oblanceolate, and typically lack the distinct grayish-white on the back. Its branches are also often thicker.",

  "蒙古锦鸡儿小叶通常较宽，先端常有小尖；柠条锦鸡儿小叶通常较窄，先端钝或微凹。",
  "蒙古锦鸡儿小叶通常较宽，先端常有小尖；柠条锦鸡儿小叶通常较窄，先端钝或微凹。\\n*Caragana mongolica* leaflets are usually wider and often have a small mucro at the apex; *C. korshinskii* leaflets are usually narrower with an obtuse or slightly emarginate apex.",

  "截叶锦鸡儿小叶先端截形；柠条锦鸡儿小叶先端钝或微凹。",
  "截叶锦鸡儿小叶先端截形；柠条锦鸡儿小叶先端钝或微凹。\\n*Caragana roborovskyi* leaflets have a truncate apex; *C. korshinskii* leaflets have an obtuse or slightly emarginate apex.",

  "盐生肉苁蓉是寄生植物，无叶绿素，整体呈黄褐色，而红砂是自养植物，有绿色叶片。",
  "盐生肉苁蓉是寄生植物，无叶绿素，整体呈黄褐色，而红砂是自养植物，有绿色叶片。\\n*Cistanche salsa* is a parasitic plant lacking chlorophyll and is overall yellowish-brown, whereas *Reaumuria soongorica* is an autotrophic plant with green leaves.",

  "梭梭为无叶植物，枝条绿色，呈节状，花小不明显；红砂有明显的肉质叶片和粉色花朵。",
  "梭梭为无叶植物，枝条绿色，呈节状，花小不明显；红砂有明显的肉质叶片和粉色花朵。\\n*Haloxylon ammodendron* is a leafless plant with green, jointed branches and inconspicuous small flowers; *Reaumuria soongorica* has distinct fleshy leaves and pink flowers.",

  "野韭的叶片通常为扁平或半圆柱状，但中空，且花序通常较疏散，花被片多为白色。蒙古韭的叶片实心，花序更紧密。",
  "野韭的叶片通常为扁平或半圆柱状，但中空，且花序通常较疏散，花被片多为白色。蒙古韭的叶片实心，花序更紧密。\\n*Allium ramosum* leaves are usually flat or semi-cylindrical but hollow, with looser inflorescences and mostly white tepals. *Allium mongolicum* leaves are solid, with denser inflorescences.",

  "多根韭的鳞茎通常较小，且常有多数细长的根状茎，叶片通常更纤细且数量更多。蒙古韭的鳞茎较大，根状茎不明显。",
  "多根韭的鳞茎通常较小，且常有多数细长的根状茎，叶片通常更纤细且数量更多。蒙古韭的鳞茎较大，根状茎不明显。\\n*Allium polyrhizum* bulbs are usually smaller and often have numerous slender rhizomes, with generally finer and more numerous leaves. *Allium mongolicum* bulbs are larger without obvious rhizomes.",

  "栾树花为黄色，果实为膨大的膜质蒴果（灯笼状）；文冠果花白色，果实为球形木质蒴果。",
  "栾树花为黄色，果实为膨大的膜质蒴果（灯笼状）；文冠果花白色，果实为球形木质蒴果。\\n*Koelreuteria paniculata* flowers are yellow, and its fruits are inflated membranous capsules (lantern-like); *Xanthoceras sorbifolium* flowers are white, and its fruits are spherical woody capsules.",

  "臭椿小叶全缘或基部有腺齿，花序大而松散，果实为翅果；文冠果小叶有锯齿，花序较紧凑，果实为蒴果。",
  "臭椿小叶全缘或基部有腺齿，花序大而松散，果实为翅果；文冠果小叶有锯齿，花序较紧凑，果实为蒴果。\\n*Ailanthus altissima* leaflets are entire or have glandular teeth at the base, with large, loose inflorescences and samara fruits; *Xanthoceras sorbifolium* leaflets are serrate, with more compact inflorescences and capsule fruits.",

  "地木耳群体通常呈片状或不规则团块状，而非发菜的细长丝状；且地木耳多生长在潮湿的土壤或岩石表面，发菜则偏好干旱环境。",
  "地木耳群体通常呈片状或不规则团块状，而非发菜的细长丝状；且地木耳多生长在潮湿的土壤或岩石表面，发菜则偏好干旱环境。\\n*Nostoc commune* colonies are usually flake-like or irregular clumps, not the slender filaments of *Nostoc flagelliforme*; and *N. commune* mostly grows on moist soil or rock surfaces, while *N. flagelliforme* prefers arid environments.",

  "葛仙米群体呈球形或卵形，通常在淡水环境中生长，与发菜的陆生丝状形态和生境截然不同。",
  "葛仙米群体呈球形或卵形，通常在淡水环境中生长，与发菜的陆生丝状形态和生境截然不同。\\n*Nostoc sphaericum* colonies are spherical or oval and typically grow in freshwater environments, starkly contrasting with the terrestrial filamentous morphology and habitat of *Nostoc flagelliforme*."
];

const dict = {};
for (let i = 0; i < translations.length; i += 2) {
  dict[translations[i].replace(/\\n/g, '\n')] = translations[i + 1].replace(/\\n/g, '\n');
}

for (let i = 0; i < data.pages.length; i++) {
  const page = data.pages[i];
  for (const block of page.blocks) {
    if (block.type === 'text' && dict[block.text]) {
      block.text = dict[block.text];
      
      // Auto-adjust font size for layout if it's getting long
      if (block.text.length > 70) {
        block.fontSize = 8;
        block.lineHeight = 1.3;
      }
    }
  }
}

fs.writeFileSync('banrihua-editor-20plants.json', JSON.stringify(data, null, 2));
console.log('Successfully replaced translated sim texts!');
