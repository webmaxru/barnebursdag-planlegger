// Dev-only: rasterize public/icon.svg into PWA PNG icons.
// Run with: npm i sharp --no-save && npm run icons
// The generated PNGs are committed; sharp is NOT a project dependency (kept out of Docker).
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const pub = path.join(process.cwd(), 'public');
const svg = await readFile(path.join(pub, 'icon.svg'));

async function out(name, size) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(path.join(pub, name));
  console.log('✓', name);
}

await out('icon-192.png', 192);
await out('icon-512.png', 512);
await out('icon-180.png', 180);

// Maskable: full-bleed pink background with the cake inside the safe zone.
const bg = { create: { width: 512, height: 512, channels: 4, background: '#ff6b9d' } };
const inner = await sharp(svg, { density: 384 }).resize(396, 396).png().toBuffer();
await sharp(bg).composite([{ input: inner, gravity: 'center' }]).png().toFile(path.join(pub, 'icon-maskable-512.png'));
console.log('✓ icon-maskable-512.png');
