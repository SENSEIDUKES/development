/**
 * Packs a finished package artifact — `@seihouse/sen` or `@seihouse/library` —
 * installs it into a fresh local consumer alongside the packages it depends
 * on, then type-checks its public contracts and bundles every advertised
 * JavaScript entry with Vite. This validates the browser distribution
 * boundary rather than importing source files from the repo, and for Library
 * it proves the Library → SEN link resolves through the published packages.
 *
 * Usage: `node scripts/smokePackage.mjs <sen|library>`
 */
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTarget } from './packageTargets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolveTarget(process.argv[2]);
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is unavailable; run this check through npm run test:package.');
const consumerDirectory = await mkdtemp(join(tmpdir(), 'seihouse-narrative-consumer-'));
const tarballs = [];

const run = (command, args, cwd) => execFileSync(command, args, {
  cwd,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
const runNpm = (args, cwd) => run(process.execPath, [npmCli, ...args], cwd);

/** Packs one built package and returns the tarball path. */
const pack = packageTarget => {
  const directory = join(root, packageTarget.distDirectory);
  const packed = JSON.parse(runNpm(['pack', '--json'], directory))[0];
  const packedPaths = packed.files.map(file => file.path.replaceAll('\\', '/'));
  const forbiddenAsset = packedPaths.find(path => path.startsWith('dist/card-workshop/'));
  if (forbiddenAsset) throw new Error(`packed Workshop-only asset: ${forbiddenAsset}`);
  const tarballPath = join(directory, packed.filename);
  tarballs.push(tarballPath);
  return tarballPath;
};

try {
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
  const peers = ['react', 'react-dom', 'react-focus-lock', 'lucide-react', 'motion', '@types/react', '@types/react-dom'].map(name => name + '@' + lock.packages['node_modules/' + name].version);
  const audioPack = JSON.parse(runNpm(['pack', join(root, 'node_modules/@seihouse/audio-player'), '--ignore-scripts', '--pack-destination', consumerDirectory, '--json'], root))[0];
  peers.push(join(consumerDirectory, audioPack.filename));
  const dependencyTarballs = target.smokeDependencies.map(id => pack(resolveTarget(id)));
  const tarballPath = pack(target);

  await writeFile(join(consumerDirectory, 'package.json'), JSON.stringify({
    name: `${target.id}-package-smoke-consumer`,
    private: true,
    type: 'module',
  }, null, 2));
  runNpm(
    ['install', '--ignore-scripts', ...peers, join(root, 'vendor/seihouse-ui-0.4.0.tgz'), ...(target.id === 'library' ? [join(root, 'vendor/seihouse-library-ui-0.4.0.tgz')] : []), ...dependencyTarballs, tarballPath],
    consumerDirectory,
  );

  // Native ESM also proves Library's provider and SEN's root resolve the same
  // context across the package boundary, without a bundler alias or host CSS.
  await writeFile(join(consumerDirectory, 'presentation-smoke.mjs'), `
    import assert from 'node:assert/strict';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { NarrativeTextBox } from '@seihouse/sen';
    ${target.id === 'library' ? "import { LibraryPresentationProvider } from '@seihouse/library/presentation';" : ''}
    const field = createElement(NarrativeTextBox, { label: 'World', defaultValue: 'Astral' });
    const html = renderToStaticMarkup(${target.id === 'library' ? 'createElement(LibraryPresentationProvider, null, field)' : 'field'});
    assert.match(html, /Astral/);
    assert.equal(html.includes('glass-field'), ${target.id === 'library'});
  `);
  run(process.execPath, ['presentation-smoke.mjs'], consumerDirectory);

  const imports = [];
  const bindings = [];
  let bindingIndex = 0;
  for (const [specifier, names] of Object.entries(target.smokeExports)) {
    const specifierBindings = names.map(name => {
      const binding = `smoke${bindingIndex++}`;
      bindings.push(binding);
      return `${name} as ${binding}`;
    });
    imports.push(`import { ${specifierBindings.join(', ')} } from '${specifier}';`);
  }
  await writeFile(join(consumerDirectory, 'index.html'), '<div id="app"></div><script type="module" src="/src/main.js"></script>');
  await mkdir(join(consumerDirectory, 'src'));
  await writeFile(join(consumerDirectory, 'src/main.js'), [
    ...imports,
    `document.querySelector('#app').textContent = String([${bindings.join(', ')}].length);`,
  ].join('\n'));
  await writeFile(join(consumerDirectory, 'src/typecheck.ts'), target.smokeTypes);
  run(
    process.execPath,
    [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--logLevel', 'warn'],
    consumerDirectory,
  );
  run(
    process.execPath,
    [
      join(root, 'node_modules/typescript/bin/tsc'),
      '--noEmit',
      '--ignoreConfig',
      '--moduleResolution', 'Bundler',
      '--module', 'ESNext',
      '--target', 'ES2020',
      '--skipLibCheck',
      'src/typecheck.ts',
    ],
    consumerDirectory,
  );

  const manifest = JSON.parse(await readFile(join(root, target.sourceDirectory, 'package.json'), 'utf8'));
  const installedManifest = JSON.parse(await readFile(
    join(consumerDirectory, 'node_modules', manifest.name, 'package.json'),
    'utf8',
  ));
  if (target.id === 'sen') {
    assert(!installedManifest.exports['./ui']);
    assert(!installedManifest.exports['./library']);
    assert(!JSON.stringify(installedManifest).includes('@seihouse/library'));
    assert(!(await import('node:fs')).existsSync(join(consumerDirectory, 'node_modules/@seihouse/library-ui')));
  }
  const linked = target.smokeDependencies.length > 0
    ? ` linked against ${target.smokeDependencies.join(', ')},`
    : '';
  console.log(
    `[${target.id}-package-smoke] ${installedManifest.name}@${installedManifest.version} packed, installed,${linked} `
    + `type-checked, and bundled — ${Object.keys(installedManifest.exports).length} exports.`,
  );
} finally {
  const cleanupPath = relative(tmpdir(), consumerDirectory);
  assert(!cleanupPath.startsWith('..') && !isAbsolute(cleanupPath) && cleanupPath.startsWith('seihouse-narrative-consumer-'));
  await rm(consumerDirectory, { recursive: true, force: true });
  for (const tarball of tarballs) await rm(tarball, { force: true });
}
