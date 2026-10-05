import type { I18n } from '@/i18n';
import { isNative } from '../platform';
import { nativeNotifications } from './native';
import type { NotificationBackend, NotificationOptions } from './types';
import { webNotifications } from './web';

export type { NotificationBackend, NotificationOptions, NotificationPermissionState, ScheduledNotification } from './types';

export const notifications: NotificationBackend = isNative ? nativeNotifications : webNotifications;

/** The chosen sound, with the channel names the system settings show for it. */
export function notificationOptions(i18n: I18n, sound: NotificationOptions['sound']): NotificationOptions {
  return {
    sound,
    channel: {
      name: i18n.t('notification.channelName'),
      description: i18n.t('notification.channelDescription'),
    },
    adhanChannel: {
      name: i18n.t('notification.adhanChannelName'),
      description: i18n.t('notification.adhanChannelDescription'),
    },
  };
}
