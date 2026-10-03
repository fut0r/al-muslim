export const PRAYER_IDS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerId = (typeof PRAYER_IDS)[number];

/** The five obligatory prayers (sunrise is a time marker, not a prayer). */
export const OBLIGATORY_PRAYER_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type ObligatoryPrayerId = (typeof OBLIGATORY_PRAYER_IDS)[number];

export const MADHABS = ['shafi', 'hanafi'] as const;
export type Madhab = (typeof MADHABS)[number];

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type DayTimes = Record<PrayerId, Date>;

export function isObligatory(id: PrayerId): id is ObligatoryPrayerId {
  return id !== 'sunrise';
}

export function isValidCoordinates(value: Coordinates): boolean {
  return (
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.latitude) <= 90 &&
    Math.abs(value.longitude) <= 180
  );
}
