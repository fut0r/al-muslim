// Builds the landing page into dist-site/.
//
// The page is fully static (no JavaScript) and is generated from:
//   - site/template.html and site/content.<lang>.json  (structure and wording)
//   - site/styles.css                                   (layout)
//   - src/theme/tokens.ts and src/theme/fonts.css       (the app's own colours and fonts)
//   - @mui/icons-material and public/logo-mark.svg      (the app's own icons and logo)
// so it always looks like the app it presents.
//
// If the web app has been built (dist/), it is copied to dist-site/app/, giving
// one folder that can be published as is: the landing page at the root and the
// app under /app/.
//
//   npm run site

import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLOR_TOKENS, FONTS, RADIUS } from '../src/theme/tokens.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-site');
const REPOSITORY = 'https://github.com/fut0r/al-muslim';
const LANGUAGES = [
  { lang: 'en', dir: 'ltr', path: '' },
  { lang: 'ar', dir: 'rtl', path: 'ar/' },
];

const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

// --- Colours: the same tokens the app's MUI theme is built from -------------

function rgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function colorVariables(tokens) {
  return [
    `--bg: ${tokens.background};`,
    `--surface: ${tokens.surface};`,
    `--text: ${tokens.text};`,
    `--text-secondary: ${tokens.textSecondary};`,
    `--divider: ${tokens.divider};`,
    `--primary: ${tokens.primary};`,
    `--on-primary: ${tokens.onPrimary};`,
    `--primary-soft: ${tokens.primarySoft};`,
    `--hover: ${rgba(tokens.text, 0.05)};`,
    `--track: ${rgba(tokens.text, 0.1)};`,
  ].join('\n  ');
}

const tokensCss = `:root {
  color-scheme: light;
  ${colorVariables(COLOR_TOKENS.light)}
  --font-display: ${FONTS.display};
  --font-heading: ${FONTS.heading};
  --font-body: ${FONTS.body};
  --radius: ${RADIUS.medium}px;
  --radius-large: ${RADIUS.large}px;
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    ${colorVariables(COLOR_TOKENS.dark).replaceAll('\n  ', '\n    ')}
  }
}
`;

// --- Fonts: the app's @font-face rules, pointed at copies next to the page ---

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets', 'fonts'), { recursive: true });

const fontFaces = (read('src', 'theme', 'fonts.css').match(/@font-face\s*\{[^}]*\}/g) ?? [])
  .filter((block) => !block.includes('Amiri Quran')) // The landing page shows no Quran text.
  .map((block) =>
    block.replace(/url\('\.\.\/\.\.\/(node_modules\/[^']+\/files\/([^'/]+\.woff2))'\)/, (_, source, file) => {
      copyFileSync(join(root, source), join(out, 'assets', 'fonts', file));
      return `url('fonts/${file}')`;
    }),
  );
if (fontFaces.length === 0) fail('no @font-face rules found in src/theme/fonts.css');

writeFileSync(
  join(out, 'assets', 'site.css'),
  `${tokensCss}\n${fontFaces.join('\n\n')}\n\n${read('site', 'styles.css')}`,
  'utf8',
);

// --- Icons and logo: the same drawings the app uses --------------------------

function icon(name) {
  const file = join(root, 'node_modules', '@mui', 'icons-material', `${name}.js`);
  if (!existsSync(file)) fail(`unknown icon ${name}`);
  const paths = [...readFileSync(file, 'utf8').matchAll(/\bd: "([^"]+)"/g)].map((match) => match[1]);
  if (paths.length === 0) fail(`icon ${name} has no path data`);
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths
    .map((d) => `<path d="${d}"/>`)
    .join('')}</svg>`;
}

const mark = read('public', 'logo-mark.svg').match(/<g transform=[\s\S]*<\/g>(?=<\/g>)/);
if (!mark) fail('could not read the logo from public/logo-mark.svg');
const logo = `<svg viewBox="56 56 400 400" aria-hidden="true" focusable="false">${mark[0]}</svg>`;

// Same drawing as TasbihIcon in src/components/icons.tsx.
const tasbih =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.6">' +
  [
    [12, 3.9],
    [16.6, 5.8],
    [18.5, 10.4],
    [16.6, 15],
    [7.4, 15],
    [5.5, 10.4],
    [7.4, 5.8],
    [12, 16.9],
  ]
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="1.5"/>`)
    .join('') +
  '<path d="M12 18.4v3.4M10.4 22l1.6-1.4 1.6 1.4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';

// --- Pages --------------------------------------------------------------------

const escapeHtml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function lookup(content, path) {
  let node = content;
  for (const part of path.split('.')) node = node?.[part];
  return typeof node === 'string' ? node : undefined;
}

const keysOf = (value, prefix = '') =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, child]) => keysOf(child, `${prefix}${key}.`))
    : [prefix.slice(0, -1)];

const template = read('site', 'template.html');
const contents = Object.fromEntries(
  LANGUAGES.map(({ lang }) => [lang, JSON.parse(read('site', `content.${lang}.json`))]),
);
const reference = keysOf(contents.en).sort().join('\n');
for (const { lang } of LANGUAGES) {
  if (keysOf(contents[lang]).sort().join('\n') !== reference) fail(`site/content.${lang}.json does not have the same keys as the English file`);
}

for (const { lang, dir, path } of LANGUAGES) {
  const other = LANGUAGES.find((entry) => entry.lang !== lang);
  const depth = path === '' ? './' : '../';
  const values = {
    lang,
    dir,
    root: depth,
    self: path,
    other: other.path,
    otherLang: other.lang,
    logo,
    tasbih,
    releases: `${REPOSITORY}/releases`,
    repository: REPOSITORY,
    themeLight: COLOR_TOKENS.light.background,
    themeDark: COLOR_TOKENS.dark.background,
  };

  const html = template.replace(/\{\{([\w.]+)\}\}/g, (placeholder, key) => {
    if (key.startsWith('t.')) {
      const text = lookup(contents[lang], key.slice(2));
      if (text === undefined) fail(`missing text "${key.slice(2)}" in site/content.${lang}.json`);
      return escapeHtml(text);
    }
    if (key.startsWith('icon.')) return icon(key.slice(5));
    if (key in values) return values[key];
    return fail(`unknown placeholder ${placeholder}`);
  });

  mkdirSync(join(out, path), { recursive: true });
  writeFileSync(join(out, path, 'index.html'), html, 'utf8');
}

copyFileSync(join(root, 'public', 'favicon.svg'), join(out, 'favicon.svg'));
writeFileSync(join(out, '.nojekyll'), '', 'utf8');

// --- The web app, under /app/ ---------------------------------------------------

const appBuild = join(root, 'dist');
if (existsSync(join(appBuild, 'index.html'))) {
  cpSync(appBuild, join(out, 'app'), { recursive: true });
  console.log('✓ landing page built, with the web app under /app/');
} else {
  console.log('✓ landing page built (run `npm run build` first to include the web app under /app/)');
}
