// Renders the raster icons that platforms require from the SVG logo.
// The SVG files are the source of truth; the PNGs are generated and committed.
//
//   npm run icons

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const logo = readFileSync(join(root, 'public', 'logo.svg'));
const maskable = readFileSync(join(root, 'scripts', 'assets', 'icon-maskable.svg'));
const monochrome = readFileSync(join(root, 'scripts', 'assets', 'icon-monochrome.svg'));

async function render(svg, size, file) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  console.log(`  ${file.slice(root.length + 1)}`);
}

const web = join(root, 'public', 'icons');
await render(logo, 192, join(web, 'icon-192.png'));
await render(logo, 512, join(web, 'icon-512.png'));
// Full-bleed variants: the platform applies its own mask (Android) or corner radius (iOS).
await render(maskable, 512, join(web, 'maskable-512.png'));
await render(maskable, 180, join(web, 'apple-touch-icon.png'));
// Single-colour mark for the notification badge.
await render(monochrome, 96, join(web, 'badge-96.png'));

// Launcher icons for Android versions older than 8.0, which lack adaptive icons.
const androidRes = join(root, 'android', 'app', 'src', 'main', 'res');
if (existsSync(androidRes)) {
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    await render(logo, size, join(androidRes, `mipmap-${density}`, 'ic_launcher.png'));
    await render(logo, size, join(androidRes, `mipmap-${density}`, 'ic_launcher_round.png'));
  }
}

console.log('✓ icons generated');
