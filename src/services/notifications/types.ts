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
 * What the system actually has, as opposed to what the app asked for. Shown on
 * the notification status screen so that a notification which does not arrive
 * can be explained instead of guessed at.
 */
export interface NotificationStatus {
  platform: 'android' | 'web';
  permission: NotificationPermissionState;
  /** How many notifications are waiting, and when the next one is due. */
  pending: number;
  next: Date | null;
  /** When a notification was last shown by the app, if it is known. */
  lastShown: Date | null;
  /** Android: alarms may go off at their exact minute. */
  exactTiming?: boolean;
  /** Android: the user has silenced the notification category in the system settings. */
  channelBlocked?: boolean;
  /** Android: the system may stop the app in the background to save battery. */
  batteryRestricted?: boolean;
  /** Model and system version, for reporting a problem. */
  device?: string;
  /** The last thing that went wrong, in technical terms. */
  error?: string;
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
  status(): Promise<NotificationStatus>;
  /** Android 12: opens the system switch that lets alarms go off at the exact minute. */
  openExactAlarmSettings?(): Promise<void>;
  /**
   * Opens the system screen where notifications for this app are allowed.
   * Resolves to false when there is no such screen to open (the browser).
   */
  openSettings?(): Promise<boolean>;
  /** Asks the system to let the app run in the background. */
  openBatterySettings?(): Promise<void>;
}
