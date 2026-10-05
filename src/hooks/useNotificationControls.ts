import { useCallback, useEffect, useRef, useState } from 'react';
import {
  notifications,
  onScheduleChanged,
  type NotificationPermissionState,
  type NotificationStatus,
} from '@/services/notifications';
import { updateNotificationSettings } from '@/stores/settings';

/**
 * Turning prayer notifications on and off, including the permission request,
 * and what the system reports about them. The permission is only asked for
 * when the user chooses to enable notifications.
 */
export function useNotificationControls() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  // True while the user is in the system settings after asking to turn notifications on.
  const awaitingSettings = useRef(false);

  const refresh = useCallback(async (): Promise<NotificationStatus> => {
    const next = await notifications.status();
    setStatus(next);
    return next;
  }, []);

  // The permission and the schedule can change behind the app's back (in the
  // system settings), so they are read again every time the app comes back to
  // the foreground, and whenever the schedule has been rewritten.
  useEffect(() => {
    let cancelled = false;
    const read = () => {
      void notifications.status().then((next) => {
        if (cancelled) return;
        setStatus(next);
        if (awaitingSettings.current) {
          awaitingSettings.current = false;
          if (next.permission === 'granted') updateNotificationSettings({ enabled: true });
        }
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') read();
    };
    read();
    document.addEventListener('visibilitychange', onVisibility);
    const stopListening = onScheduleChanged(read);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      stopListening();
    };
  }, []);

  /** Resolves to the permission the request ended with. */
  const enable = useCallback(async (): Promise<NotificationPermissionState> => {
    let state = await notifications.permission();
    if (state === 'prompt') state = await notifications.requestPermission();
    updateNotificationSettings({ enabled: state === 'granted' });
    if (state === 'denied' && notifications.openSettings) {
      // The system no longer shows its prompt. Take the user to the switch
      // itself and finish turning notifications on when they come back.
      awaitingSettings.current = await notifications.openSettings();
    }
    await refresh();
    return state;
  }, [refresh]);

  const disable = useCallback(() => updateNotificationSettings({ enabled: false }), []);

  return { permission: status?.permission ?? null, status, refresh, enable, disable };
}
