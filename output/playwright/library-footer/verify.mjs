import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = '/home/user/development/output/playwright/library-footer';
mkdirSync(out, { recursive: true });
const url = 'http://127.0.0.1:4173/library-shell.html?variant=development&source=main-library&screen=home&collection=featured';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] });
const report = {};
for (const [name, viewport] of Object.entries({ phone: { width: 390, height: 844 }, narrow: { width: 320, height: 640 }, laptop: { width: 1280, height: 800 }, desktop: { width: 1440, height: 900 } })) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.route('**/*', route => {
    const target = route.request().url();
    if (target.startsWith('http://127.0.0.1:4173')) return route.continue();
    // The sandbox has no outbound network: answer the Google Fonts @import with
    // an empty sheet so Chromium does not fail the whole stylesheet, and let the
    // public hero media fall back as it would offline.
    if (target.startsWith('https://fonts.googleapis.com/')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.abort();
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  const footer = page.locator('[data-library-footer]');
  await footer.waitFor();
  await footer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const metrics = await page.evaluate(() => {
    const footer = document.querySelector('[data-library-footer]');
    const rect = footer.getBoundingClientRect();
    const main = document.querySelector('main');
    const home = document.querySelector('[data-light-novels-home]');
    const homeRect = home.getBoundingClientRect();
    const targets = Array.from(footer.querySelectorAll('a, button')).map(el => { const r = el.getBoundingClientRect(); return { label: el.getAttribute('aria-label') || el.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) }; });
    return {
      footerHeight: Math.round(rect.height), footerWidth: Math.round(rect.width),
      gapAboveFooter: Math.round(rect.top - homeRect.bottom),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      mainPaddingBottom: getComputedStyle(main.closest('.library-navigation-layout') || main).paddingBottom,
      smallTargets: targets.filter(t => t.w < 44 || t.h < 44),
      openMenus: Array.from(footer.querySelectorAll('[aria-expanded="true"]')).length,
      hasSeaportal: footer.innerHTML.toLowerCase().includes('seaportal'),
    };
  });
  await footer.screenshot({ path: `${out}/footer-${name}.png` });
  await page.screenshot({ path: `${out}/page-${name}.png` });
  // Every width renders the same menus; narrow stacks them and wide sets them in
  // a row of tabs, so record which layout this width produced and then exercise
  // the one behaviour both share.
  const layout = await page.evaluate(() => {
    const group = document.querySelector('[data-library-footer] .library-footer-disclosures');
    const style = getComputedStyle(group);
    const columns = style.gridTemplateColumns.split(' ').filter(Boolean).length;
    return { display: style.display, columns: style.display === 'grid' ? columns : 1 };
  });
  // Keyboard: Tab into the menus, open with Enter, verify one-at-a-time and focus ring.
  await page.getByRole('button', { name: 'Explore' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const afterEnter = await page.evaluate(() => Array.from(document.querySelectorAll('[data-library-footer] [data-slot="disclosure-trigger"]')).map(b => b.getAttribute('aria-expanded')));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const afterSecond = await page.evaluate(() => ({
    expanded: Array.from(document.querySelectorAll('[data-library-footer] [data-slot="disclosure-trigger"]')).map(b => b.getAttribute('aria-expanded')),
    focused: document.activeElement?.textContent?.trim(),
    outline: getComputedStyle(document.activeElement).outlineStyle,
  }));
  const menus = { ...layout, afterEnter, afterSecond };
  await footer.screenshot({ path: `${out}/footer-${name}-open.png` });
  // At the page bottom the global strip must clear the legal row.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
  const clearance = await page.evaluate(() => {
    const footer = document.querySelector('[data-library-footer]').getBoundingClientRect();
    const strip = document.querySelector('.library-global-navigation')?.getBoundingClientRect();
    return strip ? Math.round(strip.top - footer.bottom) : null;
  });
  await page.screenshot({ path: `${out}/page-${name}-bottom.png` });
  report[name] = { ...metrics, menus, clearanceAboveStrip: clearance };
  await context.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
