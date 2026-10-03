import { useEffect, useState } from 'react';
import { calculateDayTimes } from '@/domain/prayer/calculate';
import { planNotifications } from '@/domain/prayer/notificationPlan';
import type { DayTimes } from '@/domain/prayer/types';
import { addDays, civilDateInZone, type CivilDate } from '@/domain/time';
import { useI18n } from '@/i18n';
import { formatTime } from '@/i18n/format';
import { locationPermission } from '@/services/geolocation';
import { notifications } from '@/services/notifications';
import { locationStore, useSavedLocation } from '@/stores/location';
import { useSettings } from '@/stores/settings';
import { saveDeviceLocation } from './useLocationActions';

/** Counts how often the app returns to the foreground. */
function useResumeCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setCount((value) => value + 1);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  return count;
}

/**
 * Keeps the scheduled prayer notifications in line with the current settings,
 * location and language. Runs on launch, on every return to the app and
 * whenever a relevant setting changes; times are calculated on the device.
 */
export function usePrayerNotificationSync(): void {
  const i18n = useI18n();
  const location = useSavedLocation();
  const { method, madhab, hour12, notifications: preferences } = useSettings();
  const resumes = useResumeCount();

  useEffect(() => {
    let cancelled = false;
    const channel = {
      name: i18n.t('notification.channelName'),
      description: i18n.t('notification.channelDescription'),
    };

    const sync = async () => {
      if (!preferences.enabled || !location) {
        await notifications.replaceSchedule([], channel);
        return;
      }
      if ((await notifications.permission()) !== 'granted') return;

      const now = new Date();
      const start = civilDateInZone(now, location.timeZone);
      const days: { date: CivilDate; times: DayTimes }[] = [];
      for (let offset = 0; offset < notifications.horizonDays; offset += 1) {
        const date = addDays(start, offset);
        const times = calculateDayTimes({ date, coordinates: location, method, madhab });
        if (times) days.push({ date, times });
      }

      const plan = planNotifications({ from: now, days, enabled: preferences.prayers, limit: notifications.limit });
      if (cancelled) return;
      await notifications.replaceSchedule(
        plan.map((item) => {
          const prayer = i18n.t(`prayers.${item.prayer}`);
          const time = formatTime(i18n, item.at, { hour12, timeZone: location.timeZone });
          return {
            id: item.id,
            at: item.at,
            title: i18n.t('notification.title', { prayer, time }),
            body: i18n.t('notification.body', { prayer }),
          };
        }),
        channel,
      );
    };

    sync().catch(() => undefined); // Scheduling is best effort; the app itself is unaffected.
    return () => {
      cancelled = true;
    };
  }, [i18n, location, method, madhab, hour12, preferences, resumes]);
}

const REFRESH_AFTER_MS = 60 * 60 * 1000;

/**
 * When the location came from the device and access is already granted,
 * refresh it on launch so prayer times follow the user when they travel.
 * This never triggers a permission prompt.
 */
export function useLocationRefresh(): void {
  useEffect(() => {
    const saved = locationStore.get();
    if (!saved || saved.source !== 'gps' || Date.now() - saved.updatedAt < REFRESH_AFTER_MS) return;
    void locationPermission().then((state) => {
      if (state === 'granted') void saveDeviceLocation();
    });
  }, []);
}
