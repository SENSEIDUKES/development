// Create tab browser verification. Run against the dev server (it seeds real
// chapter-workspace stories through the served source modules):
//   npm run dev -- --port 5173
//   node output/playwright/creator-space/verify.mjs [http://localhost:5173]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = new URL('./', import.meta.url);
const shell = (query) => `${base}/library-shell.html?variant=development&source=main-library&screen=creator-space${query}`;
const results = {};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });

// The sandbox cannot reach Google Fonts; load the same families from the repository's copies.
const fontFaces = ['alegreya-500:Alegreya:500', 'alegreya-700:Alegreya:700', 'alegreya-sc-500:Alegreya SC:500', 'alegreya-sc-700:Alegreya SC:700', 'rubik-400:Rubik:400', 'rubik-500:Rubik:500']
  .map(entry => { const [file, family, weight] = entry.split(':'); return `@font-face{font-family:'${family}';font-weight:${weight};src:url('/library-shell/fonts/${file}.ttf') format('truetype')}`; }).join('');

async function open(url, { width = 390, height = 844, reducedMotion = 'no-preference', context } = {}) {
  const ctx = context ?? await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(css => document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
  }), fontFaces);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('[data-creator-space]').first().waitFor({ state: 'visible' });
  return { page, ctx, errors };
}
const selectedTitle = page => page.locator('.creator-space-selected h3').textContent();
const status = page => page.locator('[data-creator-space] + p[role="status"]').textContent();
const nav = page => page.getByRole('navigation', { name: 'Library global navigation', exact: true });

// 1. Sample worlds on a phone: layout, selection, honest states.
{
  const { page, ctx, errors } = await open(shell('&worlds=sample'));
  assert.deepEqual(await nav(page).locator('button').allTextContents(), ['Home', 'Create', 'Discover', 'Profile']);
  assert.equal(await nav(page).locator('[aria-current="page"]').textContent(), 'Create');
  assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Creator Space');
  assert.equal(await page.getByText('6 worlds', { exact: true }).count(), 1);
  const firstCard = await page.locator('.creator-space-world').first().boundingBox();
  const carve = await page.locator('[data-creator-space]').getByRole('button', { name: 'Create', exact: true }).boundingBox();
  const studio = await page.getByRole('button', { name: 'Studio', exact: true }).boundingBox();
  results.phone = { worldsTop: Math.round(firstCard.y), worldsBottom: Math.round(firstCard.y + firstCard.height), carveTop: Math.round(carve.y), carveBelowWorldActions: carve.y > studio.y + studio.height, carveWidth: Math.round(carve.width), carveHeight: Math.round(carve.height) };
  assert.ok(firstCard.y + firstCard.height < 844, 'first world card is fully inside the first phone viewport');
  assert.ok(carve.y > studio.y + studio.height, 'Create closes the page, after the world actions');
  assert.ok(carve.height >= 44);
  await page.screenshot({ path: new URL('create-390.png', out).pathname });

  assert.equal(await selectedTitle(page), 'The Last Lotus of the Jade Empire');
  await page.getByRole('button', { name: /^Ashes of the Nine Moons/ }).click();
  assert.equal(await selectedTitle(page), 'Ashes of the Nine Moons');
  assert.equal(await page.getByRole('button', { name: /^Ashes of the Nine Moons/ }).getAttribute('aria-pressed'), 'true');
  const actions = page.locator('.creator-space-selected button');
  assert.deepEqual((await actions.allTextContents()).map(text => text.trim()), ['Continue', 'Studio']);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.match(await status(page), /Continue opens “Ashes of the Nine Moons” in its chapter workspace, ready for Chapter 13/);
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  assert.match(await status(page), /Studio opens “Ashes of the Nine Moons”/);

  await page.getByRole('button', { name: /^The Pavilion Beneath the Lake/ }).click();
  assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).isDisabled(), true);
  assert.equal(await page.getByText('This story has reached its ending.').count(), 1);

  await page.getByRole('button', { name: /Browse plugins/ }).click();
  assert.match(await page.locator('#creator-toolkit-title').locator('xpath=ancestor::section[1]').getByRole('status').textContent(), /plugin browser is still being built/);

  // Tab switches keep the page and its selected world.
  await page.getByRole('button', { name: /^Ashes of the Nine Moons/ }).click();
  await nav(page).getByRole('button', { name: 'Home' }).click();
  await page.locator('[data-light-novels-home]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-creator-space]').isVisible(), false);
  await nav(page).getByRole('button', { name: 'Create' }).click();
  await page.locator('[data-creator-space]').waitFor({ state: 'visible' });
  assert.equal(await selectedTitle(page), 'Ashes of the Nine Moons');
  assert.equal(new URL(page.url()).searchParams.get('worlds'), 'sample');
  await page.goBack(); await page.locator('[data-light-novels-home]').waitFor({ state: 'visible' });
  await page.goForward(); await page.locator('[data-creator-space]').waitFor({ state: 'visible' });

  // Energy reads the live development account and opens the Cave's Energy page.
  const energy = page.locator('button.creator-space-stat');
  results.energyTile = (await energy.textContent()).replace(/\s+/g, ' ').trim();
  await energy.click();
  await page.waitForURL(url => new URL(url).searchParams.get('cave') === '/home/energy');
  results.energyDestination = new URL(page.url()).searchParams.get('screen');
  assert.deepEqual(errors, []);
  await ctx.close();
}

// 2. Create opens Story Seed.
{
  const { page, ctx } = await open(shell('&worlds=sample'));
  await page.locator('[data-creator-space]').getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForURL(url => new URL(url).searchParams.get('source') === 'story-seed');
  results.carveDestination = new URL(page.url()).searchParams.get('screen');
  await ctx.close();
}

// 3. This browser's stories: empty first, then two real stories from the chapter workspace.
{
  const { page, ctx, errors } = await open(shell(''));
  await page.getByText('No worlds yet').waitFor();
  assert.equal(await page.getByText('0 worlds', { exact: true }).count(), 1);
  await page.screenshot({ path: new URL('create-empty-390.png', out).pathname });
  const ids = await page.evaluate(async () => {
    const { HarnessGenerationController } = await import('/src/components/harness-generation/shared/controller.ts');
    const { IndexedDbHarnessGenerationRepository } = await import('/src/host/generation/indexedDbRepository.ts');
    const controller = new HarnessGenerationController({ repository: new IndexedDbHarnessGenerationRepository(), modelAdapter: {} });
    await controller.hydrate();
    const first = await controller.createStory({ title: 'Verification: River of Oaths', premise: 'A ferryman remembers every oath spoken on his river.' });
    await new Promise(resolve => setTimeout(resolve, 20));
    const second = await controller.createStory({ title: 'Verification: Lantern Court', premise: 'A court scribe records a war before it happens.' });
    return [first.id, second.id];
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('2 worlds', { exact: true }).waitFor();
  assert.equal(await selectedTitle(page), 'Verification: Lantern Court');
  assert.match(await page.locator('.creator-space-selected p').first().textContent(), /Ch\. 0 · Draft/);
  await page.screenshot({ path: new URL('create-local-390.png', out).pathname });
  // Continue the default (most recent) world; it is not the chapter workspace's first story,
  // so only a honoured request can select it.
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForURL(url => new URL(url).searchParams.get('preview') === 'harness-generation');
  const continued = new URL(page.url()).searchParams;
  assert.equal(continued.get('story'), ids[1]);
  assert.equal(continued.get('focus'), 'next-chapter');
  await page.locator('#harness-generate-title').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => document.activeElement?.id === 'harness-generate-title', null, { timeout: 10000 });
  assert.equal((await page.locator('[aria-label="Harness stories"] button[aria-pressed="true"]').textContent()).includes('Lantern Court'), true);
  results.continueLanding = { story: 'Lantern Court', focused: 'harness-generate-title', heading: (await page.locator('#harness-generate-title').textContent()).trim() };
  await page.screenshot({ path: new URL('continue-landing-390.png', out).pathname });

  await page.goBack({ waitUntil: 'networkidle' });
  await page.locator('[data-creator-space]').waitFor({ state: 'visible' });
  await page.getByText('2 worlds', { exact: true }).waitFor();
  await page.getByRole('button', { name: /^Verification: River of Oaths/ }).click();
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  await page.waitForURL(url => new URL(url).searchParams.get('preview') === 'harness-generation');
  assert.equal(new URL(page.url()).searchParams.get('story'), ids[0]);
  assert.equal(new URL(page.url()).searchParams.get('focus'), null);
  await page.locator('#harness-generate-title').waitFor({ timeout: 30000 });
  assert.equal((await page.locator('[aria-label="Harness stories"] button[aria-pressed="true"]').textContent()).includes('River of Oaths'), true);
  assert.notEqual(await page.evaluate(() => document.activeElement?.id), 'harness-generate-title');
  results.studioLanding = { story: 'River of Oaths', landsAtTop: true };
  results.localErrors = errors;
  await ctx.close();
}

// 3b. Create only reads: an older-format store is shown but never upgraded or reset by Create.
{
  const { page, ctx, errors } = await open(shell(''));
  await page.getByText('No worlds yet').waitFor();
  const before = await page.evaluate(async () => {
    const { createEmptyHarnessWorkspaceState } = await import('/src/components/harness-generation/shared/repository.ts');
    const { HARNESS_GENERATION_SCHEMA_VERSION } = await import('/src/narrative/generation.ts');
    const legacy = { ...createEmptyHarnessWorkspaceState(), schemaVersion: 18, stories: [{ id: 'legacy-1', title: 'Verification: Older Scroll', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', activeFoundationRevisionId: 'f', foundationRevisionIds: ['f'], originalLanguage: 'en', head: { nextChapterNumber: 1 } }] };
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('seihouse-harness-generation-v1', HARNESS_GENERATION_SCHEMA_VERSION); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise((resolve, reject) => { const t = db.transaction('workspace', 'readwrite'); t.objectStore('workspace').put(legacy, 'state'); t.oncomplete = resolve; t.onerror = () => reject(t.error); });
    db.close();
    return legacy.schemaVersion;
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('1 world', { exact: true }).waitFor();
  assert.equal(await selectedTitle(page), 'Verification: Older Scroll');
  const after = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('seihouse-harness-generation-v1'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const read = key => new Promise((resolve, reject) => { const q = db.transaction('workspace', 'readonly').objectStore('workspace'); const r = key ? q.get(key) : q.getAllKeys(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const [state, keys] = [await read('state'), await read()];
    db.close();
    return { schemaVersion: state.schemaVersion, keys };
  });
  assert.equal(after.schemaVersion, before, 'Create must not upgrade the stored workspace');
  assert.deepEqual(after.keys, ['state'], 'Create must not write a preserved copy');
  results.readOnlyStore = { shownFromOlderFormat: true, storedSchemaVersionAfter: after.schemaVersion, storeKeys: after.keys };
  assert.deepEqual(errors, []);
  await ctx.close();
}

// 4. Widths, no sideways page scroll, reduced motion.
results.widths = {};
for (const [width, height] of [[320, 700], [768, 1024], [1440, 900]]) {
  const { page, ctx } = await open(shell('&worlds=sample'), { width, height });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const worlds = await page.locator('.creator-space-world').first().boundingBox();
  results.widths[width] = { horizontalOverflow: overflow, worldsTop: Math.round(worlds.y) };
  assert.ok(overflow <= 0, `no horizontal page scroll at ${width}px`);
  await page.screenshot({ path: new URL(`create-${width}.png`, out).pathname });
  await ctx.close();
}
{
  const { page, ctx } = await open(shell('&worlds=sample&motion=reduced'), { reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /^Ashes of the Nine Moons/ }).click();
  results.reducedMotion = await selectedTitle(page);
  await ctx.close();
}

await browser.close();
writeFileSync(new URL('verification.json', out), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
