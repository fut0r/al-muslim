import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import surahsJson from '../data/quran/surahs.json';
import { hijriMonthView, hijriToCivil, shiftHijriMonth, toHijri, usesUmmAlQura } from './hijri';
import { calculateDayTimes } from './prayer/calculate';
import { CALCULATION_METHOD_IDS, suggestMethodForCountry } from './prayer/methods';
import { computePrayerStatus, toCountdown, upcomingPrayers } from './prayer/schedule';
import { PRAYER_IDS, type DayTimes } from './prayer/types';
import { angleDelta, compassPoint, distanceToKaabaKm, qiblaBearing } from './qibla';
import { buildSearchIndex, normalizeArabic, searchAyahs } from './quran/search';
import { ayahOrdinal, TOTAL_AYAHS, type SurahInfo } from './quran/types';
import { addDays, civilDateInZone, civilToJdn, jdnToCivil, weekdayOf } from './time';

const surahs = surahsJson as SurahInfo[];

function clock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
}

describe('time', () => {
  it('converts between civil dates and Julian day numbers', () => {
    expect(civilToJdn({ year: 2000, month: 1, day: 1 })).toBe(2451545);
    expect(jdnToCivil(2451545)).toEqual({ year: 2000, month: 1, day: 1 });
    expect(addDays({ year: 2024, month: 2, day: 28 }, 2)).toEqual({ year: 2024, month: 3, day: 1 });
    expect(addDays({ year: 2025, month: 1, day: 1 }, -1)).toEqual({ year: 2024, month: 12, day: 31 });
  });

  it('knows the weekday', () => {
    expect(weekdayOf({ year: 2025, month: 6, day: 6 })).toBe(5); // Friday
    expect(weekdayOf({ year: 2000, month: 1, day: 1 })).toBe(6); // Saturday
  });

  it('reads the civil date in another time zone', () => {
    const instant = new Date('2025-03-01T22:30:00Z');
    expect(civilDateInZone(instant, 'Asia/Riyadh')).toEqual({ year: 2025, month: 3, day: 2 });
    expect(civilDateInZone(instant, 'America/New_York')).toEqual({ year: 2025, month: 3, day: 1 });
  });
});

describe('prayer times', () => {
  it('matches the reference values published with the adhan library', () => {
    const times = calculateDayTimes({
      date: { year: 2015, month: 7, day: 12 },
      coordinates: { latitude: 35.775, longitude: -78.6336 },
      method: 'NorthAmerica',
      madhab: 'hanafi',
    });
    expect(times).not.toBeNull();
    const zone = 'America/New_York';
    expect(clock(times!.fajr, zone)).toBe('4:42 AM');
    expect(clock(times!.sunrise, zone)).toBe('6:08 AM');
    expect(clock(times!.dhuhr, zone)).toBe('1:21 PM');
    expect(clock(times!.asr, zone)).toBe('6:22 PM');
    expect(clock(times!.maghrib, zone)).toBe('8:32 PM');
    expect(clock(times!.isha, zone)).toBe('9:57 PM');
  });

  it('gives a later Asr for the Hanafi madhab', () => {
    const base = {
      date: { year: 2025, month: 3, day: 10 },
      coordinates: { latitude: 30.0444, longitude: 31.2357 },
      method: 'Egyptian' as const,
    };
    const shafi = calculateDayTimes({ ...base, madhab: 'shafi' })!;
    const hanafi = calculateDayTimes({ ...base, madhab: 'hanafi' })!;
    expect(hanafi.asr.getTime()).toBeGreaterThan(shafi.asr.getTime());
    expect(hanafi.dhuhr.getTime()).toBe(shafi.dhuhr.getTime());
  });

  it('uses a fixed 90 minute Isha interval for Umm al-Qura', () => {
    const times = calculateDayTimes({
      date: { year: 2025, month: 5, day: 1 },
      coordinates: { latitude: 21.4225, longitude: 39.8262 },
      method: 'UmmAlQura',
      madhab: 'shafi',
    })!;
    expect(Math.round((times.isha.getTime() - times.maghrib.getTime()) / 60000)).toBe(90);
  });

  it('returns ordered, valid times for every method', () => {
    for (const method of CALCULATION_METHOD_IDS) {
      const times = calculateDayTimes({
        date: { year: 2025, month: 10, day: 3 },
        coordinates: { latitude: 30.0444, longitude: 31.2357 },
        method,
        madhab: 'shafi',
      });
      expect(times, method).not.toBeNull();
      const values = PRAYER_IDS.map((id) => times![id].getTime());
      expect([...values].sort((a, b) => a - b), method).toEqual(values);
    }
  });

  it('still produces times in the far north during the midnight sun', () => {
    const times = calculateDayTimes({
      date: { year: 2025, month: 6, day: 21 },
      coordinates: { latitude: 69.6492, longitude: 18.9553 },
      method: 'MuslimWorldLeague',
      madhab: 'shafi',
    });
    expect(times).not.toBeNull();
    for (const id of PRAYER_IDS) expect(Number.isNaN(times![id].getTime())).toBe(false);
  });

  it('rejects invalid coordinates', () => {
    expect(
      calculateDayTimes({
        date: { year: 2025, month: 1, day: 1 },
        coordinates: { latitude: 120, longitude: 0 },
        method: 'MuslimWorldLeague',
        madhab: 'shafi',
      }),
    ).toBeNull();
  });

  it('suggests a method by country', () => {
    expect(suggestMethodForCountry('EG')).toBe('Egyptian');
    expect(suggestMethodForCountry('sa')).toBe('UmmAlQura');
    expect(suggestMethodForCountry('FR')).toBe('MuslimWorldLeague');
    expect(suggestMethodForCountry(undefined)).toBe('MuslimWorldLeague');
  });
});

describe('prayer schedule', () => {
  const cairo = { latitude: 30.0444, longitude: 31.2357 };
  const day = (d: number): DayTimes =>
    calculateDayTimes({
      date: { year: 2025, month: 10, day: d },
      coordinates: cairo,
      method: 'Egyptian',
      madhab: 'shafi',
    })!;
  const days = [day(2), day(3), day(4)];

  it('rolls over to the next Fajr after Isha', () => {
    const now = new Date(days[1]!.isha.getTime() + 60 * 60 * 1000);
    const status = computePrayerStatus(now, days)!;
    expect(status.current).toBe('isha');
    expect(status.next.id).toBe('fajr');
    expect(status.next.time.getTime()).toBe(days[2]!.fajr.getTime());
  });

  it('treats the hours before Fajr as Isha of the previous day', () => {
    const now = new Date(days[1]!.fajr.getTime() - 30 * 60 * 1000);
    const status = computePrayerStatus(now, days)!;
    expect(status.current).toBe('isha');
    expect(status.next.id).toBe('fajr');
    expect(status.next.time.getTime()).toBe(days[1]!.fajr.getTime());
    expect(Math.round(status.remainingMs / 60000)).toBe(30);
  });

  it('has no current prayer between sunrise and Dhuhr', () => {
    const now = new Date(days[1]!.sunrise.getTime() + 60 * 1000);
    const status = computePrayerStatus(now, days)!;
    expect(status.current).toBeNull();
    expect(status.next.id).toBe('dhuhr');
    expect(status.progress).toBeGreaterThan(0);
    expect(status.progress).toBeLessThan(1);
  });

  it('switches exactly at the prayer time', () => {
    const status = computePrayerStatus(new Date(days[1]!.asr.getTime()), days)!;
    expect(status.current).toBe('asr');
    expect(status.next.id).toBe('maghrib');
  });

  it('lists upcoming obligatory prayers in order', () => {
    const upcoming = upcomingPrayers(new Date(days[1]!.dhuhr.getTime() + 1), days);
    expect(upcoming.slice(0, 4).map((event) => event.id)).toEqual(['asr', 'maghrib', 'isha', 'fajr']);
    expect(upcoming.some((event) => (event.id as string) === 'sunrise')).toBe(false);
  });

  it('formats a countdown', () => {
    expect(toCountdown(3_723_000)).toEqual({ hours: 1, minutes: 2, seconds: 3 });
    expect(toCountdown(-5)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    expect(toCountdown(500)).toEqual({ hours: 0, minutes: 0, seconds: 1 });
  });
});

describe('qibla', () => {
  it('computes great-circle bearings to the Kaaba', () => {
    expect(qiblaBearing({ latitude: 51.5074, longitude: -0.1278 })).toBeCloseTo(118.99, 0);
    expect(qiblaBearing({ latitude: 40.7128, longitude: -74.006 })).toBeCloseTo(58.48, 0);
    expect(qiblaBearing({ latitude: -6.2088, longitude: 106.8456 })).toBeCloseTo(295.15, 0);
    expect(qiblaBearing({ latitude: 30.0444, longitude: 31.2357 })).toBeCloseTo(136.14, 0);
  });

  it('computes the distance and compass point', () => {
    const cairo = distanceToKaabaKm({ latitude: 30.0444, longitude: 31.2357 });
    expect(cairo).toBeGreaterThan(1250);
    expect(cairo).toBeLessThan(1320);
    expect(compassPoint(136)).toBe('SE');
    expect(compassPoint(359)).toBe('N');
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
  });
});

describe('hijri calendar', () => {
  it('follows the Umm al-Qura calendar on this engine', () => {
    expect(usesUmmAlQura).toBe(true);
  });

  it('converts known dates', () => {
    expect(toHijri({ year: 2025, month: 3, day: 1 })).toEqual({ year: 1446, month: 9, day: 1 });
    expect(toHijri({ year: 2025, month: 3, day: 30 })).toEqual({ year: 1446, month: 10, day: 1 });
    expect(toHijri({ year: 2025, month: 6, day: 6 })).toEqual({ year: 1446, month: 12, day: 10 });
    expect(toHijri({ year: 2025, month: 6, day: 26 })).toEqual({ year: 1447, month: 1, day: 1 });
    expect(toHijri({ year: 2024, month: 7, day: 7 })).toEqual({ year: 1446, month: 1, day: 1 });
  });

  it('converts back and applies the adjustment', () => {
    expect(hijriToCivil({ year: 1446, month: 9, day: 1 })).toEqual({ year: 2025, month: 3, day: 1 });
    expect(hijriToCivil({ year: 1447, month: 1, day: 1 })).toEqual({ year: 2025, month: 6, day: 26 });
    expect(toHijri({ year: 2025, month: 3, day: 2 }, -1)).toEqual({ year: 1446, month: 9, day: 1 });
    expect(hijriToCivil({ year: 1446, month: 9, day: 1 }, -1)).toEqual({ year: 2025, month: 3, day: 2 });
  });

  it('round-trips every day across several years', () => {
    let date = { year: 2023, month: 1, day: 1 };
    for (let index = 0; index < 1500; index += 1) {
      expect(hijriToCivil(toHijri(date))).toEqual(date);
      date = addDays(date, 1);
    }
  });

  it('builds month views of 29 or 30 consecutive days', () => {
    let cursor = { year: 1446, month: 1 };
    for (let index = 0; index < 36; index += 1) {
      const view = hijriMonthView(cursor.year, cursor.month);
      expect([29, 30]).toContain(view.days.length);
      expect(toHijri(view.days[0]!.civil)).toEqual({ ...cursor, day: 1 });
      const last = view.days[view.days.length - 1]!;
      expect(toHijri(last.civil)).toEqual({ ...cursor, day: view.days.length });
      cursor = shiftHijriMonth(cursor.year, cursor.month, 1);
    }
    expect(shiftHijriMonth(1446, 12, 1)).toEqual({ year: 1447, month: 1 });
    expect(shiftHijriMonth(1446, 1, -1)).toEqual({ year: 1445, month: 12 });
  });
});

describe('quran data and search', () => {
  const text = surahs.map(
    (surah) => JSON.parse(readFileSync(`public/data/quran/${surah.id}.json`, 'utf8')) as string[],
  );
  const index = buildSearchIndex(text);
  const refs = (query: string) => searchAyahs(index, query, 10_000).matches.map((m) => `${m.surah}:${m.ayah}`);

  it('ships all 114 surahs and 6236 ayahs', () => {
    expect(surahs).toHaveLength(114);
    expect(text.every((ayahs, i) => ayahs.length === surahs[i]!.ayahs)).toBe(true);
    expect(text.flat()).toHaveLength(TOTAL_AYAHS);
    expect(text.flat().some((ayah) => ayah.includes('\uFFFD') || ayah.trim() === '')).toBe(false);
    expect(ayahOrdinal({ surah: 114, ayah: 6 }, surahs)).toBe(TOTAL_AYAHS);
    expect(ayahOrdinal({ surah: 2, ayah: 1 }, surahs)).toBe(8);
  });

  it('folds Uthmani spelling into everyday spelling', () => {
    expect(normalizeArabic(text[0]![0]!)).toBe('بسم الله الرحمن الرحيم');
    expect(normalizeArabic(text[0]![1]!)).toBe('الحمد لله رب العالمين');
    expect(normalizeArabic('ٱلصَّلَوٰةَ')).toBe(normalizeArabic('الصلاة'));
    expect(normalizeArabic('يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟')).toBe(normalizeArabic('يا أيها الذين آمنوا'));
  });

  it('finds ayahs typed in ordinary Arabic', () => {
    expect(refs('الحمد لله رب العالمين')).toContain('1:2');
    expect(refs('ذلك الكتاب لا ريب فيه')).toEqual(['2:2']);
    expect(refs('قل هو الله أحد')).toEqual(['112:1']);
    expect(refs('الله لا إله إلا هو الحي القيوم')).toEqual(['2:255', '3:2']);
    expect(refs('يا أيها الذين آمنوا').length).toBeGreaterThan(80);
    expect(refs('وأقيموا الصلاة وآتوا الزكاة')).toContain('2:43');
    expect(refs('شهر رمضان الذي أنزل فيه القرآن')).toEqual(['2:185']);
    expect(refs('إبراهيم').length).toBeGreaterThan(60);
    expect(refs('أولئك').length).toBeGreaterThan(100);
    expect(refs('هؤلاء').length).toBeGreaterThan(30);
    expect(refs('والليل إذا يغشى')).toEqual(['92:1']);
    expect(refs('بني إسرائيل').length).toBeGreaterThan(30);
    expect(refs('الملائكة').length).toBeGreaterThan(40);
  });

  it('ignores queries that are too short and reports totals', () => {
    expect(searchAyahs(index, 'ا').total).toBe(0);
    const limited = searchAyahs(index, 'الله', 5);
    expect(limited.matches).toHaveLength(5);
    expect(limited.total).toBeGreaterThan(1500);
  });
});
