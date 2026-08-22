import { chromium } from 'playwright';

const base = 'http://localhost:5173/?preview=card-workshop';
const devices = [
  { name: 'mobile-390', width: 390, height: 844, emulation: 'Mobile Viewport' },
  { name: 'tablet-768', width: 768, height: 1024, emulation: 'Tablet Viewport' },
  { name: 'desktop-1440', width: 1440, height: 900, emulation: 'Desktop Viewport' },
];
const events = [
  { label: 'Cultivation Breakthrough', slug: 'breakthrough' },
  { label: 'Broken Promise', slug: 'broken-promise' },
  { label: 'Target Scan', slug: 'target-scan' },
];

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
    await tabsBlock.screenshot({ path: `output/playwright/system-prompt-${event.slug}-${device.name}-tabs-card.png` });
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
