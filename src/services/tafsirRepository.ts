import type { TafsirLanguage } from '@/data/tafsir';
import { assetUrl } from './platform';
import { getSurah } from './quranRepository';

const cache = new Map<string, Promise<readonly string[]>>();

function isSurahTafsir(data: unknown, ayahs: number): data is readonly string[] {
  return Array.isArray(data) && data.length === ayahs && data.every((entry) => typeof entry === 'string');
}

/**
 * Al-Mukhtasar for one surah, one string per ayah. An empty string is an ayah
 * the edition does not explain on its own. The file is part of the app, so
 * opening a tafsir does not use the network.
 */
export function loadTafsir(language: TafsirLanguage, surahId: number): Promise<readonly string[]> {
  const info = getSurah(surahId);
  if (!info) return Promise.reject(new Error(`Unknown surah ${surahId}`));

  const key = `${language}:${surahId}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetch(assetUrl(`data/tafsir/${language}/${surahId}.json`))
      .then((response) => {
        if (!response.ok) throw new Error(`Tafsir ${key}: HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!isSurahTafsir(data, info.ayahs)) throw new Error(`Tafsir ${key}: unexpected content`);
        return data;
      })
      .catch((error: unknown) => {
        cache.delete(key);
        throw error;
      });
    cache.set(key, pending);
  }
  return pending;
}
