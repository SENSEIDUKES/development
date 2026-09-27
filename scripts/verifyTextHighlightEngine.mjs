/** Isolated browser regression suite; never attaches to a user's browser/session. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const output = 'output/playwright/text-highlight-engine';
await mkdir(output, { recursive: true });
const results = [];
const writeResults = () => writeFile(`${output}/verification.json`, JSON.stringify(results, null, 2) + '\n');
await writeResults();
for (const [name, browserType, width, height, touch] of [
  ['chromium-desktop', chromium, 1440, 900, false],
  ['chromium-phone', chromium, 390, 844, true],
  ['chromium-tablet', chromium, 768, 1024, true],
  ['webkit-phone', webkit, 390, 844, true],
  ['webkit-tablet', webkit, 768, 1024, true],
]) {
  if (process.env.TEXT_HIGHLIGHT_CASE && process.env.TEXT_HIGHLIGHT_CASE !== name) continue;
  console.log(`Checking ${name}`);
  const browser = await browserType.launch();
  let page;
  try {
    const context = await browser.newContext({ viewport: { width, height }, screen: { width, height }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.TEXT_HIGHLIGHT_URL ?? 'http://localhost:5173'}/?preview=text-highlight-engine`);
    const paragraph = page.locator('[data-sen-text-block="harbor-arrival"]');
    await paragraph.waitFor();
    await page.evaluate(() => document.fonts.ready);
    const viewport = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio })))));
    if (browserType === webkit && process.platform === 'win32' && Math.abs(viewport.width - width) > 1) {
      const reason = `Windows WebKit viewport mismatch: requested ${width}px, reports ${viewport.width}px (DPR ${viewport.dpr}). Native taps and layout assertions are unreliable on this runner.`;
      results.push({ name, width, height, passed: null, blocked: reason });
      await writeResults();
      console.warn(reason);
      continue;
    }
    const original = await paragraph.textContent();
    let expectedSelection = { start: 12, end: 35, text: original.slice(12, 35) };
    const siblings = await page.locator('[data-sen-text-block]').allTextContents();
    const select = async (start = 12, end = 35) => {
      await paragraph.scrollIntoViewIfNeeded();
      await paragraph.evaluate((element, { start, end }) => {
        const range = document.createRange(); range.setStart(element.firstChild, start); range.setEnd(element.firstChild, end);
        const selection = document.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
      }, { start, end });
      await page.getByRole('button', { name: 'Edit', exact: true }).waitFor();
    };
    const activate = async name => {
      const button = page.getByRole('button', { name, exact: true });
      if (touch) await button.tap(); else await button.click();
    };
    if (!touch) {
      const box = await paragraph.evaluate(element => {
        const range = document.createRange(); range.setStart(element.firstChild, 12); range.setEnd(element.firstChild, 35);
        const rect = range.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
      await page.mouse.move(box.x + 1, box.y + box.height / 2); await page.mouse.down();
      await page.mouse.move(box.x + box.width, box.y + box.height / 2, { steps: 12 }); await page.mouse.up();
      await page.getByRole('button', { name: 'Edit', exact: true }).waitFor();
      // Pixel endpoints vary with platform font metrics. The browser's actual
      // range is the input contract; the editor must preserve it exactly.
      expectedSelection = await paragraph.evaluate(element => {
        const range = document.getSelection().getRangeAt(0);
        assertSameNode(range.startContainer, element.firstChild);
        assertSameNode(range.endContainer, element.firstChild);
        function assertSameNode(actual, expected) { if (actual !== expected) throw new Error('Drag left the intended paragraph'); }
        return { start: range.startOffset, end: range.endOffset, text: range.toString() };
      });
      assert.ok(expectedSelection.start > 0 && expectedSelection.end < original.length && expectedSelection.text.length > 10);
      assert.equal(expectedSelection.text, original.slice(expectedSelection.start, expectedSelection.end));
    } else await select();
    assert.ok(await page.locator('.sen-text-highlight-marks span').count());
    if (!touch) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Edit');
      await page.keyboard.press('Enter');
    } else await activate('Edit');
    const input = page.getByRole('textbox', { name: 'Edit selected text' });
    assert.equal(await input.textContent(), expectedSelection.text);
    assert.ok(await paragraph.locator('[contenteditable]').count());
    const dialog = page.getByRole('group', { name: 'Edit passage' });
    const bounds = await dialog.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
    await page.screenshot({ path: `${output}/${name}-edit.png` });
    if (!touch) {
      const lightStyle = await page.addStyleTag({ content: '[data-sen-text-block] { color: #29251c; background: #fffdf6; }' });
      await page.screenshot({ path: `${output}/${name}-light-edit.png` });
      await lightStyle.evaluate(element => element.remove());
    }
    await input.fill('Mara returned');
    await input.press('End'); await input.press('Enter'); await page.keyboard.insertText('home');
    await activate('Save');
    assert.equal(await paragraph.textContent(), original.slice(0, expectedSelection.start) + 'Mara returned\nhome' + original.slice(expectedSelection.end));
    assert.deepEqual((await page.locator('[data-sen-text-block]').allTextContents()).slice(1), siblings.slice(1));
    assert.equal(await dialog.count(), 0);
    const beforeDeleteText = await paragraph.textContent();
    await select(12, 30); await activate('Edit'); await input.fill('');
    assert.equal(await page.getByRole('button', { name: 'Save', exact: true }).isDisabled(), true);
    const beforeDelete = beforeDeleteText; await activate('Delete Passage');
    assert.equal(await paragraph.textContent(), beforeDelete.slice(0, 12) + beforeDelete.slice(30));
    const undoBounds = await page.getByRole('button', { name: 'Undo', exact: true }).boundingBox();
    assert.ok(undoBounds.y >= 0 && undoBounds.y + undoBounds.height <= height);
    await activate('Undo'); assert.equal(await paragraph.textContent(), beforeDelete);
    await select(); await activate('Edit'); await input.fill('unsaved'); await page.keyboard.press('Escape');
    assert.equal(await paragraph.textContent(), beforeDelete); assert.equal(await dialog.count(), 0);
    await select(); await activate('Edit'); await input.fill('discard on outside click');
    await page.getByText('Highlight a passage, then choose Edit.', { exact: true }).click();
    assert.equal(await paragraph.textContent(), beforeDelete); assert.equal(await dialog.count(), 0);
    await select(); await activate('Edit');
    // Mobile WebKit does not implement mouse-wheel injection.
    await page.evaluate(() => window.scrollBy(0, 160));
    await page.waitForFunction(() => { const box = document.querySelector('[aria-label="Edit passage"]')?.getBoundingClientRect(); return box && box.top >= 0 && box.bottom <= innerHeight; });
    const scrolledBounds = await dialog.boundingBox(); assert.ok(scrolledBounds.y >= 0 && scrolledBounds.y + scrolledBounds.height <= height);
    await page.keyboard.press('Escape');
    await paragraph.evaluate(element => {
      const range = document.createRange(); range.setStart(element.firstChild, 0); range.setEnd(element.nextElementSibling.firstChild, 5);
      document.getSelection().removeAllRanges(); document.getSelection().addRange(range); document.dispatchEvent(new Event('selectionchange'));
    });
    await page.waitForFunction(() => !document.querySelector('.sen-text-highlight-controls'));
    const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(layout.content <= layout.viewport + 1, JSON.stringify(layout));
    assert.deepEqual(errors, []);
    results.push({ name, width, height, touchActivation: touch, nativeTouchSelectionHandles: 'not tested', passed: true });
    await writeResults();
    console.log(`Passed ${name}`);
  } catch (error) {
    results.push({ name, width, height, passed: false, error: String(error) });
    await writeResults();
    console.error(name, error);
    if (page) {
      console.error(await page.evaluate(() => ({ scrollY, viewport: { width: innerWidth, height: innerHeight, top: visualViewport?.offsetTop },
        controls: Array.from(document.querySelectorAll('.sen-text-highlight-controls')).map(el => ({ rect: el.getBoundingClientRect().toJSON(), html: el.outerHTML })) })));
      await page.screenshot({ path: `${output}/${name}-failure.png` });
    }
    throw error;
  } finally { await browser.close(); }
}
console.log(JSON.stringify(results, null, 2));
