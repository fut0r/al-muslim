// Generates the bundled Quran data from verified upstream sources.
//
// The generated files are committed to the repository, so this script only
// needs to run when the upstream text changes. The source packages are large
// and are intentionally NOT project dependencies. To regenerate:
//
//   npm install --no-save quran-validator@1.3.0 quran-json@3.1.2
//   npm run data:quran
//
// Sources
//   - Arabic text: Uthmani script as published by Quran.com (standard Unicode,
//     renders with any Quranic font such as Amiri Quran), taken from the
//     `quran-validator` package.
//   - Surah names (transliteration and meaning): `quran-json`.
//
// The Quran text is copied byte-for-byte. It must never be edited by hand.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = resolve(process.env.DATA_SRC ?? join(root, 'node_modules'));

// Ayah count of every surah (Hafs, Kufan count). Used as an integrity check.
const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112,
  78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37,
  35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8,
  8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];
const TOTAL_AYAHS = 6236;

// SHA-256 of all ayah texts joined with "\n". Regenerating from a different
// upstream revision must be a deliberate, reviewed change.
const EXPECTED_SHA256 = '3a802babd61fd0835121feea6c054e16df4809417968e1f7b58aa18cdbae6e66';

// Arabic letters, harakat and Quranic annotation signs, plus the space.
// eslint-disable-next-line no-misleading-character-class -- combining marks are listed on purpose
const ALLOWED = /^[ \u0621-\u063A\u0640-\u0655\u0670\u0671\u06D6-\u06ED]+$/;

function readJson(...parts) {
  return JSON.parse(readFileSync(join(modules, ...parts), 'utf8'));
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const verses = readJson('quran-validator', 'data', 'quran-verses.min.json');
const surahMeta = readJson('quran-validator', 'data', 'quran-surahs.min.json');
const names = readJson('quran-json', 'dist', 'chapters', 'en', 'index.json');

if (verses.length !== TOTAL_AYAHS) fail(`expected ${TOTAL_AYAHS} ayahs, found ${verses.length}`);
if (surahMeta.length !== 114 || names.length !== 114) fail('expected 114 surahs');

const bySurah = Array.from({ length: 114 }, () => []);
for (const verse of verses) {
  const list = bySurah[verse.surah - 1];
  if (!list) fail(`ayah with invalid surah number ${verse.surah}`);
  if (verse.ayah !== list.length + 1) fail(`ayah out of order at ${verse.surah}:${verse.ayah}`);
  if (typeof verse.text !== 'string' || verse.text !== verse.text.trim() || verse.text === '') {
    fail(`empty or untrimmed text at ${verse.surah}:${verse.ayah}`);
  }
  if (!ALLOWED.test(verse.text)) fail(`unexpected character at ${verse.surah}:${verse.ayah}`);
  if (/ {2}/.test(verse.text)) fail(`double space at ${verse.surah}:${verse.ayah}`);
  list.push(verse.text);
}

bySurah.forEach((list, index) => {
  if (list.length !== AYAH_COUNTS[index]) {
    fail(`surah ${index + 1}: expected ${AYAH_COUNTS[index]} ayahs, found ${list.length}`);
  }
});

const sha256 = createHash('sha256').update(bySurah.flat().join('\n'), 'utf8').digest('hex');
if (sha256 !== EXPECTED_SHA256) {
  fail(
    `text checksum mismatch.\n  expected ${EXPECTED_SHA256}\n  actual   ${sha256}\n` +
      '  If the upstream text was intentionally updated, review the diff and update EXPECTED_SHA256.',
  );
}

const outDir = join(root, 'public', 'data', 'quran');
mkdirSync(outDir, { recursive: true });
bySurah.forEach((list, index) => {
  writeFileSync(join(outDir, `${index + 1}.json`), JSON.stringify(list), 'utf8');
});

const surahs = surahMeta.map((meta, index) => {
  const name = names[index];
  if (meta.number !== index + 1 || name.id !== index + 1) fail(`surah metadata out of order at ${index + 1}`);
  return {
    id: index + 1,
    name: meta.name,
    englishName: name.transliteration,
    meaning: name.translation,
    revelation: meta.revelationType === 'Medinan' ? 'medinan' : 'meccan',
    ayahs: AYAH_COUNTS[index],
  };
});

const indexDir = join(root, 'src', 'data', 'quran');
mkdirSync(indexDir, { recursive: true });
writeFileSync(join(indexDir, 'surahs.json'), `${JSON.stringify(surahs, null, 1)}\n`, 'utf8');

console.log(`✓ 114 surahs, ${TOTAL_AYAHS} ayahs written (sha256 ${sha256.slice(0, 12)}…)`);
