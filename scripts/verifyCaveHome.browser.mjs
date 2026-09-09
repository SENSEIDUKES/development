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
  return { widths: [320, 390, 768, 1024, 1440], geometry: 'passed', emptyReserves: 'passed', expirationFocus: 'passed', claims: 'passed', reducedMotion: 'passed' };
}
