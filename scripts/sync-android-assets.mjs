// Copies files that the Android app needs as native resources.
//
// The adhan is committed once, in public/audio, and used by the web app from
// there. Android can only use a notification sound that is a raw resource, so
// it is copied into the Android project before each native build.
//
//   npm run android:sync   (runs this, then `cap sync android`)

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public', 'audio', 'adhan.mp3');
const target = join(root, 'android', 'app', 'src', 'main', 'res', 'raw', 'adhan.mp3');

if (!existsSync(source)) {
  console.error('✗ public/audio/adhan.mp3 is missing');
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log('✓ adhan copied to the Android raw resources');
