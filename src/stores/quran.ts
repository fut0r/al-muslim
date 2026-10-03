import surahsJson from '@/data/quran/surahs.json';
import { isValidAyahRef, type AyahRef, type SurahInfo } from '@/domain/quran/types';
import { asRecord, createPersistentStore, useStore } from './createStore';

const surahs = surahsJson as SurahInfo[];
const MAX_BOOKMARKS = 500;

export interface Bookmark extends AyahRef {
  addedAt: number;
}

export interface QuranState {
  bookmarks: Bookmark[];
  lastRead: (AyahRef & { at: number }) | null;
}

function readRef(raw: unknown): AyahRef | null {
  const data = asRecord(raw);
  const ref = { surah: Number(data.surah), ayah: Number(data.ayah) };
  return isValidAyahRef(ref, surahs) ? ref : null;
}

export function sanitizeQuranState(raw: unknown): QuranState {
  const data = asRecord(raw);
  const seen = new Set<string>();
  const bookmarks: Bookmark[] = [];

  for (const entry of Array.isArray(data.bookmarks) ? data.bookmarks : []) {
    const ref = readRef(entry);
    if (!ref) continue;
    const key = `${ref.surah}:${ref.ayah}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const addedAt = Number(asRecord(entry).addedAt);
    bookmarks.push({ ...ref, addedAt: Number.isFinite(addedAt) ? addedAt : 0 });
    if (bookmarks.length >= MAX_BOOKMARKS) break;
  }

  const lastRef = readRef(data.lastRead);
  const lastAt = Number(asRecord(data.lastRead).at);
  return {
    bookmarks,
    lastRead: lastRef ? { ...lastRef, at: Number.isFinite(lastAt) ? lastAt : 0 } : null,
  };
}

export const quranStore = createPersistentStore<QuranState>('quran', sanitizeQuranState);

export function useQuranState(): QuranState {
  return useStore(quranStore);
}

export function isBookmarked(state: QuranState, ref: AyahRef): boolean {
  return state.bookmarks.some((b) => b.surah === ref.surah && b.ayah === ref.ayah);
}

export function toggleBookmark(ref: AyahRef): void {
  quranStore.set((previous) => {
    const exists = isBookmarked(previous, ref);
    const bookmarks = exists
      ? previous.bookmarks.filter((b) => !(b.surah === ref.surah && b.ayah === ref.ayah))
      : [{ surah: ref.surah, ayah: ref.ayah, addedAt: Date.now() }, ...previous.bookmarks].slice(0, MAX_BOOKMARKS);
    return { ...previous, bookmarks };
  });
}

export function setLastRead(ref: AyahRef): void {
  quranStore.set((previous) => {
    const last = previous.lastRead;
    if (last && last.surah === ref.surah && last.ayah === ref.ayah) return previous;
    return { ...previous, lastRead: { surah: ref.surah, ayah: ref.ayah, at: Date.now() } };
  });
}
