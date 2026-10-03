import { useCallback, useState } from 'react';
import type { Coordinates } from '@/domain/prayer/types';
import { loadCities, nearestCity, type City } from '@/services/cities';
import { requestCurrentPosition, type LocationFailure } from '@/services/geolocation';
import { locationStore, type SavedLocation } from '@/stores/location';

/** Labels a position with the nearest bundled city. No network lookup is made. */
async function describe(coordinates: Coordinates): Promise<Partial<SavedLocation>> {
  try {
    const city = nearestCity(await loadCities(), coordinates);
    return city ? { name: city.name, nameAr: city.nameAr, countryCode: city.countryCode } : {};
  } catch {
    return {}; // The coordinates alone are enough to calculate prayer times.
  }
}

/** Reads the device position and saves it. Resolves to the failure reason, or null on success. */
export async function saveDeviceLocation(): Promise<LocationFailure | null> {
  const result = await requestCurrentPosition();
  if (!result.ok) return result.reason;
  const label = await describe(result.coordinates);
  locationStore.set({ ...result.coordinates, ...label, source: 'gps', updatedAt: Date.now() });
  return null;
}

export function saveCity(city: City): void {
  locationStore.set({
    latitude: city.latitude,
    longitude: city.longitude,
    name: city.name,
    nameAr: city.nameAr,
    countryCode: city.countryCode,
    timeZone: city.timeZone,
    source: 'city',
    updatedAt: Date.now(),
  });
}

export async function saveCoordinates(coordinates: Coordinates): Promise<void> {
  const label = await describe(coordinates);
  locationStore.set({ ...coordinates, ...label, source: 'manual', updatedAt: Date.now() });
}

export function useDeviceLocation() {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<LocationFailure | null>(null);

  const locate = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setFailure(null);
    const reason = await saveDeviceLocation();
    setFailure(reason);
    setBusy(false);
    return reason === null;
  }, []);

  return { locate, busy, failure, clearFailure: useCallback(() => setFailure(null), []) };
}
