/** Run with a Playwright page on the developed user-profile preview.
 * Local Workshop scenarios only; does not exercise production persistence.
 */
export async function verifyCaveHome(page) {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const button = name => page.getByRole('button', { name, exact: true });
  const card = name => page.locator(`[data-cave-card="${name}"]`);
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
  await card('dao-pillar').press('Enter');
  await page.getByRole('button', { name: /Daily Dao Pillar.*Collected Today/ }).waitFor();
  check(await card('dao-pillar').isDisabled(), 'claim must disable Pillar');
  check((await page.locator('[data-cave-qi]').innerText()).includes('13,485'), 'claim must update cultivation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // ---- Public view ----------------------------------------------------
  await choose('Developed cultivator');
  // The dock uppercases its labels in CSS, so compare on the accessible text.
  const dockLabels = async () =>
    (await page.locator('.cave-workspace-dock button').allInnerTexts()).map(label => label.trim().toLowerCase()).join();
  check(await dockLabels() === 'home,stories,relics', 'private dock must leave Settings unassigned');
  await button('Relics').first().click();
  // Below the header's compact breakpoint the secondary actions live in the
  // existing overflow menu; above it they sit inline.
  const headerAction = async name => {
    const inline = page.getByRole('button', { name, exact: true });
    if (!(await inline.first().isVisible())) await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).locator('visible=true').first().click();
  };
  await headerAction('View Public Profile');
  await page.locator('[data-cave-home-mode="public"]').waitFor();
  check((await page.locator('.workspace-header-status').innerText()).includes('Public View'), 'public view must be indicated');
  check(await dockLabels() === 'home,stories,relics,exit', 'public dock must end in Exit');
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
  await button('Stories').first().click();
  await page.locator('[data-cave-public-panel="stories"]').waitFor();
  check(!(await page.locator('main').innerText()).includes('Story Seeds'), 'public Stories must not expose seeds');
  await button('Relics').first().click();
  await page.locator('[data-cave-public-panel="relics"]').waitFor();
  check(!(await page.locator('main').innerText()).includes('Offering Hall'), 'public Relics must not expose the Offering Hall');

  // Exit returns to the page the public view was opened from.
  await button('Exit').first().click();
  await page.locator('main[data-cave-audience="private"]').waitFor();
  check(new URL(page.url()).searchParams.get('cave') === '/relics', 'Exit must return to the previous location');

  // Account entries originate from Home. Inbox and Redeem Code use keyboard
  // activation; each unavailable development destination must offer its route
  // specific return control.
  await button('Home').first().click();
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

  return { widths: [320, 390, 768, 1024, 1440], geometry: 'passed', emptyReserves: 'passed', expirationFocus: 'passed', claims: 'passed', reducedMotion: 'passed', publicView: 'passed', boost: 'passed', accountEntries: 'passed', displayNameLimit: 'passed' };
}
