export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface ScheduledNotification {
  id: number;
  at: Date;
  title: string;
  body: string;
  /** Short name of what the notification is for (the prayer), shown while the adhan plays. */
  label: string;
}

export interface NotificationOptions {
  /** Whether the adhan or the device's ordinary notification sound is played. */
  sound: 'adhan' | 'default';
  /** Names shown in the system notification settings. */
  channel: { name: string; description: string };
  adhanChannel: { name: string; description: string };
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
  replaceSchedule(items: ScheduledNotification[], options: NotificationOptions): Promise<void>;
  /** Delivers one notification in a few seconds, with the chosen sound, to confirm that delivery works. */
  sendTest(item: Pick<ScheduledNotification, 'title' | 'body' | 'label'>, options: NotificationOptions): Promise<void>;
  /** Android 12+: whether notifications may fire at the exact minute. */
  exactAlarmsAllowed?(): Promise<boolean>;
  openExactAlarmSettings?(): Promise<boolean>;
  /**
   * Opens the system screen where notifications for this app are allowed.
   * Resolves to false when there is no such screen to open (the browser).
   */
  openSettings?(): Promise<boolean>;
}
