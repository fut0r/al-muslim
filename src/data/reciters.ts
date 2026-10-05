/**
 * The reciters offered for listening: three classic Egyptian masters and two
 * contemporary imams, all household names across the Arab world.
 *
 * Audio is the per-ayah recordings published by EveryAyah.com, streamed from
 * the Islamic Network CDN. To add a reciter, add an entry here; no component
 * needs to change.
 */
export const RECITERS = [
  {
    id: 'abdulBasit',
    name: { ar: 'عبد الباسط عبد الصمد', en: 'Abdul Basit Abdus-Samad' },
    detail: { ar: 'مصر · 1927–1988', en: 'Egypt · 1927–1988' },
    edition: 'ar.abdulbasitmurattal',
    bitrate: 64,
  },
  {
    id: 'husary',
    name: { ar: 'محمود خليل الحصري', en: 'Mahmoud Khalil Al-Husary' },
    detail: { ar: 'مصر · 1917–1980', en: 'Egypt · 1917–1980' },
    edition: 'ar.husary',
    bitrate: 64,
  },
  {
    id: 'minshawi',
    name: { ar: 'محمد صديق المنشاوي', en: 'Muhammad Siddiq Al-Minshawi' },
    detail: { ar: 'مصر · 1920–1969', en: 'Egypt · 1920–1969' },
    edition: 'ar.minshawi',
    bitrate: 128,
  },
  {
    id: 'sudais',
    name: { ar: 'عبد الرحمن السديس', en: 'Abdur-Rahman As-Sudais' },
    detail: { ar: 'السعودية · إمام المسجد الحرام', en: 'Saudi Arabia · Imam of Masjid al-Haram' },
    edition: 'ar.abdurrahmaansudais',
    bitrate: 64,
  },
  {
    id: 'alafasy',
    name: { ar: 'مشاري راشد العفاسي', en: 'Mishary Rashid Alafasy' },
    detail: { ar: 'الكويت', en: 'Kuwait' },
    edition: 'ar.alafasy',
    bitrate: 64,
  },
] as const;

export type Reciter = (typeof RECITERS)[number];
export type ReciterId = Reciter['id'];

export const RECITER_IDS = RECITERS.map((reciter) => reciter.id) as readonly ReciterId[];
export const DEFAULT_RECITER: ReciterId = 'husary';

export function getReciter(id: ReciterId): Reciter {
  return RECITERS.find((reciter) => reciter.id === id) ?? RECITERS[0];
}

/** The one host recitation audio is streamed from. It must match the CSP in index.html. */
export const RECITATION_HOST = 'https://cdn.islamic.network';
