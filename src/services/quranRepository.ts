import surahsJson from '@/data/quran/surahs.json';
import { buildSearchIndex, type SearchIndex } from '@/domain/quran/search';
import { SURAH_COUNT, type SurahInfo } from '@/domain/quran/types';
import { assetUrl } from './platform';

export const SURAHS = surahsJson as readonly SurahInfo[];

export function getSurah(id: number): SurahInfo | undefined {
  return Number.isInteger(id) ? SURAHS[id - 1] : undefined;
}

const surahCache = new Map<number, Promise<readonly string[]>>();

/**
 * The ayahs of one surah. Each surah is a small separate file, so opening the
 * reader never loads the whole Quran. Files are precached for offline use.
 */
export function loadSurah(id: number): Promise<readonly string[]> {
  const info = getSurah(id);
  if (!info) return Promise.reject(new Error(`Unknown surah ${id}`));

  let pending = surahCache.get(id);
  if (!pending) {
    pending = fetch(assetUrl(`data/quran/${id}.json`))
      .then((response) => {
        if (!response.ok) throw new Error(`Surah ${id}: HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        // Never render a surah that is incomplete or damaged.
        if (
          !Array.isArray(data) ||
          data.length !== info.ayahs ||
          data.some((ayah) => typeof ayah !== 'string' || ayah === '')
        ) {
          throw new Error(`Surah ${id}: unexpected content`);
        }
        return data as string[];
      })
      .catch((error: unknown) => {
        surahCache.delete(id); // Allow a retry.
        throw error;
      });
    surahCache.set(id, pending);
  }
  return pending;
}

export interface QuranSearchData {
  index: SearchIndex;
  /** Original text, indexed [surah - 1][ayah - 1]. */
  text: readonly (readonly string[])[];
}

let searchIndex: Promise<QuranSearchData> | null = null;

/** Builds the full-text index on first use; the text itself is already cached. */
export function loadSearchIndex(): Promise<QuranSearchData> {
  searchIndex ??= (async () => {
    const text: (readonly string[])[] = new Array(SURAH_COUNT);
    const ids = SURAHS.map((surah) => surah.id);
    const worker = async () => {
      for (let id = ids.shift(); id !== undefined; id = ids.shift()) {
        text[id - 1] = await loadSurah(id);
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    return { index: buildSearchIndex(text), text };
  })().catch((error: unknown) => {
    searchIndex = null;
    throw error;
  });
  return searchIndex;
}
