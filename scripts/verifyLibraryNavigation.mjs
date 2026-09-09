import assert from 'node:assert/strict';

/** Uses the Browser skill's existing tab and viewport; never launches a browser. */
export async function verifyLibraryNavigation({ tab, viewport, baseUrl, widths = [320, 390, 768, 1024, 1440], interactions = true }) {
  const report = [];
  const button = name => tab.playwright.getByRole('button', { name, exact: true });
  const menu = () => tab.playwright.getByRole('dialog');
  const waitFor = async (predicate, label) => {
    for (let i = 0; i < 60; i++) {
      if (await predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(label);
  };
  const openSearch = async () => {
    await button('Search').click();
    await menu().waitFor({ state: 'visible' });
    await waitFor(() => tab.playwright.evaluate(() => document.activeElement?.matches('input[type="search"]')), 'Search field receives initial focus');
  };
  const closeSearch = async () => { await button('Close Search').press('Escape'); await menu().waitFor({ state: 'hidden' }); };
  const searchDestination = async label => {
    await openSearch();
    await menu().getByRole('button', { name: label, exact: true }).click();
    await menu().waitFor({ state: 'hidden' });
  };
  const geometry = async () => {
    await tab.playwright.getByRole('navigation', { name: 'Library global navigation', exact: true }).waitFor({ state: 'visible' });
    return tab.playwright.evaluate(() => {
    const nav = document.querySelector('.library-global-navigation');
    const r = nav.getBoundingClientRect();
    const style = getComputedStyle(nav);
    return { width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth + 1,
      bottom: r.bottom, navHeight: r.height, position: style.position,
      paddingBottom: Number.parseFloat(style.paddingBottom), paddingLeft: Number.parseFloat(style.paddingLeft), paddingRight: Number.parseFloat(style.paddingRight),
      clearance: Number.parseFloat(getComputedStyle(document.querySelector('.library-navigation-layout')).paddingBottom),
      selected: nav.querySelector('[aria-current="page"]')?.textContent,
      buttons: [...nav.querySelectorAll('button')].map(button => {
        const rect = button.getBoundingClientRect();
        return { label: button.textContent, x: rect.x, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
      }),
    };
    });
  };
  for (const width of widths) {
    await viewport.set({ width, height: 740 });
    for (const [source, state, active] of [
      ['main-library', 'linked', 'Home'],
      ['main-library', 'library', 'Library'],
      ['main-library', 'discover', 'Discover'],
      ['cultivator-cave', 'developed-cultivator', 'Profile'],
    ]) {
      await tab.goto(`${baseUrl}/library-shell.html?variant=development&source=${source}&state=${state}`);
      await button('Search').waitFor({ state: 'visible' });
      if (source === 'cultivator-cave') await button('Settings').waitFor({ state: 'visible' });
      const size = await geometry();
      assert.equal(size.buttons.map(button => button.label).join(','), 'Home,Library,Discover,Profile');
      assert.equal(size.selected, active);
      assert.equal(size.overflow, false, `${width}/${active}: overflow`);
      assert.equal(size.position, 'fixed');
      assert(Math.abs(size.bottom - size.height) < 2);
      assert(size.clearance >= size.navHeight, 'content must clear the entire navigation');
      for (const target of size.buttons) {
        assert(target.width >= 43.9 && target.height >= 43.9, `${width}/${target.label}: touch target`);
        assert(target.x >= 0 && target.right <= width + 1);
      }
      await openSearch();
      assert.equal(await tab.playwright.evaluate(() => Boolean(document.querySelector('.library-section-menu'))), false);
      await closeSearch();
      assert.equal(await tab.playwright.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Search');
      report.push({ width, active });
    }
  }

  if (interactions) {
  await viewport.set({ width: 390, height: 740 });
  await tab.goto(`${baseUrl}/library-shell.html?variant=development&source=cultivator-cave&state=developed-cultivator`);
  await button('Settings').waitFor({ state: 'visible' });
  await openSearch();
  await tab.playwright.getByRole('searchbox').press('Shift+Tab');
  await waitFor(() => tab.playwright.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close Search'), 'Shift+Tab from Search reaches Close');
  await button('Close Search').press('Shift+Tab');
  await waitFor(() => tab.playwright.evaluate(() => document.activeElement?.textContent === 'View Public Profile'), 'Shift+Tab must wrap to the last search result');
  await menu().getByRole('button', { name: 'View Public Profile', exact: true }).press('Tab');
  await waitFor(() => tab.playwright.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close Search'), 'Tab must wrap to Close');
  await closeSearch();
  await searchDestination('Stories');
  await waitFor(() => tab.playwright.evaluate(() => document.activeElement?.id === 'cave-destination-stories-title'), 'Stories heading must receive focus');
  await searchDestination('Home');
  await button('Settings').click();
  await tab.playwright.getByRole('heading', { name: 'Settings', exact: true }).waitFor({ state: 'visible' });
  assert.equal((await geometry()).selected, 'Profile');
  await tab.back();
  await button('Settings').waitFor({ state: 'visible' });
  await tab.forward();
  await tab.playwright.getByRole('heading', { name: 'Settings', exact: true }).waitFor({ state: 'visible' });
  await searchDestination('Relics');
  await button('More actions').click();
  await button('View Public Profile').click();
  await button('More actions').waitFor({ state: 'visible' });
  await openSearch();
  assert.equal(await tab.playwright.evaluate(() => [...document.querySelectorAll('.workspace-search-results button')].map(button => button.textContent).join(',')), 'Home,Stories,Relics,Exit');
  await menu().getByRole('button', { name: 'Exit', exact: true }).click();
  await menu().waitFor({ state: 'hidden' });
  await waitFor(() => tab.playwright.evaluate(() => new URLSearchParams(location.search).get('cave') === '/relics'), 'Public Exit must preserve its prior destination');

  // All global entries use real existing route/collection values in the preview adapter.
  await button('Home').click();
  await tab.playwright.getByRole('button', { name: 'Insights from the Dao', exact: true }).waitFor({ state: 'visible' });
  assert.equal((await geometry()).selected, 'Home');
  await button('Library').click(); assert.equal((await geometry()).selected, 'Library');
  await button('Discover').click(); assert.equal((await geometry()).selected, 'Discover');
  await tab.back(); assert.equal((await geometry()).selected, 'Library');
  await tab.forward(); assert.equal((await geometry()).selected, 'Discover');
  await button('Profile').click();
  await button('Settings').waitFor({ state: 'visible' });
  assert.equal((await geometry()).selected, 'Profile');
  report.push({ focus: 'contained and restored', caveRoutes: 'passed', publicExit: 'passed', globalNavigationAndHistory: 'passed' });

  for (const [safeArea, width, height] of [['on', 390, 740], ['landscape', 844, 390]]) {
    await viewport.set({ width, height });
    await tab.goto(`${baseUrl}/library-shell.html?variant=development&source=main-library&state=linked&safeArea=${safeArea}&motion=reduced`);
    await button('Search').waitFor({ state: 'visible' });
    const size = await geometry();
    assert(size.paddingBottom >= (safeArea === 'on' ? 34 : 21));
    assert(size.clearance >= size.navHeight);
    assert(!size.overflow);
    if (safeArea === 'landscape') assert(size.paddingLeft >= 44 && size.paddingRight >= 44);
    await openSearch();
    const sheet = await tab.playwright.evaluate(() => {
      const r = document.querySelector('.workspace-sheet').getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: innerHeight };
    });
    assert(sheet.top >= 0 && sheet.bottom <= sheet.height + 1);
    await closeSearch();
    report.push({ safeArea, clearance: size.clearance, navHeight: size.navHeight });
  }
  }
  await viewport.set({ width: 390, height: 740 });
  const seedUrl = `${baseUrl}/library-shell.html?variant=development&source=story-seed&state=filled-intake`;
  if (await tab.url() !== seedUrl) await tab.goto(seedUrl);
  // Story Seed intentionally keeps its in-flow navigation after the editor.
  await tab.playwright.getByRole('navigation', { name: 'Story Seed navigation', exact: true }).waitFor({ state: 'attached' });
  assert.equal(await tab.playwright.evaluate(() => Boolean(document.querySelector('.library-global-navigation'))), false);
  await waitFor(() => tab.playwright.evaluate(() => [...document.querySelectorAll('nav[aria-label="Story Seed navigation"] button')].map(button => button.textContent).join(',') === 'Sections,Story Bank,Help,Settings,Manifest'), 'Filled Story Seed keeps its original controls and Manifest eligibility');
  await button('Sections').press('Enter');
  await tab.playwright.getByRole('button', { name: 'Close sections', exact: true }).waitFor({ state: 'visible' });
  await tab.playwright.getByRole('button', { name: 'Close sections', exact: true }).press('Escape');
  for (const screen of ['reader', 'codex']) {
    await tab.goto(`${baseUrl}/library-shell.html?variant=development&source=main-library&state=reader&screen=${screen}`);
    await button('Return to header capture').waitFor({ state: 'visible' });
    assert.equal(await tab.playwright.evaluate(() => Boolean(document.querySelector('.library-global-navigation'))), false);
    await button('Return to header capture').click();
    await button('Search').waitFor({ state: 'visible' });
    const location = new URL(await tab.url());
    assert.equal(location.searchParams.get('screen'), 'home');
    assert.equal(location.searchParams.get('collection'), 'featured');
    await tab.reload();
    await button('Search').waitFor({ state: 'visible' });
    assert.equal((await geometry()).selected, 'Home');
  }
  report.push({ storySeed: 'original controls preserved', immersiveRoute: 'global strip excluded; return URL and reload passed' });
  return report;
}
