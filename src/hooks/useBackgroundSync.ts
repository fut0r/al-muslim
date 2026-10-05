import { useEffect, useState } from 'react';
import { calculateDayTimes } from '@/domain/prayer/calculate';
import { planNotifications } from '@/domain/prayer/notificationPlan';
import type { DayTimes } from '@/domain/prayer/types';
import { addDays, civilDateInZone, type CivilDate } from '@/domain/time';
import { useI18n } from '@/i18n';
import { formatLocation, formatTime } from '@/i18n/format';
import { locationPermission } from '@/services/geolocation';
import { notificationOptions, notifications, notifyScheduleChanged } from '@/services/notifications';
import { buildWidgetPayload, updateWidgets, widgetsSupported } from '@/services/widgets';
import { locationStore, useSavedLocation } from '@/stores/location';
import { useSettings } from '@/stores/settings';
import { saveDeviceLocation } from './useLocationActions';
import { useCalculation } from './usePrayerTimes';

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
 * The backend leaves the system's alarms alone when nothing has changed.
 */
export function usePrayerNotificationSync(): void {
  const i18n = useI18n();
  const location = useSavedLocation();
  const { hour12, notifications: preferences } = useSettings();
  const { method, madhab } = useCalculation();
  const resumes = useResumeCount();

  useEffect(() => {
    let cancelled = false;
    const options = notificationOptions(i18n, preferences.sound);

    const sync = async () => {
      if (!preferences.enabled || !location) {
        await notifications.replaceSchedule([], options);
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
            label: prayer,
          };
        }),
        options,
      );
    };

    // Scheduling is best effort and never disturbs the app; a failure is kept
    // by the backend and shown on the notification status screen.
    sync()
      .catch(() => undefined)
      .finally(notifyScheduleChanged);
    return () => {
      cancelled = true;
    };
  }, [i18n, location, method, madhab, hour12, preferences, resumes]);
}

/**
 * Hands the Android home screen widgets a fresh schedule whenever something
 * they show changes, and each time the app comes back to the foreground.
 */
export function useWidgetSync(): void {
  const i18n = useI18n();
  const location = useSavedLocation();
  const { hour12, hijriAdjustment } = useSettings();
  const { method, madhab } = useCalculation();
  const resumes = useResumeCount();

  useEffect(() => {
    if (!widgetsSupported) return;
    void updateWidgets(
      buildWidgetPayload({
        i18n,
        now: new Date(),
        location,
        locationLabel: formatLocation(i18n, location),
        method,
        madhab,
        hour12,
        hijriAdjustment,
      }),
    );
  }, [i18n, location, method, madhab, hour12, hijriAdjustment, resumes]);
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
