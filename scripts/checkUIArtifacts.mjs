import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = (file) =>
  JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const manifest = readJson('package.json');
const lock = readJson('package-lock.json');
const provenance = readJson('vendor/ui-artifacts.json');
assert.match(provenance.sourceCommit, /^[a-f0-9]{40}$/);
assert.equal(provenance.repository, 'https://github.com/SENSEIDUKES/UI');
for (const name of ['ui', 'library-ui']) {
  const packageName = `@seihouse/${name}`;
  const file = `vendor/seihouse-${name}-0.4.0.tgz`;
  const integrity = `sha512-${createHash('sha512')
    .update(readFileSync(path.join(root, file)))
    .digest('base64')}`;
  assert.equal(manifest.dependencies[packageName], `file:${file}`);
  assert.equal(lock.packages[`node_modules/${packageName}`].version, '0.4.0');
  assert.equal(
    lock.packages[`node_modules/${packageName}`].integrity,
    integrity,
  );
  assert.equal(provenance.artifacts[packageName].integrity, integrity);
  assert.equal(provenance.artifacts[packageName].file, file);
}
console.log(
  '[ui-artifacts] UI and Library UI 0.4.0 tarballs match the manifest, lockfile SHA-512 integrity, and source provenance.',
);
