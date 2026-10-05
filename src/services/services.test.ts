import { describe, expect, it } from 'vitest';
import surahsJson from '@/data/quran/surahs.json';
import { getReciter, RECITATION_HOST, RECITERS } from '@/data/reciters';
import { recitationQueue, recitationUrl } from '@/domain/quran/recitation';
import type { SurahInfo } from '@/domain/quran/types';
import { createI18n } from '@/i18n';
import { buildWidgetPayload, WIDGET_HORIZON_DAYS } from './widgets';

const surahs = surahsJson as SurahInfo[];
const surah = (id: number) => surahs[id - 1]!;

describe('recitation', () => {
  it('opens a surah with the basmalah, except Al-Fatihah and At-Tawbah', () => {
    const baqarah = recitationQueue(surah(2), 1);
    expect(baqarah[0]).toEqual({ surah: 1, ayah: 1, basmalah: true });
    expect(baqarah[1]).toEqual({ surah: 2, ayah: 1 });
    expect(baqarah).toHaveLength(287);

    expect(recitationQueue(surah(1), 1)).toHaveLength(7);
    expect(recitationQueue(surah(1), 1)[0]).toEqual({ surah: 1, ayah: 1 });
    expect(recitationQueue(surah(9), 1)[0]).toEqual({ surah: 9, ayah: 1 });
  });

  it('starts mid-surah without a basmalah and stays inside the surah', () => {
    const queue = recitationQueue(surah(112), 3);
    expect(queue).toEqual([
      { surah: 112, ayah: 3 },
      { surah: 112, ayah: 4 },
    ]);
    expect(recitationQueue(surah(112), 99)).toEqual([{ surah: 112, ayah: 4 }]);
    expect(recitationQueue(surah(112), -5)[1]).toEqual({ surah: 112, ayah: 1 });
  });

  it('addresses audio by position in the whole Quran', () => {
    const husary = getReciter('husary');
    const source = { host: RECITATION_HOST, edition: husary.edition, bitrate: husary.bitrate };
    expect(recitationUrl(source, { surah: 2, ayah: 255 }, surahs)).toBe(
      'https://cdn.islamic.network/quran/audio/64/ar.husary/262.mp3',
    );
    expect(recitationUrl(source, { surah: 114, ayah: 6 }, surahs)).toMatch(/\/6236\.mp3$/);
  });

  it('offers exactly five reciters with names in both languages', () => {
    expect(RECITERS).toHaveLength(5);
    expect(new Set(RECITERS.map((reciter) => reciter.id)).size).toBe(5);
    for (const reciter of RECITERS) {
      expect(reciter.name.ar).not.toBe('');
      expect(reciter.name.en).not.toBe('');
    }
  });
});

describe('widget schedule', () => {
  const base = {
    now: new Date('2026-10-05T10:00:00Z'),
    locationLabel: 'Cairo',
    method: 'Egyptian' as const,
    madhab: 'shafi' as const,
    hour12: true,
    hijriAdjustment: 0,
  };
  const cairo = { latitude: 30.05, longitude: 31.25, timeZone: 'Africa/Cairo' };

  it('asks for a location when none is set', () => {
    const payload = buildWidgetPayload({ ...base, i18n: createI18n('en'), location: null });
    expect(payload.days).toEqual([]);
    expect(payload.message).toBe('Set your location in Al-Muslim');
  });

  it('covers the coming month with six ordered, formatted times a day', () => {
    const payload = buildWidgetPayload({ ...base, i18n: createI18n('en'), location: cairo });
    expect(payload.message).toBeNull();
    expect(payload.rtl).toBe(false);
    expect(payload.timeZone).toBe('Africa/Cairo');
    expect(payload.days).toHaveLength(WIDGET_HORIZON_DAYS);
    expect(payload.days[0]!.date).toBe('2026-10-05');
    expect(payload.days[29]!.date).toBe('2026-11-03');

    for (const day of payload.days) {
      expect(day.prayers.map((prayer) => prayer.id)).toEqual(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']);
      const instants = day.prayers.map((prayer) => prayer.at);
      expect([...instants].sort((a, b) => a - b)).toEqual(instants);
      expect(day.prayers.every((prayer) => /\d:\d\d/.test(prayer.time))).toBe(true);
      expect(day.hijri).toMatch(/AH$/);
    }
    // Midday in Cairo, local time, whatever zone the test runs in.
    expect(payload.days[0]!.prayers[2]!.time).toMatch(/^12:\d\d PM$/);
  });

  it('is written in the app language', () => {
    const payload = buildWidgetPayload({ ...base, i18n: createI18n('ar'), location: cairo, locationLabel: 'القاهرة' });
    expect(payload.rtl).toBe(true);
    expect(payload.labels.nextPrayer).toBe('الصلاة القادمة');
    expect(payload.days[0]!.prayers[0]!.name).toBe('الفجر');
  });
});
