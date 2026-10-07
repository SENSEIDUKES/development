/**
 * Keeps the production Reader snapshot locked.
 *
 * `light-novels/` holds production's Reader exactly as Light-Novels main had
 * it on the commit recorded in snapshot.json. Every verbatim file must still
 * match production's fingerprint; the few seams that stand in for production
 * services must say so. Refreshing the snapshot is an owner decision, made by
 * copying production again and regenerating snapshot.json, never by editing a
 * copied file.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface SnapshotFile {
  path: string;
  role: 'verbatim' | 'seam';
  productionSha256: string;
}

const root = fileURLToPath(new URL('./', import.meta.url));
const copy = join(root, 'light-novels');
const snapshot = JSON.parse(readFileSync(join(root, 'snapshot.json'), 'utf8')) as {
  commit: string;
  files: SnapshotFile[];
  packageSeams: Record<string, string>;
};
const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const filesUnder = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? filesUnder(full) : [full];
});

describe('production Reader snapshot', () => {
  it('records one production commit', () => {
    expect(snapshot.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('keeps every copied production file byte-for-byte unchanged', () => {
    const changed = snapshot.files
      .filter((file) => file.role === 'verbatim')
      .filter((file) => sha256(join(copy, file.path)) !== file.productionSha256)
      .map((file) => file.path);
    expect(changed).toEqual([]);
  });

  it('lists every file in the copy, and nothing that is missing', () => {
    const present = filesUnder(copy).map((file) => relative(copy, file)).sort();
    expect(present).toEqual(snapshot.files.map((file) => file.path).sort());
  });

  it('marks every stand-in as a Workshop seam', () => {
    const seams = [
      ...snapshot.files.filter((file) => file.role === 'seam').map((file) => join(copy, file.path)),
      ...Object.values(snapshot.packageSeams).map((path) => join(root, path)),
    ];
    for (const seam of seams) {
      expect(existsSync(seam)).toBe(true);
      expect(readFileSync(seam, 'utf8').startsWith('/**\n * WORKSHOP SEAM')).toBe(true);
    }
  });
});
