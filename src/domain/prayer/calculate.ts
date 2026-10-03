import {
  Coordinates as AdhanCoordinates,
  HighLatitudeRule,
  Madhab as AdhanMadhab,
  PolarCircleResolution,
  PrayerTimes,
} from 'adhan';
import type { CivilDate } from '../time';
import { methodParameters, type CalculationMethodId } from './methods';
import { PRAYER_IDS, isValidCoordinates, type Coordinates, type DayTimes, type Madhab } from './types';

export interface PrayerCalculationInput {
  date: CivilDate;
  coordinates: Coordinates;
  method: CalculationMethodId;
  madhab: Madhab;
}

/**
 * Prayer times for one civil day at a place, computed entirely on the device.
 *
 * The results are absolute instants, so time zones and DST only matter when
 * they are formatted for display. Returns null when the times cannot be
 * determined (invalid coordinates, or a polar day/night no rule can resolve).
 */
export function calculateDayTimes(input: PrayerCalculationInput): DayTimes | null {
  const { date, coordinates, method, madhab } = input;
  if (!isValidCoordinates(coordinates)) return null;

  const adhanCoordinates = new AdhanCoordinates(coordinates.latitude, coordinates.longitude);
  const parameters = methodParameters(method);
  parameters.madhab = madhab === 'hanafi' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;
  // Far from the equator twilight may never end; these rules keep Fajr and
  // Isha at reasonable times instead of leaving them undefined.
  parameters.highLatitudeRule = HighLatitudeRule.recommended(adhanCoordinates);
  parameters.polarCircleResolution = PolarCircleResolution.AqrabBalad;

  // adhan reads the local year/month/day of this Date; noon avoids any DST gap.
  const localDate = new Date(date.year, date.month - 1, date.day, 12);
  const times = new PrayerTimes(adhanCoordinates, localDate, parameters);

  const result = {} as DayTimes;
  for (const id of PRAYER_IDS) {
    const time = times[id];
    if (!(time instanceof Date) || Number.isNaN(time.getTime())) return null;
    result[id] = time;
  }
  return result;
}
