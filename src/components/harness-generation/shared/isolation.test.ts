import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const featureRoot = join(process.cwd(), 'src', 'components', 'harness-generation');
const packageEntry = join(process.cwd(), 'src', 'package', 'sen', 'harness-generation.ts');
const forbidden = [
  'chapter-generation',
  'story-seed',
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
  it('keeps legacy generation and Story Seed outside the Harness; SEN enters only through the adapter and Reader session', () => {
    for (const file of [...sourceFiles(featureRoot), packageEntry]) {
      for (const specifier of importsOf(file)) {
        if (/reader-chamber|reader-codex/.test(specifier)) {
          expect(/(?:senAdapter\.ts|HarnessReaderSession\.tsx)$/.test(file), `Unexpected SEN edge: ${file}`).toBe(true);
        }
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
