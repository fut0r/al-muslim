// Generates the bundled tafsir from Al-Mukhtasar, Arabic and English.
//
// The wording is copied verbatim from the Tafsir Center for Quranic Studies
// edition exported by spa5k/tafsir_api (pinned tag). An ayah that edition
// leaves without its own note stays empty: this script never fills a gap,
// rewrites a sentence, or substitutes a neighbouring ayah.
//
//   npm run data:tafsir
//
// Never edit public/data/tafsir by hand. If the pinned export changes, the
// checksum below fails on purpose so the difference can be reviewed first.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PIN = 'v1.2.3';
const SOURCE = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@${PIN}/tafsir`;

const EDITIONS = [
  { language: 'ar', edition: 'ar-tafsir-al-mukhtasar' },
  { language: 'en', edition: 'en-tafsir-al-mukhtasar' },
];

// SHA-256 of every ayah text in language, surah and ayah order, separated by
// NUL. An empty string is still hashed, so a filled-in gap changes the sum.
// Update this only after reviewing a new export from the Tafsir Center.
const EXPECTED_SHA256 = '4ed3ea1a7dcbe7d4e257995bd1de67af3ccb42f6d1447fa64587afd78d73d989';

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const surahs = JSON.parse(readFileSync(join(root, 'src', 'data', 'quran', 'surahs.json'), 'utf8'));
if (!Array.isArray(surahs) || surahs.length !== 114) fail('src/data/quran/surahs.json must list 114 surahs');

async function fetchJson(url) {
  let last = 'no response';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        last = `HTTP ${response.status}`;
      } else {
        return await response.json();
      }
    } catch (error) {
      last = error instanceof Error ? error.message : 'network error';
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 400 * attempt));
  }
  fail(`${url} (${last})`);
}

/**
 * One surah as a string per ayah. Missing ayahs are "" — the export's way of
 * saying this ayah has no note of its own.
 */
function align(language, surah, entries) {
  const expected = surahs[surah - 1].ayahs;
  if (!Array.isArray(entries)) fail(`${language} ${surah}: expected a list of ayahs`);
  const ayahs = Array.from({ length: expected }, () => '');
  const seen = new Set();
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object') fail(`${language} ${surah}: an entry is not an object`);
    const number = entry.ayah;
    const text = entry.text;
    const where = `${language} ${surah}:${number}`;
    if (!Number.isInteger(number) || number < 1 || number > expected) fail(`${where} is outside 1–${expected}`);
    if (entry.surah !== surah) fail(`${where} is tagged as surah ${entry.surah}`);
    if (typeof text !== 'string') fail(`${where} has no text`);
    if (seen.has(number)) fail(`${where} is duplicated`);
    seen.add(number);
    if (text.trim() === '') continue;
    if (text.includes('<') || text.includes('>')) fail(`${where} contains markup; the app stores plain text only`);
    ayahs[number - 1] = text;
  }
  return ayahs;
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

const collected = {};
for (const { language, edition } of EDITIONS) {
  const numbers = surahs.map((surah) => surah.id);
  collected[language] = await mapPool(numbers, 6, async (surah) => {
    const entries = await fetchJson(`${SOURCE}/${edition}/${surah}.json`);
    return align(language, surah, entries);
  });
  const empty = collected[language].flat().filter((text) => text === '').length;
  console.log(`  ${language}: ${collected[language].flat().length} ayahs, ${empty} without a separate note`);
}

const hash = createHash('sha256');
for (const { language } of EDITIONS) {
  for (const ayahs of collected[language]) {
    for (const text of ayahs) {
      hash.update(text);
      hash.update('\0');
    }
  }
}
const sha256 = hash.digest('hex');
if (EXPECTED_SHA256 && sha256 !== EXPECTED_SHA256) {
  fail(
    `tafsir checksum mismatch.\n  expected ${EXPECTED_SHA256}\n  actual   ${sha256}\n` +
      '  Review the export, then update EXPECTED_SHA256.',
  );
}
if (!EXPECTED_SHA256) console.log(`  sha256 ${sha256} (lock this in EXPECTED_SHA256 after review)`);

const outDir = join(root, 'public', 'data', 'tafsir');
for (const { language } of EDITIONS) {
  const dir = join(outDir, language);
  mkdirSync(dir, { recursive: true });
  collected[language].forEach((ayahs, index) => {
    writeFileSync(join(dir, `${index + 1}.json`), JSON.stringify(ayahs), 'utf8');
  });
}

writeFileSync(
  join(outDir, 'NOTICE.txt'),
  `The tafsir in this folder is Al-Mukhtasar in Interpreting the Noble Quran\n` +
    `(المختصر في تفسير القرآن الكريم), in Arabic (ar/) and English (en/).\n` +
    `One file per surah, one string per ayah, in ayah order. An empty string means\n` +
    `that edition has no separate note for that ayah; the gap is kept, not filled.\n\n` +
    `Publisher: Tafsir Center for Quranic Studies (مركز تفسير للدراسات القرآنية)\n` +
    `https://tafsir.net\n\n` +
    `The text is a verbatim copy of editions ar-tafsir-al-mukhtasar and\n` +
    `en-tafsir-al-mukhtasar from https://github.com/spa5k/tafsir_api tag ${PIN},\n` +
    `which redistributes the Quranic Universal Library export\n` +
    `(https://qul.tarteel.ai, resources 251 and 266).\n\n` +
    `Attribute the Tafsir Center when you share it. Do not edit the wording.\n` +
    `Regenerate with: npm run data:tafsir\n`,
  'utf8',
);

console.log(`✓ tafsir written (sha256 ${sha256.slice(0, 12)}…)`);
