/** Run with the Browser skill's existing tab and viewport handles.
 * No browser is launched here. Exercises the same user-visible preview routes.
 */
import assert from 'node:assert/strict';
import { verifyAppShellTitles } from './verifyAppShellTitles.mjs';

export async function verifyLibraryHeader({ tab, viewport, baseUrl }) {
  const report = await verifyAppShellTitles({ tab, viewport, baseUrl });
  // Direct utility keyboard traversal above the phone overflow breakpoint.
  await viewport.set({ width: 768, height: 844 });
  await tab.playwright.getByRole('link', { name: 'Library home' }).press('Tab');
  const active = () => tab.playwright.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  assert.equal(await active(), 'Insights from the keeper of the nine celestial libraries');
  await tab.cua.keypress({ keys: ['Tab'] }); assert.equal(await active(), 'Help');
  await tab.cua.keypress({ keys: ['Tab'] }); assert.equal(await active(), 'Search');
  await tab.playwright.getByRole('button', { name: 'Search', exact: true }).press('Enter');
  await tab.playwright.getByRole('dialog', { name: 'Search', exact: true }).waitFor({ state: 'visible' });
  assert(await tab.playwright.evaluate(() => document.activeElement?.matches('input[type="search"]')));
  await tab.playwright.getByRole('searchbox').fill('missing item');
  assert(await tab.playwright.getByText('No results', { exact: true }).isVisible());
  await tab.playwright.getByRole('searchbox').press('ControlOrMeta+A');
  await tab.playwright.getByRole('searchbox').press('Backspace');
  await tab.playwright.getByRole('button', { name: 'Stories', exact: true }).waitFor({ state: 'visible' });
  assert.equal(await tab.playwright.getByRole('button', { name: 'Manga Studio', exact: true }).isEnabled(), false);
  await tab.playwright.getByRole('button', { name: 'Stories', exact: true }).press('Tab');
  await tab.playwright.locator('button[aria-label="Close Search"]:focus').waitFor({ state: 'visible' });
  await tab.playwright.getByRole('button', { name: 'Close Search', exact: true }).press('Escape');
  await tab.playwright.locator('button[aria-label="Search"]:focus').waitFor({ state: 'visible' });
  await tab.playwright.getByRole('button', { name: 'Help', exact: true }).press('Enter');
  await tab.playwright.getByRole('dialog', { name: 'Library Help', exact: true }).waitFor({ state: 'visible' });
  await tab.playwright.getByRole('button', { name: 'Relics', exact: true }).press('Enter');
  await tab.playwright.getByText('Items lost by the Library that a cultivator can return for a reward', { exact: true }).waitFor({ state: 'visible' });
  await tab.playwright.getByRole('button', { name: 'Close help', exact: true }).press('Tab');
  await tab.playwright.getByRole('searchbox', { name: 'Search Library guidance' }).and(tab.playwright.locator(':focus')).waitFor({ state: 'visible' });
  await tab.playwright.getByRole('button', { name: 'Close help', exact: true }).press('Escape');
  await tab.playwright.locator('button[aria-label="Help"]:focus').waitFor({ state: 'visible' });
  report.push({ keyboard: 'Tab order, modal focus, Escape return; original Help guidance; disabled and empty Search results passed' });
  // Landscape notch with long context; the overlay remains in the viewport.
  await viewport.set({ width: 844, height: 390 });
  await tab.goto(`${baseUrl}/library-shell.html?variant=development&source=header-states&state=long-context&safeArea=landscape&motion=reduced`);
  await tab.playwright.getByRole('button', { name: 'Search', exact: true }).waitFor({ state: 'visible' });
  const safe = await tab.playwright.evaluate(() => ({
    left: document.querySelector('a[aria-label="Library home"]').getBoundingClientRect().left,
    right: document.querySelector('button[aria-label="Search"]').getBoundingClientRect().right,
    width: innerWidth,
  }));
  assert(safe.left >= 44 && safe.right <= safe.width - 44);
  await tab.playwright.getByRole('button', { name: 'Search', exact: true }).click();
  const dialog = await tab.playwright.getByRole('dialog', { name: 'Search', exact: true }).evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: innerHeight, width: innerWidth };
  });
  assert(dialog.top >= 0 && dialog.bottom <= dialog.height + 1 && dialog.left >= 0 && dialog.right <= dialog.width + 1);
  await tab.playwright.getByRole('button', { name: 'Close Search', exact: true }).click();
  report.push({ landscapeSafeArea: '44px left/right insets, long context and Search overlay passed' });
  return report;
}
