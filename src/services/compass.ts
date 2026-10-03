import type { Coordinates } from '@/domain/prayer/types';
import { normalizeDegrees } from '@/domain/qibla';

interface CompassEvent extends DeviceOrientationEvent {
  /** Safari: heading in degrees clockwise from magnetic north. */
  webkitCompassHeading?: number;
}

type PermissionRequester = { requestPermission?: () => Promise<'granted' | 'denied'> };

/** iOS only hands out orientation data after an explicit, user-initiated request. */
export function compassNeedsPermission(): boolean {
  return (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as PermissionRequester).requestPermission === 'function'
  );
}

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

/** Heading of the top of the screen relative to magnetic north, or null if unknown. */
function headingFromEvent(event: CompassEvent): number | null {
  if (typeof event.webkitCompassHeading === 'number' && !Number.isNaN(event.webkitCompassHeading)) {
    return normalizeDegrees(event.webkitCompassHeading + screenAngle());
  }
  // Only an absolute orientation is tied to north. A relative one has an
  // arbitrary zero and would produce a confident but wrong compass.
  if (event.absolute && typeof event.alpha === 'number') {
    return normalizeDegrees(360 - event.alpha + screenAngle());
  }
  return null;
}

export interface CompassHandlers {
  onHeading(magneticHeading: number): void;
  /** Called once if the device never reports a usable heading. */
  onUnavailable(): void;
}

const SENSOR_TIMEOUT_MS = 3500;

/** Starts listening to the orientation sensor. Returns a function that stops it. */
export function startCompass(handlers: CompassHandlers): () => void {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
    handlers.onUnavailable();
    return () => undefined;
  }

  let receivedHeading = false;
  const listener = (event: Event) => {
    const heading = headingFromEvent(event as CompassEvent);
    if (heading === null) return;
    receivedHeading = true;
    handlers.onHeading(heading);
  };

  // Chromium exposes north-referenced data on its own event.
  const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  window.addEventListener(eventName, listener);

  const timeout = window.setTimeout(() => {
    if (!receivedHeading) handlers.onUnavailable();
  }, SENSOR_TIMEOUT_MS);

  return () => {
    window.clearTimeout(timeout);
    window.removeEventListener(eventName, listener);
  };
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
