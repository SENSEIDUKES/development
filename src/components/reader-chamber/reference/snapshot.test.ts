/**
 * Keeps the production Reader snapshot locked.
 *
 * `light-novels/` holds production's Reader exactly as Light-Novels main had
 * it on the commit recorded in snapshot.json. Every verbatim file must still
 * match production's fingerprint; the few seams that stand in for production
 * services must say so. Refreshing the snapshot is an owner decision, made by
 * copying production again and regenerating snapshot.json, never by editing a
 * copied file.
 *
 * Git stores text with LF endings, and a Windows checkout with
 * `core.autocrlf=true` rewrites those endings to CRLF on the way out. The
 * recorded fingerprints are production's bytes as Git stores them, so the
 * comparison here canonicalizes line endings and normalizes path separators
 * before it compares. Without that, the same untouched copy fails on Windows
 * and passes on CI.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
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

/**
 * The bytes Git holds for a file: LF endings, and a binary file's bytes left
 * exactly as they are.
 */
const canonicalBytes = (bytes: Buffer): Buffer => {
  if (bytes.includes(0)) return bytes;
  const canonical = Buffer.allocUnsafe(bytes.length);
  let length = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x0d && bytes[i + 1] === 0x0a) {
      canonical[length] = 0x0a;
      length += 1;
      i += 1;
      continue;
    }
    canonical[length] = bytes[i];
    length += 1;
  }
  return canonical.subarray(0, length);
};

/** A path the way the snapshot records it: forward slashes, on every platform. */
const snapshotPath = (from: string, to: string): string => relative(from, to).split(sep).join('/');

const sha256 = (file: string) => createHash('sha256').update(canonicalBytes(readFileSync(file))).digest('hex');
const filesUnder = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? filesUnder(full) : [full];
});

describe('production Reader snapshot', () => {
  it('records one production commit', () => {
    expect(snapshot.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('canonicalizes line endings and leaves binary bytes alone', () => {
    expect(canonicalBytes(Buffer.from('a\r\nb\r\n')).equals(Buffer.from('a\nb\n'))).toBe(true);
    expect(canonicalBytes(Buffer.from('a\nb\n')).equals(Buffer.from('a\nb\n'))).toBe(true);
    // A binary file keeps every byte it arrived with.
    const binary = Buffer.from([0x00, 0x0d, 0x0a, 0xff]);
    expect(canonicalBytes(binary).equals(binary)).toBe(true);
  });

  it('keeps every copied production file byte-for-byte unchanged', () => {
    const changed = snapshot.files
      .filter((file) => file.role === 'verbatim')
      .filter((file) => sha256(join(copy, file.path)) !== file.productionSha256)
      .map((file) => file.path);
    expect(changed).toEqual([]);
  });

  it('lists every file in the copy, and nothing that is missing', () => {
    const present = filesUnder(copy).map((file) => snapshotPath(copy, file)).sort();
    expect(present).toEqual(snapshot.files.map((file) => file.path).sort());
  });

  it('marks every stand-in as a Workshop seam', () => {
    const seams = [
      ...snapshot.files.filter((file) => file.role === 'seam').map((file) => join(copy, file.path)),
      ...Object.values(snapshot.packageSeams).map((path) => join(root, path)),
    ];
    for (const seam of seams) {
      expect(existsSync(seam)).toBe(true);
      expect(readFileSync(seam, 'utf8').replace(/\r\n/g, '\n').startsWith('/**\n * WORKSHOP SEAM')).toBe(true);
    }
  });
});
