import { assetUrl } from '../platform';
import type { NotificationBackend, NotificationPermissionState, ScheduledNotification } from './types';

const supported = typeof window !== 'undefined' && 'Notification' in window;
const MAX_TIMER_MS = 2 ** 31 - 1;
const timers = new Set<number>();

function currentPermission(): NotificationPermissionState {
  if (!supported) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

async function show(item: ScheduledNotification): Promise<void> {
  if (currentPermission() !== 'granted') return;
  const options: NotificationOptions = {
    body: item.body,
    tag: `prayer-${item.id}`,
    icon: assetUrl('icons/icon-192.png'),
    badge: assetUrl('icons/badge-96.png'),
  };
  try {
    // Mobile browsers only allow notifications through the service worker.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(item.title, options);
      return;
    }
  } catch {
    // Fall through to the page-level API.
  }
  try {
    new Notification(item.title, options);
  } catch {
    // Not available in this browser; nothing else to try.
  }
}

/**
 * Browsers cannot wake a closed page at a given time, so on the web prayer
 * notifications are delivered while the app is open (including in the
 * background). The native app schedules them with the system instead.
 */
export const webNotifications: NotificationBackend = {
  deliversWhenClosed: false,
  horizonDays: 2,
  limit: 16,

  permission: () => Promise.resolve(currentPermission()),

  async requestPermission() {
    if (!supported) return 'unsupported';
    try {
      await Notification.requestPermission();
    } catch {
      // Some browsers reject instead of resolving when blocked.
    }
    return currentPermission();
  },

  replaceSchedule(items) {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    const now = Date.now();
    for (const item of items) {
      const delay = item.at.getTime() - now;
      if (delay <= 0 || delay > MAX_TIMER_MS) continue;
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        void show(item);
      }, delay);
      timers.add(timer);
    }
    return Promise.resolve();
  },
};
