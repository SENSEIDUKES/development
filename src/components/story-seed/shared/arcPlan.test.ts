import { describe, expect, it } from 'vitest';
import { buildInitialStoryGenerationPayload, createStoryAdministrativeMetadata, createBlueprintDraftFromSeed, createEmptyStorySeedInput, normalizeStorySeedInput, normalizeWorldBlueprint, reconcileStorySeedBlueprint } from '@seihouse/sen/story-seed';
import { createStorySeedExport, parseStorySeedJson } from '@seihouse/sen/story-seed';

describe('Story Seed arc plans', () => {
  const roadmap = [
    { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Reach the gate.', chapters: 50 }, { id: 'arc-1-city', text: 'Reach the city.', chapters: 50 }] },
    { arcNumber: 2, goals: [{ id: 'arc-2-throne', text: 'Take back the throne.', chapters: 100 }] },
  ];

  const arcOne = roadmap[0];
  const lookahead = [{ arcNumber: 2, direction: 'LOOKAHEAD Take back the throne.' }];

  it('begins a story from a valid Arc 1 and a story length, never from a draft that has not planned Arc 1', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    seed.story.optional.activeArcGoal = { id: 'arc-1-gate', text: 'Reach the gate.', chapters: 100 };
    const blueprint = createBlueprintDraftFromSeed(seed);
    const administrative = createStoryAdministrativeMetadata({ storyId: 'story', creatorId: 'author', sourceSeedId: 'seed', originalLanguage: 'en' });
    // A draft never invents Arc 1 from the Seed's goal alone.
    expect(blueprint.arcPlans).toBeUndefined();
    expect(() => buildInitialStoryGenerationPayload(seed, administrative, blueprint, 1)).toThrow('Generate the Blueprint to plan Arc 1');
    for (const [arcPlans, estimatedArcs, message] of [
      [roadmap, 2, 'plans only Arc 1'],
      [[roadmap[1]], 2, 'must be Arc 1'],
      [[{ arcNumber: 1, goals: [{ id: 'arc-1-short', text: 'Too short.', chapters: 60 }] }], 2, 'total 100'],
      [[arcOne], 0, 'whole number from 1'],
    ] as const) {
      expect(() => buildInitialStoryGenerationPayload(seed, administrative, { ...blueprint, estimatedArcs, arcPlans: arcPlans as never }, 1)).toThrow(message);
    }
    const payload = buildInitialStoryGenerationPayload(seed, administrative, { ...blueprint, estimatedArcs: 12, arcPlans: [arcOne], arcLookahead: lookahead }, 1);
    expect(payload.blueprint.arcPlans).toEqual([arcOne]);
    expect(payload.blueprint.arcLookahead).toEqual(lookahead);
  });

  it('keeps Arc 1 opening with the Seed goal, and reads an older Blueprint that planned every arc as Arc 1 plus a look-ahead', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    seed.story.optional.activeArcGoal = { id: 'arc-1-return', text: 'Return to the capital.', chapters: 100 };
    const normalized = normalizeStorySeedInput(seed);
    const aligned = normalizeWorldBlueprint({ arcPlans: roadmap, estimatedArcs: 2 }, seed);
    // Only the opening goal's wording follows the Seed; its allocation and identity stay saved.
    expect(aligned.arcPlans).toEqual([{ arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Return to the capital.', chapters: 50 }, roadmap[0].goals[1]] }]);
    expect(aligned.arcLookahead).toEqual([{ arcNumber: 2, direction: 'Take back the throne.' }]);
    const legacy = normalizeWorldBlueprint({ arcPlan: { arcNumber: 1, goals: [{ id: 'arc-1-old', text: 'Old plan.', chapters: 100 }] } });
    expect(legacy.arcPlans).toEqual([{ arcNumber: 1, goals: [{ id: 'arc-1-old', text: 'Old plan.', chapters: 100 }] }]);
    // A malformed saved plan is dropped, never thrown, so one bad record never wipes saved Seeds.
    expect(normalizeWorldBlueprint({ arcPlans: [{ arcNumber: 1, goals: 'broken' }], estimatedArcs: 3 }).arcPlans).toBeUndefined();
    // The look-ahead travels with an export.
    const [restored] = parseStorySeedJson(JSON.stringify(createStorySeedExport(normalized, aligned)));
    expect(restored.seed.story.optional.activeArcGoal).toEqual(seed.story.optional.activeArcGoal);
    expect(restored.blueprint?.arcPlans).toEqual(aligned.arcPlans);
    expect(restored.blueprint?.arcLookahead).toEqual(aligned.arcLookahead);
    expect(restored.seed.story.optional.funSettings).not.toHaveProperty('longTermGoal');
  });

  it('fills an empty Seed Active Arc Goal from Arc 1, and keeps only look-ahead the story length still has', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    const reconciled = reconcileStorySeedBlueprint(seed, { arcPlans: [arcOne], estimatedArcs: 3, arcLookahead: [...lookahead, { arcNumber: 3, direction: 'Rule.' }] });
    expect(reconciled.seed.story.optional.activeArcGoal).toEqual({ id: 'arc-1-gate', text: 'Reach the gate.', chapters: 100 });
    expect(reconciled.blueprint.arcPlans).toEqual([arcOne]);
    expect(reconciled.blueprint.arcLookahead).toHaveLength(2);
    const shorter = reconcileStorySeedBlueprint(seed, { ...reconciled.blueprint, estimatedArcs: 2 });
    expect(shorter.blueprint.arcLookahead).toEqual(lookahead);
  });

  it('drops the removed long-term goal field during normalization', () => {
    const empty = createEmptyStorySeedInput();
    const seed = normalizeStorySeedInput({ ...empty, story: {
      ...empty.story,
      optional: { ...empty.story.optional, funSettings: { longTermGoal: 'Discarded' } },
    } });
    expect(seed.story.optional.funSettings).not.toHaveProperty('longTermGoal');
  });
});
