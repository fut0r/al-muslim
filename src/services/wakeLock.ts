import { isNative } from './platform';

export function wakeLockSupported(): boolean {
  return isNative || (typeof navigator !== 'undefined' && 'wakeLock' in navigator);
}

/**
 * Keeps the screen on until the returned function is called.
 * Uses the native plugin in the app and the Screen Wake Lock API on the web.
 */
export function keepScreenAwake(): () => void {
  let released = false;

  if (isNative) {
    void import('@capacitor-community/keep-awake')
      .then(({ KeepAwake }) => (released ? undefined : KeepAwake.keepAwake()))
      .catch(() => undefined);
    return () => {
      released = true;
      void import('@capacitor-community/keep-awake')
        .then(({ KeepAwake }) => KeepAwake.allowSleep())
        .catch(() => undefined);
    };
  }

  if (!wakeLockSupported()) return () => undefined;

  let sentinel: WakeLockSentinel | null = null;
  const acquire = () => {
    if (released || document.visibilityState !== 'visible') return;
    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        if (released) void lock.release();
        else sentinel = lock;
      })
      .catch(() => undefined); // Refused (e.g. battery saver): the screen simply follows system settings.
  };

  // The browser drops the lock whenever the page is hidden.
  document.addEventListener('visibilitychange', acquire);
  acquire();

  return () => {
    released = true;
    document.removeEventListener('visibilitychange', acquire);
    void sentinel?.release().catch(() => undefined);
    sentinel = null;
  };
}
