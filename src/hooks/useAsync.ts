import { useEffect, useEffectEvent, useState } from 'react';

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; value: T };

const IDLE = { status: 'idle' } as const;
const LOADING = { status: 'loading' } as const;
const FAILED = { status: 'error' } as const;

/**
 * Runs `load` whenever `key` changes and reports how it went.
 *
 * A null key means "not needed yet". A result is only reported while its key
 * is still the current one, so a slow response can never overwrite a newer
 * request. Change the key (for example by appending an attempt number) to retry.
 */
export function useAsync<T>(key: string | null, load: () => Promise<T>): AsyncState<T> {
  const [settled, setSettled] = useState<{ key: string; state: AsyncState<T> } | null>(null);
  const run = useEffectEvent(load);

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    run().then(
      (value) => {
        if (!cancelled) setSettled({ key, state: { status: 'ready', value } });
      },
      () => {
        if (!cancelled) setSettled({ key, state: FAILED });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (key === null) return IDLE;
  return settled?.key === key ? settled.state : LOADING;
}
