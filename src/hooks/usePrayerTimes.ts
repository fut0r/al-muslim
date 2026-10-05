import { useEffect, useMemo, useState } from 'react';
import { calculateDayTimes } from '@/domain/prayer/calculate';
import { resolveCalculation, type Calculation } from '@/domain/prayer/methods';
import { computePrayerStatus, type PrayerStatus } from '@/domain/prayer/schedule';
import type { DayTimes } from '@/domain/prayer/types';
import { addDays, civilDateInZone, civilDateKey, type CivilDate } from '@/domain/time';
import { useSavedLocation, type SavedLocation } from '@/stores/location';
import { useSettings } from '@/stores/settings';
import { useNow } from './useNow';

/** Today's civil date at the saved location (or on the device when none is set). */
export function useToday(now: Date): CivilDate {
  const location = useSavedLocation();
  const today = civilDateInZone(now, location?.timeZone);
  const key = civilDateKey(today);
  // A stable object for the whole day, so dependants recompute only at midnight.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => today, [key]);
}

/**
 * The calculation method and madhab in effect: those of the country the saved
 * location is in, unless the user has chosen their own.
 */
export function useCalculation(): Calculation & { automatic: boolean } {
  const { autoCalculation, method, madhab } = useSettings();
  const countryCode = useSavedLocation()?.countryCode;
  return useMemo(
    () => ({ ...resolveCalculation({ autoCalculation, method, madhab }, countryCode), automatic: autoCalculation }),
    [autoCalculation, method, madhab, countryCode],
  );
}

/** Prayer times for one civil day at the saved location, or null if unavailable. */
export function useDayTimes(date: CivilDate): DayTimes | null {
  const location = useSavedLocation();
  const { method, madhab } = useCalculation();
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  return useMemo(() => {
    if (latitude === undefined || longitude === undefined) return null;
    return calculateDayTimes({ date, coordinates: { latitude, longitude }, method, madhab });
  }, [date, latitude, longitude, method, madhab]);
}

export type PrayerState =
  | { kind: 'no-location' }
  | { kind: 'unavailable'; location: SavedLocation }
  | {
      kind: 'ready';
      location: SavedLocation;
      /** Zone the times should be displayed in (device zone when undefined). */
      timeZone: string | undefined;
      today: CivilDate;
      times: DayTimes;
      status: PrayerStatus;
    };

/** Today's times plus where `now` falls among them. */
export function usePrayerState(now: Date): PrayerState {
  const location = useSavedLocation();
  const today = useToday(now);
  const yesterday = useMemo(() => addDays(today, -1), [today]);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const before = useDayTimes(yesterday);
  const times = useDayTimes(today);
  const after = useDayTimes(tomorrow);

  return useMemo<PrayerState>(() => {
    if (!location) return { kind: 'no-location' };
    if (!before || !times || !after) return { kind: 'unavailable', location };
    const status = computePrayerStatus(now, [before, times, after]);
    if (!status) return { kind: 'unavailable', location };
    return { kind: 'ready', location, timeZone: location.timeZone, today, times, status };
  }, [location, before, times, after, today, now]);
}

/**
 * The prayer state for "now", kept current without re-rendering every second:
 * it refreshes twice a minute and exactly when the next prayer begins.
 */
export function useLivePrayerState(): { now: Date; state: PrayerState } {
  const coarse = useNow(30_000);
  const [edge, setEdge] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [coarse, edge]);
  const state = usePrayerState(now);
  const nextAt = state.kind === 'ready' ? state.status.next.time.getTime() : null;

  useEffect(() => {
    if (nextAt === null) return;
    const timer = window.setTimeout(() => setEdge((value) => value + 1), Math.max(0, nextAt - Date.now()) + 200);
    return () => window.clearTimeout(timer);
  }, [nextAt]);

  return { now, state };
}
