import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

/**
 * The world at Chapter 0, in a real browser: the Codex full before Chapter 1
 * (every card kind, each card opening to the world's own facts) and the Story
 * Seed's World sections that hold those same slots. Start the Development
 * server first; no provider requests are made.
 */

const origin = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:5173';
// A machine whose installed Chromium is not the one this Playwright expects can
// name its own (`PLAYWRIGHT_CHROMIUM_PATH`).
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {});
await mkdir('output/playwright', { recursive: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1100 });

    // ── The Codex, full before Chapter 1 ──────────────────────────────────
    await page.goto(`${origin}/?preview=reader-codex`);
    const codex = page.locator('[data-testid="story-codex"]');
    await codex.waitFor();
    const tabs = ['Characters', 'Items', 'Abilities', 'Places', 'Factions', 'Bestiary', 'World rules'];
    for (const label of tabs) {
      const tab = codex.getByRole('tab', { name: new RegExp(`^${label}`) });
      assert.equal(await tab.count(), 1, `${width}: the Codex has a ${label} tab`);
      const box = await tab.boundingBox();
      assert(box.x >= -1 && box.x + box.width <= width + 1, `${width}: the ${label} tab stays in the viewport`);
    }
    // Every kind holds at least one card, and each card opens to the world's facts.
    for (const label of ['Characters', 'Items', 'Abilities', 'Places', 'Factions', 'Bestiary']) {
      await codex.getByRole('tab', { name: new RegExp(`^${label}`) }).click();
      const cards = codex.locator('[data-card]');
      assert((await cards.count()) > 0, `${width}: ${label} shows a card before Chapter 1`);
      await cards.first().click();
      const profile = codex.locator('[data-testid="codex-profile"]');
      await profile.waitFor();
      assert.equal(await profile.locator('[data-testid="codex-chapter-zero"]').count(), 1,
        `${width}: a ${label} card opens to the world at the start`);
      await profile.getByRole('button', { name: /^All / }).click();
    }
    await codex.getByRole('tab', { name: /^World rules/ }).click();
    const rules = codex.locator('[data-testid="codex-world-rules"]');
    await rules.waitFor();
    assert((await rules.textContent()).includes('The rank ladder'), `${width}: the World rules sheet shows the ladder`);
    await page.screenshot({ path: `output/playwright/codex-before-chapter-1-${width}.png`, fullPage: true });

    // The switches live in the shared Workshop Controls panel, which a phone
    // opens on demand.
    const controls = page.locator('section[aria-label="Workshop Controls"]');
    const open = controls.getByRole('button', { name: 'Open', exact: true });
    if (await open.isVisible()) await open.click();

    // ── What the reader sees: a card waits until the story reaches it ─────
    await controls.getByRole('button', { name: 'What the reader sees', exact: true }).click();
    assert.equal(await codex.locator('[data-card]').count(), 0,
      `${width}: the reader meets no one before the story reaches them`);
    // A category waits until the record holds one of its kind, so before the
    // first chapter the reader is offered none but the world's own frame.
    for (const label of ['Characters', 'Items', 'Factions', 'Abilities', 'Places', 'Bestiary']) {
      assert.equal(await codex.getByRole('tab', { name: new RegExp(`^${label}`) }).count(), 0,
        `${width}: the ${label} category waits until the record holds one`);
    }
    // The World rules are the world's frame, not a card the story reaches.
    await codex.getByRole('tab', { name: /^World rules/ }).click();
    assert.equal(await codex.locator('[data-testid="codex-world-rules"]').count(), 1,
      `${width}: the reader still has the World rules sheet`);
    await page.screenshot({ path: `output/playwright/codex-what-the-reader-sees-${width}.png`, fullPage: true });
    await controls.getByRole('button', { name: 'The whole world', exact: true }).click();

    // A story with chapters still reads as before.
    await controls.getByRole('button', { name: 'Sundered Heavens', exact: true }).click();
    await codex.getByRole('tab', { name: /^Characters/ }).click();
    assert.equal(await codex.locator('[data-testid="codex-checks"]').count(), 1,
      `${width}: the saved story's Codex still opens`);
    assert((await codex.locator('[data-card]').count()) > 0,
      `${width}: the saved story still shows everyone it met`);

    // ── The Story Seed's World sections ──────────────────────────────────
    await page.goto(`${origin}/?preview=story-seed`);
    await page.getByRole('button', { name: 'Save Draft' }).waitFor();
    // A phone keeps the sections in the Sections drawer; a laptop shows the rail.
    const openSection = async name => {
      const button = page.getByRole('button', { name, exact: true });
      if (!(await button.count()) || !(await button.first().isVisible())) {
        await page.getByRole('button', { name: 'Sections', exact: true }).click();
      }
      await page.getByRole('button', { name, exact: true }).first().click();
    };
    for (const section of ['Things', 'Places', 'Bestiary', 'World Rules']) {
      await openSection(section);
      const opened = page.locator('section[aria-labelledby^="seed-workspace-"]');
      await opened.first().waitFor();
      assert((await opened.first().textContent()).includes(section), `${width}: the ${section} section opens`);
    }
    // One card's slots are the Codex card's slots.
    await openSection('Things');
    await page.getByRole('button', { name: /^\+ Add Thing/ }).click();
    for (const label of ['Name', 'Look', 'How many', 'Held by', 'Where it lies', 'Status']) {
      assert.equal(await page.getByLabel(label, { exact: true }).count(), 1, `${width}: a Thing card asks for ${label}`);
    }
    await page.screenshot({ path: `output/playwright/story-seed-things-${width}.png`, fullPage: true });
  }

  assert.deepEqual(errors, [], 'no page errors');
  console.log('[world-at-chapter-0] the Codex before Chapter 1 and the Seed\'s world sections verified at 390 and 1440');
} finally {
  await browser.close();
}
