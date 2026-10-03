import type { NotificationBackend, NotificationPermissionState } from './types';

const CHANNEL_ID = 'prayer-times';

async function plugin() {
  return (await import('@capacitor/local-notifications')).LocalNotifications;
}

function toState(display: string): NotificationPermissionState {
  if (display === 'granted' || display === 'denied') return display;
  return 'prompt';
}

/**
 * Schedules prayer notifications with the operating system, so they arrive
 * even when the app is closed or the device is idle. No server is involved.
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

  async replaceSchedule(items, channel) {
    const notifications = await plugin();
    const pending = await notifications.getPending();
    if (pending.notifications.length > 0) {
      await notifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
    }
    if (items.length === 0) return;

    // No-op on platforms without channels; safe to repeat on Android.
    await notifications
      .createChannel({ id: CHANNEL_ID, name: channel.name, description: channel.description, importance: 4, visibility: 1 })
      .catch(() => undefined);

    await notifications.schedule({
      notifications: items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        channelId: CHANNEL_ID,
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
