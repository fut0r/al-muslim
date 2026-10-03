import { isNative } from '@/services/platform';

/**
 * Installs the service worker that precaches the app, fonts and Quran text
 * for offline use. Skipped in development and inside the native app, where
 * every file already ships with the package.
 */
export function registerServiceWorker(): void {
  if (isNative || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  void import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => undefined); // Offline support is an enhancement; the app runs without it.
}
