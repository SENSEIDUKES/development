// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// String-based contract test for the inline world-cue stylesheet.
//
// jsdom does not parse external stylesheets, so getComputedStyle returns
// empty strings for properties coming from a CSS file. The cleanest way
// to lock visual-accessibility contract values in this harness is to
// read the file source and assert the resting-state values directly.
//
// This file locks in two contracts:
//  - H3: resting color uses --color-neutral-450 (or lighter) at full
//        opacity, so the visible affordance holds >= 4.5:1 on the
//        Library dark glass (Library Card muted-copy convention).
//  - H4: the ::before hit-area expansion is symmetric (no asymmetric
//        inset-inline form), and the total hit area clears the
//        WCAG 2.5.5 24x24 minimum at 16px base.

// Resolved against process.cwd() at test time, which is the project root
// when vitest is invoked from the package script.
const CSS_PATH = resolve(
  process.cwd(),
  'src/components/reader-chamber/development/InlineAudio.css',
);
const css = readFileSync(CSS_PATH, 'utf8');

// Extract the declaration block (between { and }) for a given CSS
// selector inside source. The selector match is plain-string (not a
// real CSS parser) -- sufficient for this single-file contract test.
// Returns the body of the first matching block, or null if no block
// is found.
function block(source: string, selector: string): string | null {
  const idx = source.indexOf(selector);
  if (idx === -1) return null;
  const openBrace = source.indexOf('{', idx);
  if (openBrace === -1) return null;
  let depth = 1;
  let i = openBrace + 1;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    i += 1;
  }
  if (depth !== 0) return null;
  return source.slice(openBrace + 1, i - 1);
}

// Remove CSS comments so they don't trip up the simple regex
// assertions below.
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Pull the value of a single CSS property declaration from a block body.
// Returns the trimmed value, or null if the property is not present.
function property(blockBody: string, name: string): string | null {
  // Normalize multi-line values to single lines, then walk each
  // "name: value;" declaration separated by semicolons. Keep it
  // deliberately simple -- no regex metacharacters in the property
  // name, no lookbehind/lookahead, no template-interpolated regex
  // literals (oxc has stricter parsing than esbuild on those).
  const flat = blockBody.replace(/\s+/g, ' ');
  const declarations = flat.split(';');
  for (const raw of declarations) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    if (key !== name) continue;
    return trimmed.slice(colon + 1).trim();
  }
  return null;
}

describe('InlineAudio world-cue stylesheet', () => {
  describe('H3 â€” resting contrast', () => {
    it('uses --color-neutral-450 or lighter for the resting color (no neutral-500)', () => {
      const body = block(css, '.inline-world-cue {');
      expect(body).not.toBeNull();
      const cleaned = stripComments(body!);
      const color = property(cleaned, 'color');
      expect(color).not.toBeNull();
      // Allow neutral-450 (chosen) or neutral-400 (one step lighter),
      // or a hex value equivalent to either. Reject neutral-500 and
      // anything below.
      expect(color).toMatch(/var\(--color-neutral-(400|450)\)/);
      expect(color).not.toMatch(/var\(--color-neutral-500/);
    });

    it('does not apply a resting-state opacity below 1 (no 0.68 multiplier)', () => {
      const body = block(css, '.inline-world-cue {');
      expect(body).not.toBeNull();
      const cleaned = stripComments(body!);
      const opacity = property(cleaned, 'opacity');
      // Either absent (defaults to 1) or explicitly 1.
      expect(opacity === null || opacity === '1').toBe(true);
      // The 0.68 resting multiplier must not return.
      expect(cleaned).not.toMatch(/opacity\s*:\s*0\.68/);
    });

    it('keeps a color transition (and removes the now-unused opacity step)', () => {
      const body = block(css, '.inline-world-cue {');
      expect(body).not.toBeNull();
      const cleaned = stripComments(body!);
      const transition = property(cleaned, 'transition');
      expect(transition).not.toBeNull();
      expect(transition).toMatch(/\bcolor\b/);
      // No opacity step in the transition â€” nothing animates it at rest.
      expect(transition).not.toMatch(/\bopacity\b/);
    });
  });

  describe('H4 â€” symmetric touch-target expansion', () => {
    it('uses a symmetric 1-value inset shorthand on the default ::before', () => {
      const body = block(css, '.inline-world-cue::before {');
      expect(body).not.toBeNull();
      const cleaned = stripComments(body!);
      // 1-value inset cannot be asymmetric; reject the old
      // inset-inline: -Xem -Yem form.
      expect(cleaned).not.toMatch(/inset-inline\s*:/);
      expect(cleaned).not.toMatch(/inset-block\s*:/);
      const inset = property(cleaned, 'inset');
      expect(inset).not.toBeNull();
      // 1-value shorthand: exactly one length, no whitespace separators.
      // (no comma in the regex; oxc is happy with it.)
      expect(inset).toMatch(/^-?\d*\.?\d+(?:em|rem|px)$/);
    });

    it('uses a symmetric 1-value inset shorthand on the coarse-pointer ::before', () => {
      // Locate the @media (pointer: coarse) block and then the
      // ::before block inside it.
      const media = block(css, '@media (pointer: coarse) {');
      expect(media).not.toBeNull();
      const before = block(media!, '.inline-world-cue::before {');
      expect(before).not.toBeNull();
      const cleaned = stripComments(before!);
      expect(cleaned).not.toMatch(/inset-inline\s*:/);
      expect(cleaned).not.toMatch(/inset-block\s*:/);
      const inset = property(cleaned, 'inset');
      expect(inset).not.toBeNull();
      expect(inset).toMatch(/^-?\d*\.?\d+(?:em|rem|px)$/);
    });

    it('default hit area is at least 25x25 px at 16px base font (>= 24x24 + safety margin)', () => {
      const body = block(css, '.inline-world-cue::before {');
      expect(body).not.toBeNull();
      const cleaned = stripComments(body!);
      const inset = property(cleaned, 'inset')!;
      const m = inset.match(/^(-?\d*\.?\d+)(em|rem|px)$/);
      expect(m).not.toBeNull();
      const value = Math.abs(parseFloat(m![1]));
      const unit = m![2];
      const baseFontPx = 16;
      const emPx = unit === 'em' || unit === 'rem' ? value * baseFontPx : value;
      // 0.78em visual at 16px = 12.48px; + 2 * |inset| on each axis.
      const visualPx = 0.78 * baseFontPx;
      const hitPx = 2 * emPx + visualPx;
      expect(hitPx).toBeGreaterThanOrEqual(25);
    });

    it('coarse-pointer hit area is at least 28x28 px at 16px base font', () => {
      const media = block(css, '@media (pointer: coarse) {');
      const before = block(media!, '.inline-world-cue::before {');
      expect(before).not.toBeNull();
      const cleaned = stripComments(before!);
      const inset = property(cleaned, 'inset')!;
      const m = inset.match(/^(-?\d*\.?\d+)(em|rem|px)$/);
      expect(m).not.toBeNull();
      const value = Math.abs(parseFloat(m![1]));
      const unit = m![2];
      const baseFontPx = 16;
      const emPx = unit === 'em' || unit === 'rem' ? value * baseFontPx : value;
      const visualPx = 0.78 * baseFontPx;
      const hitPx = 2 * emPx + visualPx;
      expect(hitPx).toBeGreaterThanOrEqual(28);
    });
  });

  describe('regression â€” interactive states still lift', () => {
    it('hover state still uses a brighter neutral than the resting state', () => {
      const body = block(css, '.inline-world-cue:hover {');
      expect(body).not.toBeNull();
      const cleaned = stripComments(body!);
      const color = property(cleaned, 'color');
      expect(color).not.toBeNull();
      // Must be neutral-300 or lighter (e.g. neutral-200).
      expect(color).toMatch(/var\(--color-neutral-(200|300)\)/);
    });

    it('focus-visible state still uses neutral-200 (or lighter) and full opacity', () => {
      const body = block(css, '.inline-world-cue:focus-visible {');
      expect(body).not.toBeNull();
      const cleaned = stripComments(body!);
      const color = property(cleaned, 'color');
      expect(color).toMatch(/var\(--color-neutral-200\)/);
      const opacity = property(cleaned, 'opacity');
      expect(opacity).toBe('1');
    });

    it('playing state still uses a portal-tinted color', () => {
      const body = block(css, ".inline-world-cue[data-state='playing'] {");
      expect(body).not.toBeNull();
      const cleaned = stripComments(body!);
      const color = property(cleaned, 'color');
      expect(color).not.toBeNull();
      expect(color).toMatch(/var\(--color-portal\)/);
    });
  });
});
