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
    codexColorClass: 'text-[#d4af37]',
    classification: '✦ Breakthrough | Awakening ✦',
    subtype: 'Awakening',
    subtypeColorClass: 'text-amber-400',
    rowLabel: 'New Realm',
    rowValue: 'Foundation Establishment',
    prose: 'A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before.',
  },
  {
    label: 'Broken Promise',
    slug: 'broken-promise',
    subject: 'Magistrate Jinhai',
    value: 'Rain Court Standing — Disgraced',
    consequence: 'Magistrate Jinhai loses access to Riverside Sect testimony.',
    codexName: 'Magistrate Jinhai',
    codexColorClass: 'text-red-500',
    classification: '✦ Karma | Consequence ✦',
    subtype: 'Consequence',
    subtypeColorClass: 'text-orange-400',
    rowLabel: 'Celestial Record',
    rowValue: 'Sealed',
    prose: 'A solemn interface surfaced before Magistrate Jinhai, its gilt script cold as the rain outside.',
  },
  {
    label: 'Target Scan',
    slug: 'target-scan',
    subject: 'Elder Kaelen',
    value: 'Foundation Establishment — Stage 7',
    consequence: 'Elder Kaelen will prepare a countermeasure before the next encounter.',
    codexName: 'Elder Kaelen',
    codexColorClass: 'text-red-500',
    classification: '✦ Combat | Enemy ✦',
    subtype: 'Enemy',
    subtypeColorClass: 'text-red-500',
    rowLabel: 'Cultivation',
    rowValue: 'Foundation Establishment, Stage 7',
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
    throw new Error(`${eventSlug} consequence row scrolls or overflows at ${deviceName}: ${JSON.stringify(metrics)}`);
  }
  if (deviceName.startsWith('mobile-') && eventSlug === 'breakthrough' && metrics.count !== 2) {
    throw new Error(`breakthrough must keep only its two highest-priority consequences on mobile: ${JSON.stringify(metrics)}`);
  }
  if (deviceName.startsWith('mobile-') && eventSlug === 'target-scan' && metrics.count !== 3) {
    throw new Error(`target scan must keep all three short consequences on mobile: ${JSON.stringify(metrics)}`);
  }
}

async function verifyCompactHierarchy(block, event, deviceName) {
  // Production hierarchy: classification line, key/value rows, signed
  // consequences with green gains and red losses, and the TTS prose as the
  // bottom section below the consequence row.
  await block.getByText(event.classification, { exact: true }).waitFor();
  await block.getByText(event.rowLabel, { exact: true }).waitFor();
  await block.getByText(event.rowValue, { exact: true }).waitFor();

  const summaryText = (await block.locator('[data-system-summary]').innerText()).replace(/\s+/g, ' ').trim();
  if (summaryText !== event.prose) {
    throw new Error(`${event.slug} TTS prose mismatch at ${deviceName}: "${summaryText}"`);
  }

  // Every visible gain sign is green and every visible loss sign is red.
  // (Fit-culling may legitimately hide an event's only loss on narrow mobile,
  // so assert the per-chip contract instead of fixed sign counts.)
  const signReport = await block.evaluate((element) => {
    const row = element.querySelector('[data-consequence-count]');
    if (!row) return 'missing-row';
    for (const chip of [...row.children]) {
      const text = chip.textContent.trim();
      const sign = chip.firstElementChild;
      if (text.startsWith('−') && !sign?.classList.contains('text-red-400')) return `loss-not-red:${text}`;
      if (text.startsWith('+') && !sign?.classList.contains('text-emerald-400')) return `gain-not-green:${text}`;
    }
    return 'ok';
  });
  if (signReport !== 'ok') {
    throw new Error(`${event.slug} consequence sign coloring broken at ${deviceName}: ${signReport}`);
  }

  // Color communicates meaning: only the classification subtype carries the
  // assigned color; row labels stay neutral gray and ordinary values white.
  const colorReport = await block.evaluate((element, expected) => {
    const spans = [...element.querySelectorAll('span')];
    const byText = (text) => spans.find((span) => span.textContent === text);
    if (!byText(expected.subtype)?.classList.contains(expected.subtypeColorClass)) return 'subtype-not-colored';
    if (!byText(expected.rowLabel)?.classList.contains('text-neutral-400')) return 'row-label-not-neutral';
    if (!byText(expected.rowValue)?.classList.contains('text-neutral-100')) return 'row-value-not-neutral';
    return 'ok';
  }, { subtype: event.subtype, subtypeColorClass: event.subtypeColorClass, rowLabel: event.rowLabel, rowValue: event.rowValue });
  if (colorReport !== 'ok') {
    throw new Error(`${event.slug} color semantics broken at ${deviceName}: ${colorReport}`);
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

async function verifyExpandedBreakdown(page, block, event, deviceName) {
  const compactDocumentOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  const expandButton = block.getByRole('button', { name: 'Expand System Prompt details' });
  if (await expandButton.getAttribute('aria-expanded') !== 'false') {
    throw new Error(`${event.slug} did not start compact at ${deviceName}.`);
  }
  await block.locator('[data-system-orb-icon="closed"]').waitFor();
  await expandButton.click();

  const expanded = block.locator('[data-system-expanded]');
  await expanded.waitFor({ state: 'visible' });
  if (await block.getAttribute('data-system-prompt-state') !== 'expanded') {
    throw new Error(`${event.slug} did not enter expanded state at ${deviceName}.`);
  }
  if (await expanded.getAttribute('data-reader-narration') !== 'excluded') {
    throw new Error(`${event.slug} expanded information lost its narration boundary at ${deviceName}.`);
  }
  if (await block.locator('[data-consequence-count]').count() !== 0) {
    throw new Error(`${event.slug} kept the compact consequence row while expanded at ${deviceName}.`);
  }

  await block.getByText(event.subject, { exact: true }).first().waitFor();
  await block.getByText(event.value, { exact: true }).waitFor();
  await block.getByText(event.consequence, { exact: true }).waitFor();
  await block.getByText('Lore', { exact: true }).waitFor();
  await block.getByText('Warning', { exact: true }).waitFor();
  await block.getByText('Narrative Consequences', { exact: true }).waitFor();
  if (await expanded.getByRole('progressbar').count() === 0) {
    throw new Error(`${event.slug} expanded breakdown has no progress value at ${deviceName}.`);
  }

  const codexLink = block.getByRole('button', { name: event.codexName, exact: true }).first();
  await codexLink.waitFor();
  if (!(await codexLink.getAttribute('class'))?.includes(event.codexColorClass)) {
    throw new Error(`${event.codexName} did not preserve its assigned character color at ${deviceName}.`);
  }
  await codexLink.click();
  await page.getByRole('dialog', { name: `${event.codexName} Codex details` }).waitFor();
  await page.keyboard.press('Escape');

  const overflow = await block.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }));
  const expandedDocumentOverflow = overflow.documentScrollWidth - overflow.documentClientWidth;
  if (
    overflow.scrollWidth > overflow.clientWidth + 1
    || expandedDocumentOverflow > compactDocumentOverflow + 1
  ) {
    throw new Error(`${event.slug} expanded breakdown overflows at ${deviceName}: ${JSON.stringify(overflow)}`);
  }

  await block.screenshot({ path: `output/playwright/system-prompt-${event.slug}-${deviceName}-expanded-card.png` });
  if (event.slug === 'breakthrough' && deviceName === 'mobile-390') {
    await page.screenshot({
      path: 'output/playwright/system-prompt-breakthrough-mobile-390-expanded-page.png',
      fullPage: true,
    });
  }

  const collapseButton = block.getByRole('button', { name: 'Collapse System Prompt details' });
  await block.locator('[data-system-orb-icon="open"]').waitFor();
  await collapseButton.click();
  await block.locator('[data-consequence-count]').waitFor();
  if (await block.getAttribute('data-system-prompt-state') !== 'compact') {
    throw new Error(`${event.slug} did not collapse in place at ${deviceName}.`);
  }
  await block.locator('[data-system-orb-icon="closed"]').waitFor();
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
      await tabsBlock.getByText('Threat Assessment · Moderate', { exact: true }).waitFor();
      // Badge severity coloring: neutral label, only the severity takes color.
      const badgeReport = await tabsBlock.evaluate((element) => {
        const spans = [...element.querySelectorAll('span')];
        const label = spans.find((span) => span.textContent === 'Threat Assessment');
        const severity = spans.find((span) => span.textContent === 'Moderate');
        return {
          labelNeutral: label?.classList.contains('text-neutral-300') ?? false,
          severityColored: severity?.classList.contains('text-orange-400') ?? false,
        };
      });
      if (!badgeReport.labelNeutral || !badgeReport.severityColored) {
        throw new Error(`target scan badge lost its neutral label / orange severity at ${device.name}.`);
      }
      const elderLink = tabsBlock.getByRole('button', { name: 'Elder Kaelen', exact: true });
      await elderLink.waitFor();
      if (!(await elderLink.getAttribute('class'))?.includes('text-red-500')) {
        throw new Error(`Elder Kaelen did not preserve the hostile character color at ${device.name}.`);
      }
      await elderLink.click();
      await page.getByRole('dialog', { name: 'Elder Kaelen Codex details' }).waitFor();
      await page.keyboard.press('Escape');
    }
    await tabsBlock.screenshot({ path: `output/playwright/system-prompt-${event.slug}-${device.name}-tabs-card.png` });
    await verifyExpandedBreakdown(page, tabsBlock, event, device.name);
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
  await verifyExpandedBreakdown(page, contextBlock, events[0], `${device.name}-contextual`);
  await page.screenshot({ path: `output/playwright/system-prompt-breakthrough-${device.name}-contextual.png` });
  await contextBlock.screenshot({ path: `output/playwright/system-prompt-breakthrough-${device.name}-contextual-card.png` });

  await page.close();
  console.log(`captured ${device.name}`);
}

// Regression: structured mechanical rows keep the holographic panel,
// Fate System Prompt stays on the unchanged FateResultCard.
const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'System Prompt', exact: true }).click();
await page.getByRole('button', { name: 'Structured Mechanical' }).first().click();
const structured = page.locator('.system-block.holographic-panel').first();
await structured.waitFor({ state: 'visible' });
await page.waitForTimeout(500);
await structured.screenshot({ path: 'output/playwright/system-prompt-structured-panel.png' });
await page.getByRole('tab', { name: 'Fate System Prompt', exact: true }).click();
const fate = page.locator('.collectible-card').first();
await fate.waitFor({ state: 'visible' });
await page.waitForTimeout(500);
await fate.screenshot({ path: 'output/playwright/fate-system-prompt-unchanged.png' });
await page.close();
console.log('captured structured + fate');

await browser.close();
