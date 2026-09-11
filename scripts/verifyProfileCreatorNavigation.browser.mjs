// Run on the developed user-profile preview with playwright-cli run-code --filename=<this file>.
// Local fixtures only; public content delivery and seed downloads are host adapter boundaries.
async (page) => {
  page.setDefaultTimeout(10000);
  await page.bringToFront();
  const check = (value, message) => { if (!value) throw new Error(message); };
  const link = name => page.getByRole('link', { name, exact: true });
  const base = 'http://127.0.0.1:5173/?preview=user-profile';
  const results = [];
  await page.goto(base);
  await page.locator('[data-cave-rank]').waitFor();
  check(await page.locator('[data-slot="library-tier-badge"]').count() === 1, 'Current glass tier badge');
  check(await page.locator('[data-cave-name][data-element="fire"]').count() === 1, 'Current elemental title');
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);
    const geometry = await page.locator('[data-cave-identity-actions]').evaluate(row => {
      const items = [...row.children].map(el => {
        const box = el.getBoundingClientRect();
        const icon = el.querySelector('svg').getBoundingClientRect();
        return { text: el.textContent, x: box.x, width: box.width, height: box.height,
          iconTop: icon.top, color: getComputedStyle(el).color,
          iconColor: getComputedStyle(el.querySelector('svg')).color,
          overflow: el.scrollWidth > el.clientWidth + 1 };
      });
      return { items, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    check(geometry.items.map(item => item.text).join('|') === 'Inbox|Worlds|Store|Energy', 'Action order');
    check(!geometry.pageOverflow && geometry.items.every(item => !item.overflow), `Overflow at ${width}`);
    check(geometry.items.every(item => item.width >= 44 && item.height >= 44), `Touch targets at ${width}`);
    check(geometry.items.every(item => Math.abs(item.width - geometry.items[0].width) < 1), `Balanced row at ${width}`);
    check(geometry.items.every(item => Math.abs(item.iconTop - geometry.items[0].iconTop) < 1), `Icon alignment at ${width}`);
    check(geometry.items.every(item => item.color === geometry.items[0].color && item.iconColor === item.color), `Consistent action colors at ${width}`);
    const progress = page.getByRole('button', { name: 'Show exact cultivation progress', exact: true });
    const layout = await page.locator('[data-cave-identity]').evaluate(card => {
      const rect = selector => card.querySelector(selector).getBoundingClientRect();
      const bar = rect('[data-cave-progress]');
      const rank = rect('[data-cave-rank]');
      const next = rect('[data-cave-next-rank]');
      const badge = rect('[data-slot="library-tier-badge"]');
      const bio = card.querySelector('[data-cave-bio]');
      return { bar: { top: bar.top, bottom: bar.bottom, left: bar.left, right: bar.right },
        rank: { top: rank.top, left: rank.left }, next: { top: next.top, right: next.right },
        badgeBottom: badge.bottom, badgeTop: badge.top, badgeHeight: badge.height, cardCenter: card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2, name: { top: rect('[data-cave-name]').top, bottom: rect('[data-cave-name]').bottom, center: rect('[data-cave-name]').left + rect('[data-cave-name]').width / 2 }, bioTop: bio.getBoundingClientRect().top,
        bioHeight: bio.clientHeight, lineHeight: parseFloat(getComputedStyle(bio).lineHeight),
        targetHeight: rect('.cave-progress-trigger').height, text: card.textContent };
    });
    check(Math.abs(layout.name.center - layout.cardCenter) <= 1, 'Dao name independently centered');
    check(layout.badgeHeight <= 19, 'Tier marker at 75 percent size');
    check(layout.badgeBottom < layout.bar.top && layout.rank.top >= layout.bar.bottom, 'Identity and progression order');
    check(Math.abs(layout.rank.left - layout.bar.left) <= 5 && Math.abs(layout.next.right - layout.bar.right) <= 5, 'Rank endpoints');
    check(layout.bioTop > layout.rank.top && layout.targetHeight >= 43.99, 'Bio below ranks and accessible progress target');
    check(!/13,480|Qi Reserves/.test(layout.text), 'No permanent numeric progress or reserves in identity');
    if (width < 640) check(layout.bioHeight <= layout.lineHeight * 2 + 1, 'Bio limited to two mobile lines');
    await progress.focus();
    check(await progress.evaluate(el => getComputedStyle(el).outlineStyle === 'solid'), 'Progress visible focus');
    await progress.press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    check((await dialog.innerText()).includes('13,480 / 25,000 Qi'), 'Exact cultivation disclosure');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    check(await progress.evaluate(el => el === document.activeElement), 'Progress focus restored');
    await progress.press('Space');
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await progress.click();
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    const revealBio = page.getByRole('button', { name: 'Read full bio', exact: true });
    if (width < 640) {
      await revealBio.press('Enter');
      await dialog.waitFor();
      check((await dialog.innerText()).includes(await page.locator('[data-cave-bio]').textContent()), 'Complete bio disclosure');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      check(await revealBio.evaluate(el => el === document.activeElement), 'Bio focus restored');
    }
    await page.getByRole('button', { name: 'Inbox, 2 unread messages', exact: true }).focus();
    await page.keyboard.press('Tab');
    check(await link('Worlds').evaluate(el => el === document.activeElement), 'Inbox to Worlds keyboard order');
    check(await link('Worlds').evaluate(el => getComputedStyle(el).outlineStyle === 'solid'), 'Worlds visible focus');
    await page.keyboard.press('Tab');
    check(await link('Store').evaluate(el => el === document.activeElement), 'Worlds to Store keyboard order');
    check(await link('Store').evaluate(el => getComputedStyle(el).outlineStyle === 'solid'), 'Store visible focus');
    if ([320, 390, 1440].includes(width)) {
      await page.locator('[data-cave-identity]').screenshot({ path: `output/playwright/profile-actions-${width}.png` });
    }
    const heading = page.locator('[data-cave-name]');
    const original = await heading.innerHTML();
    for (const name of ['Dao', 'A Very Long Cultivator Name Across the Celestial Library', 'UnbrokenCultivatorName'.repeat(5)]) {
      await heading.evaluate((element, value) => { element.textContent = value; }, name);
      await page.waitForFunction(() => {
        const group = document.querySelector('[data-cave-identity-group]');
        const name = group.querySelector('[data-cave-name]');
        const badge = group.querySelector('.cave-tier-badge');
        const nameWidth = name.getBoundingClientRect().width;
        const expectedInline = nameWidth + 2 * (badge.getBoundingClientRect().width + parseFloat(getComputedStyle(group).columnGap)) <= group.clientWidth;
        return Math.abs(parseFloat(group.style.getPropertyValue('--cave-name-width')) - nameWidth) < .1
          && (group.dataset.markerInline === 'true') === expectedInline;
      }, undefined, { timeout: 10000, polling: 50 });
      const fit = await page.locator('[data-cave-identity-group]').evaluate(group => {
        const name = group.querySelector('[data-cave-name]').getBoundingClientRect();
        const badge = group.querySelector('.cave-tier-badge').getBoundingClientRect();
        const card = group.closest('[data-cave-identity]').getBoundingClientRect();
        return { nameCenter: name.left + name.width / 2, cardCenter: card.left + card.width / 2,
          inline: group.dataset.markerInline === 'true', nameRight: name.right, nameBottom: name.bottom,
          badgeLeft: badge.left, badgeRight: badge.right, badgeTop: badge.top, cardRight: card.right };
      });
      check(Math.abs(fit.nameCenter - fit.cardCenter) <= 1, `Independent name center for ${name} at ${width}`);
      check(fit.badgeRight <= fit.cardRight, 'Marker stays inside card');
      if (name === 'Dao') check(fit.inline && fit.badgeLeft > fit.nameRight, 'Short name gets inline marker');
      else check(!fit.inline && fit.badgeTop >= fit.nameBottom, 'Long name stacks marker');
    }
    await heading.evaluate((element, html) => { element.innerHTML = html; }, original);
    await page.waitForTimeout(100);
    results.push({ width, ...geometry });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await link('Worlds').press('Enter');
  await page.locator('[data-cave-worlds="workshop-cultivator"]').waitFor();
  check(await page.locator('[data-cave-world]').count() === 2, 'Public worlds only');
  check(!/Private world fixture|Draft world fixture/.test(await page.locator('[data-cave-worlds]').innerText()), 'Hidden world leakage');
  check(await page.locator('[data-world-seed]').count() === 1, 'Seed stays attached');
  check(await page.evaluate(() => document.activeElement?.textContent === 'Worlds'), 'Destination focus');
  await page.goBack();
  await link('Store').waitFor();
  await page.goForward();
  await page.locator('[data-cave-worlds]').waitFor();
  await page.reload();
  await page.locator('[data-cave-worlds="workshop-cultivator"]').waitFor();
  await page.getByRole('button', { name: 'Return to Kept Reading’s profile', exact: true }).click();
  await link('Store').press('Enter');
  await page.locator('[data-cave-storefront="workshop-cultivator"]').waitFor();
  check(await page.getByText('No items are available yet.', { exact: false }).isVisible(), 'Store empty state');
  await page.locator('[data-cave-destination="storefront"]').screenshot({ path: 'output/playwright/profile-storefront-390.png' });
  await page.goto(`${base}&cave=${encodeURIComponent('/public/creators/creator-moon-scribe/home')}`);
  await page.getByRole('heading', { name: 'Moon Scribe', exact: true }).waitFor();
  check(!(await page.locator('[data-cave-energy]').count()), 'No signed-in energy on public profile');
  await link('Worlds').click();
  await page.locator('[data-cave-worlds="creator-moon-scribe"]').waitFor();
  await page.getByRole('button', { name: 'Return to Moon Scribe’s profile', exact: true }).click();
  await link('Store').click();
  await page.locator('[data-cave-storefront="creator-moon-scribe"]').waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Moon Scribe’s Store', exact: true }).waitFor();
  check(!(await page.locator('[data-cave-storefront] button').count()), 'No commerce controls');
  await page.goto(base);
  await page.locator('[data-cave-rank]').waitFor();
  return { passed: true, results };
}
