import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../..');

/** Every generation owner that must stay unaware of Energy in this phase. */
const GENERATION_OWNERS = [
  'src/server/chapter-generation',
  'src/server/harness-generation',
  'src/server/story-seed-blueprint',
  'src/server/reader-translation',
  'src/server/audio',
  'src/components/chapter-generation',
  'src/components/harness-generation',
  'src/components/chapter-manifestation',
  'src/components/story-seed',
];

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap(entry => {
  const full = path.join(directory, entry);
  if (statSync(full).isDirectory()) return sourceFiles(full);
  return /\.(ts|tsx|mts|mjs|js)$/.test(entry) ? [full] : [];
});

describe('Energy integration boundary', () => {
  it('is not invoked by any existing generation path', () => {
    const offenders = GENERATION_OWNERS.flatMap(owner => sourceFiles(path.join(root, owner)))
      .filter(file => /(?:from|import)\s*\(?\s*['"][^'"]*\/energy(?:\/|['"])/.test(readFileSync(file, 'utf8')))
      .map(file => path.relative(root, file));
    expect(offenders).toEqual([]);
  });

  it('keeps the generation API bundles free of the Energy ledger', () => {
    for (const script of ['buildChapterGenerationApi.mjs', 'buildHarnessGenerationApi.mjs']) {
      expect(readFileSync(path.join(root, 'scripts', script), 'utf8')).not.toMatch(/energy/i);
    }
  });
});
