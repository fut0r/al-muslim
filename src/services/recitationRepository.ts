import { getReciter, RECITATION_HOST, type ReciterId } from '@/data/reciters';
import { isValidTimings, recitationUrl, type SurahTimings } from '@/domain/quran/recitation';
import { SURAH_COUNT } from '@/domain/quran/types';
import { assetUrl } from './platform';
import { getSurah } from './quranRepository';
import type { RecitationTrack } from './recitationPlayer';

const timingCache = new Map<ReciterId, Promise<readonly unknown[]>>();

/**
 * A reciter's ayah timings for the whole Quran: one small file bundled with
 * the app, read the first time that reciter is listened to.
 */
function loadTimings(reciter: ReciterId): Promise<readonly unknown[]> {
  let pending = timingCache.get(reciter);
  if (!pending) {
    pending = fetch(assetUrl(`data/recitation/${reciter}.json`))
      .then((response) => {
        if (!response.ok) throw new Error(`Timings for ${reciter}: HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length !== SURAH_COUNT) throw new Error(`Timings for ${reciter}: unexpected content`);
        return data as readonly unknown[];
      })
      .catch((error: unknown) => {
        timingCache.delete(reciter); // Allow a retry.
        throw error;
      });
    timingCache.set(reciter, pending);
  }
  return pending;
}

/** One surah as recited by one reciter: where to stream it from, and when each ayah begins. */
export async function loadRecitation(reciterId: ReciterId, surahId: number): Promise<RecitationTrack> {
  const surah = getSurah(surahId);
  if (!surah) throw new Error(`Unknown surah ${surahId}`);
  const timings: unknown = (await loadTimings(reciterId))[surahId - 1];
  // Never follow a recitation with timings that do not fit the surah.
  if (!isValidTimings(timings, surah.ayahs)) throw new Error(`Timings for ${reciterId}, surah ${surahId}: unexpected content`);
  return {
    url: recitationUrl({ host: RECITATION_HOST, folder: getReciter(reciterId).folder }, surahId),
    timings: timings satisfies SurahTimings,
  };
}
