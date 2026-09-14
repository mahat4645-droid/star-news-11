// Generates the site icons (favicon, home-screen / Android icons) and the default social-share image.
//   npm run icons
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const ICONS = PUBLIC + 'icons/';
mkdirSync(ICONS, { recursive: true });
const settings = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/settings.json', import.meta.url)), 'utf8'));

// "A." mark drawn as a shape, so it looks the same everywhere without depending on installed fonts.
const A = 'M29 17h6l11 30h-6.4l-2.3-6.5H26.7L24.4 47H18Zm-.4 17.5h6.8L32 25Z';
const mark = (size, { radius = 14, scale = 1 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${radius}" fill="#141414"/>
  <g transform="translate(32 32) scale(${scale}) translate(-34 -32)">
    <path d="${A}" fill="#faf8f4" fill-rule="evenodd"/>
    <circle cx="52" cy="44.5" r="4" fill="#e11d38"/>
  </g>
</svg>`;

writeFileSync(PUBLIC + 'favicon.svg', mark(64) + '\n');
for (const [name, size, opts] of [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { radius: 0, scale: 0.72 }],
  ['apple-touch-icon.png', 180, { radius: 0, scale: 0.85 }],
]) {
  await sharp(Buffer.from(mark(size, opts))).png().toFile(ICONS + name);
  console.log('  ✓ public/icons/' + name);
}

// Default share image (used by pages without their own photo).
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#111214"/>
  <g transform="translate(96 150) scale(3.2)">${mark(64).replace(/<\?xml[^>]*>|<svg[^>]*>|<\/svg>/g, '')}</g>
  <text x="96" y="470" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="92" fill="#f4f1eb">${settings.site_title}<tspan fill="#e11d38">.</tspan></text>
  <text x="100" y="530" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#a39f97">${settings.site_url.replace(/^https?:\/\//, '')}</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile(PUBLIC + 'og-default.png');
console.log('  ✓ public/favicon.svg, public/og-default.png');
