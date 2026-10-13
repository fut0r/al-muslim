// Generates the bundled Quran text from the Tanzil Project (https://tanzil.net).
//
// The generated files are committed to the repository, so this script only
// needs to run when Tanzil publishes an update (https://tanzil.net/updates/).
//
//   npm run data:quran                      download from tanzil.net
//   npm run data:quran -- --source file.xml  use an XML file downloaded earlier
//
// Source: Tanzil Quran Text, Uthmani, with pause marks, sajdah signs and
// rub-el-hizb signs. It is taken WITHOUT the "tatweel below superscript alefs"
// option: the Amiri Quran typeface places the superscript alef itself, and with
// the added tatweel it does not draw the alef at all (ٱلرَّحْمَٰنِ would be shown
// without it).
//
// Tanzil's terms: the text may be copied verbatim but must not be changed, its
// source must be indicated with a link to tanzil.net, and its copyright notice
// must accompany the copies. So the text is written out exactly as received,
// the notice is written next to it (public/data/quran/NOTICE.txt), and the app
// credits Tanzil in its settings. Never edit the generated files by hand.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE_URL =
  'https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&rub=true&quranType=uthmani&outType=xml&agree=true';

// SHA-256 of all ayah texts joined with "\n" (Tanzil Uthmani 1.1). A different
// value means Tanzil has revised the text: review the change, then update this.
const EXPECTED_SHA256 = '5c704585f250a4a6cdff4312d316de13959dca45f01ea7e67b8f22e156721244';
const TOTAL_AYAHS = 6236;

// Arabic letters, harakat and Quranic annotation signs, plus the space.
// eslint-disable-next-line no-misleading-character-class -- combining marks are listed on purpose
const ALLOWED = /^[ ء-غـ-ٰٕٱۖ-ۭ]+$/;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const sourceFlag = process.argv.indexOf('--source');
let xml;
if (sourceFlag > 0) {
  xml = readFileSync(resolve(process.argv[sourceFlag + 1] ?? ''), 'utf8');
} else {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) fail(`tanzil.net answered HTTP ${response.status}`);
  xml = await response.text();
}

// The copyright block that Tanzil asks to keep with every copy.
const notice = xml.match(/<!--\s*([\s\S]*?)\s*-->/)?.[1];
if (!notice || !notice.includes('Tanzil Quran Text') || !notice.includes('Uthmani')) {
  fail('the Tanzil copyright notice was not found; is this the Uthmani XML download?');
}

// Ayah counts come from the surah index the app already ships.
const surahs = JSON.parse(readFileSync(join(root, 'src', 'data', 'quran', 'surahs.json'), 'utf8'));
if (surahs.length !== 114) fail('src/data/quran/surahs.json must list 114 surahs');

const text = [];
const basmalahs = new Map();
for (const sura of xml.matchAll(/<sura index="(\d+)" name="[^"]*">([\s\S]*?)<\/sura>/g)) {
  const number = Number(sura[1]);
  if (number !== text.length + 1) fail(`surah ${number} is out of order`);
  const ayahs = [];
  for (const aya of sura[2].matchAll(/<aya index="(\d+)" text="([^"]*)"(?: bismillah="([^"]*)")? \/>/g)) {
    const where = `${number}:${aya[1]}`;
    if (Number(aya[1]) !== ayahs.length + 1) fail(`ayah out of order at ${where}`);
    const ayah = aya[2];
    if (ayah === '' || ayah !== ayah.trim() || / {2}/.test(ayah)) fail(`empty or badly spaced text at ${where}`);
    if (!ALLOWED.test(ayah)) fail(`unexpected character at ${where}`);
    if (/ـٰ/.test(ayah)) fail(`tatweel below a superscript alef at ${where}: download without that option`);
    ayahs.push(ayah);
    if (aya[3] !== undefined) {
      if (ayahs.length !== 1 || !ALLOWED.test(aya[3])) fail(`unexpected basmalah at ${where}`);
      basmalahs.set(number, aya[3]);
    }
  }
  if (ayahs.length !== surahs[number - 1].ayahs) {
    fail(`surah ${number}: expected ${surahs[number - 1].ayahs} ayahs, found ${ayahs.length}`);
  }
  text.push(ayahs);
}
if (text.length !== 114 || text.flat().length !== TOTAL_AYAHS) fail(`expected 114 surahs and ${TOTAL_AYAHS} ayahs`);

const sha256 = createHash('sha256').update(text.flat().join('\n'), 'utf8').digest('hex');
if (sha256 !== EXPECTED_SHA256) {
  fail(
    `text checksum mismatch.\n  expected ${EXPECTED_SHA256}\n  actual   ${sha256}\n` +
      '  If Tanzil has published a revision, review the difference and update EXPECTED_SHA256.',
  );
}

// The basmalah that opens a surah is not one of its ayahs (except in
// Al-Fatihah, and At-Tawbah has none). Tanzil gives it with each surah; it is
// the same everywhere but in two surahs, so those two are kept as given.
const forms = new Map();
for (const [number, form] of basmalahs) forms.set(form, [...(forms.get(form) ?? []), number]);
const [common] = [...forms].sort((a, b) => b[1].length - a[1].length)[0];
if (common !== text[0][0]) fail('the usual basmalah should be the first ayah of Al-Fatihah');
if (basmalahs.has(1) || basmalahs.has(9) || basmalahs.size !== 112) fail('expected a basmalah for every surah except 1 and 9');
const variants = Object.fromEntries([...basmalahs].filter(([, form]) => form !== common));

const outDir = join(root, 'public', 'data', 'quran');
mkdirSync(outDir, { recursive: true });
text.forEach((ayahs, index) => {
  writeFileSync(join(outDir, `${index + 1}.json`), JSON.stringify(ayahs), 'utf8');
});
writeFileSync(
  join(outDir, 'NOTICE.txt'),
  `The Quran text in this folder (1.json to 114.json, one surah per file, one ayah per entry)\n` +
    `is a verbatim copy of the text published by the Tanzil Project, https://tanzil.net,\n` +
    `with the basmalah that opens a surah kept apart from its first ayah, as in Tanzil's XML.\n` +
    `Tanzil's notice follows.\n\n${notice}\n`,
  'utf8',
);
writeFileSync(
  join(root, 'src', 'data', 'quran', 'basmalah.json'),
  `${JSON.stringify({ text: common, variants }, null, 1)}\n`,
  'utf8',
);

console.log(
  `✓ 114 surahs, ${TOTAL_AYAHS} ayahs written from Tanzil (sha256 ${sha256.slice(0, 12)}…); ` +
    `basmalah variants in surahs ${Object.keys(variants).join(', ') || 'none'}`,
);
