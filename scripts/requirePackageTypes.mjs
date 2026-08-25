/**
 * Guards a package build that type-checks against another package's published
 * declarations.
 *
 * `@Seihouse/Library` resolves `@seihouse/sen/*` to SEN's emitted `.d.ts`
 * files rather than SEN source, so Library never re-emits a second copy of the
 * engine's types. That makes SEN's declarations a build input; without this
 * guard a missing SEN build surfaces as an opaque "Cannot find module
 * '@seihouse/sen/ui'" from `tsc`.
 *
 * Usage: `node scripts/requirePackageTypes.mjs <target> requires <dependency>`
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTarget } from './packageTargets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolveTarget(process.argv[2]);

for (const id of target.typeDependencies ?? []) {
  const dependency = resolveTarget(id);
  const types = join(root, dependency.distDirectory, 'dist/types', dependency.sourceDirectory.replace('src/', ''));
  if (existsSync(types)) continue;
  console.error(
    `[${target.id}-package] ${target.name} type-checks against ${dependency.name}'s published `
    + `declarations, which are not built yet (${types.slice(root.length + 1)} is missing).\n`
    + `[${target.id}-package] Run "npm run build:package" to build both in order, or `
    + `"npm run build:package:${dependency.id}" first.`,
  );
  process.exit(1);
}
