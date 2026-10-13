import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { Coordinates } from '@/domain/prayer/types';
import { headingFromOrientation, type CompassAccuracy } from '@/domain/qibla';

/** One reading of the compass. */
export interface CompassReading {
  /** Direction the top of the screen points, clockwise from magnetic north. */
  heading: number;
  /** How much the sensor itself trusts the reading; "unknown" where it does not say. */
  accuracy: CompassAccuracy;
  /** How far the screen is from lying flat, in degrees, or null where that is not known. */
  tilt: number | null;
}

export interface CompassHandlers {
  onReading(reading: CompassReading): void;
  /**
   * Called when the device reports no usable heading: at once if it is known
   * to have no compass, otherwise after a few seconds of silence. Readings may
   * still follow, since some sensors are slow to wake.
   */
  onUnavailable(): void;
}

// --- Android: android/.../compass/CompassPlugin.java --------------------------
// The app reads the sensors itself there: it knows whether the phone has a
// compass at all, and how accurate the magnetometer says it is.

interface NativeCompass {
  start(): Promise<{ available: boolean }>;
  stop(): Promise<void>;
  addListener(
    event: 'heading',
    listener: (event: { heading: number; tilt: number; accuracy: number }) => void,
  ): Promise<PluginListenerHandle>;
}

const Compass = registerPlugin<NativeCompass>('Compass');

/** Android's sensor accuracy levels: 3 high, 2 medium, 1 low, 0 unreliable. */
function accuracyFromLevel(level: number): CompassAccuracy {
  if (level >= 3) return 'high';
  if (level === 2) return 'medium';
  if (level === 0 || level === 1) return 'low';
  return 'unknown';
}

function startNativeCompass(handlers: CompassHandlers): () => void {
  let stopped = false;
  let stopFallback: (() => void) | null = null;

  const listening = Compass.addListener('heading', (event) => {
    if (stopped || !Number.isFinite(event.heading)) return;
    handlers.onReading({
      heading: event.heading,
      accuracy: accuracyFromLevel(event.accuracy),
      tilt: Number.isFinite(event.tilt) ? event.tilt : null,
    });
  });

  Compass.start().then(
    ({ available }) => {
      if (!stopped && !available) handlers.onUnavailable();
    },
    () => {
      // The native side could not be reached: use what the web view offers.
      if (!stopped) stopFallback = startWebCompass(handlers);
    },
  );

  return () => {
    stopped = true;
    stopFallback?.();
    void Compass.stop().catch(() => undefined);
    void listening.then((handle) => handle.remove()).catch(() => undefined);
  };
}

// --- Browsers: device orientation events ----------------------------------------

interface CompassEvent extends DeviceOrientationEvent {
  /** Safari: heading in degrees clockwise from magnetic north. */
  webkitCompassHeading?: number;
}

type PermissionRequester = { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Whether orientation data has to be asked for first. Safari on iOS only hands
 * it out after a request made from a tap; other browsers that offer the same
 * request grant it without asking anyone.
 */
export function compassNeedsPermission(): boolean {
  return (
    Capacitor.getPlatform() !== 'android' &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as PermissionRequester).requestPermission === 'function'
  );
}

/**
 * Asks for orientation data. Called from a tap it shows Safari's prompt. Called
 * without one it still succeeds where the browser needs no consent, and is
 * refused quietly where a tap is required.
 */
export async function requestCompassPermission(): Promise<boolean> {
  try {
    const request = (DeviceOrientationEvent as unknown as PermissionRequester).requestPermission;
    return request ? (await request()) === 'granted' : true;
  } catch {
    return false;
  }
}

function screenAngle(): number {
  try {
    return window.screen.orientation?.angle ?? 0;
  } catch {
    return 0;
  }
}

function readingFromEvent(event: CompassEvent): CompassReading | null {
  const tilt =
    typeof event.beta === 'number' && typeof event.gamma === 'number'
      ? Math.max(Math.abs(event.beta), Math.abs(event.gamma))
      : null;
  if (typeof event.webkitCompassHeading === 'number' && !Number.isNaN(event.webkitCompassHeading)) {
    return { heading: headingFromOrientation(360 - event.webkitCompassHeading, screenAngle()), accuracy: 'unknown', tilt };
  }
  // Only an absolute orientation is tied to north. A relative one has an
  // arbitrary zero and would produce a confident but wrong compass.
  if (event.absolute && typeof event.alpha === 'number') {
    return { heading: headingFromOrientation(event.alpha, screenAngle()), accuracy: 'unknown', tilt };
  }
  return null;
}

const SENSOR_TIMEOUT_MS = 3500;

function startWebCompass(handlers: CompassHandlers): () => void {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
    handlers.onUnavailable();
    return () => undefined;
  }

  let received = false;
  const listener = (event: Event) => {
    const reading = readingFromEvent(event as CompassEvent);
    if (reading === null) return;
    received = true;
    handlers.onReading(reading);
  };

  // Chromium exposes north-referenced data on an event of its own; Safari and
  // Firefox put it on the ordinary one. Listening to both costs nothing, and
  // events without a north reference are ignored.
  window.addEventListener('deviceorientationabsolute', listener);
  window.addEventListener('deviceorientation', listener);

  // Say so if nothing arrives, but keep listening: a slow sensor still gets its chance.
  const timeout = window.setTimeout(() => {
    if (!received) handlers.onUnavailable();
  }, SENSOR_TIMEOUT_MS);

  return () => {
    window.clearTimeout(timeout);
    window.removeEventListener('deviceorientationabsolute', listener);
    window.removeEventListener('deviceorientation', listener);
  };
}

/** Starts reading the compass. Returns a function that stops it. */
export function startCompass(handlers: CompassHandlers): () => void {
  return Capacitor.getPlatform() === 'android' ? startNativeCompass(handlers) : startWebCompass(handlers);
}

/**
 * Magnetic declination (degrees east of true north) at a place, from the
 * World Magnetic Model. A compass points to magnetic north; adding this
 * converts its heading to true north, which the qiblah bearing is based on.
 */
export async function magneticDeclination({ latitude, longitude }: Coordinates): Promise<number> {
  const { default: geomagnetism } = await import('geomagnetism');
  const declination = geomagnetism.model(new Date(), { allowOutOfBoundsModel: true }).point([
    latitude,
    longitude,
  ]).decl;
  if (!Number.isFinite(declination)) throw new Error('declination unavailable');
  return declination;
}
