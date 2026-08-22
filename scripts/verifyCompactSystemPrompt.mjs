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
  },
  {
    label: 'Broken Promise',
    slug: 'broken-promise',
    subject: 'Magistrate Jinhai',
    value: 'Rain Court Standing — Disgraced',
    consequence: 'Magistrate Jinhai loses access to Riverside Sect testimony.',
    codexName: 'Magistrate Jinhai',
    codexColorClass: 'text-red-500',
  },
  {
    label: 'Target Scan',
    slug: 'target-scan',
    subject: 'Elder Kaelen',
    value: 'Foundation Establishment — Stage 7',
    consequence: 'Elder Kaelen will prepare a countermeasure before the next encounter.',
    codexName: 'Elder Kaelen',
    codexColorClass: 'text-red-500',
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
    if (event.slug === 'target-scan') {
      await tabsBlock.getByText('Threat Assessment · Moderate', { exact: true }).waitFor();
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
