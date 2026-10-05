import { assetUrl, isNative } from './platform';

const ADHAN_PATH = 'audio/adhan.mp3';
const CACHE_NAME = 'al-muslim-audio';

export interface AdhanState {
  playing: boolean;
  /** What the adhan is for, e.g. the prayer name. Empty for a preview. */
  label: string;
}

let state: AdhanState = { playing: false, label: '' };
let audio: HTMLAudioElement | null = null;
let source: Promise<string> | null = null;
const listeners = new Set<() => void>();

function setState(next: AdhanState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/**
 * Where to play the adhan from. In the browser the file is kept in Cache
 * Storage and played from memory, so it also works offline; the native app
 * ships the file in its package.
 */
function resolveSource(): Promise<string> {
  const url = assetUrl(ADHAN_PATH);
  if (isNative || typeof caches === 'undefined') return Promise.resolve(url);
  source ??= (async () => {
    const cache = await caches.open(CACHE_NAME);
    let response = await cache.match(url);
    if (!response) {
      await cache.add(url);
      response = await cache.match(url);
    }
    if (!response) return url;
    return URL.createObjectURL(await response.blob());
  })().catch(() => {
    source = null; // Offline before the first download: try the network path, and retry next time.
    return url;
  });
  return source;
}

/** Downloads the adhan ahead of time so it can play later without a connection. */
export function prepareAdhan(): void {
  void resolveSource();
}

export const adhanPlayer = {
  getState: (): AdhanState => state,

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Plays the adhan. Resolves to false when playback could not start, which
   * browsers do for sound that was not triggered by the user.
   */
  async play(label = ''): Promise<boolean> {
    try {
      audio ??= new Audio();
      audio.onended = () => setState({ playing: false, label: '' });
      audio.onerror = () => setState({ playing: false, label: '' });
      audio.src = await resolveSource();
      audio.currentTime = 0;
      await audio.play();
      setState({ playing: true, label });
      return true;
    } catch {
      setState({ playing: false, label: '' });
      return false;
    }
  },

  stop(): void {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (state.playing) setState({ playing: false, label: '' });
  },
};
