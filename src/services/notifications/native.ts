import { Capacitor, registerPlugin } from '@capacitor/core';
import type { NotificationBackend, NotificationOptions, NotificationPermissionState, ScheduledNotification } from './types';

// Android fixes a channel's sound when it is first created, so each sound has
// its own channel. Bump the suffix if the adhan recording is ever replaced.
const DEFAULT_CHANNEL = 'prayer-times';
const ADHAN_CHANNEL = 'prayer-adhan-v1';
/** Bundled in android/app/src/main/res/raw (copied there by scripts/sync-android-assets.mjs). */
const ADHAN_SOUND = 'adhan.mp3';
/** Outside the range used for prayer times, which are numbered from the date. */
const TEST_NOTIFICATION_ID = 1;
const TEST_DELAY_MS = 5000;

interface SystemSettingsPlugin {
  openNotifications(): Promise<void>;
}

/** android/app/src/main/java/.../SystemSettingsPlugin.java */
const SystemSettings = registerPlugin<SystemSettingsPlugin>('SystemSettings');

async function plugin() {
  return (await import('@capacitor/local-notifications')).LocalNotifications;
}

function toState(display: string): NotificationPermissionState {
  if (display === 'granted' || display === 'denied') return display;
  return 'prompt';
}

async function exactAlarmsAllowed(): Promise<boolean> {
  try {
    return (await (await plugin()).checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    return true; // Not applicable on this platform.
  }
}

/** Makes sure the channel for the chosen sound exists and returns its id. */
async function prepareChannel(options: NotificationOptions): Promise<string> {
  const adhan = options.sound === 'adhan';
  const channelId = adhan ? ADHAN_CHANNEL : DEFAULT_CHANNEL;
  const names = adhan ? options.adhanChannel : options.channel;
  // No-op on platforms without channels; safe to repeat on Android.
  await (await plugin())
    .createChannel({
      id: channelId,
      name: names.name,
      description: names.description,
      importance: 4,
      visibility: 1,
      ...(adhan ? { sound: ADHAN_SOUND } : {}),
    })
    .catch(() => undefined);
  return channelId;
}

/**
 * What is currently scheduled with the system, so that returning to the app
 * does not cancel and recreate dozens of identical alarms every time.
 */
let scheduled: { key: string; items: string[] } | null = null;

const fingerprint = (item: ScheduledNotification) => `${item.id}@${item.at.getTime()}|${item.title}|${item.body}`;

/** True when `items` is what is already scheduled, minus any that have since been delivered. */
function alreadyScheduled(key: string, items: string[]): boolean {
  if (!scheduled || scheduled.key !== key || items.length > scheduled.items.length) return false;
  const offset = scheduled.items.length - items.length;
  return items.every((item, index) => item === scheduled!.items[offset + index]);
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

    if (items.length === 0) {
      scheduled = null;
      const pending = await notifications.getPending();
      if (pending.notifications.length > 0) {
        await notifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
      }
      return;
    }

    // The plugin opens the system "Alarms & reminders" screen by itself whenever
    // a notification asks for exact timing that is not allowed. Scheduling runs
    // in the background, so it must never do that: ask for exact timing only
    // when it is already allowed. Settings offers the switch otherwise.
    const exact = await exactAlarmsAllowed();
    const adhan = options.sound === 'adhan';
    const key = `${adhan ? ADHAN_CHANNEL : DEFAULT_CHANNEL}|${exact ? 'exact' : 'inexact'}`;
    const fingerprints = items.map(fingerprint);
    if (alreadyScheduled(key, fingerprints)) return;

    scheduled = null;
    const pending = await notifications.getPending();
    if (pending.notifications.length > 0) {
      await notifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
    }

    const channelId = await prepareChannel(options);
    await notifications.schedule({
      notifications: items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        channelId,
        // Read on Android 7 and earlier, which have no channels.
        ...(adhan ? { sound: ADHAN_SOUND } : {}),
        isExactNotification: exact,
        schedule: { at: item.at, allowWhileIdle: true },
      })),
    });
    scheduled = { key, items: fingerprints };
  },

  async sendTest(item, options) {
    const notifications = await plugin();
    const channelId = await prepareChannel(options);
    await notifications.schedule({
      notifications: [
        {
          id: TEST_NOTIFICATION_ID,
          title: item.title,
          body: item.body,
          channelId,
          ...(options.sound === 'adhan' ? { sound: ADHAN_SOUND } : {}),
          isExactNotification: await exactAlarmsAllowed(),
          schedule: { at: new Date(Date.now() + TEST_DELAY_MS), allowWhileIdle: true },
        },
      ],
    });
  },

  exactAlarmsAllowed,

  async openExactAlarmSettings() {
    try {
      return (await (await plugin()).changeExactNotificationSetting()).exact_alarm === 'granted';
    } catch {
      return false;
    }
  },

  async openSettings() {
    if (Capacitor.getPlatform() !== 'android') return false;
    try {
      await SystemSettings.openNotifications();
      return true;
    } catch {
      return false;
    }
  },
};
