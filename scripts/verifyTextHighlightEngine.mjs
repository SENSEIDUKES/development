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
    // Manuscript paragraph IDs are generated, so the three sample paragraphs are located by reading order.
    const paragraph = page.locator('[data-sen-text-block]').nth(0);
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
    const colorPicker = page.getByLabel('Highlight color');
    await colorPicker.dispatchEvent('pointerdown', { bubbles: true, pointerType: touch ? 'touch' : 'mouse' });
    await colorPicker.fill('#88ccff');
    assert.equal(await page.locator('.sen-text-highlight-marks span').first().evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(136, 204, 255, 0.35)');
    await colorPicker.fill('#8c6ee1');
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
    await page.getByText('Highlight words, then choose Edit or Media.', { exact: true }).click();
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
    await page.evaluate(() => document.getSelection()?.removeAllRanges());
    const cueParagraph = page.locator('[data-sen-text-block]').nth(1);
    const cueOriginal = await cueParagraph.textContent();
    await cueParagraph.scrollIntoViewIfNeeded();
    await cueParagraph.evaluate(element => {
      const phrase = 'temple bells'; const start = element.firstChild.textContent.indexOf(phrase);
      const range = document.createRange(); range.setStart(element.firstChild, start); range.setEnd(element.firstChild, start + phrase.length);
      document.getSelection().removeAllRanges(); document.getSelection().addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await page.waitForFunction(() => document.querySelector('[data-testid="manuscript-address"]')?.textContent === 'Paragraph 2 · Sentence 8');
    await page.screenshot({ path: `${output}/${name}-cue-actions.png` });
    if (touch) { await activate('Media'); await activate('Audio'); await activate('Cue'); }
    else {
      for (const name of ['Media', 'Audio', 'Cue']) {
        await page.getByRole('button', { name, exact: true }).focus();
        await page.keyboard.press('Enter');
      }
    }
    assert.equal(await page.locator('.sen-manual-cue-picker__item').count(), 92);
    assert.equal(await page.locator('.sen-manual-cue-picker__number').first().textContent(), '#001');
    assert.equal(await page.locator('.sen-manual-cue-picker__number').last().textContent(), '#092');
    const category = page.getByLabel('Category', { exact: true });
    const search = page.getByLabel('Search cues', { exact: true });
    await category.selectOption('weapons');
    assert.equal(await page.locator('.sen-manual-cue-picker__item').count(), 20);
    await search.fill(' SWORD ');
    assert.equal(await page.locator('.sen-manual-cue-picker__item').count(), 7);
    assert.equal(await page.locator('.sen-manual-cue-picker__number').first().textContent(), '#012');
    assert.ok(await page.locator('.sen-text-highlight-marks span').count());
    await page.screenshot({ path: `${output}/${name}-cue-filtered.png` });
    await search.fill('not-a-real-cue');
    assert.equal(await page.locator('.sen-manual-cue-picker__item').count(), 0);
    assert.match(await page.locator('.sen-manual-cue-picker__empty').textContent(), /No Sound Cues match/);
    await search.fill('');
    await category.selectOption('all');
    assert.equal(await page.locator('.sen-manual-cue-picker__item').count(), 92);
    const press = async locator => touch ? locator.tap() : locator.click();
    await press(page.locator('.sen-manual-cue-picker__item').first().getByRole('button', { name: 'Preview' }));
    await page.waitForFunction(() => Array.from(document.querySelectorAll('audio')).some(audio => audio.currentSrc.includes('celestialaudio.seihouse.org')));
    await page.screenshot({ path: `${output}/${name}-cue-picker.png` });
    await press(page.locator('.sen-manual-cue-picker__item').first().getByRole('button', { name: 'Select' }));
    assert.equal(await cueParagraph.locator('[data-cue-annotation]').count(), 1);
    assert.equal(await cueParagraph.locator('.inline-world-cue-annotation__text').textContent(), 'temple bells');
    assert.equal((await cueParagraph.textContent()).replaceAll('\u2060', ''), cueOriginal);
    const glyphMetrics = await cueParagraph.locator('[data-action-type="world-cue"]').evaluate(element => ({
      width: element.getBoundingClientRect().width,
      fontSize: parseFloat(getComputedStyle(element.parentElement).fontSize),
      paddingLeft: getComputedStyle(element).paddingLeft,
    }));
    assert.ok(glyphMetrics.width < glyphMetrics.fontSize * 1.25, JSON.stringify(glyphMetrics));
    assert.equal(glyphMetrics.paddingLeft, '0px');
    await page.screenshot({ path: `${output}/${name}-cue-placed.png` });
    await press(cueParagraph.locator('[data-action-type="world-cue"]'));
    await page.waitForFunction(() => {
      const control = document.querySelector('[data-action-type="world-cue"]');
      return control?.getAttribute('data-state') === 'playing' || control?.getAttribute('data-state') === 'loading';
    });
    await cueParagraph.locator('.inline-world-cue-annotation__text').evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      document.getSelection().removeAllRanges(); document.getSelection().addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await activate('Media'); await activate('Audio'); await activate('Cue');
    assert.equal(await page.getByRole('button', { name: 'Remove cue' }).count(), 1);
    await press(page.locator('.sen-manual-cue-picker__item').nth(1).getByRole('button', { name: 'Replace' }));
    assert.equal(await cueParagraph.locator('[data-cue-annotation]').count(), 1);
    await cueParagraph.locator('.inline-world-cue-annotation__text').evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      document.getSelection().removeAllRanges(); document.getSelection().addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await activate('Media'); await activate('Audio'); await activate('Cue');
    await activate('Remove cue');
    assert.equal(await cueParagraph.locator('[data-cue-annotation]').count(), 0);
    assert.equal(await cueParagraph.textContent(), cueOriginal);
    const letterParagraph = page.locator('[data-sen-text-block]').nth(2);
    const letterOriginal = await letterParagraph.textContent();
    await letterParagraph.scrollIntoViewIfNeeded();
    await letterParagraph.evaluate(element => {
      const phrase = 'like cold fire'; const start = element.firstChild.textContent.indexOf(phrase);
      const range = document.createRange(); range.setStart(element.firstChild, start); range.setEnd(element.firstChild, start + phrase.length);
      document.getSelection().removeAllRanges(); document.getSelection().addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await activate('Media'); await activate('Audio'); await activate('Cue');
    await press(page.locator('.sen-manual-cue-picker__item').first().getByRole('button', { name: 'Select' }));
    const punctuationLayout = await letterParagraph.locator('[data-cue-annotation]').evaluate(annotation => {
      const glyph = annotation.querySelector('[data-action-type="world-cue"]').getBoundingClientRect();
      const punctuation = document.createRange();
      const punctuationNode = annotation.lastChild;
      punctuation.selectNodeContents(punctuationNode);
      const mark = punctuation.getBoundingClientRect();
      return { gap: mark.left - glyph.right, overlapsVertically: mark.top < glyph.bottom && mark.bottom > glyph.top,
        fontSize: parseFloat(getComputedStyle(annotation).fontSize) };
    });
    assert.ok(punctuationLayout.gap >= -2 && punctuationLayout.gap < punctuationLayout.fontSize, JSON.stringify(punctuationLayout));
    assert.ok(punctuationLayout.overlapsVertically, JSON.stringify(punctuationLayout));
    assert.equal((await letterParagraph.textContent()).replaceAll('\u2060', ''), letterOriginal);
    await page.screenshot({ path: `${output}/${name}-cue-punctuation.png` });

    // Manuscript lab: pick a saved sentence from the page structure and attach a cue to the whole sentence.
    const structure = page.getByTestId('manuscript-structure');
    await press(structure.locator('summary'));
    const sentence = 'Dust swallowed the courtyard.';
    await press(structure.locator('[data-sentence-id]', { hasText: sentence }));
    await page.waitForFunction(text => document.querySelector('[data-testid="manuscript-selection"]')?.textContent?.includes(`“${text}”`), sentence);
    assert.match(await page.getByTestId('manuscript-selection').textContent(), /exactly one sentence/);
    await activate('Media'); await activate('Audio'); await activate('Cue'); await activate('Sentence');
    await press(page.locator('.sen-manual-cue-picker__item').first().getByRole('button', { name: 'Select' }));
    assert.equal(await paragraph.locator('.inline-world-cue-annotation__text').textContent(), sentence);
    assert.equal(await page.locator('[data-testid="manuscript-attachment"][data-status="placed"]').count(), 2);
    await page.screenshot({ path: `${output}/${name}-lab-sentence-cue.png`, fullPage: true });

    // Editing the attached sentence flags the cue instead of moving it; Keep puts it on the new words.
    await paragraph.locator('.inline-world-cue-annotation__text').scrollIntoViewIfNeeded();
    await paragraph.locator('.inline-world-cue-annotation__text').evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      document.getSelection().removeAllRanges(); document.getSelection().addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await activate('Edit'); await input.fill('Dust filled the courtyard.'); await activate('Save');
    await page.locator('[data-testid="manuscript-attachment"][data-status="changed"]').waitFor();
    assert.equal(await paragraph.locator('[data-cue-annotation]').count(), 0);
    await page.getByTestId('manuscript-attachment').filter({ hasText: 'Words changed' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${name}-lab-flagged.png` });
    await activate('Keep');
    assert.equal(await page.locator('[data-testid="manuscript-attachment"][data-status="changed"]').count(), 0);
    assert.equal(await paragraph.locator('.inline-world-cue-annotation__text').textContent(), 'Dust filled the courtyard.');

    // Sealing fixes the page: selection still reads its address, but editing and attaching are gone.
    await activate('Seal chapter'); await activate('Seal');
    await page.waitForFunction(() => document.querySelector('[data-testid="manuscript-status"]')?.textContent === 'Sealed');
    await cueParagraph.scrollIntoViewIfNeeded();
    await cueParagraph.evaluate(element => {
      const range = document.createRange(); range.setStart(element.firstChild, 0); range.setEnd(element.firstChild, 6);
      document.getSelection().removeAllRanges(); document.getSelection().addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await page.waitForFunction(() => document.querySelector('[data-testid="manuscript-address"]')?.textContent === 'Paragraph 2 · Sentence 6');
    assert.equal(await page.locator('.sen-text-highlight-controls').count(), 0);
    await page.screenshot({ path: `${output}/${name}-lab-sealed.png`, fullPage: true });
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
