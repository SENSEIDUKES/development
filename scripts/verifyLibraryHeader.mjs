/** Run with the Browser skill's existing tab and viewport handles.
 * No browser is launched here. Exercises the same user-visible preview routes.
 */
import assert from 'node:assert/strict';

export async function verifyLibraryHeader({ tab, viewport, baseUrl }) {
  const report = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await viewport.set({ width, height: 844 });
    let previousRight;
    let previousHeight;
    for (const state of ['context-present', 'context-absent', 'long-context']) {
      await tab.goto(`${baseUrl}/library-shell.html?variant=development&source=header-states&state=${state}`);
      await tab.playwright.getByRole('button', { name: 'Search', exact: true }).waitFor({ state: 'visible' });
      const geometry = await tab.playwright.evaluate(() => {
        const header = document.querySelector('[data-slot="app-header"]');
        const controls = [...header.querySelectorAll('a, button')].map(element => {
          const rect = element.getBoundingClientRect();
          return { name: element.getAttribute('aria-label'), x: rect.x, right: rect.right, width: rect.width, height: rect.height };
        });
        return { width: innerWidth, scroll: document.documentElement.scrollWidth,
          height: header.getBoundingClientRect().height, controls,
          fieldCount: header.querySelectorAll('input').length,
          badge: header.querySelector('[data-slot="library-header-badge-title"]')?.textContent,
        };
      });
      assert(geometry.badge);
      assert.equal(geometry.fieldCount, 0);
      assert(geometry.scroll <= width + 1, `horizontal overflow at ${width}/${state}`);
      const controls = geometry.controls;
      assert.equal(controls.slice(-2).map(item => item.name).join(','), 'Help,Search');
      assert.equal(controls.length, state === 'context-absent' ? 3 : 4);
      controls.forEach((control, index) => {
        assert(control.width >= 43.9 && control.height >= 43.9, `small target ${control.name}`);
        assert(control.x >= 0 && control.right <= geometry.width + 1, `off-screen ${control.name}`);
        if (index) assert(control.x >= controls[index - 1].right - 0.1, `overlap ${control.name}`);
      });
      if (previousRight !== undefined) {
        assert(Math.abs(controls.at(-1).right - previousRight) < 1, 'Search moved when context changed');
        assert(Math.abs(geometry.height - previousHeight) < 1, 'Header height changed with context');
      }
      previousRight = controls.at(-1).right;
      previousHeight = geometry.height;
      report.push({ width, state, headerHeight: geometry.height, controls: controls.length });
    }
  }
  // Keyboard traversal and modal focus on a phone, including a disabled result.
  await viewport.set({ width: 390, height: 844 });
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
  assert.equal(await active(), 'Close Search');
  await tab.playwright.getByRole('button', { name: 'Close Search', exact: true }).press('Escape');
  await tab.playwright.locator('button[aria-label="Search"]:focus').waitFor({ state: 'visible' });
  await tab.playwright.getByRole('button', { name: 'Help', exact: true }).press('Enter');
  await tab.playwright.getByRole('dialog', { name: 'Library Help', exact: true }).waitFor({ state: 'visible' });
  await tab.playwright.getByRole('button', { name: 'Relics', exact: true }).click();
  assert(await tab.playwright.getByText('Items lost by the Library that a cultivator can return for a reward', { exact: true }).isVisible());
  await tab.playwright.getByRole('button', { name: 'Close help', exact: true }).press('Shift+Tab');
  assert.equal(await tab.playwright.evaluate(() => document.activeElement?.textContent?.trim()), 'Pressure');
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
