import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { parse } from '@babel/parser';
import { ownershipOf, requiredCapabilities } from './ownershipInventory.mjs';

export function sourceFiles(root, directory = 'src') {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(root, path) : /\.(?:[cm]?[jt]sx?|css|json|sql)$/.test(path) ? [path] : [];
  });
}

export function importSpecifiers(source, file = 'module.tsx') {
  if (file.endsWith('.css')) return [...source.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(match => match[1]);
  if (/\.(json|sql)$/.test(file)) return [];
  const result = new Set();
  const ast = parse(source, { sourceType: 'unambiguous', sourceFilename: file, plugins: [['typescript', { dts: /\.d\.[cm]?ts$/.test(file) }], 'jsx'], createImportExpressions: true });
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
    return [owner, { manifest, styles: manifest.exports['./styles.css'] ? [`${directory}/styles.css`] : [], entries: Object.fromEntries(Object.entries(manifest.exports).filter(([, value]) => value.import).map(([key, value]) => [manifest.name + (key === '.' ? '' : key.slice(1)), `${directory}/${value.import.replace('./dist/', '').replace(/\.js$/, '.ts')}`])) }];
  }));
}

export function buildGraph(root) {
  const packages = packageEntries(root);
  const entries = Object.assign({}, ...Object.values(packages).map(pkg => pkg.entries));
  for (const owner of ['sen', 'library']) entries[`@seihouse/${owner}/styles.css`] = `src/package/${owner}/styles.css`;
  const resolveImport = (from, specifier) => {
    if (entries[specifier]) return entries[specifier];
    if (!specifier.startsWith('.')) return undefined;
    const base = resolve(root, dirname(from), specifier);
    for (const candidate of [base, ...['.ts', '.tsx', '.js', '.jsx', '.css', '.json'].map(ext => base + ext), ...['index.ts', 'index.tsx', 'index.js'].map(index => resolve(base, index))]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return relative(root, candidate).replaceAll('\\', '/');
    }
    return undefined;
  };
  const files = ['src', 'api', 'database', 'scripts'].filter(directory => existsSync(resolve(root, directory))).flatMap(directory => sourceFiles(root, directory));
  const sources = new Map(files.map(file => [file, readFileSync(resolve(root, file), 'utf8')]));
  const graph = new Map(files.map(file => [file, importSpecifiers(sources.get(file), file).map(specifier => ({ specifier, target: resolveImport(file, specifier) }))]));
  return { graph, packages, sources };
}

/** Inspect code, not comments: a renamed file cannot hide a Workshop default. */
export function validateSourcePolicy(source, file, owner) {
  if (!['sen', 'library'].includes(owner) || /\.(css|json|sql)$/.test(file)) return [];
  const violations = new Set();
  const ast = parse(source, { sourceType: 'unambiguous', plugins: ['typescript','jsx'], createImportExpressions: true });
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Identifier' && ['localStorage','sessionStorage','indexedDB','mockStore','mockData','previewData','setMockState','useMockStore'].includes(node.name)) violations.add('HOST_DEFAULT');
    if (node.type === 'StringLiteral' && (/workshop[.:/]|previewData|mockData/i.test(node.value) || (owner === 'sen' && /celestialaudio\.seihouse|\/api\/|library-auth-backdrop|manifest-backdrops\/|@seihouse\/library/.test(node.value)))) violations.add('HOST_LITERAL');
    if ((node.type === 'ImportExpression' && node.source.type !== 'StringLiteral') || (node.type === 'CallExpression' && node.callee.name === 'require' && node.arguments[0]?.type !== 'StringLiteral')) violations.add('DYNAMIC_IMPORT');
    for (const [key,value] of Object.entries(node)) {
      if (['loc','start','end','comments','leadingComments','trailingComments','innerComments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(ast);
  return [...violations].map(code => `${code} ${file}`);
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

export function validateOwnership(graph, packages, classify = ownershipOf, required = requiredCapabilities, sources = new Map()) {
  const failures = [], closures = {};
  const packageGraph = new Map(Object.values(packages).filter(pkg => pkg.manifest).map(({ manifest }) => [manifest.name, Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies }).map(target => ({ target }))]));
  for (const group of stronglyConnected(packageGraph)) failures.push(`PACKAGE_CYCLE ${group.join(' -> ')}`);
  for (const { target } of packageGraph.get('@seihouse/sen') ?? []) if (/^@seihouse\/library(?:-ui)?$/.test(target)) failures.push(`PACKAGE_DIRECTION @seihouse/sen -> ${target}`);
  for (const [file, imports] of graph) {
    const source = classify(file);
    if (!source) { failures.push(`UNOWNED ${file}`); continue; }
    if (['test', 'tooling'].includes(source.owner) || source.capability === 'locked reference') continue;
    failures.push(...validateSourcePolicy(sources.get(file) ?? '', file, source.owner));
    for (const { specifier, target } of imports) {
      const destination = target && classify(target);
      if (['sen','library'].includes(source.owner)) {
        if (specifier.startsWith('.') && !target) failures.push(`MISSING_SOURCE ${file} -> ${specifier}`);
        const manifest = packages[source.owner]?.manifest;
        if (manifest && !specifier.startsWith('.')) {
          const packageName = specifier.startsWith('@') ? specifier.split('/').slice(0,2).join('/') : specifier.split('/')[0];
          // CSS build directives are compiled away; runtime modules never use devDependencies.
          const declared = { ...(file.endsWith('.css') ? manifest.devDependencies : {}), ...manifest.dependencies, ...manifest.peerDependencies };
          if (packageName !== manifest.name && !Object.hasOwn(declared, packageName)) failures.push(`UNDECLARED_DEPENDENCY ${file} -> ${packageName}`);
        }
      }
      if (['sen', 'library'].includes(source.owner) && /@seihouse\/(sen|library)(\/|$)/.test(specifier) && !target && !specifier.endsWith('.css')) failures.push(`MISSING_EXPORT ${file} -> ${specifier}`);
      if (source.owner === 'sen' && (/^@seihouse\/library(?:-ui)?(?:\/|$)/.test(specifier) || (destination && destination.owner !== 'sen'))) failures.push(`SEN_BOUNDARY ${file} -> ${specifier}`);
      if (source.owner === 'library' && destination && !['sen', 'library'].includes(destination.owner)) failures.push(`LIBRARY_BOUNDARY ${file} -> ${specifier}`);
      if (destination && source.owner !== destination.owner && ['sen', 'library'].includes(destination.owner) && !/^@seihouse\/(sen|library)(\/|$)/.test(specifier)) failures.push(`SOURCE_BYPASS ${file} -> ${target}`);
    }
  }
  for (const [owner, pkg] of Object.entries(packages)) {
    const visited = new Set(), queue = [...Object.values(pkg.entries), ...(pkg.styles ?? [])], capabilities = new Set();
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
    for (const file of graph.keys()) if (classify(file)?.owner === owner && !visited.has(file)) failures.push(`UNREACHABLE ${owner}: ${file}`);
  }
  const production = new Map([...graph].filter(([file]) => ['sen', 'library'].includes(classify(file)?.owner)));
  for (const group of stronglyConnected(production)) failures.push(`CYCLE ${group.join(' -> ')}`);
  return { failures: [...new Set(failures)].sort(), closures };
}
