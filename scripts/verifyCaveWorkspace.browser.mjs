import assert from 'node:assert/strict';

/** Run against a Codex Browser tab already opened at ?preview=user-profile.
 * Pass its documented viewport and CDP capabilities. Uses only local preview data.
 * Example: await verifyCaveWorkspace(tab, viewport, await tab.capabilities.get('cdp'))
 */
export async function verifyCaveWorkspace(tab, viewport, cdp, report = () => {}, widths = [320, 390, 768, 1024, 1440]) {
  const eventually = async (predicate, label) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail(label);
  };
  const button = name => tab.playwright.getByRole('button', { name, exact: true });
  const heading = name => tab.playwright.getByRole('heading', { name, exact: true });
  const geometry = () => tab.playwright.evaluate(() => {
    const dock = document.querySelector('.cave-workspace-dock > nav');
    const sidebar = document.querySelector('.cave-workspace-body > aside');
    const rect = dock.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      bottom: rect.bottom, height: rect.height, width: rect.width, viewportHeight: innerHeight,
      dockVisible: rect.width > 0, dockPosition: getComputedStyle(dock).position,
      sidebarVisible: sidebar.getBoundingClientRect().width > 0,
      clearance: Number.parseFloat(getComputedStyle(document.querySelector('.cave-workspace-body')).paddingBottom),
      padding: Number.parseFloat(getComputedStyle(dock).paddingBottom),
      targets: [...document.querySelectorAll('nav[aria-label="Cultivator Cave navigation"] button')]
        .map(el => el.getBoundingClientRect()).filter(rect => rect.width > 0)
        .map(rect => ({ width: rect.width, height: rect.height })),
    };
  });
  const results = [];
  let safeAreaOverridden = false;
  try {
    for (const width of widths) {
      await viewport.set({ width, height: 900 });
      for (const destination of ['Home', 'Stories', 'Relics', 'Settings']) {
        report({ width, destination });
        await button(destination).click({ timeoutMs: 8000 });
        if (destination !== 'Home') assert.equal(await heading(destination).innerText(), destination);
        assert.equal((new URL(await tab.url()).searchParams.get('cave') || '/home'), '/' + destination.toLowerCase());
        const selected = await tab.playwright.evaluate(() => [...document.querySelectorAll('nav[aria-label="Cultivator Cave navigation"] [aria-current="page"]')]
          .filter(el => el.getBoundingClientRect().width > 0).map(el => el.textContent.trim()));
        assert.equal(selected.join(','), destination);
        const size = await geometry();
        assert.equal(size.overflow, false, `${width} ${destination}: horizontal overflow`);
        assert.equal(size.sidebarVisible, width >= 1024);
        assert.equal(size.dockVisible, width < 1024);
        assert(size.targets.every(rect => rect.width >= 44 && rect.height >= 44));
        if (width < 1024) {
          assert.equal(size.dockPosition, 'fixed');
          assert(Math.abs(size.bottom - size.viewportHeight) < 2);
          assert(size.clearance >= size.height, 'content must clear the complete dock');
        }
      }
      await tab.back();
      assert.equal(await heading('Relics').innerText(), 'Relics');
      await tab.forward();
      assert.equal(await heading('Settings').innerText(), 'Settings');
      results.push({ width, destinations: 4, history: 'passed' });
    }

    report('Keyboard, overlays, and safe areas');
    await viewport.set({ width: 390, height: 844 });
    await button('Stories').press('Enter');
    assert.equal(await tab.playwright.evaluate(() => document.activeElement?.textContent), 'Stories');
    await button('Settings').press('Space');
    assert.equal(await tab.playwright.evaluate(() => document.activeElement?.textContent), 'Settings');
    await tab.playwright.getByRole('heading', { name: 'Settings', exact: true }).press('Tab');
    assert.match(await tab.playwright.evaluate(() => document.activeElement?.textContent ?? ''), /Identity/);
    assert.equal(await tab.playwright.evaluate(() => document.activeElement?.matches(':focus-visible')), true);

    await button('Cultivator Portrait Cast your likeness through the Divine Mirror.').click();
    await button('Open Divine Mirror').click();
    await tab.playwright.getByRole('dialog', { name: 'Cultivator Portrait Builder' }).waitFor({ state: 'visible' });
    await button('Close Portrait Builder').press('Shift+Tab');
    await eventually(() => tab.playwright.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))), 'dialog must contain keyboard focus');
    await button('Close Portrait Builder').press('Escape');
    await tab.playwright.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await tab.playwright.evaluate(() => document.activeElement?.textContent?.trim()), 'Open Divine Mirror');
    await button('Open Divine Mirror').click();
    await tab.back();
    await tab.playwright.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await heading('Stories').innerText(), 'Stories');
    assert.equal(await tab.playwright.evaluate(() => document.activeElement?.textContent), 'Stories');

    await button('Settings').click();
    await button('Language Interface dialect and automatic translation.').click();
    await tab.playwright.getByRole('combobox', { name: 'Preferred Language', exact: true }).selectOption('Spanish');
    await tab.playwright.getByRole('dialog', { name: 'Confirm Language Change' }).waitFor({ state: 'visible' });
    await button('Yes, Keep Changes').press('Shift+Tab');
    await eventually(() => tab.playwright.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))), 'dialog must contain keyboard focus');
    await button('No, Revert Back').press('Enter');
    await tab.playwright.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await tab.playwright.getByRole('combobox', { name: 'Preferred Language', exact: true }).getAttribute('id'), 'cave-preferred-language');

    const before = await geometry();
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 34, left: 12, right: 12, top: 0 } });
    safeAreaOverridden = true;
    const after = await geometry();
    assert(Math.abs(after.padding - before.padding - 34) < 1);
    assert(after.clearance >= after.height);
    assert.equal(after.overflow, false);
    await tab.cua.scroll({ x: 180, y: 500, scrollY: 1200, scrollX: 0 });
    const scrolled = await geometry();
    assert(Math.abs(scrolled.bottom - scrolled.viewportHeight) < 2);
    results.push({ keyboard: 'passed', overlays: 'passed', safeArea: '34px bottom / 12px sides', persistentDock: 'passed' });
    return results;
  } finally {
    if (safeAreaOverridden) await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: {} });
    await viewport.reset();
  }
}
