import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { parse } from '@babel/parser';
import { ownershipOf, requiredCapabilities } from './ownershipInventory.mjs';

export function sourceFiles(root, directory = 'src') {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(root, path) : /\.(?:[cm]?[jt]sx?|css|json)$/.test(path) ? [path] : [];
  });
}

export function importSpecifiers(source, file = 'module.tsx') {
  if (file.endsWith('.css')) return [...source.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(match => match[1]);
  if (file.endsWith('.json')) return [];
  const result = new Set();
  const ast = parse(source, { sourceType: 'unambiguous', plugins: ['typescript', 'jsx'], createImportExpressions: true });
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type) && node.source?.type === 'StringLiteral') result.add(node.source.value);
    if (node.type === 'TSImportType' && node.argument?.type === 'StringLiteral') result.add(node.argument.value);
    if (node.type === 'CallExpression' && (node.callee.type === 'Import' || node.callee.name === 'require') && node.arguments[0]?.type === 'StringLiteral') result.add(node.arguments[0].value);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'comments', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
  return [...result];
}

export function packageEntries(root) {
  return Object.fromEntries(['sen', 'library'].map(owner => {
    const directory = `src/package/${owner}`;
    const manifest = JSON.parse(readFileSync(resolve(root, directory, 'package.json'), 'utf8'));
    return [owner, { manifest, entries: Object.fromEntries(Object.entries(manifest.exports).filter(([, value]) => value.import).map(([key, value]) => [manifest.name + (key === '.' ? '' : key.slice(1)), `${directory}/${value.import.replace('./dist/', '').replace(/\.js$/, '.ts')}`])) }];
  }));
}

export function buildGraph(root) {
  const packages = packageEntries(root);
  const entries = Object.assign({}, ...Object.values(packages).map(pkg => pkg.entries));
  const resolveImport = (from, specifier) => {
    if (entries[specifier]) return entries[specifier];
    if (!specifier.startsWith('.')) return undefined;
    const base = resolve(root, dirname(from), specifier);
    for (const candidate of [base, ...['.ts', '.tsx', '.js', '.jsx', '.css', '.json'].map(ext => base + ext), ...['index.ts', 'index.tsx', 'index.js'].map(index => resolve(base, index))]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return relative(root, candidate).replaceAll('\\', '/');
    }
    return undefined;
  };
  const graph = new Map(sourceFiles(root).map(file => [file, importSpecifiers(readFileSync(resolve(root, file), 'utf8'), file).map(specifier => ({ specifier, target: resolveImport(file, specifier) }))]));
  return { graph, packages };
}

export function stronglyConnected(graph) {
  let next = 0;
  const indices = new Map(), low = new Map(), stack = [], active = new Set(), cycles = [];
  function visit(node) {
    indices.set(node, next); low.set(node, next++); stack.push(node); active.add(node);
    for (const { target } of graph.get(node) ?? []) {
      if (!graph.has(target)) continue;
      if (!indices.has(target)) { visit(target); low.set(node, Math.min(low.get(node), low.get(target))); }
      else if (active.has(target)) low.set(node, Math.min(low.get(node), indices.get(target)));
    }
    if (low.get(node) === indices.get(node)) {
      const group = []; let value;
      do { value = stack.pop(); active.delete(value); group.push(value); } while (value !== node);
      if (group.length > 1) cycles.push(group.sort());
    }
  }
  for (const node of graph.keys()) if (!indices.has(node)) visit(node);
  return cycles;
}

export function validateOwnership(graph, packages, classify = ownershipOf, required = requiredCapabilities) {
  const failures = [], closures = {};
  for (const [file, imports] of graph) {
    const source = classify(file);
    if (!source) { failures.push(`UNOWNED ${file}`); continue; }
    if (['test', 'tooling'].includes(source.owner) || source.capability === 'locked reference') continue;
    for (const { specifier, target } of imports) {
      const destination = target && classify(target);
      if (['sen', 'library'].includes(source.owner) && /@seihouse\/(sen|library)(\/|$)/.test(specifier) && !target && !specifier.endsWith('.css')) failures.push(`MISSING_EXPORT ${file} -> ${specifier}`);
      if (source.owner === 'sen' && (/^@seihouse\/library(?:-ui)?(?:\/|$)/.test(specifier) || (destination && destination.owner !== 'sen'))) failures.push(`SEN_BOUNDARY ${file} -> ${specifier}`);
      if (source.owner === 'library' && destination && !['sen', 'library'].includes(destination.owner)) failures.push(`LIBRARY_BOUNDARY ${file} -> ${specifier}`);
      if (destination && source.owner !== destination.owner && ['sen', 'library'].includes(destination.owner) && !/^@seihouse\/(sen|library)(\/|$)/.test(specifier)) failures.push(`SOURCE_BYPASS ${file} -> ${target}`);
    }
  }
  for (const [owner, pkg] of Object.entries(packages)) {
    const visited = new Set(), queue = Object.values(pkg.entries), capabilities = new Set();
    while (queue.length) {
      const file = queue.shift();
      if (visited.has(file)) continue;
      visited.add(file);
      if (!graph.has(file)) { failures.push(`MISSING_ENTRY ${file}`); continue; }
      const classification = classify(file);
      if (classification?.owner === owner) capabilities.add(classification.capability);
      for (const edge of graph.get(file)) {
        if (!edge.target) continue;
        if (owner === 'library' && edge.specifier.startsWith('@seihouse/sen')) continue;
        if (classify(edge.target)?.owner !== owner) failures.push(`PUBLISHED_BOUNDARY ${owner}: ${file} -> ${edge.target}`);
        queue.push(edge.target);
      }
    }
    for (const capability of required[owner] ?? []) if (!capabilities.has(capability)) failures.push(`UNEXPORTED ${owner}: ${capability}`);
    closures[owner] = visited;
  }
  const production = new Map([...graph].filter(([file]) => ['sen', 'library'].includes(classify(file)?.owner)));
  for (const group of stronglyConnected(production)) failures.push(`CYCLE ${group.join(' -> ')}`);
  return { failures: [...new Set(failures)].sort(), closures };
}
