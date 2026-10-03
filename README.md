<p align="center">
  <img src="public/logo.svg" width="96" height="96" alt="Al-Muslim logo">
</p>

<h1 align="center">Al-Muslim</h1>

<p align="center">
  Prayer times, Quran, adhkar, qiblah and Hijri calendar.<br>
  Private, offline, free and open source.
</p>

---

Al-Muslim is a small, fast Islamic companion app. Everything it does happens on your device: prayer
times are calculated locally, the full Quran ships with the app, and nothing about you is sent
anywhere. There are no accounts, no ads and no analytics.

It runs as a web app that can be installed (PWA) and as an Android app built from the same code.

## Features

- **Prayer times** calculated on the device with the [adhan](https://github.com/batoulapps/adhan-js)
  library: 12 calculation methods (Muslim World League, Egyptian, Umm al-Qura, Karachi, ISNA and
  more), Shafi'i/Hanafi Asr, high-latitude rules, correct time zones and daylight saving time.
- **Home** with the next prayer, a live countdown, today's times and both dates.
- **Quran**: all 114 surahs in Uthmani script, full-text search that understands everyday Arabic
  spelling, bookmarks, reading position, progress, go-to-ayah and adjustable text size.
- **Adhkar** for the morning, evening, sleep, after prayer and general remembrance, each with its
  source, a counter, progress that is saved for the day, and optional haptic feedback.
- **Qiblah** compass using the device sensors, a great-circle bearing and magnetic declination. If
  the device has no compass the app says so instead of showing a misleading one.
- **Hijri calendar** (Umm al-Qura) with a dual Hijri/Gregorian month view and an adjustment for the
  local moon sighting.
- **Prayer notifications**, scheduled locally, per prayer.
- Arabic and English, with a fully right-to-left Arabic interface.
- Light, dark, AMOLED (true black) and system themes.
- Works offline. Location is optional: you can pick a city from a bundled list instead.

## Privacy

- No analytics, trackers, ads, accounts or third-party SDKs.
- No server. The app makes no network requests beyond loading its own files, and a content security
  policy in `index.html` restricts it to its own origin.
- Location is requested only when you ask for it, used on the device and stored only on the device.
  A GPS position is labelled with the nearest city from a bundled list, never by a geocoding service.
- Bookmarks, reading position, adhkar progress and settings are kept in local storage on the device.
  The Android app disables cloud backup of that data.
- Fonts are bundled; nothing is fetched from a font CDN.

## Tech stack

React 19 · TypeScript · Vite · MUI (Material UI) with MUI Icons · React Router · adhan ·
Capacitor (Android wrapper) · Workbox service worker (via `vite-plugin-pwa`) · Vitest

There is no other UI framework and no state-management library: state lives in small persistent
stores built on `useSyncExternalStore`.

## Getting started

Requires Node.js 22.22 or newer.

```bash
npm install
npm run dev
```

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the development server                         |
| `npm run build`     | Type-check and build the web app into `dist/`        |
| `npm run preview`   | Serve the production build locally                   |
| `npm run check`     | Type-check, lint and run the unit tests              |
| `npm test`          | Run the unit tests                                   |
| `npm run icons`     | Regenerate the PNG icons from the SVG logo           |
| `npm run data:quran`  | Regenerate the Quran data files (see the script)   |
| `npm run data:cities` | Regenerate the city list (see the script)          |

### Android

The Android project in `android/` wraps the web build with [Capacitor](https://capacitorjs.com).
You need JDK 21 and the Android SDK (Android Studio installs both).

```bash
npm run android:sync   # build the web app and copy it into the Android project
npm run android:open   # open the project in Android Studio
```

Or build a debug APK from the command line with `cd android && ./gradlew assembleDebug`. The
`Android` GitHub Actions workflow does the same and uploads the APK as an artifact.

In the Android app prayer notifications are scheduled with the system and arrive even when the app
is closed. In a browser, notifications can only be delivered while the app is open; the app says so
where you enable them.

### Web deployment

`dist/` is a static site that works from any path (it uses relative URLs and hash routing). The
`Deploy web app` workflow publishes it to GitHub Pages.

## Project structure

```
src/
  app/          App root, router, service worker registration
  pages/        One file per screen (lazy-loaded)
  components/   Reusable UI: AppHeader, navigation, PrayerCard, DhikrCard, QiblahCompass, Calendar…
  hooks/        React hooks that connect components to stores and services
  domain/       Pure logic with no UI or browser APIs: prayer times, schedule, qibla, Hijri, search
  services/     Device and platform access: location, notifications, compass, storage, wake lock
  stores/       Persistent state (settings, location, Quran, adhkar), validated on load
  data/         Static content: adhkar, surah index
  i18n/         English and Arabic strings and formatting
  theme/        Design tokens, MUI theme, fonts
public/data/    Quran text (one file per surah) and the city list
scripts/        Data and icon generators
android/        Capacitor Android project
```

A few rules keep it maintainable:

- `domain/` never imports from React, the DOM or `services/`. It is covered by unit tests.
- Components do not call browser APIs directly; they go through `services/` and `hooks/`.
- Adding a prayer calculation method is one entry in `src/domain/prayer/methods.ts` plus its label.
- Anything read from storage passes through a sanitizer, so damaged data cannot crash the app.

## Design

A minimal design system built on the MUI theme (`src/theme`): neutral surfaces, one calm green
accent, hairlines instead of shadows, and moderate corner radii. Type is Alexandria for headings,
Tajawal for body text, Anton for Latin display text and numerals, and Amiri Quran for the Quran and
adhkar. All icons are SVG. Layouts use safe-area insets and fluid sizes, with bottom navigation on
phones and a side rail on larger screens.

## Data and credits

- **Quran text**: Uthmani script as published by [Quran.com](https://quran.com), obtained through
  the `quran-validator` package. The build script verifies the surah and ayah counts and a checksum
  of the whole text. The text is never edited by hand.
- **Prayer times**: [adhan-js](https://github.com/batoulapps/adhan-js) by Batoul Apps (MIT).
- **Magnetic declination**: World Magnetic Model via [geomagnetism](https://github.com/naturalatlas/geomagnetism) (Apache-2.0).
- **City list**: derived from [city-timezones](https://github.com/kevinroberts/city-timezones) (MIT).
- **Fonts**: Alexandria, Tajawal, Anton and Amiri Quran, all under the SIL Open Font License,
  bundled through [Fontsource](https://fontsource.org).
- **Adhkar**: from the Quran and the collections of hadith cited beside each one.

If you find a mistake in any religious text, please open an issue; corrections are a priority.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), the [code of conduct](CODE_OF_CONDUCT.md) and the
[security policy](SECURITY.md).

## License

Al-Muslim is free software, released under the
[GNU General Public License v3.0](LICENSE).

Developed by **Zyad Mohamed** · <https://github.com/fut0r/Al-Muslim>
