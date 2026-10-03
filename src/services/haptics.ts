export const hapticsSupported =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const PATTERNS: Record<'tap' | 'complete', number | number[]> = {
  tap: 12,
  complete: [18, 70, 28],
};

/** Short vibration feedback. Does nothing where the device has no support. */
export function haptic(kind: keyof typeof PATTERNS): void {
  if (!hapticsSupported) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Vibration can be blocked by the browser; feedback is optional.
  }
}
