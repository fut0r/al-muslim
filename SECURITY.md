# Security policy

## Supported versions

Security fixes are made on the latest release of Al-Muslim.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub: on the repository page open **Security → Report a
vulnerability** (<https://github.com/fut0r/Al-Muslim/security/advisories/new>). Include what you
found, how to reproduce it and the version or commit affected.

You can expect an acknowledgement within a few days. Once a fix is released the report will be
credited to you unless you prefer otherwise.

## Security model

Al-Muslim is a client-only application. Knowing what it does and does not do helps when assessing
a report:

- There is no backend, no account system and no secrets in the code.
- All user data (settings, location, bookmarks, adhkar progress) is stored in the browser's local
  storage on the device and is validated every time it is read.
- The app loads only its own bundled files. `index.html` sets a content security policy that limits
  scripts, styles, fonts, images and connections to the app's own origin.
- The Quran text is verified against a checksum when the data files are generated and checked for
  completeness when loaded.
- The Android app requests location and notification permissions only when the user enables the
  corresponding feature, and disables cloud backup of app data.

If a backend or sync feature is ever added it must be strictly optional, use HTTPS, validate all
input on the server, keep secrets out of the client and store tokens securely.

## Hosting the web app

When you deploy `dist/` yourself, serve it over HTTPS (required for the service worker, location and
notifications) and consider adding these response headers:

```
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)
```
