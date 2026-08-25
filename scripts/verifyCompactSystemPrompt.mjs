import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = 'http://localhost:5173/?preview=card-workshop';
const devices = [
  { name: 'mobile-320', width: 320, height: 700, emulation: 'Mobile Viewport' },
  { name: 'mobile-390', width: 390, height: 844, emulation: 'Mobile Viewport' },
  { name: 'tablet-768', width: 768, height: 1024, emulation: 'Tablet Viewport' },
  { name: 'desktop-1440', width: 1440, height: 900, emulation: 'Desktop Viewport' },
];
const events = [
  {
    label: 'Cultivation Breakthrough',
    slug: 'breakthrough',
    subject: 'Yun Che',
    value: 'Foundation Establishment — Stage 4',
    consequence: 'Elder Han will move openly against Yun Che.',
    codexName: 'Elder Han',
    codexColorCode: 'enemy',
    classification: '✦ Awakening ✦',
    subtype: 'Awakening',
    subtypeColorCode: 'mentor',
    rowLabel: 'New Realm',
    rowValue: 'Foundation Establishment',
    trends: [['Foundation Establishment', 'up'], ['Widened', 'up']],
    outcomes: ['Realm Ascended', 'Lifespan Increased'],
    outcomeColorCodes: ['ally', 'ally'],
    overlayOutcome: 'Lifespan +100',
    prose: 'A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before.',
  },
  {
    label: 'Broken Promise',
    slug: 'broken-promise',
    subject: 'Magistrate Jinhai',
    value: 'Rain Court Standing — Disgraced',
    consequence: 'Magistrate Jinhai loses access to Riverside Sect testimony.',
    codexName: 'Magistrate Jinhai',
    codexColorCode: 'enemy',
    classification: '✦ Consequence ✦',
    subtype: 'Consequence',
    subtypeColorCode: 'itemGreat',
    rowLabel: 'Celestial Record',
    rowValue: 'Sealed',
    trends: [['Sealed', 'down']],
    outcomes: ['Karma Decreased', 'Title Stripped'],
    outcomeColorCodes: ['enemy', 'enemy'],
    overlayOutcome: 'Karma −15',
    prose: 'A solemn interface surfaced before Magistrate Jinhai, its gilt script cold as the rain outside.',
  },
  {
    label: 'Target Scan',
    slug: 'target-scan',
    subject: 'Elder Kaelen',
    value: 'Foundation Establishment — Stage 7',
    consequence: 'Elder Kaelen will prepare a countermeasure before the next encounter.',
    codexName: 'Elder Kaelen',
    codexColorCode: 'enemy',
    classification: '✦ Enemy ✦',
    subtype: 'Enemy',
    subtypeColorCode: 'enemy',
    rowLabel: 'Cultivation',
    rowValue: 'Foundation Establishment, Stage 7',
    trends: [],
    outcomes: ['Intel Gained', 'Weakness Found'],
    outcomeColorCodes: ['ally', 'ally'],
    overlayOutcome: 'Detection Risk: High',
    prose: 'A crimson interface unfolded beside Elder Kaelen, taking his measure in silence.',
  },
];

await mkdir('output/playwright', { recursive: true });

async function verifyConsequenceRow(block, eventSlug, deviceName) {
  const row = block.locator('[data-consequence-count]');
  const metrics = await row.evaluate((element) => ({
    count: Number(element.getAttribute('data-consequence-count')),
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX,
  }));

  if (metrics.scrollWidth > metrics.clientWidth + 1 || metrics.overflowX === 'auto' || metrics.overflowX === 'scroll') {
    throw new Error(`${eventSlug} outcome row scrolls or overflows at ${deviceName}: ${JSON.stringify(metrics)}`);
  }
  if (metrics.count !== 2) {
    throw new Error(`${eventSlug} must keep exactly two outcome slots at ${deviceName}: ${JSON.stringify(metrics)}`);
  }
}

async function verifyCompactHierarchy(block, event, deviceName) {
  // Production hierarchy: classification line, key/value rows, the System
  // outcome row (two flat subject/state slots, no numbers), and the TTS
  // prose as the bottom section below the outcome row.
  await block.getByText(event.classification, { exact: true }).waitFor();
  await block.getByText(event.rowLabel, { exact: true }).waitFor();
  await block.getByText(event.rowValue, { exact: true }).waitFor();
  // Both prioritized outcome slots are always rendered in the visible row.
  const visibleOutcomeRow = block.locator('[data-consequence-count]');
  await visibleOutcomeRow.getByText(event.outcomes[0], { exact: true }).waitFor();
  await visibleOutcomeRow.getByText(event.outcomes[1], { exact: true }).waitFor();

  // The TTS prose rests collapsed by default behind a small centered arrow
  // toggle at the bottom edge (screen-space conservation); narration reads it
  // from the block data, never from this visibility state. Reveal it for the
  // content check, then collapse again so later screenshots show the default
  // resting state.
  const summary = block.locator('[data-system-summary]');
  if (await summary.isVisible()) {
    throw new Error(`${event.slug} TTS prose should start collapsed at ${deviceName}`);
  }
  // The toggle is selected by its stable marker, not its accessible name:
  // the label swaps between 'Reveal' and 'Hide System narration' on each
  // activation, so a name-based locator would stop matching after the click.
  const summaryToggle = block.locator('[data-system-summary-toggle]');
  await summaryToggle.waitFor();
  if (await summaryToggle.getAttribute('aria-label') !== 'Reveal System narration') {
    throw new Error(`${event.slug} narration toggle is not the collapsed reveal affordance at ${deviceName}`);
  }
  if (await summaryToggle.getAttribute('aria-expanded') !== 'false') {
    throw new Error(`${event.slug} narration toggle did not start collapsed at ${deviceName}`);
  }
  await summaryToggle.click();
  if (await summaryToggle.getAttribute('aria-expanded') !== 'true') {
    throw new Error(`${event.slug} narration toggle did not expand at ${deviceName}`);
  }
  if (await summaryToggle.getAttribute('aria-label') !== 'Hide System narration') {
    throw new Error(`${event.slug} narration toggle did not become the hide affordance at ${deviceName}`);
  }
  const summaryText = (await summary.innerText()).replace(/\s+/g, ' ').trim();
  if (summaryText !== event.prose) {
    throw new Error(`${event.slug} TTS prose mismatch at ${deviceName}: "${summaryText}"`);
  }
  await summaryToggle.click();
  if (await summary.isVisible()) {
    throw new Error(`${event.slug} TTS prose did not collapse again at ${deviceName}`);
  }

  // Compact outcome wording: two flat slots separated by a clear divider,
  // each a neutral white subject plus a meaning-colored state word — and
  // never a number (quantities compress to Increased/Decreased from the
  // direction; the signed figures live only in the expanded report).
  const compactReport = await block.evaluate((element, expectedOutcomeColorCodes) => {
    const row = element.querySelector('[data-consequence-count]');
    if (!row) return 'missing-row';
    if (!row.textContent.includes('|')) return 'missing-divider';
    const slots = [...row.querySelectorAll('[data-outcome-slot]')];
    if (slots.length !== 2) return `slot-count:${slots.length}`;
    for (const [index, slot] of slots.entries()) {
      if (/\d/.test(slot.textContent)) return `compact-number:${slot.textContent.trim()}`;
      const subject = slot.querySelector('[data-outcome-subject]');
      if (subject && !subject.classList.contains('text-neutral-100')) return `subject-not-white:${subject.textContent}`;
      const state = slot.querySelector('[data-outcome-state]');
      if (!state) return `missing-state:${slot.textContent.trim()}`;
      if (state.dataset.colorCode !== expectedOutcomeColorCodes[index]) {
        return `state-color:${state.textContent}:${state.dataset.colorCode}`;
      }
    }
    return 'ok';
  }, event.outcomeColorCodes);
  if (compactReport !== 'ok') {
    throw new Error(`${event.slug} compact outcome contract broken at ${deviceName}: ${compactReport}`);
  }

  // Color communicates meaning: only the classification subtype carries the
  // assigned color; row labels stay neutral gray and ordinary values white.
  const colorReport = await block.evaluate((element, expected) => {
    const spans = [...element.querySelectorAll('span')];
    const byText = (text) => spans.find((span) => span.textContent === text);
    if (byText(expected.subtype)?.dataset.colorCode !== expected.subtypeColorCode) return 'subtype-not-colored';
    if (!byText(expected.rowLabel)?.classList.contains('text-neutral-400')) return 'row-label-not-neutral';
    if (!byText(expected.rowValue)?.classList.contains('text-neutral-100')) return 'row-value-not-neutral';
    return 'ok';
  }, { subtype: event.subtype, subtypeColorCode: event.subtypeColorCode, rowLabel: event.rowLabel, rowValue: event.rowValue });
  if (colorReport !== 'ok') {
    throw new Error(`${event.slug} color semantics broken at ${deviceName}: ${colorReport}`);
  }

  // Changed row values carry exactly the expected direction arrows: upgrades
  // green, regressions red, neutral facts unmarked.
  const trendReport = await block.evaluate((element, expectedTrends) => {
    const arrows = [...element.querySelectorAll('[data-row-trend]')];
    if (arrows.length !== expectedTrends.length) return `count:${arrows.length}`;
    const spans = [...element.querySelectorAll('span')];
    for (const [value, direction] of expectedTrends) {
      const valueSpan = spans.find((span) => span.textContent === value);
      const arrow = valueSpan?.querySelector(`[data-row-trend="${direction}"]`);
      if (!arrow) return `missing:${value}:${direction}`;
      const colorCode = direction === 'up' ? 'ally' : 'enemy';
      if (arrow.dataset.colorCode !== colorCode) return `color:${value}:${arrow.dataset.colorCode}`;
    }
    return 'ok';
  }, event.trends);
  if (trendReport !== 'ok') {
    throw new Error(`${event.slug} row trend arrows broken at ${deviceName}: ${trendReport}`);
  }

  const order = await block.evaluate((element) => {
    const row = element.querySelector('[data-consequence-count]');
    const summary = element.querySelector('[data-system-summary]');
    if (!row || !summary) return 'missing';
    return (row.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING) ? 'ok' : 'inverted';
  });
  if (order !== 'ok') {
    throw new Error(`${event.slug} TTS prose is not the bottom section at ${deviceName}: ${order}`);
  }
}

/**
 * The expanded event report is a viewport-locked overlay portaled above the
 * reader: the compact card keeps its consequence row and prose underneath,
 * the page scrolls neither behind nor inside the panel, mobile shows only the
 * three highest-priority Codex sections, and closing restores focus to the
 * orb and the exact scroll position.
 */
async function verifyExpandedOverlay(page, block, event, deviceName) {
  const isMobile = deviceName.startsWith('mobile-');
  // The shared Workshop Controls bar is preview tooling pinned above reader
  // surfaces (z-[200]) and can cover the viewport-locked overlay when the page
  // scroll leaves it near the top. It is not part of the reader contract, so
  // it steps aside (visibility keeps layout, so scroll positions stay exact)
  // while the overlay is verified.
  const workshopControls = page.locator('[data-workshop-controls]');
  await workshopControls.evaluateAll((elements) => elements.forEach((element) => {
    element.dataset.previousVisibility = element.style.visibility;
    element.style.visibility = 'hidden';
  }));
  try {
    // Horizontal-overflow baseline: the Workshop page itself may overflow at
    // 320px, so the overlay is judged on what it adds, never an absolute.
    const compactDocumentOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    const expandButton = block.getByRole('button', { name: 'Expand System Prompt details' });
    if (await expandButton.getAttribute('aria-expanded') !== 'false') {
      throw new Error(`${event.slug} did not start compact at ${deviceName}.`);
    }
    await block.locator('[data-system-orb-icon="closed"]').waitFor();
    await expandButton.click();

    const overlay = page.locator('[role="dialog"][data-system-expanded="true"]');
    await overlay.waitFor({ state: 'visible' });
    // Playwright's own pre-click scroll-into-view may move the page, so the
    // reader-position contract is measured from the open overlay onward.
    const scrollBefore = await page.evaluate(() => window.scrollY);
    if (await overlay.getAttribute('aria-modal') !== 'true') {
      throw new Error(`${event.slug} overlay is not modal at ${deviceName}.`);
    }
    if (await overlay.getAttribute('data-reader-narration') !== 'excluded') {
      throw new Error(`${event.slug} overlay lost its narration boundary at ${deviceName}.`);
    }
    if (await block.getAttribute('data-system-prompt-state') !== 'expanded') {
      throw new Error(`${event.slug} did not enter expanded state at ${deviceName}.`);
    }
    if (await block.locator('[data-consequence-count]').count() !== 1) {
      throw new Error(`${event.slug} compact card did not keep its consequence row under the overlay at ${deviceName}.`);
    }
    if ((await page.evaluate(() => document.body.style.overflow)) !== 'hidden') {
      throw new Error(`${event.slug} overlay did not lock page scroll at ${deviceName}.`);
    }

    await overlay.getByText(event.subject, { exact: true }).first().waitFor();
    await overlay.getByText(event.value, { exact: true }).first().waitFor();
    if (await overlay.getByRole('progressbar').count() === 0) {
      throw new Error(`${event.slug} overlay has no progress value at ${deviceName}.`);
    }
    // The overlay keeps its own System outcome row — the full list with the
    // signed figures the compact two-slot row drops.
    await overlay.locator('[data-consequence-count]').waitFor();
    await overlay.locator('[data-consequence-count]').getByText(event.overlayOutcome, { exact: true }).waitFor();

    // Mobile: only the three highest-priority sections are visible. Larger
    // screens: every section, same flat structure.
    const narrativeSection = overlay.locator('[data-system-expanded-section="narrative-consequences"]');
    await narrativeSection.waitFor({ state: 'attached' });
    if (isMobile) {
      if (await narrativeSection.isVisible()) {
        throw new Error(`${event.slug} shows more than three Codex sections on mobile at ${deviceName}.`);
      }
    } else {
      if (!(await narrativeSection.isVisible())) {
        throw new Error(`${event.slug} hides expanded sections at ${deviceName}.`);
      }
      await overlay.getByText(event.consequence, { exact: true }).waitFor();
      await overlay.getByText('Lore', { exact: true }).waitFor();
      await overlay.getByText('Warning', { exact: true }).waitFor();
      await overlay.getByText('Narrative Consequences', { exact: true }).waitFor();
    }

    // One-screen fit: the panel never escapes the viewport, and the page
    // behind gains no horizontal overflow.
    const fit = await overlay.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        overflowY: getComputedStyle(element).overflowY,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    if (
      fit.scrollHeight > fit.clientHeight + 1
      && fit.overflowY !== 'auto'
      && fit.overflowY !== 'scroll'
    ) {
      throw new Error(`${event.slug} overlay clips tall content at ${deviceName}: ${JSON.stringify(fit)}`);
    }
    if (fit.left < -1 || fit.top < -1 || fit.right > fit.viewportWidth + 1 || fit.bottom > fit.viewportHeight + 1) {
      throw new Error(`${event.slug} overlay escapes the viewport at ${deviceName}: ${JSON.stringify(fit)}`);
    }
    if (fit.documentOverflow > compactDocumentOverflow + 1) {
      throw new Error(`${event.slug} overlay added horizontal page overflow at ${deviceName}: ${JSON.stringify(fit)} (baseline ${compactDocumentOverflow})`);
    }

    // Codex links inside the overlay keep their colors; their hovercard opens
    // above the dialog and closes first on Escape.
    const codexLink = overlay.getByRole('button', { name: event.codexName, exact: true }).first();
    await codexLink.waitFor();
    if (await codexLink.getAttribute('data-color-code') !== event.codexColorCode) {
      throw new Error(`${event.codexName} did not preserve its assigned character color at ${deviceName}.`);
    }
    await codexLink.click();
    const hovercard = page.getByRole('dialog', { name: `${event.codexName} Codex details` });
    await hovercard.waitFor();
    await page.keyboard.press('Escape');
    await hovercard.waitFor({ state: 'detached' });
    if (!(await overlay.isVisible())) {
      throw new Error(`${event.slug} overlay closed together with its Codex hovercard at ${deviceName}.`);
    }

    await page.screenshot({ path: `output/playwright/system-prompt-${event.slug}-${deviceName}-overlay.png` });

    // Closing restores the reader: compact state, focus back on the orb action,
    // page scroll unlocked, and the exact same scroll position.
    await overlay.getByRole('button', { name: 'Close System event report' }).click();
    await overlay.waitFor({ state: 'detached' });
    if (await block.getAttribute('data-system-prompt-state') !== 'compact') {
      throw new Error(`${event.slug} did not return to compact at ${deviceName}.`);
    }
    await block.locator('[data-system-orb-icon="closed"]').waitFor();
    try {
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Expand System Prompt details',
        undefined,
        { timeout: 5000 },
      );
    } catch {
      throw new Error(`${event.slug} did not restore focus to the orb action at ${deviceName}.`);
    }
    if ((await page.evaluate(() => document.body.style.overflow)) === 'hidden') {
      throw new Error(`${event.slug} left the page scroll locked at ${deviceName}.`);
    }
    const scrollAfter = await page.evaluate(() => window.scrollY);
    if (Math.abs(scrollAfter - scrollBefore) > 1) {
      throw new Error(`${event.slug} moved the reader position at ${deviceName}: ${scrollBefore} -> ${scrollAfter}`);
    }
  } finally {
    // Restore the preview tooling hidden during the overlay pass.
    await workshopControls.evaluateAll((elements) => elements.forEach((element) => {
      element.style.visibility = element.dataset.previousVisibility || '';
      delete element.dataset.previousVisibility;
    }));
  }
}


/**
 * The Structured Mechanical stat panel is a viewport-locked dialog portaled
 * above the reader: the compact vitals card stays untouched underneath, the
 * page scrolls neither behind nor inside the panel, the whole status screen
 * renders at reading scale, and closing restores focus to the orb and the exact
 * scroll position.
 */
async function verifyStatusPanel(page, block, deviceName) {
  // The shared Workshop Controls bar is preview tooling pinned above reader
  // surfaces (z-[200]) and can cover the viewport-locked panel when the page
  // scroll leaves it near the top. It is not part of the reader contract, so
  // it steps aside (visibility keeps layout, so scroll positions stay exact)
  // while the panel is verified.
  const workshopControls = page.locator('[data-workshop-controls]');
  await workshopControls.evaluateAll((elements) => elements.forEach((element) => {
    element.dataset.previousVisibility = element.style.visibility;
    element.style.visibility = 'hidden';
  }));
  try {
    // Horizontal-overflow baseline: the Workshop page itself may overflow at
    // 320px, so the panel is judged on what it adds, never an absolute.
    const compactDocumentOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    const expandButton = block.getByRole('button', { name: 'Expand System Prompt details' });
    if (await expandButton.getAttribute('aria-expanded') !== 'false') {
      throw new Error(`status screen did not start compact at ${deviceName}.`);
    }
    await block.locator('[data-system-orb-icon="closed"]').waitFor();
    await expandButton.click();

    const panel = page.locator('[role="dialog"][data-system-status-panel="true"]');
    await panel.waitFor({ state: 'visible' });
    // Playwright's own pre-click scroll-into-view may move the page, so the
    // reader-position contract is measured from the open panel onward.
    const scrollBefore = await page.evaluate(() => window.scrollY);
    if (await panel.getAttribute('aria-modal') !== 'true') {
      throw new Error(`stat panel is not modal at ${deviceName}.`);
    }
    if (await panel.getAttribute('data-reader-narration') !== 'excluded') {
      throw new Error(`stat panel lost its narration boundary at ${deviceName}.`);
    }
    if (await block.getAttribute('data-system-prompt-state') !== 'expanded') {
      throw new Error(`status screen did not enter expanded state at ${deviceName}.`);
    }
    if ((await page.evaluate(() => document.body.style.overflow)) !== 'hidden') {
      throw new Error(`stat panel did not lock page scroll at ${deviceName}.`);
    }

    // The whole status screen at reading scale.
    await panel.getByText('STATUS // YUN CHE', { exact: true }).waitFor();
    await panel.getByText('Level 24', { exact: true }).waitFor();
    if (await panel.getByRole('progressbar').count() !== 3) {
      throw new Error(`stat panel lost its HP/QI/EXP meters at ${deviceName}.`);
    }
    if (await panel.locator('[data-status-stat]').count() !== 6) {
      throw new Error(`stat panel lost its stat grid at ${deviceName}.`);
    }
    await panel.getByText('Rain Attunement', { exact: true }).waitFor();
    await panel.getByText('Soul Seam Sight', { exact: true }).waitFor();

    // One-screen fit: the panel never escapes the viewport, and the page
    // behind gains no horizontal overflow.
    const fit = await panel.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        overflowY: getComputedStyle(element).overflowY,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    if (
      fit.scrollHeight > fit.clientHeight + 1
      && fit.overflowY !== 'auto'
      && fit.overflowY !== 'scroll'
    ) {
      throw new Error(`stat panel clips tall content at ${deviceName}: ${JSON.stringify(fit)}`);
    }
    if (fit.left < -1 || fit.top < -1 || fit.right > fit.viewportWidth + 1 || fit.bottom > fit.viewportHeight + 1) {
      throw new Error(`stat panel escapes the viewport at ${deviceName}: ${JSON.stringify(fit)}`);
    }
    if (fit.documentOverflow > compactDocumentOverflow + 1) {
      throw new Error(`stat panel added horizontal page overflow at ${deviceName}: ${JSON.stringify(fit)} (baseline ${compactDocumentOverflow})`);
    }

    await page.screenshot({ path: `output/playwright/system-prompt-structured-${deviceName}-stat-panel.png` });

    // Closing restores the reader: compact state, focus back on the orb action,
    // page scroll unlocked, and the exact same scroll position.
    await panel.getByRole('button', { name: 'Close System status panel' }).click();
    await panel.waitFor({ state: 'detached' });
    if (await block.getAttribute('data-system-prompt-state') !== 'compact') {
      throw new Error(`status screen did not return to compact at ${deviceName}.`);
    }
    await block.locator('[data-system-orb-icon="closed"]').waitFor();
    try {
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Expand System Prompt details',
        undefined,
        { timeout: 5000 },
      );
    } catch {
      throw new Error(`status screen did not restore focus to the orb action at ${deviceName}.`);
    }
    if ((await page.evaluate(() => document.body.style.overflow)) === 'hidden') {
      throw new Error(`stat panel left the page scroll locked at ${deviceName}.`);
    }
    const scrollAfter = await page.evaluate(() => window.scrollY);
    if (Math.abs(scrollAfter - scrollBefore) > 1) {
      throw new Error(`stat panel moved the reader position at ${deviceName}: ${scrollBefore} -> ${scrollAfter}`);
    }
  } finally {
    // Restore the preview tooling hidden during the stat panel pass.
    await workshopControls.evaluateAll((elements) => elements.forEach((element) => {
      element.style.visibility = element.dataset.previousVisibility || '';
      delete element.dataset.previousVisibility;
    }));
  }
}

const browser = await chromium.launch();
for (const device of devices) {
  const page = await browser.newPage({ viewport: { width: device.width, height: device.height } });
  await page.goto(base, { waitUntil: 'domcontentloaded' });

  // Card Type Tabs: select the System Prompt preset, then walk each mocked event.
  await page.getByRole('tab', { name: 'System Prompt', exact: true }).click();
  for (const event of events) {
    await page.getByRole('button', { name: event.label, exact: true }).click();
    const tabsBlock = page.locator('.system-block').first();
    await tabsBlock.waitFor({ state: 'visible' });
    await page.waitForTimeout(800);
    await verifyConsequenceRow(tabsBlock, event.slug, device.name);
    await verifyCompactHierarchy(tabsBlock, event, device.name);
    if (event.slug === 'target-scan') {
      await tabsBlock.getByText('Threat Assessment Moderate', { exact: true }).waitFor();
      // Badge severity coloring: neutral label, only the severity takes color.
      const badgeReport = await tabsBlock.evaluate((element) => {
        const spans = [...element.querySelectorAll('span')];
        const label = spans.find((span) => span.textContent === 'Threat Assessment');
        const severity = spans.find((span) => span.textContent === 'Moderate');
        return {
          labelNeutral: label?.classList.contains('text-neutral-300') ?? false,
          severityColored: severity?.dataset.colorCode === 'itemGreat',
        };
      });
      if (!badgeReport.labelNeutral || !badgeReport.severityColored) {
        throw new Error(`target scan badge lost its neutral label / orange severity at ${device.name}.`);
      }
      // The prose Codex links rest inside the collapsed narration line, so
      // reveal it for the link checks and restore the collapsed default
      // afterward (later screenshots then show the resting state).
      await tabsBlock.locator('[data-system-summary-toggle]').click();
      const elderLink = tabsBlock.getByRole('button', { name: 'Elder Kaelen', exact: true });
      await elderLink.waitFor();
      if (await elderLink.getAttribute('data-color-code') !== 'enemy') {
        throw new Error(`Elder Kaelen did not preserve the hostile character color at ${device.name}.`);
      }
      await elderLink.click();
      await page.getByRole('dialog', { name: 'Elder Kaelen Codex details' }).waitFor();
      await page.keyboard.press('Escape');
      await tabsBlock.locator('[data-system-summary-toggle]').click();
    }
    await tabsBlock.screenshot({ path: `output/playwright/system-prompt-${event.slug}-${device.name}-tabs-card.png` });
    await verifyExpandedOverlay(page, tabsBlock, event, device.name);
    if (event.slug === 'breakthrough') {
      await page.screenshot({ path: `output/playwright/system-prompt-breakthrough-${device.name}-tabs.png` });
    }
  }

  // Contextual View (default breakthrough event) with matching width emulation.
  await page.getByRole('button', { name: 'Cultivation Breakthrough', exact: true }).click();
  await page.getByRole('button', { name: device.emulation }).click();
  await page.getByRole('button', { name: 'Contextual View' }).click();
  const contextBlock = page.locator('[data-testid="card-workshop-contextual-reader"] .system-block').first();
  await contextBlock.waitFor({ state: 'visible' });
  await contextBlock.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await verifyConsequenceRow(contextBlock, 'breakthrough', device.name);
  await verifyCompactHierarchy(contextBlock, events[0], device.name);
  await verifyExpandedOverlay(page, contextBlock, events[0], `${device.name}-contextual`);
  await page.screenshot({ path: `output/playwright/system-prompt-breakthrough-${device.name}-contextual.png` });
  await contextBlock.screenshot({ path: `output/playwright/system-prompt-breakthrough-${device.name}-contextual-card.png` });

  await page.close();
  console.log(`captured ${device.name}`);
}

// The Structured Mechanical status screen: the compact vitals card plus its
// Expanded Info stat panel. Fate System Prompt stays on the unchanged
// FateResultCard.
const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'System Prompt', exact: true }).click();
await page.getByRole('button', { name: 'Structured Mechanical' }).first().click();
const structured = page.locator('.system-block.holographic-panel').first();
await structured.waitFor({ state: 'visible' });
await page.waitForTimeout(500);
await structured.screenshot({ path: 'output/playwright/system-prompt-structured-panel.png' });
await verifyStatusPanel(page, structured, 'tablet-768');
await page.getByRole('tab', { name: 'Fate System Prompt', exact: true }).click();
const fate = page.locator('.collectible-card').first();
await fate.waitFor({ state: 'visible' });
await page.waitForTimeout(500);
await fate.screenshot({ path: 'output/playwright/fate-system-prompt-unchanged.png' });
await page.close();
console.log('captured structured + fate');

await browser.close();
