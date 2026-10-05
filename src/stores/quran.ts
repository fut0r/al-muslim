import surahsJson from '@/data/quran/surahs.json';
import { addRange, countAyahs, sanitizeRanges, type AyahRange } from '@/domain/quran/progress';
import { isValidAyahRef, type AyahRef, type SurahInfo } from '@/domain/quran/types';
import { asRecord, createPersistentStore, useStore } from './createStore';

const surahs = surahsJson as SurahInfo[];
const MAX_BOOKMARKS = 500;

export interface Bookmark extends AyahRef {
  addedAt: number;
}

export interface QuranState {
  bookmarks: Bookmark[];
  /** Where the reader was last left, to continue from. */
  lastRead: (AyahRef & { at: number }) | null;
  /**
   * The ayahs that have actually been read, by surah number. Progress is
   * counted from these, never from the reading position: opening a late surah
   * says nothing about the ones before it.
   */
  read: Record<number, readonly AyahRange[]>;
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

  const read: QuranState['read'] = {};
  for (const [key, value] of Object.entries(asRecord(data.read))) {
    const surah = surahs[Number(key) - 1];
    if (!surah || String(surah.id) !== key) continue;
    const ranges = sanitizeRanges(value, surah.ayahs);
    if (ranges.length > 0) read[surah.id] = ranges;
  }

  return {
    bookmarks,
    lastRead: lastRef ? { ...lastRef, at: Number.isFinite(lastAt) ? lastAt : 0 } : null,
    read,
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

/** Records that ayahs `from` to `to` of a surah have been read. */
export function markRead(surah: number, from: number, to: number): void {
  const info = surahs[surah - 1];
  if (!info) return;
  quranStore.set((previous) => {
    const current = previous.read[surah] ?? [];
    const next = addRange(current, Math.max(1, from), Math.min(info.ayahs, to));
    return next === current ? previous : { ...previous, read: { ...previous.read, [surah]: next } };
  });
}

/** How many ayahs of one surah have been read. */
export function ayahsRead(state: QuranState, surah: number): number {
  return countAyahs(state.read[surah]);
}

/** How many ayahs of the whole Quran have been read. */
export function totalAyahsRead(state: QuranState): number {
  return Object.values(state.read).reduce((total, ranges) => total + countAyahs(ranges), 0);
}

export function resetReadingProgress(): void {
  quranStore.set((previous) => (Object.keys(previous.read).length === 0 ? previous : { ...previous, read: {} }));
}
