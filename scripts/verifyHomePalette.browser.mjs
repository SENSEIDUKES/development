#!/usr/bin/env node
/** Against a running dev server: keep Home media clear and native navigation alive.
 * Seeds two local stories/covers in an isolated browser context, never an account.
 * Usage: node scripts/verifyHomePalette.browser.mjs [http://localhost:5173]
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173';
const output = 'output/playwright/home-palette-regression';
mkdirSync(output, { recursive: true });
const results = [];
const media = '.home-event, .home-event-art, .home-event-body, .world-card-base, .world-card-base-media, .world-card-banner, .world-card-banner-backdrop, .world-card-banner-video, .world-card-banner-wash';
const nativeColors = '[data-slot="navigation-label"], [data-slot="navigation-account-name"], .home-featured-label, .home-events-label, .home-filter-label, .dao-insights-trigger > div:first-child > span';
const assertClear = async page => {
  const surfaces = await page.locator(media).evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return { surface: element.className, filter: style.filter, backdrop: style.backdropFilter };
  }));
  assert.ok(surfaces.length >= 6, 'Expanded Events must be present');
  for (const surface of surfaces) {
    assert.equal(surface.filter, 'none', `${surface.surface}: no image/video blur`);
    assert.equal(surface.backdrop, 'none', `${surface.surface}: no frosted media overlay`);
  }
};
const rainbowState = element => {
  const style = getComputedStyle(element, '::after');
  return [style.backgroundImage, style.maskImage, style.filter, style.animationName, style.animationDuration];
};
const navState = element => {
  const style = getComputedStyle(element);
  return [style.backgroundImage, style.backgroundColor, style.color, style.borderColor, style.boxShadow, style.transitionProperty, style.transitionDuration];
};
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/app/`);
    await page.getByTestId('novel-expanded-home').waitFor();
    await page.locator('[data-home-events] summary').click();
    await assertClear(page);
    const cta = page.getByRole('button', { name: 'Carve New Destiny', exact: true });
    assert.equal(await cta.evaluate(element => getComputedStyle(element.parentElement.parentElement).backdropFilter), 'none');
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video && video.readyState >= 2 && video.currentTime > 0 && !video.paused;
    });
    const activeNav = page.locator(width >= 1024 ? '[data-slot="navigation-item"][aria-current="page"]' : '.library-global-navigation button[data-selected="true"]').first();
    const inactiveNav = page.locator(width >= 1024 ? '[data-slot="navigation-item"]' : '.library-global-navigation button').filter({ hasText: 'Create' }).first();
    const colors = await page.locator(nativeColors).evaluateAll(elements => elements.map(element => getComputedStyle(element).color));
    const rainbow = await cta.evaluate(rainbowState);
    const selected = await activeNav.evaluate(navState);
    const resting = await inactiveNav.evaluate(navState);
    assert.equal(selected[1], 'rgba(0, 0, 0, 0.95)', 'Selected navigation button stays black');
    assert.equal(resting[1], 'rgba(0, 0, 0, 0.95)', 'Navigation button stays black');
    assert.equal(await page.locator('.workspace-header').evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(11, 14, 30, 0.9)', 'Header uses V2 Midnight violet');
    const chrome = await page.locator('.workspace-header').evaluate(element => {
      const style = getComputedStyle(element);
      return [style.backgroundImage, style.backgroundColor];
    });
    for (const selector of ['.library-footer']) {
      assert.deepEqual(await page.locator(selector).evaluate(element => {
        const style = getComputedStyle(element);
        return [style.backgroundImage, style.backgroundColor];
      }), chrome, `${selector} shares the purple-blue chrome finish`);
    }
    assert.ok(await page.locator('.library-look').evaluate(element => {
      const style = getComputedStyle(element);
      return style.getPropertyValue('--library-look-art').includes('url(') && style.backgroundImage.includes('url(');
    }), 'Home retains its artwork backdrop behind the content');
    const assertFooterBottom = async () => {
      const bounds = await page.locator('.workspace-shell-main').evaluate(main => {
        main.scrollTop = main.scrollHeight;
        const footer = main.querySelector('.library-footer');
        return { main: main.getBoundingClientRect().bottom, footer: footer.getBoundingClientRect().bottom };
      });
      assert.ok(Math.abs(bounds.footer - bounds.main) <= 1, 'Footer reaches the bottom of the scrolling viewport');
      if (width < 1024) {
        const legal = await page.locator('.library-footer-legal').boundingBox();
        const dock = await page.locator('.library-global-navigation').boundingBox();
        assert.ok(legal.y + legal.height <= dock.y, 'Legal controls remain clear of the navigation dock');
      }
    };
    await assertFooterBottom();
    if (width < 1024) {
      await page.locator('.library-navigation-layout').evaluate(element => element.style.setProperty('--sh-safe-bottom', '34px'));
      await assertFooterBottom();
      await page.locator('.library-navigation-layout').evaluate(element => element.style.removeProperty('--sh-safe-bottom'));
    }
    await page.locator('.library-footer').screenshot({ path: `${output}/footer-${width}.png` });
    await inactiveNav.hover();
    await page.waitForTimeout(350);
    const hovered = await inactiveNav.evaluate(navState);
    assert.notDeepEqual(hovered, resting, 'Navigation must react to hover');
    assert.notEqual(hovered[6], '0s', 'Navigation keeps its transition');
    // Compare with the same canonical components without the palette opt-in.
    await page.getByTestId('novel-expanded-shell').evaluate(element => element.classList.remove('library-look'));
    await page.waitForTimeout(350);
    assert.deepEqual(await cta.evaluate(rainbowState), rainbow, 'Manifest keeps its animated rainbow');
    assert.deepEqual((await activeNav.evaluate(navState)).slice(2), selected.slice(2), 'Selected glow/text/transitions stay native around the black fill');
    assert.deepEqual((await inactiveNav.evaluate(navState)).slice(2), hovered.slice(2), 'Hover glow/text/transitions stay native around the black fill');
    assert.deepEqual(await page.locator(nativeColors).evaluateAll(elements => elements.map(element => getComputedStyle(element).color)), colors, 'Labels retain their own colors');
    await page.getByTestId('novel-expanded-shell').evaluate(element => element.classList.add('library-look'));
    const icons = page.locator(width >= 1024 ? '[data-slot="navigation-icon"]' : '.library-global-navigation button > span[aria-hidden="true"]');
    assert.ok((await icons.evaluateAll(elements => elements.map(element => getComputedStyle(element).color))).every(color => color === 'rgb(255, 255, 255)'));
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/home-${width}.png` });
    // Use the existing app controller and stores for real Home card composition.
    await page.evaluate(async () => {
      const { HarnessGenerationController } = await import('/src/components/harness-generation/shared/controller.ts');
      const { IndexedDbHarnessGenerationRepository } = await import('/src/host/generation/indexedDbRepository.ts');
      const { IndexedDbStoryCoverStore } = await import('/src/host/media/storyCovers.ts');
      const { NOVEL_EXPANDED_STORAGE } = await import('/src/novel-expanded/services.ts');
      const controller = new HarnessGenerationController({ repository: new IndexedDbHarnessGenerationRepository(NOVEL_EXPANDED_STORAGE.stories), modelAdapter: {} });
      await controller.hydrate();
      const covers = new IndexedDbStoryCoverStore(NOVEL_EXPANDED_STORAGE.storyCovers);
      const image = await (await fetch('/card-workshop/test-images/lotus_lake_pavilion_portrait.jpg')).blob();
      for (const title of ['Quiet mountains', 'A distant shore']) {
        const story = await controller.createStory({ title, premise: 'A courier finds her way home.', genre: 'Fantasy' });
        await covers.save(story.id, image);
      }
    });
    await page.reload();
    await page.locator('.world-card-tile').first().waitFor();
    await page.locator('[data-home-events] summary').click();
    await page.locator('.home-featured-dot').nth(1).click();
    await page.locator('.world-card-banner').waitFor();
    await assertClear(page);
    await page.screenshot({ path: `${output}/cards-${width}.png` });
    await page.goto(`${base}/?preview=light-novels-home`);
    const frame = page.frameLocator('iframe[title*="development"]');
    await frame.getByTestId('novel-expanded-home').waitFor();
    if (width >= 1024) await page.getByRole('combobox', { name: /^Viewport/ }).selectOption('laptop');
    await frame.locator('[data-home-events] summary').click();
    await assertClear(frame);
    assert.deepEqual(errors, []);
    results.push({ width, mediaClear: true, navigationEffectsPreserved: true, nativeTextColors: true, whiteIcons: true, workshopChecked: true });
    await context.close();
  }
} finally { await browser.close(); }
writeFileSync(`${output}/verification.json`, JSON.stringify(results, null, 2));
console.log('Home palette regression checks passed:', results);
