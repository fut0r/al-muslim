import { isValidCoordinates } from '@/domain/prayer/types';
import { isValidTimeZone } from '@/domain/time';
import { asRecord, createPersistentStore, oneOf, useStore } from './createStore';

export const LOCATION_SOURCES = ['gps', 'city', 'manual'] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

/**
 * The place prayer times and the qiblah are computed for.
 * It is stored on the device only and never sent anywhere.
 */
export interface SavedLocation {
  latitude: number;
  longitude: number;
  source: LocationSource;
  /** City name (the nearest known city for a GPS position). */
  name?: string;
  nameAr?: string;
  countryCode?: string;
  /** Set for a chosen city; otherwise the device time zone applies. */
  timeZone?: string;
  updatedAt: number;
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.slice(0, 120) : undefined);

export function sanitizeLocation(raw: unknown): SavedLocation | null {
  const data = asRecord(raw);
  const latitude = data.latitude;
  const longitude = data.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!isValidCoordinates({ latitude, longitude })) return null;

  const countryCode = text(data.countryCode);
  return {
    latitude,
    longitude,
    source: oneOf(data.source, LOCATION_SOURCES, 'manual'),
    name: text(data.name),
    nameAr: text(data.nameAr),
    countryCode: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined,
    timeZone: isValidTimeZone(data.timeZone) ? data.timeZone : undefined,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

export const locationStore = createPersistentStore<SavedLocation | null>('location', sanitizeLocation);

export function useSavedLocation(): SavedLocation | null {
  return useStore(locationStore);
}
