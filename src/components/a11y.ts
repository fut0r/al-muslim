/**
 * Hides content visually while keeping it available to screen readers.
 * Lengths are explicit strings: in the `sx` prop a bare `1` means 100%.
 */
export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
