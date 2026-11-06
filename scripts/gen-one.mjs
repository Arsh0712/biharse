import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
const zai = await ZAI.create();
const r = await zai.images.generations.create({
  prompt: 'a tall stack of round dark caramel-brown rustic cookies with a cracked crackled surface on a cream linen cloth over dark walnut wood, a brass pot of thick golden molten syrup glowing softly behind, small wooden bowl of brown sugar crystals beside, warm editorial food photography, aged brass and terracotta props, soft golden window light from the left, deep soft shadows, macro texture detail, shallow depth of field, plain empty beige wall behind, no writing of any kind, no letters, no typography, no symbols, clean uncluttered image, high quality, detailed',
  size: '1024x1024',
});
fs.writeFileSync('/home/z/my-project/public/img/thekua-gur-1.png', Buffer.from(r.data[0].base64, 'base64'));
console.log('OK');
