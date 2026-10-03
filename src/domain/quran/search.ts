import type { AyahRef } from './types';

/**
 * Folds Arabic text into a plain form for matching.
 *
 * The Quran is stored in Uthmani script, whose spelling differs from everyday
 * Arabic (ٱلصَّلَوٰةَ vs الصلاة, ذَٰلِكَ vs ذلك, يَـٰٓأَيُّهَا vs يا أيها). The same
 * function is applied to the stored text and to what the user types, so both
 * converge on one spelling and a search in ordinary Arabic finds the ayah.
 */
export function normalizeArabic(input: string): string {
  return (
    input
      // Dagger alef: a written waw or alef maqsura that is read as alef.
      .replace(/\u0648\u0670/g, '\u0627')
      .replace(/\u0649\u0670(?=[\u064B-\u065F\u06D6-\u06ED]*[\u0621-\u064A\u0671])/g, '\u0627')
      .replace(/\u0649\u0670/g, '\u0649')
      .replace(/\u0670/g, '\u0627')
      // Small high yeh stands for a pronounced yeh (إِبْرَٰهِـۧمَ).
      .replace(/\u06E7/g, '\u064A')
      // Hamza written as a combining mark.
      .replace(/[\u0654\u0655]/g, '\u0621')
      // Remaining harakat, Quranic annotation signs and tatweel.
      // eslint-disable-next-line no-misleading-character-class -- combining marks are listed on purpose
      .replace(/[\u064B-\u0653\u0656-\u065F\u06D6-\u06E6\u06E8-\u06ED\u0640]/g, '')
      // Letter variants.
      .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
      .replace(/[\u0624\u0626]/g, '\u0621')
      .replace(/\u0621\u0627/g, '\u0627')
      .replace(/\u0649/g, '\u064A')
      .replace(/\u0629/g, '\u0647')
      // Words whose everyday spelling drops a letter the Uthmani script keeps,
      // or the other way round.
      .replace(/الرحمان/g, 'الرحمن')
      .replace(/ذالك/g, 'ذلك')
      .replace(/هاذ/g, 'هذ')
      .replace(/هاءلاء/g, 'هءلاء')
      .replace(/اولاءك/g, 'اولءك')
      .replace(/لاكن/g, 'لكن')
      .replace(/الاه/g, 'اله')
      .replace(/الليل/g, 'اليل')
      .replace(/اللاتي/g, 'الاتي')
      .replace(/\s+/g, ' ')
      .trim()
      // The vocative is joined to the next word in the Uthmani script.
      .replace(/(^| )يا (?=\S)/g, '$1يا')
  );
}

export interface SearchIndex {
  /** Normalized text of every ayah, indexed [surah - 1][ayah - 1]. */
  surahs: readonly (readonly string[])[];
}

export function buildSearchIndex(surahs: readonly (readonly string[])[]): SearchIndex {
  return { surahs: surahs.map((ayahs) => ayahs.map(normalizeArabic)) };
}

export const MIN_QUERY_LENGTH = 2;

export interface SearchResult {
  matches: AyahRef[];
  /** Total number of matching ayahs, which may exceed `matches.length`. */
  total: number;
}

export function searchAyahs(index: SearchIndex, query: string, limit = 60): SearchResult {
  const needle = normalizeArabic(query);
  const matches: AyahRef[] = [];
  let total = 0;
  if (needle.length < MIN_QUERY_LENGTH) return { matches, total };

  index.surahs.forEach((ayahs, surahIndex) => {
    ayahs.forEach((text, ayahIndex) => {
      if (!text.includes(needle)) return;
      total += 1;
      if (matches.length < limit) matches.push({ surah: surahIndex + 1, ayah: ayahIndex + 1 });
    });
  });
  return { matches, total };
}
