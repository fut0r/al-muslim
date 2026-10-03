import type { Coordinates } from '@/domain/prayer/types';

export type LocationFailure = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export type LocationResult =
  | { ok: true; coordinates: Coordinates }
  | { ok: false; reason: LocationFailure };

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

export function geolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator && window.isSecureContext !== false;
}

/**
 * Asks the device for its position once.
 *
 * City-level accuracy is all prayer times need, so high accuracy (GPS) is not
 * requested: it is faster and easier on the battery. The position is returned
 * to the caller and never leaves the device.
 */
export function requestCurrentPosition(timeoutMs = 20000): Promise<LocationResult> {
  if (!geolocationSupported()) return Promise.resolve({ ok: false, reason: 'unsupported' });

  return new Promise((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            resolve({ ok: true, coordinates: { latitude, longitude } });
          } else {
            resolve({ ok: false, reason: 'unavailable' });
          }
        },
        (error) => {
          const reason: LocationFailure =
            error.code === error.PERMISSION_DENIED
              ? 'denied'
              : error.code === error.TIMEOUT
                ? 'timeout'
                : 'unavailable';
          resolve({ ok: false, reason });
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60 * 1000 },
      );
    } catch {
      resolve({ ok: false, reason: 'unavailable' });
    }
  });
}

/** Current permission without prompting. `unknown` where the browser cannot tell. */
export async function locationPermission(): Promise<LocationPermission> {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
}
