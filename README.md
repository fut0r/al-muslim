<p align="center">
  <img src="public/logo.svg" width="96" height="96" alt="Al-Muslim logo">
</p>

<h1 align="center">Al-Muslim</h1>

<p align="center">
  Prayer times, Quran, adhkar, qiblah and Hijri calendar.<br>
  Private, offline, free and open source.
</p>

---

Al-Muslim is a small, fast Islamic companion app. Prayer times are calculated on your device, the
full Quran ships with the app, and nothing about you is sent anywhere. There are no accounts, no ads
and no analytics.

It runs as a web app that can be installed (PWA) and as an Android app built from the same code.

## Features

- **Prayer times** calculated on the device with the [adhan](https://github.com/batoulapps/adhan-js)
  library. By default the app follows the convention of the country you are in: its method (17 are
  included, among them Egypt, Umm al-Qura, the Gulf, Kuwait, Qatar, Jordan, Morocco, Algeria,
  Tunisia, Turkey and Karachi), its Asr calculation (Shafi'i or Hanafi) and its adjustments, such
  as the later Isha of the Umm al-Qura calendar in Ramadan. You can choose your own instead.
  High-latitude rules, time zones and daylight saving time are handled as well.
- **Adhan notifications** at the five prayers, scheduled locally and per prayer, with the adhan by
  Mishary Rashid Alafasy or the device's ordinary notification sound. A test notification confirms
  that they arrive, and a status screen shows what the system has scheduled and anything standing in
  the way (a refused permission, a silenced category, battery restrictions).
- **Home** with the next prayer, a live countdown, today's times and both dates.
- **Quran**: all 114 surahs in Uthmani script, full-text search that understands everyday Arabic
  spelling, bookmarks, reading position, go-to-ayah and adjustable text size. Reading progress
  counts the ayahs you have actually read, surah by surah, not how far into the Quran you are.
- **Recitations**: listen with the text following along ayah by ayah, and start from any ayah, with
  Abdul Basit Abdus-Samad, Mahmoud Khalil Al-Husary, Muhammad Siddiq Al-Minshawi, Abdur-Rahman
  As-Sudais, Maher Al-Muaiqly, Saad Al-Ghamdi or Mishary Rashid Alafasy. A recitation keeps playing
  when you leave the app or lock the screen, with the surah, ayah and reciter in the system's media
  controls, like a music player.
- **Adhkar** for the morning, evening, sleep, after prayer and general remembrance, each with its
  source, a counter, progress that is saved for the day, and optional haptic feedback.
- **Qiblah** compass using the device sensors, a great-circle bearing and magnetic declination. If
  the device has no compass the app says so instead of showing a misleading one.
- **Hijri calendar** (Umm al-Qura) with a dual Hijri/Gregorian month view and an adjustment for the
  local moon sighting.
- **Android home screen widgets**: the next prayer with a live countdown, and today's times.
- Arabic and English, with a fully right-to-left Arabic interface.
- Light, dark, AMOLED (true black) and system themes.
- Works offline. Location is optional: you can pick a city from a bundled list instead.

## Privacy

- No analytics, trackers, ads, accounts or third-party SDKs. No server.
- **One network use, and only when you ask for it:** listening to a recitation streams audio from
  `cdn.mp3quran.net` when you press play. Everything else works offline, and a content security
  policy in `index.html` allows nothing but the app's own origin and that audio host.
- Location is requested only when you ask for it, used on the device and stored only on the device.
  A GPS position is labelled with the nearest city from a bundled list, never by a geocoding service.
- Bookmarks, reading position, adhkar progress and settings are kept in local storage on the device.
  The Android app disables cloud backup of that data.
- Fonts and the adhan are bundled; nothing is fetched from a font or media CDN.

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

| Command                   | What it does                                           |
| ------------------------- | ------------------------------------------------------ |
| `npm run dev`             | Start the development server                           |
| `npm run build`           | Type-check and build the web app into `dist/`          |
| `npm run preview`         | Serve the production build locally                     |
| `npm run check`           | Type-check, lint and run the unit tests                |
| `npm test`                | Run the unit tests                                     |
| `npm run site`            | Build the landing page (with the app under `/app/`)    |
| `npm run site:preview`    | Serve the built landing page locally                   |
| `npm run android:sync`    | Build the web app and copy it into the Android project |
| `npm run icons`           | Regenerate the PNG icons from the SVG logo             |
| `npm run data:quran`      | Regenerate the Quran data files (see the script)       |
| `npm run data:recitation` | Regenerate the ayah timings for the recitations        |
| `npm run data:cities`     | Regenerate the city list (see the script)              |

### Android

The Android project in `android/` wraps the web build with [Capacitor](https://capacitorjs.com) and
adds, in a few small Java classes of its own (`android/app/src/main/java/...`), what the web cannot
do:

- `notifications`: prayer notifications and the adhan with the app closed. The app sets the alarms
  and shows the notifications itself, with no notification library in between.
- `media`: a media playback service that keeps a recitation playing in the background and shows
  the media notification and lock screen controls.
- `widgets`: the home screen widgets.

You do not need Android Studio to get an APK: the **Android** workflow builds one on every push and
attaches it to the run as the `al-muslim-debug-apk` artifact. Each run signs its debug APK with a
new key, so a debug build never installs over an earlier one. With release signing set up as
described below, every run also attaches `al-muslim-apk`, signed with your own key, which does.

Prayer notifications are scheduled with exact alarms. The app declares `USE_EXACT_ALARM` so that
this works without the user having to find a system setting; Google Play asks for a declaration of
that permission if you publish the app there.

To build locally you need JDK 21 and the Android SDK:

```bash
npm run android:sync   # build the web app and copy it into the Android project
npm run android:open   # open the project in Android Studio
```

or `cd android && ./gradlew assembleDebug` after the sync.

#### Releases

Pushing a version tag publishes a GitHub release with the APK. If `release-notes/<tag>.md` exists
it becomes the text of the release; otherwise GitHub generates the notes from the commits.

```bash
git tag v2.0.1
git push origin v2.0.1
```

Android only installs an update over an app signed with the same key. To sign releases with your
own key, create a keystore once and add four repository secrets (Settings → Secrets and variables →
Actions): `ANDROID_KEYSTORE_BASE64` (the keystore file, base64-encoded), `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. Without them the release contains a debug-signed APK,
which installs but cannot be updated in place by a later release.

The workflow checks every signed build against the SHA-256 of the release certificate
(`RELEASE_CERTIFICATE_SHA256` at the top of `.github/workflows/android.yml`) and refuses to publish
an APK signed with any other key. If you fork the project and sign with your own key, put your
certificate's fingerprint there.

### Website

`site/` holds the landing page: one static template, its wording in English and Arabic, and a
stylesheet. `npm run site` renders it with the app's own design tokens, fonts, icons and logo, and
places the built web app under `/app/`, so `dist-site/` can be published as is. The page uses no
JavaScript.

The **Website** workflow builds it on every push to `main` and publishes it to GitHub Pages once
Pages is enabled for the repository (Settings → Pages → Source: GitHub Actions).

## Project structure

```
src/
  app/          App root, router, service worker registration
  pages/        One file per screen (lazy-loaded)
  components/   Reusable UI: AppHeader, navigation, PrayerCard, DhikrCard, QiblahCompass, Calendar…
  hooks/        React hooks that connect components to stores and services
  domain/       Pure logic with no UI or browser APIs: prayer times, schedule, qibla, Hijri, search
  services/     Device and platform access: location, notifications, audio, compass, widgets, storage
  stores/       Persistent state (settings, location, Quran, adhkar), validated on load
  data/         Static content: adhkar, surah index, reciters
  i18n/         English and Arabic strings and formatting
  theme/        Design tokens, MUI theme, fonts
public/         Quran text (one file per surah), the city list, the adhan, icons
site/           Landing page template, wording and styles
scripts/        Data, icon and site generators
android/        Capacitor Android project, including the widgets
```

A few rules keep it maintainable:

- `domain/` never imports from React, the DOM or `services/`. It is covered by unit tests.
- Components do not call browser APIs directly; they go through `services/` and `hooks/`.
- Adding a prayer calculation method is one entry in `src/domain/prayer/methods.ts` plus its label;
  adding a reciter is one entry in `src/data/reciters.ts`.
- Anything read from storage passes through a sanitizer, so damaged data cannot crash the app.
- The widgets calculate nothing: the app hands them a ready-to-display schedule, so they always
  agree with it.

## Design

A minimal design system built on the MUI theme (`src/theme`): neutral surfaces, one calm green
accent, hairlines instead of shadows, and moderate corner radii. Type is Alexandria for headings,
Tajawal for body text, Anton for Latin display text and numerals, and Amiri Quran for the Quran and
adhkar. All icons are SVG. Layouts use safe-area insets and fluid sizes, with bottom navigation on
phones and a side rail on larger screens. The landing page and the Android widgets use the same
colours.

## Data and credits

- **Quran text**: Uthmani script as published by [Quran.com](https://quran.com), obtained through
  the `quran-validator` package. The build script verifies the surah and ayah counts and a checksum
  of the whole text. The text is never edited by hand.
- **Recitations**: each reciter's complete murattal recording in the
  [mp3quran.net](https://www.mp3quran.net) library, streamed one surah at a time, so a surah is
  always in a single voice. The ayah timings that let the text follow the audio come from the same
  library (`npm run data:recitation`) and are bundled in `public/data/recitation`. Every surah was
  checked against its audio, and the few whose published timings did not fit were corrected
  (`scripts/recitation-corrections.json`).
- **Calculation methods**: the parameters of the methods that adhan-js does not include (Gulf,
  Jordan, Morocco, Algeria, Tunisia) are those listed by [AlAdhan](https://aladhan.com/calculation-methods).
- **Adhan**: recorded by Mishary Rashid Alafasy, obtained from the
  [AlAdhan](https://aladhan.com) audio collection (`public/audio/adhan.mp3`). The source does not
  state a licence for the recording; replace the file if you redistribute the app under terms that
  require one.
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

Developed by **Zyad Mohamed** · <https://github.com/fut0r/al-muslim>
