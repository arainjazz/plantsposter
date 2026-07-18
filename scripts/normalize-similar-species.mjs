import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const STATE_FILES = [
  "banrihua-editor-20plants.json",
  "public/banrihua-editor-20plants.json",
  "src/lib/default-plants-ssr.json",
];

const comparisons = {
  半日花: {
    selfTitle: "半日花 H. songaricum",
    selfLatin: "Helianthemum songaricum",
    selfBody:
      "页面本种：花瓣宽楔形、橘黄色，干后不变色，萼片具3条褐色纵肋，花期花梗下弯；区别于鄂尔多斯半日花的5条绿色纵肋和直立花梗。\nPage species: broadly cuneate orange-yellow petals that retain their colour when dry, 3 brown sepal ribs, and reflexed flowering pedicels; unlike H. ordosicum with 5 green ribs and erect pedicels.",
    similarTitle: "鄂尔多斯半日花 H. ordosicum",
    similarName: "鄂尔多斯半日花",
    similarLatin: "Helianthemum ordosicum",
    similarBody:
      "相似种：花瓣倒卵形、鲜黄色，干后淡粉红，萼片具5条绿色纵肋，花期花梗直立；本页半日花则为橘黄色宽楔形花瓣、3条褐色纵肋和下弯花梗。\nSimilar species: obovate bright-yellow petals turning pale pink when dry, 5 green sepal ribs, and erect flowering pedicels; the page species instead has orange-yellow cuneate petals, 3 brown ribs, and reflexed pedicels.",
  },
  四合木: {
    selfTitle: "四合木 Tetraena mongolica",
    selfLatin: "Tetraena mongolica",
    selfBody:
      "页面本种：叶对生、单叶肉质，花4瓣黄色，果为球形蒴果；区别于霸王的二回羽状复叶和翅果。\nPage species: opposite succulent simple leaves, 4 yellow petals, and a spherical capsule; unlike Z. xanthoxylum with bipinnate leaves and a samara.",
    similarTitle: "霸王 Zygophyllum xanthoxylum",
    similarName: "霸王",
    similarLatin: "Zygophyllum xanthoxylum",
    similarBody:
      "相似种：霸王具二回羽状复叶和肉质小叶，果为倒卵形或近球形翅果；本页四合木则为对生肉质单叶和球形蒴果。\nSimilar species: bipinnate leaves with succulent leaflets and an obovoid or subglobose samara; the page species has opposite succulent simple leaves and a spherical capsule.",
  },
  蒙古沙冬青: {
    selfTitle: "蒙古沙冬青 A. mongolicus",
    selfLatin: "Ammopiptanthus mongolicus",
    selfBody:
      "页面本种：常绿灌木，植株及叶片相对较大，花序较长，荚果毛被较疏；区别于短柄沙冬青的矮小株形、小型倒卵叶和密毛荚果。\nPage species: a relatively larger evergreen shrub with larger leaves, longer inflorescences, and less densely hairy pods; unlike the dwarf A. nanus with small obovate leaves and densely hairy pods.",
    similarTitle: "短柄沙冬青 A. nanus",
    similarName: "短柄沙冬青",
    similarLatin: "Ammopiptanthus nanus",
    similarBody:
      "相似种：短柄沙冬青植株较矮，叶较小且多为倒卵形，花序更短，荚果毛被更密；本页蒙古沙冬青通常株形、叶片和花序更大。\nSimilar species: a smaller shrub with smaller, usually obovate leaves, shorter inflorescences, and more densely hairy pods; the page species is generally larger in habit, leaf, and inflorescence.",
  },
  绵刺: {
    selfTitle: "绵刺 Potaninia mongolica",
    selfLatin: "Potaninia mongolica",
    selfBody:
      "页面本种：矮小垫状灌木，具单叶，果实外有棉毛状宿萼；区别于柠条锦鸡儿的羽状复叶、蝶形花和荚果。\nPage species: a dwarf cushion shrub with simple leaves and cottony persistent calyces around the fruit; unlike C. korshinskii with pinnate leaves, papilionaceous flowers, and pods.",
    similarTitle: "柠条锦鸡儿 C. korshinskii",
    similarName: "柠条锦鸡儿",
    similarLatin: "Caragana korshinskii",
    similarBody:
      "相似种：柠条锦鸡儿具羽状复叶、蝶形花和荚果；本页绵刺为单叶，果实具有醒目的棉毛状宿萼。\nSimilar species: pinnate leaves, papilionaceous flowers, and pods; the page species has simple leaves and conspicuous cottony persistent calyces around its fruit.",
  },
  鄂尔多斯野丁香: {
    selfTitle: "鄂尔多斯野丁香 L. ordosica",
    selfLatin: "Leptodermis ordosica",
    selfBody:
      "页面本种：植株矮小呈垫状，叶较小、椭圆形至卵形，花粉红至紫红；区别于长圆叶野丁香的长圆叶和白至淡粉色花。\nPage species: a dwarf cushion shrub with smaller elliptic to ovate leaves and pink to purplish-red flowers; unlike L. oblonga with oblong leaves and white to pale-pink flowers.",
    similarTitle: "长圆叶野丁香 L. oblonga",
    similarName: "长圆叶野丁香",
    similarLatin: "Leptodermis oblonga",
    similarBody:
      "相似种：叶片多为长圆形或长圆状披针形，花多白色或淡粉色；本页鄂尔多斯野丁香叶较小且偏椭圆至卵形，花色更深。\nSimilar species: usually oblong to oblong-lanceolate leaves and white to pale-pink flowers; the page species has smaller elliptic to ovate leaves and deeper-coloured flowers.",
  },
  鄂尔多斯蒿: {
    selfTitle: "鄂尔多斯蒿 A. ordosica",
    selfLatin: "Artemisia ordosica",
    selfBody:
      "页面本种：叶二回羽状深裂，裂片线形且较厚，头状花序排成狭圆锥状；区别于白沙蒿的小型线形叶和球形头状花序。\nPage species: bipinnately divided leaves with thick linear lobes and capitula in narrow panicles; unlike A. sphaerocephala with small linear leaves and globose capitula.",
    similarTitle: "白沙蒿 A. sphaerocephala",
    similarName: "白沙蒿",
    similarLatin: "Artemisia sphaerocephala",
    similarBody:
      "相似种：白沙蒿幼枝和小型线形叶密被白绒毛，头状花序球形或近球形；本页鄂尔多斯蒿叶为二回羽状深裂，裂片较厚。\nSimilar species: young shoots and small linear leaves densely white-tomentose, with globose to subglobose capitula; the page species has bipinnately divided leaves with thicker lobes.",
  },
  白沙蒿: {
    selfTitle: "白沙蒿 A. sphaerocephala",
    selfLatin: "Artemisia sphaerocephala",
    selfBody:
      "页面本种：幼枝和小型线形叶密被白绒毛，头状花序球形或近球形；区别于鄂尔多斯蒿的二回羽状深裂叶。\nPage species: young shoots and small linear leaves densely white-tomentose, with globose to subglobose capitula; unlike A. ordosica with bipinnately divided leaves.",
    similarTitle: "鄂尔多斯蒿 A. ordosica",
    similarName: "鄂尔多斯蒿",
    similarLatin: "Artemisia ordosica",
    similarBody:
      "相似种：鄂尔多斯蒿叶二回羽状深裂，裂片线形且较厚，头状花序排成狭圆锥状；本页白沙蒿以小型白绒毛叶和球形头状花序为要点。\nSimilar species: bipinnately divided leaves with thick linear lobes and capitula in narrow panicles; the page species is identified by small white-tomentose leaves and globose capitula.",
    noteBody:
      "白沙蒿与近缘蒿属植物仅凭整体灰白程度容易误判；可靠鉴定应同时查看叶片分裂方式、头状花序形状和成熟瘦果。\nA grey-white appearance alone is unreliable; leaf division, capitulum shape, and mature achenes should be checked together.",
  },
  叉子圆柏: {
    selfTitle: "叉子圆柏 Juniperus sabina",
    selfLatin: "Juniperus sabina",
    selfBody:
      "页面本种：多为匍匐或平展的低矮灌木，刺形叶与鳞形叶常并存；区别于圆柏常呈乔木或高大灌木、成株以鳞形叶为主。\nPage species: usually a creeping or spreading dwarf shrub with both needle and scale leaves; unlike J. chinensis, usually a tree or tall shrub dominated by scale leaves when mature.",
    similarTitle: "圆柏 J. chinensis",
    similarName: "圆柏",
    similarLatin: "Juniperus chinensis",
    similarBody:
      "相似种：圆柏通常为乔木或高大灌木，成株以鳞形叶为主，刺形叶多见于幼株或萌生枝；本页叉子圆柏低矮平展，二型叶更常见。\nSimilar species: usually a tree or tall shrub, with scale leaves dominant on mature growth and needle leaves mainly on juvenile shoots; the page species is low and spreading with more evident dimorphic foliage.",
    noteBody:
      "刺形叶与鳞形叶可在同一株叉子圆柏上出现；不能只凭一种叶型判断，应结合匍匐株形、枝条和成熟球果共同鉴定。\nNeedle and scale leaves may occur on one plant; identification should combine its creeping habit, shoots, and mature cones rather than one leaf type.",
  },
  黄柳: {
    selfTitle: "黄柳 Salix gordejevii",
    selfLatin: "Salix gordejevii",
    selfBody:
      "页面本种：多为直立灌木，叶线状披针形；区别于小叶柳较小的椭圆形或倒卵形叶及低矮、常匍匐的株形。\nPage species: usually an erect shrub with linear-lanceolate leaves; unlike S. microstachya with smaller elliptic or obovate leaves and a lower, often creeping habit.",
    similarTitle: "小叶柳 S. microstachya",
    similarName: "小叶柳",
    similarLatin: "Salix microstachya",
    similarBody:
      "相似种：叶片通常较小，呈椭圆形或倒卵形，植株较低矮或匍匐；本页黄柳多直立，叶为线状披针形。\nSimilar species: usually smaller elliptic or obovate leaves and a lower or creeping habit; the page species is generally erect with linear-lanceolate leaves.",
  },
  柠条锦鸡儿: {
    selfTitle: "柠条锦鸡儿 C. korshinskii",
    selfLatin: "Caragana korshinskii",
    selfBody:
      "页面本种：小叶通常较窄，先端钝或微凹；区别于蒙古锦鸡儿较宽、先端常具小尖的小叶。\nPage species: usually narrower leaflets with an obtuse or slightly notched apex; unlike C. microphylla with broader leaflets often ending in a small mucro.",
    similarTitle: "蒙古锦鸡儿 C. microphylla",
    similarName: "蒙古锦鸡儿",
    similarLatin: "Caragana microphylla",
    similarBody:
      "相似种：蒙古锦鸡儿小叶通常较宽，先端常具小尖；本页柠条锦鸡儿小叶较窄，先端钝或微凹。\nSimilar species: usually broader leaflets, often with a small mucro at the apex; the page species has narrower leaflets with an obtuse or slightly emarginate apex.",
  },
  红砂: {
    selfTitle: "红砂 Reaumuria soongorica",
    selfLatin: "Reaumuria soongorica",
    selfBody:
      "页面本种：自养小灌木，具绿色肉质叶、叶面盐腺和粉色五瓣花；区别于盐生肉苁蓉无叶绿素、黄褐色肉质花序的寄生形态。\nPage species: an autotrophic shrub with green fleshy leaves, leaf salt glands, and five pink petals; unlike the achlorophyllous, yellow-brown parasitic shoots of C. salsa.",
    similarTitle: "盐生肉苁蓉 Cistanche salsa",
    similarName: "盐生肉苁蓉",
    similarLatin: "Cistanche salsa",
    similarBody:
      "相似种：盐生肉苁蓉无叶绿素，以吸器寄生，地上部呈黄褐色肉质花序；本页红砂则有绿色肉质叶、盐腺和粉色花。\nSimilar species: an achlorophyllous parasite with a yellow-brown fleshy flowering shoot; the page species has green fleshy leaves, salt glands, and pink flowers.",
  },
  唐古特白刺: {
    selfTitle: "唐古特白刺 N. tangutorum",
    selfLatin: "Nitraria tangutorum",
    selfBody:
      "页面本种：成熟果通常红色或橙红色；区别于西伯利亚白刺常见的紫黑色果，但果色只能初筛，仍需结合果核和叶片。\nPage species: mature fruit is usually red to orange-red, unlike the often purplish-black fruit of N. sibirica; colour is only a first clue and must be checked with stone and leaf characters.",
    similarTitle: "西伯利亚白刺 N. sibirica",
    similarName: "西伯利亚白刺",
    similarLatin: "Nitraria sibirica",
    similarBody:
      "相似种：西伯利亚白刺果实通常紫黑色，本页唐古特白刺多为红色或橙红色；两者形态重叠时应进一步看果核特征。\nSimilar species: fruit is usually purplish-black, whereas the page species is commonly red to orange-red; overlapping plants require fruit-stone characters for confirmation.",
  },
  梭梭: {
    selfTitle: "梭梭 Haloxylon ammodendron",
    selfLatin: "Haloxylon ammodendron",
    selfBody:
      "页面本种：树皮较深、分枝较密，果翅通常较小；区别于白梭梭较高大的株形、浅色树皮、稀疏枝条和较大圆形果翅。\nPage species: generally darker bark, denser branching, and smaller fruit wings; unlike H. persicum with a taller habit, paler bark, sparser branches, and larger rounder wings.",
    similarTitle: "白梭梭 H. persicum",
    similarName: "白梭梭",
    similarLatin: "Haloxylon persicum",
    similarBody:
      "相似种：白梭梭通常树形更高大，树皮更浅、枝条较疏，果翅更大更圆；本页梭梭分枝较密，果翅相对较小。\nSimilar species: usually taller, with paler bark, sparser branches, and larger rounder fruit wings; the page species branches more densely and has relatively smaller wings.",
  },
  沙芥: {
    selfTitle: "沙芥 Pugionium cornutum",
    selfLatin: "Pugionium cornutum",
    selfBody:
      "页面本种：成熟果通常具2—4个角状突起，轮廓较圆；区别于长角沙芥常见的2个长角和斧头状果形。\nPage species: mature fruit usually has 2-4 horn-like projections and a rounder outline; unlike P. dolabratum with two long horns and an axe-like fruit.",
    similarTitle: "长角沙芥 P. dolabratum",
    similarName: "长角沙芥",
    similarLatin: "Pugionium dolabratum",
    similarBody:
      "相似种：长角沙芥果实先端通常有2个长角，整体近斧头状；本页沙芥多具2—4个角状突起，果形更圆。\nSimilar species: fruit usually has two long apical horns and an axe-like outline; the page species commonly has 2-4 horn-like projections and a rounder fruit.",
  },
  革苞菊: {
    selfTitle: "革苞菊 Tugarinovia mongolica",
    selfLatin: "Tugarinovia mongolica",
    selfBody:
      "页面本种：叶全缘并密被白绒毛，头状花序单生，具厚革质总苞片和明显黄色舌状花；区别于沙蒿的分裂叶、小型圆锥花序和非革质总苞。\nPage species: entire white-tomentose leaves, solitary capitula, thick leathery involucral bracts, and conspicuous yellow rays; unlike A. fruticulosa with divided leaves, small panicled capitula, and non-leathery bracts.",
    similarTitle: "沙蒿 Artemisia fruticulosa",
    similarName: "沙蒿",
    similarLatin: "Artemisia fruticulosa",
    similarBody:
      "相似种：沙蒿叶多羽状深裂，较小的头状花序常组成圆锥花序，总苞片不呈革质；本页革苞菊具全缘绒毛叶、单生头状花序和革质总苞。\nSimilar species: usually deeply divided leaves, smaller capitula in panicles, and non-leathery bracts; the page species has entire tomentose leaves, solitary capitula, and leathery bracts.",
  },
  蒙古韭: {
    selfTitle: "蒙古韭 Allium mongolicum",
    selfLatin: "Allium mongolicum",
    selfBody:
      "页面本种：叶近圆柱形且实心，花序较紧密；区别于野韭扁平或半圆柱形的中空叶、较疏花序和多为白色的花被片。\nPage species: nearly cylindrical solid leaves and a denser umbel; unlike A. ramosum with flat or semicylindrical hollow leaves, a looser umbel, and mostly white tepals.",
    similarTitle: "野韭 Allium ramosum",
    similarName: "野韭",
    similarLatin: "Allium ramosum",
    similarBody:
      "相似种：野韭叶扁平或半圆柱形而中空，花序较疏，花被片多白色；本页蒙古韭叶实心，花序更紧密。\nSimilar species: flat or semicylindrical hollow leaves, a looser umbel, and mostly white tepals; the page species has solid leaves and a denser umbel.",
    noteBody:
      "无花序和鳞茎特征时，线形叶不足以可靠鉴定蒙古韭；应同时查看叶片是否实心、花被片颜色、花序密度和地下鳞茎。\nLinear leaves alone are insufficient; solid versus hollow leaves, tepal colour, umbel density, and the bulb should be checked together.",
  },
  肉苁蓉: {
    selfTitle: "肉苁蓉 Cistanche deserticola",
    selfLatin: "Cistanche deserticola",
    selfBody:
      "页面本种：多寄生于梭梭等寄主，花冠黄色或淡黄色、裂片相对较短；区别于管花肉苁蓉多寄生柽柳、花橙黄至红且裂片更长。\nPage species: commonly parasitic on Haloxylon hosts, with yellow to pale-yellow flowers and relatively shorter corolla lobes; unlike C. tubulosa, usually on Tamarix, with orange-yellow to red flowers and longer lobes.",
    similarTitle: "管花肉苁蓉 C. tubulosa",
    similarName: "管花肉苁蓉",
    similarLatin: "Cistanche tubulosa",
    similarBody:
      "相似种：管花肉苁蓉多寄生于柽柳属，花冠裂片较长，花色橙黄至红；本页肉苁蓉多与梭梭寄主相连，花黄色或淡黄色。\nSimilar species: mainly parasitic on Tamarix, with longer corolla lobes and orange-yellow to red flowers; the page species is commonly linked to Haloxylon hosts and has yellow to pale-yellow flowers.",
  },
  文冠果: {
    selfTitle: "文冠果 Xanthoceras sorbifolium",
    selfLatin: "Xanthoceras sorbifolium",
    selfBody:
      "页面本种：花白色，中央常由黄转红，果为球形木质蒴果；区别于栾树的黄色花和膨大灯笼状膜质蒴果。\nPage species: white flowers whose centres often change from yellow to red, and a spherical woody capsule; unlike K. paniculata with yellow flowers and an inflated lantern-like papery capsule.",
    similarTitle: "栾树 Koelreuteria paniculata",
    similarName: "栾树",
    similarLatin: "Koelreuteria paniculata",
    similarBody:
      "相似种：栾树花黄色，果实为膨大的灯笼状膜质蒴果；本页文冠果花白色，果为球形木质蒴果。\nSimilar species: yellow flowers and an inflated lantern-like papery capsule; the page species has white flowers and a spherical woody capsule.",
  },
  蒙古扁桃: {
    selfTitle: "蒙古扁桃 Prunus mongolica",
    selfLatin: "Prunus mongolica",
    selfBody:
      "页面本种：叶不裂、花单瓣，果实小而密被绒毛；区别于欧李成熟果红色、无毛或仅疏生柔毛。\nPage species: unlobed leaves, single flowers, and small densely pubescent fruit; unlike P. humilis with red mature fruit that is glabrous or only sparsely hairy.",
    similarTitle: "欧李 Prunus humilis",
    similarName: "欧李",
    similarLatin: "Prunus humilis",
    similarBody:
      "相似种：欧李成熟果红色，表面无毛或仅疏生柔毛；本页蒙古扁桃果实较小且密被绒毛，枝、叶与果应合看。\nSimilar species: red mature fruit that is glabrous or only sparsely hairy; the page species has smaller, densely pubescent fruit and should be checked with shoot and leaf characters.",
  },
  发菜: {
    selfTitle: "发菜 Nostoc flagelliforme",
    selfLatin: "Nostoc flagelliforme",
    selfBody:
      "页面本种：群体为细长丝状，陆生于干旱环境；区别于地木耳的片状或不规则团块状群体及较湿润生境。\nPage species: slender filamentous terrestrial colonies in arid habitats; unlike N. commune with sheet-like or irregular clumps on wetter soil or rock surfaces.",
    similarTitle: "地木耳 Nostoc commune",
    similarName: "地木耳",
    similarLatin: "Nostoc commune",
    similarBody:
      "相似种：地木耳群体呈片状或不规则团块，多见于较湿润的土壤或岩面；本页发菜为干旱地表的细长丝状群体。\nSimilar species: sheet-like or irregular colonies, usually on wetter soil or rock surfaces; the page species forms slender filaments on arid ground.",
    noteBody:
      "发菜不是维管植物，而是陆生蓝细菌群体；传统搂采会连同生物土壤结皮一起破坏并加剧风蚀，保护重点是地表结皮及其完整微生境。\nIt is a terrestrial cyanobacterial colony, not a vascular plant; raking damages biological soil crusts and intensifies wind erosion, so protection must focus on the crust and its intact microhabitat.",
  },
};

function baseName(pageName) {
  return pageName
    .replace(/^封面·/, "")
    .replace(/\s*·\s*(实拍图版|科学插图版|实拍照片版)$/, "")
    .replace(/-配图版$/, "")
    .replace(/复制$/, "");
}

function findBlock(blocks, prefix) {
  return blocks.find((block) => block.id === prefix || block.id.startsWith(`${prefix}-`));
}

function zeroCrop(block) {
  if (block && "crop" in block) {
    block.crop = { left: 0, right: 0, top: 0, bottom: 0 };
  }
}

function normalisePage(page) {
  const key = baseName(page.name);
  const comparison = comparisons[key];
  if (!comparison) throw new Error(`No similar-species mapping for page: ${page.name}`);

  const blocks = page.blocks;
  const selfTitle = findBlock(blocks, "sim-1-title");
  const selfBody = findBlock(blocks, "sim-1-body");
  const similarTitle = findBlock(blocks, "sim-2-title");
  const similarBody = findBlock(blocks, "sim-2-body");
  const sectionSub = findBlock(blocks, "sec-sim-sub");
  const selfImage = findBlock(blocks, "sim-img-1");
  const similarImage = findBlock(blocks, "sim-img-2");
  const mainImage = findBlock(blocks, "img-main");

  if (!selfTitle || !selfBody || !similarTitle || !similarBody) {
    throw new Error(`Incomplete similar-species section on page: ${page.name}`);
  }

  const wasNormalised = selfTitle.text?.startsWith(key);
  const oldLeftSource = selfImage?.src ?? null;
  const oldLeftCrop = selfImage?.crop ? { ...selfImage.crop } : undefined;

  selfTitle.text = comparison.selfTitle;
  selfBody.text = comparison.selfBody;
  similarTitle.text = comparison.similarTitle;
  similarBody.text = comparison.similarBody;
  if (sectionSub) {
    sectionSub.text = "左：页面本种 · 右：相似种  LEFT: PAGE SPECIES · RIGHT: SIMILAR SPECIES";
  }

  if (selfImage) {
    selfImage.label = `${key}（${comparison.selfLatin}）页面本种识别图`;
  }
  if (similarImage) {
    similarImage.label = `${comparison.similarName}（${comparison.similarLatin}）相似种对照图`;
  }

  if (!wasNormalised && selfImage && similarImage) {
    const mainSource = mainImage?.src;
    selfImage.src =
      typeof mainSource === "string" && !mainSource.startsWith("data:") ? mainSource : null;
    similarImage.src = oldLeftSource;
    zeroCrop(selfImage);
    if (oldLeftCrop && "crop" in similarImage) similarImage.crop = oldLeftCrop;
  }

  if (comparison.noteBody) {
    const noteBody = findBlock(blocks, "sec-note-body");
    if (!noteBody) throw new Error(`Missing important-note body on page: ${page.name}`);
    noteBody.text = comparison.noteBody;
  }
}

function validate(state, file) {
  for (const page of state.pages) {
    const key = baseName(page.name);
    const comparison = comparisons[key];
    const blocks = page.blocks;
    const selfTitle = findBlock(blocks, "sim-1-title")?.text ?? "";
    const selfBody = findBlock(blocks, "sim-1-body")?.text ?? "";
    const similarTitle = findBlock(blocks, "sim-2-title")?.text ?? "";
    const similarBody = findBlock(blocks, "sim-2-body")?.text ?? "";
    const noteBody = findBlock(blocks, "sec-note-body")?.text ?? "";
    const humanitiesBody = findBlock(blocks, "sec-hum-body")?.text ?? "";

    if (!selfTitle.startsWith(key) || similarTitle === selfTitle) {
      throw new Error(`${file}: invalid left/right titles on ${page.name}`);
    }
    if (!selfBody.includes(comparison.similarName) || !similarBody.includes(key)) {
      throw new Error(`${file}: comparison text is not reciprocal on ${page.name}`);
    }
    if (noteBody && noteBody === humanitiesBody) {
      throw new Error(`${file}: important note duplicates humanities on ${page.name}`);
    }
  }
}

for (const relativeFile of STATE_FILES) {
  const file = resolve(ROOT, relativeFile);
  const state = JSON.parse(await readFile(file, "utf8"));
  for (const page of state.pages) normalisePage(page);
  validate(state, relativeFile);
  await writeFile(file, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`Updated ${relativeFile}: ${state.pages.length} pages`);
}
