import { ayahStartSeconds, positionAt, type SurahTimings } from '@/domain/quran/recitation';

export type RecitationStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface RecitationState {
  status: RecitationStatus;
  /** The ayah being recited, or null when nothing is. */
  ayah: number | null;
  /** True while the recording is still before the first ayah (isti'adhah and basmalah). */
  leadIn: boolean;
  /** Why playback stopped, when status is "error". */
  error: 'offline' | 'failed' | null;
}

/** One surah's recording by one reciter, with the moment each ayah begins. */
export interface RecitationTrack {
  url: string;
  timings: SurahTimings;
}

const IDLE: RecitationState = { status: 'idle', ayah: null, leadIn: false, error: null };

/**
 * Plays one surah's recording and follows it ayah by ayah.
 *
 * The audio is a single stream per surah; ayah timings turn the playback
 * position into the ayah on screen, and an ayah into a place to seek to.
 * Streaming is the one part of the app that needs a connection, and every
 * failure ends in a clear state the screen can explain.
 */
export class RecitationPlayer {
  private audio: HTMLAudioElement | null = null;
  private track: RecitationTrack | null = null;
  /** The address the audio element currently holds, so the same recording is not fetched twice. */
  private loadedUrl: string | null = null;
  private loadTrack: (() => Promise<RecitationTrack>) | null = null;
  /** Where to seek once the audio is ready to, in seconds; null when no seek is waiting. */
  private pendingSeek: number | null = null;
  /** Identifies the latest request, so a slow answer to an older one is ignored. */
  private request = 0;
  private state: RecitationState = IDLE;
  private readonly listeners = new Set<() => void>();

  getState = (): RecitationState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Starts reciting from `ayah`. `load` provides the recording; it may need to fetch the timings. */
  play(load: () => Promise<RecitationTrack>, ayah: number): void {
    const request = (this.request += 1);
    this.loadTrack = load;
    // Whatever is still playing no longer says which ayah is current.
    this.track = null;
    this.setState({ status: 'loading', ayah, leadIn: false, error: null });
    load().then(
      (track) => {
        if (request === this.request) this.start(track, ayah);
      },
      () => {
        if (request === this.request) this.fail();
      },
    );
  }

  pause(): void {
    this.audio?.pause();
  }

  resume(): void {
    if (this.state.status === 'error' || !this.track) {
      // Start over from the ayah that was reached.
      if (this.loadTrack && this.state.ayah !== null) this.play(this.loadTrack, this.state.ayah);
      return;
    }
    this.begin();
  }

  next(): void {
    const ayah = this.state.ayah ?? 0;
    if (this.track && ayah < this.track.timings.length - 1) this.seekToAyah(ayah + 1);
  }

  previous(): void {
    this.seekToAyah((this.state.ayah ?? 2) - 1);
  }

  /** Moves to a moment in the recording, in seconds: the seek bar of the system's media controls. */
  seekTo(seconds: number): void {
    const track = this.track;
    if (!track || this.state.status === 'idle' || !Number.isFinite(seconds)) return;
    this.pendingSeek = Math.max(0, seconds);
    const position = positionAt(track.timings, this.pendingSeek);
    this.setState({ ...this.state, ayah: position.ayah, leadIn: position.leadIn, error: null });
    this.applySeek();
  }

  /** Where the audio is, in seconds, and how long the recording is once that is known. */
  getProgress(): { position: number; duration: number | null } {
    const audio = this.audio;
    const track = this.track;
    if (!audio || !track) return { position: 0, duration: null };
    const known = Number.isFinite(audio.duration) && audio.duration > 0;
    return {
      position: this.pendingSeek ?? audio.currentTime,
      // Until the audio says, the end of the last ayah is close enough.
      duration: known ? audio.duration : track.timings[track.timings.length - 1]! / 1000,
    };
  }

  /** Switches to another recording of the same surah and carries on from the current ayah. */
  changeSource(load: () => Promise<RecitationTrack>): void {
    if (this.state.status === 'idle' || this.state.ayah === null) return;
    this.play(load, this.state.ayah);
  }

  stop(): void {
    this.request += 1;
    this.pendingSeek = null;
    this.track = null;
    this.loadTrack = null;
    this.loadedUrl = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.setState(IDLE);
  }

  private setState(next: RecitationState): void {
    const previous = this.state;
    if (
      previous.status === next.status &&
      previous.ayah === next.ayah &&
      previous.leadIn === next.leadIn &&
      previous.error === next.error
    ) {
      return;
    }
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  private update(status: RecitationStatus): void {
    if (this.state.status !== 'idle') this.setState({ ...this.state, status, error: null });
  }

  private element(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('loadedmetadata', () => this.applySeek());
    audio.addEventListener('timeupdate', () => this.follow());
    audio.addEventListener('seeked', () => this.follow());
    audio.addEventListener('playing', () => this.update('playing'));
    audio.addEventListener('waiting', () => this.update('loading'));
    audio.addEventListener('pause', () => {
      // Reaching the end also fires "pause"; "ended" handles that case.
      if (!audio.ended && this.state.status !== 'idle' && this.state.status !== 'error') this.update('paused');
    });
    audio.addEventListener('ended', () => this.stop());
    audio.addEventListener('error', () => this.fail());
    this.audio = audio;
    return audio;
  }

  private start(track: RecitationTrack, ayah: number): void {
    const count = track.timings.length - 1;
    const target = Math.min(Math.max(1, ayah), count);
    this.track = track;
    this.pendingSeek = ayahStartSeconds(track.timings, target);
    this.setState({ status: 'loading', ayah: target, leadIn: this.pendingSeek < track.timings[0]! / 1000, error: null });

    const audio = this.element();
    if (this.loadedUrl !== track.url) {
      audio.src = track.url;
      this.loadedUrl = track.url;
    }
    this.applySeek();
    this.begin();
  }

  private seekToAyah(ayah: number): void {
    const track = this.track;
    if (!track || this.state.status === 'idle') return;
    const count = track.timings.length - 1;
    const target = Math.min(Math.max(1, ayah), count);
    this.pendingSeek = ayahStartSeconds(track.timings, target);
    this.setState({ ...this.state, status: 'loading', ayah: target, leadIn: this.pendingSeek < track.timings[0]! / 1000, error: null });
    this.applySeek();
    this.begin();
  }

  /** Moves the audio to the waiting position. Before the audio's details have loaded it has to wait. */
  private applySeek(): void {
    const audio = this.audio;
    if (!audio || this.pendingSeek === null || audio.readyState < HTMLMediaElement.HAVE_METADATA) return;
    const target = this.pendingSeek;
    this.pendingSeek = null;
    if (Math.abs(audio.currentTime - target) > 0.05) audio.currentTime = target;
  }

  private begin(): void {
    const request = this.request;
    void this.element()
      .play()
      .catch((error: unknown) => {
        if (request !== this.request || this.state.status === 'idle') return;
        // Replaced by a newer play() or pause(): not a failure.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        // The browser wants a tap first: wait, ready to play, for the play button.
        if (error instanceof DOMException && error.name === 'NotAllowedError') this.update('paused');
        else this.fail();
      });
  }

  /** Keeps the current ayah in step with the audio. */
  private follow(): void {
    const audio = this.audio;
    const track = this.track;
    // While a seek is waiting or under way the position is not yet meaningful.
    if (!audio || !track || this.pendingSeek !== null || audio.seeking || this.state.status === 'idle') return;
    if (this.state.status === 'error') return;
    const position = positionAt(track.timings, audio.currentTime);
    this.setState({ ...this.state, ayah: position.ayah, leadIn: position.leadIn });
  }

  private fail(): void {
    if (this.state.status === 'idle') return;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    this.loadedUrl = null; // Fetch the recording afresh when the user tries again.
    this.setState({ ...this.state, status: 'error', error: offline ? 'offline' : 'failed' });
  }
}
