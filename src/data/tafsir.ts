/**
 * Al-Mukhtasar, the brief tafsir published by the Tafsir Center.
 * The text itself lives in public/data/tafsir and is loaded per surah.
 * It is shown as published: nothing here rewrites it.
 */
export const TAFSIR = {
  url: 'https://tafsir.net/',
  name: { ar: 'المختصر في التفسير', en: 'Al-Mukhtasar' },
  publisher: {
    ar: 'مركز تفسير للدراسات القرآنية',
    en: 'Tafsir Center for Quranic Studies',
  },
} as const;

export const TAFSIR_LANGUAGES = ['ar', 'en'] as const;
export type TafsirLanguage = (typeof TAFSIR_LANGUAGES)[number];
