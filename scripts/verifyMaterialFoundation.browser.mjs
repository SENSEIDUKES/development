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
  for (const [id, expected] of [['violet-shell', shell], ['blue-glass', panel], ['smoked-glass', card]]) {
    assert.deepEqual(await catalog.locator(`[data-pm-recipe="${id}"]`).evaluate(material), expected, `${id} equals actual Home surface`);
  }
  await page.locator('.pm-archive summary').click();
  assert.equal(await page.locator('.pm-archive .pm-sample').count(), 7);
  const storedBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('workshop.palette-materials.looks.v1')).looks);
  await catalog.locator('.pm-sample').filter({ has: page.locator('[data-pm-recipe="blue-glass"]') }).locator('button.pm-sample-select').click();
  if (width < 650) await page.getByRole('button', { name: /^Saved/ }).click();
  await page.getByLabel('Look name', { exact: true }).fill('Foundation test');
  await page.getByRole('button', { name: 'Save as new look', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('workshop.palette-materials.looks.v1')));
  assert.equal(saved.version, 2);
  for (const old of storedBefore) assert.deepEqual(saved.looks.find(l => l.id === old.id), old, 'Archived saved work unchanged');
  assert.equal(saved.looks.at(-1).settings.selected, 'blue-glass');
  await page.reload();
  await page.locator('.pm-workbench').waitFor();
  assert.match(await page.locator('#pm-mixing-table h3').textContent(), /Tidal glass/);
  if (width < 650) await page.getByRole('button', { name: 'Effects', exact: true }).click();
  else await page.locator('#pm-effects').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#pm-effects article').count(), 6);
  const action = page.locator('#pm-effects [data-library-material="rainbow-action"]').first();
  await action.focus();
  assert.equal(await action.evaluate(e => e === document.activeElement), true);
  assert.notEqual(await action.evaluate(e => getComputedStyle(e, '::after').backgroundImage), 'none');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal page overflow');
  await page.screenshot({ path: `${out}/effects-${width}.png` });
  assert.deepEqual(errors, []);
  await page.close();
 }
 console.log('Foundation matches Home; six active/seven archived materials, effects, saved-look preservation and mobile checks passed.');
} finally { await browser.close(); }
