import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:5173';
const out = 'output/playwright/background-image'; mkdirSync(out, { recursive: true });
const settings = '/app/?page=profile&cave=/settings';
const dockBounds = async page => {
  const metrics = await page.locator('.library-global-navigation').evaluate(nav => {
    const frame = nav.firstElementChild.getBoundingClientRect();
    const buttons = [...nav.querySelectorAll('button')].map(button => button.getBoundingClientRect());
    return { left: frame.left, right: frame.right, widths: buttons.map(b => b.width), first: buttons[0].left, last: buttons.at(-1).right, inset: getComputedStyle(nav.firstElementChild, '::after').inset };
  });
  assert.ok(metrics.first >= metrics.left && metrics.last <= metrics.right, 'Navigation border encloses all buttons');
  assert.ok(Math.max(...metrics.widths) - Math.min(...metrics.widths) < 1, 'Navigation buttons have equal widths');
};
for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
 const browser = await engine.launch();
 try {
  for (const width of [390, 768, 834, 1023]) {
   const page = await browser.newPage({ viewport: { width, height: 1100 } });
   const errors = []; page.on('pageerror', error => errors.push(error.message));
   await page.goto(`${base}/app/`); await page.getByTestId('novel-expanded-home').waitFor();
   await dockBounds(page);
   const layers = await page.locator('[data-home-panel]').nth(1).evaluate(e => [getComputedStyle(e).backgroundColor, getComputedStyle(e).backdropFilter, getComputedStyle(e).boxShadow]);
   const original = await page.locator('.library-look').evaluate(e => getComputedStyle(e).backgroundImage);
   assert.match(original, /LIBRARY_THUNDER/);
   await page.goto(`${base}${settings}`);
   await page.locator('#cave-display-name').fill('Keep draft');
   const disclosure = page.locator('[data-slot="disclosure-trigger"]').filter({ hasText: 'Background Image' });
   await disclosure.click();
   const choices = page.getByRole('radiogroup', { name: 'Background image', exact: true });
   assert.equal(await choices.getByRole('radio').count(), 6);
   assert.equal(await choices.getByRole('radio', { name: /Home background/ }).getAttribute('aria-checked'), 'true');
   await choices.getByRole('radio', { name: /Blood Moon/ }).click();
   assert.match(await page.locator('[data-cave-backdrop]').getAttribute('src'), /immortal-land-5/);
   assert.equal(await page.locator('#cave-display-name').inputValue(), 'Keep draft');
   await page.reload(); await disclosure.click();
   await page.waitForFunction(() => document.querySelector('[data-cave-backdrop]')?.getAttribute('src')?.includes('immortal-land-5'));
   assert.equal(await choices.getByRole('radio', { name: /Blood Moon/ }).getAttribute('aria-checked'), 'true');
   assert.notEqual(await page.locator('#cave-display-name').inputValue(), 'Keep draft');
   for (const route of ['/app/', '/app/?page=discover', '/app/?page=create']) {
    await page.goto(`${base}${route}`);
    await page.locator('.workspace-shell').waitFor();
    // Every page wearing the look carries the shared image on its look wrapper.
    assert.match(await page.locator('.library-look').evaluate(e => getComputedStyle(e).backgroundImage), /immortal-land-5/, `${route}: shared image follows the profile`);
    if (route === '/app/') {
      assert.deepEqual(await page.locator('[data-home-panel]').nth(1).evaluate(e => [getComputedStyle(e).backgroundColor, getComputedStyle(e).backdropFilter, getComputedStyle(e).boxShadow]), layers, 'Image selection does not change material settings');
      await dockBounds(page);
      await page.screenshot({ path: `${out}/${engineName}-home-${width}.png` });
    }
   }
   await page.goto(`${base}${settings}`); await disclosure.click();
   const moonlit = choices.getByRole('radio', { name: /Moonlit Sanctum/ });
   await moonlit.focus(); await moonlit.press('Home'); await page.keyboard.press(' ');
   assert.equal(await choices.getByRole('radio', { name: /Home background/ }).getAttribute('aria-checked'), 'true', 'Keyboard can restore Home artwork');
   await page.goto(`${base}/app/`); await page.getByTestId('novel-expanded-home').waitFor();
   assert.equal(await page.locator('.library-look').evaluate(e => getComputedStyle(e).backgroundImage), original);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
   assert.deepEqual(errors, []);
   await page.close(); console.log(`${engineName} ${width}px: dock encloses all buttons, image selection/reload/shared pages/restoration passed.`);
  }
 } finally { await browser.close(); }
}
