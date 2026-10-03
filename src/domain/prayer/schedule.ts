import { OBLIGATORY_PRAYER_IDS, PRAYER_IDS, isObligatory } from './types';
import type { DayTimes, ObligatoryPrayerId, PrayerId } from './types';

export interface PrayerEvent<T extends PrayerId = PrayerId> {
  id: T;
  time: Date;
}

export interface PrayerStatus {
  /** The obligatory prayer whose time is in effect, or null (sunrise → Dhuhr). */
  current: ObligatoryPrayerId | null;
  /** The next obligatory prayer. */
  next: PrayerEvent<ObligatoryPrayerId>;
  /** Milliseconds until `next`. */
  remainingMs: number;
  /** Share (0–1) of the gap between the previous event and `next` that has elapsed. */
  progress: number;
}

/**
 * Where `now` falls in the prayer schedule.
 *
 * Takes consecutive days (yesterday, today, tomorrow) so that the hours after
 * Isha and before Fajr resolve correctly across midnight.
 */
export function computePrayerStatus(now: Date, days: readonly DayTimes[]): PrayerStatus | null {
  const events: PrayerEvent[] = days
    .flatMap((day) => PRAYER_IDS.map((id) => ({ id, time: day[id] })))
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  const nowMs = now.getTime();
  let previous: PrayerEvent | undefined;
  let next: PrayerEvent<ObligatoryPrayerId> | undefined;

  for (const event of events) {
    if (event.time.getTime() <= nowMs) {
      previous = event;
    } else if (isObligatory(event.id)) {
      next = { id: event.id, time: event.time };
      break;
    }
  }
  if (!next) return null;

  const remainingMs = next.time.getTime() - nowMs;
  const span = previous ? next.time.getTime() - previous.time.getTime() : 0;
  const progress = span > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / span)) : 0;

  return {
    current: previous && isObligatory(previous.id) ? previous.id : null,
    next,
    remainingMs,
    progress,
  };
}

/** Every obligatory prayer in `days` that starts after `from`, in order. */
export function upcomingPrayers(
  from: Date,
  days: readonly DayTimes[],
): PrayerEvent<ObligatoryPrayerId>[] {
  return days
    .flatMap((day) => OBLIGATORY_PRAYER_IDS.map((id) => ({ id, time: day[id] })))
    .filter((event) => event.time.getTime() > from.getTime())
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
}

export function toCountdown(ms: number): Countdown {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
