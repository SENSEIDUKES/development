import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../..');
// A Tailwind utility (a variant like `max-lg:`, or a core utility root) as
// opposed to the app's own named classes, which do not depend on the scan.
const TAILWIND_UTILITY = /(^|[\s`])(-?[a-z-]+:[^\s`]+|-?(p[trblxy]?|m[trblxy]?|w|h|size|min|max|flex|grid|gap|items|justify|self|text|bg|border|rounded|shadow|opacity|translate|scale|rotate|top|bottom|left|right|inset|z|overflow|font|leading|tracking|space|order|col|row)-[^\s`$]+|hidden|block|flex|grid|relative|absolute|fixed)\$\{/;

/**
 * Tailwind finds classes by scanning source text, so a class written flush
 * against a template expression (`max-lg:translate-y-0${…}`) is never
 * generated. That silently dropped the phone layout of every WorkspaceSheet
 * (2026-10-13): the sheet kept the dialog's centering shift and opened half
 * off the top of the screen. Keep a space between a class and `${`.
 */
describe('className template literals', () => {
  it('never glue a Tailwind class to a template expression', () => {
    const offenders = (readdirSync(SRC, { recursive: true }) as string[])
      .filter(file => file.endsWith('.tsx') && !file.includes('.test.'))
      .flatMap(file => readFileSync(join(SRC, file), 'utf8').split('\n')
        .map((line, index) => ({ line, at: `${file}:${index + 1}` }))
        .filter(({ line }) => line.includes('className={`') && TAILWIND_UTILITY.test(line))
        .map(({ at }) => at));
    expect(offenders).toEqual([]);
  });
});
