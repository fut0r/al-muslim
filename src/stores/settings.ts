import { DEFAULT_RECITER, RECITER_IDS, type ReciterId } from '@/data/reciters';
import {
  DEFAULT_CALCULATION_METHOD,
  isCalculationMethodId,
  type CalculationMethodId,
} from '@/domain/prayer/methods';
import { MADHABS, OBLIGATORY_PRAYER_IDS, type Madhab, type ObligatoryPrayerId } from '@/domain/prayer/types';
import { asBoolean, asNumberInRange, asRecord, createPersistentStore, oneOf, useStore } from './createStore';

export const THEME_PREFERENCES = ['system', 'light', 'dark', 'amoled'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const LANGUAGES = ['en', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];

export const NOTIFICATION_SOUNDS = ['adhan', 'default'] as const;
export type NotificationSound = (typeof NOTIFICATION_SOUNDS)[number];

export const HIJRI_ADJUSTMENT_RANGE = { min: -2, max: 2 } as const;
export const QURAN_FONT_SCALE = { min: 0.8, max: 1.8, step: 0.1, default: 1 } as const;

export interface Settings {
  theme: ThemePreference;
  language: Language;
  method: CalculationMethodId;
  madhab: Madhab;
  hour12: boolean;
  notifications: {
    enabled: boolean;
    prayers: Record<ObligatoryPrayerId, boolean>;
    /** The adhan, or the device's ordinary notification sound. */
    sound: NotificationSound;
  };
  haptics: boolean;
  keepAwake: boolean;
  /** Days added to the calculated Hijri date to match a local moon sighting. */
  hijriAdjustment: number;
  quranFontScale: number;
  /** Whose recitation is played when listening to the Quran. */
  reciter: ReciterId;
  onboarded: boolean;
}

function detectLanguage(): Language {
  try {
    const preferred = navigator.languages?.[0] ?? navigator.language ?? '';
    return preferred.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

function detectHour12(): boolean {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? true;
  } catch {
    return true;
  }
}

export function sanitizeSettings(raw: unknown): Settings {
  const data = asRecord(raw);
  const notifications = asRecord(data.notifications);
  const prayers = asRecord(notifications.prayers);

  return {
    theme: oneOf(data.theme, THEME_PREFERENCES, 'system'),
    language: oneOf(data.language, LANGUAGES, detectLanguage()),
    method: isCalculationMethodId(data.method) ? data.method : DEFAULT_CALCULATION_METHOD,
    madhab: oneOf(data.madhab, MADHABS, 'shafi'),
    hour12: asBoolean(data.hour12, detectHour12()),
    notifications: {
      enabled: asBoolean(notifications.enabled, false),
      prayers: Object.fromEntries(
        OBLIGATORY_PRAYER_IDS.map((id) => [id, asBoolean(prayers[id], true)]),
      ) as Record<ObligatoryPrayerId, boolean>,
      sound: oneOf(notifications.sound, NOTIFICATION_SOUNDS, 'adhan'),
    },
    haptics: asBoolean(data.haptics, true),
    keepAwake: asBoolean(data.keepAwake, false),
    hijriAdjustment: Math.round(
      asNumberInRange(data.hijriAdjustment, HIJRI_ADJUSTMENT_RANGE.min, HIJRI_ADJUSTMENT_RANGE.max, 0),
    ),
    quranFontScale: asNumberInRange(
      data.quranFontScale,
      QURAN_FONT_SCALE.min,
      QURAN_FONT_SCALE.max,
      QURAN_FONT_SCALE.default,
    ),
    reciter: oneOf(data.reciter, RECITER_IDS, DEFAULT_RECITER),
    onboarded: asBoolean(data.onboarded, false),
  };
}

export const settingsStore = createPersistentStore<Settings>('settings', sanitizeSettings);

export function useSettings(): Settings {
  return useStore(settingsStore);
}

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((previous) => ({ ...previous, ...patch }));
}

export function updateNotificationSettings(patch: Partial<Settings['notifications']>): void {
  settingsStore.set((previous) => ({
    ...previous,
    notifications: { ...previous.notifications, ...patch },
  }));
}
