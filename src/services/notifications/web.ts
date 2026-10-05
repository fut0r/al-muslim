import { adhanPlayer, prepareAdhan } from '../adhanPlayer';
import { assetUrl } from '../platform';
import type {
  NotificationBackend,
  NotificationOptions as ScheduleOptions,
  NotificationPermissionState,
  ScheduledNotification,
} from './types';

const supported = typeof window !== 'undefined' && 'Notification' in window;
const MAX_TIMER_MS = 2 ** 31 - 1;
const TEST_DELAY_MS = 3000;
const timers = new Set<number>();
/** When each waiting notification is due, and when one was last shown: for the status screen. */
let waiting: number[] = [];
let lastShown: Date | null = null;

function currentPermission(): NotificationPermissionState {
  if (!supported) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

async function show(item: ScheduledNotification, options: ScheduleOptions): Promise<void> {
  if (currentPermission() !== 'granted') return;
  lastShown = new Date();
  // The adhan is played by the page itself; browsers offer no custom notification sounds.
  if (options.sound === 'adhan') void adhanPlayer.play(item.label);

  const notification: NotificationOptions = {
    body: item.body,
    tag: `prayer-${item.id}`,
    icon: assetUrl('icons/icon-192.png'),
    badge: assetUrl('icons/badge-96.png'),
    silent: options.sound === 'adhan',
  };
  try {
    // Mobile browsers only allow notifications through the service worker.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(item.title, notification);
      return;
    }
  } catch {
    // Fall through to the page-level API.
  }
  try {
    new Notification(item.title, notification);
  } catch {
    // Not available in this browser; nothing else to try.
  }
}

/**
 * Browsers cannot wake a closed page at a given time, so on the web prayer
 * notifications (and the adhan) are delivered while the app is open, including
 * in the background. The native app schedules them with the system instead.
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

  replaceSchedule(items, options) {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    waiting = [];
    if (items.length > 0 && options.sound === 'adhan') prepareAdhan();

    const now = Date.now();
    for (const item of items) {
      const delay = item.at.getTime() - now;
      if (delay <= 0 || delay > MAX_TIMER_MS) continue;
      waiting.push(item.at.getTime());
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        void show(item, options);
      }, delay);
      timers.add(timer);
    }
    return Promise.resolve();
  },

  sendTest(item, options) {
    if (options.sound === 'adhan') prepareAdhan();
    window.setTimeout(() => void show({ ...item, id: 0, at: new Date() }, options), TEST_DELAY_MS);
    return Promise.resolve();
  },

  status() {
    const now = Date.now();
    const due = waiting.filter((at) => at > now);
    return Promise.resolve({
      platform: 'web' as const,
      permission: currentPermission(),
      pending: due.length,
      next: due.length > 0 ? new Date(Math.min(...due)) : null,
      lastShown,
    });
  },
};
