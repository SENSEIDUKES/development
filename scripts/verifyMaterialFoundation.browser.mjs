import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
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
  assert.deepEqual(await catalog.locator('[data-pm-recipe="violet-card"]').evaluate(material), panel, 'V2 outer panel uses Violet inset');
  const shellEdit = JSON.parse(readFileSync('src/components/palette-materials/development/owner-looks.json', 'utf8')).looks.at(-1).settings.edits['violet-shell'];
  const editedShell = await catalog.locator('[data-pm-recipe="violet-shell"]').evaluate(async (element, edit) => {
    const { materialStyle, measureMaterial } = await import('/src/components/palette-materials/development/model.ts');
    const original = element.getAttribute('style');
    Object.assign(element.style, materialStyle(measureMaterial(element), edit));
    const s = getComputedStyle(element);
    const values = [s.backgroundColor, s.backgroundImage, s.backdropFilter, s.borderTopColor, s.boxShadow];
    if (original === null) element.removeAttribute('style'); else element.setAttribute('style', original);
    return values;
  }, shellEdit);
  assert.deepEqual(editedShell, shell, 'V2 header matches the supplied Midnight violet edit');
  assert.deepEqual(editedShell, card, 'V2 nested card uses the same edited Midnight violet');
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
  await page.getByRole('button', { name: 'V2 · Default preset', exact: true }).click();
  const composition = page.frameLocator('iframe[title="Home material preview"]');
  await composition.locator('[data-home-events]').waitFor();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.pm-home-frame').contentDocument.querySelector('[data-home-events]')).backgroundColor === 'rgba(11, 14, 30, 0.35)');
  const fills = [];
  for (const selector of ['.workspace-header', '[data-home-events]', '[data-slot="empty-state"]']) fills.push(await composition.locator(selector).evaluate(e => getComputedStyle(e).backgroundColor));
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
