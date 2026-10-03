import { addDays, civilToJdn, civilToUtcNoon, jdnToCivil, weekdayOf, type CivilDate } from './time';

export interface HijriDate {
  year: number;
  /** 1 = Muharram … 12 = Dhu al-Hijjah. */
  month: number;
  day: number;
}

export interface HijriMonthDay {
  hijriDay: number;
  civil: CivilDate;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
}

export interface HijriMonthView {
  year: number;
  month: number;
  days: HijriMonthDay[];
}

// --- Tabular (arithmetic) Islamic calendar -------------------------------
// Used as the estimate when searching, and as the fallback on engines whose
// Intl data lacks the Umm al-Qura calendar.

const ISLAMIC_EPOCH_JDN = 1948440;

function tabularFromJdn(jdn: number): HijriDate {
  let l = jdn - ISLAMIC_EPOCH_JDN + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { year: 30 * n + j - 30, month, day };
}

function tabularToJdn({ year, month, day }: HijriDate): number {
  return (
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    ISLAMIC_EPOCH_JDN -
    385
  );
}

// --- Umm al-Qura calendar via the platform's Intl data --------------------

function createUmmAlQuraFormatter(): Intl.DateTimeFormat | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    return formatter.resolvedOptions().calendar === 'islamic-umalqura' ? formatter : null;
  } catch {
    return null;
  }
}

const ummAlQura = createUmmAlQuraFormatter();

/** True when dates follow the Umm al-Qura calendar rather than the arithmetic one. */
export const usesUmmAlQura = ummAlQura !== null;

function rawToHijri(date: CivilDate): HijriDate {
  if (ummAlQura) {
    const parts = ummAlQura.formatToParts(civilToUtcNoon(date));
    const read = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const hijri = { year: read('year'), month: read('month'), day: read('day') };
    if (Number.isInteger(hijri.year) && Number.isInteger(hijri.month) && Number.isInteger(hijri.day)) {
      return hijri;
    }
  }
  return tabularFromJdn(civilToJdn(date));
}

const ordinal = ({ year, month, day }: HijriDate) => year * 10000 + month * 100 + day;

function rawToCivil(hijri: HijriDate): CivilDate {
  let jdn = tabularToJdn(hijri);
  const target = ordinal(hijri);
  // The arithmetic estimate is within a couple of days of the real calendar.
  for (let step = 0; step < 40; step += 1) {
    const current = ordinal(rawToHijri(jdnToCivil(jdn)));
    if (current === target) break;
    jdn += current < target ? 1 : -1;
  }
  return jdnToCivil(jdn);
}

/**
 * Hijri date of a civil date.
 *
 * `adjustment` (in days) lets users match a local moon sighting that differs
 * from the calculated calendar.
 */
export function toHijri(date: CivilDate, adjustment = 0): HijriDate {
  return rawToHijri(adjustment === 0 ? date : addDays(date, adjustment));
}

export function hijriToCivil(hijri: HijriDate, adjustment = 0): CivilDate {
  const civil = rawToCivil(hijri);
  return adjustment === 0 ? civil : addDays(civil, -adjustment);
}

export function shiftHijriMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

/** All days of a Hijri month (29 or 30) with their civil dates. */
export function hijriMonthView(year: number, month: number, adjustment = 0): HijriMonthView {
  const first = hijriToCivil({ year, month, day: 1 }, adjustment);
  const next = shiftHijriMonth(year, month, 1);
  const nextFirst = hijriToCivil({ ...next, day: 1 }, adjustment);
  const length = Math.min(30, Math.max(29, civilToJdn(nextFirst) - civilToJdn(first)));

  const days: HijriMonthDay[] = [];
  for (let index = 0; index < length; index += 1) {
    const civil = addDays(first, index);
    days.push({ hijriDay: index + 1, civil, weekday: weekdayOf(civil) });
  }
  return { year, month, days };
}

export const NOTABLE_DAY_IDS = [
  'newYear',
  'ashura',
  'ramadanStart',
  'eidAlFitr',
  'arafah',
  'eidAlAdha',
] as const;
export type NotableDayId = (typeof NOTABLE_DAY_IDS)[number];

const NOTABLE_DAYS: ReadonlyArray<{ month: number; day: number; id: NotableDayId }> = [
  { month: 1, day: 1, id: 'newYear' },
  { month: 1, day: 10, id: 'ashura' },
  { month: 9, day: 1, id: 'ramadanStart' },
  { month: 10, day: 1, id: 'eidAlFitr' },
  { month: 12, day: 9, id: 'arafah' },
  { month: 12, day: 10, id: 'eidAlAdha' },
];

export function notableDay(month: number, day: number): NotableDayId | undefined {
  return NOTABLE_DAYS.find((entry) => entry.month === month && entry.day === day)?.id;
}
