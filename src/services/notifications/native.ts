import type { NotificationBackend, NotificationPermissionState } from './types';

// Android fixes a channel's sound when it is first created, so each sound has
// its own channel. Bump the suffix if the adhan recording is ever replaced.
const DEFAULT_CHANNEL = 'prayer-times';
const ADHAN_CHANNEL = 'prayer-adhan-v1';
/** Bundled in android/app/src/main/res/raw (copied there by scripts/sync-android-assets.mjs). */
const ADHAN_SOUND = 'adhan.mp3';

async function plugin() {
  return (await import('@capacitor/local-notifications')).LocalNotifications;
}

function toState(display: string): NotificationPermissionState {
  if (display === 'granted' || display === 'denied') return display;
  return 'prompt';
}

/**
 * Schedules prayer notifications with the operating system, so they arrive
 * (and the adhan plays) even when the app is closed or the device is idle.
 * No server is involved.
 */
export const nativeNotifications: NotificationBackend = {
  deliversWhenClosed: true,
  horizonDays: 12,
  limit: 60,

  async permission() {
    try {
      return toState((await (await plugin()).checkPermissions()).display);
    } catch {
      return 'unsupported';
    }
  },

  async requestPermission() {
    try {
      return toState((await (await plugin()).requestPermissions()).display);
    } catch {
      return 'unsupported';
    }
  },

  async replaceSchedule(items, options) {
    const notifications = await plugin();
    const pending = await notifications.getPending();
    if (pending.notifications.length > 0) {
      await notifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
    }
    if (items.length === 0) return;

    const adhan = options.sound === 'adhan';
    const channelId = adhan ? ADHAN_CHANNEL : DEFAULT_CHANNEL;
    const names = adhan ? options.adhanChannel : options.channel;

    // No-op on platforms without channels; safe to repeat on Android.
    await notifications
      .createChannel({
        id: channelId,
        name: names.name,
        description: names.description,
        importance: 4,
        visibility: 1,
        ...(adhan ? { sound: ADHAN_SOUND } : {}),
      })
      .catch(() => undefined);

    await notifications.schedule({
      notifications: items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        channelId,
        // Read on Android 7 and earlier, which have no channels.
        ...(adhan ? { sound: ADHAN_SOUND } : {}),
        schedule: { at: item.at, allowWhileIdle: true },
      })),
    });
  },

  async exactAlarmsAllowed() {
    try {
      return (await (await plugin()).checkExactNotificationSetting()).exact_alarm === 'granted';
    } catch {
      return true; // Not applicable on this platform.
    }
  },

  async openExactAlarmSettings() {
    try {
      return (await (await plugin()).changeExactNotificationSetting()).exact_alarm === 'granted';
    } catch {
      return false;
    }
  },
};
