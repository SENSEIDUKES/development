/**
 * Finalizes a package build — `@seihouse/sen` or `@seihouse/library`.
 *
 * Copies the package manifest and README next to the built `dist/`, copies the
 * runtime assets the published components address from root paths, then
 * verifies the published surface: every entry declared in `exports` must
 * exist and reconnect the extracted stylesheet, and nothing the package must
 * not carry may have been pulled into the bundle — the Workshop shell, a
 * preview mock, a server module, or, for SEN, a Library-owned surface.
 *
 * Usage: `node scripts/finalizePackage.mjs <sen|library>`
 */
import { copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTarget } from './packageTargets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolveTarget(process.argv[2]);
const source = join(root, target.sourceDirectory);
const output = join(root, target.distDirectory);

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
  console.error(`[${target.id}-package] ${message}`);
  process.exitCode = 1;
};

await copyFile(join(source, 'package.json'), join(output, 'package.json'));
await copyFile(join(source, 'README.md'), join(output, 'README.md'));
for (const relative of target.assets) {
  const destination = join(output, 'dist', relative);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(root, 'public', relative), destination);
}

const manifest = await readJson(join(output, 'package.json'));
for (const [name, entry] of Object.entries(manifest.exports)) {
  const paths = typeof entry === 'string' ? [entry] : Object.values(entry);
  for (const relative of paths) {
    if (!existsSync(join(output, relative))) {
      fail(`export "${name}" points at missing file ${relative}`);
    }
  }
  if (typeof entry !== 'object' || typeof entry.import !== 'string') continue;
  const entryName = entry.import.replace(/^\.\/dist\//, '').replace(/\.js$/, '');
  if (target.unstyledEntries.includes(entryName)) continue;
  const contents = await readFile(join(output, entry.import), 'utf8');
  if (
    !contents.includes(`import './${target.styleSheet}';`)
    && !contents.includes(`import "./${target.styleSheet}";`)
  ) {
    fail(`export "${name}" does not load the shared ${target.styleSheet} stylesheet`);
  }
}

if (existsSync(join(output, 'dist/card-workshop'))) {
  fail('dist/card-workshop contains Workshop-only preview assets');
}

for (const file of await collectFiles(join(output, 'dist'))) {
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
  const contents = await readFile(file, 'utf8');
  for (const [needle, label] of target.forbiddenBundleContents) {
    if (contents.includes(needle)) {
      fail(`${file.slice(output.length + 1)} bundles a ${label} (${needle})`);
    }
  }
}

if (process.exitCode) {
  console.error(`[${target.id}-package] package verification failed.`);
} else {
  const bundles = (await collectFiles(join(output, 'dist')))
    .filter(file => file.endsWith('.js'));
  let bytes = 0;
  for (const file of bundles) bytes += (await stat(file)).size;
  console.log(
    `[${target.id}-package] ${manifest.name}@${manifest.version} verified — `
    + `${Object.keys(manifest.exports).length} exports, ${bundles.length} bundles, `
    + `${(bytes / 1024).toFixed(0)} kB.`,
  );
}
