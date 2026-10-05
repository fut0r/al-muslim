/**
 * The reciters offered for listening: three classic Egyptian masters and
 * four contemporary imams, all household names across the Arab world.
 *
 * Audio is each reciter's own complete murattal recording in the mp3quran.net
 * library, one file per surah. `folder` is that recording's place on the
 * library's CDN and `read` its number in the library's ayah timing data, which
 * scripts/build-recitation-data.mjs turns into public/data/recitation.
 *
 * To add a reciter, add an entry here and run `npm run data:recitation`; no
 * component needs to change.
 */
export const RECITERS = [
  {
    id: 'abdulBasit',
    name: { ar: 'عبد الباسط عبد الصمد', en: 'Abdul Basit Abdus-Samad' },
    detail: { ar: 'مصر · 1927–1988', en: 'Egypt · 1927–1988' },
    folder: 'abdulbasit-abdulsamad/r3',
    read: 53,
  },
  {
    id: 'husary',
    name: { ar: 'محمود خليل الحصري', en: 'Mahmoud Khalil Al-Husary' },
    detail: { ar: 'مصر · 1917–1980', en: 'Egypt · 1917–1980' },
    folder: 'mahmoud-husary/r1',
    read: 118,
  },
  {
    id: 'minshawi',
    name: { ar: 'محمد صديق المنشاوي', en: 'Muhammad Siddiq Al-Minshawi' },
    detail: { ar: 'مصر · 1920–1969', en: 'Egypt · 1920–1969' },
    folder: 'muhammad-minshawi/r1',
    read: 112,
  },
  {
    id: 'sudais',
    name: { ar: 'عبد الرحمن السديس', en: 'Abdur-Rahman As-Sudais' },
    detail: { ar: 'السعودية · إمام المسجد الحرام', en: 'Saudi Arabia · Imam of Masjid al-Haram' },
    folder: 'abdulrahman-sudais/r1',
    read: 54,
  },
  {
    id: 'maher',
    name: { ar: 'ماهر المعيقلي', en: 'Maher Al-Muaiqly' },
    detail: { ar: 'السعودية · إمام المسجد الحرام', en: 'Saudi Arabia · Imam of Masjid al-Haram' },
    folder: 'maher-muaiqly/r3',
    read: 133,
  },
  {
    id: 'ghamdi',
    name: { ar: 'سعد الغامدي', en: 'Saad Al-Ghamdi' },
    detail: { ar: 'السعودية', en: 'Saudi Arabia' },
    folder: 'saad-ghamdi/r1',
    read: 30,
  },
  {
    id: 'alafasy',
    name: { ar: 'مشاري راشد العفاسي', en: 'Mishary Rashid Alafasy' },
    detail: { ar: 'الكويت', en: 'Kuwait' },
    folder: 'mishary-alafasy/r1',
    read: 123,
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
export const RECITATION_HOST = 'https://cdn.mp3quran.net';
