import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { registerServiceWorker } from './app/registerServiceWorker';
import { isNative } from './services/platform';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

registerServiceWorker();

// The native splash screen is dismissed as soon as the first frame is ready.
if (isNative) {
  requestAnimationFrame(() => {
    void import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide())
      .catch(() => undefined);
  });
}
