import { describe, expect, it } from 'vitest';
import { calculateDayTimes } from '@/domain/prayer/calculate';
import { planNotifications } from '@/domain/prayer/notificationPlan';
import { OBLIGATORY_PRAYER_IDS, type DayTimes } from '@/domain/prayer/types';
import { addDays, type CivilDate } from '@/domain/time';
import { createI18n } from '@/i18n';
import { ar } from '@/i18n/ar';
import { en } from '@/i18n/en';
import { adhkarStore, sanitizeAdhkarProgress, setDhikrCount } from './adhkar';
import { sanitizeLocation } from './location';
import {
  ayahsRead,
  markRead,
  quranStore,
  resetReadingProgress,
  sanitizeQuranState,
  toggleBookmark,
  totalAyahsRead,
} from './quran';
import { sanitizeSettings } from './settings';

describe('stores recover from damaged data', () => {
  it('falls back to defaults for unusable settings', () => {
    const settings = sanitizeSettings({
      theme: 'neon',
      language: 42,
      method: 'Nope',
      madhab: null,
      notifications: 'x',
      quranFontScale: 99,
      hijriAdjustment: 'a',
      onboarded: 'yes',
    });
    expect(settings.theme).toBe('system');
    expect(['en', 'ar']).toContain(settings.language);
    expect(settings.method).toBe('MuslimWorldLeague');
    expect(settings.madhab).toBe('shafi');
    // Following the country's convention is the default, and a stored choice is kept.
    expect(settings.autoCalculation).toBe(true);
    expect(sanitizeSettings({ autoCalculation: false }).autoCalculation).toBe(false);
    expect(sanitizeSettings({ reciter: 'maher' }).reciter).toBe('maher');
    expect(sanitizeSettings({ reciter: 'nobody' }).reciter).toBe('husary');
    expect(settings.notifications.enabled).toBe(false);
    expect(Object.keys(settings.notifications.prayers)).toEqual([...OBLIGATORY_PRAYER_IDS]);
    expect(settings.quranFontScale).toBe(1.8);
    expect(settings.hijriAdjustment).toBe(0);
    expect(settings.onboarded).toBe(false);
    expect(sanitizeSettings(undefined)).toEqual(sanitizeSettings('garbage'));
    expect(sanitizeSettings({ theme: 'amoled', hijriAdjustment: 7 })).toMatchObject({ theme: 'amoled', hijriAdjustment: 2 });
  });

  it('rejects impossible locations and unknown time zones', () => {
    expect(sanitizeLocation(undefined)).toBeNull();
    expect(sanitizeLocation({ latitude: 'x', longitude: 3 })).toBeNull();
    expect(sanitizeLocation({ latitude: 95, longitude: 10 })).toBeNull();
    const cairo = sanitizeLocation({
      latitude: 30.05,
      longitude: 31.25,
      source: 'teleport',
      countryCode: 'egypt',
      timeZone: 'Mars/Olympus',
      name: 'Cairo',
    });
    expect(cairo).toMatchObject({ latitude: 30.05, longitude: 31.25, source: 'manual', name: 'Cairo' });
    expect(cairo?.timeZone).toBeUndefined();
    expect(cairo?.countryCode).toBeUndefined();
    expect(sanitizeLocation({ latitude: 30, longitude: 31, timeZone: 'Africa/Cairo' })?.timeZone).toBe('Africa/Cairo');
  });

  it('drops bookmarks and positions that do not exist in the Quran', () => {
    const state = sanitizeQuranState({
      bookmarks: [{ surah: 999, ayah: 1 }, { surah: 2, ayah: 255 }, 'junk', { surah: 2, ayah: 255 }, { surah: 1, ayah: 8 }],
      lastRead: { surah: 1, ayah: 99 },
    });
    expect(state.bookmarks.map((b) => `${b.surah}:${b.ayah}`)).toEqual(['2:255']);
    expect(state.lastRead).toBeNull();
    expect(sanitizeQuranState([1, 2, 3])).toEqual({ bookmarks: [], lastRead: null, read: {} });
  });

  it('keeps only read ayahs that exist', () => {
    const state = sanitizeQuranState({
      read: { 1: [[1, 3], [3, 99]], 2: [[280, 290]], 115: [[1, 2]], x: [[1, 2]], 112: 'junk', 114: [[7, 9]] },
    });
    expect(state.read).toEqual({ 1: [[1, 7]], 2: [[280, 286]] });
    expect(ayahsRead(state, 1)).toBe(7);
    expect(ayahsRead(state, 3)).toBe(0);
    expect(totalAyahsRead(state)).toBe(14);
  });

  it('counts progress from the ayahs read, not from the position', () => {
    resetReadingProgress();
    // Reading the end of a late surah says nothing about the surahs before it.
    markRead(114, 4, 6);
    expect(totalAyahsRead(quranStore.get())).toBe(3);
    markRead(114, 1, 4);
    markRead(114, 2, 3);
    expect(quranStore.get().read[114]).toEqual([[1, 6]]);
    markRead(2, 250, 999);
    expect(ayahsRead(quranStore.get(), 2)).toBe(37);
    markRead(999, 1, 5);
    expect(totalAyahsRead(quranStore.get())).toBe(43);
    resetReadingProgress();
    expect(quranStore.get().read).toEqual({});
  });

  it('ignores malformed adhkar counts', () => {
    expect(sanitizeAdhkarProgress([1, 2, 3])).toEqual({ day: '', counts: {} });
    expect(
      sanitizeAdhkarProgress({ day: '2026-10-03', counts: { a: 3, b: -1, c: 'x', d: 2.5, e: 1e9 } }),
    ).toEqual({ day: '2026-10-03', counts: { a: 3 } });
  });

  it('toggles bookmarks without duplicates', () => {
    toggleBookmark({ surah: 2, ayah: 255 });
    toggleBookmark({ surah: 1, ayah: 1 });
    expect(quranStore.get().bookmarks.map((b) => `${b.surah}:${b.ayah}`)).toEqual(['1:1', '2:255']);
    toggleBookmark({ surah: 2, ayah: 255 });
    expect(quranStore.get().bookmarks.map((b) => `${b.surah}:${b.ayah}`)).toEqual(['1:1']);
  });

  it('starts adhkar counts afresh on a new day', () => {
    setDhikrCount('2026-10-03', 'morning.subhan', 40);
    expect(adhkarStore.get().counts['morning.subhan']).toBe(40);
    setDhikrCount('2026-10-04', 'morning.tahlil', 2);
    expect(adhkarStore.get()).toEqual({ day: '2026-10-04', counts: { 'morning.tahlil': 2 } });
    setDhikrCount('2026-10-04', 'morning.tahlil', 0);
    expect(adhkarStore.get().counts).toEqual({});
  });
});

describe('notification plan', () => {
  const start: CivilDate = { year: 2026, month: 10, day: 3 };
  const days = Array.from({ length: 3 }, (_, index) => {
    const date = addDays(start, index);
    const times = calculateDayTimes({
      date,
      coordinates: { latitude: 30.05, longitude: 31.25 },
      method: 'Egyptian',
      madhab: 'shafi',
    }) as DayTimes;
    return { date, times };
  });
  const all = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };

  it('schedules only future, enabled prayers in order', () => {
    const from = new Date(days[0]!.times.asr.getTime() + 1000);
    const plan = planNotifications({ from, days, enabled: { ...all, isha: false }, limit: 60 });
    expect(plan.map((item) => item.prayer).slice(0, 4)).toEqual(['maghrib', 'fajr', 'dhuhr', 'asr']);
    expect(plan.every((item) => item.at.getTime() > from.getTime())).toBe(true);
    expect(plan.some((item) => item.prayer === 'isha')).toBe(false);
    expect(plan).toHaveLength(1 + 4 + 4);
  });

  it('uses unique ids and respects the platform limit', () => {
    const plan = planNotifications({ from: new Date(0), days, enabled: all, limit: 60 });
    expect(new Set(plan.map((item) => item.id)).size).toBe(15);
    expect(planNotifications({ from: new Date(0), days, enabled: all, limit: 4 })).toHaveLength(4);
    expect(plan.every((item) => Number.isInteger(item.id) && item.id < 2 ** 31)).toBe(true);
  });
});

describe('translations', () => {
  const keys = (value: unknown, prefix = ''): string[] =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? Object.entries(value).flatMap(([key, child]) => keys(child, `${prefix}${key}.`))
      : [prefix.slice(0, -1)];

  it('has the same keys and placeholders in both languages', () => {
    expect(keys(ar)).toEqual(keys(en));
    const english = createI18n('en');
    const arabic = createI18n('ar');
    for (const key of keys(en)) {
      const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
      const a = english.t(key as never);
      const b = arabic.t(key as never);
      if (typeof a === 'string' && typeof b === 'string' && a !== key) {
        expect(placeholders(b), key).toEqual(placeholders(a));
      }
    }
    expect(ar.hijriMonths).toHaveLength(12);
    expect(en.hijriMonths).toHaveLength(12);
  });

  it('interpolates values', () => {
    expect(createI18n('en').t('quran.ayahCount', { count: 7 })).toBe('7 ayahs');
    expect(createI18n('ar').direction).toBe('rtl');
  });
});
