/**
 * Builds public/data/recitation/<reciter>.json: the moment each ayah begins in
 * each reciter's recording of each surah, so the app can follow a recitation
 * ayah by ayah and start it from any ayah.
 *
 * The timings are published by mp3quran.net for the very recordings the app
 * streams. They are checked for completeness here, and the few surahs whose
 * published timings do not fit their audio are fixed from
 * recitation-corrections.json.
 *
 * Usage: node scripts/build-recitation-data.mjs [--cache <directory>]
 *   --cache keeps the downloaded responses, so a second run needs no network.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECITERS } from '../src/data/reciters.ts';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'public', 'data', 'recitation');
const TIMINGS_API = 'https://www.mp3quran.net/api/v3/ayat_timing';

/**
 * Surahs where the published timings label the first ayah as the lead-in, so
 * every ayah number is one too low. There the recording's first entry is
 * ayah 1 and it starts with the audio.
 */
const FIRST_AYAH_IN_LEAD_IN = {
  husary: [1],
  minshawi: [9],
};

const cacheFlag = process.argv.indexOf('--cache');
const cacheDir = cacheFlag > 0 ? path.resolve(process.argv[cacheFlag + 1] ?? '') : null;

const surahs = JSON.parse(await readFile(path.join(root, 'src', 'data', 'quran', 'surahs.json'), 'utf8'));
const corrections = JSON.parse(await readFile(path.join(root, 'scripts', 'recitation-corrections.json'), 'utf8'));

async function fetchTimings(reciter, surah) {
  const cached = cacheDir && path.join(cacheDir, `${reciter.id}-${surah}.json`);
  if (cached) {
    try {
      return JSON.parse(await readFile(cached, 'utf8'));
    } catch {
      // Not downloaded yet.
    }
  }
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(`${TIMINGS_API}?surah=${surah}&read=${reciter.read}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const data = JSON.parse(text);
      if (cached) await writeFile(cached, text);
      return data;
    } catch (error) {
      if (attempt === 4) throw new Error(`${reciter.id}, surah ${surah}: ${error.message}`, { cause: error });
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
}

/** [start of ayah 1, …, start of the last ayah, end of the last ayah], in milliseconds. */
function buildSurah(reciter, surah, data) {
  const where = `${reciter.id}, surah ${surah.id}`;
  if (!Array.isArray(data)) throw new Error(`${where}: unexpected response`);

  const entries = data.filter((entry) => entry.ayah >= 1).sort((a, b) => a.ayah - b.ayah);
  entries.forEach((entry, index) => {
    if (entry.ayah !== index + 1) throw new Error(`${where}: ayah ${index + 1} is missing`);
  });

  const shifted = (FIRST_AYAH_IN_LEAD_IN[reciter.id] ?? []).includes(surah.id);
  const expected = shifted ? surah.ayahs - 1 : surah.ayahs;
  if (entries.length !== expected) {
    throw new Error(`${where}: ${entries.length} ayahs are timed, expected ${expected}`);
  }

  let starts = entries.map((entry) => entry.start_time);
  let end = entries.at(-1).end_time;

  const correction = corrections[reciter.id]?.[surah.id];
  if (correction?.starts) {
    if (correction.starts.length !== starts.length) throw new Error(`${where}: the correction has the wrong length`);
    starts = correction.starts;
    end = correction.end;
  } else if (correction?.offset) {
    starts = starts.map((start) => start + correction.offset);
    end += correction.offset;
  }

  const timings = [...(shifted ? [0] : []), ...starts, end];
  timings.forEach((time, index) => {
    if (!Number.isInteger(time) || time < 0 || (index > 0 && time <= timings[index - 1])) {
      throw new Error(`${where}: times are not increasing at position ${index}`);
    }
  });
  return timings;
}

await mkdir(out, { recursive: true });
if (cacheDir) await mkdir(cacheDir, { recursive: true });

for (const reciter of RECITERS) {
  const result = new Array(surahs.length);
  const queue = [...surahs];
  const worker = async () => {
    for (let surah = queue.shift(); surah; surah = queue.shift()) {
      result[surah.id - 1] = buildSurah(reciter, surah, await fetchTimings(reciter, surah.id));
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));

  // One surah per line keeps the file readable and its diffs small.
  const json = `[\n${result.map((timings) => JSON.stringify(timings)).join(',\n')}\n]\n`;
  await writeFile(path.join(out, `${reciter.id}.json`), json);
  const ayahs = result.reduce((total, timings) => total + timings.length - 1, 0);
  console.log(`${reciter.id}: ${ayahs} ayahs, ${(json.length / 1024).toFixed(0)} KB`);
}
