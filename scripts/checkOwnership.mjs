import { fileURLToPath } from 'node:url';
import { buildGraph, validateOwnership } from './ownershipGraph.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { graph, packages } = buildGraph(root);
const { failures, closures } = validateOwnership(graph, packages);
for (const failure of failures) console.error(`[ownership] ${failure}`);
console.log(`[ownership] ${graph.size} source files; ${Object.entries(closures).map(([owner, files]) => `${owner}: ${files.size} reachable`).join('; ')}; ${failures.length} violations`);
if (failures.length && !process.argv.includes('--audit')) process.exitCode = 1;
