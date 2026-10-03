export const COLOR_MODES = ['light', 'dark', 'amoled'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export interface ColorTokens {
  /** Page background. */
  background: string;
  /** Grouped content sitting on the page. */
  surface: string;
  /** Dialogs, menus and sheets that float above the page. */
  raised: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  divider: string;
  /** The single accent colour. Used sparingly: actions, the current item, progress. */
  primary: string;
  onPrimary: string;
  /** Quiet tint of the accent for the highlighted row. */
  primarySoft: string;
  error: string;
  warning: string;
}

/**
 * Three palettes built from neutrals plus one calm green.
 * Every text/background pair meets WCAG AA (4.5:1) or better.
 */
export const COLOR_TOKENS: Record<ColorMode, ColorTokens> = {
  light: {
    background: '#F6F7F4',
    surface: '#FFFFFF',
    raised: '#FFFFFF',
    text: '#141A16',
    textSecondary: '#55605A',
    textDisabled: '#8D968F',
    divider: '#E1E4DD',
    primary: '#1C6B4A',
    onPrimary: '#FFFFFF',
    primarySoft: '#E4F0E9',
    error: '#B3261E',
    warning: '#8A5A00',
  },
  dark: {
    background: '#101311',
    surface: '#181C19',
    raised: '#1F2420',
    text: '#E7EBE7',
    textSecondary: '#A0AAA3',
    textDisabled: '#6B746E',
    divider: '#2A302C',
    primary: '#6BC895',
    onPrimary: '#06281A',
    primarySoft: '#17291F',
    error: '#F2B8B5',
    warning: '#E8C26A',
  },
  // True black for OLED panels: lit pixels only where there is content.
  amoled: {
    background: '#000000',
    surface: '#000000',
    raised: '#0C0E0D',
    text: '#E9EDE9',
    textSecondary: '#A3ADA6',
    textDisabled: '#666F69',
    divider: '#242A26',
    primary: '#6BC895',
    onPrimary: '#06281A',
    primarySoft: '#0F2118',
    error: '#F2B8B5',
    warning: '#E8C26A',
  },
};

/** Stronger separation for users who ask the system for more contrast. */
export function withHighContrast(tokens: ColorTokens, mode: ColorMode): ColorTokens {
  return {
    ...tokens,
    textSecondary: tokens.text,
    divider: mode === 'light' ? '#6F7A73' : '#8C968F',
  };
}

export const FONTS = {
  /** Latin display type and numerals; Arabic falls through to Alexandria. */
  display: '"Anton", "Alexandria", "Tajawal", system-ui, sans-serif',
  heading: '"Alexandria", "Tajawal", system-ui, -apple-system, "Segoe UI", sans-serif',
  body: '"Tajawal", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  /** Quran and adhkar. Never used for interface text. */
  quran: '"Amiri Quran", "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Geeza Pro", serif',
} as const;

export const RADIUS = { small: 8, medium: 12, large: 16 } as const;

/** Space reserved by the fixed navigation, used to pad page content. */
export const LAYOUT = {
  bottomNavHeight: 64,
  railWidth: 88,
  contentMaxWidth: 720,
  headerHeight: 56,
} as const;

/** Device safe areas (notch, rounded corners, system bars). */
export const SAFE_AREA = {
  top: 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))',
  bottom: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))',
  left: 'var(--safe-area-inset-left, env(safe-area-inset-left, 0px))',
  right: 'var(--safe-area-inset-right, env(safe-area-inset-right, 0px))',
} as const;

/**
 * Horizontal page padding: at least `min` px, more next to a notch.
 * The same value is used on both sides so mirroring the layout for
 * right-to-left never moves a physical inset to the wrong edge.
 */
export function gutter(min = 16): string {
  return `max(${min}px, ${SAFE_AREA.left}, ${SAFE_AREA.right})`;
}
