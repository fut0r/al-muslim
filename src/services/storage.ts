/**
 * localStorage that never throws.
 *
 * Storage can be missing or blocked (private mode, embedded WebViews, quota).
 * In that case values live in memory for the session so the app keeps working.
 */
const memory = new Map<string, string>();

function resolveStorage(): Storage | null {
  try {
    const candidate = window.localStorage;
    const probe = '__al_muslim_probe__';
    candidate.setItem(probe, '1');
    candidate.removeItem(probe);
    return candidate;
  } catch {
    return null;
  }
}

const backing = typeof window === 'undefined' ? null : resolveStorage();

export const storage = {
  persistent: backing !== null,

  get(key: string): string | null {
    try {
      return backing ? backing.getItem(key) : (memory.get(key) ?? null);
    } catch {
      return memory.get(key) ?? null;
    }
  },

  set(key: string, value: string): void {
    memory.set(key, value);
    try {
      backing?.setItem(key, value);
    } catch {
      // Quota exceeded or storage revoked: the in-memory copy still serves this session.
    }
  },

  remove(key: string): void {
    memory.delete(key);
    try {
      backing?.removeItem(key);
    } catch {
      // Nothing to do.
    }
  },
};
