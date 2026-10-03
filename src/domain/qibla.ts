import type { Coordinates } from './prayer/types';

/** The Kaaba, Masjid al-Haram, Makkah. */
export const KAABA: Coordinates = { latitude: 21.422487, longitude: 39.826206 };

const EARTH_RADIUS_KM = 6371.0088;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Initial great-circle bearing from a place to the Kaaba, in degrees
 * clockwise from true north (0–360).
 */
export function qiblaBearing({ latitude, longitude }: Coordinates): number {
  const lat1 = toRadians(latitude);
  const lat2 = toRadians(KAABA.latitude);
  const deltaLon = toRadians(KAABA.longitude - longitude);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

/** Great-circle distance to the Kaaba in kilometres. */
export function distanceToKaabaKm({ latitude, longitude }: Coordinates): number {
  const lat1 = toRadians(latitude);
  const lat2 = toRadians(KAABA.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRadians(KAABA.longitude - longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type CompassPoint = (typeof COMPASS_POINTS)[number];

export function compassPoint(bearing: number): CompassPoint {
  return COMPASS_POINTS[Math.round(normalizeDegrees(bearing) / 45) % 8] ?? 'N';
}

/** Signed smallest rotation from `from` to `to`, in the range (−180, 180]. */
export function angleDelta(from: number, to: number): number {
  const delta = normalizeDegrees(to - from);
  return delta > 180 ? delta - 360 : delta;
}
