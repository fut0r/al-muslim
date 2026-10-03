export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface ScheduledNotification {
  id: number;
  at: Date;
  title: string;
  body: string;
}

export interface NotificationChannelInfo {
  name: string;
  description: string;
}

/**
 * Local notifications. Nothing here talks to a server: notifications are
 * scheduled on the device from locally calculated prayer times.
 */
export interface NotificationBackend {
  /** Whether scheduled notifications still arrive when the app is closed. */
  readonly deliversWhenClosed: boolean;
  /** How many days ahead it is worth scheduling. */
  readonly horizonDays: number;
  /** Upper bound on pending notifications. */
  readonly limit: number;
  permission(): Promise<NotificationPermissionState>;
  requestPermission(): Promise<NotificationPermissionState>;
  /** Replaces everything previously scheduled with `items` (empty clears all). */
  replaceSchedule(items: ScheduledNotification[], channel: NotificationChannelInfo): Promise<void>;
  /** Android 12+: whether notifications may fire at the exact minute. */
  exactAlarmsAllowed?(): Promise<boolean>;
  openExactAlarmSettings?(): Promise<boolean>;
}
