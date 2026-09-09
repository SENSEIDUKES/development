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
  const openSection = async () => { await button('Section').click(); await menu().waitFor({ state: 'visible' }); };
  const closeSection = async () => { await button('Close Section menu').press('Escape'); await menu().waitFor({ state: 'hidden' }); };
  const selectSection = async label => {
    await openSection();
    await menu().getByRole('button', { name: label, exact: true }).click();
    await menu().waitFor({ state: 'hidden' });
  };
  const geometry = () => tab.playwright.evaluate(() => {
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
  for (const width of widths) {
    await viewport.set({ width, height: 740 });
    for (const [source, state, active, sections] of [
      ['main-library', 'linked', 'Home', 'Immortal Hub,Sects,Tiers'],
      ['main-library', 'library', 'Library', 'Seed Bank,My Library'],
      ['main-library', 'discover', 'Discover', 'Fate Survival Challenges'],
      ['cultivator-cave', 'developed-cultivator', 'Profile', 'Home,Stories,Relics'],
    ]) {
      await tab.goto(`${baseUrl}/library-shell.html?variant=development&source=${source}&state=${state}`);
      await button('Section').waitFor({ state: 'visible' });
      if (source === 'cultivator-cave') await button('Settings').waitFor({ state: 'visible' });
      const size = await geometry();
      assert.equal(size.buttons.map(button => button.label).join(','), 'Section,Home,Library,Discover,Profile');
      assert.equal(size.selected, active);
      assert.equal(size.overflow, false, `${width}/${active}: overflow`);
      assert.equal(size.position, 'fixed');
      assert(Math.abs(size.bottom - size.height) < 2);
      assert(size.clearance >= size.navHeight, 'content must clear the entire navigation');
      for (const target of size.buttons) {
        assert(target.width >= 43.9 && target.height >= 43.9, `${width}/${target.label}: touch target`);
        assert(target.x >= 0 && target.right <= width + 1);
      }
      await openSection();
      assert.equal(await tab.playwright.evaluate(() => [...document.querySelectorAll('.library-section-menu button')].map(button => button.textContent).join(',')), sections);
      await closeSection();
      assert.equal(await tab.playwright.evaluate(() => document.activeElement?.textContent), 'Section');
      report.push({ width, active, sections });
    }
  }

  if (interactions) {
  await viewport.set({ width: 390, height: 740 });
  await tab.goto(`${baseUrl}/library-shell.html?variant=development&source=cultivator-cave&state=developed-cultivator`);
  await button('Settings').waitFor({ state: 'visible' });
  await openSection();
  await button('Close Section menu').press('Shift+Tab');
  await waitFor(() => tab.playwright.evaluate(() => document.activeElement?.textContent === 'Relics'), 'Shift+Tab must wrap to Relics');
  await menu().getByRole('button', { name: 'Relics', exact: true }).press('Tab');
  await waitFor(() => tab.playwright.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close Section menu'), 'Tab must wrap to Close');
  await closeSection();
  await selectSection('Stories');
  await waitFor(() => tab.playwright.evaluate(() => document.activeElement?.id === 'cave-destination-stories-title'), 'Stories heading must receive focus');
  await selectSection('Home');
  await button('Settings').click();
  await tab.playwright.getByRole('heading', { name: 'Settings', exact: true }).waitFor({ state: 'visible' });
  assert.equal((await geometry()).selected, 'Profile');
  await tab.back();
  await button('Settings').waitFor({ state: 'visible' });
  await tab.forward();
  await tab.playwright.getByRole('heading', { name: 'Settings', exact: true }).waitFor({ state: 'visible' });
  await selectSection('Relics');
  await button('More actions').click();
  await button('View Public Profile').click();
  await button('More actions').waitFor({ state: 'visible' });
  await openSection();
  assert.equal(await tab.playwright.evaluate(() => [...document.querySelectorAll('.library-section-menu button')].map(button => button.textContent).join(',')), 'Home,Stories,Relics,Exit');
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
    await button('Section').waitFor({ state: 'visible' });
    const size = await geometry();
    assert(size.paddingBottom >= (safeArea === 'on' ? 34 : 21));
    assert(size.clearance >= size.navHeight);
    assert(!size.overflow);
    if (safeArea === 'landscape') assert(size.paddingLeft >= 44 && size.paddingRight >= 44);
    await openSection();
    const sheet = await tab.playwright.evaluate(() => {
      const r = document.querySelector('.workspace-sheet').getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: innerHeight };
    });
    assert(sheet.top >= 0 && sheet.bottom <= sheet.height + 1);
    await closeSection();
    report.push({ safeArea, clearance: size.clearance, navHeight: size.navHeight });
  }
  }
  await viewport.set({ width: 390, height: 740 });
  const seedUrl = `${baseUrl}/library-shell.html?variant=development&source=story-seed&state=filled-intake`;
  if (await tab.url() !== seedUrl) await tab.goto(seedUrl);
  // Story Seed intentionally keeps its in-flow navigation after the editor.
  await tab.playwright.getByRole('navigation', { name: 'Story Seed navigation', exact: true }).waitFor({ state: 'attached' });
  assert.equal(await tab.playwright.evaluate(() => document.querySelector('.library-global-navigation')), null);
  await waitFor(() => tab.playwright.evaluate(() => [...document.querySelectorAll('nav[aria-label="Story Seed navigation"] button')].map(button => button.textContent).join(',') === 'Sections,Story Bank,Help,Settings,Manifest'), 'Filled Story Seed keeps its original controls and Manifest eligibility');
  await button('Sections').press('Enter');
  await tab.playwright.getByRole('button', { name: 'Close sections', exact: true }).waitFor({ state: 'visible' });
  await tab.playwright.getByRole('button', { name: 'Close sections', exact: true }).press('Escape');
  await tab.goto(`${baseUrl}/library-shell.html?variant=development&source=main-library&state=reader`);
  await tab.playwright.getByRole('button', { name: 'Return to header capture', exact: true }).waitFor({ state: 'visible' });
  assert.equal(await tab.playwright.evaluate(() => document.querySelector('.library-global-navigation')), null);
  report.push({ storySeed: 'original controls preserved', immersiveRoute: 'global strip excluded' });
  return report;
}
