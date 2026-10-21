/** Focused input regressions: isolated browser contexts, no user's storage or model calls. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const output = 'output/playwright/highlight-engine';
await mkdir(output, { recursive: true });
const results = [];
for (const [name, browserType, touch] of [['chromium-mouse', chromium, false], ['chromium-touch', chromium, true], ['webkit-mouse', webkit, false]]) {
  const browser = await browserType.launch();
  try {
    const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: touch, isMobile: touch });
    if (browserType === chromium) await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.HIGHLIGHT_ENGINE_URL ?? 'http://localhost:5173'}/?preview=highlight-engine`);
    const paragraph = page.locator('[data-sen-text-block]').first();
    await paragraph.waitFor(); await page.evaluate(() => document.fonts.ready);
    await paragraph.evaluate(element => element.scrollIntoView({ block: 'center' }));
    const text = await paragraph.textContent();
    const point = offset => paragraph.evaluate((element, offset) => {
      const range = document.createRange(); range.setStart(element.firstChild, offset); range.setEnd(element.firstChild, offset + 1);
      const rect = range.getBoundingClientRect(); return { x: rect.left + 1, y: rect.top + rect.height / 2 };
    }, offset);
    const nativeEmpty = async () => assert.equal(await page.evaluate(() => getSelection().rangeCount), 0, `${name}: a browser selection survived`);
    const selected = () => page.getByTestId('manuscript-selection').textContent();
    const bar = page.locator('.sen-text-highlight-controls');
    if (touch) {
      const cdp = await context.newCDPSession(page);
      const send = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ ...p, id: 1, radiusX: 2, radiusY: 2 }] : [] });
      // An ordinary finger swipe scrolls rather than creating a selection.
      const start = await point(20);
      const before = await page.evaluate(() => scrollY);
      await send('touchStart', start);
      for (let n = 1; n <= 5; n++) await send('touchMove', { x: start.x, y: start.y - n * 22 });
      await send('touchEnd');
      await page.waitForFunction(y => Math.abs(scrollY - y) > 30, before);
      assert.equal(await bar.count(), 0); await nativeEmpty();
      await paragraph.evaluate(element => element.scrollIntoView({ block: 'center' }));
      // This is a real browser touch stream, not a range installed by the test.
      const held = await point(15);
      await send('touchStart', held);
      await page.waitForFunction(() => document.querySelector('[data-testid="manuscript-selection"]')?.textContent.includes('“split”'));
      await send('touchEnd');
      await bar.waitFor(); await nativeEmpty();
      assert.match(await selected(), /“split”/);
      const handle = page.getByRole('slider', { name: 'Selection end' });
      const bounds = await handle.boundingBox(); assert.ok(bounds.width >= 44 && bounds.height >= 44);
      const origin = { x: bounds.x + 22, y: bounds.y + 22 };
      const adjustment = await handle.evaluate(element => ({ x: Number(element.dataset.senSelectionX), y: Number(element.dataset.senSelectionY) }));
      const destination = await point(35);
      await send('touchStart', origin);
      for (let n = 1; n <= 5; n++) await send('touchMove', {
        x: origin.x + (destination.x - adjustment.x) * n / 5, y: origin.y + (destination.y - adjustment.y) * n / 5,
      });
      await send('touchEnd'); await bar.waitFor();
      assert.match(await selected(), /Characters 14–35/); await nativeEmpty();
      // A physical handle drag, including a line break, reaches a longer passage.
      const endBounds = await handle.boundingBox();
      const endOrigin = { x: endBounds.x + 22, y: endBounds.y + 22 };
      const endAdjustment = await handle.evaluate(element => ({ x: Number(element.dataset.senSelectionX), y: Number(element.dataset.senSelectionY) }));
      const nextLine = await point(65);
      await send('touchStart', endOrigin);
      for (let n = 1; n <= 6; n++) await send('touchMove', {
        x: endOrigin.x + (nextLine.x - endAdjustment.x) * n / 6, y: endOrigin.y + (nextLine.y - endAdjustment.y) * n / 6,
      });
      await send('touchEnd'); await bar.waitFor();
      assert.match(await selected(), /Characters 14–65/); await nativeEmpty();
    } else {
      const start = await point(14); const end = await point(35);
      await page.mouse.move(start.x, start.y); await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 8 }); await page.mouse.up();
      await bar.waitFor(); assert.match(await selected(), /Characters 14–35/); await nativeEmpty();
      await page.keyboard.press('Escape');
      await page.mouse.dblclick(start.x, start.y); await bar.waitFor();
      assert.match(await selected(), /“split”/); await nativeEmpty();
      await page.keyboard.press('Escape'); await paragraph.focus(); await page.keyboard.press('Enter');
      assert.match(await selected(), /“The”/); await page.keyboard.press('Shift+ArrowRight');
      assert.match(await selected(), /Characters 0–4/); await nativeEmpty();
      await page.getByRole('slider', { name: 'Selection end' }).focus(); await page.keyboard.press('End');
      assert.match(await selected(), new RegExp(`Characters 0–${text.length}`));
    }
    if (browserType === chromium) {
      const address = (await selected()).match(/Characters (\d+)–(\d+)/);
      const expected = text.slice(Number(address[1]), Number(address[2]));
      if (!touch) {
        await page.keyboard.press('ControlOrMeta+C');
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected, 'Keyboard Copy must work without native selection');
      }
      await bar.getByRole('button', { name: 'Copy', exact: true }).click();
      await page.getByRole('status').filter({ hasText: /^Copied$/ }).waitFor();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected);
    }
    await page.screenshot({ path: `${output}/${name}-owned-selection.png` });
    await bar.getByRole('button', { name: 'Edit', exact: true }).click();
    const editor = page.getByRole('textbox', { name: 'Edit selected text' });
    await editor.fill('Edited with the engine');
    await bar.getByRole('button', { name: 'Save', exact: true }).click();
    assert.match(await paragraph.textContent(), /Edited with the engine/);
    assert.equal(await page.getByRole('slider').count(), 0);
    assert.deepEqual(errors, []);
    results.push({ name, passed: true, input: touch ? 'Chromium CDP touch stream; physical iOS not tested' : 'browser mouse and keyboard' });
    console.log(`Passed ${name} owned selection`);
  } finally { await browser.close(); }
}
await writeFile(`${output}/owned-selection.json`, JSON.stringify(results, null, 2) + '\n');
