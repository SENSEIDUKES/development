import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:5173';
const out = 'output/playwright/material-foundation';
mkdirSync(out, { recursive: true });
const material = element => {
  const s = getComputedStyle(element);
  return [s.backgroundColor, s.backgroundImage, s.backdropFilter, s.borderTopColor, s.boxShadow];
};
const browser = await chromium.launch();
try {
 for (const width of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/app/`);
  await page.getByTestId('novel-expanded-home').waitFor();
  const shell = await page.locator('.workspace-header').evaluate(material);
  const panel = await page.locator('[data-home-panel]').nth(1).evaluate(material);
  const card = await page.locator('[data-slot="empty-state"]').evaluate(material);
  await page.goto(`${base}/?preview=palette-materials`);
  await page.locator('.pm-workbench').waitFor();
  if (width < 650) await page.getByRole('button', { name: /Browse all/ }).click();
  const catalog = page.locator('#pm-material-catalog');
  assert.equal(await catalog.locator('.pm-catalog').first().locator('.pm-sample').count(), 6);
  for (const [id, expected] of [['violet-shell', shell], ['violet-panel', panel], ['violet-card', card]]) {
    assert.deepEqual(await catalog.locator(`[data-pm-recipe="${id}"]`).evaluate(material), expected, `${id} equals actual Home surface`);
  }
  await page.locator('.pm-archive summary').click();
  assert.equal(await page.locator('.pm-archive .pm-sample').count(), 9);
  assert.equal((await catalog.locator('[data-pm-recipe="blue-glass"]').evaluate(material))[0], 'rgba(0, 55, 74, 0.12)', 'Archived blue keeps its original paint');
  assert.equal((await catalog.locator('[data-pm-recipe="smoked-glass"]').evaluate(material))[0], 'rgba(0, 0, 0, 0.35)', 'Archived smoked glass keeps its original paint');
  // Compare every non-color part against the original paints, including gradient alpha/stops.
  const removeRgb = value => value.replace(/rgba?\(([^)]+)\)/g, (_, body) => `rgba(R,G,B,${body.split(',')[3]?.trim() ?? '1'})`);
  for (const [active, archived] of [['violet-panel', 'blue-glass'], ['violet-card', 'smoked-glass']]) {
    const current = await catalog.locator(`[data-pm-recipe="${active}"]`).evaluate(material);
    const previous = await catalog.locator(`[data-pm-recipe="${archived}"]`).evaluate(material);
    assert.deepEqual(current.slice(2), previous.slice(2), 'Blur, borders and shadows are unchanged');
    assert.deepEqual(current.slice(0, 2).map(removeRgb), previous.slice(0, 2).map(removeRgb), `${active}: only RGB changes; opacity, gradients, blur, borders and shadows stay intact`);
  }
  const storedBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('workshop.palette-materials.looks.v1')).looks);
  await catalog.locator('.pm-sample').filter({ has: page.locator('[data-pm-recipe="violet-panel"]') }).locator('button.pm-sample-select').click();
  if (width < 650) await page.getByRole('button', { name: /^Saved/ }).click();
  await page.getByLabel('Look name', { exact: true }).fill('Foundation test');
  await page.getByRole('button', { name: 'Save as new look', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('workshop.palette-materials.looks.v1')));
  assert.equal(saved.version, 3);
  for (const old of storedBefore) assert.deepEqual(saved.looks.find(l => l.id === old.id), old, 'Archived saved work unchanged');
  assert.equal(saved.looks.at(-1).settings.selected, 'violet-panel');
  await page.reload();
  await page.locator('.pm-workbench').waitFor();
  await page.waitForFunction(() => document.querySelector('#pm-mixing-table h3')?.textContent === 'Violet glass');
  if (width < 650) await page.getByRole('button', { name: 'Effects', exact: true }).click();
  else await page.locator('#pm-effects').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#pm-effects article').count(), 6);
  if (width < 650) await page.getByRole('button', { name: /^Saved/ }).click();
  await page.getByRole('button', { name: 'App colors · Default preset', exact: true }).click();
  const composition = page.locator('.pm-scene');
  const fills = await composition.locator('.pm-scene-nav, .pm-scene-panel, .pm-scene-card').evaluateAll(elements => elements.map(e => getComputedStyle(e).backgroundColor));
  assert.ok(fills.every(color => color.match(/[\d.]+/g).slice(0, 3).join(',') === fills[0].match(/[\d.]+/g).slice(0, 3).join(',')), 'Default preset shares hue while retaining role opacity');
  if (width < 650) await page.getByRole('button', { name: 'Effects', exact: true }).click();
  else await page.locator('#pm-effects').scrollIntoViewIfNeeded();
  const action = page.locator('#pm-effects [data-library-material="rainbow-action"]').first();
  await action.focus();
  assert.equal(await action.evaluate(e => e === document.activeElement), true);
  assert.notEqual(await action.evaluate(e => getComputedStyle(e, '::after').backgroundImage), 'none');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal page overflow');
  await page.screenshot({ path: `${out}/effects-${width}.png` });
  assert.deepEqual(errors, []);
  await page.close();
 }
 console.log('Foundation matches Home; six active/nine archived materials, effects, saved-look preservation and mobile checks passed.');
} finally { await browser.close(); }
