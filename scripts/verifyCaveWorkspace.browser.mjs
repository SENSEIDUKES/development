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
  const searchDestination = async (name, keyboard = false) => {
    const before = await tab.url();
    await button('Search').click();
    const item = tab.playwright.getByRole('dialog').getByRole('button', { name, exact: true });
    if (keyboard) await item.press('Enter'); else await item.click();
    await tab.playwright.getByRole('dialog').waitFor({ state: 'hidden' });
    if (await tab.url() !== before) await eventually(() => tab.playwright.evaluate(() => Boolean(document.activeElement?.matches('h2'))), 'destination heading receives focus');
  };
  const geometry = () => tab.playwright.evaluate(() => {
    const dock = document.querySelector('.library-global-navigation');
    const sidebar = document.querySelector('[data-slot="app-shell-sidebar"]');
    const rect = dock.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      bottom: rect.bottom, height: rect.height, width: rect.width, viewportHeight: innerHeight,
      dockVisible: rect.width > 0, dockPosition: getComputedStyle(dock).position,
      sidebarVisible: Boolean(sidebar && sidebar.getBoundingClientRect().width > 0),
      clearance: Number.parseFloat(getComputedStyle(document.querySelector('.library-navigation-layout')).paddingBottom),
      padding: Number.parseFloat(getComputedStyle(dock).paddingBottom),
      targets: [...dock.querySelectorAll('button')]
        .map(el => el.getBoundingClientRect()).filter(rect => rect.width > 0)
        .map(rect => ({ width: rect.width, height: rect.height })),
    };
  });
  const ensureDisclosure = async (triggerName) => {
    const trigger = button(triggerName);
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  };
  const profileControlGeometry = async () => {
    await ensureDisclosure('Public Profile What other cultivators see, and the way in.');
    await ensureDisclosure('Cultivator Portrait Cast your likeness through the Divine Mirror.');
    await ensureDisclosure('Language Interface dialect and automatic translation.');
    await ensureDisclosure('Writing Preferences Defaults copied onto newly created stories.');
    await button('Open Divine Mirror').click();
    await tab.playwright.getByRole('dialog', { name: 'Cultivator Portrait Builder' }).waitFor({ state: 'visible' });
    const controls = await tab.playwright.evaluate(() => {
      const namedButton = name => [...document.querySelectorAll('button')]
        .find(button => button.textContent.trim() === name);
      const labelForSwitch = document.querySelector('[data-cave-visibility] label');
      const elements = [
        ['username', document.querySelector('#cave-username')],
        ['display-name', document.querySelector('#cave-display-name')],
        ['custom-spectrum', document.querySelector('[aria-label="Custom spectrum"]')],
        ['public-preview', namedButton('Preview Public View')],
        ['portrait-open', namedButton('Open Divine Mirror')],
        ['portrait-close', document.querySelector('[aria-label="Close Portrait Builder"]')],
        ['visibility-switch', labelForSwitch],
        ['preferred-language', document.querySelector('#cave-preferred-language')],
        ['translation-language', document.querySelector('#cave-translation-language')],
        ['writing-style', document.querySelector('#cave-writing-style')],
        ...[...document.querySelectorAll('[aria-label="Celestial Aura rank"] [role="radio"]:not(:disabled)')]
          .map((element, index) => [`aura-${index}`, element]),
      ];
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        controls: elements.map(([name, element]) => {
          const rect = element.getBoundingClientRect();
          return { name, width: rect.width, height: rect.height };
        }),
      };
    });
    await button('Close Portrait Builder').click();
    return controls;
  };
  const results = [];
  let safeAreaOverridden = false;
  try {
    for (const width of widths) {
      await viewport.set({ width, height: 900 });
      for (const destination of ['Home', 'Stories', 'Relics', 'Settings']) {
        report({ width, destination });
        if (destination === 'Settings') { await searchDestination('Home'); await button('Settings').click(); }
        else await searchDestination(destination);
        if (destination !== 'Home') assert.equal(await heading(destination).innerText(), destination);
        assert.equal((new URL(await tab.url()).searchParams.get('cave') || '/home'), '/' + destination.toLowerCase());
        await button('Search').click();
        const selected = await tab.playwright.evaluate(() => [...document.querySelectorAll('.workspace-search-results [aria-pressed="true"]')]
          .filter(el => el.getBoundingClientRect().width > 0).map(el => el.textContent.trim()));
        assert.equal(selected.join(','), destination === 'Settings' ? '' : destination);
        await button('Close Search').press('Escape');
        await tab.playwright.getByRole('dialog').waitFor({ state: 'hidden' });
        const size = await geometry();
        assert.equal(size.overflow, false, `${width} ${destination}: horizontal overflow`);
        assert.equal(size.sidebarVisible, width >= 1024);
        assert.equal(size.dockVisible, true);
        assert(size.targets.every(rect => rect.width >= 43.9 && rect.height >= 43.9));
        {
          assert.equal(size.dockPosition, 'fixed');
          assert(Math.abs(size.bottom - size.viewportHeight) < 2);
          assert(size.clearance >= size.height, 'content must clear the complete dock');
        }
        if (destination === 'Settings' && [320, 768].includes(width)) {
          const profileControls = await profileControlGeometry();
          assert.equal(profileControls.overflow, false, `${width} Settings: profile control overflow`);
          assert(
            profileControls.controls.every(control => control.width >= 43.9 && control.height >= 43.9),
            `${width} Settings: undersized profile control ${JSON.stringify(profileControls.controls)}`,
          );
        }
      }
      await tab.back();
      assert.equal(await button('Settings').isVisible(), true);
      await tab.forward();
      assert.equal(await heading('Settings').innerText(), 'Settings');
      results.push({ width, destinations: 4, history: 'passed' });
    }

    report('Keyboard, overlays, and safe areas');
    await viewport.set({ width: 390, height: 844 });
    await searchDestination('Stories', true);
    assert.equal(await tab.playwright.evaluate(() => document.activeElement?.textContent), 'Stories');
    await searchDestination('Home');
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
    assert.equal(await button('Settings').isVisible(), true);

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
