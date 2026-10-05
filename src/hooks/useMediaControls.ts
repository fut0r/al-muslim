import { useEffect } from 'react';
import { mediaControls, type MediaControlLabels } from '@/services/mediaControls';
import type { Recitation } from './useRecitation';

export interface NowPlayingInfo {
  /** The surah and ayah being recited. */
  title: string;
  /** The reciter. */
  artist: string;
  album: string;
  hasNext: boolean;
  labels: MediaControlLabels;
}

/**
 * Mirrors a recitation in the system's media controls: the notification with
 * the surah, ayah and reciter, and the buttons on the lock screen and on
 * headsets. On Android this is also what keeps it playing outside the app.
 */
export function useMediaControls(recitation: Recitation, info: NowPlayingInfo): void {
  const { state, resume, pause, next, previous, stop, seekTo, progress } = recitation;
  const active = state.status !== 'idle';
  const { title, artist, album, hasNext, labels } = info;
  const { channel, play, pause: pauseLabel, next: nextLabel, previous: previousLabel, stop: stopLabel } = labels;

  // The buttons outside the app drive the same player as the ones inside it.
  useEffect(() => {
    if (!active) return;
    return mediaControls.connect({ play: resume, pause, next, previous, stop, seek: seekTo });
  }, [active, resume, pause, next, previous, stop, seekTo]);

  // Report every change of state, ayah or reciter; the system counts the seconds in between.
  useEffect(() => {
    if (!active) return;
    mediaControls.show(
      {
        title,
        artist,
        album,
        playing: state.status === 'playing',
        loading: state.status === 'loading',
        ...progress(),
        hasNext,
      },
      { channel, play, pause: pauseLabel, next: nextLabel, previous: previousLabel, stop: stopLabel },
    );
  }, [active, state.status, title, artist, album, hasNext, progress, channel, play, pauseLabel, nextLabel, previousLabel, stopLabel]);

  // Gone when playback stops or the screen is left.
  useEffect(() => {
    if (!active) return;
    return () => mediaControls.clear();
  }, [active]);
}
