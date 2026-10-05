import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReciterId } from '@/data/reciters';
import { RecitationPlayer, type RecitationState } from '@/services/recitationPlayer';
import { loadRecitation } from '@/services/recitationRepository';

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
  /** Moves to a moment in the recording, in seconds. */
  seekTo(seconds: number): void;
  /** Where the audio is, in seconds, and how long the recording is once that is known. */
  progress(): { position: number; duration: number | null };
}

/**
 * Listening to one surah. Playback belongs to the reader screen: it stops
 * when the screen is left, and carries on from the current ayah in the new
 * voice if the reciter changes.
 */
export function useRecitation(surahId: number, reciterId: ReciterId): Recitation {
  const [player] = useState(() => new RecitationPlayer());
  const state = useSyncExternalStore(player.subscribe, player.getState, player.getState);

  useEffect(() => () => player.stop(), [player]);

  // Does nothing unless something is playing.
  useEffect(() => {
    player.changeSource(() => loadRecitation(reciterId, surahId));
  }, [player, reciterId, surahId]);

  const playFrom = useCallback(
    (ayah: number) => player.play(() => loadRecitation(reciterId, surahId), ayah),
    [player, reciterId, surahId],
  );
  const pause = useCallback(() => player.pause(), [player]);
  const resume = useCallback(() => player.resume(), [player]);
  const stop = useCallback(() => player.stop(), [player]);
  const next = useCallback(() => player.next(), [player]);
  const previous = useCallback(() => player.previous(), [player]);
  const seekTo = useCallback((seconds: number) => player.seekTo(seconds), [player]);
  const progress = useCallback(() => player.getProgress(), [player]);

  return { state, ayah: state.ayah, playFrom, pause, resume, stop, next, previous, seekTo, progress };
}
