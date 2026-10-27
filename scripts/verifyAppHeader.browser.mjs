#!/usr/bin/env node
/** Run against `vite preview`: CSS optimization must not shift Dao Insights over the logo. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit, devices } from 'playwright';

const base = (process.argv[2] ?? 'http://127.0.0.1:4173').replace(/\/$/, '');
const output = 'output/playwright/novel-expanded/header';
mkdirSync(output, { recursive: true });
const results = [];

async function checkHeader(frame, label) {
  await frame.locator('.dao-insights-trigger').waitFor();
  await frame.locator('.novel-expanded-emblem-art img').waitFor({ state: 'attached' });
  // The canonical center measures its available width in a ResizeObserver.
  // Give fonts, the observer and React's resulting update a frame each before
  // judging the new viewport; WebKit can otherwise expose the previous width.
  await frame.locator('.workspace-header').evaluate(async header => {
    await header.ownerDocument.fonts.ready;
    const view = header.ownerDocument.defaultView;
    await new Promise(resolve => view.requestAnimationFrame(() => view.requestAnimationFrame(resolve)));
  });
  const geometry = await frame.locator('.workspace-header').evaluate(header => {
    const box = selector => {
      const { left, right, top, bottom, width, height } = header.querySelector(selector).getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    return {
      logo: box('.novel-expanded-emblem'), dao: box('.dao-insights-trigger'),
      actions: box('[data-slot="app-header-actions"]'),
      controls: [...header.querySelectorAll('.workspace-header-actions button')]
        .filter(button => button.getClientRects().length > 0)
        .map(button => ({ label: button.getAttribute('aria-label'), ...boxFor(button) })),
      viewport: header.ownerDocument.defaultView.innerWidth,
      scrollWidth: header.ownerDocument.documentElement.scrollWidth,
    };
    function boxFor(element) {
      const { left, right, width, height } = element.getBoundingClientRect();
      return { left, right, width, height };
    }
  });
  const evidence = `${label}: ${JSON.stringify(geometry)}`;
  assert(geometry.logo.right <= geometry.dao.left + 0.5, `Dao Insights overlaps the logo. ${evidence}`);
  assert(geometry.dao.right <= geometry.actions.left + 0.5, `Dao Insights overlaps the actions. ${evidence}`);
  assert(geometry.dao.width >= 44 && geometry.dao.height >= 44, `Dao Insights loses its touch target. ${evidence}`);
  assert(geometry.scrollWidth <= geometry.viewport, `The page scrolls horizontally. ${evidence}`);
  for (const control of geometry.controls) {
    assert(control.width >= 44 && control.height >= 44 && control.right <= geometry.viewport + 0.5,
      `A header action loses its touch target or leaves the viewport. ${evidence}`);
  }
  results.push({ label, ...geometry });
}

for (const [name, engine, device] of [
  ['chromium', chromium, devices['Pixel 7']], ['webkit', webkit, devices['iPhone 13']],
]) {
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
    const trigger = page.getByRole('button', { name: 'Insights from the Dao: story sparks', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'Dao Insights', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close Dao Insights', exact: true }).click();

    // Preferences compact card and unchanging header across Create, Discover and Profile.
    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    await page.locator('#header-preferred-language').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    for (const [route, selector] of [
      // A phone gives Story Seed's page heading back to the questions; the step strip shows at every width.
      ['/app/?page=create', '[data-seed-creator-strip]'],
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
console.log(`Header verification passed: ${results.length} layouts, Chromium and WebKit, built app and Workshop.`);
