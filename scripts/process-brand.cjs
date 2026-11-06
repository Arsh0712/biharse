const sharp = require('sharp');
const path = require('path');
const U = '/home/z/my-project/upload';
const B = '/home/z/my-project/public/brand';

async function sampleRed() {
  // sample dominant red from mandala
  const img = sharp(path.join(U, 'd3c156ac-fe3d-45b8-bc8f-2347106ef5d8.png'));
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const counts = {};
  for (let i = 0; i < data.length; i += info.channels * 97) {
    const r = data[i], g = data[i+1], b = data[i+2];
    if (r > 150 && g < 90 && b < 90) { // red-ish
      const key = `${r >> 3 << 3},${g >> 3 << 3},${b >> 3 << 3}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  console.log('TOP REDS:', top.map(([k,v])=>`#${k.split(',').map(h=>(+h).toString(16).padStart(2,'0')).join('')} x${v}`).join('  '));
}

async function removeBg(input, output, mode) {
  // mode 'black' removes near-black bg, 'white' removes near-white bg
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i], g = out[i+1], b = out[i+2];
    const lum = (r + g + b) / 3;
    const dist = mode === 'black'
      ? Math.sqrt(r*r + g*g + b*b)
      : Math.sqrt((255-r)*(255-r) + (255-g)*(255-g) + (255-b)*(255-b));
    if (dist < 60) {
      // feather: alpha proportional to distance
      out[i+3] = Math.max(0, Math.min(255, Math.round((dist - 25) * (255/35))));
    }
  }
  await sharp(out, { raw: { width, height, channels } }).png().toFile(output);
  console.log('wrote', output);
}

async function main() {
  await sampleRed();
  const mandalaIn = path.join(U, 'd3c156ac-fe3d-45b8-bc8f-2347106ef5d8.png');
  const lockupDarkIn = path.join(U, '027e1776-1dba-441f-8d25-bb6d772f37ed.png');
  const lockupLightIn = path.join(U, 'd9429b0a-1b7b-40ce-9ea7-81500ce2c60b.png');
  await removeBg(lockupDarkIn, path.join(B, 'lockup-dark.png'), 'black');
  await removeBg(lockupLightIn, path.join(B, 'lockup-light.png'), 'white');
  // mandala: trim + resize square
  await sharp(mandalaIn).trim().resize(720, 720, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toFile(path.join(B, 'mandala.png'));
  // favicon set
  await sharp(mandalaIn).trim().resize(512, 512, { fit: 'contain', background: { r:217,g:0,b:27,alpha:1 } }).flatten({ background: { r:217,g:0,b:27,alpha:1 } }).png().toFile('/home/z/my-project/src/app/icon.png');
  await sharp(mandalaIn).trim().resize(180, 180, { fit: 'contain', background: { r:217,g:0,b:27,alpha:1 } }).flatten({ background: { r:217,g:0,b:27,alpha:1 } }).png().toFile('/home/z/my-project/src/app/apple-icon.png');
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
