#!/usr/bin/env node
/** Profile accent save/reset and Home's V2 appearance, on a running dev server. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173';
const output = 'output/playwright/profile-accent';
mkdirSync(output, { recursive: true });
const results = [];
const browser = await chromium.launch();
const settings = '/app/?page=profile&cave=/settings';
const openAccent = async page => {
  const trigger = page.locator('[data-slot="disclosure-trigger"]').filter({ hasText: 'Accent color' });
  await trigger.waitFor();
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  return trigger;
};
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}${settings}`);
    await page.locator('[data-cave-settings]').waitFor();
    await page.locator('#cave-display-name').fill('Keep draft');
    const trigger = await openAccent(page);
    const picker = page.getByLabel('Accent color', { exact: true });
    const originalNode = await picker.elementHandle();
    await picker.fill('#a78bfa');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(await originalNode.evaluate(element => element === document.querySelector('input[aria-label="Accent color"]')), true, 'Picking must not remount settings');
    assert.equal(await page.locator('#cave-display-name').inputValue(), 'Keep draft', 'Unfinished identity edits stay in the form');
    assert.equal(await page.locator('.library-custom-accent').first().evaluate(element => getComputedStyle(element).getPropertyValue('--library-accent')), '#a78bfa');
    assert.ok((await picker.boundingBox()).height >= 44);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/settings-${width}.png` });
    await page.reload();
    await openAccent(page);
    assert.equal(await picker.inputValue(), '#a78bfa', 'Accent survives reload');
    assert.notEqual(await page.locator('#cave-display-name').inputValue(), 'Keep draft', 'Picking must not save a name draft');
    await page.goto(`${base}/app/`);
    await page.getByTestId('novel-expanded-home').waitFor();
    assert.equal(await page.locator('.home-filter-label').evaluate(element => getComputedStyle(element).color), 'rgb(167, 139, 250)');
    const chrome = await page.locator('.workspace-header').evaluate(element => {
      const style = getComputedStyle(element);
      return { image: style.backgroundImage, color: style.backgroundColor };
    });
    assert.equal(chrome.color, 'rgba(11, 14, 30, 0.9)');
    const panelImage = await page.locator('[data-home-panel]').nth(1).evaluate(element => getComputedStyle(element).backgroundImage);
    assert.equal(await page.getByRole('button', { name: 'Carve New Destiny', exact: true }).evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0.95)');
    await page.screenshot({ path: `${output}/home-${width}.png` });
    await page.goto(`${base}/app/?page=create&seed=new`);
    const seed = page.locator('.seed-field-scope .glass-panel').first();
    await seed.waitFor();
    const rgbStops = value => value.replace(/rgba?\(([^)]+)\)/g, (_, channels) => `rgb(${channels.split(',').slice(0, 3).join(',')})`);
    // Story Seed's panels are the look's outer panels: the same gradient as Home's.
    assert.equal(rgbStops(await seed.evaluate(element => getComputedStyle(element).backgroundImage)), rgbStops(panelImage), 'Story Seed panels share the look\'s outer-panel gradient colors and stops');
    assert.equal(await seed.evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(11, 14, 30, 0.35)', 'Story Seed wears the look: its panels are outer panels');
    // The Profile Workshop shares the control, with its separate mock profile.
    await page.goto(`${base}/?preview=user-profile&cave=/settings`);
    await openAccent(page);
    await page.getByLabel('Accent color', { exact: true }).fill('#e68ba5');
    // The Cave's own scope sits inside the look's (whose gold stays until a reader saves an accent).
    assert.equal(await page.locator('.library-custom-accent').last().evaluate(element => getComputedStyle(element).getPropertyValue('--library-accent')), '#e68ba5');
    await page.goto(`${base}${settings}`);
    await openAccent(page);
    assert.equal(await picker.inputValue(), '#a78bfa', 'Workshop edits do not replace the app preference');
    await page.getByRole('button', { name: 'Use original colors', exact: true }).click();
    const accents = () => page.locator('.library-custom-accent').evaluateAll(elements => elements.map(element => getComputedStyle(element).getPropertyValue('--library-accent')));
    assert.deepEqual(await accents(), ['#c9a24a'], 'Only the look\'s own gold remains');
    assert.equal(await page.getByRole('button', { name: 'Use original colors', exact: true }).isDisabled(), true);
    await page.reload();
    await page.locator('[data-cave-settings]').waitFor();
    assert.deepEqual(await accents(), ['#c9a24a'], 'Reset survives reload');
    assert.deepEqual(errors, []);
    results.push({ width, saved: true, reset: true, draftPreserved: true, settingsStayOpen: true, blackButtons: true, sharedSeedMaterial: true, workshopIsolated: true });
    await context.close();
  }
} finally { await browser.close(); }
writeFileSync(`${output}/verification.json`, JSON.stringify(results, null, 2));
console.log('Profile accent checks passed:', results);
