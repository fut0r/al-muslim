/**
 * A calendar date with no time or time zone attached (month is 1–12).
 * Prayer times and the Hijri calendar are defined per civil day at a place,
 * so this is the unit the rest of the domain layer works with.
 */
export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

function zoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = zoneFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    zoneFormatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || timeZone === '') return false;
  try {
    zoneFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function deviceTimeZone(): string | undefined {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** The civil date of an instant as seen in `timeZone` (device zone when omitted). */
export function civilDateInZone(instant: Date, timeZone?: string): CivilDate {
  if (timeZone) {
    try {
      const parts = zoneFormatter(timeZone).formatToParts(instant);
      const read = (type: string) => Number(parts.find((p) => p.type === type)?.value);
      const date = { year: read('year'), month: read('month'), day: read('day') };
      if (Number.isFinite(date.year + date.month + date.day)) return date;
    } catch {
      // Unknown zone: fall through to the device zone.
    }
  }
  return { year: instant.getFullYear(), month: instant.getMonth() + 1, day: instant.getDate() };
}

/** Julian Day Number of a Gregorian civil date. */
export function civilToJdn({ year, month, day }: CivilDate): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function jdnToCivil(jdn: number): CivilDate {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return jdnToCivil(civilToJdn(date) + days);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: CivilDate): number {
  return (civilToJdn(date) + 1) % 7;
}

export function sameCivilDate(a: CivilDate, b: CivilDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function civilDateKey({ year, month, day }: CivilDate): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Noon UTC of a civil date: a safe instant for formatting the date itself. */
export function civilToUtcNoon({ year, month, day }: CivilDate): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}
