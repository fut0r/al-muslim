import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

// Relative base + hash routing: the same build runs from a domain root, a
// sub-path (GitHub Pages) and inside the Capacitor WebView.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // The service worker is registered from src/app/registerServiceWorker.ts
      // so it can be skipped inside the native app.
      injectRegister: false,
      registerType: 'autoUpdate',
      // The glob below already covers the icons.
      includeManifestIcons: false,
      manifest: {
        id: './',
        name: 'Al-Muslim',
        short_name: 'Al-Muslim',
        description:
          'Prayer times, Quran, adhkar, qiblah and Hijri calendar. Private, offline, open source.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F6F7F4',
        theme_color: '#1C6B4A',
        categories: ['lifestyle', 'education', 'books'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'logo.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Everything the app needs is precached so it works fully offline,
        // including the complete Quran text and the city list.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // The adhan is large and optional: the app stores it itself when it is first needed.
        globIgnores: ['**/audio/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Take control on the very first visit, so offline works without a reload.
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: ['es2020', 'chrome87', 'safari14'],
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
