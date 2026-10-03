// Generates the offline city list used for manual location and for labelling
// a GPS position without any reverse-geocoding request.
//
// The generated file is committed, so this only needs to run to refresh it:
//
//   npm install --no-save city-timezones@1.3.4
//   npm run data:cities
//
// Source: `city-timezones` (MIT), derived from Natural Earth populated places.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = resolve(process.env.DATA_SRC ?? join(root, 'node_modules'));
const MIN_POPULATION = 40000;

// Arabic names (and clearer English spellings) for the cities Arabic speakers
// are most likely to look for.
// Key: "<name as written in the source>|<ISO 3166-1 alpha-2 country>".
// Value: [arabicName, englishNameOverride?].
const NAMES = JSON.parse(readFileSync(join(root, 'scripts', 'city-names-ar.json'), 'utf8'));

// Country code corrections applied to the source before anything else.
const COUNTRY_OVERRIDES = { 'Jerusalem|IL': 'PS' };

const source = JSON.parse(
  readFileSync(join(modules, 'city-timezones', 'data', 'cityMap.json'), 'utf8'),
);

const timeZones = [];
const seen = new Set();
const usedNames = new Set();
const cities = [];

const sorted = source
  .map((c) => ({ ...c, iso2: COUNTRY_OVERRIDES[`${c.city}|${c.iso2}`] ?? c.iso2 }))
  .filter(
    (c) =>
      c.city &&
      /^[A-Z]{2}$/.test(c.iso2 ?? '') &&
      c.timezone &&
      Number.isFinite(c.lat) &&
      Number.isFinite(c.lng),
  )
  .sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0));

for (const c of sorted) {
  const key = `${c.city}|${c.iso2}`;
  const names = usedNames.has(key) ? undefined : NAMES[key];
  if ((c.pop ?? 0) < MIN_POPULATION && !names) continue;
  // The same place can appear twice; keep the most populous entry.
  const dedupeKey = `${key}|${Math.round(c.lat * 2)}|${Math.round(c.lng * 2)}`;
  if (seen.has(dedupeKey)) continue;
  seen.add(dedupeKey);
  try {
    new Intl.DateTimeFormat('en', { timeZone: c.timezone });
  } catch {
    console.warn(`  skipping ${key}: unknown time zone ${c.timezone}`);
    continue;
  }
  let tz = timeZones.indexOf(c.timezone);
  if (tz === -1) tz = timeZones.push(c.timezone) - 1;
  const row = [names?.[1] ?? c.city, c.iso2, Number(c.lat.toFixed(4)), Number(c.lng.toFixed(4)), tz];
  if (names) {
    row.push(names[0]);
    usedNames.add(key);
  }
  cities.push(row);
}

const unmatched = Object.keys(NAMES).filter((key) => !usedNames.has(key));
if (unmatched.length > 0) {
  console.error(`✗ Names with no matching city:\n  ${unmatched.join('\n  ')}`);
  process.exit(1);
}

const outDir = join(root, 'public', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'cities.json'), JSON.stringify({ timeZones, cities }), 'utf8');
console.log(`✓ ${cities.length} cities, ${timeZones.length} time zones, ${usedNames.size} Arabic names`);
