import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getReciter, RECITATION_HOST, type ReciterId } from '@/data/reciters';
import { recitationQueue, recitationUrl, type RecitationItem } from '@/domain/quran/recitation';
import type { SurahInfo } from '@/domain/quran/types';
import { SURAHS } from '@/services/quranRepository';
import { RecitationPlayer, type RecitationState } from '@/services/recitationPlayer';

function sourceFor(reciterId: ReciterId): (item: RecitationItem) => string {
  const reciter = getReciter(reciterId);
  return (item) =>
    recitationUrl({ host: RECITATION_HOST, edition: reciter.edition, bitrate: reciter.bitrate }, item, SURAHS);
}

export interface Recitation {
  state: RecitationState;
  /** The ayah of this surah being recited (1 during the opening basmalah), or null. */
  ayah: number | null;
  playFrom(ayah: number): void;
  pause(): void;
  resume(): void;
  stop(): void;
  next(): void;
  previous(): void;
}

/**
 * Listening to one surah. Playback belongs to the reader screen: it stops
 * when the screen is left, and restarts the current ayah if the reciter changes.
 */
export function useRecitation(surah: SurahInfo, reciterId: ReciterId): Recitation {
  const [player] = useState(() => new RecitationPlayer(sourceFor(reciterId)));
  const state = useSyncExternalStore(player.subscribe, player.getState, player.getState);

  useEffect(() => () => player.stop(), [player]);

  useEffect(() => {
    player.setSource(sourceFor(reciterId));
  }, [player, reciterId]);

  const playFrom = useCallback((ayah: number) => player.play(recitationQueue(surah, ayah)), [player, surah]);
  const pause = useCallback(() => player.pause(), [player]);
  const resume = useCallback(() => player.resume(), [player]);
  const stop = useCallback(() => player.stop(), [player]);
  const next = useCallback(() => player.next(), [player]);
  const previous = useCallback(() => player.previous(), [player]);

  const ayah = state.item ? (state.item.basmalah ? 1 : state.item.ayah) : null;
  return { state, ayah, playFrom, pause, resume, stop, next, previous };
}
