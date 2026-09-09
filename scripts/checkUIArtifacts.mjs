import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Minimal tar reader, so the installed copy can be compared without adding a
 * dependency. Returns the archive's regular files keyed by their path with the
 * leading `package/` stripped.
 */
function readTarball(file) {
  const archive = gunzipSync(readFileSync(file));
  const files = new Map();
  for (let offset = 0; offset + 512 <= archive.length; ) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim() || '0', 8);
    const type = String.fromCharCode(header[156]);
    offset += 512;
    if (type === '0' || type === '\0') {
      files.set(`${prefix ? `${prefix}/` : ''}${name}`.replace(/^package\//, ''), archive.subarray(offset, offset + size));
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return files;
}

/**
 * Every regular file under `directory`, as paths relative to it. A nested
 * `node_modules` is skipped: npm may legitimately place a non-hoistable
 * dependency there, and it is not part of the published package.
 */
function readInstalled(directory, prefix = '') {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...readInstalled(path.join(directory, entry.name), `${relative}/`));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

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
// The vendored tarballs keep the same name and version across UI commits, so
// `npm install` over a restored `node_modules` reports "up to date" and leaves
// the previous build installed. Compare what is actually on disk, so a stale
// install fails here with an explanation instead of surfacing as a missing
// export halfway through a typecheck.
for (const name of ['ui', 'library-ui']) {
  const packageName = `@seihouse/${name}`;
  const installed = path.join(root, 'node_modules', packageName);
  if (!existsSync(installed)) continue;
  const tarball = `vendor/seihouse-${name}-0.4.0.tgz`;
  const entries = readTarball(path.join(root, tarball));
  const stale = [];
  for (const [entry, content] of entries) {
    const file = path.join(installed, entry);
    if (!existsSync(file) || !readFileSync(file).equals(content)) stale.push(entry);
  }
  // Both directions. A file the previous build shipped and this one dropped
  // survives in node_modules, and comparing only the tarball's own entries
  // would call that a match — the exact staleness this check exists to catch.
  for (const entry of readInstalled(installed)) {
    if (!entries.has(entry)) stale.push(`${entry} (not in the tarball)`);
  }
  assert.equal(
    stale.length,
    0,
    `${packageName} in node_modules does not match ${tarball} (${stale.length} file(s) differ, first: ${stale[0]}). Run \`npm ci\` — \`npm install\` will not replace a same-version file: dependency.`,
  );
}

console.log(
  '[ui-artifacts] UI and Library UI 0.4.0 tarballs match the manifest, lockfile SHA-512 integrity, source provenance, and the installed packages.',
);
