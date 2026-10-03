import { useCallback, useEffect, useState } from 'react';
import { notifications, type NotificationPermissionState } from '@/services/notifications';
import { updateNotificationSettings } from '@/stores/settings';

/**
 * Turning prayer notifications on and off, including the permission request.
 * The permission is only asked for when the user chooses to enable them.
 */
export function useNotificationControls() {
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void notifications.permission().then((state) => {
      if (!cancelled) setPermission(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Resolves to true when notifications ended up enabled. */
  const enable = useCallback(async (): Promise<boolean> => {
    let state = await notifications.permission();
    if (state === 'prompt') state = await notifications.requestPermission();
    setPermission(state);
    const granted = state === 'granted';
    updateNotificationSettings({ enabled: granted });
    return granted;
  }, []);

  const disable = useCallback(() => updateNotificationSettings({ enabled: false }), []);

  return { permission, enable, disable };
}
