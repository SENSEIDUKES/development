import { describe, expect, it } from 'vitest';
import { HarnessGenerationController, type HarnessGenerationRequest } from '@seihouse/sen/harness-generation';
import { STORY_SEED_SCHEMA_VERSION, createEmptyStorySeedInput, finalizeGeneratedWorldBlueprint, mirrorSeedIntoBlueprint, reconcileStorySeedBlueprint, type StorySeedInput } from '@seihouse/sen/story-seed';
import { createHarnessFoundationFromStorySeed } from '@seihouse/library/story-seed';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessGenerationPrompt } from '../../server/harness-generation/prompt';

const WORLD = 'Ancient sect world with a collapsing celestial court';
const SOCIETY = 'Sect-led feudal hierarchy';
const OPENING = 'A sprawling outer sect labor quarry built inside a volcanic rift.';
const WORLD_DETAIL = 'Refined qi trades like coin, and every rank is inscribed in a fate ledger.';
const SOCIETY_DETAIL = 'Inner disciples hold the votes; outer disciples dig for pill rations.';
const OPENING_DETAIL = 'Sulfur steam floods the lower galleries at dusk.';

const seed = (): StorySeedInput => {
  const value = createEmptyStorySeedInput();
  value.story.required = { premise: 'The prince dies in seven chapters unless fate changes.', genre: 'Xianxia', style: 'chinese', storyTags: ['death flags'] };
  value.world.optional.worldIdentity = { title: 'Ashes of the Ninth Meridian', worldType: WORLD, societyStructure: SOCIETY, startingLocation: OPENING };
  value.world.optional.worldFoundations = {
    mainCharacter: { name: 'Ye Chen' },
    additionalCharacters: [{ id: 'char-qin', name: 'Elder Qin' }],
    destinedEnding: 'The prince survives.',
  };
  return value;
};

const reviewedRecord = () => {
  const generated = finalizeGeneratedWorldBlueprint({
    title: 'Ashes of the Ninth Meridian', logline: 'x', powerSystemOutline: 'Breakthroughs are witnessed by the ledger.',
    worldOverview: `This is an ancient sect world with a collapsing celestial court. ${WORLD_DETAIL}`,
    societyStructure: SOCIETY_DETAIL, startingLocation: OPENING_DETAIL,
    mainCharacter: { name: 'Ye Chen', age: '17', personality: 'Guarded', appearance: 'Ash-grey robes.', backgroundProfile: 'He has seen seven deaths.' },
    mcProfile: 'He has seen seven deaths.', firstArcPromise: 'x', tropeRules: 'x', styleBible: 'x', destinedEnding: 'x',
    majorFactions: ['Fate Auditors — ledger-keepers'],
    initialCharacters: ['Junior Sister Han (Ally) — Elder Qin\'s last disciple'],
    majorMysteries: [], unresolvedPlotThreads: [], estimatedArcs: 1,
    arcPlans: [{ arcNumber: 1, goals: [{ id: 'arc-1-rank', text: 'Reach Foundation rank.', chapters: 100 }] }],
  }, seed());
  const reviewed = reconcileStorySeedBlueprint(seed(), generated);
  return {
    id: 'seed-1', userId: 'author', title: 'Ashes of the Ninth Meridian', createdAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z',
    schemaVersion: STORY_SEED_SCHEMA_VERSION, originalLanguage: 'en' as const, seed: reviewed.seed, blueprint: reviewed.blueprint,
  };
};

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe('Story Seed handoff of world detail and generated cast', () => {
  it('sends each author fact once, with the added detail beside it', () => {
    const foundation = createHarnessFoundationFromStorySeed(reviewedRecord());
    expect(foundation.worldFacts).toContain(`World: ${WORLD}\nWorld detail: ${WORLD_DETAIL}\nSociety: ${SOCIETY}\nSociety detail: ${SOCIETY_DETAIL}`);
    expect(foundation.openingSituation).toBe(`${OPENING}\n${OPENING_DETAIL}`);
    for (const fact of [WORLD, SOCIETY]) expect(occurrences(foundation.worldFacts!, fact)).toBe(1);
    expect(foundation.identities?.map(identity => identity.name)).toContain('Junior Sister Han');
  });

  it('sends no detail for a fact the author cleared', () => {
    const record = reviewedRecord();
    const seed = structuredClone(record.seed);
    seed.world.optional.worldIdentity.worldType = '';
    seed.world.optional.worldIdentity.startingLocation = '';
    // Saved as the review saves it: the Blueprint mirrors the cleared Seed and keeps its details.
    const foundation = createHarnessFoundationFromStorySeed({ ...record, seed, blueprint: mirrorSeedIntoBlueprint(record.blueprint, seed) });
    expect(foundation.worldFacts).not.toContain('World detail');
    expect(foundation.worldFacts).not.toContain(WORLD_DETAIL);
    expect(foundation.worldFacts).toContain(`Society: ${SOCIETY}\nSociety detail: ${SOCIETY_DETAIL}`);
    expect(foundation.openingSituation).toBeUndefined();
  });

  it('sends no detail for a fact the author rewrote after generation', () => {
    const record = reviewedRecord();
    const seed = structuredClone(record.seed);
    seed.world.optional.worldIdentity.worldType = 'A drowned archipelago of rival sword clans';
    const foundation = createHarnessFoundationFromStorySeed({ ...record, seed, blueprint: mirrorSeedIntoBlueprint(record.blueprint, seed) });
    expect(foundation.worldFacts).toContain('World: A drowned archipelago of rival sword clans\nSociety:');
    expect(foundation.worldFacts).not.toContain(WORLD_DETAIL);
    expect(foundation.worldFacts).toContain(`Society: ${SOCIETY}\nSociety detail: ${SOCIETY_DETAIL}`);
  });

  it('leaves a novel without details exactly as before', () => {
    const record = reviewedRecord();
    const {
      worldOverviewDetail: _world, societyStructureDetail: _society, startingLocationDetail: _opening,
      worldOverviewDetailBasis: _worldBasis, societyStructureDetailBasis: _societyBasis, startingLocationDetailBasis: _openingBasis,
      ...older
    } = record.blueprint;
    const foundation = createHarnessFoundationFromStorySeed({ ...record, blueprint: older });
    expect(foundation.worldFacts).toContain(`World: ${WORLD}\nSociety: ${SOCIETY}\n`);
    expect(foundation.worldFacts).not.toContain('detail');
    expect(foundation.openingSituation).toBe(OPENING);
  });

  it('reaches the actual first chapter request through the existing packet', async () => {
    const requests: HarnessGenerationRequest[] = [];
    const reply = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter: {
      getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
      generate: async request => { requests.push(structuredClone(request)); return reply({ paragraphs: ['Ye Chen woke in the quarry.'] }); },
      arcOperation: async () => { throw new Error('A roadmap story never plans at a boundary.'); },
    } });
    await controller.hydrate();
    const story = await controller.createStory(createHarnessFoundationFromStorySeed(reviewedRecord()), 'en');
    await controller.generateNextChapter(story.id, 'fixture');
    const { userPrompt } = buildHarnessGenerationPrompt(requests[0]);
    for (const detail of [WORLD_DETAIL, SOCIETY_DETAIL, OPENING_DETAIL]) expect(occurrences(userPrompt, detail)).toBe(1);
    for (const fact of [WORLD, SOCIETY, OPENING]) expect(occurrences(userPrompt, fact)).toBe(1);
    expect(userPrompt).toContain('Junior Sister Han');
  });
});
