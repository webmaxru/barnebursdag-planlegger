// Dev-only: rasterize public/icon.svg and public/og-image.svg into production image assets.
// Run with: npm i sharp png-to-ico --no-save --package-lock=false && npm run icons
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const pub = path.join(process.cwd(), 'public');
const iconSvg = await readFile(path.join(pub, 'icon.svg'));
const ogSvg = await readFile(path.join(pub, 'og-image.svg'));

async function renderSquare(name, size) {
  await sharp(iconSvg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(pub, name));
  console.log('✓', name);
}

async function renderOg() {
  await sharp(ogSvg, { density: 384 })
    .resize(1200, 630)
    .png()
    .toFile(path.join(pub, 'og-image.png'));
  console.log('✓ og-image.png');
}

await renderSquare('icon-192.png', 192);
await renderSquare('icon-512.png', 512);
await renderSquare('icon-180.png', 180);
await renderSquare('favicon-48.png', 48);
await renderSquare('favicon-32.png', 32);
await renderSquare('favicon-16.png', 16);

const maskableIcon = await sharp(iconSvg, { density: 384 })
  .resize(400, 400)
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: '#FF6B9D',
  },
})
  .composite([{ input: maskableIcon, gravity: 'center' }])
  .png()
  .toFile(path.join(pub, 'icon-maskable-512.png'));
console.log('✓ icon-maskable-512.png');

await renderOg();

try {
  const { default: pngToIco } = await import('png-to-ico');
  const ico = await pngToIco([
    path.join(pub, 'favicon-16.png'),
    path.join(pub, 'favicon-32.png'),
    path.join(pub, 'favicon-48.png'),
  ]);
  await writeFile(path.join(pub, 'favicon.ico'), ico);
  console.log('✓ favicon.ico');
} catch (error) {
  console.warn('! favicon.ico skipped:', error.message);
}
