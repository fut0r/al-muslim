import { useEffect, useState } from 'react';

/**
 * The current time, refreshed on wall-clock boundaries (every second, every
 * half minute…). Ticks pause while the page is hidden and catch up at once
 * when it becomes visible again, e.g. after the device wakes up.
 */
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(tick, intervalMs - (Date.now() % intervalMs));
    };
    const tick = () => {
      setNow(new Date());
      schedule();
    };
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (document.visibilityState === 'visible') tick();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);

  return now;
}
