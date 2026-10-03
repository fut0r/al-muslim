import { asRecord, createPersistentStore, useStore } from './createStore';

/**
 * Adhkar counters for one day. Daily adhkar start fresh each day, so the
 * counts are tied to a date and discarded when the date changes.
 */
export interface AdhkarProgress {
  /** Civil date key (YYYY-MM-DD) the counts belong to. */
  day: string;
  counts: Record<string, number>;
}

export function sanitizeAdhkarProgress(raw: unknown): AdhkarProgress {
  const data = asRecord(raw);
  const counts: Record<string, number> = {};
  for (const [id, value] of Object.entries(asRecord(data.counts))) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 100000) {
      counts[id] = value;
    }
  }
  return {
    day: typeof data.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.day) ? data.day : '',
    counts,
  };
}

export const adhkarStore = createPersistentStore<AdhkarProgress>('adhkar', sanitizeAdhkarProgress);

export function useAdhkarProgress(today: string): AdhkarProgress {
  const state = useStore(adhkarStore);
  return state.day === today ? state : { day: today, counts: {} };
}

function countsFor(today: string): Record<string, number> {
  const state = adhkarStore.get();
  return state.day === today ? state.counts : {};
}

export function setDhikrCount(today: string, id: string, count: number): void {
  const counts = { ...countsFor(today) };
  if (count > 0) counts[id] = count;
  else delete counts[id];
  adhkarStore.set({ day: today, counts });
}

export function resetDhikrCounts(today: string, ids: readonly string[]): void {
  const counts = { ...countsFor(today) };
  for (const id of ids) delete counts[id];
  adhkarStore.set({ day: today, counts });
}
