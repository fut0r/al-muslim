import { RouterProvider } from 'react-router';
import { AdhanBanner } from '@/components/AdhanBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLocationRefresh, usePrayerNotificationSync, useWidgetSync } from '@/hooks/useBackgroundSync';
import { AppThemeProvider } from '@/theme/AppThemeProvider';
import { router } from './router';

/** Work that runs for the whole session, independent of the visible screen. */
function BackgroundTasks() {
  usePrayerNotificationSync();
  useWidgetSync();
  useLocationRefresh();
  return null;
}

export function App() {
  return (
    <AppThemeProvider>
      <ErrorBoundary>
        <BackgroundTasks />
        <RouterProvider router={router} />
        <AdhanBanner />
      </ErrorBoundary>
    </AppThemeProvider>
  );
}
