/** Focused input regressions: isolated browser contexts, no user's storage or model calls. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const output = 'output/playwright/highlight-engine';
await mkdir(output, { recursive: true });
const results = [];
for (const [name, browserType, touch] of [['chromium-mouse', chromium, false], ['chromium-touch', chromium, true], ['webkit-mouse', webkit, false]]) {
  const browser = await browserType.launch();
  let page;
  try {
    const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: touch, isMobile: touch });
    if (browserType === chromium) await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    page = await context.newPage();
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
      // A fling may continue on the browser's compositor after scrollIntoView.
      // Target the next word only once its screen position has stopped moving.
      await paragraph.evaluate(element => new Promise((resolve, reject) => {
        let previous = element.getBoundingClientRect().top;
        let stableSince = performance.now(); const deadline = stableSince + 5000;
        const check = now => {
          const current = element.getBoundingClientRect().top;
          if (Math.abs(current - previous) > .25) { previous = current; stableSince = now; }
          if (now - stableSince >= 200) resolve();
          else if (now >= deadline) reject(new Error('The swipe did not settle before the next gesture'));
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }));
      // This is a real browser touch stream, not a range installed by the test.
      const held = await point(15);
      await send('touchStart', held);
      await page.getByRole('button', { name: 'Select text', exact: true }).waitFor();
      await send('touchEnd');
      assert.equal(await page.getByRole('slider').count(), 0);
      assert.equal(await page.locator('.sen-text-highlight-marks').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Edit', exact: true }).count(), 0);
      await page.screenshot({ path: `${output}/chromium-touch-select-text-gate.png` });
      await page.getByRole('button', { name: 'Select text', exact: true }).tap();
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
      // The upward-facing start cap still drags into the text rather than the previous line.
      const startHandle = page.getByRole('slider', { name: 'Selection start' });
      const startBounds = await startHandle.boundingBox();
      const startOrigin = { x: startBounds.x + 22, y: startBounds.y + 33 };
      const startAdjustment = await startHandle.evaluate(element => ({ x: Number(element.dataset.senSelectionX), y: Number(element.dataset.senSelectionY) }));
      const firstWord = await point(0);
      await send('touchStart', startOrigin);
      for (let n = 1; n <= 5; n++) await send('touchMove', {
        x: startOrigin.x + (firstWord.x - startAdjustment.x) * n / 5,
        y: startOrigin.y + (firstWord.y - startAdjustment.y) * n / 5,
      });
      await send('touchEnd'); await bar.waitFor();
      assert.match(await selected(), /Characters 0–65/); await nativeEmpty();
    } else {
      const start = await point(14); const end = await point(35);
      await page.mouse.move(start.x, start.y); await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 8 }); await page.mouse.up();
      await bar.waitFor(); assert.match(await selected(), /Characters 14–35/); await nativeEmpty();
      // A normal outside click leaves a native caret. Repeated selections must
      // replace it, rather than disappearing when the mouse is released.
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByText('Hold a word, tap Select text, then choose Edit, Copy or Media. With a mouse, drag to select.', { exact: true }).click();
        assert.equal(await bar.count(), 0);
        assert.equal(await page.evaluate(() => getSelection().type), 'Caret');
        await paragraph.evaluate(element => element.scrollIntoView({ block: 'center' }));
        const from = await point(14); const to = await point(35);
        await page.mouse.move(from.x, from.y); await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 8 });
        await page.waitForFunction(() => document.querySelector('[data-testid="manuscript-selection"]')?.textContent.includes('Characters 14–35'));
        await page.mouse.up(); await page.mouse.move(to.x + 20, to.y + 50);
        await bar.waitFor({ timeout: 3000 });
        assert.match(await selected(), /Characters 14–35/); await nativeEmpty();
      }
      const wordPoint = await point(14);
      await page.keyboard.press('Escape');
      await page.mouse.dblclick(wordPoint.x, wordPoint.y); await bar.waitFor();
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
    if (browserType === chromium) {
      // The inspector creates a native range from a focused external button.
      // Once captured by the engine, keyboard Copy still belongs to that selection.
      await page.getByTestId('manuscript-structure').locator('summary').click();
      const sentence = page.locator('[data-sentence-id]').first();
      await sentence.click(); await bar.waitFor(); await nativeEmpty();
      assert.equal(await sentence.evaluate(element => document.activeElement === element), true);
      const address = (await selected()).match(/Characters (\d+)–(\d+)/);
      const expected = (await paragraph.textContent()).slice(Number(address[1]), Number(address[2]));
      await page.keyboard.press('ControlOrMeta+C');
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected, 'Copy must include inspector-created selections');
    }
    assert.deepEqual(errors, []);
    results.push({ name, passed: true, input: touch ? 'Chromium CDP touch stream; physical iOS not tested' : 'browser mouse and keyboard' });
    console.log(`Passed ${name} owned selection`);
  } catch (error) {
    if (page) {
      await page.screenshot({ path: `${output}/${name}-owned-failure.png` }).catch(() => {});
      console.error(name, await page.evaluate(() => ({ scrollY, nativeSelection: getSelection()?.toString(),
        selection: document.querySelector('[data-testid="manuscript-selection"]')?.textContent })).catch(() => null));
    }
    throw error;
  } finally { await browser.close(); }
}
await writeFile(`${output}/owned-selection.json`, JSON.stringify(results, null, 2) + '\n');
