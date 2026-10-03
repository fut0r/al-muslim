import { isNative } from '../platform';
import { nativeNotifications } from './native';
import type { NotificationBackend } from './types';
import { webNotifications } from './web';

export type { NotificationBackend, NotificationPermissionState, ScheduledNotification } from './types';

export const notifications: NotificationBackend = isNative ? nativeNotifications : webNotifications;
