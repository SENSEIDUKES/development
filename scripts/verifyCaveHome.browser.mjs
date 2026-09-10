/** Run with a Playwright page on the developed user-profile preview.
 * Local Workshop scenarios only; does not exercise production persistence.
 */
export async function verifyCaveHome(page) {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const button = name => page.getByRole('button', { name, exact: true });
  const card = name => page.locator(`[data-cave-card="${name}"]`);
  const searchDestination = async name => {
    const before = page.url();
    await button('Search').click();
    await page.getByRole('dialog').getByRole('button', { name, exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    if (page.url() !== before) await page.waitForFunction(() => document.activeElement?.matches('h2'));
  };
  const destinationLabels = async () => {
    await button('Search').click();
    const labels = (await page.locator('.workspace-search-results button').allInnerTexts()).map(label => label.trim().toLowerCase()).filter(label => ['home', 'stories', 'relics', 'exit'].includes(label)).join();
    await button('Close Search').press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    return labels;
  };
  const choose = async name => {
    const opener = page.getByRole('region', { name: 'Workshop Controls', exact: true }).getByRole('button', { name: 'Open', exact: true });
    if (await opener.isVisible()) await opener.click();
    await button(name).click();
    await page.locator('[data-cave-home] [data-cave-rank]').waitFor();
  };
  await choose('New cultivator');
  check(await card('status-effects').count() === 0, 'empty effects control must be hidden');
  await card('qi-reserves').press('Enter');
  await page.getByText('No special Qi reserves unlocked.', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-cave-card') === 'qi-reserves');

  await choose('Home edge cases');
  await card('status-effects').press('Space');
  await page.getByRole('dialog', { name: 'Active Effects' }).waitFor();
  await page.getByText('No active effects.', { exact: true }).waitFor({ timeout: 20000 });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-cave-card') === 'qi-reserves');
  await card('qi-reserves').click();
  const reserves = page.getByRole('dialog', { name: 'Qi Reserves' });
  check((await reserves.innerText()).includes('Sect Qi\n0'), 'unlocked zero reserve must remain visible');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const portrait = document.querySelector('[data-cave-portrait]').getBoundingClientRect();
      const identity = document.querySelector('[data-cave-identity]').getBoundingClientRect();
      const name = document.querySelector('#cave-cultivator-name').getBoundingClientRect();
      const reserve = document.querySelector('[data-cave-card="qi-reserves"]').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1,
        overlap: portrait.bottom > identity.top, textClear: portrait.bottom < name.top,
        compact: reserve.width < identity.width * .6 };
    });
    check(!geometry.overflow && geometry.overlap && geometry.textClear && geometry.compact, `Home geometry at ${width}: ${JSON.stringify(geometry)}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const scenario of ['Claim failure', 'Uncertain claim', 'Collected today']) {
    await choose(scenario);
    if (scenario !== 'Collected today') await card('dao-pillar').click();
    if (scenario === 'Claim failure') {
      await page.getByText('Collection failed. Please try again.', { exact: true }).waitFor();
      check(await card('dao-pillar').isEnabled(), 'failed claim must allow retry');
    } else if (scenario === 'Uncertain claim') {
      await button('Check collection status').waitFor();
      check(await card('dao-pillar').isDisabled(), 'uncertain claim must block repeat collection');
      await button('Check collection status').click();
      await button('Check collection status').waitFor({ state: 'hidden' });
      check(await card('dao-pillar').isEnabled(), 'reconciled unclaimed state must allow retry');
    } else {
      check(await card('dao-pillar').isDisabled(), 'already collected must stay disabled');
    }
  }
  await choose('Developed cultivator');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedMotion = await page.evaluate(() => {
    const portrait = getComputedStyle(document.querySelector('[data-cave-portrait]'));
    return { transitionProperty: portrait.transitionProperty };
  });
  check(reducedMotion.transitionProperty === 'none', 'portrait aura transition must stop for reduced motion');
  await card('dao-pillar').press('Enter');
  await page.getByRole('button', { name: /Daily Dao Pillar.*Collected Today/ }).waitFor();
  check(await card('dao-pillar').isDisabled(), 'claim must disable Pillar');
  check((await page.locator('[data-cave-qi]').innerText()).includes('13,485'), 'claim must update cultivation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // ---- Public view ----------------------------------------------------
  await choose('Developed cultivator');
  // The global dock is stable; Cave destinations now remain in Search.
  const dockLabels = async () =>
    (await page.locator('.library-global-navigation button').allInnerTexts()).map(label => label.trim().toLowerCase()).join();
  check(await dockLabels() === 'home,library,discover,profile', 'global dock order');
  check(await destinationLabels() === 'home,stories,relics', 'private Search must leave Settings beneath Daily Dao Pillar');
  await searchDestination('Relics');
  // Public View belongs to the Profile settings, so exercise the Profile's
  // own control rather than depending on responsive header actions.
  await searchDestination('Home');
  await button('Settings').click();
  const publicProfileDisclosure = page.getByRole('button', {
    name: 'Public Profile What other cultivators see, and the way in.',
    exact: true,
  });
  if ((await publicProfileDisclosure.getAttribute('aria-expanded')) !== 'true') await publicProfileDisclosure.click();
  await button('Preview Public View').click();
  await page.locator('[data-cave-home-mode="public"]').waitFor();
  check((await page.locator('.workspace-header-context').innerText()).includes('Public View'), 'public view must be indicated');
  check(await dockLabels() === 'home,library,discover,profile', 'public global dock remains stable');
  check(await destinationLabels() === 'home,stories,relics,exit', 'public Search must end in Exit');
  check(await page.locator('[data-cave-card="dao-pillar"]').count() === 0, 'private Pillar must not render publicly');
  check(await page.locator('[data-cave-progress]').count() === 0, 'cultivation progress must not render publicly');
  check(await page.locator('[data-cave-bio]').count() === 1, 'public Home must show the bio');

  // Boost: immediate visual feedback, reversible, no cultivation change.
  const boostControl = page.locator('[data-cave-card="boost"]');
  await boostControl.press('Enter');
  check(await boostControl.getAttribute('aria-pressed') === 'true', 'boost must report pressed');
  check((await boostControl.innerText()).includes('1 Boost'), 'boost must count immediately');
  await boostControl.press('Enter');
  check(await boostControl.getAttribute('aria-pressed') === 'false', 'boost must withdraw');

  // The name stays centred in the identity plaque at every width, with the
  // subscription badge outside the heading.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const centring = await page.evaluate(() => {
      const identity = document.querySelector('[data-cave-identity]').getBoundingClientRect();
      const name = document.querySelector('#cave-cultivator-name span').getBoundingClientRect();
      return {
        offset: Math.abs((name.left + name.right) / 2 - (identity.left + identity.right) / 2),
        badgeInHeading: Boolean(document.querySelector('#cave-cultivator-name .cave-tier-badge')),
        badgeNearRank: Boolean(document.querySelector('[data-cave-rank-row] .cave-tier-badge')),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    check(centring.offset <= 1 && !centring.badgeInHeading && centring.badgeNearRank && !centring.overflow,
      `public name centring at ${width}: ${JSON.stringify(centring)}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  // Public Stories and Relics stay scoped and carry no private surface.
  await searchDestination('Stories');
  await page.locator('[data-cave-public-panel="stories"]').waitFor();
  check(!(await page.locator('main').innerText()).includes('Story Seeds'), 'public Stories must not expose seeds');
  await searchDestination('Relics');
  await page.locator('[data-cave-public-panel="relics"]').waitFor();
  check(!(await page.locator('main').innerText()).includes('Offering Hall'), 'public Relics must not expose the Offering Hall');

  // Exit returns to the Settings page that opened the public view.
  await searchDestination('Exit');
  await page.locator('[data-cave-page][data-cave-audience="private"]').waitFor();
  check(new URL(page.url()).searchParams.get('cave') === '/settings', 'Exit must return to the previous location');

  // Account entries originate from Home. Inbox and Redeem Code use keyboard
  // activation; each unavailable development destination must offer its route
  // specific return control.
  await searchDestination('Home');
  await page.locator('[data-cave-home]').waitFor();
  await page.locator('[data-cave-account-controls] button').press('Enter');
  await page.getByRole('heading', { name: 'Inbox', exact: true }).waitFor();
  check(new URL(page.url()).searchParams.get('cave') === '/home/inbox', 'Inbox must open its fallback route');
  await button('Return to cave').click();
  await page.locator('[data-cave-home]').waitFor();

  await button('Store').click();
  await page.getByRole('heading', { name: 'Store', exact: true }).waitFor();
  check(new URL(page.url()).searchParams.get('cave') === '/home/store', 'Store must open its fallback route');
  await button('Return to cave').click();
  await page.locator('[data-cave-home]').waitFor();

  await button('Settings').click();
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
  await page.locator('[data-slot="disclosure-trigger"]').filter({ hasText: 'Account' }).click();
  await button('Redeem Code').press('Enter');
  await page.getByRole('heading', { name: 'Redeem Code', exact: true }).waitFor();
  check(new URL(page.url()).searchParams.get('cave') === '/settings/redeem-code', 'Redeem Code must open its fallback route');
  await button('Return to Settings').click();
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();

  // The twelve-character display-name cap, where the name is edited.
  const nameField = page.locator('#cave-display-name');
  await nameField.fill('A Name Far Beyond The Limit');
  check(await nameField.inputValue() === 'A Name Far B', 'display name must clamp to twelve characters');
  check((await page.locator('[data-cave-display-name-count]').innerText()) === '12/12', 'counter must report the cap');
  await page.locator('#cave-username').fill('a_very_long_private_dao_name_kept_whole');
  check(await page.locator('#cave-username').inputValue() === 'a_very_long_private_dao_name_kept_whole', 'username must not be capped');

  // A private publication turns its two public cards into disabled controls.
  // They must not keep the pointer/hover affordance that an available card has.
  const visibilityLabels = page.locator('[data-cave-visibility] label');
  if ((await publicProfileDisclosure.getAttribute('aria-expanded')) !== 'true') await publicProfileDisclosure.click();
  for (let index = 0; index < await visibilityLabels.count(); index += 1) {
    const label = visibilityLabels.nth(index);
    if (await label.getByRole('switch').isChecked()) await label.click();
  }
  await button('Preview Public View').click();
  await page.locator('[data-cave-home-mode="public"]').waitFor();
  const disabledCardAffordance = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-cave-card="stats"], [data-cave-card="highlights"]')];
    return cards.map(card => {
      const style = getComputedStyle(card);
      return {
        disabled: card.disabled,
        cursor: style.cursor,
        opacity: Number.parseFloat(style.opacity),
        glyphCount: card.querySelectorAll('svg').length,
      };
    });
  });
  check(
    disabledCardAffordance.every(card => card.disabled && card.cursor === 'default' && card.opacity <= .65 && card.glyphCount === 1),
    `disabled public card affordance: ${JSON.stringify(disabledCardAffordance)}`,
  );

  return { widths: [320, 390, 768, 1024, 1440], geometry: 'passed', emptyReserves: 'passed', expirationFocus: 'passed', claims: 'passed', reducedMotion: 'passed', publicView: 'passed', boost: 'passed', accountEntries: 'passed', displayNameLimit: 'passed', disabledAffordance: 'passed' };
}
