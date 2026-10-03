import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinates } from '@/domain/prayer/types';
import { angleDelta, normalizeDegrees } from '@/domain/qibla';
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
  /** Must be called from a tap: iOS only grants sensor access on a user gesture. */
  enable(): void;
}

// Low-pass filter strength: enough to stop the dial jittering, not enough to lag.
const SMOOTHING = 0.25;

export function useCompass(coordinates: Coordinates | null): CompassState {
  const [status, setStatus] = useState<CompassStatus>(() =>
    compassNeedsPermission() ? 'needs-permission' : 'starting',
  );
  const [reading, setReading] = useState<{ heading: number; rotation: number } | null>(null);
  const smoothed = useRef<{ heading: number; rotation: number } | null>(null);
  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;

  const declinationState = useAsync(
    latitude === undefined || longitude === undefined ? null : `${latitude},${longitude}`,
    () => magneticDeclination({ latitude: latitude ?? 0, longitude: longitude ?? 0 }),
  );
  const declination = declinationState.status === 'ready' ? declinationState.value : null;

  const listening = status === 'starting' || status === 'active';
  useEffect(() => {
    if (!listening) return;
    let frame = 0;
    const stop = startCompass({
      onHeading(magnetic) {
        const previous = smoothed.current;
        if (previous === null) {
          smoothed.current = { heading: magnetic, rotation: magnetic };
        } else {
          const step = angleDelta(previous.heading, magnetic) * SMOOTHING;
          smoothed.current = {
            heading: normalizeDegrees(previous.heading + step),
            rotation: previous.rotation + step,
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
      onUnavailable: () => setStatus('unavailable'),
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
    enable,
  };
}
