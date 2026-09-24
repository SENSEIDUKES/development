import { describe, expect, it } from 'vitest';
import { buildInitialStoryGenerationPayload, createStoryAdministrativeMetadata, createBlueprintDraftFromSeed, createEmptyStorySeedInput, normalizeStorySeedInput, normalizeWorldBlueprint, reconcileStorySeedBlueprint } from '@seihouse/sen/story-seed';
import { createStorySeedExport, parseStorySeedJson } from '@seihouse/sen/story-seed';

describe('Story Seed arc plans', () => {
  const roadmap = [
    { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Reach the gate.', chapters: 50 }, { id: 'arc-1-city', text: 'Reach the city.', chapters: 50 }] },
    { arcNumber: 2, goals: [{ id: 'arc-2-throne', text: 'Take back the throne.', chapters: 100 }] },
  ];

  it('begins a story only from a complete, valid roadmap covering every counted arc', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    const blueprint = createBlueprintDraftFromSeed(seed);
    const administrative = createStoryAdministrativeMetadata({ storyId: 'story', creatorId: 'author', sourceSeedId: 'seed', originalLanguage: 'en' });
    expect(() => buildInitialStoryGenerationPayload(seed, administrative, blueprint, 1)).toThrow('plan every arc');
    for (const [arcPlans, message] of [
      [roadmap.slice(0, 1), 'plans 1 of its 2 arcs'],
      [[roadmap[1], roadmap[0]], 'must run in order'],
      [[roadmap[0], { arcNumber: 2, goals: [{ id: 'arc-1-gate', text: 'Again.', chapters: 100 }] }], 'more than one arc'],
      [[roadmap[0], { arcNumber: 2, goals: [{ id: 'arc-2-short', text: 'Too short.', chapters: 60 }] }], 'total 100'],
    ] as const) {
      expect(() => buildInitialStoryGenerationPayload(seed, administrative, { ...blueprint, estimatedArcs: 2, arcPlans: arcPlans as never }, 1)).toThrow(message);
    }
    const payload = buildInitialStoryGenerationPayload(seed, administrative, { ...blueprint, estimatedArcs: 2, arcPlans: roadmap }, 1);
    expect(payload.blueprint.arcPlans).toEqual(roadmap);
  });

  it('keeps Arc 1 opening with the Seed goal and reads an older single-plan Blueprint as a one-arc roadmap', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    seed.story.optional.activeArcGoal = { id: 'arc-1-return', text: 'Return to the capital.', chapters: 100 };
    const normalized = normalizeStorySeedInput(seed);
    const aligned = normalizeWorldBlueprint({ arcPlans: roadmap, estimatedArcs: 2 }, seed);
    // Only the opening goal's wording follows the Seed; its allocation, identity and the rest of the route stay saved.
    expect(aligned.arcPlans?.[0].goals).toEqual([{ id: 'arc-1-gate', text: 'Return to the capital.', chapters: 50 }, roadmap[0].goals[1]]);
    expect(aligned.arcPlans?.[1]).toEqual(roadmap[1]);
    const legacy = normalizeWorldBlueprint({ arcPlan: { arcNumber: 1, goals: [{ id: 'arc-1-old', text: 'Old plan.', chapters: 100 }] } });
    expect(legacy.arcPlans).toEqual([{ arcNumber: 1, goals: [{ id: 'arc-1-old', text: 'Old plan.', chapters: 100 }] }]);
    const [restored] = parseStorySeedJson(JSON.stringify(createStorySeedExport(normalized, aligned)));
    expect(restored.seed.story.optional.activeArcGoal).toEqual(seed.story.optional.activeArcGoal);
    expect(restored.blueprint?.arcPlans).toEqual(aligned.arcPlans);
    expect(restored.seed.story.optional.funSettings).not.toHaveProperty('longTermGoal');
  });

  it('fills an empty Seed Active Arc Goal from the roadmap opening goal', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    const reconciled = reconcileStorySeedBlueprint(seed, { arcPlans: roadmap, estimatedArcs: 2 });
    expect(reconciled.seed.story.optional.activeArcGoal).toEqual({ id: 'arc-1-gate', text: 'Reach the gate.', chapters: 100 });
    expect(reconciled.blueprint.arcPlans).toEqual(roadmap);
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
