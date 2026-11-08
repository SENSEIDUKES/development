/**
 * Packs a finished package artifact — `@seihouse/sen` or `@seihouse/library` —
 * installs it into a fresh local consumer alongside the packages it depends
 * on, then type-checks its public contracts and bundles every advertised
 * JavaScript entry with Vite. This validates the browser distribution
 * boundary rather than importing source files from the repo, and for Library
 * it proves the Library → SEN link resolves through the published packages.
 *
 * For `@seihouse/front-desk` it proves the package stands alone: no SEN, no
 * Library, and a controller that runs on a host's own docs and actions.
 *
 * Usage: `node scripts/smokePackage.mjs <front-desk|sen|library>`
 */
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
/**
 * The SEIHouse audio player is installed from GitHub, not a registry, so the
 * consumer gets the exact build this repository locks, packed from
 * node_modules (never resolved by name from a public registry).
 */
const packAudioPlayer = async () => {
  const installed = join(root, 'node_modules/@seihouse/audio-player');
  const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  const copy = join(consumerDirectory, '.audio-player');
  await mkdir(copy, { recursive: true });
  // Its published files only, and no scripts: packing must never rebuild it.
  for (const entry of manifest.files) await cp(join(installed, entry), join(copy, entry), { recursive: true });
  delete manifest.scripts;
  await writeFile(join(copy, 'package.json'), JSON.stringify(manifest, null, 2));
  const packed = JSON.parse(runNpm(['pack', '--json', '--pack-destination', consumerDirectory], copy))[0];
  return join(consumerDirectory, packed.filename);
};

try {
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
  const peers = ['react', 'react-dom', 'react-focus-lock', 'lucide-react', 'motion', '@types/react', '@types/react-dom'].map(name => name + '@' + lock.packages['node_modules/' + name].version);
  const dependencyTarballs = target.smokeDependencies.map(id => pack(resolveTarget(id)));
  const tarballPath = pack(target);
  // Front Desk needs no audio player: it is installed without one.
  const frontDesk = target.id === 'front-desk';
  const audioPlayer = frontDesk ? undefined : await packAudioPlayer();

  await writeFile(join(consumerDirectory, 'package.json'), JSON.stringify({
    name: `${target.id}-package-smoke-consumer`,
    private: true,
    type: 'module',
    // The locked audio build still declares UI 0.10.1; validate the host's scoped override.
    overrides: { '@seihouse/audio-player': { '@seihouse/ui': `file:${join(root, 'vendor/seihouse-ui-0.12.0.tgz')}` } },
  }, null, 2));
  runNpm(
    ['install', '--ignore-scripts', ...peers, join(root, 'vendor/seihouse-ui-0.12.0.tgz'), ...(target.id === 'library' ? [join(root, 'vendor/seihouse-library-ui-0.10.1.tgz'), join(root, 'vendor/library-studios-brand-0.1.0.tgz')] : []), ...(audioPlayer ? [audioPlayer] : []), ...dependencyTarballs, tarballPath],
    consumerDirectory,
  );

  if (frontDesk) {
    // A host of its own: its docs, its actions, its code letters and its wording, run in Node.
    await writeFile(join(consumerDirectory, 'front-desk-smoke.mjs'), `
      import assert from 'node:assert/strict';
      import { FrontDeskController, FRONT_DESK_PACKAGE_VERSION } from '@seihouse/front-desk';
      import { lookUpDocs } from '@seihouse/front-desk/docs-knowledge';
      const docs = [{ id: 'help', title: 'Help', description: 'How the app works', topics: [{ id: 'stamps', title: 'Stamps', aliases: ['stamp'], definition: 'A stamp marks a page you liked.' }] }];
      assert.equal(lookUpDocs(docs, 'stamps')[0].topic.id, 'stamps');
      const spoken = [];
      const voice = { available: true, listen: () => ({ stop() {}, cancel() {} }), speak: (text, _language, done) => { spoken.push(text); done(); return () => {}; } };
      let saved = 0;
      const save = { id: 'save', label: 'Save', phrases: ['save it'], describe: () => 'Save this page.', success: 'Saved.', run: async () => { saved += 1; }, code: { letter: 'P', number: 2 } };
      const desk = new FrontDeskController(voice, 'en-US', undefined, { docs, codes: { P: ['p', 'page'] }, wording: { spoilerOffer: 'More later.' } });
      desk.setContext(Symbol('page'), { key: 'reading', title: 'Reading', topics: [], actions: [save], hint: 'Say save it.' });
      desk.open();
      // Explain answers from the host's own docs.
      desk.setMode('explain');
      desk.submit('stamps');
      assert.match(desk.getSnapshot().message, /A stamp marks a page you liked/);
      // An action is proposed first, and "back" backs out of it without running it.
      desk.setMode('action');
      desk.submit('save it');
      assert.equal(desk.getSnapshot().proposal?.actionId, 'save');
      desk.submit('back');
      assert.equal(desk.getSnapshot().proposal, undefined);
      assert.equal(saved, 0);
      // Its own code letters: "page two" names the action; confirming runs it.
      desk.submit('page two');
      assert.equal(desk.getSnapshot().proposal?.actionId, 'save');
      await desk.confirm();
      assert.equal(saved, 1);
      assert.equal(typeof FRONT_DESK_PACKAGE_VERSION, 'string');
    `);
    run(process.execPath, ['front-desk-smoke.mjs'], consumerDirectory);
  }

  // Native ESM also proves Library's provider and SEN's root resolve the same
  // context across the package boundary, without a bundler alias or host CSS.
  if (!frontDesk) await writeFile(join(consumerDirectory, 'presentation-smoke.mjs'), `
    import assert from 'node:assert/strict';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { NarrativePresentationProvider, NarrativeTextBox } from '@seihouse/sen';
    ${target.id === 'library' ? "import { LibraryPresentationProvider, LibraryAtmosphereIcon, LibrarySoundscapeIcon, LIBRARY_ICON_CATALOG } from '@seihouse/library/presentation';" : ''}
    const field = createElement(NarrativeTextBox, { label: 'World', defaultValue: 'Astral' });
    const publisherBrand = props => createElement('label', { 'data-publisher-brand': 'independent' }, props.label, createElement('input', { defaultValue: props.defaultValue }));
    const html = renderToStaticMarkup(${target.id === 'library' ? 'createElement(LibraryPresentationProvider, { assets: { emblem: "https://library.example/emblem.svg" } }, field)' : 'createElement(NarrativePresentationProvider, { components: { NarrativeTextBox: publisherBrand } }, field)'});
    assert.match(html, /Astral/);
    ${target.id === 'library' ? `
    assert.equal(LIBRARY_ICON_CATALOG.length, 54);
    assert.equal(typeof LibraryAtmosphereIcon, 'function');
    assert.equal(typeof LibrarySoundscapeIcon, 'function');
    for (const icon of LIBRARY_ICON_CATALOG.filter(icon => icon.source === 'bundled')) {
      const markup = renderToStaticMarkup(createElement(icon.Icon, { size: 32, 'aria-label': icon.label }));
      assert.ok(markup.includes('width="32"') && markup.includes('role="img"') && markup.includes('currentColor'));
    }` : ''}

    assert.equal(html.includes('glass-field'), ${target.id === 'library'});
    assert.equal(html.includes('data-publisher-brand="independent"'), ${target.id === 'sen'});
  `);
  if (!frontDesk) run(process.execPath, ['presentation-smoke.mjs'], consumerDirectory);

  if (target.id === 'library') {
    await writeFile(join(consumerDirectory, 'model-router-smoke.mjs'), `
      import assert from 'node:assert/strict';
      import { createModelRouter, ModelRouterError } from '@seihouse/library/model-router-server';
      const fetchMock = async (_url, init) => {
        assert.equal(init.headers.Authorization, 'Bearer packed-key');
        return new Response(JSON.stringify({ choices: [{ message: { content: 'packed-result' } }] }), { status: 200 });
      };
      const router = createModelRouter({ credentials: { openrouter: 'packed-key' }, fetch: fetchMock });
      const result = await router.generate({ capability: 'text', model: 'openrouter/openai/gpt-6-luna', systemInstruction: 's', userPrompt: 'u', temperature: 0, maxOutputTokens: 100, timeoutMs: 1000, responseFormat: 'text' });
      assert.equal(result.text, 'packed-result');
      assert.equal(result.provider, 'openrouter');
      assert.equal(typeof ModelRouterError, 'function');
    `);
    run(process.execPath, ['model-router-smoke.mjs'], consumerDirectory);
  }

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

  if (target.id === 'library') {
    // The Familiar's card is Front Desk's: the installed Library's Familiar loads Front Desk's own stylesheet, which holds the card's styles.
    const installed = join(consumerDirectory, 'node_modules/@seihouse');
    assert((await readFile(join(installed, 'library/dist/familiar.js'), 'utf8')).includes('import "@seihouse/front-desk/styles.css"'), "the Library's Familiar must load Front Desk's stylesheet");
    assert((await readFile(join(installed, 'front-desk/dist/front-desk.css'), 'utf8')).includes('.familiar-helper{'), "Front Desk's stylesheet must hold the card's styles");
    await writeFile(join(consumerDirectory, 'src/forbidden-browser-import.js'),
      "import { createModelRouter } from '@seihouse/library/model-router-server'; document.body.textContent = String(createModelRouter);");
    await writeFile(join(consumerDirectory, 'index.html'),
      '<div id="app"></div><script type="module" src="/src/forbidden-browser-import.js"></script>');
    run(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--logLevel', 'silent'], consumerDirectory);
    const browserAssets = await readdir(join(consumerDirectory, 'dist/assets'));
    const browserScript = browserAssets.find(name => name.endsWith('.js'));
    assert(browserScript, 'browser smoke must produce a JavaScript bundle');
    const browserOutput = await readFile(join(consumerDirectory, 'dist/assets', browserScript), 'utf8');
    assert(browserOutput.includes('server-only'), 'browser import must include the server-only guard');
    assert(!browserOutput.includes('openrouter.ai') && !browserOutput.includes('api.elevenlabs.io') && !browserOutput.includes('generativelanguage.googleapis.com'), 'browser bundle must not contain provider implementations');
  }
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
    // The SEIHouse audio player is SEN's sound (a peer), installed at the exact build this repository locks.
    const audioPlayer = JSON.parse(await readFile(join(consumerDirectory, 'node_modules/@seihouse/audio-player/package.json'), 'utf8'));
    assert.equal(audioPlayer.version, lock.packages['node_modules/@seihouse/audio-player'].version);
  }
  if (frontDesk) {
    // It stands alone: no SEN or Library in its manifest or beside it.
    assert(!/@seihouse\/(sen|library)/.test(JSON.stringify(installedManifest)));
    const { existsSync } = await import('node:fs');
    for (const other of ['sen', 'library', 'library-ui', 'audio-player']) assert(!existsSync(join(consumerDirectory, 'node_modules/@seihouse', other)), `@seihouse/${other} must not be installed`);
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
