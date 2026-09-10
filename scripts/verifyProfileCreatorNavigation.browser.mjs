// Run on the developed user-profile preview with playwright-cli run-code --filename=<this file>.
// Local fixtures only; public content delivery and seed downloads are host adapter boundaries.
async (page) => {
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
