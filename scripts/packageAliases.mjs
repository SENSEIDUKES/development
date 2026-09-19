import { fileURLToPath } from 'node:url';
import { packageEntries } from './ownershipGraph.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
/** Exact public entries only: an undeclared subpath cannot be resolved by a wildcard. */
export const packageAliases = Object.values(packageEntries(root)).flatMap(pkg =>
  Object.entries(pkg.entries).map(([name, file]) => ({ find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), replacement: fileURLToPath(new URL(`../${file}`, import.meta.url)) })),
);
for (const owner of ['sen', 'library']) packageAliases.unshift({ find: new RegExp(`^@seihouse/${owner}/styles\\.css$`), replacement: fileURLToPath(new URL(`../src/package/${owner}/styles.css`, import.meta.url)) });
