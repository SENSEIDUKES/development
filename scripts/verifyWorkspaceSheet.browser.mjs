import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

// Run npm run build, then npm run preview -- --port 4173 first.
// This must exercise production CSS: the dev server did not reproduce the bug.
const origin = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:4173';
const rect = locator => locator.evaluate(element => element.getBoundingClientRect().toJSON());
async function checkBounds(dialog, width, height) {
  const box = await rect(dialog);
  assert(box.left >= -1 && box.right <= width + 1, `horizontal bounds: ${JSON.stringify(box)}`);
  assert(box.top >= -1 && box.bottom <= height + 1, `vertical bounds: ${JSON.stringify(box)}`);
  if (width < 1024) {
    assert(Math.abs(box.left) <= 1 && Math.abs(box.width - width) <= 1, 'mobile sheet fills viewport width');
    assert(Math.abs(box.bottom - height) <= 1, 'mobile sheet is bottom anchored');
  } else {
    assert(Math.abs((box.left + box.right) / 2 - width / 2) <= 1, 'desktop dialog stays centered');
  }
}
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['/?preview=story-seed', '/library-shell.html?variant=development&source=story-seed&state=empty-intake']) {
        await page.goto(origin + route);
        await page.locator('nav[aria-label="Story Seed navigation"]').waitFor({ state: 'attached' });
        await page.evaluate(() => window.scrollTo(0, 300));
        const trigger = width < 1024
          ? page.locator('nav[aria-label="Story Seed navigation"]').getByRole('button', { name: 'Settings', exact: true })
          : page.getByRole('button', { name: 'Settings', exact: true }).first();
        const keyboard = route.startsWith('/library-shell');
        if (keyboard) { await trigger.focus(); await trigger.press('Enter'); }
        else await trigger.click();
        const dialog = page.getByRole('dialog', { name: 'Story Seed settings', exact: true });
        await dialog.waitFor();
        await page.waitForTimeout(350); // Let the existing open animation settle.
        await checkBounds(dialog, width, 844);
        await dialog.getByRole('switch', { name: 'Fate Survival', exact: true }).click();
        await page.setViewportSize({ width, height: 430 });
        await checkBounds(dialog, width, 430);
        const option = dialog.getByRole('radio', { name: /^Mortal/ });
        await option.click();
        assert.equal(await option.getAttribute('aria-checked'), 'true');
        await checkBounds(dialog, width, 430);
        await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();
        await dialog.waitFor({ state: 'detached' });
        if (keyboard) assert(await trigger.evaluate(element => document.activeElement === element), 'Settings keyboard focus returns');
        await page.setViewportSize({ width, height: 844 });
      }
      // Search shares the same sheet, including the content visible in the report.
      await page.goto(origin + '/library-shell.html?variant=development&source=main-library&state=linked');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      const search = page.getByRole('dialog', { name: 'Search', exact: true });
      await search.waitFor();
      await page.waitForTimeout(350);
      await checkBounds(search, width, 844);
      await page.keyboard.press('Escape');
      await search.waitFor({ state: 'detached' });
      console.log(`${engine.name()} production sheets passed at ${width}px`);
    }
  } finally { await browser.close(); }
}
