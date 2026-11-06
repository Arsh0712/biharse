import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const DIR = '/home/z/my-project/public/img';
fs.mkdirSync(DIR, { recursive: true });

const STYLE = 'warm editorial food photography, rustic dark walnut wood table, aged brass and terracotta props, cream linen cloth, soft golden sunrise window light from the left, deep soft shadows, rich amber and red-brown tones, subtle steam, macro texture detail, medium format camera look, shallow depth of field, no text, no words, high quality, detailed';

const JOBS = [
  ['hero-ghat.png', '1344x768', 'cinematic wide view of an Indian river ghat at sunrise, glowing red and saffron gradient sky, morning mist over the holy river, floating clay diya oil lamps with warm flames on the water steps, distant temple spires silhouette, devotees far away in silhouette, golden light rays, painterly cinematic mood, no text'],
  ['thekua-chini-1.png', '1024x1024', 'stack of golden-brown Indian thekua cookies with embossed floral patterns pressed on top, arranged on an aged terracotta plate, sugar-crusted edges, wheat flour dusted on wood, ' + STYLE],
  ['thekua-chini-2.png', '1024x1024', 'close-up of thekua cookies on a hammered brass plate, raw sugar crystals and wheat flour scattered, jaggery blocks blurred in background, ' + STYLE],
  ['thekua-gur-1.png', '1024x1024', 'deep amber jaggery thekua cookies stacked on dark roasted wood, glossy caramelized surface, small copper pot of melted golden jaggery glowing behind, ' + STYLE],
  ['thekua-gur-2.png', '1024x1024', 'extreme macro of a jaggery thekua cookie showing embossed flower pattern, glistening molten jaggery drips, toasted sesame seeds, ' + STYLE],
  ['namkeen-bhujia.png', '1024x1024', 'crispy thin yellow moth bhujia namkeen sev piled in an aged brass bowl, red chili powder and curry leaves nearby, ' + STYLE],
  ['namkeen-khaja.png', '1024x1024', 'layered flaky khaja pastries from Bihar stacked on a wooden board, golden crisp layers, light sugar glaze, ' + STYLE],
  ['namkeen-nimki.png', '1024x1024', 'diamond-cut nimki namkeen fried crackers scattered on raw cream canvas with a terracotta bowl, fenugreek leaves, ' + STYLE],
  ['namkeen-sattu.png', '1024x1024', 'round roasted sattu gram-flour energy laddus on a banana leaf with roasted chana and millet, dusted roasted flour, ' + STYLE],
  ['gift-box.png', '1344x768', 'luxury red gift box with an embossed golden mandala ornament on the lid, open lid revealing thekua cookies in gold paper cups and a small message card, silk ribbon, ' + STYLE],
  ['chhath-hamper.png', '1344x768', 'traditional bamboo soop winnow basket holding thekua cookies, surrounded by lit clay diyas, sugarcane stalks, red Netrapatra offering, warm sunrise glow, devotional arrangement, ' + STYLE],
  ['story-kneading.png', '1024x1024', 'womans hands kneading soft wheat flour dough in a rustic clay bowl, ghee jar and flour dust on wooden table, warm light, ' + STYLE],
  ['story-jaggery.png', '1024x1024', 'dark golden jaggery blocks melting into syrup in a copper pot, wooden spoon, rich caramel swirls, ' + STYLE],
  ['story-mould.png', '1024x1024', 'old carved wooden thekua mould with intricate floral engraving, fresh dough being pressed into it showing the imprint, flour dust, ' + STYLE],
  ['story-frying.png', '1024x1024', 'thekua cookies frying in bubbling golden ghee in a traditional iron kadhai, slotted spoon, glowing warm light, ' + STYLE],
  ['story-packing.png', '1024x1024', 'hands sealing kraft paper pouches of cookies at a clean hygienic packing table, sticker labels, neatly lined pouches, ' + STYLE],
  ['kitchen-wide.png', '1344x768', 'cozy traditional Bihari home kitchen courtyard at morning, clay stove with gentle smoke, brass utensils hanging, wheat sacks, marigold flowers, warm sunbeam, no people, ' + STYLE],
];

const zai = await ZAI.create();
for (const [name, size, prompt] of JOBS) {
  const out = `${DIR}/${name}`;
  if (fs.existsSync(out)) { console.log('skip', name); continue; }
  let ok = false;
  for (let t = 1; t <= 3 && !ok; t++) {
    try {
      const r = await zai.images.generations.create({ prompt, size });
      fs.writeFileSync(out, Buffer.from(r.data[0].base64, 'base64'));
      console.log('OK', name, size);
      ok = true;
    } catch (e) {
      console.error('FAIL', name, t, e.message);
      await new Promise(s => setTimeout(s, 2500 * t));
    }
  }
}
console.log('ALL DONE');
