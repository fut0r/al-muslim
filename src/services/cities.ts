import type { Coordinates } from '@/domain/prayer/types';
import { normalizeArabic } from '@/domain/quran/search';
import { assetUrl } from './platform';

export interface City extends Coordinates {
  name: string;
  nameAr?: string;
  countryCode: string;
  timeZone: string;
}

type CityRow = [name: string, country: string, lat: number, lng: number, tz: number, nameAr?: string];

interface CitiesFile {
  timeZones: string[];
  cities: CityRow[];
}

let cache: Promise<City[]> | null = null;

/** The bundled city list. It ships with the app, so lookups work offline. */
export function loadCities(): Promise<City[]> {
  cache ??= fetch(assetUrl('data/cities.json'))
    .then((response) => {
      if (!response.ok) throw new Error(`cities: HTTP ${response.status}`);
      return response.json() as Promise<CitiesFile>;
    })
    .then((file) => {
      if (!Array.isArray(file?.cities) || !Array.isArray(file?.timeZones)) throw new Error('cities: bad format');
      const cities: City[] = [];
      for (const row of file.cities) {
        const [name, countryCode, latitude, longitude, tz, nameAr] = row;
        const timeZone = file.timeZones[tz];
        if (typeof name !== 'string' || typeof timeZone !== 'string') continue;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
        cities.push({ name, nameAr, countryCode, latitude, longitude, timeZone });
      }
      return cities;
    })
    .catch((error: unknown) => {
      cache = null; // Allow a retry.
      throw error;
    });
  return cache;
}

const foldLatin = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Cities whose name starts with (preferred) or contains the query. */
export function searchCities(cities: readonly City[], query: string, limit = 40): City[] {
  const latin = foldLatin(query);
  const arabic = normalizeArabic(query);
  if (latin.length < 2 && arabic.length < 2) return [];

  const starts: City[] = [];
  const contains: City[] = [];
  for (const city of cities) {
    const name = foldLatin(city.name);
    const nameAr = city.nameAr ? normalizeArabic(city.nameAr) : '';
    const latinStarts = latin.length >= 2 && name.startsWith(latin);
    const arabicStarts = arabic.length >= 2 && nameAr.startsWith(arabic);
    if (latinStarts || arabicStarts) {
      starts.push(city);
    } else if (
      (latin.length >= 2 && name.includes(latin)) ||
      (arabic.length >= 2 && nameAr !== '' && nameAr.includes(arabic))
    ) {
      contains.push(city);
    }
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

function distanceKm(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The closest known city, used to label a GPS position without a network lookup. */
export function nearestCity(cities: readonly City[], position: Coordinates, maxKm = 100): City | undefined {
  let best: City | undefined;
  let bestDistance = maxKm;
  for (const city of cities) {
    if (Math.abs(city.latitude - position.latitude) > 2) continue;
    const distance = distanceKm(position, city);
    if (distance < bestDistance) {
      best = city;
      bestDistance = distance;
    }
  }
  return best;
}

export function countryName(code: string | undefined, language: string): string | undefined {
  if (!code) return undefined;
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
