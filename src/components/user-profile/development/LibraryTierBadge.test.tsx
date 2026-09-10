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
const cssVariable = (name: string) => css.match(new RegExp(`${name}:\\s*([^;]+);`, 'i'))?.[1].trim();

/** The glass pane is translucent, so its rendered colour is the composite of
    the declared stop over whatever sits behind the badge. */
const compositeOver = (declaration: string, backdrop: string) => {
  const translucent = declaration.match(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/);
  if (!translucent) return declaration;
  const [red, green, blue, alpha] = translucent.slice(1).map(Number);
  const behind = [1, 3, 5].map(offset => Number.parseInt(backdrop.slice(offset, offset + 2), 16));
  const channel = (value: number, under: number) => Math.round(value * alpha + under * (1 - alpha));
  return `#${[channel(red, behind[0]), channel(green, behind[1]), channel(blue, behind[2])]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')}`;
};
const block = (selector: string) => {
  const start = css.indexOf(selector);
  expect(start, `${selector} rule present`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
};

/** Every interior stop of the glass pane, brightest first. */
const GLASS_STOPS = ['--ltb-glass-high', '--ltb-glass-crest', '--ltb-glass-mid', '--ltb-glass-low', '--ltb-glass-bounce'];

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

  it('keeps dark lettering at AAA contrast through the glass, over any backdrop', () => {
    const ink = cssVariable('--ltb-ink')!;
    // Pure black is the worst case for a translucent pale pane: any lighter
    // backdrop composites lighter still, so this bounds every real surface.
    for (const backdrop of ['#000000', '#0d1420', '#1a2740']) {
      for (const stop of GLASS_STOPS) {
        const surface = compositeOver(cssVariable(stop)!, backdrop);
        expect(auraTextContrastRatio(ink, surface), `${stop} over ${backdrop}`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('renders a translucent, cool-tinted pane rather than a milky fill', () => {
    const alphas = GLASS_STOPS.map(stop => {
      const value = cssVariable(stop)!;
      expect(value, stop).toMatch(/^rgb\(/);
      return Number(value.match(/\/\s*([\d.]+)\s*\)/)![1]);
    });
    // Translucent everywhere, and clearer through the body than at the lit
    // top edge, so the pane refracts instead of reading as one painted tone.
    expect(Math.max(...alphas)).toBeLessThan(1);
    expect(Math.min(...alphas)).toBeLessThan(alphas[0]);
    // Cool tint: the blue channel of each stop is never below the red channel.
    for (const stop of GLASS_STOPS) {
      const [red, , blue] = cssVariable(stop)!.match(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)/)!.slice(1).map(Number);
      expect(blue, stop).toBeGreaterThanOrEqual(red);
    }
  });

  it('refracts the plaque behind it, and firms up where no backdrop filter exists', () => {
    const rule = block(':where(.library-tier-badge) {');
    expect(rule).toContain('backdrop-filter: blur(');
    expect(rule).toContain('-webkit-backdrop-filter: blur(');
    expect(rule).toContain('saturate(');
    const fallback = css.slice(css.indexOf('@supports not'));
    expect(fallback).toContain('--ltb-glass-high');
    const fallbackAlpha = Number(fallback.match(/--ltb-glass-high:[^;]*\/\s*([\d.]+)\s*\)/)![1]);
    const defaultAlpha = Number(cssVariable('--ltb-glass-high')!.match(/\/\s*([\d.]+)\s*\)/)![1]);
    expect(fallbackAlpha).toBeGreaterThan(defaultAlpha);
    expect(fallbackAlpha).toBeLessThan(1);
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
    // The rim is a masked ring, so a translucent pane never lets the rim
    // gradient wash across the capsule's surface.
    const rim = block(':where(.library-tier-badge)::before');
    expect(rim).toContain('background: var(--ltb-rim)');
    expect(rim).toContain('mask-composite: exclude');
    expect(rim).toContain('-webkit-mask-composite: xor');
    const fill = rule.slice(rule.indexOf('\n    background:'));
    expect(fill.slice(0, fill.indexOf(';'))).not.toMatch(/padding-box|border-box/);
    // A specular curve over the pane reads as light on a lens.
    expect(fill).toContain('radial-gradient');
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
