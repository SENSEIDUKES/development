import { describe, expect, it } from 'vitest';
import { createEmptyStorySeedInput, normalizeStorySeedInput, normalizeWorldBlueprint } from './storySeedSchema';
import { createStorySeedExport, parseStorySeedJson } from './storySeedSerialization';

describe('Story Seed arc plan compatibility', () => {
  it('round-trips the authoritative editable plan and keeps old direction fields', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    seed.story.optional.plotAndTropeSettings.longTermGoal = 'Legacy direction';
    seed.story.optional.arcPlan = { arcNumber: 1, goals: [{ id: 'arc-1-return', text: 'Return to the capital.', chapters: 40 }, { id: 'arc-1-title', text: 'Reclaim the lost title.', chapters: 60 }] };
    const normalized = normalizeStorySeedInput(seed);
    const blueprint = normalizeWorldBlueprint({ arcPlan: { arcNumber: 1, goals: [{ id: 'discard', text: 'Another plan.', chapters: 100 }] } }, seed);
    expect(blueprint.arcPlan).toEqual(seed.story.optional.arcPlan);
    const [restored] = parseStorySeedJson(JSON.stringify(createStorySeedExport(normalized, blueprint)));
    expect(restored.seed.story.optional.arcPlan).toEqual(seed.story.optional.arcPlan);
    expect(restored.seed.story.optional.plotAndTropeSettings.longTermGoal).toBe('Legacy direction');
  });
  it('keeps old unplanned stories readable without fabricating goals or completion', () => {
    const seed = normalizeStorySeedInput(createEmptyStorySeedInput());
    expect(seed.story.optional.arcPlan).toBeUndefined();
    expect(normalizeWorldBlueprint({}, seed).arcPlan).toBeUndefined();
  });
});
