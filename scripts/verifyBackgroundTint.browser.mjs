#!/usr/bin/env node
/** Profile-owned background tint, adopting Home roles, and truthful Workshop colors. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:5173';
const output = 'output/playwright/background-tint';
mkdirSync(output, { recursive: true });
const settings = '/app/?page=profile&cave=/settings';
const open = async (page, heading) => {
  const trigger = page.locator('[data-slot="disclosure-trigger"]').filter({ hasText: heading });
  await trigger.waitFor();
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  return trigger;
};
const fill = element => {
  const s = getComputedStyle(element);
  return [s.backgroundColor, s.backgroundImage, s.backdropFilter, s.borderColor];
};
const rainbow = element => {
  const s = getComputedStyle(element, '::after');
  return [s.backgroundImage, s.maskImage, s.filter, s.animationName];
};
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/app/`);
    await page.getByTestId('novel-expanded-home').waitFor();
    const original = await page.locator('.workspace-header').evaluate(fill);
    const panel = await page.locator('[data-home-panel]').nth(1).evaluate(fill);
    const inset = await page.locator('[data-slot="empty-state"]').evaluate(fill);
    assert.equal(panel[0], 'rgba(11, 14, 30, 0.35)', 'V2 outer panels use Violet inset at 35% opacity');
    assert.equal(inset[0], 'rgba(11, 14, 30, 0.9)', 'V2 nested cards use Midnight violet at 90% opacity');
    const cta = page.getByRole('button', { name: 'Carve New Destiny', exact: true });
    const ring = await cta.evaluate(rainbow);
    await page.goto(`${base}${settings}`);
    await open(page, 'Accent color');
    await page.getByLabel('Accent color', { exact: true }).fill('#a78bfa');
    await page.locator('#cave-display-name').fill('Keep draft');
    const trigger = await open(page, 'Background tint');
    const picker = page.getByLabel('Background color', { exact: true });
    const slider = page.getByRole('slider', { name: 'Tint strength', exact: true });
    const node = await slider.elementHandle();
    await picker.fill('#ff69b4');
    await slider.focus(); await slider.press('End');
    await page.waitForFunction(() => document.querySelector('input[aria-label="Tint strength"]')?.value === '100');
    assert.equal(await slider.getAttribute('aria-valuetext'), '100% color');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(await node.evaluate(e => e === document.querySelector('input[aria-label="Tint strength"]')), true, 'Editing keeps the slider mounted');
    assert.equal(await page.locator('#cave-display-name').inputValue(), 'Keep draft');
    const preview = page.getByRole('group', { name: 'Background tint preview' });
    const pink = await preview.evaluate(fill);
    assert.equal(pink[0], 'rgba(50, 21, 35, 0.95)');
    assert.ok((await picker.boundingBox()).height >= 44);
    assert.ok((await slider.boundingBox()).height >= 44);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/settings-${width}.png` });
    await page.reload(); await open(page, 'Background tint');
    await page.waitForFunction(() => document.querySelector('input[aria-label="Background color"]')?.value === '#ff69b4');
    assert.equal(await slider.inputValue(), '100');
    assert.notEqual(await page.locator('#cave-display-name').inputValue(), 'Keep draft');
    await page.goto(`${base}/app/`);
    await page.getByTestId('novel-expanded-home').waitFor();
    for (const selector of ['.workspace-header', '.library-footer', width >= 1024 ? '[data-slot="app-shell-sidebar"]' : '.library-global-navigation > div']) {
      const actual = await page.locator(selector).evaluate(fill);
      assert.equal(actual[0], 'rgba(50, 21, 35, 0.9)', `${selector} consumes shared tint with V2 opacity`);
      assert.equal(actual[2], 'blur(40px)', 'Tint preserves V2 blur');
    }
    const tintedPanel = await page.locator('[data-home-panel]').nth(1).evaluate(fill);
    const tintedInset = await page.locator('[data-slot="empty-state"]').evaluate(fill);
    assert.equal(tintedPanel[0], 'rgba(50, 21, 35, 0.35)', 'Picker recolors panels without changing opacity');
    assert.equal(tintedInset[0], 'rgba(50, 21, 35, 0.9)', 'Picker recolors cards without changing opacity');
    assert.deepEqual(tintedPanel.slice(2), panel.slice(2), 'Panel blur and edge stay intact');
    assert.deepEqual(tintedInset.slice(2), inset.slice(2), 'Card blur and edge stay intact');
    assert.equal(await cta.evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0.95)');
    assert.deepEqual(await cta.evaluate(rainbow), ring, 'Rainbow effects are unchanged');
    assert.equal(await page.locator('.home-filter-label').evaluate(e => getComputedStyle(e).color), 'rgb(167, 139, 250)', 'Background tint preserves the independent accent');
    assert.match(await page.locator('.library-look').evaluate(e => getComputedStyle(e).backgroundImage), /url\(/, 'Artwork remains visible');
    await page.locator('[data-home-events] summary').click();
    const media = await page.locator('.home-event-art, .home-event-body, .world-card-banner-backdrop, .world-card-banner-video').evaluateAll(elements => elements.map(e => [getComputedStyle(e).filter, getComputedStyle(e).backdropFilter]));
    assert.ok(media.length > 0);
    assert.ok(media.every(([filter, backdrop]) => filter === 'none' && backdrop === 'none'));
    await page.screenshot({ path: `${output}/home-${width}.png` });
    // Accessibility fills retain the selected hue and use solid backgrounds.
    if (browser.browserType().name() === 'chromium') {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
      const reduced = await page.locator('.workspace-header').evaluate(fill);
      assert.equal(reduced[0], 'rgb(50, 21, 35)'); assert.equal(reduced[2], 'none');
      for (const selector of ['[data-home-events]', '[data-slot="empty-state"]']) {
        await page.waitForFunction(({ selector, color }) => getComputedStyle(document.querySelector(selector)).backgroundColor === color, { selector, color: reduced[0] });
        const solid = await page.locator(selector).evaluate(fill);
        assert.equal(solid[0], reduced[0]); assert.equal(solid[2], 'none');
      }
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
      assert.equal(await page.locator('.workspace-header').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)');
      await cdp.send('Emulation.setEmulatedMedia', { features: [] });
    }
    await page.goto(`${base}/app/?page=create`);
    await page.locator('.seed-field-scope .glass-panel').first().waitFor();
    assert.equal(await page.locator('.seed-field-scope .glass-panel').first().evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(50, 21, 35, 0.35)', 'Create wears the look: its panels are outer panels and take the shared tint');
    await page.goto(`${base}/app/?page=discover`);
    await page.locator('.discover-medium-switcher').waitFor();
    assert.equal(await page.locator('.workspace-header').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(50, 21, 35, 0.9)', 'Discover wears the look: its header takes the shared tint');
    assert.equal(await page.locator('.discover-medium-switcher').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(50, 21, 35, 0.35)', 'Discover containers are outer panels');
    // The standalone Profile Workshop uses the same controls with its mock profile.
    await page.goto(`${base}/?preview=user-profile&cave=/settings`);
    await open(page, 'Background tint');
    await picker.fill('#00ff00'); await slider.focus(); await slider.press('End');
    assert.equal((await preview.evaluate(fill))[0], 'rgba(0, 50, 0, 0.95)');
    await page.goto(`${base}${settings}`); await open(page, 'Background tint');
    await page.waitForFunction(() => document.querySelector('input[aria-label="Background color"]')?.value === '#ff69b4');
    assert.equal(await slider.inputValue(), '100', 'Workshop did not replace the app preference');
    await slider.focus(); await slider.press('Home');
    assert.equal(await slider.getAttribute('aria-valuetext'), 'Black');
    await page.goto(`${base}/app/`); await page.getByTestId('novel-expanded-home').waitFor();
    assert.equal((await page.locator('.workspace-header').evaluate(fill))[0], 'rgba(0, 0, 0, 0.9)', 'Zero strength offers the black look');
    assert.equal((await page.locator('[data-home-panel]').nth(1).evaluate(fill))[0], 'rgba(0, 0, 0, 0.35)');
    assert.equal((await page.locator('[data-slot="empty-state"]').evaluate(fill))[0], 'rgba(0, 0, 0, 0.9)', 'Zero strength reaches nested cards too');
    await page.goto(`${base}${settings}`); await open(page, 'Background tint');
    await page.getByRole('button', { name: 'Use default background', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Use default background', exact: true }).isDisabled(), true);
    await page.reload(); await open(page, 'Background tint');
    assert.equal(await page.getByRole('button', { name: 'Use default background', exact: true }).isDisabled(), true, 'Reset survives reload');
    await open(page, 'Accent color');
    assert.equal(await page.getByLabel('Accent color', { exact: true }).inputValue(), '#a78bfa');
    const preset = page.getByRole('button', { name: 'App colors · Default', exact: true });
    assert.equal(await preset.getAttribute('aria-pressed'), 'false', 'An independent custom accent is not the full app preset');
    await preset.click();
    assert.equal(await preset.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByLabel('Accent color', { exact: true }).inputValue(), '#04acff');
    await page.reload(); await open(page, 'Background tint');
    assert.equal(await preset.getAttribute('aria-pressed'), 'true', 'App colors preset survives reload');
    await page.goto(`${base}/app/`); await page.getByTestId('novel-expanded-home').waitFor();
    assert.deepEqual(await page.locator('.workspace-header').evaluate(fill), original, 'Reset restores the exact original material, including gradients');
    await page.goto(`${base}/?preview=palette-materials`); await page.locator('.pm-workbench').waitFor();
    if (width < 650) await page.getByRole('button', { name: 'Colors', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('#pm-colors .pm-swatch').length > 20);
    const codes = await page.locator('#pm-colors .pm-swatch code').allTextContents();
    const spectrum = await page.locator('#pm-material-catalog [data-pm-recipe="rainbow-action"]').evaluate(e => getComputedStyle(e, '::after').backgroundImage.match(/rgba?\([^)]+\)/g));
    assert.ok(spectrum.every(color => codes.includes(color)), 'Actual rainbow colors are in Colors');
    assert.ok(codes.includes('rgba(11, 14, 30, 0.95)'), 'Original Midnight violet and alpha are in Colors');
    assert.ok(codes.includes('rgb(255, 255, 255)'), 'Actual material white is in Colors');
    assert.ok(codes.includes('#ffffffb8'), 'Actual supporting white is in Colors');
    assert.ok(codes.includes('#49c9fa66'), 'Reader rim blue and alpha are in Colors');
    await page.screenshot({ path: `${output}/colors-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Passed ${width}px: tint, keyboard, persistence/reset, scope isolation, media and live colors.`);
  }
} finally { await browser.close(); }
