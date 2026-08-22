/**
 * Finalizes the `@seihouse/sen` package build.
 *
 * Copies the package manifest and README next to the built `dist/`, then
 * verifies the published surface: every entry declared in `exports` must
 * exist, and no Workshop shell, preview mock, or server module may have been
 * pulled into the bundle.
 */
import { copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src/package');
const target = join(root, 'dist/sen');

const PUBLIC_ASSETS = [
  'favicon.jpg',
  'icons/book-scroll.svg',
  'icons/cultivator.svg',
  'icons/sacred-tree.svg',
  'icons/shen-long-dragon.svg',
  'icons/thunder-cloud.svg',
  'icons/yin-yang.svg',
  'manifest-backdrops/immortal-land-1.jpg',
  'manifest-backdrops/immortal-land-2.jpg',
  'manifest-backdrops/immortal-land-3.jpg',
  'manifest-backdrops/immortal-land-4.jpg',
  'manifest-backdrops/immortal-land-5.jpg',
  'story-seed/library-auth-backdrop.jpg',
];

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

const collectFiles = async directory => {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await collectFiles(path)));
    else found.push(path);
  }
  return found;
};

const fail = message => {
  console.error(`[sen-package] ${message}`);
  process.exitCode = 1;
};

await copyFile(join(source, 'package.json'), join(target, 'package.json'));
await copyFile(join(source, 'README.md'), join(target, 'README.md'));
for (const relative of PUBLIC_ASSETS) {
  const destination = join(target, 'dist', relative);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(root, 'public', relative), destination);
}

const manifest = await readJson(join(target, 'package.json'));
for (const [name, entry] of Object.entries(manifest.exports)) {
  const paths = typeof entry === 'string' ? [entry] : Object.values(entry);
  for (const relative of paths) {
    if (!existsSync(join(target, relative))) {
      fail(`export "${name}" points at missing file ${relative}`);
    }
  }
  if (name !== './audio' && typeof entry === 'object' && typeof entry.import === 'string') {
    const contents = await readFile(join(target, entry.import), 'utf8');
    if (!contents.includes("import './sen.css';") && !contents.includes('import "./sen.css";')) {
      fail(`export "${name}" does not load the shared SEN stylesheet`);
    }
  }
}

const FORBIDDEN = [
  ['src/workshop/', 'Workshop shell or preview mock'],
  ['src/server/', 'server module'],
  ['src/components/card-workshop/', 'Workshop-only card workshop view'],
];

if (existsSync(join(target, 'dist/card-workshop'))) {
  fail('dist/card-workshop contains Workshop-only preview assets');
}

for (const file of await collectFiles(join(target, 'dist'))) {
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
  const contents = await readFile(file, 'utf8');
  for (const [needle, label] of FORBIDDEN) {
    if (contents.includes(needle)) {
      fail(`${file.slice(target.length + 1)} bundles a ${label} (${needle})`);
    }
  }
}

if (process.exitCode) {
  console.error('[sen-package] package verification failed.');
} else {
  const bundles = (await collectFiles(join(target, 'dist')))
    .filter(file => file.endsWith('.js'));
  let bytes = 0;
  for (const file of bundles) bytes += (await stat(file)).size;
  console.log(
    `[sen-package] @seihouse/sen@${manifest.version} verified — `
    + `${Object.keys(manifest.exports).length} exports, ${bundles.length} bundles, `
    + `${(bytes / 1024).toFixed(0)} kB.`,
  );
}
