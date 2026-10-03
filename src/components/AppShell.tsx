import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useI18n } from '@/i18n';
import { LAYOUT, SAFE_AREA } from '@/theme/tokens';
import { ErrorBoundary } from './ErrorBoundary';
import { BottomNav, NavRail } from './navigation';
import { LoadingState } from './states';

/**
 * The frame around every main screen: bottom navigation on phones, a side
 * rail on tablets and desktops. The document itself scrolls, so the browser's
 * own behaviour (keyboard avoidance, scroll restoration) keeps working.
 */
export function AppShell() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [offlineNotice, setOfflineNotice] = useState(() => !navigator.onLine);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Reassure the user when the connection drops: nothing here needs it.
  useEffect(() => {
    const show = () => setOfflineNotice(true);
    const hide = () => setOfflineNotice(false);
    window.addEventListener('offline', show);
    window.addEventListener('online', hide);
    return () => {
      window.removeEventListener('offline', show);
      window.removeEventListener('online', hide);
    };
  }, []);

  const bottomSpace = wide
    ? SAFE_AREA.bottom
    : `calc(${LAYOUT.bottomNavHeight}px + ${SAFE_AREA.bottom})`;

  return (
    <>
      {/* Keyboard users can jump past the navigation; it only shows when focused. */}
      <Button
        variant="contained"
        onClick={() => document.getElementById('content')?.focus()}
        sx={{
          position: 'fixed',
          top: 8,
          insetInlineStart: 8,
          zIndex: 'tooltip',
          transform: 'translateY(-200%)',
          '&:focus-visible': { transform: 'none' },
        }}
      >
        {t('nav.skipToContent')}
      </Button>
      {wide ? <NavRail /> : null}
      <Box
        component="main"
        id="content"
        tabIndex={-1}
        sx={{
          outline: 'none',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          paddingInlineStart: wide ? `${LAYOUT.railWidth}px` : 0,
          pb: bottomSpace,
        }}
      >
        {/* One failing screen must not take the navigation down with it. */}
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </Box>
      {wide ? null : <BottomNav />}
      <Snackbar
        open={offlineNotice}
        autoHideDuration={5000}
        onClose={() => setOfflineNotice(false)}
        message={t('common.offline')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: `calc(${bottomSpace} + 12px) !important` }}
      />
    </>
  );
}
