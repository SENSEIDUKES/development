import assert from 'node:assert/strict';
/** Checks the imported package in the existing developed profile preview. */
export async function verifyElementalProfile(page) {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({width, height: 900});
    const name = page.getByRole('heading', {name: 'Kept Reading', exact: true});
    await name.scrollIntoViewIfNeeded();
    assert.equal(await name.getAttribute('data-element'), 'fire');
    assert.equal(await page.locator('[data-cave-rank]').getAttribute('data-element'), 'lightning');
    const box = await name.boundingBox();
    await page.waitForTimeout(300);
    assert.deepEqual(await name.boundingBox(), box, 'animation must not shift title geometry');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await name.locator('[aria-hidden="true"]').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).pointerEvents === 'none')), true);
    await name.focus();
    assert.equal(await name.evaluate(node => node === document.activeElement), true);
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.waitForFunction(() => document.querySelector('[data-cave-name] [data-running]')?.getAttribute('data-running') === 'false');
  assert.equal(await page.locator('[data-cave-name] .library-elemental-title__text').evaluate(node => getComputedStyle(node).animationName), 'none');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.getByRole('button', {name:/^Inbox/}).click();
  console.log('Elemental profile: four widths, semantic name, stable layout, keyboard, reduced motion, and Inbox interaction passed.');
}
