import { registerPlugin } from '@capacitor/core';
import type {
  NotificationBackend,
  NotificationOptions,
  NotificationPermissionState,
  NotificationStatus,
  ScheduledNotification,
} from './types';

// Android fixes a channel's sound when it is first created, so each sound has
// its own channel. Bump the suffix if the adhan recording is ever replaced.
const DEFAULT_CHANNEL = 'prayer-times';
const ADHAN_CHANNEL = 'prayer-adhan-v1';

interface Channel {
  id: string;
  name: string;
  description: string;
  /** Plays the adhan bundled in the app (res/raw/adhan) instead of the device's sound. */
  adhan: boolean;
}

/** As reported by android/.../notifications/PrayerNotificationsPlugin.java. */
interface NativeState {
  permission: 'granted' | 'denied' | 'prompt';
  enabled: boolean;
  exact: boolean;
  sdk: number;
  release: string;
  device: string;
  pending: number;
  next?: number;
  lastShown?: number;
  error?: string;
  channelBlocked: boolean;
  batteryRestricted: boolean;
}

interface PrayerNotificationsPlugin {
  status(): Promise<NativeState>;
  requestPermission(): Promise<NativeState>;
  schedule(options: {
    channel: Channel;
    items: { id: number; at: number; title: string; body: string }[];
  }): Promise<{ scheduled: number; exact: boolean }>;
  cancel(): Promise<void>;
  test(options: { channel: Channel; title: string; body: string }): Promise<void>;
  openSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
}

/**
 * The app's own scheduler: alarms set with the system and notifications shown
 * by the app, with no third-party code in between.
 */
const PrayerNotifications = registerPlugin<PrayerNotificationsPlugin>('PrayerNotifications');

function channelFor(options: NotificationOptions): Channel {
  const adhan = options.sound === 'adhan';
  const names = adhan ? options.adhanChannel : options.channel;
  return { id: adhan ? ADHAN_CHANNEL : DEFAULT_CHANNEL, name: names.name, description: names.description, adhan };
}

/** The last failure talking to the system, kept for the status screen. */
let lastError: string | null = null;

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

  async permission(): Promise<NotificationPermissionState> {
    try {
      const state = await PrayerNotifications.status();
      lastError = null;
      return state.permission;
    } catch (error) {
      lastError = describe(error);
      return 'unsupported';
    }
  },

  async requestPermission(): Promise<NotificationPermissionState> {
    try {
      const state = await PrayerNotifications.requestPermission();
      lastError = null;
      return state.permission;
    } catch (error) {
      lastError = describe(error);
      return 'unsupported';
    }
  },

  async replaceSchedule(items, options) {
    try {
      if (items.length === 0) {
        scheduled = null;
        await PrayerNotifications.cancel();
        return;
      }

      const channel = channelFor(options);
      const fingerprints = items.map(fingerprint);
      if (alreadyScheduled(channel.id, fingerprints)) return;

      scheduled = null;
      await PrayerNotifications.schedule({
        channel,
        items: items.map((item) => ({ id: item.id, at: item.at.getTime(), title: item.title, body: item.body })),
      });
      scheduled = { key: channel.id, items: fingerprints };
      lastError = null;
    } catch (error) {
      lastError = describe(error);
      throw error;
    }
  },

  async sendTest(item, options) {
    await PrayerNotifications.test({ channel: channelFor(options), title: item.title, body: item.body });
  },

  async status(): Promise<NotificationStatus> {
    try {
      const state = await PrayerNotifications.status();
      return {
        platform: 'android',
        permission: state.permission,
        pending: state.pending,
        next: state.next ? new Date(state.next) : null,
        lastShown: state.lastShown ? new Date(state.lastShown) : null,
        exactTiming: state.exact,
        channelBlocked: state.channelBlocked,
        batteryRestricted: state.batteryRestricted,
        device: `${state.device} · Android ${state.release} (API ${state.sdk})`,
        error: state.error ?? lastError ?? undefined,
      };
    } catch (error) {
      return { platform: 'android', permission: 'unsupported', pending: 0, next: null, lastShown: null, error: describe(error) };
    }
  },

  async openExactAlarmSettings() {
    await PrayerNotifications.openExactAlarmSettings().catch(() => undefined);
  },

  async openSettings() {
    try {
      await PrayerNotifications.openSettings();
      return true;
    } catch {
      return false;
    }
  },

  async openBatterySettings() {
    await PrayerNotifications.openBatterySettings().catch(() => undefined);
  },
};
