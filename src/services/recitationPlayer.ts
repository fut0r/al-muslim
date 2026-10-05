import type { RecitationItem } from '@/domain/quran/recitation';

export type RecitationStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface RecitationState {
  status: RecitationStatus;
  /** What is being recited, or null when nothing is. */
  item: RecitationItem | null;
  /** Why playback stopped, when status is "error". */
  error: 'offline' | 'failed' | null;
}

const IDLE: RecitationState = { status: 'idle', item: null, error: null };

/**
 * Plays a queue of ayahs one after another.
 *
 * Audio is streamed, so this is the one part of the app that needs a
 * connection; every failure ends in a clear state the screen can explain.
 */
export class RecitationPlayer {
  private audio: HTMLAudioElement | null = null;
  private preloader: HTMLAudioElement | null = null;
  private queue: RecitationItem[] = [];
  private index = 0;
  private state: RecitationState = IDLE;
  private readonly listeners = new Set<() => void>();
  private urlFor: (item: RecitationItem) => string;

  constructor(urlFor: (item: RecitationItem) => string) {
    this.urlFor = urlFor;
  }

  getState = (): RecitationState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Starts reciting `queue` from its first item. */
  play(queue: RecitationItem[]): void {
    if (queue.length === 0) return;
    this.queue = queue;
    this.load(0);
  }

  pause(): void {
    this.audio?.pause();
  }

  resume(): void {
    if (this.state.status === 'error') this.load(this.index);
    else void this.audio?.play().catch(() => this.fail());
  }

  next(): void {
    if (this.index < this.queue.length - 1) this.load(this.index + 1);
  }

  previous(): void {
    // Skip back over the basmalah item, which has no ayah of its own.
    if (this.index > 0) this.load(this.index - 1);
    else this.load(0);
  }

  get hasNext(): boolean {
    return this.index < this.queue.length - 1;
  }

  get hasPrevious(): boolean {
    return this.index > 0;
  }

  /** Switches the audio source (another reciter) and restarts the current ayah. */
  setSource(urlFor: (item: RecitationItem) => string): void {
    this.urlFor = urlFor;
    if (this.state.status !== 'idle') this.load(this.index);
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.queue = [];
    this.index = 0;
    this.setState(IDLE);
  }

  private setState(next: RecitationState): void {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  private element(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('playing', () => this.update('playing'));
    audio.addEventListener('waiting', () => this.update('loading'));
    audio.addEventListener('pause', () => {
      // Reaching the end also fires "pause"; "ended" handles that case.
      if (!audio.ended && this.state.status !== 'idle' && this.state.status !== 'error') this.update('paused');
    });
    audio.addEventListener('ended', () => {
      if (this.index < this.queue.length - 1) this.load(this.index + 1);
      else this.stop();
    });
    audio.addEventListener('error', () => this.fail());
    this.audio = audio;
    return audio;
  }

  private update(status: RecitationStatus): void {
    if (this.state.item) this.setState({ status, item: this.state.item, error: null });
  }

  private fail(): void {
    if (this.state.status === 'idle') return;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    this.setState({ status: 'error', item: this.state.item, error: offline ? 'offline' : 'failed' });
  }

  private load(index: number): void {
    const item = this.queue[index];
    if (!item) return;
    this.index = index;
    this.setState({ status: 'loading', item, error: null });

    const audio = this.element();
    audio.src = this.urlFor(item);
    void audio.play().catch(() => this.fail());

    // Fetch the following ayah in the background so there is no gap between them.
    const upcoming = this.queue[index + 1];
    if (upcoming) {
      this.preloader ??= new Audio();
      this.preloader.preload = 'auto';
      this.preloader.src = this.urlFor(upcoming);
    }
  }
}
