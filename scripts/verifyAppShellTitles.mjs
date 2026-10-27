import assert from 'node:assert/strict';

/** Run through the Browser skill with an existing tab and viewport handle. */
export async function verifyAppShellTitles({ tab, viewport, baseUrl }) {
  const report = [];
  for (const width of [320, 375, 390, 430, 480, 640, 768, 1440]) {
    await viewport.set({ width, height: 844 });
    for (const config of [
      'source=main-library&state=linked',
      'source=story-seed&state=filled-intake',
      'source=cultivator-cave&state=developed-cultivator',
      'source=cultivator-cave&state=developed-cultivator&cave=/public/home',
      'source=header-states&state=long-context',
    ]) {
      await tab.goto(`${baseUrl}/library-shell.html?variant=development&${config}`);
      await tab.playwright.getByRole('button', { name: 'Search', exact: true }).waitFor({ state: 'visible' });
      const geometry = await tab.playwright.evaluate(() => {
        const header = document.querySelector('[data-slot="app-header"]');
        const logo = header.querySelector('.novel-expanded-emblem');
        const badgeTitle = header.querySelector('[data-slot="library-header-badge-title"]');
        const pageTitle = document.querySelector('[data-page-title]')?.textContent ?? null;
        const bounds = element => {
          const r = element.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
        };
        return {
          hasBadgeTitle: Boolean(badgeTitle),
          pageTitle,
          header: bounds(header),
          logo: bounds(logo),
          controls: [...header.querySelectorAll('a, button')].map(element => ({ name: element.getAttribute('aria-label'), ...bounds(element) })),
          actions: bounds(header.querySelector('[data-slot="app-header-actions"]')),
          scroll: document.documentElement.scrollWidth, viewport: innerWidth,
          toolbar: Boolean(document.querySelector('.workspace-header-toolbar')),
        };
      });
      assert.equal(geometry.hasBadgeTitle, false, `unexpected header badge: ${width}/${config}`);
      assert(geometry.logo.right <= geometry.actions.left + 0.5, `logo/actions overlap: ${width}/${config}`);
      assert(geometry.scroll <= geometry.viewport, `page overflow: ${width}/${config}`);
      geometry.controls.forEach((control, index) => {
        assert(control.width >= 43.9 && control.height >= 43.9, `small control: ${control.name}`);
        assert(control.left >= 0 && control.right <= width, `offscreen control: ${control.name}`);
        if (index) assert(control.left >= geometry.controls[index - 1].right - 0.1, `overlapping controls: ${width}/${config}`);
      });
      if (config === 'source=story-seed&state=filled-intake') assert.equal(geometry.pageTitle, 'Story Seed');
      if (config === 'source=cultivator-cave&state=developed-cultivator') {
        assert.equal(geometry.toolbar, false);
        assert.equal(geometry.pageTitle, 'Profile');
      }
      report.push({ width, config, pageTitle: geometry.pageTitle, headerHeight: geometry.header.height, logoWidth: geometry.logo.width });
    }
  }
  return report;
}
