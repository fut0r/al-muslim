import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinates } from '@/domain/prayer/types';
import { angleDelta, normalizeDegrees, type CompassAccuracy } from '@/domain/qibla';
import {
  compassNeedsPermission,
  magneticDeclination,
  requestCompassPermission,
  startCompass,
} from '@/services/compass';
import { useAsync } from './useAsync';

export type CompassStatus = 'needs-permission' | 'denied' | 'starting' | 'active' | 'unavailable';

export interface CompassState {
  status: CompassStatus;
  /** Direction the top of the device points, clockwise from true north. */
  heading: number | null;
  /**
   * The same heading without wrapping at 360°, so a dial driven by it turns
   * the short way across north instead of spinning all the way back.
   */
  rotation: number | null;
  /** Declination applied to the sensor reading, or null if it could not be computed. */
  declination: number | null;
  /** How much the sensor trusts itself. "low" means the compass needs calibrating. */
  accuracy: CompassAccuracy;
  /** True when the phone is held too upright for the heading to be trusted. */
  tilted: boolean;
  /** Must be called from a tap: iOS only grants sensor access on a user gesture. */
  enable(): void;
}

// Low-pass filter strength: enough to stop the dial jittering, not enough to lag.
const SMOOTHING = 0.25;
/** Beyond this many degrees from flat, the direction of the top edge is no longer a steady reading. */
const MAX_TILT = 60;

interface Reading {
  heading: number;
  rotation: number;
  accuracy: CompassAccuracy;
  tilted: boolean;
}

export function useCompass(coordinates: Coordinates | null): CompassState {
  const [status, setStatus] = useState<CompassStatus>(() =>
    compassNeedsPermission() ? 'needs-permission' : 'starting',
  );
  const [reading, setReading] = useState<Reading | null>(null);
  const smoothed = useRef<Reading | null>(null);
  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;

  const declinationState = useAsync(
    latitude === undefined || longitude === undefined ? null : `${latitude},${longitude}`,
    () => magneticDeclination({ latitude: latitude ?? 0, longitude: longitude ?? 0 }),
  );
  const declination = declinationState.status === 'ready' ? declinationState.value : null;

  // Only Safari really needs the tap; elsewhere the same request is granted silently.
  useEffect(() => {
    if (!compassNeedsPermission()) return;
    let cancelled = false;
    void requestCompassPermission().then((granted) => {
      if (granted && !cancelled) setStatus((current) => (current === 'needs-permission' ? 'starting' : current));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The sensor stays subscribed even after it has been reported unavailable:
  // some are slow to wake, and a reading that arrives late still starts the compass.
  const listening = status === 'starting' || status === 'active' || status === 'unavailable';
  useEffect(() => {
    if (!listening) return;
    let frame = 0;
    const stop = startCompass({
      onReading({ heading, accuracy, tilt }) {
        const previous = smoothed.current;
        const tilted = tilt !== null && tilt > MAX_TILT;
        if (previous === null) {
          smoothed.current = { heading, rotation: heading, accuracy, tilted };
        } else {
          const step = angleDelta(previous.heading, heading) * SMOOTHING;
          smoothed.current = {
            heading: normalizeDegrees(previous.heading + step),
            rotation: previous.rotation + step,
            accuracy,
            tilted,
          };
        }
        // Sensors fire far faster than the screen refreshes.
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          setReading(smoothed.current);
          setStatus('active');
        });
      },
      onUnavailable: () => setStatus((current) => (current === 'active' ? current : 'unavailable')),
    });
    return () => {
      stop();
      if (frame) window.cancelAnimationFrame(frame);
      smoothed.current = null;
    };
  }, [listening]);

  const enable = useCallback(() => {
    void requestCompassPermission().then((granted) => setStatus(granted ? 'starting' : 'denied'));
  }, []);

  return {
    status,
    heading: reading === null ? null : normalizeDegrees(reading.heading + (declination ?? 0)),
    rotation: reading === null ? null : reading.rotation + (declination ?? 0),
    declination,
    accuracy: reading?.accuracy ?? 'unknown',
    tilted: reading?.tilted ?? false,
    enable,
  };
}
