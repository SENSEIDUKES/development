import { describe, expect, it } from 'vitest';
import { createEmptyStorySeedInput, normalizeStorySeedInput, normalizeWorldBlueprint } from '@seihouse/sen/story-seed';
import { createStorySeedExport, parseStorySeedJson } from '@seihouse/sen/story-seed';

describe('Story Seed arc plans', () => {
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
