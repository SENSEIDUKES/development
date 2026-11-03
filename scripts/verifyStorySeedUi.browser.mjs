import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

// Run against dev or the production preview. All draft data is local; no generation is requested.
const origin = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:5173';
const engine = process.env.BROWSER_ENGINE === 'webkit' ? 'webkit' : 'chromium';
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
await mkdir('output/playwright', { recursive: true });
const failures = [];
const openMore = page => page.getByRole('button', { name: 'Sections', exact: true }).click();
const utility = (page, name) => page.locator('[data-slot="navigation-footer"]').filter({ visible: true }).getByRole('button', { name, exact: true });
const next = page => page.locator('.seed-creator-footer-next');
const tab = (page, name) => page.locator(`[data-part="${name}"]`);
// The app's movable Familiar intentionally sits above panels. Use its existing
// minimize action so these checks exercise the Seed controls at every width.
const minimizeFamiliar = async page => {
  const familiar = page.locator('.familiar-companion .familiar-trigger');
  if (await familiar.isVisible()) {
    await familiar.click();
    await page.getByRole('button', { name: 'Minimize Familiar', exact: true }).click();
  }
};
// Windows WebKit can apply the OS display scale to its viewport despite the requested size.
// Measure the CSS viewport and correct it, so each check actually exercises its named breakpoint.
const resize = async (page, width, height) => {
  await page.setViewportSize({ width, height });
  const actual = await page.evaluate(() => ({ width: visualViewport.width, height: visualViewport.height }));
  if (Math.abs(actual.width - width) > 1 || Math.abs(actual.height - height) > 1) {
    await page.setViewportSize({ width: Math.round(width * width / actual.width), height: Math.round(height * height / actual.height) });
  }
  assert(await page.evaluate(target => Math.abs(innerWidth - target) <= 1, width), 'requested CSS viewport');
};
try {
  for (const surface of ['app', 'workshop']) {
    for (const width of [320, 390, 430, 768, 1024, 1280, 1440]) {
      const height = width >= 1024 ? 800 : 844;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width < 1024 });
      const page = await context.newPage();
      page.on('pageerror', error => failures.push(`${surface} ${width}: ${error.message}`));
      await page.route('**/api/generate-blueprint', route => { failures.push('Unexpected Blueprint request'); return route.abort(); });
      const address = surface === 'app' ? '/app/?page=create&seed=new' : '/?preview=story-seed&state=empty-intake';
      await page.goto(`${origin}${address}`);
      await resize(page, width, height);
      await page.locator('[data-seed-creator-strip]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await minimizeFamiliar(page);
      assert.deepEqual(await page.locator('[data-seed-creator-strip] [data-step]').evaluateAll(elements => elements.map(element => element.dataset.step)), ['origin', 'world', 'arc', 'manifest']);
      const phone = width < 640;
      const compact = width < 1024;
      assert.equal(await page.locator('.seed-creator-card-slot').count(), 0, 'story summary never precedes the form');
      const firstChoice = await page.locator('#story-style-chinese').boundingBox();
      // Workshop adds its inspection controls above the product viewport.
      const workspace = await page.locator('.workspace-shell').boundingBox();
      assert(firstChoice.y + firstChoice.height - workspace.y < workspace.height / 2, 'first choices fully visible in the upper half of the product viewport');
      if (!phone) {
        const heading = await page.locator('[data-story-seed-action-row]').boundingBox();
        assert(heading.height <= 80, 'title, status and Save share a compact row');
        assert((await page.locator('.seed-creator-strip').boundingBox()).height <= 52, 'desktop steps stay on one line');
      }
      if (compact) {
        const bar = page.locator('.library-workspace-navigation');
        await next(page).waitFor();
        const box = await bar.boundingBox();
        assert(box.height < 110, 'Library navigation remains compact');
        assert.equal(await bar.getByRole('button').count(), 5);
        assert.equal(await bar.locator('[data-seed-creator-footer]').count(), 0);
        assert.equal(await page.locator('.seed-creator-card-slot').count(), 0, 'no story card above the form');
        const targets = await bar.getByRole('button').evaluateAll(elements => elements.map(element => ({ height: element.getBoundingClientRect().height, minimum: parseFloat(getComputedStyle(element).minHeight) })));
        assert(targets.every(target => target.minimum >= 44 && target.height >= 43.9), '44px bar touch targets, allowing subpixel rounding');
        if (phone) assert((await page.locator('.seed-creator-strip').boundingBox()).height <= 96, 'compact tab rows');

        // More uses the existing drawer and sheet, with focus restored to the bar.
        await openMore(page);
        for (const label of ['Save Draft', 'Story Preview', 'Story Bank', 'Blueprint', 'Settings', 'Home']) assert.equal(await utility(page, label).count(), 1);
        await utility(page, 'Story Preview').click();
        const preview = page.getByRole('dialog', { name: 'Story preview', exact: true });
        await preview.waitFor();
        assert(await preview.locator('[data-seed-live-card]').isVisible());
        await page.getByRole('button', { name: 'Close story preview', exact: true }).click();
        await preview.waitFor({ state: 'hidden' });
        await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Sections');
        await openMore(page);
        await utility(page, 'Settings').click();
        const settings = page.getByRole('dialog', { name: 'Story Seed settings', exact: true });
        await settings.waitFor();
        const settingsBox = await settings.boundingBox();
        assert(settingsBox.x >= -1 && settingsBox.x + settingsBox.width <= width + 1, 'settings sheet fits screen');
        await page.getByRole('button', { name: 'Close settings', exact: true }).click();
        await settings.waitFor({ state: 'hidden' });
      } else {
        assert.equal(await page.locator('.library-workspace-navigation:visible').count(), 0);
        const previewButton = page.locator('aside').getByRole('button', { name: 'Story Preview', exact: true });
        await previewButton.focus();
        await previewButton.press('Enter');
        const preview = page.getByRole('dialog', { name: 'Story preview', exact: true });
        await preview.waitFor();
        assert(await preview.locator('[data-seed-live-card]').isVisible());
        await page.getByRole('button', { name: 'Close story preview', exact: true }).click();
        await preview.waitFor({ state: 'hidden' });
        await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Story Preview');
        const panel = page.locator('#origin-fun-settings-title');
        assert(await panel.isVisible());
        assert(await page.locator('#origin-genre-title').evaluate((node, id) => Boolean(node.compareDocumentPosition(document.getElementById(id)) & Node.DOCUMENT_POSITION_FOLLOWING), 'origin-fun-settings-title'));
        const settingsButton = page.locator('aside').getByRole('button', { name: 'Settings', exact: true });
        await settingsButton.focus();
        await settingsButton.press('Enter');
        await page.getByRole('dialog', { name: 'Story Seed settings', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Close settings', exact: true }).click();
        await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Settings');
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow');
      if (width === 390 || width === 1280 || width === 1440) await page.screenshot({ path: `output/playwright/story-seed-${surface}-${width}-${engine}.png` });

      if (phone) {
        assert.equal(await tab(page, 'fun').getAttribute('data-filled'), 'false');
        await tab(page, 'fun').click();
        assert(await page.locator('#origin-fun-settings-title').isVisible());
        await next(page).click();
        await tab(page, 'fun').click();
        assert.equal(await tab(page, 'fun').getAttribute('data-filled'), 'true');
        assert(await tab(page, 'fun').getByRole('img', { name: 'complete', exact: true }).isVisible());
        assert.equal(await tab(page, 'fate').getAttribute('data-filled'), 'false', 'jumping to Fun never confirms Fate');
      }
      await page.locator('[data-step="world"]').click();
      for (let index = 0; index < 8; index++) {
        const previousLabel = await next(page).getAttribute('aria-label');
        await next(page).click();
        await page.waitForFunction(label => document.querySelector('.seed-creator-footer-next')?.getAttribute('aria-label') !== label, previousLabel);
      }
      assert.equal(await page.locator('[data-step="arc"]').getAttribute('aria-current'), 'step');
      assert.match(await page.locator('[data-step="world"]').getAttribute('aria-label'), /complete/);
      assert.equal(await page.locator('[data-part="fun"]').count(), 0, 'Fun Settings removed from Arc');
      await context.close();
      console.log(`${surface} ${width}px: compact layout, menus, focus, checks, and World-before-Arc passed`);
    }
  }

  // A saved seed keeps accepted defaults and intentional blanks, but never borrows another seed's confirmations.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(`${origin}/app/?page=create&seed=new`);
  await resize(page, 390, 844);
  await tab(page, 'fun').waitFor();
  await minimizeFamiliar(page);
  await tab(page, 'fun').click();
  await page.locator('#origin-face-slap-decrease').click();
  await page.locator('#origin-face-slap-increase').click();
  assert.equal(await tab(page, 'fun').getAttribute('data-filled'), 'true', 'explicit unchanged choice confirms default');
  await next(page).click();
  await page.locator('#origin-story-title-input').fill('A very long title that must wrap comfortably inside the story preview on a small phone without widening the page');
  await page.locator('#core-premise-input').fill('A courier returns to an island that has forgotten her.');
  await resize(page, 390, 480);
  await page.evaluate(() => document.documentElement.style.setProperty('--sh-safe-bottom', '34px'));
  const safeBar = await page.locator('.library-workspace-navigation').boundingBox();
  assert(safeBar.y + safeBar.height <= 481, 'navigation fits safe-area viewport');
  await openMore(page);
  await utility(page, 'Story Preview').click();
  const preview = page.getByRole('dialog', { name: 'Story preview', exact: true });
  await preview.waitFor();
  assert(await preview.locator('.seed-live-card-title').evaluate(element => element.scrollWidth <= element.clientWidth + 1));
  await page.getByRole('button', { name: 'Close story preview', exact: true }).click();
  await preview.waitFor({ state: 'hidden' });
  await openMore(page);
  await utility(page, 'Save Draft').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('novelexpanded-story-seeds-v1') ?? '[]').length === 1);
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('novelexpanded-story-seeds-v1'))[0].id);
  await page.goto(`${origin}/app/?page=create&seed=${encodeURIComponent(id)}`);
  await tab(page, 'fun').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-part="fun"]')?.getAttribute('data-filled') === 'true');
  assert.equal(await tab(page, 'fate').getAttribute('data-filled'), 'false');
  await page.goto(`${origin}/app/?page=create&seed=new`);
  await tab(page, 'fun').waitFor();
  assert.equal(await tab(page, 'fun').getAttribute('data-filled'), 'false');
  await context.close();
  assert.deepEqual(failures, []);
  console.log('Saved confirmations, unchanged defaults, new-seed isolation, long title, and short viewport passed.');
} finally {
  await browser.close();
}
