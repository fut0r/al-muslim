import { useEffect } from 'react';
import { keepScreenAwake } from '@/services/wakeLock';
import { useSettings } from '@/stores/settings';

/** Keeps the screen on while the calling screen is open, if the user enabled it. */
export function useKeepAwake(): void {
  const { keepAwake } = useSettings();
  useEffect(() => (keepAwake ? keepScreenAwake() : undefined), [keepAwake]);
}

/** Sets the document title, which screen readers announce on navigation. */
export function usePageTitle(title: string, appName: string): void {
  useEffect(() => {
    document.title = title === appName ? appName : `${title} · ${appName}`;
  }, [title, appName]);
}
