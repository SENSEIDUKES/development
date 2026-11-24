import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBRARY_READER_FONTS } from '../src/library/typography/readerFonts.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const typography = 'src/library/typography';
const fontDirectory = 'public/fonts';
const fontExtension = /\.(?:woff2?|ttf|otf|eot)$/i;
const require = createRequire(import.meta.url);
const errors = [];
const families = new Set();
const localFonts = new Map();
const checkOnly = process.argv.includes('--check');
const genericFamilies = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong',
]);

function filesIn(directory) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    // The locked Workshop comparisons preserve their historical source.
    if (entry.isDirectory()) return entry.name === 'reference' ? [] : filesIn(path);
    return entry.isFile() ? [path] : [];
  });
}

function readStyles(path) {
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}

const loadedStyles = new Set();
function followStyleImports(source) {
  if (loadedStyles.has(source)) return;
  loadedStyles.add(source);
  const css = readStyles(join(root, source));
  for (const [, specifier] of css.matchAll(/@import\s+['"](\.[^'"]+\.css)['"]/g)) {
    followStyleImports(posix.join(posix.dirname(source), specifier));
  }
}
followStyleImports('src/host/styles/theme.css');
followStyleImports('src/package/library/styles.css');

function recordFace(rule, source, packageEntry) {
  const family = /font-family:\s*([^;}]*)/.exec(rule)?.[1].trim().replace(/^['"]|['"]$/g, '');
  if (!family) {
    errors.push(`${source} has a font face with no family name`);
    return;
  }
  const style = /font-style:\s*([^;}]*)/.exec(rule)?.[1].trim() ?? 'normal';
  const weight = /font-weight:\s*([^;}]*)/.exec(rule)?.[1].trim() ?? '400';
  const scriptFallback = source === `${typography}/script-fonts.css`;
  if (!scriptFallback) families.add(family.toLowerCase());
  const urls = [...rule.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)];
  if (!urls.length) errors.push(`${source}: no file URL for ${family}`);
  for (const [, url] of urls) {
    if (!packageEntry && (!url.startsWith('/fonts/') || url.includes('..') || !fontExtension.test(url))) {
      errors.push(`${source}: use a file under /fonts/ for ${family} (${url})`);
      continue;
    }
    const file = packageEntry ? resolve(dirname(source), url) : join(root, `public${url}`);
    const stat = statSync(file, { throwIfNoEntry: false });
    if (!stat?.isFile()) {
      errors.push(`${packageEntry ?? source}: missing ${url} for ${family}`);
      continue;
    }
    const key = packageEntry ? `${packageEntry} → ${url}` : `public${url}`;
    if (!localFonts.has(key)) localFonts.set(key, { families: new Set(), bytes: stat.size });
    localFonts.get(key).families.add(scriptFallback ? family : `${family} ${style} ${weight}`);
  }
}

const projectFiles = [...filesIn('src'), ...filesIn('public')];
const stylesheets = projectFiles.filter(file => file.endsWith('.css') || file.endsWith('.html'));
stylesheets.push('index.html', 'app/index.html', 'library-shell.html');
const remoteFonts = [];
for (const source of stylesheets) {
  const css = readStyles(join(root, source));
  const fontFaces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)];
  const googleImports = [...css.matchAll(/https:\/\/fonts\.googleapis\.com\/css2?\?[^'"\s)<>]+/g)];
  if (!source.startsWith(`${typography}/`)) {
    if (fontFaces.length || googleImports.length) errors.push(`Move font declarations from ${source} to ${typography}/`);
    continue;
  }
  if (!loadedStyles.has(source)) {
    errors.push(`${source} is not imported by the host or Library styles`);
    continue;
  }
  for (const [, fontFace] of fontFaces) recordFace(fontFace, source);
  for (const [url] of googleImports) {
    for (const specifier of new URL(url.replaceAll('&amp;', '&')).searchParams.getAll('family')) {
      const [family, variants] = specifier.split(':');
      families.add(family.toLowerCase());
      remoteFonts.push(`${family}${variants ? ` (${variants})` : ''}`);
    }
  }
  for (const [, entry] of css.matchAll(/@import\s+['"](@[^'"]+\.css)['"]/g)) {
    let path;
    try {
      path = require.resolve(entry);
    } catch {
      errors.push(`${source}: cannot resolve ${entry}. Run npm ci or update the font import.`);
      continue;
    }
    for (const [, fontFace] of readStyles(path).matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      recordFace(fontFace, path, entry);
    }
  }
}

for (const file of projectFiles.filter(file => fontExtension.test(file))) {
  if (!file.startsWith(`${fontDirectory}/`)) errors.push(`Move ${file} into ${fontDirectory}/`);
  else if (!localFonts.has(file)) errors.push(`${file} is unused. Register the face or remove the file.`);
}

const tokens = readStyles(join(root, typography, 'tokens.css'));
const stacks = [
  ...Array.from(tokens.matchAll(/(--font-[\w-]+):\s*([^;]+);/g), ([, name, stack]) => [name, stack]),
  ...[...LIBRARY_READER_FONTS.text, ...LIBRARY_READER_FONTS.titles].map(choice => [`Reader choice ${choice.id}`, choice.family]),
];
for (const [name, stack] of stacks) {
  const value = stack.trim();
  // A variable refers to another stack rather than naming a typeface itself.
  if (/^var\(/i.test(value)) continue;
  const quoted = /^(['"])(.*?)\1/.exec(value)?.[2];
  const primary = quoted ?? value.split(',', 1)[0].trim();
  const normalized = primary.toLowerCase();
  if (quoted === undefined && genericFamilies.has(normalized)) continue;
  if (primary && !families.has(normalized)) errors.push(`${name} still uses ${primary}, which has no registered face`);
}

if (errors.length) {
  for (const error of errors) console.error(`[fonts] ${error}`);
  process.exitCode = 1;
} else if (checkOnly) {
  console.log(`[fonts] Checked ${localFonts.size} font files and ${remoteFonts.length} Google Fonts families.`);
} else {
  console.log('Font files in Development and its Font Lab packages\n');
  for (const [file, { families: uses, bytes }] of [...localFonts].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`${file} (${Math.ceil(bytes / 1024)} KiB)\n  ${[...uses].join(', ')}`);
  }
  console.log(`\nGoogle Fonts\n  ${remoteFonts.sort().join('\n  ')}`);
  console.log(`\nTheme and Reader stacks\n  ${stacks.map(([name, stack]) => `${name}: ${stack}`).join('\n  ')}`);
}
