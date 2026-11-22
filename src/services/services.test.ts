import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import surahsJson from '@/data/quran/surahs.json';
import { getReciter, RECITATION_HOST, RECITERS } from '@/data/reciters';
import { isValidTimings, recitationUrl } from '@/domain/quran/recitation';
import { TOTAL_AYAHS, type SurahInfo } from '@/domain/quran/types';
import { createI18n } from '@/i18n';
import { buildWidgetPayload, WIDGET_HORIZON_DAYS } from './widgets';

const surahs = surahsJson as SurahInfo[];
describe('recitation', () => {
  it('offers seven reciters with names in both languages', () => {
    expect(RECITERS).toHaveLength(7);
    expect(new Set(RECITERS.map((reciter) => reciter.id)).size).toBe(7);
    expect(new Set(RECITERS.map((reciter) => reciter.folder)).size).toBe(7);
    expect(RECITERS.map((reciter) => reciter.id)).toEqual(expect.arrayContaining(['maher', 'ghamdi']));
    for (const reciter of RECITERS) {
      expect(reciter.name.ar).not.toBe('');
      expect(reciter.name.en).not.toBe('');
    }
  });

  it('streams each surah as one file from the single allowed host', () => {
    const husary = getReciter('husary');
    expect(recitationUrl({ host: RECITATION_HOST, folder: husary.folder }, 36)).toBe(
      'https://cdn.mp3quran.net/audio/mahmoud-husary/r1/036.mp3',
    );
    // The content security policy must allow exactly this host for media.
    expect(readFileSync('index.html', 'utf8')).toContain(`media-src 'self' blob: ${RECITATION_HOST};`);
  });

  it('ships complete ayah timings for every reciter and surah', () => {
    for (const reciter of RECITERS) {
      const data = JSON.parse(readFileSync(`public/data/recitation/${reciter.id}.json`, 'utf8')) as unknown[];
      expect(data, reciter.id).toHaveLength(surahs.length);
      let ayahs = 0;
      surahs.forEach((surah, index) => {
        const timings = data[index];
        expect(isValidTimings(timings, surah.ayahs), `${reciter.id} ${surah.id}`).toBe(true);
        ayahs += (timings as number[]).length - 1;
      });
      expect(ayahs, reciter.id).toBe(TOTAL_AYAHS);
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
    expect(payload.labels.remaining).toBe('Time remaining');
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
    expect(payload.labels.remaining).toBe('الوقت المتبقي');
    expect(payload.days[0]!.prayers[0]!.name).toBe('الفجر');
  });

  it('shows Jumu’ah in place of Dhuhr on Fridays', () => {
    const payload = buildWidgetPayload({ ...base, i18n: createI18n('ar'), location: cairo, locationLabel: 'القاهرة' });
    const midday = (date: string) => payload.days.find((day) => day.date === date)!.prayers[2]!.name;
    expect(midday('2026-10-08')).toBe('الظهر');
    expect(midday('2026-10-09')).toBe('الجمعة');
    expect(midday('2026-10-10')).toBe('الظهر');
    expect(payload.days.filter((day) => day.prayers[2]!.name === 'الجمعة')).toHaveLength(4);
  });
});

describe('tafsir', () => {
  const gaps = ['2:3', '4:98', '14:49', '37:165', '42:49'];

  it('ships Al-Mukhtasar for every ayah, with the publisher named', () => {
    const empty: string[] = [];
    for (const surah of surahs) {
      for (const language of ['ar', 'en'] as const) {
        const text = JSON.parse(readFileSync(`public/data/tafsir/${language}/${surah.id}.json`, 'utf8')) as unknown[];
        expect(text, `${language} ${surah.id}`).toHaveLength(surah.ayahs);
        text.forEach((ayah, index) => {
          expect(typeof ayah, `${language} ${surah.id}:${index + 1}`).toBe('string');
          if (ayah === '') empty.push(`${language} ${surah.id}:${index + 1}`);
        });
      }
    }
    expect(empty).toEqual(gaps.map((ref) => `en ${ref}`));
    const arabic = JSON.parse(readFileSync('public/data/tafsir/ar/1.json', 'utf8')) as string[];
    const english = JSON.parse(readFileSync('public/data/tafsir/en/1.json', 'utf8')) as string[];
    expect(arabic[0]).toMatch(/^باسم الله أبدأ قراءة القرآن/);
    expect(english[0]).toMatch(/^I begin by calling on Allah/);
    expect(readFileSync('public/data/tafsir/NOTICE.txt', 'utf8')).toContain('https://tafsir.net');
  });
});
