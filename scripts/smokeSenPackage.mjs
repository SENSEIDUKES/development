/**
 * Packs the finished `@seihouse/sen` artifact, installs it into a fresh local
 * consumer, and bundles every advertised JavaScript entry with Vite. This
 * validates the browser distribution boundary rather than importing source
 * files from the repo.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = join(root, 'dist/sen');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is unavailable; run this check through npm run test:package.');
const consumerDirectory = await mkdtemp(join(root, '.sen-package-smoke-'));
let tarballPath;

const run = (command, args, cwd) => execFileSync(command, args, {
  cwd,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
const runNpm = (args, cwd) => run(process.execPath, [npmCli, ...args], cwd);

try {
  const packed = JSON.parse(runNpm(['pack', '--json'], packageDirectory))[0];
  tarballPath = join(packageDirectory, packed.filename);
  const packedPaths = packed.files.map(file => file.path.replaceAll('\\', '/'));
  const forbiddenAsset = packedPaths.find(path => path.startsWith('dist/card-workshop/'));
  if (forbiddenAsset) throw new Error(`packed Workshop-only asset: ${forbiddenAsset}`);

  await writeFile(join(consumerDirectory, 'package.json'), JSON.stringify({
    name: 'sen-package-smoke-consumer',
    private: true,
    type: 'module',
  }, null, 2));
  runNpm(['install', '--ignore-scripts', '--legacy-peer-deps', tarballPath], consumerDirectory);

  const checks = {
    '@seihouse/sen': ['LibraryPanel', 'SEN_PACKAGE_VERSION'],
    '@seihouse/sen/library': ['LibraryPanel', 'ManifestButton'],
    '@seihouse/sen/reader-chamber': [
      'ReaderChamber',
      'ReaderViewport',
      'SystemBlock',
      'WorldNotice',
      'FateResultCard',
      'resolveSystemPromptRoute',
    ],
    '@seihouse/sen/reader-codex': ['ReaderCodex', 'CodexSheetOverlay'],
    '@seihouse/sen/codex-cards': ['CodexCard', 'CodexHovercard'],
    '@seihouse/sen/manifestations': ['ManifestationChamber', 'ManifestationReveal'],
    '@seihouse/sen/relics': ['RelicCard', 'RelicReveal'],
    '@seihouse/sen/audio': ['loadLibraryCues', 'resolveWorldCueIntent'],
    '@seihouse/sen/closed-door-cultivation': ['ClosedDoorCultivationModal'],
    '@seihouse/sen/story-seed': ['CreationModal', 'createEmptyStorySeedInput', 'parseStorySeedJson'],
    '@seihouse/sen/chapter-generation': ['ChapterGenerationTestFlow', 'adaptFinalizedStorySeedToChapterContracts', 'runFiveChapterBatch'],
  };
  const imports = [];
  const bindings = [];
  let bindingIndex = 0;
  for (const [specifier, names] of Object.entries(checks)) {
    const specifierBindings = names.map(name => {
      const binding = `senSmoke${bindingIndex++}`;
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
  await writeFile(join(consumerDirectory, 'src/typecheck.ts'), `
    import type { ClosedDoorCultivationModalProps } from '@seihouse/sen/closed-door-cultivation';
    import type { CreationModalProps, StorySeedInput } from '@seihouse/sen/story-seed';
    import type { FiveChapterBatchState, ManifestChapterRequest } from '@seihouse/sen/chapter-generation';
    import type {
      FateResultCardProps,
      SystemBlockProps,
      SystemPromptRoute,
      SystemPromptRoutePresentation,
      WorldNoticeProps,
    } from '@seihouse/sen/reader-chamber';
    declare const cultivation: ClosedDoorCultivationModalProps;
    declare const creation: CreationModalProps;
    declare const seed: StorySeedInput;
    declare const batch: FiveChapterBatchState;
    declare const request: ManifestChapterRequest;
    declare const fateResultCard: FateResultCardProps;
    declare const systemBlock: SystemBlockProps;
    declare const systemRoute: SystemPromptRoute;
    declare const systemRoutePresentation: SystemPromptRoutePresentation;
    declare const worldNotice: WorldNoticeProps;
    void [cultivation, creation, seed, batch, request, fateResultCard, systemBlock, systemRoute, systemRoutePresentation, worldNotice];
  `);
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

  const installedManifest = JSON.parse(await readFile(
    join(consumerDirectory, 'node_modules/@seihouse/sen/package.json'),
    'utf8',
  ));
  console.log(
    `[sen-package-smoke] @seihouse/sen@${installedManifest.version} packed, installed, type-checked, and bundled — `
    + `${Object.keys(installedManifest.exports).length} exports.`,
  );
} finally {
  await rm(consumerDirectory, { recursive: true, force: true });
  if (tarballPath) await rm(tarballPath, { force: true });
}
