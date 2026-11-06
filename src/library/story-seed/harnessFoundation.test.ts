import { describe, expect, it } from 'vitest';
import { HarnessGenerationController, type HarnessGenerationRequest } from '@seihouse/sen/harness-generation';
import { STORY_SEED_SCHEMA_VERSION, createEmptyStorySeedInput, finalizeGeneratedWorldBlueprint, reconcileStorySeedBlueprint, type StorySeedInput } from '@seihouse/sen/story-seed';
import { createHarnessFoundationFromStorySeed } from '@seihouse/library/story-seed';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessGenerationPrompt } from '../../server/harness-generation/prompt';

const WORLD = 'Ancient sect world with a collapsing celestial court';
const SOCIETY = 'Sect-led feudal hierarchy';
const OPENING = 'A sprawling outer sect labor quarry built inside a volcanic rift.';

const seed = (): StorySeedInput => {
  const value = createEmptyStorySeedInput();
  value.story.required = { premise: 'The prince dies in seven chapters unless fate changes.', genre: 'Xianxia', style: 'chinese', storyTags: ['death flags'] };
  value.world.optional.worldIdentity = { title: 'Ashes of the Ninth Meridian' };
  value.world.optional.worldFoundations = {
    powerSystem: { kindOfWorld: WORLD, whoRules: SOCIETY },
    mainCharacter: { name: 'Ye Chen' },
    additionalCharacters: [{ id: 'char-qin', name: 'Elder Qin' }],
    destinedEnding: 'The prince survives.',
  };
  return value;
};

const reviewedRecord = () => {
  const generated = finalizeGeneratedWorldBlueprint({
    title: 'Ashes of the Ninth Meridian', logline: 'x',
    mainCharacter: { name: 'Ye Chen', age: '17', personality: 'Guarded', appearance: 'Ash-grey robes.', backgroundProfile: 'He has seen seven deaths.' },
    mcProfile: 'He has seen seven deaths.', destinedEnding: 'x',
    majorFactions: ['Fate Auditors — ledger-keepers'],
    initialCharacters: ['Junior Sister Han (Ally) — Elder Qin\'s last disciple'],
    majorMysteries: [], unresolvedPlotThreads: [], estimatedArcs: 1,
    arcPlans: [{ arcNumber: 1, goals: [{ id: 'arc-1-rank', text: 'Reach Foundation rank.', chapters: 30 }] }],
  }, seed());
  const reviewed = reconcileStorySeedBlueprint(seed(), generated);
  return {
    id: 'seed-1', userId: 'author', title: 'Ashes of the Ninth Meridian', createdAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z',
    schemaVersion: STORY_SEED_SCHEMA_VERSION, originalLanguage: 'en' as const, seed: reviewed.seed, blueprint: reviewed.blueprint,
  };
};

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe('Story Seed handoff of the World card and generated cast', () => {
  it('sends what kind of world it is and who rules it once, on the World card, and no opening text', () => {
    const foundation = createHarnessFoundationFromStorySeed(reviewedRecord());
    const rules = foundation.worldAtChapterZero?.cards.find(card => card.kind === 'world-rules');
    expect(rules?.slots).toMatchObject({ kindOfWorld: WORLD, whoRules: SOCIETY });
    expect(foundation.worldFacts ?? '').not.toContain(WORLD);
    expect(foundation.worldFacts ?? '').not.toContain(SOCIETY);
    expect(foundation.openingSituation).toBeUndefined();
    expect(foundation.identities?.map(identity => identity.name)).toContain('Junior Sister Han');
  });

  it('carries a story whose Seed was saved before the World card held the world', () => {
    const record = reviewedRecord();
    const old = structuredClone(record.seed) as unknown as { world: { optional: { worldIdentity: Record<string, string>; worldFoundations: Record<string, unknown> } } };
    old.world.optional.worldFoundations.powerSystem = undefined;
    Object.assign(old.world.optional.worldIdentity, { worldType: WORLD, societyStructure: SOCIETY, startingLocation: OPENING });
    const foundation = createHarnessFoundationFromStorySeed({ ...record, seed: old as unknown as StorySeedInput });
    const rules = foundation.worldAtChapterZero?.cards.find(card => card.kind === 'world-rules');
    expect(rules?.slots).toMatchObject({ kindOfWorld: WORLD, whoRules: SOCIETY });
    expect(foundation.openingSituation).toBeUndefined();
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
    for (const fact of [WORLD, SOCIETY]) expect(occurrences(userPrompt, fact)).toBe(1);
    expect(userPrompt).not.toContain(OPENING);
    expect(userPrompt).toContain('Junior Sister Han');
  });
});
