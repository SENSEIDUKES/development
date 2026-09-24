import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch();
await mkdir('output/playwright', { recursive: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();
    const section = async label => {
      await page.waitForTimeout(300);
      const name = label === 'Origin' ? /^Origin(?!al)/ : new RegExp(`^${label}`);
      if (!await button(name).count()) await button('Sections').click();
      await button(name).click();
    };
    await page.route('**/api/generate-blueprint', async route => {
      const { storySeed } = route.request().postDataJSON();
      assert(!JSON.stringify(storySeed).match(/additionalStoryDirection|firstMajorConflict|plotAndTropeSettings|arcPlan/));
      await route.fulfill({ json: {
        title: 'Arc browser verification', logline: 'A journey to the gate.', worldOverview: 'A mountain kingdom.',
        startingLocation: 'The foothills.', societyStructure: 'Mountain villages.', powerSystemOutline: 'Costly cultivation.',
        mainCharacter: { name: 'Mara', age: '25', personality: 'Patient', appearance: 'Dark hair', backgroundProfile: 'A returning traveler.' },
        mcProfile: 'A returning traveler.', majorFactions: ['The Gate'], initialCharacters: ['The Keeper'], majorMysteries: [],
        firstArcPromise: 'Reach the gate.', arcPlan: { arcNumber: 1, goals: [storySeed.story.optional.activeArcGoal] },
        tropeRules: 'Earn each success.', styleBible: 'Clear sensory prose.', destinedEnding: 'Free the valley.', estimatedArcs: 3, unresolvedPlotThreads: [],
      } });
    });
    await page.goto(`${origin}/?preview=story-seed`);
    await page.locator('#origin-style-title').waitFor();
    await page.getByRole('radio', { name: 'Japanese', exact: true }).click();
    await button('Pick a path').click();
    await page.getByRole('radio', { name: 'Xianxia', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Arc browser verification');
    await page.locator('#core-premise-input').fill('A traveler returns to the mountain gate.');
    await section('ARC');
    const selectors = ['label[for="destined-ending-input"]', '#arc-hard-pins-title', 'label[for="active-arc-goal-input"]', '#arc-fun-settings-title'];
    const boxes = [];
    for (const selector of selectors) {
      const field = page.locator(selector);
      assert.equal(await field.count(), 1);
      assert(await field.isVisible());
      boxes.push(await field.boundingBox());
    }
    boxes.forEach((box, i) => {
      assert(box.x >= -1 && box.x + box.width <= width + 1);
      if (i) assert(box.y >= boxes[i - 1].y + boxes[i - 1].height);
    });
    assert.equal(await page.locator('input[id^="hard-pin-"]').count(), 3);
    assert.equal(await page.getByText('Story Sauce', { exact: true }).count(), 0);
    await page.locator('#destined-ending-input').fill('Free the valley.');
    for (let i = 1; i <= 3; i++) await page.locator(`#hard-pin-${i}`).fill(`Keep promise ${i}.`);
    await page.locator('#active-arc-goal-input').fill('Open the mountain gate.');
    await page.locator('#arc-face-slap-high').click();
    await page.screenshot({ path: `output/playwright/story-seed-arc-${width}.png`, fullPage: true });
    await section('World Identity');
    await page.locator('#make-it-work-instruction-input').fill('The mountain walks.');
    await page.locator('#main-opposition-input').fill('The gate keeper.');
    await page.screenshot({ path: `output/playwright/story-seed-world-${width}.png`, fullPage: true });
    for (const name of ['Characters', 'Factions', 'Abilities', 'Power System', 'Origin']) await section(name);
    await button('Save Draft').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('seihouse-workshop-story-seeds-v4') ?? '[]').some(record => record.seed.story.optional.hardPins?.length === 3));
    await page.reload();
    await button('Story Bank').click();
    await button('Use Seed').click();
    await button('Refine Details').click();
    await section('ARC');
    assert.equal(await page.locator('#hard-pin-3').inputValue(), 'Keep promise 3.');
    assert.equal(await page.locator('#active-arc-goal-input').inputValue(), 'Open the mountain gate.');
    await section('World Identity');
    assert.equal(await page.locator('#make-it-work-instruction-input').inputValue(), 'The mountain walks.');
    assert.equal(await page.locator('#main-opposition-input').inputValue(), 'The gate keeper.');
    if (await button('Open').count()) await button('Open').click();
    await page.getByRole('button', { name: /Advanced/ }).click();
    await page.getByPlaceholder('Enter the server-configured testing token').fill('browser-fixture');
    await button('Manifest World Blueprint').click();
    await page.getByRole('button', { name: 'Manifest Story', exact: true }).waitFor();
    await page.locator('#hard-pin-2').fill('Keep the revised promise.');
    await page.locator('#active-arc-goal-input').fill('Unlock the mountain gate.');
    // Blueprint review edits save to the Seed, including the generated cast.
    await page.locator('#char-role-blueprint-character-the-keeper').fill('Gatekeeper ally');
    await page.locator('#faction-description-blueprint-faction-the-gate').fill('Guardians of the pass.');
    await page.locator('#mc-age-input').fill('26');
    await page.screenshot({ path: `output/playwright/story-seed-blueprint-${width}.png`, fullPage: true });
    const download = page.waitForEvent('download');
    await button('Export Seed + Blueprint').click();
    const exported = await download;
    const stream = await exported.createReadStream();
    let content = ''; for await (const chunk of stream) content += chunk;
    assert(content.includes('Keep the revised promise.'));
    assert(content.includes('Unlock the mountain gate.'));
    assert(!/plotAndTropeSettings|additionalStoryDirection|firstMajorConflict/.test(content));
    const exportedSeed = JSON.parse(content).seed.world.optional.worldFoundations;
    assert.equal(exportedSeed.additionalCharacters.find(entry => entry.name === 'The Keeper')?.role, 'Gatekeeper ally');
    assert.equal(exportedSeed.factions.find(entry => entry.name === 'The Gate')?.description, 'Guardians of the pass.');
    assert.equal(exportedSeed.mainCharacter.age, '26');
    await button('Refine Details').click();
    await section('Characters');
    assert.equal(await page.locator('#char-role-blueprint-character-the-keeper').inputValue(), 'Gatekeeper ally');
    assert.equal(await page.locator('#mc-age-input').inputValue(), '26');
    await section('Factions');
    assert.equal(await page.locator('#faction-description-blueprint-faction-the-gate').inputValue(), 'Guardians of the pass.');
    await page.goto(`${origin}/library-shell.html?source=story-seed&variant=development&state=empty-intake`);
    await page.locator('#origin-style-title').waitFor();
    assert.deepEqual(errors, [], 'No browser runtime errors, including the active shell capture');
    console.log(`Story Seed ${width}px: complete navigation, Arc hierarchy, World controls, save/reload, Blueprint edits saved to the Seed, export, and active capture passed.`);
    await context.close();
  }
} finally { await browser.close(); }
