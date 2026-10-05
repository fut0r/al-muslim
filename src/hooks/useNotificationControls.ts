import { useCallback, useEffect, useRef, useState } from 'react';
import { notifications, type NotificationPermissionState } from '@/services/notifications';
import { updateNotificationSettings } from '@/stores/settings';

/**
 * Turning prayer notifications on and off, including the permission request.
 * The permission is only asked for when the user chooses to enable them.
 */
export function useNotificationControls() {
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);
  // True while the user is in the system settings after asking to turn notifications on.
  const awaitingSettings = useRef(false);

  // The permission can change behind the app's back (in the system settings),
  // so it is read again every time the app comes back to the foreground.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void notifications.permission().then((state) => {
        if (cancelled) return;
        setPermission(state);
        if (awaitingSettings.current) {
          awaitingSettings.current = false;
          if (state === 'granted') updateNotificationSettings({ enabled: true });
        }
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /** Resolves to true when notifications ended up enabled. */
  const enable = useCallback(async (): Promise<boolean> => {
    let state = await notifications.permission();
    if (state === 'prompt') state = await notifications.requestPermission();
    setPermission(state);
    const granted = state === 'granted';
    updateNotificationSettings({ enabled: granted });
    if (state === 'denied' && notifications.openSettings) {
      // The system no longer shows its prompt. Take the user to the switch
      // itself and finish turning notifications on when they come back.
      awaitingSettings.current = await notifications.openSettings();
    }
    return granted;
  }, []);

  const disable = useCallback(() => updateNotificationSettings({ enabled: false }), []);

  return { permission, enable, disable };
}
