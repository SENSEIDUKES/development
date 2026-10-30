#!/usr/bin/env node
/**
 * Run against `vite preview`: the header reads Logo | Search | Familiar | Sound |
 * Profile Portrait on one row at every width, with no control overlapping
 * another, every target at least 44px, and nothing scrolling sideways.
 * `ENGINES=chromium` limits the run to one engine.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit, devices } from 'playwright';

const base = (process.argv[2] ?? 'http://127.0.0.1:4173').replace(/\/$/, '');
const output = 'output/playwright/novel-expanded/header';
mkdirSync(output, { recursive: true });
const results = [];

async function checkHeader(frame, label) {
  await frame.locator('.workspace-search-field').waitFor();
  await frame.locator('.workspace-profile-portrait').waitFor();
  await frame.locator('.novel-expanded-emblem-art img').waitFor({ state: 'attached' });
  // Give fonts and React's resulting update a frame each before judging the
  // new viewport; WebKit can otherwise expose the previous width.
  await frame.locator('.workspace-header').evaluate(async header => {
    await header.ownerDocument.fonts.ready;
    const view = header.ownerDocument.defaultView;
    await new Promise(resolve => view.requestAnimationFrame(() => view.requestAnimationFrame(resolve)));
  });
  const geometry = await frame.locator('.workspace-header').evaluate(header => {
    const boxFor = element => {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    return {
      logo: boxFor(header.querySelector('.novel-expanded-emblem')),
      search: boxFor(header.querySelector('.workspace-search-field')),
      // Search, the Familiar, the music note (laptops) and the Portrait, in document order.
      controls: [...header.querySelectorAll('[data-slot="app-header-actions"] button, [data-slot="app-header-profile"] button')]
        .filter(button => button.getClientRects().length > 0)
        .map(button => ({ label: button.getAttribute('aria-label'), ...boxFor(button) })),
      viewport: header.ownerDocument.defaultView.innerWidth,
      scrollWidth: header.ownerDocument.documentElement.scrollWidth,
    };
  });
  const evidence = `${label}: ${JSON.stringify(geometry)}`;
  assert.equal(geometry.controls[0]?.label, 'Search for stories', `Search is not first after the logo. ${evidence}`);
  assert.equal(geometry.controls.at(-1)?.label, 'Profile and preferences', `The Profile Portrait is not last. ${evidence}`);
  assert(geometry.logo.right <= geometry.search.left + 0.5, `Search overlaps the logo. ${evidence}`);
  assert(geometry.search.width >= 44 && geometry.search.height >= 44, `Search loses its touch target. ${evidence}`);
  assert(geometry.scrollWidth <= geometry.viewport, `The page scrolls horizontally. ${evidence}`);
  geometry.controls.forEach((control, index) => {
    assert(control.width >= 44 && control.height >= 44 && control.right <= geometry.viewport + 0.5,
      `A header control loses its touch target or leaves the viewport. ${evidence}`);
    const next = geometry.controls[index + 1];
    assert(!next || control.right <= next.left + 0.5, `Header controls overlap or leave their order. ${evidence}`);
  });
  results.push({ label, ...geometry });
}

const engines = (process.env.ENGINES ?? 'chromium,webkit').split(',');
for (const [name, engine, device] of [
  ['chromium', chromium, devices['Pixel 7']], ['webkit', webkit, devices['iPhone 13']],
].filter(([name]) => engines.includes(name))) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ ...device, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${base}/app/`);
    for (const width of [320, 360, 393, 430, 640, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width >= 1024 ? 900 : 844 });
      await checkHeader(page, `${name} app ${width}`);
      if (width === 393 || width === 1440) {
        await page.screenshot({ path: `${output}/${name}-app-${width}.png`, scale: 'css' });
      }
    }
    await page.setViewportSize({ width: 393, height: 844 });
    await page.locator('html').evaluate(element => { element.style.fontSize = '150%'; });
    await checkHeader(page, `${name} app 393 enlarged text`);
    await page.locator('html').evaluate(element => { element.style.fontSize = ''; });
    // The Profile Portrait's menu: the reader, Sign in (not connected yet), the Preferences.
    await page.getByRole('button', { name: 'Profile and preferences', exact: true }).click();
    await page.locator('#header-preferred-language').waitFor({ state: 'visible' });
    const menu = await page.locator('[data-testid="workspace-profile-menu"]').boundingBox();
    assert(menu && menu.x >= 0 && menu.x + menu.width <= 393 + 0.5, `The Profile Portrait menu leaves the screen: ${JSON.stringify(menu)}`);
    await page.screenshot({ path: `${output}/${name}-profile-menu-393.png`, scale: 'css' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Profile and preferences', exact: true }).click();
    await page.locator('[data-testid="workspace-profile-menu"] button', { hasText: 'Sign in' }).click();
    await page.locator('[data-sign-in-unavailable]').waitFor({ state: 'visible' });
    await page.screenshot({ path: `${output}/${name}-sign-in-393.png`, scale: 'css' });
    await page.getByRole('button', { name: 'Close sign in', exact: true }).click();

    // Sparks: a spark icon button in the Creator Space and in Story Seed's Origin, never the header.
    for (const route of ['/app/?page=create', '/app/?page=create&seed=new']) {
      await page.goto(`${base}${route}`);
      const sparks = page.getByRole('button', { name: 'Sparks: story ideas', exact: true });
      await sparks.waitFor();
      assert.equal(await page.locator('header .dao-sparks-trigger').count(), 0, `Sparks is in the header on ${route}`);
      await sparks.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog', { name: 'Sparks', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Close Sparks', exact: true }).click();
    }
    await page.goto(`${base}/app/`);

    for (const [route, selector] of [
      // The Creator Space's title sits below the header at every width.
      ['/app/?page=create', '[data-testid="novel-expanded-create-hub"] #creator-space-title'],
      // A phone gives Story Seed's page heading back to the questions; the step strip shows at every width.
      ['/app/?page=create&seed=new', '[data-seed-creator-strip]'],
      ['/app/?page=discover', '.discover-header h1'],
      ['/app/?page=profile', '[data-cave-page-heading] [data-page-title]'],
    ]) {
      await page.goto(`${base}${route}`);
      await page.locator(selector).waitFor({ state: 'visible' });
      for (const width of [393, 1440]) {
        await page.setViewportSize({ width, height: width >= 1024 ? 900 : 844 });
        await checkHeader(page, `${name} ${route} ${width}`);
      }
    }

    await page.goto(`${base}/?preview=light-novels-home`);
    const home = page.frameLocator('iframe[title^="Expanded Novels Home development"]');
    await checkHeader(home, `${name} Workshop mobile`);
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.getByRole('combobox', { name: /^Viewport/ }).selectOption('laptop');
    await checkHeader(home, `${name} Workshop laptop`);
    await page.screenshot({ path: `${output}/${name}-workshop-laptop.png`, scale: 'css' });
    await context.close();
  } finally {
    await browser.close();
  }
}
writeFileSync(`${output}/geometry.json`, JSON.stringify(results, null, 2));
console.log(`Header verification passed: ${results.length} layouts in ${engines.join(" and ")}, built app and Workshop.`);
