import type { HijriDate } from '@/domain/hijri';
import { civilToUtcNoon, type CivilDate } from '@/domain/time';
import type { I18n } from './index';

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    try {
      cached = new Intl.DateTimeFormat(locale, options);
    } catch {
      // Unknown time zone or locale on an old engine: fall back to defaults.
      cached = new Intl.DateTimeFormat('en', { ...options, timeZone: undefined });
    }
    formatters.set(key, cached);
  }
  return cached;
}

export interface TimeFormatOptions {
  hour12: boolean;
  /** IANA zone of the place the time belongs to; the device zone when omitted. */
  timeZone?: string;
}

/** A clock time such as "4:42 PM" or "16:42". */
export function formatTime(i18n: I18n, date: Date, { hour12, timeZone }: TimeFormatOptions): string {
  return formatter(i18n.locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
    ...(hour12 ? {} : { hourCycle: 'h23' as const }),
    timeZone,
  }).format(date);
}

export type DateStyle = 'full' | 'long' | 'short' | 'monthYear';

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  short: { day: 'numeric', month: 'short' },
  monthYear: { month: 'long', year: 'numeric' },
};

export function formatGregorian(i18n: I18n, date: CivilDate, style: DateStyle = 'long'): string {
  return formatter(i18n.locale, { ...DATE_STYLES[style], timeZone: 'UTC' }).format(civilToUtcNoon(date));
}

export function formatWeekday(i18n: I18n, date: CivilDate, width: 'long' | 'short' | 'narrow' = 'long'): string {
  return formatter(i18n.locale, { weekday: width, timeZone: 'UTC' }).format(civilToUtcNoon(date));
}

export function hijriMonthName(i18n: I18n, month: number): string {
  return i18n.dictionary.hijriMonths[month - 1] ?? String(month);
}

/** "21 Rabi' al-Thani 1448 AH". */
export function formatHijri(i18n: I18n, date: HijriDate, withYear = true): string {
  const base = `${date.day} ${hijriMonthName(i18n, date.month)}`;
  return withYear ? `${base} ${date.year} ${i18n.t('common.hijriEra')}` : base;
}

export function formatNumber(i18n: I18n, value: number, maximumFractionDigits = 0): string {
  try {
    return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Arabic-Indic numerals, as used for ayah numbers in the mushaf. */
export function toArabicIndic(value: number): string {
  return String(value).replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)] ?? digit);
}
