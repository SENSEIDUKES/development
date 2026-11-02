#!/usr/bin/env node
/**
 * App + canonical Workshop Reader, phone + desktop. Uses the saved Workshop
 * story in isolated browser storage, controlled speech, and silent WAV media.
 * No generation/provider calls. Checks real cue requests and follow-along UI.
 * Run against Vite: node scripts/verifyNarrationCues.browser.mjs [base URL]
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173';
const output = 'artifacts/narration-cues';
mkdirSync(output, { recursive: true });
const speech = stripTypeScriptTypes(readFileSync('src/test-utils/fakeSpeechSynthesis.ts', 'utf8'), { mode: 'transform' })
  .replace(/^export /gm, '') + `
window.__speech = createFakeSpeechSynthesis();
Object.defineProperty(window, 'speechSynthesis', { value: window.__speech.speechSynthesis, configurable: true });
Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: window.__speech.SpeechSynthesisUtterance, configurable: true });`;
// Long enough to prove Pause stops a sound that has not finished naturally.
const silence = Buffer.alloc(44 + 8000 * 30, 128);
silence.write('RIFF', 0); silence.writeUInt32LE(silence.length - 8, 4); silence.write('WAVE', 8);
silence.write('fmt ', 12); silence.writeUInt32LE(16, 16); silence.writeUInt16LE(1, 20); silence.writeUInt16LE(1, 22);
silence.writeUInt32LE(8000, 24); silence.writeUInt32LE(8000, 28); silence.writeUInt16LE(1, 32); silence.writeUInt16LE(8, 34);
silence.write('data', 36); silence.writeUInt32LE(silence.length - 44, 40);

const browser = await chromium.launch();
try {
  // Load the existing fixture on a separate Workshop page. The app itself
  // still loads only its own production import graph.
  const setup = await browser.newPage();
  await setup.goto(base);
  const state = await setup.evaluate(async () => (await import('/src/workshop/previews/reader-chamber/sampleStory.ts')).loadSampleStory());
  await setup.close();
  const chapter = state.chapters.find(chapter => chapter.chapterNumber === 1);
  const firstCue = [...chapter.soundCues].sort((a, b) => {
    const block = anchor => Number(anchor.blockId.split('-p')[1]);
    return block(a.anchor) - block(b.anchor) || a.anchor.startOffset - b.anchor.startOffset;
  })[0];
  const cueUrls = chapter.soundCues.map(cue => cue.payload.cue.publicUrl);
  assert(firstCue, 'The existing fixture must contain a cue.');

  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    for (const surface of ['app', 'workshop']) {
      const label = `${surface}-${viewport.width}`;
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.addInitScript({ content: speech });
      await context.addInitScript(() => {
        window.__mediaPlays = [];
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          window.__mediaPlays.push({ url: this.currentSrc || this.src, words: window.__speech.current?.text, element: this });
          return play.call(this);
        };
      });
      await context.route(/https:\/\/[^/]*seihouse[^/]*\/.*\.(mp3|wav|ogg|m4a)(\?.*)?$/i,
        route => route.fulfill({ contentType: 'audio/wav', body: silence, headers: { 'access-control-allow-origin': '*' } }));
      const page = await context.newPage();
      if (surface === 'app') {
        await page.goto(base);
        await page.evaluate(async state => {
          const { IndexedDbHarnessGenerationRepository } = await import('/src/host/generation/indexedDbRepository.ts');
          await new IndexedDbHarnessGenerationRepository('novelexpanded-harness-stories-v1').save(state);
        }, state);
      }
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(surface === 'app' ? `${base}/app/?story=${state.stories[0].id}&read=1` : `${base}/?preview=reader-chamber`);
      const reader = page.getByTestId('harness-reader');
      await reader.waitFor().catch(async error => {
        await page.screenshot({ path: `${output}/${label}-failure.png` });
        console.error(label, errors, (await page.locator('body').innerText()).slice(0, 1800));
        throw error;
      });
      await page.evaluate(() => document.fonts.ready);
      const heard = () => page.evaluate(urls => window.__mediaPlays.filter(play => urls.includes(play.url)).map(({ url, words }) => ({ url, words })), cueUrls);
      assert.equal((await heard()).length, 0, `${label}: silent opening`);
      await page.evaluate(() => window.scrollTo(0, 800));
      await page.waitForTimeout(100);
      assert.equal((await heard()).length, 0, `${label}: silent scrolling`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/${label}-silent.png` });
      await page.getByRole('button', { name: 'Listen', exact: true }).click();
      for (let i = 0; i < 200; i++) {
        await page.waitForFunction(() => Boolean(window.__speech.current), null, { timeout: 5000 }).catch(async error => {
          console.error(label, i, await page.evaluate(() => ({ spoken: window.__speech.spoken.map(line => line.text), status: document.querySelector('[data-testid="read-aloud-player"]')?.getAttribute('data-status') })), errors);
          throw error;
        });
        const current = await page.evaluate(() => window.__speech.current?.text);
        if (current?.startsWith(firstCue.anchor.selectedText)) break;
        assert(current, `${label}: narration stopped before the cue`);
        await page.evaluate(() => { window.__speech.start(); window.__speech.finish(); });
        await page.waitForTimeout(70);
      }
      assert((await page.evaluate(() => window.__speech.current?.text))?.startsWith(firstCue.anchor.selectedText), `${label}: reached pinned words`);
      assert.equal((await heard()).length, 0, `${label}: no sound before speech start`);
      await page.evaluate(() => { window.__lateStart = window.__speech.current.onstart; });
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.evaluate(() => window.__lateStart?.({}));
      await page.waitForTimeout(550);
      assert.equal((await heard()).length, 0, `${label}: paused speech cannot trigger a cue`);
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await page.evaluate(() => window.__speech.start());
      await page.waitForFunction(url => window.__mediaPlays.some(play => play.url === url), firstCue.payload.cue.publicUrl);
      const automatic = await heard();
      assert.equal(automatic.length, 1, `${label}: one automatic cue`);
      assert(automatic[0].words.startsWith(firstCue.anchor.selectedText), `${label}: sound starts on the pinned words`);
      assert(await page.locator('[data-overlay-id="read-aloud"]').count(), `${label}: sentence light`);
      // A reader who scrolls away can return to the narration on either size.
      await page.mouse.wheel(0, 1400);
      const back = page.getByRole('button', { name: 'Back to narration', exact: true });
      await back.waitFor();
      await back.click();
      await page.waitForTimeout(150);
      const bounds = await page.locator('[data-overlay-id="read-aloud"]').first().boundingBox();
      assert(bounds && bounds.y >= 0 && bounds.y < viewport.height, `${label}: narration back in view`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: no horizontal overflow`);
      await page.screenshot({ path: `${output}/${label}-listening.png` });
      await page.waitForFunction(url => window.__mediaPlays.some(play => play.url === url && !play.element.paused && !play.element.ended), firstCue.payload.cue.publicUrl);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      assert(await page.evaluate(urls => window.__mediaPlays.filter(play => urls.includes(play.url)).every(play => play.element.paused), cueUrls), `${label}: Pause cuts off active cue audio`);
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await page.evaluate(() => window.__speech.start());
      await page.waitForTimeout(550);
      assert.equal((await heard()).length, 1, `${label}: resume does not replay`);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await reader.locator(`[data-sound-cue-id="${firstCue.id}"]`).click();
      assert.equal((await heard()).length, 2, `${label}: manual replay still works`);
      assert.deepEqual(errors, [], `${label}: no page errors`);
      console.log(`${label}: cue timing, active-sound cutoff, pause/resume, manual tap, follow-along and layout passed`);
      await context.close();
    }
  }
} finally { await browser.close(); }
