import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'src/components/library-shell/capture-manifest.json'), 'utf8'));
const digest = (path, binary = false) => createHash('sha256').update(binary
  ? readFileSync(resolve(root, path))
  : readFileSync(resolve(root, path), 'utf8').replaceAll('\r\n', '\n')).digest('hex');
const errors = [];
for (const file of manifest.files) {
  if (digest(file.capture) !== file.captureSha256) errors.push(`Locked capture changed: ${file.capture}`);
}
for (const file of manifest.dependencies) {
  if (digest(file.path, file.binary) !== file.sha256) errors.push(`Capture dependency drifted: ${file.path}`);
}
for (const font of manifest.fontAssets ?? []) {
  if (digest(font.path, true) !== font.sha256) errors.push(`Capture font drifted: ${font.path}`);
}
function inspect(directory) {
  for (const entry of readdirSync(resolve(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) inspect(path);
    else if (/\.[jt]sx?$/.test(path)) {
      const text = readFileSync(resolve(root, path), 'utf8');
      if (/\bfetch\s*\(|\b(?:localStorage|sessionStorage|indexedDB)\b|from\s+['"][^'"]*(?:firebase|\/store\/|\/server\/|storySeedRepository)/.test(text)) {
        errors.push(`Production dependency entered capture: ${path}`);
      }
      if (/from\s+['"][^'"]*story-seed\/development/.test(text)) errors.push(`Capture imports live Story Seed: ${path}`);
    }
  }
}
inspect('src/components/library-shell');
inspect('src/workshop/previews/library-shell');
if (errors.length) throw new Error(errors.join('\n'));
console.log(`[library-shell] ${manifest.files.length} locked captures, ${manifest.dependencies.length} dependencies, and ${(manifest.fontAssets ?? []).length} fonts verified; no production data or live Story Seed implementation imports.`);
