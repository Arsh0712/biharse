const sharp = require('sharp');
(async () => {
  const hero = await sharp('public/img/hero-ghat.png').resize(1200, 630, { fit: 'cover', position: 'attention' }).toBuffer();
  const lockup = await sharp('public/brand/lockup-light.png').resize(340, null).png().toBuffer();
  const lockupMeta = await sharp(lockup).metadata();
  const badge = await sharp('public/brand/mandala.png').resize(120, 120).png().toBuffer();
  const svg = Buffer.from(`<svg width="1200" height="630"><rect width="1200" height="630" fill="rgba(29,12,4,0.42)"/></svg>`);
  await sharp(hero)
    .composite([
      { input: svg },
      { input: badge, left: 540 - 60, top: 315 - 60 - 88 },
      { input: lockup, left: 600 - Math.round(lockupMeta.width / 2), top: 315 + 40 },
    ])
    .png({ quality: 92 })
    .toFile('public/img/og-image.png');
  console.log('og-image.png written');
})();
