/**
 * Where a recitation is streamed from. A recording is one audio file per
 * surah, so the same reciter is heard from the first ayah to the last.
 */
export interface RecitationSource {
  host: string;
  /** The recording's folder on the host, e.g. "mahmoud-husary/r1". */
  folder: string;
}

/** Address of one surah's audio. Files are named 001.mp3 to 114.mp3. */
export function recitationUrl(source: RecitationSource, surah: number): string {
  return `${source.host}/audio/${source.folder}/${String(surah).padStart(3, '0')}.mp3`;
}

/**
 * When each ayah is recited within its surah's recording, in milliseconds:
 * the start of every ayah in order, followed by the end of the last one.
 * Whatever comes before the first ayah (the isti'adhah, and the basmalah of
 * surahs that open with one) is the lead-in.
 */
export type SurahTimings = readonly number[];

export function isValidTimings(value: unknown, ayahs: number): value is SurahTimings {
  return (
    Array.isArray(value) &&
    value.length === ayahs + 1 &&
    value.every((time, index) => Number.isInteger(time) && time >= 0 && (index === 0 || time > value[index - 1]))
  );
}

/**
 * Where to start playing, in seconds, to hear `ayah` from its beginning.
 * The first ayah starts with the recording, so that its lead-in is heard too.
 */
export function ayahStartSeconds(timings: SurahTimings, ayah: number): number {
  const count = timings.length - 1;
  const index = Math.min(Math.max(1, Math.trunc(ayah) || 1), count) - 1;
  return index === 0 ? 0 : timings[index]! / 1000;
}

export interface RecitationPosition {
  /** The ayah being recited (1 during the lead-in). */
  ayah: number;
  /** True before the first ayah begins. */
  leadIn: boolean;
}

/** Which ayah is being recited `seconds` into the recording. */
export function positionAt(timings: SurahTimings, seconds: number): RecitationPosition {
  const time = seconds * 1000;
  const count = timings.length - 1;
  if (time < timings[0]!) return { ayah: 1, leadIn: true };
  // The last ayah whose start is at or before `time`.
  let low = 0;
  let high = count - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (timings[middle]! <= time) low = middle;
    else high = middle - 1;
  }
  return { ayah: low + 1, leadIn: false };
}
