// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LibraryTierBadge } from './LibraryTierBadge';
import { auraTextContrastRatio } from './qi';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const css = readFileSync(join(process.cwd(), 'src/components/user-profile/development/library-tier-badge.css'), 'utf8');
const cssVariable = (name: string) => css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
const block = (selector: string) => {
  const start = css.indexOf(selector);
  expect(start, `${selector} rule present`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
};

let container: HTMLDivElement;
let root: Root;

const render = (ui: React.ReactElement) => act(() => root.render(ui));
const badge = () => container.querySelector('[data-slot="library-tier-badge"]') as HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
});

describe('LibraryTierBadge', () => {
  it('renders the tier label inside a plain, non-interactive capsule', async () => {
    await render(<LibraryTierBadge aria-label="Subscription tier: Inner Sect">Inner Sect</LibraryTierBadge>);
    const element = badge();
    expect(element.tagName).toBe('SPAN');
    expect(element.textContent).toBe('Inner Sect');
    expect(element.className).toBe('library-tier-badge');
    expect(element.getAttribute('aria-label')).toBe('Subscription tier: Inner Sect');
    expect(element.getAttribute('data-sheen')).toBe('occasional');
    // The badge is presentation only: no role, no focus stop, no handlers.
    expect(element.getAttribute('role')).toBeNull();
    expect(element.getAttribute('tabindex')).toBeNull();
    expect(element.closest('button, a, [role="button"]')).toBeNull();
    expect(element.querySelector('svg, img')).toBeNull();
  });

  it('merges a host layout class and forwards span attributes', async () => {
    await render(<LibraryTierBadge className="cave-tier-badge" data-testid="tier" title="Inner Sect">Inner Sect</LibraryTierBadge>);
    expect(badge().className).toBe('library-tier-badge cave-tier-badge');
    expect(badge().getAttribute('data-testid')).toBe('tier');
    expect(badge().getAttribute('title')).toBe('Inner Sect');
  });

  it.each([
    'Mortal',
    'Sect Master',
    'Grand Celestial Sect Master Immortal Patron of the Eastern Library',
    'Unbrokentiernamewithoutanyspacesatallwhatsoever',
    '內門弟子🌟',
    '<img src=x onerror=alert(1)>',
  ])('renders the dynamic label %s as text only', async label => {
    await render(<LibraryTierBadge>{label}</LibraryTierBadge>);
    expect(badge().querySelector('.library-tier-badge__label')?.textContent).toBe(label);
    expect(badge().querySelector('img')).toBeNull();
  });

  it('can switch the sheen off for hosts that want the static material', async () => {
    await render(<LibraryTierBadge sheen="none">Immortal</LibraryTierBadge>);
    expect(badge().getAttribute('data-sheen')).toBe('none');
    expect(block('[data-sheen="none"])::after')).toContain('display: none');
  });

  it('keeps dark lettering on the champagne interior at AAA contrast', () => {
    const ink = cssVariable('--ltb-ink')!;
    for (const surface of ['--ltb-ivory-high', '--ltb-ivory', '--ltb-ivory-low']) {
      expect(auraTextContrastRatio(ink, cssVariable(surface)!), surface).toBeGreaterThanOrEqual(7);
    }
  });

  it('uses the SEN sans typography with slightly widened tracking', () => {
    const rule = block(':where(.library-tier-badge) {');
    expect(rule).toContain('font-family: var(--font-sans');
    expect(rule).toMatch(/letter-spacing: 0\.0[6-9]em/);
    expect(rule).not.toContain('text-transform');
  });

  it('wraps long tier names inside the capsule instead of overflowing', () => {
    const rule = block(':where(.library-tier-badge) {');
    expect(rule).toContain('max-width: 100%');
    expect(rule).toContain('min-width: 0');
    expect(rule).toContain('overflow-wrap: anywhere');
    expect(rule).not.toContain('white-space: nowrap');
  });

  it('builds the premium finish from material, lighting, and depth only', () => {
    const rule = block(':where(.library-tier-badge) {');
    expect(rule).toContain('border-radius: 999px');
    expect(rule).toContain('padding-box');
    expect(rule).toContain('border-box');
    expect(rule).toContain('inset 0 1px 0 rgb(255 255 255');
    expect(rule).toMatch(/0 0 \d+px rgb\(212 175 55/);
    expect(rule).toMatch(/0 0 \d+px rgb\(4 172 255/);
    expect(css).toContain('--ltb-violet');
    expect(css).not.toMatch(/clip-path|polygon\(|url\(/);
  });

  it('removes only the moving sheen for reduced-motion users', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('::after');
    expect(reduced).toContain('animation: none');
    // The lit surface (rim, halo, inner highlight) is declared outside the
    // media query and is therefore untouched by the fallback.
    expect(reduced).not.toContain('box-shadow');
    expect(reduced).not.toContain('background');
    // One short sweep, then a long rest: the sheen crosses within the first
    // fifth of the cycle and holds off-surface for the remainder.
    const keyframes = css.slice(css.indexOf('@keyframes library-tier-badge-sheen'));
    expect(keyframes).toMatch(/16%\s*\{\s*transform: translateX\(130%\)/);
    expect(keyframes).toMatch(/100%\s*\{\s*transform: translateX\(130%\)/);
  });

  it('adds no hover or pressed response, since the profile badge is not interactive', () => {
    expect(css).not.toMatch(/:hover|:active|:focus/);
  });
});
