import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import type { ReactNode } from 'react';

/** The Al-Muslim mark: a crescent and a point of light. Inherits the text colour. */
export function LogoMark({ size = 40, title }: { size?: number | string; title?: string }) {
  return (
    <Box
      component="svg"
      viewBox="56 56 400 400"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      sx={{ width: size, height: size, display: 'block', flexShrink: 0, fill: 'currentColor', stroke: 'currentColor' }}
    >
      <g transform="translate(256 256) rotate(-35) translate(24 0)">
        <path
          d="M102.93 -109.11A150 150 0 1 0 102.93 109.11A118 118 0 1 1 102.93 -109.11Z"
          strokeWidth="10"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="0" r="27" />
      </g>
    </Box>
  );
}

/** Prayer beads, for adhkar. Drawn to match the weight of the outlined Material icons. */
export function TasbihIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="3.9" r="1.5" />
        <circle cx="16.6" cy="5.8" r="1.5" />
        <circle cx="18.5" cy="10.4" r="1.5" />
        <circle cx="16.6" cy="15" r="1.5" />
        <circle cx="7.4" cy="15" r="1.5" />
        <circle cx="5.5" cy="10.4" r="1.5" />
        <circle cx="7.4" cy="5.8" r="1.5" />
        <circle cx="12" cy="16.9" r="1.5" />
        <path d="M12 18.4v3.4M10.4 22l1.6-1.4 1.6 1.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </SvgIcon>
  );
}

/** The Kaaba, used as the qiblah marker on the compass. */
export function KaabaIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 7.2 12 4l8 3.2v10.6L12 21l-8-3.2V7.2Zm2 1.5v1.6l6 2.4 6-2.4V8.7l-6 2.4-6-2.4Z" />
    </SvgIcon>
  );
}

/** Mirrors icons that imply a direction (back, forward, chevrons) in right-to-left layouts. */
export function Directional({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none' }}
    >
      {children}
    </Box>
  );
}
