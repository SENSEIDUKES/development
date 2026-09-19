import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { buildGraph, validateOwnership } from './ownershipGraph.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { graph, packages, sources } = buildGraph(root);
const { failures, closures } = validateOwnership(graph, packages, undefined, undefined, sources);
for (const [owner, pkg] of Object.entries(packages)) {
  const documentation = readFileSync(new URL(`../src/package/${owner}/README.md`, import.meta.url), 'utf8');
  for (const key of Object.keys(pkg.manifest.exports)) {
    const specifier = pkg.manifest.name + (key === '.' ? '' : key.slice(1));
    if (!documentation.includes('`' + specifier + '`') && !documentation.includes('`' + key + '`') && key !== '.') failures.push(`UNDOCUMENTED_EXPORT ${specifier}`);
  }
  for (const match of documentation.matchAll(new RegExp('`' + pkg.manifest.name.replace('/', '\\/') + '(\\/[^`]+)`', 'g'))) {
    const key = '.' + match[1];
    if (!Object.hasOwn(pkg.manifest.exports, key)) failures.push(`STALE_DOCUMENTED_EXPORT ${pkg.manifest.name}${match[1]}`);
  }
}
for (const failure of failures) console.error(`[ownership] ${failure}`);
console.log(`[ownership] ${graph.size} source files; ${Object.entries(closures).map(([owner, files]) => `${owner}: ${files.size} reachable`).join('; ')}; ${failures.length} violations`);
if (failures.length && !process.argv.includes('--audit')) process.exitCode = 1;
