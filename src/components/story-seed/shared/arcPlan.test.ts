import { describe, expect, it } from 'vitest';
import { buildInitialStoryGenerationPayload, createStoryAdministrativeMetadata, createBlueprintDraftFromSeed, createEmptyStorySeedInput, normalizeStorySeedInput, normalizeWorldBlueprint } from '@seihouse/sen/story-seed';
import { createStorySeedExport, parseStorySeedJson } from '@seihouse/sen/story-seed';

describe('Story Seed arc plans', () => {
  it('rejects later arcs and multi-goal Blueprints at story creation', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    const blueprint = createBlueprintDraftFromSeed(seed);
    const administrative = createStoryAdministrativeMetadata({ storyId: 'story', creatorId: 'author', sourceSeedId: 'seed', originalLanguage: 'en' });
    for (const plan of [
      { arcNumber: 2, goals: [{ id: 'arc-2-gate', text: 'Reach the gate.', chapters: 100 }] },
      { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Reach the gate.', chapters: 50 }, { id: 'arc-1-city', text: 'Reach the city.', chapters: 50 }] },
    ]) {
      expect(() => buildInitialStoryGenerationPayload(seed, administrative, { ...blueprint, arcPlan: plan }, 1)).toThrow('Review one Active Arc Goal');
    }
  });

  it('round-trips the authoritative editable plan without a second long-term goal', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    seed.story.optional.activeArcGoal = { id: 'arc-1-return', text: 'Return to the capital.', chapters: 100 };
    const normalized = normalizeStorySeedInput(seed);
    const blueprint = normalizeWorldBlueprint({ arcPlan: { arcNumber: 1, goals: [{ id: 'discard', text: 'Another plan.', chapters: 100 }] } }, seed);
    expect(blueprint.arcPlan?.goals).toEqual([seed.story.optional.activeArcGoal]);
    const [restored] = parseStorySeedJson(JSON.stringify(createStorySeedExport(normalized, blueprint)));
    expect(restored.seed.story.optional.activeArcGoal).toEqual(seed.story.optional.activeArcGoal);
    expect(restored.seed.story.optional.funSettings).not.toHaveProperty('longTermGoal');
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
