import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/* Real-layout coverage for the LibraryTierBadge inside the Cave rank row.
   Runs the two plain stylesheets in Chromium without the Vite server. Set
   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH when Playwright's bundled browser is not
   installed; the suite reports itself skipped when no browser can launch. */

const read = (file: string) => readFileSync(join(process.cwd(), 'src/components/user-profile/development', file), 'utf8');
const LABELS = [
  'Mortal',
  'Inner Sect',
  'Sect Master',
  'Grand Celestial Sect Master Immortal Patron of the Eastern Library',
  'Unbrokentiernamewithoutanyspacesatallwhatsoever',
];

const markup = (label: string, plaque = '#05070c') => `<!doctype html><html><head><meta name="viewport" content="width=device-width">
<style>${read('library-tier-badge.css')}</style>
<style>${read('userProfile.css')}</style>
<style>html, body { margin: 0; background: ${plaque}; } .plaque { box-sizing: border-box; padding: 1rem; }</style>
</head><body><div class="plaque"><div class="cave-home-rank-row" data-cave-rank-row>
<p data-cave-rank style="margin:0;font:1rem serif;color:#eee">Leader</p>
<span class="library-tier-badge cave-tier-badge" data-slot="library-tier-badge" data-sheen="occasional" aria-label="Subscription tier: ${label}">
<span class="library-tier-badge__label">${label}</span></span>
</div></div></body></html>`;

let browser: Browser | undefined;
let page: Page;

beforeAll(async () => {
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
  } catch (error) {
    console.warn(`LibraryTierBadge browser checks skipped: ${(error as Error).message.split('\n')[0]}`);
    return;
  }
  page = await browser.newPage();
});

afterAll(async () => {
  await browser?.close();
});

const geometry = () => page.evaluate(() => {
  const plaque = document.querySelector('.plaque')!.getBoundingClientRect();
  const row = document.querySelector('[data-cave-rank-row]')!.getBoundingClientRect();
  const rank = document.querySelector('[data-cave-rank]')!.getBoundingClientRect();
  const badge = document.querySelector('[data-slot="library-tier-badge"]') as HTMLElement;
  const rect = badge.getBoundingClientRect();
  const style = getComputedStyle(badge);
  const sheen = getComputedStyle(badge, '::after');
  return {
    overflow: document.documentElement.scrollWidth > innerWidth,
    plaque: { left: plaque.left, right: plaque.right, width: plaque.width },
    row: { left: row.left, right: row.right },
    rank: { left: rank.left, right: rank.right, width: rank.width },
    badge: { left: rect.left, right: rect.right, width: rect.width, height: rect.height },
    radius: style.borderRadius,
    letterSpacing: style.letterSpacing,
    sheenAnimation: sheen.animationName,
    sheenDisplay: sheen.display,
    backdropFilter: style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter'),
    background: style.backgroundImage,
    rim: (() => {
      const ring = getComputedStyle(badge, '::before');
      return { background: ring.backgroundImage, mask: ring.maskImage, composite: ring.maskComposite, padding: ring.paddingTop };
    })(),
  };
});

describe('LibraryTierBadge in the browser', () => {
  it.each([320, 360, 390, 768])('keeps every tier name inside the rank row at %ipx', async width => {
    if (!browser) return;
    await page.setViewportSize({ width, height: 800 });
    for (const label of LABELS) {
      await page.setContent(markup(label));
      const shape = await geometry();
      const detail = `${label} @ ${width}px ${JSON.stringify(shape)}`;
      expect(shape.overflow, detail).toBe(false);
      expect(shape.badge.left, detail).toBeGreaterThanOrEqual(shape.row.left - 0.5);
      expect(shape.badge.right, detail).toBeLessThanOrEqual(shape.row.right + 0.5);
      expect(shape.badge.width, detail).toBeLessThanOrEqual(shape.plaque.width);
      expect(shape.badge.height, detail).toBeGreaterThanOrEqual(24);
      expect(shape.radius, detail).toBe('999px');
      expect(shape.rank.width, detail).toBeGreaterThan(0);
      if (width >= 380) {
        // The rank stays centred in its own column; the badge never shifts it.
        const rowCentre = (shape.row.left + shape.row.right) / 2;
        const rankCentre = (shape.rank.left + shape.rank.right) / 2;
        expect(Math.abs(rankCentre - rowCentre), detail).toBeLessThanOrEqual(1);
      }
    }
  });

  it('plays the occasional sheen, and drops it for reduced motion while keeping the finish', async () => {
    if (!browser) return;
    await page.setViewportSize({ width: 390, height: 800 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setContent(markup('Inner Sect'));
    const moving = await geometry();
    expect(moving.sheenAnimation).toBe('library-tier-badge-sheen');
    expect(moving.sheenDisplay).toBe('block');
    expect(moving.letterSpacing).not.toBe('normal');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const still = await geometry();
    expect(still.sheenAnimation).toBe('none');
    // The material is identical: same capsule, same rim, same halo.
    const finish = () => page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('[data-slot="library-tier-badge"]')!);
      return { background: style.backgroundImage, shadow: style.boxShadow, color: style.color };
    });
    const reducedFinish = await finish();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(reducedFinish).toEqual(await finish());
    expect(reducedFinish.color).toBe('rgb(16, 21, 29)');
    expect(reducedFinish.shadow).toContain('rgba(212, 175, 55');
    await page.emulateMedia({ reducedMotion: null });
  });

  it('honours the static sheen option', async () => {
    if (!browser) return;
    await page.setContent(markup('Immortal').replace('data-sheen="occasional"', 'data-sheen="none"'));
    expect((await geometry()).sheenDisplay).toBe('none');
  });

  it('reads as glass: the pane is translucent and blurs what sits behind it', async () => {
    if (!browser) return;
    await page.setViewportSize({ width: 390, height: 800 });
    await page.setContent(markup('Inner Sect'));
    const style = await geometry();
    expect(style.backdropFilter).toContain('blur');
    expect(style.backdropFilter).toContain('saturate');
    // Every interior stop keeps an alpha below 1, so the plaque shows through.
    expect(style.background).toMatch(/rgba\(/);
    expect(style.background).not.toMatch(/rgba\([^)]*,\s*1\)/);
    // The rim is a masked 1px ring, so it stays a lit edge instead of washing
    // its gradient across the translucent pane.
    expect(style.rim.background).toContain('linear-gradient');
    // One composite value per mask layer, both excluding the ring's centre.
    expect(style.rim.composite.split(',').map(value => value.trim())).toEqual(['exclude', 'exclude']);
    expect(style.rim.padding).toBe('1px');

    // Prove transmission by rendering the identical badge over two different
    // plaques: a solid pane would paint the same pixels either way. The sheen
    // is off so nothing but the backdrop can move between the two shots.
    const shoot = async (plaque: string) => {
      await page.setContent(markup('Inner Sect', plaque).replace('data-sheen="occasional"', 'data-sheen="none"'));
      return page.locator('[data-slot="library-tier-badge"]').screenshot();
    };
    const overDark = await shoot('#05070c');
    const overDarkAgain = await shoot('#05070c');
    const overBright = await shoot('#c81e78');
    expect(overDark.equals(overDarkAgain), 'the same plaque renders identically').toBe(true);
    expect(overDark.equals(overBright), 'a different plaque shows through the glass').toBe(false);
  });
});
