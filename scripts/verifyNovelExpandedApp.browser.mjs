#!/usr/bin/env node
/**
 * Walks the NovelExpanded app in Chromium at phone (390px) and laptop (1440px)
 * widths against a running dev server, with both APIs stubbed:
 *
 * `/app` → empty Home → Create → token sheet → World Blueprint → Manifest
 * Story → Story View → Start Story under the veil → Chapter 1 with its Sound
 * Cue → reload (no new request) → Back → Continue · Ch. 1 → Back → Home card →
 * browser Back and Forward → a missing story goes Home.
 *
 * It fails on any page error, any memory request, and any module request into
 * the Workshop, the older Reader or Codex, or the HARNESS developer page.
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
const FORBIDDEN_MODULE = /\/src\/(?:workshop\/|library\/generation\/|components\/reader-(?:chamber|codex)\/)/;

const receipt = { provider: 'gemini', model: 'fixture', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' } };
const chapter = {
  title: 'Low Tide',
  paragraphs: [
    'The tide pulled back from the drowned gate, and [[1|the beast roared]] across the causeway.',
    'Mara counted the bells that no longer rang.',
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
    const { createMockStorySeedRecord } = await import('/src/workshop/previews/story-seed/previewData.ts');
    const record = createMockStorySeedRecord({ id: 'seed-browser-walk', userId: 'novelexpanded-reader' });
    // A Regular Reader story: Start Story writes Chapter 1 at once.
    record.seed.story.optional.fateSurvival = { ...record.seed.story.optional.fateSurvival, enabled: false };
    const { blueprint, ...withoutBlueprint } = record;
    return { record: withoutBlueprint, blueprint };
  });
  await context.close();
  return sample;
}

async function walk(browser, viewport, sample) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rawProviderResponse: JSON.stringify({ plan: { arcNumber: 1, goals: [{ id: 'arc-1', text: 'Reach the gate.', chapters: 100 }] }, destinedEnding: 'Mara reclaims her name.' }), providerReceipt: receipt }) });
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

  // 4. A reload stays on Chapter 1 and writes nothing.
  await page.reload();
  await page.locator('[data-chapter-number="1"]').waitFor();
  check(counts.chapters === 1, `A reload must not write a chapter, saw ${counts.chapters} requests.`);

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
