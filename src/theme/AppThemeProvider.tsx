import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import { useEffect, useMemo, type ReactNode } from 'react';
import { prefixer } from 'stylis';
import { directionOf } from '@/i18n';
import { isNative } from '@/services/platform';
import { useSettings } from '@/stores/settings';
import { createAppTheme } from './createAppTheme';
import type { ColorMode } from './tokens';
import './fonts.css';

// Two style caches: the RTL one mirrors every left/right rule MUI generates.
const ltrCache = createCache({ key: 'mui' });
const rtlCache = createCache({ key: 'mui-rtl', stylisPlugins: [prefixer, rtlPlugin] });

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { theme: preference, language } = useSettings();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const highContrast = useMediaQuery('(prefers-contrast: more)', { noSsr: true });

  const mode: ColorMode = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
  const direction = directionOf(language);
  const theme = useMemo(() => createAppTheme({ mode, language, highContrast }), [mode, language, highContrast]);

  // Language and direction apply to the whole document, not just our tree.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  // Keep the browser chrome and system bars in step with the theme.
  useEffect(() => {
    const background = theme.palette.background.default;
    document.documentElement.style.backgroundColor = background;
    document.documentElement.style.colorScheme = mode === 'light' ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);

    if (isNative) {
      void import('@capacitor/core')
        .then(({ SystemBars, SystemBarsStyle }) =>
          SystemBars.setStyle({ style: mode === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark }),
        )
        .catch(() => undefined);
    }
  }, [theme, mode]);

  return (
    <CacheProvider value={direction === 'rtl' ? rtlCache : ltrCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
