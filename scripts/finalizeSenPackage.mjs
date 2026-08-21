/**
 * Finalizes the `@seihouse/sen` package build.
 *
 * Copies the package manifest and README next to the built `dist/`, then
 * verifies the published surface: every entry declared in `exports` must
 * exist, and no Workshop shell, preview mock, or server module may have been
 * pulled into the bundle.
 */
import { copyFile, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src/package');
const target = join(root, 'dist/sen');

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

const manifest = await readJson(join(target, 'package.json'));
for (const [name, entry] of Object.entries(manifest.exports)) {
  const paths = typeof entry === 'string' ? [entry] : Object.values(entry);
  for (const relative of paths) {
    if (!existsSync(join(target, relative))) {
      fail(`export "${name}" points at missing file ${relative}`);
    }
  }
}

const FORBIDDEN = [
  ['src/workshop/', 'Workshop shell or preview mock'],
  ['src/server/', 'server module'],
  ['src/components/card-workshop/', 'Workshop-only card workshop view'],
];

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
