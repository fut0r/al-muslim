import { ayahOrdinal, showsBasmalah, type AyahRef, type SurahInfo } from './types';

export interface RecitationItem extends AyahRef {
  /**
   * True for the basmalah recited before the first ayah of a surah. Its audio
   * is that of Al-Fatihah 1:1, because recordings of other surahs start at
   * their own first ayah.
   */
  basmalah?: boolean;
}

/** What to play, in order, when listening to `surah` from `fromAyah` to its end. */
export function recitationQueue(surah: SurahInfo, fromAyah: number): RecitationItem[] {
  const start = Math.min(Math.max(1, Math.trunc(fromAyah) || 1), surah.ayahs);
  const queue: RecitationItem[] = [];
  if (start === 1 && showsBasmalah(surah.id)) queue.push({ surah: 1, ayah: 1, basmalah: true });
  for (let ayah = start; ayah <= surah.ayahs; ayah += 1) queue.push({ surah: surah.id, ayah });
  return queue;
}

export interface RecitationSource {
  host: string;
  edition: string;
  bitrate: number;
}

/** Address of one ayah's audio. Files are numbered 1–6236 across the whole Quran. */
export function recitationUrl(source: RecitationSource, ref: AyahRef, surahs: readonly SurahInfo[]): string {
  return `${source.host}/quran/audio/${source.bitrate}/${source.edition}/${ayahOrdinal(ref, surahs)}.mp3`;
}
