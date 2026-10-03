export interface SurahInfo {
  id: number;
  /** Arabic name, without the word "سورة". */
  name: string;
  englishName: string;
  meaning: string;
  revelation: 'meccan' | 'medinan';
  ayahs: number;
}

export interface AyahRef {
  surah: number;
  ayah: number;
}

export const SURAH_COUNT = 114;
export const TOTAL_AYAHS = 6236;

/** Surah 1 opens with the basmalah as its first ayah; surah 9 has none. */
export function showsBasmalah(surahId: number): boolean {
  return surahId !== 1 && surahId !== 9;
}

export function isValidAyahRef(ref: AyahRef, surahs: readonly SurahInfo[]): boolean {
  const surah = surahs[ref.surah - 1];
  return (
    Number.isInteger(ref.surah) &&
    Number.isInteger(ref.ayah) &&
    surah !== undefined &&
    ref.ayah >= 1 &&
    ref.ayah <= surah.ayahs
  );
}

/** Position of an ayah in the whole Quran, from 1 to 6236. */
export function ayahOrdinal(ref: AyahRef, surahs: readonly SurahInfo[]): number {
  let total = 0;
  for (let index = 0; index < ref.surah - 1; index += 1) total += surahs[index]?.ayahs ?? 0;
  return total + ref.ayah;
}
