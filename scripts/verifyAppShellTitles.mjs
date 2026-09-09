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
      const trigger = width < 480 ? 'Header options' : 'Search';
      await tab.playwright.getByRole('button', { name: trigger, exact: true }).waitFor({ state: 'visible' });
      const geometry = await tab.playwright.evaluate(() => {
        const header = document.querySelector('[data-slot="app-header"]');
        const title = header.querySelector('[data-slot="library-header-badge-title"]');
        const bounds = element => {
          const r = element.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
        };
        const range = document.createRange(); range.selectNodeContents(title);
        const text = range.getBoundingClientRect();
        return {
          title: title.textContent, header: bounds(header), plaque: bounds(title.parentElement),
          text: { left: text.left, right: text.right }, ellipsis: getComputedStyle(title).textOverflow,
          titleHeight: title.getBoundingClientRect().height, lineHeight: getComputedStyle(title).lineHeight,
          controls: [...header.querySelectorAll('a, button')].map(element => ({ name: element.getAttribute('aria-label'), ...bounds(element) })),
          actions: bounds(header.querySelector('[data-slot="app-header-actions"]')),
          scroll: document.documentElement.scrollWidth, viewport: innerWidth,
          toolbar: Boolean(document.querySelector('.workspace-header-toolbar')),
        };
      });
      assert(geometry.text.left >= geometry.plaque.left && geometry.text.right <= geometry.plaque.right, `clipped title: ${width}/${config}`);
      assert.notEqual(geometry.ellipsis, 'ellipsis');
      if (!config.includes('header-states')) assert(geometry.titleHeight <= parseFloat(geometry.lineHeight) + 1, `current title wrapped: ${width}/${config}`);
      assert(geometry.plaque.right <= geometry.actions.left, `title/actions overlap: ${width}/${config}`);
      assert(geometry.scroll <= geometry.viewport, `page overflow: ${width}/${config}`);
      geometry.controls.forEach((control, index) => {
        assert(control.width >= 43.9 && control.height >= 43.9, `small control: ${control.name}`);
        assert(control.left >= 0 && control.right <= width, `offscreen control: ${control.name}`);
        if (index) assert(control.left >= geometry.controls[index - 1].right - 0.1, `overlapping controls: ${width}/${config}`);
      });
      if (config === 'source=cultivator-cave&state=developed-cultivator') assert.equal(geometry.toolbar, false);
      report.push({ width, config, title: geometry.title, headerHeight: geometry.header.height, plaqueHeight: geometry.plaque.height });
    }
  }
  return report;
}
