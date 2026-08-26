/**
 * Verifies the SEN / Library package boundary in source, before anything is
 * bundled.
 *
 * The finalize step greps the built output; this walks the real import graph
 * from every published entry, so a violation is reported at the file that
 * introduces it instead of as a string inside a bundle. It enforces:
 *
 * - no published entry reaches the Workshop shell, a preview, a mock, a
 *   locked `reference/` replica, a test, or `src/server/`;
 * - no `@seihouse/sen` entry reaches a Library-owned surface — SEN never
 *   depends on Library, while Library may depend on SEN;
 * - the remaining DEV mock-application dependencies stay exactly where they
 *   are today. `MOCK_APPLICATION_WAIVERS` is a shrink-only ledger: a new
 *   importer fails the check, and so does a waiver that is no longer needed,
 *   so the list can only get shorter as the host-supplied store lands.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGE_TARGETS } from './packageTargets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * DEV mock application state the Reader, Codex, and Story Seed surfaces still
 * import directly. These are stand-ins for a host's store, audio catalog, and
 * haptics — not a real application — so nothing new may reach them.
 */
const MOCK_APPLICATION_MODULES = [
  'src/components/reader-chamber/shared/stubs.ts',
  'src/components/reader-chamber/shared/readerPlayback.ts',
  'src/components/reader-chamber/shared/trackLibrary.ts',
  'src/components/reader-codex/shared/appStore.ts',
  'src/components/reader-codex/shared/vibration.ts',
  'src/components/story-seed/shared/stubs.ts',
];

/**
 * The exact set of published modules allowed to import the mocks above,
 * recorded when SEN and Library split into separate packages. Replacing these
 * with host-supplied runtime dependencies is tracked in
 * `src/package/README.md`; every entry removed from this list is progress.
 */
const MOCK_APPLICATION_WAIVERS = [
  'src/components/reader-chamber/development/ReaderChamber.tsx',
  'src/components/reader-chamber/development/ReaderControls/AudioMenu.tsx',
  'src/components/reader-chamber/development/ReaderViewport.tsx',
  'src/components/reader-chamber/shared/dialect.ts',
  'src/components/reader-chamber/shared/readerPlayback.ts',
  'src/components/reader-codex/shared/appStore.ts',
  'src/components/reader-codex/shared/codexCompatibility.ts',
  'src/components/reader-codex/shared/vibration.ts',
  'src/components/story-seed/development/BlueprintReview.tsx',
  'src/components/story-seed/development/CreationModal.tsx',
  'src/components/story-seed/development/StoryAuthGate.tsx',
];

const FORBIDDEN_PATTERNS = [
  [/^src\/workshop\//, 'the Workshop shell, a preview, or a preview mock'],
  [/^src\/server\//, 'a server-only module'],
  [/^src\/components\/card-workshop\//, 'the Workshop-only Card Workshop'],
  [/(^|\/)reference\//, 'a locked reference replica'],
  [/\.test\.[cm]?[jt]sx?$/, 'a test module'],
  [/(^|\/)(mockData|previewData|previewStates)\./, 'preview fixture data'],
];

const LIBRARY_OWNED_PATTERNS = [
  [/^src\/components\/closed-door-cultivation\//, 'the Library cultivation surface'],
  [/^src\/components\/relics\//, 'the Library relic economy'],
  [/^src\/package\/library\//, 'a @seihouse/library package entry'],
];

const IMPORT_PATTERN = /(?:^|[\s;}])(?:import|export)\s*(?:[\s\S]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];

const readEntries = target => {
  const directory = join(root, target.sourceDirectory);
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  return Object.values(manifest.exports)
    .map(value => (typeof value === 'string' ? undefined : value.import))
    .filter(Boolean)
    .map(bundle => join(directory, `${bundle.replace(/^\.\/dist\//, '').replace(/\.js$/, '')}.ts`));
};

/** Resolves a relative specifier to a real file, mirroring Vite's lookup. */
const resolveRelative = (fromFile, specifier) => {
  const base = resolve(dirname(fromFile), specifier);
  if (existsSync(base) && !existsSync(join(base, 'index.ts'))) {
    return /\.[a-z]+$/.test(base) ? base : undefined;
  }
  for (const extension of EXTENSIONS) {
    if (existsSync(`${base}${extension}`)) return `${base}${extension}`;
  }
  for (const extension of EXTENSIONS) {
    if (existsSync(join(base, `index${extension}`))) return join(base, `index${extension}`);
  }
  return undefined;
};

/** Resolves a package self-reference (`@seihouse/sen/ui`) to its entry file. */
const resolvePackageSpecifier = specifier => {
  for (const target of Object.values(PACKAGE_TARGETS)) {
    const manifest = JSON.parse(readFileSync(join(root, target.sourceDirectory, 'package.json'), 'utf8'));
    if (specifier === manifest.name) return join(root, target.sourceDirectory, 'index.ts');
    if (specifier.startsWith(`${manifest.name}/`)) {
      const subpath = specifier.slice(manifest.name.length + 1);
      if (subpath.endsWith('.css')) return undefined;
      return join(root, target.sourceDirectory, `${subpath}.ts`);
    }
  }
  return undefined;
};

const collectSpecifiers = source => {
  const specifiers = [];
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2];
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
};

const failures = [];
const usedWaivers = new Set();

const checkTarget = target => {
  const isSen = target.id === 'sen';
  const seen = new Set();
  const queue = readEntries(target).map(file => ({ file, trail: [] }));

  while (queue.length > 0) {
    const { file, trail } = queue.shift();
    const relativePath = relative(root, file).replaceAll('\\', '/');
    if (seen.has(relativePath)) continue;
    seen.add(relativePath);

    if (!existsSync(file)) {
      failures.push(`${target.name}: ${relativePath} is imported by ${trail.at(-1) ?? 'an entry'} but does not exist.`);
      continue;
    }

    const via = trail.at(-1);
    for (const [pattern, label] of FORBIDDEN_PATTERNS) {
      if (pattern.test(relativePath)) {
        failures.push(`${target.name}: ${relativePath} is ${label}, reachable from ${via ?? 'an entry'}.`);
      }
    }
    if (isSen) {
      for (const [pattern, label] of LIBRARY_OWNED_PATTERNS) {
        if (pattern.test(relativePath)) {
          failures.push(
            `${target.name}: ${relativePath} is ${label} — SEN must never depend on Library `
            + `(reached from ${via ?? 'an entry'}).`,
          );
        }
      }
    }
    if (relativePath.endsWith('.css') || relativePath.endsWith('.json')) continue;

    for (const specifier of collectSpecifiers(readFileSync(file, 'utf8'))) {
      const resolved = specifier.startsWith('.')
        ? resolveRelative(file, specifier)
        : resolvePackageSpecifier(specifier);
      if (!resolved) continue;
      const resolvedPath = relative(root, resolved).replaceAll('\\', '/');
      // Mock dependencies are recorded per import edge, not per module, so
      // every importer of a mock is accounted for even when another importer
      // pulled it into the graph first.
      if (MOCK_APPLICATION_MODULES.includes(resolvedPath)) {
        if (MOCK_APPLICATION_WAIVERS.includes(relativePath)) usedWaivers.add(relativePath);
        else {
          failures.push(
            `${target.name}: ${relativePath} imports DEV mock application state (${resolvedPath}). `
            + 'A published surface must take its store, audio catalog, and haptics from the host.',
          );
        }
      }
      // A Library entry that links against SEN stops at the boundary: the SEN
      // package verifies its own graph.
      if (!isSen && relative(root, resolved).replaceAll('\\', '/').startsWith('src/package/sen/')) continue;
      queue.push({ file: resolved, trail: [...trail, relativePath] });
    }
  }
};

for (const target of Object.values(PACKAGE_TARGETS)) checkTarget(target);

for (const waiver of MOCK_APPLICATION_WAIVERS) {
  if (!usedWaivers.has(waiver)) {
    failures.push(
      `stale mock waiver: ${waiver} no longer imports DEV mock application state. `
      + 'Remove it from MOCK_APPLICATION_WAIVERS so the ledger keeps shrinking.',
    );
  }
}

if (failures.length > 0) {
  for (const failure of [...new Set(failures)].sort()) console.error(`[package-boundaries] ${failure}`);
  console.error(`[package-boundaries] ${new Set(failures).size} boundary violation(s).`);
  process.exit(1);
}

console.log(
  `[package-boundaries] ${Object.keys(PACKAGE_TARGETS).length} packages verified — `
  + `no Workshop, preview, mock, reference, test, or server module is reachable, `
  + `and no @seihouse/sen entry reaches @seihouse/library. `
  + `${MOCK_APPLICATION_WAIVERS.length} recorded DEV mock dependencies remain.`,
);
