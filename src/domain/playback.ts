import { positionAt, type SurahTimings } from './quran/recitation';

/** In-app loudness for recitation and the adhan. 1 is full, 0 is silent. */
export const PLAYBACK_VOLUME = { min: 0, max: 1, step: 0.1, default: 1 } as const;

/**
 * How many times each ayah is heard before the next one.
 * 1 plays it once. 0 keeps repeating it until you move on.
 */
export const AYAH_REPEAT_OPTIONS = [1, 2, 3, 5, 10, 0] as const;
export type AyahRepeat = (typeof AYAH_REPEAT_OPTIONS)[number];

/**
 * A repeat may begin this early, so the following ayah is not heard.
 * timeupdate alone is too coarse to catch the boundary.
 */
export const REPEAT_LEAD_SECONDS = 0.04;

export function isAyahRepeat(value: unknown): value is AyahRepeat {
  return (AYAH_REPEAT_OPTIONS as readonly unknown[]).includes(value);
}

export function nextAyahRepeat(current: AyahRepeat): AyahRepeat {
  const index = AYAH_REPEAT_OPTIONS.indexOf(current);
  const next = AYAH_REPEAT_OPTIONS[(index + 1) % AYAH_REPEAT_OPTIONS.length];
  return next ?? 1;
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return PLAYBACK_VOLUME.default;
  const steps = Math.round(value / PLAYBACK_VOLUME.step);
  const clamped = Math.min(PLAYBACK_VOLUME.max, Math.max(PLAYBACK_VOLUME.min, steps * PLAYBACK_VOLUME.step));
  return Number(clamped.toFixed(1));
}

export function changeVolume(volume: number, direction: -1 | 1): number {
  return clampVolume(clampVolume(volume) + direction * PLAYBACK_VOLUME.step);
}

/** Seconds at which `ayah` ends: the start of the next one, or the end of the recording. */
export function ayahEndSeconds(timings: SurahTimings, ayah: number): number {
  const count = timings.length - 1;
  const index = Math.min(Math.max(1, Math.trunc(ayah) || 1), count);
  return timings[index]! / 1000;
}

/** Where a repeat of `ayah` begins. Unlike the first play of ayah 1, this skips the lead-in. */
export function ayahBodyStartSeconds(timings: SurahTimings, ayah: number): number {
  const count = timings.length - 1;
  const index = Math.min(Math.max(1, Math.trunc(ayah) || 1), count) - 1;
  return timings[index]! / 1000;
}

/** `take` is how many times this ayah has already been started, counting the current pass. */
export function shouldRepeatAyah(repeat: AyahRepeat, take: number): boolean {
  if (repeat === 1) return false;
  if (repeat === 0) return true;
  return take < repeat;
}

export interface PlaybackStep {
  ayah: number;
  leadIn: boolean;
  /** Set when this ayah should be heard again from its own beginning. */
  repeatAyah: number | null;
  take: number;
}

/**
 * Where the audio is, and whether the ayah under way should play again.
 * `ayah` and `take` describe the pass that is already in progress.
 */
export function stepPlayback(
  timings: SurahTimings,
  ayah: number,
  take: number,
  repeat: AyahRepeat,
  seconds: number,
): PlaybackStep {
  const position = positionAt(timings, seconds);
  const end = ayahEndSeconds(timings, ayah);
  const crossed = seconds + REPEAT_LEAD_SECONDS >= end || position.ayah > ayah;
  if (!crossed) return { ayah: position.ayah, leadIn: position.leadIn, repeatAyah: null, take };
  if (shouldRepeatAyah(repeat, take)) return { ayah, leadIn: false, repeatAyah: ayah, take: take + 1 };
  return {
    ayah: position.ayah,
    leadIn: position.leadIn,
    repeatAyah: null,
    take: position.ayah === ayah ? take : 1,
  };
}
