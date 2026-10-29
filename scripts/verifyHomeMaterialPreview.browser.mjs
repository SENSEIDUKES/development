import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173';
const output = 'output/playwright/home-material-preview';
mkdirSync(output, { recursive: true });
const paint = element => {
  const css = getComputedStyle(element);
  return [css.backgroundColor, css.backgroundImage, css.backdropFilter, css.boxShadow, css.borderTopColor];
};
const openPreview = async page => {
  const nav = page.getByRole('navigation', { name: 'Workspace sections' });
  if (await nav.isVisible()) await nav.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.locator('.pm-home-frame').scrollIntoViewIfNeeded();
};
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    for (const width of [390, 834, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [], apiCalls = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url()); });
      await page.goto(`${base}/?preview=palette-materials`);
      await page.locator('#pm-composition h2').waitFor({ state: 'attached' });
      const nav = page.getByRole('navigation', { name: 'Workspace sections' });
      if (await nav.isVisible()) await nav.getByRole('button', { name: /Saved/ }).click();
      // Source parity uses an explicit baseline, independent of the owner's
      // changing default look. Imports append without replacing saved work.
      const baseline = { ...JSON.parse(readFileSync('src/components/palette-materials/development/owner-looks.json', 'utf8')).looks.at(-1),
        id: 'home-baseline', name: 'Home source baseline' };
      await page.getByLabel('Import looks file').setInputFiles({ name: 'baseline.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ format: 'palette-materials', version: 3, looks: [baseline] })) });
      await page.locator('.pm-saved-look').filter({ has: page.getByRole('heading', { name: 'Home source baseline', exact: true }) }).getByRole('button', { name: 'Load', exact: true }).click();
      await openPreview(page);
      const frame = page.frameLocator('iframe[title="Home material preview"]');
      await frame.getByTestId('novel-expanded-home').waitFor();
      await frame.locator('[data-home-events]').waitFor();
      await page.waitForFunction(() => {
        const doc = document.querySelector('.pm-home-frame').contentDocument;
        return getComputedStyle(doc.querySelector('[data-home-events]')).backgroundColor === 'rgba(11, 14, 30, 0.35)';
      });
      const canvas = page.frames().find(child => child.url().includes('source=palette-materials'));
      const previewWidth = await canvas.evaluate(() => innerWidth);
      const actual = await browser.newPage({ viewport: { width: previewWidth, height: 800 } });
      await actual.goto(`${base}/app/`);
      await actual.getByTestId('novel-expanded-home').waitFor();
      for (const selector of ['[data-home-events]', '[data-home-panel]:not(.home-featured [data-home-panel])', '[data-slot="empty-state"]', '.workspace-header', '.library-footer']) {
        assert.deepEqual(await frame.locator(selector).first().evaluate(paint), await actual.locator(selector).first().evaluate(paint), `${name} ${width}: ${selector} starts with Home's actual material`);
      }
      await actual.close();
      // Assignments, text and accent controls still feed the same saved experiment.
      await page.getByRole('combobox', { name: 'Navigation', exact: true }).selectOption('reader');
      await page.waitForFunction(() => {
        const doc = document.querySelector('.pm-home-frame').contentDocument;
        return getComputedStyle(doc.querySelector('.workspace-header')).backgroundImage === getComputedStyle(doc.querySelector('[data-pm-recipe="reader"]')).backgroundImage;
      });
      await page.getByRole('combobox', { name: 'Navigation', exact: true }).selectOption('violet-shell');
      await page.getByLabel('Text', { exact: true }).fill('#aaffcc');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.pm-home-frame').contentDocument.querySelector('.home-featured h2')).color === 'rgb(170, 255, 204)');
      assert.equal(await frame.locator('[data-slot="empty-state"] h4').evaluate(e => getComputedStyle(e).color), 'rgb(170, 255, 204)');
      await page.getByLabel('Text', { exact: true }).fill('#ffffff');
      await page.getByLabel('Accent', { exact: true }).fill('#ffaa88');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.pm-home-frame').contentDocument.querySelector('.home-filter-label')).color === 'rgb(255, 170, 136)');
      await page.getByLabel('Accent', { exact: true }).fill('#04acff');
      await page.getByRole('combobox', { name: 'Panel', exact: true }).selectOption('violet-panel');
      const beforeHero = await frame.locator('.home-featured [data-home-panel]').evaluate(paint);
      await frame.locator('[data-home-events] summary').focus();
      await frame.locator('[data-home-events] summary').press('Enter');
      const beforeEvent = await frame.locator('.home-event').first().evaluate(paint);
      assert.equal(await frame.locator('video').count(), 0, 'Steady still-image comparisons');
      const spectrum = await frame.getByRole('button', { name: 'Carve New Destiny', exact: true }).evaluate(e => getComputedStyle(e, '::before').backgroundImage);
      assert.notEqual(spectrum, 'none');
      // One editor drives both the sample and the Home composition.
      if (await nav.isVisible()) await nav.getByRole('button', { name: 'Materials', exact: true }).click();
      if (await page.getByRole('combobox', { name: 'Material to edit' }).isVisible()) {
        await page.getByRole('combobox', { name: 'Material to edit' }).selectOption('violet-panel');
      } else {
        await page.locator('.pm-sample').filter({ has: page.locator('[data-pm-recipe="violet-panel"]') }).getByRole('button', { name: /Violet glass/ }).click();
      }
      await page.getByRole('slider', { name: 'Background blur', exact: true }).fill('39');
      await page.getByRole('slider', { name: 'Opacity', exact: true }).fill('87');
      await openPreview(page);
      await page.waitForFunction(() => { const element = document.querySelector('.pm-home-frame')?.contentDocument?.querySelector('[data-home-events]'); return element && getComputedStyle(element).backdropFilter === 'blur(39px)'; });
      assert.equal((await frame.locator('[data-home-events]').evaluate(paint))[0], 'rgba(11, 14, 30, 0.87)');
      assert.deepEqual(await frame.locator('.home-featured [data-home-panel]').evaluate(paint), beforeHero, 'Editing plain panels leaves media unchanged');
      assert.deepEqual(await frame.locator('.home-event').first().evaluate(paint), beforeEvent, 'Event media is unchanged');
      assert.equal(await frame.getByRole('button', { name: 'Carve New Destiny', exact: true }).evaluate(e => getComputedStyle(e, '::before').backgroundImage), spectrum, 'Rainbow is retained');
      await frame.getByRole('button', { name: 'Carve New Destiny', exact: true }).click();
      await frame.getByRole('status').filter({ hasText: 'preview only' }).waitFor();
      assert.match(page.url(), /preview=palette-materials$/);
      assert.match(canvas.url(), /source=palette-materials$/);
      await frame.getByRole('button', { name: 'Dismiss preview message' }).click();
      // Changes and named looks use the existing Workshop persistence, not app preferences.
      if (await nav.isVisible()) await nav.getByRole('button', { name: /Saved/ }).click();
      await page.getByRole('textbox', { name: 'Look name' }).fill('Home material check');
      await page.getByRole('button', { name: 'Save as new look', exact: true }).click();
      await page.reload();
      await page.locator('#pm-composition h2').waitFor({ state: 'attached' });
      await openPreview(page);
      await page.waitForFunction(() => { const element = document.querySelector('.pm-home-frame')?.contentDocument?.querySelector('[data-home-events]'); return element && getComputedStyle(element).backdropFilter === 'blur(39px)'; });
      // Resizing exercises the frame's real responsive navigation, not scaled CSS guesses.
      await page.getByRole('combobox', { name: 'Home preview size' }).selectOption('834');
      await page.waitForFunction(() => document.querySelector('.pm-home-frame').contentWindow.innerWidth === 834);
      const dock = await frame.locator('.library-global-navigation').evaluate(nav => {
        const rect = nav.firstElementChild.getBoundingClientRect();
        const buttons = [...nav.querySelectorAll('button')].map(button => button.getBoundingClientRect());
        return { left: rect.left, right: rect.right, first: buttons[0].left, last: buttons.at(-1).right };
      });
      assert.ok(dock.first >= dock.left && dock.last <= dock.right, 'Tablet rim encloses every destination');
      await page.getByRole('combobox', { name: 'Home preview size' }).selectOption('auto');
      await frame.locator('.workspace-shell-main').evaluate(main => main.scrollTop = main.scrollHeight);
      await frame.locator('.library-footer').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${name}-${width}-footer.png` });
      assert.equal(await frame.locator('html').evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(apiCalls, [], 'Mock makes no API calls');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${name} ${width}: source parity, edits, clear media, rainbow, inert actions, save/reload, tablet rim, footer and isolation passed.`);
    }
  } finally { await browser.close(); }
}
