import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const featureRoot = join(process.cwd(), 'src', 'components', 'harness-generation');
const packageEntry = join(process.cwd(), 'src', 'package', 'sen', 'harness-generation.ts');
const forbidden = [
  'chapter-generation',
  'story-seed',
  'reader-chamber',
  'reader-codex',
  'cards',
  'system-prompt',
];

const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return sourceFiles(path);
  return /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')
    ? [path]
    : [];
});

const importsOf = (file: string) => [...readFileSync(file, 'utf8').matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)]
  .map(match => match[1]);

describe('Harness Generation isolation boundary', () => {
  it('has no import edge to legacy generation or host-owned Story Seed, Reader, Codex, cards, or System Prompt code', () => {
    for (const file of [...sourceFiles(featureRoot), packageEntry]) {
      for (const specifier of importsOf(file)) {
        for (const denied of forbidden) {
          expect(
            specifier.toLowerCase(),
            `${relative(process.cwd(), file)} imports forbidden ${denied} boundary`,
          ).not.toContain(denied);
        }
      }
    }
  });
});
