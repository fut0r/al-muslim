/** A run of consecutive ayahs in one surah, both ends included. */
export type AyahRange = readonly [from: number, to: number];

/**
 * Adds the ayahs `from`–`to` to a surah's read ranges and returns the result
 * sorted, with overlapping and adjacent runs merged. Returns the same array
 * when nothing new was added, so callers can skip saving.
 */
export function addRange(ranges: readonly AyahRange[], from: number, to: number): readonly AyahRange[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || to < from) return ranges;
  if (ranges.some(([start, end]) => start <= from && to <= end)) return ranges;

  const merged: [number, number][] = [];
  let pending: [number, number] = [from, to];
  for (const [start, end] of ranges) {
    if (end < pending[0] - 1) merged.push([start, end]);
    else if (start > pending[1] + 1) {
      merged.push(pending);
      pending = [start, end];
    } else pending = [Math.min(start, pending[0]), Math.max(end, pending[1])];
  }
  merged.push(pending);
  return merged;
}

/** How many ayahs the ranges cover. */
export function countAyahs(ranges: readonly AyahRange[] | undefined): number {
  return ranges ? ranges.reduce((total, [from, to]) => total + (to - from + 1), 0) : 0;
}

/** Rebuilds ranges from stored data, dropping anything outside 1–`ayahs`. */
export function sanitizeRanges(raw: unknown, ayahs: number): readonly AyahRange[] {
  let ranges: readonly AyahRange[] = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (!Array.isArray(entry)) continue;
    const from = Math.max(1, Number(entry[0]));
    const to = Math.min(ayahs, Number(entry[1]));
    ranges = addRange(ranges, from, to);
  }
  return ranges;
}

/**
 * A generous upper bound on reading speed, in characters of the fully
 * vowelled text per second (well over 400 words a minute). Text that went
 * past faster than this was scrolled over, not read.
 */
export const MAX_READING_SPEED = 80;

/** The least time, in milliseconds, in which `characters` of text can have been read. */
export function minimumReadingTime(characters: number): number {
  return (characters / MAX_READING_SPEED) * 1000;
}
