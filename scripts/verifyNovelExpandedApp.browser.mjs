#!/usr/bin/env node
/**
 * Walks the NovelExpanded app in Chromium at phone (390px) and laptop (1440px)
 * widths against a running dev server, with both APIs stubbed:
 *
 * `/app` → empty Home in the Library Shell (the app's two places, Home and
 * Create, on the phone strip or the laptop sidebar, and the footer) → Create
 * (Story Seed in the shell's workspace mode, the music note in its header) →
 * token sheet → World Blueprint (Arc 1 only,
 * the hidden look-ahead nowhere on screen, every blank Seed slot filled) → Manifest
 * Story → Story View → Start Story under the veil → Chapter 1 with its Sound
 * Cue and its own soundtrack (the app's calm music on every page before it,
 * the chapter's fighting music and battlefield atmosphere in the Reader, the
 * app's music again after it, never carried into the Reader) → Listen (three voices from the writer's speaker tags, the spoken
 * sentence lit, Pause and Resume, the ghost note (mute, long-press to Audio),
 * Reader Settings → Audio (with Scene: the reader's own piece kept on the
 * device) and Narration with the speed
 * kept on the device) → Holdings → Rewrite this chapter with a note (the new
 * version under the veil, the Holdings fixer's one quiet call settling its
 * holdings, nothing of it on screen) → reload (no new request, nothing reads by itself) →
 * Back → Continue · Ch. 1 → Export story (the whole story as one file) → Back
 * → Home card, its header's music note (tap mutes; hover or hold opens the Music volume) → browser Back and Forward →
 * Create from the navigation (on laptops, a minimized sidebar stays minimized after a reload) → a missing story goes Home.
 * World Info sits in the shell; the Reader never does.
 *
 * Headless Chromium has no voices, so a stand-in for the browser's speech is
 * installed before the app loads; each line ends on its own after a moment,
 * or waits for the walk while `__speechHold` is set. SEIHouse's audio files are
 * answered with ten seconds of silence, so the walk sees which music and
 * atmosphere the app asks for without downloading them.
 *
 * It fails on any page error, any memory request, and any module request into
 * the Workshop, the older Reader or Codex (its narration included), or the
 * HARNESS developer page.
 *
 * Usage: start `npm run dev -- --host 127.0.0.1`, then
 *   node scripts/verifyNovelExpandedApp.browser.mjs [base URL]
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = (process.argv[2] ?? process.env.NOVEL_EXPANDED_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const OUTPUT = 'output/playwright/novel-expanded';
const TOKEN = 'browser-walk-token';
const VIEWPORTS = [{ name: 'phone', width: 390, height: 844 }, { name: 'laptop', width: 1440, height: 900 }];
const SHARED_READER_CONTRACTS = /\/src\/components\/reader-(?:chamber\/shared\/(?:readerLanguage|manifestationEligibility|cinematicScroll\/anchors|cinematicScroll\/useSemanticReadingPosition)|codex\/shared\/types)\.ts/;
const FORBIDDEN_MODULE = /\/src\/(?:workshop\/|library\/generation\/|components\/reader-(?:chamber|codex)\/|host\/reader\/webSpeechNarration)/;

const receipt = { provider: 'gemini', model: 'fixture', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' } };
const SOUNDSCAPES = JSON.parse(readFileSync('src/host/media/data/sen-soundscapes-v1.json', 'utf8')).entries;
const ATMOSPHERES = JSON.parse(readFileSync('src/host/media/data/sen-atmospheres-v1.json', 'utf8')).entries;
/** The pieces of SEN Soundscapes that answer a mood, by their file names. */
const piecesOf = mood => new Set(SOUNDSCAPES.filter(piece => piece.mood === mood || piece.moods.includes(mood)).map(piece => new URL(piece.url).pathname));
const SOUNDSCAPE_PATH = /\/SEN\/AUDIO\/SOUNDSCAPE\/Volumn%201\//;
const BATTLEFIELD = new URL(ATMOSPHERES.find(bed => bed.label === 'Ancient Battlefield 1').url).pathname;
/** Ten seconds of silence (8-bit mono, 8 kHz WAV), answering every SEIHouse audio file. */
const SILENCE = (() => {
  const samples = 8000 * 10;
  const wav = Buffer.alloc(44 + samples, 128);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + samples, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(8000, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(samples, 40);
  return wav;
})();
const chapter = {
  title: 'Low Tide',
  paragraphs: [
    // The writer chooses the chapter's music and atmosphere once, at its start; the writer puts a
    // sound tag on the words where a sound happens, naming one of the Library's sound words.
    '[[soundtrack: fighting | ancient battlefield]] The tide pulled back from the drowned gate, and [[sound: beast roar | the beast roared | high]] across the causeway.',
    // The writer tags what changes in what a character has, where it happens.
    '[[gained: MC | Bell Key]] Mara counted the bells that no longer rang. [[equipped: MC | Bell Key]] She turned the old key in her palm.',
    // The writer tags who speaks: the main character with their own tag, then someone else by name.
    '[[@MC]] “Ring the bells,” Ye Chen said.',
    '[[@Junior Sister Han]] “They are drowned,” she whispered.',
    // The rest of the chapter: a reply under a quarter of the 1,800-word minimum is a failed write and is never saved.
    Array.from({ length: 35 }, () => 'The night went on, and the town kept its quiet watch until dawn.').join(' '),
  ],
  // The writer's closing list: one name no tag recorded, so the Holdings page has one check.
  mainCharacterHoldings: ['Bell Key', 'Silver Bell'],
  arcCompletion: { goalId: 'none', completed: false, evidence: '' },
  recap: 'Mara returns to the drowned city.',
  chapterFunction: 'progression',
  nextProgression: 'Mara climbs the bell tower.',
  nextWorldBuilding: 'The keeper explains the drowned law.',
  nextConflict: 'The tide wardens seize the causeway.',
};

/** Chapter 1 written again at the reader's request: the key is gained twice, which the Holdings fixer settles. */
const rewritten = {
  ...chapter,
  title: 'The Hidden Key',
  paragraphs: [
    'The tide pulled back from the drowned gate, and [[sound: beast roar | the beast roared | high]] across the causeway.',
    '[[gained: MC | Bell Key]] Mara found the bell key under the gate. She hid it in her sleeve.',
    '[[gained: MC | Bell Key]] Later she touched the bell key again to be sure.',
    '[[@MC]] “Ring the bells,” Ye Chen said.',
    chapter.paragraphs.at(-1),
  ],
  mainCharacterHoldings: ['Bell Key'],
  recap: 'Mara hides the bell key.',
};
const REWRITE_NOTE = 'Let Mara keep the key hidden.';

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
  const counts = { chapters: 0, memory: 0, blueprints: 0, chaptersWithToken: 0, rewrites: [], fixes: [] };
  let releaseFirstChapter;
  const firstChapterReady = new Promise(resolve => { releaseFirstChapter = resolve; });
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (/\.[cm]?[jt]sx?$/.test(path) && FORBIDDEN_MODULE.test(path) && !SHARED_READER_CONTRACTS.test(path)) problems.push(`module request: ${path}`);
  });
  // Every SEIHouse audio file is answered with silence; what was asked for is kept, in order.
  const audioAsked = [];
  await context.route('https://media.seihouse.org/**', async route => {
    const url = route.request().url();
    // The Library emblem is an image there too: fetched for real when the network allows, so the pictures show it.
    if (/\.(?:jpe?g|png|webp|svg)$/i.test(new URL(url).pathname)) {
      try {
        const response = await fetch(url);
        await route.fulfill({ status: response.status, contentType: response.headers.get('content-type') ?? 'image/jpeg', body: Buffer.from(await response.arrayBuffer()) });
      } catch {
        await route.fulfill({ status: 404, body: '' });
      }
      return;
    }
    audioAsked.push(new URL(url).pathname);
    await route.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'Access-Control-Allow-Origin': '*' }, body: SILENCE });
  });
  const pieces = () => audioAsked.filter(path => SOUNDSCAPE_PATH.test(path));
  /** Waits until the music asks for a piece of this mood, after the given number of audio requests. */
  const musicOf = async (mood, after = 0) => {
    const wanted = piecesOf(mood);
    for (let tries = 0; tries < 60; tries += 1) {
      const asked = audioAsked.slice(after).filter(path => SOUNDSCAPE_PATH.test(path));
      if (asked.some(path => wanted.has(path))) return asked.filter(path => wanted.has(path));
      await page.waitForTimeout(100);
    }
    throw new Error(`The music should play a ${mood} piece, asked for ${JSON.stringify(audioAsked.slice(after))}.`);
  };
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rawProviderResponse: JSON.stringify({ plan: { goals: [{ text: 'Reach the gate.', chapters: 30 }] }, lookahead: [], destinedEnding: 'Mara reclaims her name.' }), providerReceipt: receipt }) });
      return;
    }
    // The Holdings fixer's one small call after a chapter: it settles the key gained twice.
    if (body.operation === 'fix-holdings') {
      counts.fixes.push({ cases: body.cases, token: request.headers().authorization === `Bearer ${TOKEN}` });
      const fixes = body.cases.map(entry => (entry.tags?.includes('gained: MC | Bell Key')
        ? { case: entry.id, outcome: 'record', tags: '[[has: MC | Bell Key]]', reason: 'She already had it.' }
        : { case: entry.id, outcome: 'fine', reason: 'Nothing to change.' }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rawProviderResponse: JSON.stringify({ fixes }), providerReceipt: receipt }) });
      return;
    }
    if (!body.immediateChapterRequest) {
      counts.memory += 1;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Memory is read only on request.' }) });
      return;
    }
    counts.chapters += 1;
    // The token given for the Blueprint rides with chapters too, lifting the visitor limit.
    if (request.headers().authorization === `Bearer ${TOKEN}`) counts.chaptersWithToken += 1;
    if (body.immediateChapterRequest.rewrite) counts.rewrites.push(body.immediateChapterRequest);
    // Chapter 1 now starts in World Info. Hold the fixture until the walk has
    // observed its pending journey, rather than racing screenshots on a busy runner.
    if (counts.chapters === 1) await firstChapterReady;
    else await new Promise(resolve => setTimeout(resolve, 1200));
    const reply = body.immediateChapterRequest.rewrite ? rewritten : chapter;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rawProviderResponse: JSON.stringify(reply), providerReceipt: receipt }) });
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
  // The Library Shell: the app's two places (the strip on phones, the Pathways sidebar on laptops), the footer, the note.
  const laptop = viewport.width >= 1024;
  const navigation = () => (laptop ? page.locator('[data-slot="app-shell-sidebar"] nav[aria-label="Library pathways"]')
    : page.locator('nav[aria-label="Library global navigation"]'));
  const places = (await navigation().getByRole('button').allTextContents()).map(text => text.trim());
  check(JSON.stringify(places) === JSON.stringify(['Home', 'Create']), `The navigation should offer Home and Create only, got ${JSON.stringify(places)}.`);
  check(await navigation().isVisible(), `The ${laptop ? 'Pathways sidebar' : 'bottom strip'} should show.`);
  const shellText = await page.getByTestId('novel-expanded-shell').innerText();
  check(!/\b(?:Discover|Profile|Settings)\b/.test(shellText), 'No place the app has not built may show.');
  check(await page.locator('header .header-sound-control button').filter({ visible: true }).count() === 1, "Home's header should carry the music note.");
  check(await page.evaluate(() => document.documentElement.scrollWidth) <= viewport.width, 'The shell must never scroll sideways.');
  await page.locator('#novel-expanded-main').evaluate(main => main.scrollTo({ top: main.scrollHeight }));
  await page.locator('[data-library-footer]').waitFor();
  check((await page.locator('[data-library-footer]').innerText()).includes('NovelExpanded'), 'The footer should carry the NovelExpanded title.');
  await shot('1b-home-footer');
  await page.locator('#novel-expanded-main').evaluate(main => main.scrollTo({ top: 0 }));

  // 2. Create, from a banked Story Seed, asks for the token before its Blueprint.
  await page.evaluate(record => localStorage.setItem('novelexpanded-story-seeds-v1', JSON.stringify([record])), sample.record);
  await visibleButton('Carve New Destiny').click();
  await page.getByTestId('novel-expanded-create').waitFor();
  check(await page.locator('header .header-sound-control button').filter({ visible: true }).count() === 1, "Story Seed's header should carry the music note.");
  // The app's own music starts with the first tap: calm pieces, with no model.
  await musicOf('ambient');
  check(pieces().every(path => piecesOf('ambient').has(path)), `The app's music should be calm pieces only, got ${JSON.stringify(pieces())}.`);
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
  check(await page.locator('[data-testid="novel-expanded-shell"] [data-testid="harness-world-info"]').count() === 1, 'World Info should sit in the Library Shell.');
  await shot('4-story-view');
  await page.locator('[data-world-info-chapters="action"]').click();
  await page.locator('[data-testid="generation-overlay"][data-familiar-id="quill"] [aria-label="Quill, Waving"]').waitFor();
  check(address() === `${storyAddress}&read=1`, `Start Story should open the Reader, got ${address()}`);
  check(await page.getByTestId('novel-expanded-shell').count() === 0, 'The Reader must stay outside the Library Shell.');
  const veil = page.getByTestId('generation-overlay');
  const familiarStyle = await veil.evaluate(element => {
    const style = getComputedStyle(element);
    const ring = element.querySelector('[data-celestial-foreground] > .z-0 > svg circle');
    return { accent: style.getPropertyValue('--veil-accent').trim(), ring: ring && getComputedStyle(ring).stroke,
      artwork: element.querySelector('.familiar-sprite-atlas')?.getAttribute('src') };
  });
  check(familiarStyle.accent === '#2589ff' && familiarStyle.ring === 'rgb(37, 137, 255)', `Quill's veil and chamber should share its Lightning palette: ${JSON.stringify(familiarStyle)}`);
  check(familiarStyle.artwork === '/familiars/quill/spritesheet.webp', 'The veil should use Quill’s supplied animation atlas.');
  const startProgress = Number(await veil.getAttribute('data-journey-progress'));
  const travelerX = () => veil.locator('svg[aria-label^="Generation"] > g').last().evaluate(element =>
    new DOMMatrix(getComputedStyle(element).transform).m41);
  const startX = await travelerX();
  await page.waitForFunction(start => {
    const veil = document.querySelector('[data-testid="generation-overlay"]');
    const progress = Number(veil?.getAttribute('data-journey-progress'));
    return progress > start && progress < 1;
  }, startProgress);
  check(!(await veil.textContent()).match(/\d+%/), 'A whole-response writer must not show an invented percentage.');
  await shot('5-veil');
  releaseFirstChapter();
  await page.waitForFunction(() => document.querySelector('[data-testid="generation-overlay"]')?.getAttribute('data-journey-progress') === '1');
  check(await veil.isVisible(), 'The veil should remain while the traveler arrives.');
  // Observe the actual SVG arrival, rather than sleeping through it on a busy runner.
  // The shared UI stops the traveler just before the gate (95% of the path).
  await page.waitForFunction(() => {
    const veil = document.querySelector('[data-testid="generation-overlay"]');
    const svg = veil?.querySelector('svg[aria-label="Generation complete"]');
    const traveler = svg?.lastElementChild;
    const gate = traveler?.previousElementSibling;
    if (!traveler || !gate) return false;
    const x = new DOMMatrix(getComputedStyle(traveler).transform).m41;
    const gateX = new DOMMatrix(getComputedStyle(gate).transform).m41;
    if (x < gateX - 20) return false;
    window.__veilArrival = { x, opacity: Number(getComputedStyle(veil).opacity) };
    return true;
  });
  const arrival = await page.evaluate(() => window.__veilArrival);
  check(arrival.x > startX + 250, `The traveler should reach the destination before closing (${startX} → ${arrival.x}).`);
  check(arrival.opacity >= 0.95, `The veil should not fade until the traveler has arrived, got opacity ${arrival.opacity}.`);
  await shot('5b-veil-arrived');
  await page.locator('[data-chapter-number="1"]').waitFor({ timeout: 20_000 });
  await page.locator('[data-chapter-number="1"] [data-action-type="world-cue"][data-sound]').first().waitFor();
  await veil.waitFor({ state: 'hidden', timeout: 10_000 });
  await shot('6-chapter-1');
  check(counts.chapters === 1, `One chapter request expected, saw ${counts.chapters}.`);
  // The chapter's own scene, as its writer chose it: fighting music and the battlefield.
  await musicOf('fighting');
  for (let tries = 0; tries < 40 && !audioAsked.includes(BATTLEFIELD); tries += 1) await page.waitForTimeout(100);
  check(audioAsked.includes(BATTLEFIELD), `The chapter's atmosphere should be Ancient Battlefield 1, asked for ${JSON.stringify(audioAsked)}.`);

  // 3b. Listen: three voices, the spoken sentence lit, Pause and Resume, Reader Settings → Narration.
  const spoken = () => page.evaluate(() => window.__spoken.map(line => ({ ...line })));
  const lastSpoken = async () => (await spoken()).at(-1);
  const finishLine = async () => { await page.evaluate(() => window.__finishLine()); await page.waitForTimeout(60); };
  await page.evaluate(() => { window.__speechHold = true; });
  check(!(await page.textContent('body')).includes('[['), 'No tag may reach the page.');
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
  // The ghost note: the soundtrack's one control in the Reader, sitting above the Listen bar.
  const note = page.getByTestId('story-audio-note').getByRole('button', { name: /story audio/ });
  await note.waitFor();
  const noteBox = await note.boundingBox();
  const barBox = await page.getByTestId('read-aloud-player').boundingBox();
  check(noteBox && barBox && noteBox.y + noteBox.height <= barBox.y + 1 && noteBox.x + noteBox.width <= viewport.width,
    `The note should sit above the Listen bar, inside the screen (${JSON.stringify({ noteBox, barBox })}).`);
  // A tap mutes the whole soundtrack, and the reader's mix is kept on the device.
  await note.click();
  // The mixer saves a moment after the last change (and at once when the page is hidden).
  await page.waitForTimeout(450);
  const mutedMix = JSON.parse(await page.evaluate(() => localStorage.getItem('novelexpanded-reader-audio-mixer')) ?? '{}');
  check(mutedMix.masterEnabled === false, `A tap on the note should mute story audio and save it, got ${JSON.stringify(mutedMix)}.`);
  check(await page.getByTestId('story-audio-note').getByRole('button', { name: 'Unmute story audio' }).count() === 1, 'The muted note should offer to unmute.');
  await page.getByTestId('story-audio-note').getByRole('button', { name: 'Unmute story audio' }).click();
  // A long-press (right-click on a desktop) opens Reader Settings at Audio.
  await page.getByTestId('story-audio-note').getByRole('button').click({ button: 'right' });
  const settings = page.getByRole('dialog', { name: 'Reader Settings' });
  await settings.waitFor();
  const audio = settings.getByTestId('reader-settings-audio');
  await audio.locator('h3', { hasText: 'Audio' }).waitFor();
  check(JSON.stringify(await settings.locator('section h3').allTextContents()) === '["Audio","Narration"]', `Reader Settings should hold Audio, then Narration, got ${JSON.stringify(await settings.locator('section h3').allTextContents())}.`);
  check(await audio.getByRole('switch').count() > 0 && await audio.getByRole('slider').count() > 0, 'Audio should show the approved switches and sliders.');
  check(await audio.getByText('Atmosphere', { exact: true }).count() > 0, 'Audio should offer the Atmosphere layer.');
  check(await audio.getByText('Soundscapes', { exact: true }).count() > 0, 'Audio should offer the Soundscapes layer.');
  // Scene: Automatic until the reader keeps a piece of their own, on this device.
  const scene = audio.getByTestId('reader-soundtrack-choice');
  check(await scene.locator('#reader-soundtrack-piece').inputValue() === 'automatic' && await scene.locator('#reader-soundtrack-atmosphere').inputValue() === 'automatic',
    'Scene should start on Automatic.');
  const lament = SOUNDSCAPES.find(piece => piece.mood === 'sad');
  const beforeChoice = audioAsked.length;
  await scene.locator('#reader-soundtrack-piece').selectOption(lament.id);
  const choice = JSON.parse(await page.evaluate(() => localStorage.getItem('novelexpanded-reader-soundtrack-choice')) ?? '{}');
  check(choice.soundscape?.pieceId === lament.id, `The reader's own piece should be kept on the device, got ${JSON.stringify(choice)}.`);
  for (let tries = 0; tries < 40 && !audioAsked.slice(beforeChoice).includes(new URL(lament.url).pathname); tries += 1) await page.waitForTimeout(100);
  check(audioAsked.slice(beforeChoice).includes(new URL(lament.url).pathname), 'The reader\'s own piece should play at once.');
  await scene.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await shot('6c-reader-scene');
  await scene.locator('#reader-soundtrack-piece').selectOption('automatic');
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'Reader Settings must not scroll sideways.');
  await page.waitForTimeout(300);
  await shot('6c-reader-audio');
  await settings.getByTestId('reader-settings-narration').scrollIntoViewIfNeeded();
  check(await settings.locator('select[data-voice-role]').count() === 3, 'Narration should offer three voices.');
  await settings.locator('label').filter({ hasText: '1.25×' }).click();
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('novelexpanded-reader-read-aloud')) ?? '{}');
  check(saved.rate === 1.25, `The speed should be kept on the device, got ${JSON.stringify(saved)}.`);
  await shot('6c-reader-narration');
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

  // 3c. Holdings: what the main character has now, each change linked to its passage, and the checks.
  await visibleButton('Open Holdings').click();
  const holdingsPage = page.getByTestId('holdings-page');
  await holdingsPage.waitFor();
  const inHand = await holdingsPage.locator('[aria-label$=": In hand"]').first().textContent();
  check(inHand.includes('Bell Key'), `The Bell Key should be in hand, got ${inHand}.`);
  check(JSON.stringify(await holdingsPage.locator('[data-testid="holdings-character"]').first().locator('button').allTextContents()) === '["Ch. 1 · gained","Ch. 1 · took up"]',
    'Each change should link to its chapter.');
  check((await holdingsPage.locator('[data-testid="holdings-checks"] summary').textContent()) === 'Checks (1)', 'The closing list should leave one check.');
  check(!(await page.textContent('body')).includes('[['), 'No tag may reach the Holdings page.');
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'The Holdings page must not scroll sideways.');
  await shot('6d-holdings');
  await holdingsPage.getByRole('button', { name: /^Ch\. 1 · took up/ }).click();
  await page.locator('[data-chapter-number="1"]').waitFor();
  check(await page.getByTestId('holdings-page').count() === 0, 'A change\'s link should open its chapter.');
  check(counts.fixes.length === 0, `A chapter whose only problem is a closing-list name it never mentions asks no fixer, saw ${counts.fixes.length}.`);

  // 3d. Rewrite this chapter: at the newest chapter's end, with a note; the new version under the veil.
  const rewriteLink = visibleButton('Rewrite this chapter');
  await rewriteLink.scrollIntoViewIfNeeded();
  await rewriteLink.click();
  const rewriteForm = page.getByRole('form', { name: 'Rewrite Chapter 1' });
  await rewriteForm.waitFor();
  await rewriteForm.locator('textarea').fill(REWRITE_NOTE);
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'The rewrite box must not scroll sideways.');
  await shot('6e-rewrite');
  await rewriteForm.getByRole('button', { name: 'Rewrite Chapter 1' }).click();
  await veil.waitFor();
  await page.locator('[data-chapter-number="1"] h1', { hasText: 'The Hidden Key' }).waitFor({ timeout: 20_000 });
  await veil.waitFor({ state: 'hidden', timeout: 10_000 });
  check(counts.rewrites.length === 1 && counts.rewrites[0].chapterNumber === 1 && counts.rewrites[0].rewrite.note === REWRITE_NOTE
    && counts.rewrites[0].rewrite.previous.title === 'Low Tide', `The rewrite should ask for Chapter 1 again with the note, got ${JSON.stringify(counts.rewrites)}.`);
  check(counts.fixes.length === 1 && counts.fixes[0].token && counts.fixes[0].cases.length === 1,
    `The Holdings fixer should make one quiet call with the token, got ${JSON.stringify(counts.fixes)}.`);
  const rewrittenText = await page.locator('[data-chapter-number="1"]').textContent();
  check(rewrittenText.includes('She hid it in her sleeve.') && !rewrittenText.includes('Mara counted the bells'), 'The new version should replace the old one.');
  const body = await page.textContent('body');
  check(!body.includes('[[') && !/fixer|Holdings fixer/i.test(body), 'Neither tags nor the fixer may reach the page.');
  check(await page.locator('[role="alert"]').count() === 0, 'A rewrite that worked shows no message.');
  await shot('6f-rewritten');

  // 4. A reload stays on Chapter 1, writes nothing, keeps the speed, and reads nothing by itself.
  await page.reload();
  await page.locator('[data-chapter-number="1"]').waitFor();
  check(counts.chapters === 2, `A reload must not write a chapter, saw ${counts.chapters} requests.`);
  await page.waitForTimeout(300);
  check((await spoken()).length === 0, 'Nothing should be read aloud until the reader taps Listen.');
  await visibleButton('Reader Settings').click();
  check(await page.locator('input[name="read-aloud-rate"][value="1.25"]').isChecked(), 'The saved speed should come back after a reload.');
  await page.keyboard.press('Escape');

  // 5. Back to Story View (Continue · Ch. 1), then Home with the story's card.
  const beforeLeaving = audioAsked.length;
  await visibleButton(/^Back$/).click();
  await page.getByTestId('harness-world-info').waitFor();
  // Leaving the Reader brings the app's calm music back.
  await musicOf('ambient', beforeLeaving);
  check(address() === storyAddress, `Back from the Reader should open Story View, got ${address()}`);
  check((await page.locator('[data-world-info-chapters="action"]').textContent()).includes('Continue · Ch. 1'), 'Story View should continue at Chapter 1.');
  // Export story saves the whole story as one file, with what the writer was given for each chapter.
  await page.getByTestId('story-export').scrollIntoViewIfNeeded();
  await shot('4b-story-export');
  const [exported] = await Promise.all([page.waitForEvent('download'), visibleButton('Export story').click()]);
  check(/\.json$/.test(exported.suggestedFilename()), `Export story should save a .json file, got ${exported.suggestedFilename()}`);
  const archive = JSON.parse(readFileSync(await exported.path(), 'utf8'));
  check(address().includes(archive.story?.id), 'Export story should save this story.');
  check(archive.chapters?.length === 1 && archive.attempts?.[0]?.storyInformation && archive.attempts[0].rawProviderResponse,
    'Export story should carry the chapter, its Story Information and the writer\'s reply.');
  // The set-aside version stays with its attempt, and the chapter carries the fixer's record.
  check(archive.attempts.length === 2 && archive.attempts[0].replacedByChapterId === archive.chapters[0].id,
    'Export story should keep the replaced version on its attempt.');
  check(archive.chapters[0].fixer?.fixes?.some(fix => fix.outcome === 'fixed-tags'), `Export story should carry the fixer's record, got ${JSON.stringify(archive.chapters[0].fixer)}.`);
  await visibleButton('Back to your stories').click();
  await page.getByTestId('novel-expanded-home').waitFor();
  check(address() === '/app/', `Back from Story View should go Home, got ${address()}`);
  await page.getByRole('button', { name: /^Open .+, 1 chapters/ }).first().waitFor();
  await shot('7-home-with-story');

  // The music note in Home's header (Menu music is on for a new reader): a tap mutes all sound, and hovering it
  // (a mouse) or holding it (a finger) opens the Music volume, which sets the music's level in the saved mix.
  const savedMix = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('novelexpanded-reader-audio-mixer')) ?? '{}');
  const headerNote = page.locator('header .header-sound-control button').first();
  await headerNote.waitFor();
  check(await headerNote.getAttribute('aria-label') === 'Mute sound', `Home's header note should offer to mute, got ${await headerNote.getAttribute('aria-label')}.`);
  const headerNoteBox = await headerNote.boundingBox();
  check(headerNoteBox && headerNoteBox.width >= 44 && headerNoteBox.height >= 44 && headerNoteBox.x + headerNoteBox.width <= viewport.width,
    `The header note should be a 44px target inside the screen, got ${JSON.stringify(headerNoteBox)}.`);
  await shot('7b-home-sound');
  // The mix is saved a moment after it changes.
  const savedSoon = (test, what) => page.waitForFunction(test, null, { timeout: 5_000 }).catch(() => check(false, what));
  await headerNote.click();
  await savedSoon(() => JSON.parse(localStorage.getItem('novelexpanded-reader-audio-mixer') ?? '{}').masterEnabled === false, 'A tap on the header note should mute all sound and keep it in the saved mix.');
  check(await headerNote.getAttribute('aria-label') === 'Unmute sound', `Muted, the header note should offer to unmute, got ${await headerNote.getAttribute('aria-label')}.`);
  await headerNote.click();
  await savedSoon(() => JSON.parse(localStorage.getItem('novelexpanded-reader-audio-mixer') ?? '{}').masterEnabled === true, 'A second tap should unmute.');
  if (viewport.width >= 1024) {
    await headerNote.hover();
  } else {
    await headerNote.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, isPrimary: true });
    await page.waitForTimeout(650);
    await headerNote.dispatchEvent('pointerup', { pointerType: 'touch', button: 0, isPrimary: true });
  }
  const volume = page.locator('.header-sound-control input[type="range"]').first();
  await volume.waitFor();
  check((await savedMix()).masterEnabled === true, 'Opening the volume should never mute.');
  await volume.fill('60');
  await savedSoon(() => Math.abs((JSON.parse(localStorage.getItem('novelexpanded-reader-audio-mixer') ?? '{}').layers?.soundscapes?.level ?? 0) - 0.6) < 0.01,
    'The slider should set the music\'s level in the saved mix.');
  const volumeBox = await page.locator('.header-sound-control-popover').boundingBox();
  check(volumeBox && volumeBox.x >= 0 && volumeBox.x + volumeBox.width <= viewport.width, `The volume should fit the screen, got ${JSON.stringify(volumeBox)}.`);
  await shot('7c-sound-slider');
  await page.keyboard.press('Escape');
  if (viewport.width >= 1024) await page.mouse.move(viewport.width / 2, viewport.height / 2);
  else await page.locator('body').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  await page.locator('.header-sound-control input[type="range"]').waitFor({ state: 'detached' });

  // 6. The browser's Back and Forward walk the same pages.
  await page.goBack();
  await page.getByTestId('harness-world-info').waitFor();
  check(address() === storyAddress, `Browser Back should return to Story View, got ${address()}`);
  await page.goForward();
  await page.getByTestId('novel-expanded-home').waitFor();
  check(address() === '/app/', `Browser Forward should return Home, got ${address()}`);

  // 6b. Create from the navigation opens Story Seed; on laptops a minimized Pathways sidebar stays minimized.
  await navigation().getByRole('button', { name: 'Create' }).click();
  await page.getByTestId('novel-expanded-create').waitFor();
  check(address() === '/app/?page=create', `Create in the navigation should open Create, got ${address()}`);
  await page.goBack();
  await page.getByTestId('novel-expanded-home').waitFor();
  if (laptop) {
    const sidebarMode = () => page.evaluate(() => localStorage.getItem('novelexpanded-reader-library-sidebar-mode'));
    const doubleClickSidebar = async () => {
      const sidebar = page.locator('[data-slot="app-shell-sidebar"]');
      const box = await sidebar.boundingBox();
      await sidebar.dblclick({ position: { x: box.width / 2, y: box.height - 24 } });
    };
    await doubleClickSidebar();
    await page.waitForFunction(() => localStorage.getItem('novelexpanded-reader-library-sidebar-mode') === 'compact', null, { timeout: 5_000 })
      .catch(() => check(false, 'A double click should minimize the sidebar and keep the choice on this device.'));
    await page.waitForTimeout(400);
    await shot('7d-sidebar-compact');
    await page.reload();
    await page.getByTestId('novel-expanded-home').waitFor();
    check(await page.locator('[data-slot="app-shell"][data-sidebar-mode="compact"]').count() === 1, 'A minimized sidebar should stay minimized after a reload.');
    await doubleClickSidebar();
    await page.waitForFunction(() => localStorage.getItem('novelexpanded-reader-library-sidebar-mode') === 'pinned', null, { timeout: 5_000 })
      .catch(async () => check(false, `A second double click should open the sidebar again, got ${await sidebarMode()}.`));
  }

  // 7. A story the app does not have goes Home.
  await page.goto(`${BASE}/app/?story=hst_missing&read=1`);
  await page.getByTestId('novel-expanded-home').waitFor();
  check(address() === '/app/', `A missing story should go Home, got ${address()}`);

  check(counts.memory === 0, `Story memory must wait until asked, saw ${counts.memory} memory requests.`);
  check(counts.chapters > 0 && counts.chaptersWithToken === counts.chapters, `Every chapter should carry the saved access token, saw ${counts.chaptersWithToken} of ${counts.chapters}.`);
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
