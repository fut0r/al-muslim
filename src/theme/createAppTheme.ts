import { alpha, createTheme, type Theme } from '@mui/material/styles';
import type { Language } from '@/stores/settings';
import { COLOR_TOKENS, FONTS, RADIUS, withHighContrast, type ColorMode, type ColorTokens } from './tokens';

declare module '@mui/material/styles' {
  interface Theme {
    app: { mode: ColorMode; tokens: ColorTokens; fonts: typeof FONTS };
  }
  interface ThemeOptions {
    app?: { mode: ColorMode; tokens: ColorTokens; fonts: typeof FONTS };
  }
}

export interface AppThemeOptions {
  mode: ColorMode;
  language: Language;
  highContrast?: boolean;
}

export function createAppTheme({ mode, language, highContrast = false }: AppThemeOptions): Theme {
  const tokens = highContrast ? withHighContrast(COLOR_TOKENS[mode], mode) : COLOR_TOKENS[mode];
  const arabic = language === 'ar';
  const isLight = mode === 'light';
  // Floating surfaces get a hairline instead of a heavy shadow.
  const floating = {
    backgroundColor: tokens.raised,
    backgroundImage: 'none',
    border: `1px solid ${tokens.divider}`,
    boxShadow: isLight ? '0 8px 28px rgba(20, 26, 22, 0.10)' : 'none',
  };

  return createTheme({
    app: { mode, tokens, fonts: FONTS },
    direction: arabic ? 'rtl' : 'ltr',
    palette: {
      mode: isLight ? 'light' : 'dark',
      primary: { main: tokens.primary, contrastText: tokens.onPrimary },
      secondary: { main: tokens.primary, contrastText: tokens.onPrimary },
      error: { main: tokens.error },
      warning: { main: tokens.warning },
      background: { default: tokens.background, paper: tokens.surface },
      text: { primary: tokens.text, secondary: tokens.textSecondary, disabled: tokens.textDisabled },
      divider: tokens.divider,
      action: {
        hover: alpha(tokens.text, 0.05),
        selected: tokens.primarySoft,
        focus: alpha(tokens.text, 0.1),
        disabled: tokens.textDisabled,
        disabledBackground: alpha(tokens.text, 0.08),
      },
    },
    shape: { borderRadius: RADIUS.medium },
    spacing: 8,
    // Sizes are in rem so the system "large text" setting scales the whole app.
    typography: {
      fontFamily: FONTS.body,
      fontSize: 16,
      // Arabic has no capitals, so page titles use Alexandria; Latin uses Anton.
      h1: arabic
        ? { fontFamily: FONTS.heading, fontWeight: 700, fontSize: '1.625rem', lineHeight: 1.4 }
        : {
            fontFamily: FONTS.display,
            fontWeight: 400,
            fontSize: '1.875rem',
            lineHeight: 1.15,
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
          },
      h2: { fontFamily: FONTS.heading, fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
      h3: { fontFamily: FONTS.heading, fontWeight: 600, fontSize: '1rem', lineHeight: 1.45 },
      h4: { fontFamily: FONTS.heading, fontWeight: 600, fontSize: '1rem', lineHeight: 1.45 },
      h5: { fontFamily: FONTS.heading, fontWeight: 600, fontSize: '1rem', lineHeight: 1.45 },
      h6: { fontFamily: FONTS.heading, fontWeight: 600, fontSize: '1rem', lineHeight: 1.45 },
      subtitle1: { fontFamily: FONTS.heading, fontWeight: 500, fontSize: '1rem', lineHeight: 1.5 },
      subtitle2: { fontFamily: FONTS.heading, fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5 },
      body1: { fontSize: arabic ? '1.0625rem' : '1.0625rem', lineHeight: arabic ? 1.75 : 1.55 },
      body2: { fontSize: '0.9375rem', lineHeight: arabic ? 1.7 : 1.5 },
      button: { fontFamily: FONTS.heading, fontWeight: 500, fontSize: '0.9375rem', textTransform: 'none' },
      caption: { fontSize: '0.8125rem', lineHeight: 1.5 },
      // Letter-spacing would break the joins between Arabic letters.
      overline: arabic
        ? { fontFamily: FONTS.heading, fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.6, letterSpacing: 0, textTransform: 'none' }
        : { fontFamily: FONTS.heading, fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.6, letterSpacing: '0.09em', textTransform: 'uppercase' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' },
          body: {
            backgroundColor: tokens.background,
            WebkitTapHighlightColor: 'transparent',
            overscrollBehaviorY: 'none',
            // Long words and URLs must never push the layout sideways.
            overflowWrap: 'anywhere',
          },
          '#root': { minHeight: '100dvh', isolation: 'isolate' },
          ':focus-visible': { outline: `2px solid ${tokens.primary}`, outlineOffset: 2 },
          '::selection': { backgroundColor: alpha(tokens.primary, 0.28) },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
      MuiButtonBase: { defaultProps: { disableRipple: false } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: RADIUS.medium, minHeight: 44, paddingInline: 18 },
          sizeLarge: { minHeight: 52, fontSize: '1rem', paddingInline: 22 },
          sizeSmall: { minHeight: 36, paddingInline: 12 },
          outlined: { borderColor: tokens.divider },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          // 44px minimum touch target.
          root: { padding: 10 },
          sizeSmall: { padding: 8 },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: tokens.divider },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: { root: { backgroundColor: tokens.background, backgroundImage: 'none' } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { ...floating, borderRadius: RADIUS.large, margin: 16 },
          // Full-screen dialogs (phones) cover the screen edge to edge.
          paperFullScreen: { margin: 0, borderRadius: 0, border: 'none', boxShadow: 'none' },
        },
      },
      MuiDrawer: { styleOverrides: { paper: { backgroundImage: 'none' } } },
      MuiMenu: { styleOverrides: { paper: floating } },
      MuiPopover: { styleOverrides: { paper: floating } },
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? tokens.text : tokens.raised,
            color: isLight ? tokens.background : tokens.text,
            border: isLight ? 'none' : `1px solid ${tokens.divider}`,
            boxShadow: 'none',
            fontFamily: FONTS.body,
            fontSize: '0.9375rem',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: { root: { minHeight: 52, borderRadius: RADIUS.medium } },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 44, color: tokens.textSecondary } } },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 4, borderRadius: 4, backgroundColor: alpha(tokens.text, 0.1) },
          bar: { borderRadius: 4 },
        },
      },
      MuiTabs: { styleOverrides: { root: { minHeight: 48 }, indicator: { height: 2 } } },
      MuiTab: {
        styleOverrides: {
          root: { minHeight: 48, textTransform: 'none', fontFamily: FONTS.heading, fontWeight: 500, fontSize: '0.9375rem' },
        },
      },
      MuiToggleButtonGroup: { styleOverrides: { root: { backgroundColor: 'transparent' } } },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            minHeight: 44,
            textTransform: 'none',
            fontFamily: FONTS.heading,
            fontWeight: 500,
            fontSize: '0.875rem',
            borderColor: tokens.divider,
            color: tokens.textSecondary,
            paddingInline: 14,
            '&.Mui-selected': {
              color: tokens.primary,
              backgroundColor: tokens.primarySoft,
              '&:hover': { backgroundColor: tokens.primarySoft },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: RADIUS.medium, backgroundColor: tokens.surface },
          notchedOutline: { borderColor: tokens.divider },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: { root: { backgroundColor: 'transparent', height: 64 } },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 0,
            paddingInline: 4,
            color: tokens.textSecondary,
            '&.Mui-selected': { color: tokens.primary },
          },
          label: {
            fontFamily: FONTS.heading,
            fontSize: '0.6875rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            '&.Mui-selected': { fontSize: '0.6875rem', fontWeight: 600 },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': { color: tokens.primary },
            '&.Mui-checked + .MuiSwitch-track': { backgroundColor: tokens.primary, opacity: 0.5 },
          },
          track: { backgroundColor: tokens.textDisabled, opacity: 0.5 },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { fontFamily: FONTS.body, fontSize: '0.8125rem' } },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: tokens.divider } } },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: RADIUS.medium, fontFamily: FONTS.body, fontSize: '0.9375rem' } },
      },
    },
  });
}
