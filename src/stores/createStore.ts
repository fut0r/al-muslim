import { useSyncExternalStore } from 'react';
import { storage } from '@/services/storage';

export interface Store<T> {
  get(): T;
  set(next: T | ((previous: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

const PREFIX = 'al-muslim:';

/**
 * A small persistent store.
 *
 * `sanitize` receives whatever was found in storage (possibly corrupted, from
 * an older version, or edited by hand) and must always return a valid value.
 * That keeps bad data from ever reaching a component.
 */
export function createPersistentStore<T>(name: string, sanitize: (raw: unknown) => T): Store<T> {
  const key = PREFIX + name;
  const listeners = new Set<() => void>();

  const read = (): T => {
    let raw: unknown;
    try {
      const text = storage.get(key);
      raw = text === null ? undefined : JSON.parse(text);
    } catch {
      raw = undefined;
    }
    try {
      return sanitize(raw);
    } catch {
      return sanitize(undefined);
    }
  };

  let value = read();
  const notify = () => listeners.forEach((listener) => listener());

  if (typeof window !== 'undefined') {
    // Keep several open tabs in sync.
    window.addEventListener('storage', (event) => {
      if (event.key !== key) return;
      value = read();
      notify();
    });
  }

  return {
    get: () => value,
    set(next) {
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      storage.set(key, JSON.stringify(value));
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// --- Helpers for writing sanitizers ---------------------------------------

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function oneOf<const T extends readonly unknown[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return allowed.includes(value) ? (value as T[number]) : fallback;
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function asNumberInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
