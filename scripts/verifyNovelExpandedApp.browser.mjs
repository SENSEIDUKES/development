#!/usr/bin/env node
/**
 * Walks the NovelExpanded app in Chromium at phone (390px) and laptop (1440px)
 * widths against a running dev server, with both APIs stubbed:
 *
 * `/app` → empty Home → Create → token sheet → World Blueprint (Arc 1 only,
 * the hidden look-ahead nowhere on screen, every blank Seed slot filled) → Manifest
 * Story → Story View → Start Story under the veil → Chapter 1 with its Sound
 * Cue → Listen (three voices from the writer's speaker tags, the spoken
 * sentence lit, Pause and Resume, Reader Settings → Narration with the speed
 * kept on the device) → reload (no new request, nothing reads by itself) →
 * Back → Continue · Ch. 1 → Back → Home card → browser Back and Forward → a
 * missing story goes Home.
 *
 * Headless Chromium has no voices, so a stand-in for the browser's speech is
 * installed before the app loads; each line ends on its own after a moment,
 * or waits for the walk while `__speechHold` is set.
 *
 * It fails on any page error, any memory request, and any module request into
 * the Workshop, the older Reader or Codex (its narration included), or the
 * HARNESS developer page.
 *
 * Usage: start `npm run dev -- --host 127.0.0.1`, then
 *   node scripts/verifyNovelExpandedApp.browser.mjs [base URL]
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = (process.argv[2] ?? process.env.NOVEL_EXPANDED_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const OUTPUT = 'output/playwright/novel-expanded';
const TOKEN = 'browser-walk-token';
const VIEWPORTS = [{ name: 'phone', width: 390, height: 844 }, { name: 'laptop', width: 1440, height: 900 }];
const SHARED_READER_CONTRACTS = /\/src\/components\/reader-(?:chamber\/shared\/(?:readerLanguage|manifestationEligibility|cinematicScroll\/anchors|cinematicScroll\/useSemanticReadingPosition)|codex\/shared\/types)\.ts/;
const FORBIDDEN_MODULE = /\/src\/(?:workshop\/|library\/generation\/|components\/reader-(?:chamber|codex)\/|host\/reader\/webSpeechNarration)/;

const receipt = { provider: 'gemini', model: 'fixture', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' } };
const chapter = {
  title: 'Low Tide',
  paragraphs: [
    'The tide pulled back from the drowned gate, and [[1|the beast roared]] across the causeway.',
    'Mara counted the bells that no longer rang.',
    // The writer tags who speaks: the main character's line, then someone else's.
    '[[@Ye Chen]] “Ring the bells,” Ye Chen said.',
    '[[@Junior Sister Han]] “They are drowned,” she whispered.',
  ],
  // One of the Library's sound words, so the cue is placed (an unknown sound is set aside).
  soundCues: [{ mark: 1, sound: 'beast roar' }],
  arcCompletion: { goalId: 'none', completed: false, evidence: '' },
  recap: 'Mara returns to the drowned city.',
  chapterFunction: 'progression',
  nextProgression: 'Mara climbs the bell tower.',
  nextWorldBuilding: 'The keeper explains the drowned law.',
  nextConflict: 'The tide wardens seize the causeway.',
};

const check = (condition, message) => { if (!condition) throw new Error(message); };

/**
 * The browser's speech, for a headless browser that has none: Apple-like
 * voices, lines that start and end on their own, and a log of what was spoken.
 */
function installSpeechStandIn() {
  const voices = [['Samantha', 'en-US', true], ['Bubbles', 'en-US', false], ['Daniel', 'en-GB', false], ['Rishi', 'en-IN', false], ['Kyoko', 'ja-JP', false]]
    .map(([name, lang, isDefault]) => ({ voiceURI: `fake:${name}`, name, lang, localService: true, default: isDefault }));
  const spoken = [];
  let current = null;
  let queue = [];
  let ending = 0;
  window.__spoken = spoken;
  window.__cancels = 0;
  const synth = {
    speaking: false, pending: false, paused: false,
    getVoices: () => voices.slice(),
    addEventListener() {}, removeEventListener() {},
    speak(utterance) {
      spoken.push({ text: utterance.text, voice: utterance.voice ? utterance.voice.name : null, lang: utterance.lang, rate: utterance.rate });
      queue.push(utterance);
      if (!current) next();
    },
    cancel() {
      window.__cancels += 1;
      clearTimeout(ending);
      const dropped = [current, ...queue].filter(Boolean);
      current = null;
      queue = [];
      synth.speaking = false;
      for (const utterance of dropped) utterance.onerror?.({ error: 'interrupted' });
    },
    pause() {}, resume() {},
  };
  const finish = utterance => {
    if (current !== utterance) return;
    current = null;
    synth.speaking = false;
    utterance.onend?.({});
    // The player usually speaks its next line from onend; only an idle queue moves on here.
    if (!current) next();
  };
  function next() {
    current = queue.shift() ?? null;
    synth.speaking = Boolean(current);
    if (!current) return;
    const utterance = current;
    setTimeout(() => { if (current === utterance) utterance.onstart?.({}); }, 10);
    if (!window.__speechHold) ending = setTimeout(() => finish(utterance), 150);
  }
  window.__finishLine = () => current && finish(current);
  class Utterance {
    constructor(text) { Object.assign(this, { text, voice: null, lang: '', rate: 1, pitch: 1, volume: 1, onstart: null, onend: null, onerror: null, onboundary: null }); }
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true, writable: true });
}

/** The Workshop's own sample seed and Blueprint, built in a separate page so the app's page never loads Workshop code. */
async function sampleSeed(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/favicon.jpg`);
  const sample = await page.evaluate(async () => {
    // The React dev preamble an HTML page served by Vite would install.
    const { injectIntoGlobalHook } = await import('/@react-refresh');
    injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const { createMockStorySeedRecord, createMockSeedSlotAnswer } = await import('/src/workshop/previews/story-seed/previewData.ts');
    const { readGeneratedSeedSlots } = await import('/src/components/story-seed/shared/storySeedSchema.ts');
    const record = createMockStorySeedRecord({ id: 'seed-browser-walk', userId: 'novelexpanded-reader' });
    // A Regular Reader story: Start Story writes Chapter 1 at once.
    record.seed.story.optional.fateSurvival = { ...record.seed.story.optional.fateSurvival, enabled: false };
    const { blueprint, ...withoutBlueprint } = record;
    // The server's answer: Arc 1, a look-ahead only the arc planner may read, and the slots for the Seed's blanks.
    const answer = { ...blueprint, arcLookahead: [{ arcNumber: 2, direction: 'LOOKAHEAD_HIDDEN The prince walks the court road.' }], generatedSeedSlots: readGeneratedSeedSlots(createMockSeedSlotAnswer()) };
    return { record: withoutBlueprint, blueprint: answer };
  });
  await context.close();
  return sample;
}

async function walk(browser, viewport, sample) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  await context.addInitScript(installSpeechStandIn);
  const page = await context.newPage();
  const problems = [];
  const counts = { chapters: 0, memory: 0, blueprints: 0 };
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (/\.[cm]?[jt]sx?$/.test(path) && FORBIDDEN_MODULE.test(path) && !SHARED_READER_CONTRACTS.test(path)) problems.push(`module request: ${path}`);
  });
  await context.route('**/api/generate-blueprint', async route => {
    counts.blueprints += 1;
    const authorized = route.request().headers().authorization === `Bearer ${TOKEN}`;
    await route.fulfill(authorized
      ? { status: 200, contentType: 'application/json', body: JSON.stringify(sample.blueprint) }
      : { status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'A valid Development Story Seed access token is required.' }) });
  });
  await context.route('**/api/harness-generation', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provider: 'gemini', configured: true, models: [{ id: 'fixture', label: 'Fixture' }], defaultModel: 'fixture' }) });
      return;
    }
    const body = request.postDataJSON();
    if (body.operation === 'plan-arc') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rawProviderResponse: JSON.stringify({ plan: { goals: [{ text: 'Reach the gate.', chapters: 100 }] }, lookahead: [], destinedEnding: 'Mara reclaims her name.' }), providerReceipt: receipt }) });
      return;
    }
    if (!body.immediateChapterRequest) {
      counts.memory += 1;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Memory is read only on request.' }) });
      return;
    }
    counts.chapters += 1;
    // Long enough for the veil to be seen.
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rawProviderResponse: JSON.stringify(chapter), providerReceipt: receipt }) });
  });
  const shot = name => page.screenshot({ path: `${OUTPUT}/${viewport.name}-${name}.png`, fullPage: false });
  const address = () => { const url = new URL(page.url()); return `${url.pathname}${url.search}`; };
  const visibleButton = name => page.getByRole('button', { name }).filter({ visible: true }).first();

  // 1. `/app` lands on the app's empty Home.
  await page.goto(`${BASE}/app`);
  await page.getByTestId('novel-expanded-home').waitFor();
  check(address() === '/app/', `/app should land on /app/, got ${address()}`);
  check((await page.textContent('body')).includes('Your stories appear here'), 'The empty Home should say where stories appear.');
  await shot('1-home-empty');

  // 2. Create, from a banked Story Seed, asks for the token before its Blueprint.
  await page.evaluate(record => localStorage.setItem('novelexpanded-story-seeds-v1', JSON.stringify([record])), sample.record);
  await visibleButton('Carve New Destiny').click();
  await page.getByTestId('novel-expanded-create').waitFor();
  check(address() === '/app/?page=create', `Create should be /app/?page=create, got ${address()}`);
  await visibleButton(/^Story Bank$/).click();
  await visibleButton(/^Use Seed$/).click();
  await visibleButton(/^Refine Details$/).click();
  await page.getByRole('button', { name: /^Manifest World Blueprint/ }).and(page.locator(':enabled')).filter({ visible: true }).first().click();
  const sheet = page.getByTestId('access-token-sheet');
  await sheet.waitFor();
  check(counts.blueprints === 0, 'No Blueprint request should leave before the token is given.');
  // Let the sheet finish opening before the picture.
  await page.waitForTimeout(600);
  await shot('2-token-sheet');
  await sheet.locator('input[type="password"]').fill(TOKEN);
  await sheet.getByRole('button', { name: 'Continue' }).click();

  // 3. The Blueprint, then Manifest Story, then Story View and Start Story under the veil.
  await visibleButton(/^Manifest Story/).waitFor();
  check(counts.blueprints === 1, `One Blueprint request expected, saw ${counts.blueprints}.`);
  // Arc 1 and the story's length, nothing about later arcs; the look-ahead stays the planner's.
  const arcGoals = page.getByTestId('blueprint-arc-goals').filter({ visible: true }).first();
  await arcGoals.waitFor();
  const arcText = await arcGoals.textContent();
  check(arcText.includes('Arc 1') && !/Arc [2-9]/.test(arcText), `The Blueprint should show Arc 1 only, got: ${arcText}`);
  check(await page.getByTestId('blueprint-story-length').filter({ visible: true }).count() === 1, 'The Blueprint should show the story length.');
  const screenText = await page.evaluate(() => [document.body.innerText, ...[...document.querySelectorAll('input, textarea')].map(field => field.value)].join('\n'));
  check(!screenText.includes('LOOKAHEAD_HIDDEN'), 'The look-ahead must never appear on screen.');
  // Blank slots are filled; what the creator wrote is unchanged.
  for (const filled of ['Cannot trust anyone who has not died beside him', 'Junior Sister Han', 'Deep Sea Alliance', 'Rebuilds his meridians from the scars of failed timelines']) {
    check(screenText.includes(filled), `The Blueprint should fill a blank Seed slot with “${filled}”.`);
  }
  check(screenText.includes('Born as the son of a fallen patriarch'), "The creator's own Biography must stay.");
  check(!screenText.includes('A laborer in the outer quarry'), "The model's Biography must not replace the creator's.");
  await shot('3-blueprint');
  await visibleButton(/^Manifest Story/).click();
  await page.getByTestId('harness-world-info').waitFor();
  const storyAddress = address();
  check(/^\/app\/\?story=[^&]+$/.test(storyAddress), `Manifest Story should open Story View, got ${storyAddress}`);
  await shot('4-story-view');
  await page.locator('[data-world-info-chapters="action"]').click();
  await page.locator('img[alt="VERSA"]').first().waitFor();
  check(address() === `${storyAddress}&read=1`, `Start Story should open the Reader, got ${address()}`);
  await shot('5-veil');
  await page.locator('[data-chapter-number="1"]').waitFor({ timeout: 20_000 });
  await page.locator('[data-chapter-number="1"] [data-action-type="world-cue"][data-sound]').first().waitFor();
  await page.locator('img[alt="VERSA"]').first().waitFor({ state: 'hidden', timeout: 10_000 });
  await shot('6-chapter-1');
  check(counts.chapters === 1, `One chapter request expected, saw ${counts.chapters}.`);

  // 3b. Listen: three voices, the spoken sentence lit, Pause and Resume, Reader Settings → Narration.
  const spoken = () => page.evaluate(() => window.__spoken.map(line => ({ ...line })));
  const lastSpoken = async () => (await spoken()).at(-1);
  const finishLine = async () => { await page.evaluate(() => window.__finishLine()); await page.waitForTimeout(60); };
  await page.evaluate(() => { window.__speechHold = true; });
  check(!(await page.textContent('body')).includes('[[@'), 'No speaker tag may reach the page.');
  await visibleButton(/^Listen$/).click();
  await page.locator('h1[data-speaking]').waitFor();
  check(JSON.stringify(await lastSpoken()) === JSON.stringify({ text: 'Chapter 1. Low Tide', voice: 'Daniel', lang: 'en-GB', rate: 1 }),
    `Listen should read the title in Daniel's voice, got ${JSON.stringify(await lastSpoken())}.`);
  await finishLine();
  check(await page.locator('[data-overlay-id="read-aloud"]').count() > 0, 'The sentence being read should be lit.');
  for (let guard = 0; guard < 10 && !(await lastSpoken()).text.startsWith('“Ring'); guard += 1) await finishLine();
  const protagonist = await lastSpoken();
  check(protagonist.text === '“Ring the bells,”' && protagonist.voice === 'Rishi', `The main character's line should use the Protagonist voice (Rishi), got ${JSON.stringify(protagonist)}.`);
  check((await page.getByTestId('read-aloud-speaker').textContent()) === 'Ye Chen', 'The player should name who is speaking.');
  await shot('6b-listening');
  for (let guard = 0; guard < 6 && !(await lastSpoken()).text.startsWith('“They'); guard += 1) await finishLine();
  const side = await lastSpoken();
  check(side.text === '“They are drowned,”' && side.voice === 'Samantha', `Someone else's line should use the Side voice (Samantha), got ${JSON.stringify(side)}.`);
  await visibleButton('Pause').click();
  check(await page.getByTestId('read-aloud-player').getAttribute('data-status') === 'paused', 'Pause should pause.');
  await visibleButton('Resume').click();
  await page.waitForTimeout(60);
  check((await lastSpoken()).text === '“They are drowned,”', 'Resume should read the same line again from its start.');
  await visibleButton('Reader Settings').click();
  const settings = page.getByRole('dialog', { name: 'Reader Settings' });
  await settings.waitFor();
  check(JSON.stringify(await settings.locator('section h3').allTextContents()) === '["Narration"]', 'Reader Settings should hold Narration only.');
  check(await settings.locator('select[data-voice-role]').count() === 3, 'Narration should offer three voices.');
  await settings.locator('label').filter({ hasText: '1.25×' }).click();
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('novelexpanded-reader-read-aloud')) ?? '{}');
  check(saved.rate === 1.25, `The speed should be kept on the device, got ${JSON.stringify(saved)}.`);
  await shot('6c-reader-settings');
  await settings.getByRole('button', { name: 'Close Reader Settings' }).click();
  await visibleButton('Stop').click();
  check(await visibleButton(/^Listen$/).isVisible(), 'Stop should bring Listen back.');
  // The bar never covers the chapter's own controls, and the page never scrolls sideways.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  const layout = await page.evaluate(() => ({
    nav: document.querySelector('nav[aria-label="Chapters"]').getBoundingClientRect().bottom,
    player: document.querySelector('[data-testid="read-aloud-player"]').getBoundingClientRect().top,
    wide: document.documentElement.scrollWidth > window.innerWidth,
  }));
  check(layout.nav <= layout.player + 1, `The Listen bar should not cover the chapter navigation (${JSON.stringify(layout)}).`);
  check(!layout.wide, 'The Reader must not scroll sideways.');

  // 4. A reload stays on Chapter 1, writes nothing, keeps the speed, and reads nothing by itself.
  await page.reload();
  await page.locator('[data-chapter-number="1"]').waitFor();
  check(counts.chapters === 1, `A reload must not write a chapter, saw ${counts.chapters} requests.`);
  await page.waitForTimeout(300);
  check((await spoken()).length === 0, 'Nothing should be read aloud until the reader taps Listen.');
  await visibleButton('Reader Settings').click();
  check(await page.locator('input[name="read-aloud-rate"][value="1.25"]').isChecked(), 'The saved speed should come back after a reload.');
  await page.keyboard.press('Escape');

  // 5. Back to Story View (Continue · Ch. 1), then Home with the story's card.
  await visibleButton(/^Back$/).click();
  await page.getByTestId('harness-world-info').waitFor();
  check(address() === storyAddress, `Back from the Reader should open Story View, got ${address()}`);
  check((await page.locator('[data-world-info-chapters="action"]').textContent()).includes('Continue · Ch. 1'), 'Story View should continue at Chapter 1.');
  await visibleButton('Back to your stories').click();
  await page.getByTestId('novel-expanded-home').waitFor();
  check(address() === '/app/', `Back from Story View should go Home, got ${address()}`);
  await page.getByRole('button', { name: /^Open .+, 1 chapters/ }).first().waitFor();
  await shot('7-home-with-story');

  // 6. The browser's Back and Forward walk the same pages.
  await page.goBack();
  await page.getByTestId('harness-world-info').waitFor();
  check(address() === storyAddress, `Browser Back should return to Story View, got ${address()}`);
  await page.goForward();
  await page.getByTestId('novel-expanded-home').waitFor();
  check(address() === '/app/', `Browser Forward should return Home, got ${address()}`);

  // 7. A story the app does not have goes Home.
  await page.goto(`${BASE}/app/?story=hst_missing&read=1`);
  await page.getByTestId('novel-expanded-home').waitFor();
  check(address() === '/app/', `A missing story should go Home, got ${address()}`);

  check(counts.memory === 0, `Story memory must wait until asked, saw ${counts.memory} memory requests.`);
  await context.close();
  return problems;
}

mkdirSync(OUTPUT, { recursive: true });
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {});
try {
  const sample = await sampleSeed(browser);
  const problems = [];
  for (const viewport of VIEWPORTS) {
    const found = await walk(browser, viewport, sample);
    problems.push(...found.map(problem => `${viewport.name}: ${problem}`));
    console.log(`[novel-expanded] ${viewport.name} ${viewport.width}px: walked Home → Create → Story View → Reader → Home${found.length ? ` with ${found.length} problem(s)` : ''}`);
  }
  if (problems.length) {
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
  } else {
    console.log(`[novel-expanded] Browser walk passed; screenshots in ${OUTPUT}/`);
  }
} finally {
  await browser.close();
}
