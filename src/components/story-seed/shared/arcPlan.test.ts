import { describe, expect, it } from 'vitest';
import { createEmptyStorySeedInput, normalizeStorySeedInput, normalizeWorldBlueprint } from './storySeedSchema';
import { createStorySeedExport, parseStorySeedJson } from './storySeedSerialization';

describe('Story Seed arc plans', () => {
  it('round-trips the authoritative editable plan without a second long-term goal', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    seed.story.optional.arcPlan = { arcNumber: 1, goals: [{ id: 'arc-1-return', text: 'Return to the capital.', chapters: 40 }, { id: 'arc-1-title', text: 'Reclaim the lost title.', chapters: 60 }] };
    const normalized = normalizeStorySeedInput(seed);
    const blueprint = normalizeWorldBlueprint({ arcPlan: { arcNumber: 1, goals: [{ id: 'discard', text: 'Another plan.', chapters: 100 }] } }, seed);
    expect(blueprint.arcPlan).toEqual(seed.story.optional.arcPlan);
    const [restored] = parseStorySeedJson(JSON.stringify(createStorySeedExport(normalized, blueprint)));
    expect(restored.seed.story.optional.arcPlan).toEqual(seed.story.optional.arcPlan);
    expect(restored.seed.story.optional.plotAndTropeSettings).not.toHaveProperty('longTermGoal');
  });

  it('drops the removed long-term goal field during normalization', () => {
    const empty = createEmptyStorySeedInput();
    const seed = normalizeStorySeedInput({ ...empty, story: {
      ...empty.story,
      optional: { ...empty.story.optional, plotAndTropeSettings: { longTermGoal: 'Discarded' } },
    } });
    expect(seed.story.optional.plotAndTropeSettings).not.toHaveProperty('longTermGoal');
  });
});
