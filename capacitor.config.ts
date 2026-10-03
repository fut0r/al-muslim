import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.fut0r.almuslim',
  appName: 'Al-Muslim',
  webDir: 'dist',
  android: {
    // The app talks to no server; plain HTTP is never needed.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // The system splash screen (Android 12+ API) shows the logo and is
      // dismissed from main.tsx as soon as the first frame is drawn. The
      // duration is only an upper bound in case the WebView is slow to start.
      launchAutoHide: true,
      launchShowDuration: 1200,
      launchFadeOutDuration: 150,
      showSpinner: false,
    },
    SystemBars: {
      // Exposes the status/navigation bar insets to CSS on every WebView version.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_prayer',
      iconColor: '#1C6B4A',
    },
  },
};

export default config;
