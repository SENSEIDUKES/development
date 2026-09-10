import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Run with the local Vite preview running; no production data or generation.
const origin = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 34, left: 12, right: 12 } });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const entry of ['/?preview=story-seed', '/library-shell.html?variant=development&source=story-seed&state=empty-intake']) {
      for (const refresh of [false, true]) {
        await page.goto(origin + entry);
        if (refresh) await page.reload();
        const nav = page.getByRole('navigation', { name: 'Story Seed navigation', exact: true, includeHidden: true });
        await nav.waitFor({ state: 'attached' });
        assert.deepEqual(await nav.locator('button').allTextContents(), ['Sections', 'Story Bank', 'Settings', 'Back']);
        assert.equal(await nav.getByRole('button', { name: 'Help', exact: true }).count(), 0);
        assert.equal(await page.locator('header .workspace-help-emblem').textContent(), '?');
        assert.equal(await nav.locator('img[alt="Celestial Library"]').getAttribute('src'), '/favicon.jpg');
        if (width >= 1024) { assert.equal(await nav.isVisible(), false); continue; }
        const padding = await nav.evaluate(element => Number.parseFloat(getComputedStyle(element).paddingBottom));
        assert(padding >= 34, `safe-area bottom padding: ${padding}`);
        const sizes = await nav.locator('button').evaluateAll(items => items.map(item => ({ width: item.getBoundingClientRect().width, height: item.getBoundingClientRect().height })));
        assert(sizes.every(size => size.width >= 44 && size.height >= 44), JSON.stringify(sizes));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
        await nav.getByRole('button', { name: 'Back', exact: true }).click();
        await page.waitForURL(url => url.searchParams.get('screen') === 'home');
        assert.equal(new URL(page.url()).searchParams.get('collection'), 'featured');
        assert.equal(new URL(page.url()).searchParams.get('source'), 'main-library');
        await page.reload();
        const home = page.locator('.library-global-navigation [aria-current="page"]');
        await home.waitFor();
        assert.equal(await home.textContent(), 'Home');
      }
    }
    await page.goto(origin + '/library-shell.html?variant=development&source=cultivator-cave&state=developed-cultivator');
    const title = page.locator('[data-slot="library-header-badge-title"]');
    await title.waitFor();
    assert.equal(await title.textContent(), 'Profile');
    const logo = page.locator('header a[aria-label="Return to Library"] img');
    assert.equal(await logo.getAttribute('src'), '/favicon.jpg');
    assert.equal(await page.locator('header img[src="/icons/sacred-tree.svg"]').count(), 0);
    assert(await logo.evaluate(img => img.complete && img.naturalWidth > 0));
    const logoLink = page.locator('header a[aria-label="Return to Library"]');
    const bounds = await logoLink.boundingBox();
    assert(bounds && bounds.width >= 44 && bounds.height >= 44);
    assert.equal((await page.request.get(origin + '/icons/sacred-tree.svg')).status(), 200);
    console.log(`Navigation polish passed at ${width}px`);
  }
} finally { await browser.close(); }

