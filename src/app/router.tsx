import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { LoadingState } from '@/components/states';
import { useSettings } from '@/stores/settings';

// Each screen is its own chunk, so opening the app only loads Home.
const HomePage = lazy(() => import('@/pages/HomePage'));
const PrayerTimesPage = lazy(() => import('@/pages/PrayerTimesPage'));
const QuranPage = lazy(() => import('@/pages/QuranPage'));
const QuranReaderPage = lazy(() => import('@/pages/QuranReaderPage'));
const AdhkarPage = lazy(() => import('@/pages/AdhkarPage'));
const AdhkarCategoryPage = lazy(() => import('@/pages/AdhkarCategoryPage'));
const QiblahPage = lazy(() => import('@/pages/QiblahPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const MorePage = lazy(() => import('@/pages/MorePage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/** First launch goes through onboarding; afterwards it is never shown again. */
function RequireOnboarding({ children }: { children: ReactNode }) {
  const { onboarded } = useSettings();
  return onboarded ? children : <Navigate to="/welcome" replace />;
}

function OnboardingRoute() {
  const { onboarded } = useSettings();
  if (onboarded) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<LoadingState />}>
      <OnboardingPage />
    </Suspense>
  );
}

// Hash routing works unchanged on any static host and inside the native app.
export const router = createHashRouter([
  { path: '/welcome', element: <OnboardingRoute /> },
  {
    path: '/',
    element: (
      <RequireOnboarding>
        <AppShell />
      </RequireOnboarding>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'prayers', element: <PrayerTimesPage /> },
      { path: 'quran', element: <QuranPage /> },
      { path: 'quran/:surahId', element: <QuranReaderPage /> },
      { path: 'adhkar', element: <AdhkarPage /> },
      { path: 'adhkar/:categoryId', element: <AdhkarCategoryPage /> },
      { path: 'qiblah', element: <QiblahPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'more', element: <MorePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
