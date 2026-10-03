import type { CivilDate } from '../time';
import { OBLIGATORY_PRAYER_IDS, type DayTimes, type ObligatoryPrayerId } from './types';

export interface PlannedNotification {
  /** Stable per day and prayer, so rescheduling replaces instead of duplicating. */
  id: number;
  prayer: ObligatoryPrayerId;
  at: Date;
}

export interface NotificationPlanInput {
  from: Date;
  days: ReadonlyArray<{ date: CivilDate; times: DayTimes }>;
  enabled: Readonly<Record<ObligatoryPrayerId, boolean>>;
  /** Platforms cap the number of pending notifications (iOS allows 64). */
  limit: number;
}

export function planNotifications({ from, days, enabled, limit }: NotificationPlanInput): PlannedNotification[] {
  const plan: PlannedNotification[] = [];
  for (const { date, times } of days) {
    OBLIGATORY_PRAYER_IDS.forEach((prayer, index) => {
      const at = times[prayer];
      if (!enabled[prayer] || at.getTime() <= from.getTime()) return;
      const dayNumber = (date.year % 100) * 10000 + date.month * 100 + date.day;
      plan.push({ id: dayNumber * 10 + index, prayer, at });
    });
  }
  return plan.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
}
