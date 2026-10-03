import { RouterProvider } from 'react-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLocationRefresh, usePrayerNotificationSync } from '@/hooks/useBackgroundSync';
import { AppThemeProvider } from '@/theme/AppThemeProvider';
import { router } from './router';

/** Work that runs for the whole session, independent of the visible screen. */
function BackgroundTasks() {
  usePrayerNotificationSync();
  useLocationRefresh();
  return null;
}

export function App() {
  return (
    <AppThemeProvider>
      <ErrorBoundary>
        <BackgroundTasks />
        <RouterProvider router={router} />
      </ErrorBoundary>
    </AppThemeProvider>
  );
}
