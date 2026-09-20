import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Start the Development server first; no provider requests are made.
const origin = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch();
await mkdir('output/playwright', { recursive: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/?preview=story-seed&state=empty-intake`);
    const selectors = ['#origin-style-title', '#origin-genre-title', 'label[for="origin-story-title-input"]', 'label[for="core-premise-input"]', 'section[aria-label="Pressure"]', 'section[aria-label="Survival"]', '#origin-tags-title'];
    await page.locator('#origin-tags-title').waitFor();
    const boxes = [];
    for (const selector of selectors) {
      const locator = page.locator(selector);
      assert.equal(await locator.count(), 1, `${width}: ${selector} appears once`);
      assert(await locator.isVisible(), `${width}: ${selector} is visible`);
      boxes.push(await locator.boundingBox());
    }
    boxes.forEach((box, index) => {
      assert(box.x >= -1 && box.x + box.width <= width + 1, `${width}: field stays within viewport`);
      if (index) assert(box.y >= boxes[index - 1].y + boxes[index - 1].height, `${width}: approved vertical order`);
    });
    assert.equal(await page.getByLabel('Title', { exact: true }).count(), 1);
    assert.equal(await page.getByRole('textbox', { name: /^Synopsis/ }).count(), 1);
    const pressure = page.getByRole('radiogroup', { name: 'Pressure', exact: true });
    await pressure.getByRole('radio', { name: /^Heaven/ }).click();
    assert.equal(await pressure.getByRole('radio', { name: /^Heaven/ }).getAttribute('aria-checked'), 'true');
    const survival = page.getByRole('switch', { name: 'Survival', exact: true });
    await survival.click();
    assert.equal(await survival.getAttribute('aria-checked'), 'true');
    await page.getByRole('radiogroup', { name: 'Fate Visibility', exact: true }).getByRole('radio', { name: /^Partial Fate/ }).click();
    await survival.click();
    assert.equal(await pressure.getByRole('radio', { name: /^Heaven/ }).getAttribute('aria-checked'), 'true');
    await survival.click();
    assert.equal(await page.getByRole('radio', { name: /^Partial Fate/ }).getAttribute('aria-checked'), 'true');
    for (const style of ['Chinese', 'Japanese', 'Korean']) {
      const radio = page.getByRole('radio', { name: style, exact: true });
      await radio.click();
      assert.equal(await radio.getAttribute('aria-checked'), 'true');
    }
    await page.getByLabel('Title', { exact: true }).fill('Origin browser verification');
    await page.getByRole('textbox', { name: /^Synopsis/ }).fill('A traveler returns to the mountain gate.');
    await page.locator('#origin-style-title').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/story-seed-origin-${width}.png`, fullPage: true });
    const settings = page.getByRole('button', { name: 'Settings', exact: true });
    await settings.filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Story Seed settings', exact: true });
    assert.equal(await dialog.getByRole('switch', { name: 'Survival', exact: true }).count(), 0);
    assert.equal(await dialog.getByRole('radiogroup', { name: 'Pressure', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    console.log(`Origin ${width}px: order, labels, bounds, controls, visibility retention, styles, and Settings passed.`);
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
} finally { await browser.close(); }
