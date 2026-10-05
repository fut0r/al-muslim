import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { assetUrl } from './platform';

/** What is being recited, as the system's media controls show it. */
export interface NowPlaying {
  /** The surah and the ayah. */
  title: string;
  /** The reciter. */
  artist: string;
  album: string;
  playing: boolean;
  /** Waiting for audio: shown as playing, without the clock running. */
  loading: boolean;
  /** Seconds into the recording, and its length once that is known. */
  position: number;
  duration: number | null;
  hasNext: boolean;
}

/** Texts the system shows or reads out, in the app's language. */
export interface MediaControlLabels {
  /** Name of the notification category in the system settings. */
  channel: string;
  play: string;
  pause: string;
  next: string;
  previous: string;
  stop: string;
}

/** What the buttons outside the app do. */
export interface MediaControlHandlers {
  play(): void;
  pause(): void;
  next(): void;
  previous(): void;
  stop(): void;
  seek(seconds: number): void;
}

interface MediaControls {
  /** Routes the controls pressed outside the app to the player. Returns a function that disconnects them. */
  connect(handlers: MediaControlHandlers): () => void;
  /** Shows or refreshes what is playing. */
  show(now: NowPlaying, labels: MediaControlLabels): void;
  /** Nothing is playing any more. */
  clear(): void;
}

// --- Android: android/.../media/RecitationSessionPlugin.java ----------------
// A media playback service keeps the app alive in the background and shows a
// media notification with lock screen and headset controls.

interface RecitationSessionPlugin {
  update(options: {
    title: string;
    artist: string;
    album: string;
    playing: boolean;
    loading: boolean;
    position: number;
    duration: number;
    hasNext: boolean;
    channelName: string;
    labelPlay: string;
    labelPause: string;
    labelNext: string;
    labelPrevious: string;
    labelStop: string;
  }): Promise<void>;
  stop(): Promise<void>;
  addListener(
    event: 'control',
    listener: (event: { control: string; position: number }) => void,
  ): Promise<PluginListenerHandle>;
}

const RecitationSession = registerPlugin<RecitationSessionPlugin>('RecitationSession');

const androidControls: MediaControls = {
  connect(handlers) {
    const listening = RecitationSession.addListener('control', ({ control, position }) => {
      if (control === 'play') handlers.play();
      else if (control === 'pause') handlers.pause();
      else if (control === 'next') handlers.next();
      else if (control === 'previous') handlers.previous();
      else if (control === 'stop') handlers.stop();
      else if (control === 'seek') handlers.seek(position);
    });
    return () => {
      void listening.then((handle) => handle.remove()).catch(() => undefined);
    };
  },

  show(now, labels) {
    // The controls are an extra: failing to show them must never stop the recitation.
    void RecitationSession.update({
      title: now.title,
      artist: now.artist,
      album: now.album,
      playing: now.playing,
      loading: now.loading,
      position: now.position,
      duration: now.duration ?? 0,
      hasNext: now.hasNext,
      channelName: labels.channel,
      labelPlay: labels.play,
      labelPause: labels.pause,
      labelNext: labels.next,
      labelPrevious: labels.previous,
      labelStop: labels.stop,
    }).catch(() => undefined);
  },

  clear() {
    void RecitationSession.stop().catch(() => undefined);
  },
};

// --- Browsers: the standard Media Session API --------------------------------
// The browser shows its own media notification and handles the media keys.

const WEB_ACTIONS = ['play', 'pause', 'nexttrack', 'previoustrack', 'stop', 'seekto'] as const;

const webControls: MediaControls = {
  connect(handlers) {
    const session = navigator.mediaSession;
    const actions: Record<(typeof WEB_ACTIONS)[number], MediaSessionActionHandler> = {
      play: handlers.play,
      pause: handlers.pause,
      nexttrack: handlers.next,
      previoustrack: handlers.previous,
      stop: handlers.stop,
      seekto: (details) => {
        if (typeof details.seekTime === 'number') handlers.seek(details.seekTime);
      },
    };
    for (const action of WEB_ACTIONS) {
      try {
        session.setActionHandler(action, actions[action]);
      } catch {
        // This browser does not offer the action.
      }
    }
    return () => {
      for (const action of WEB_ACTIONS) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // Never set.
        }
      }
    };
  },

  show(now) {
    const session = navigator.mediaSession;
    try {
      session.metadata = new MediaMetadata({
        title: now.title,
        artist: now.artist,
        album: now.album,
        artwork: [
          { src: assetUrl('icons/icon-192.png'), sizes: '192x192', type: 'image/png' },
          { src: assetUrl('icons/icon-512.png'), sizes: '512x512', type: 'image/png' },
        ],
      });
      session.playbackState = now.playing || now.loading ? 'playing' : 'paused';
      if (now.duration !== null && now.position <= now.duration) {
        session.setPositionState({ duration: now.duration, position: now.position, playbackRate: 1 });
      }
    } catch {
      // Older browsers implement only part of the API; the audio is unaffected.
    }
  },

  clear() {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    } catch {
      // Nothing to clear.
    }
  },
};

const noControls: MediaControls = { connect: () => () => undefined, show: () => undefined, clear: () => undefined };

/**
 * The system's media controls for a recitation: the notification with the
 * surah, ayah and reciter, the lock screen and headset buttons, and, on
 * Android, what keeps the recitation playing once the app is left.
 */
export const mediaControls: MediaControls =
  Capacitor.getPlatform() === 'android'
    ? androidControls
    : typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof MediaMetadata !== 'undefined'
      ? webControls
      : noControls;
