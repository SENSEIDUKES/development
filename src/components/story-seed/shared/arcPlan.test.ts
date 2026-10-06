import { describe, expect, it } from 'vitest';
import { buildInitialStoryGenerationPayload, createStoryAdministrativeMetadata, createBlueprintDraftFromSeed, createEmptyStorySeedInput, describeBlueprintArcPlanProblem, finalizeGeneratedWorldBlueprint, mirrorSeedIntoBlueprint, normalizeStorySeedInput, normalizeWorldBlueprint, reconcileStorySeedBlueprint, validateStorySeedDraft, validateStorySeedInput, type StorySeedInput } from '@seihouse/sen/story-seed';
import { createStorySeedExport, parseStorySeedJson } from '@seihouse/sen/story-seed';

describe('Story Seed arc plans', () => {
  const roadmap = [
    { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Reach the gate.', chapters: 15 }, { id: 'arc-1-city', text: 'Reach the city.', chapters: 15 }] },
    { arcNumber: 2, goals: [{ id: 'arc-2-throne', text: 'Take back the throne.', chapters: 30 }] },
  ];

  const arcOne = roadmap[0];
  const lookahead = [{ arcNumber: 2, direction: 'LOOKAHEAD Take back the throne.' }];

  it('begins a story from a valid Arc 1 and a story length, never from a draft that has not planned Arc 1', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    seed.story.optional.activeArcGoal = { id: 'arc-1-gate', text: 'Reach the gate.', chapters: 30 };
    const blueprint = createBlueprintDraftFromSeed(seed);
    const administrative = createStoryAdministrativeMetadata({ storyId: 'story', creatorId: 'author', sourceSeedId: 'seed', originalLanguage: 'en' });
    // A draft never invents Arc 1 from the Seed's goal alone.
    expect(blueprint.arcPlans).toBeUndefined();
    expect(() => buildInitialStoryGenerationPayload(seed, administrative, blueprint, 1)).toThrow('Generate the Blueprint to plan Arc 1');
    for (const [arcPlans, estimatedArcs, message] of [
      [roadmap, 2, 'plans only Arc 1'],
      [[roadmap[1]], 2, 'must be Arc 1'],
      [[{ arcNumber: 1, goals: [{ id: 'arc-1-short', text: 'Too short.', chapters: 18 }] }], 2, 'total 30'],
      [[arcOne], 9, 'from 10 to 40'],
      [[arcOne], 41, 'from 10 to 40'],
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
    seed.story.optional.activeArcGoal = { id: 'arc-1-return', text: 'Return to the capital.', chapters: 30 };
    const normalized = normalizeStorySeedInput(seed);
    const aligned = normalizeWorldBlueprint({ arcPlans: roadmap, estimatedArcs: 2 }, seed);
    // Only the opening goal's wording follows the Seed; its allocation and identity stay saved.
    expect(aligned.arcPlans).toEqual([{ arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Return to the capital.', chapters: 15 }, roadmap[0].goals[1]] }]);
    expect(aligned.arcLookahead).toEqual([{ arcNumber: 2, direction: 'Take back the throne.' }]);
    const legacy = normalizeWorldBlueprint({ arcPlan: { arcNumber: 1, goals: [{ id: 'arc-1-old', text: 'Old plan.', chapters: 30 }] } });
    expect(legacy.arcPlans).toEqual([{ arcNumber: 1, goals: [{ id: 'arc-1-old', text: 'Old plan.', chapters: 30 }] }]);
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
    expect(reconciled.seed.story.optional.activeArcGoal).toEqual({ id: 'arc-1-gate', text: 'Reach the gate.', chapters: 30 });
    expect(reconciled.blueprint.arcPlans).toEqual([arcOne]);
    expect(reconciled.blueprint.arcLookahead).toHaveLength(2);
    const shorter = reconcileStorySeedBlueprint(seed, { ...reconciled.blueprint, estimatedArcs: 2 });
    expect(shorter.blueprint.arcLookahead).toEqual(lookahead);
  });

  it('drops a look-ahead written for another length when the Seed\'s Story Length changes', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
    seed.story.optional.arcCount = 12;
    const reviewed = reconcileStorySeedBlueprint(seed, { arcPlans: [arcOne], estimatedArcs: 12, arcLookahead: lookahead });
    expect(reviewed.blueprint.arcLookahead).toEqual(lookahead);
    const longer = { ...reviewed.seed, story: { ...reviewed.seed.story, optional: { ...reviewed.seed.story.optional, arcCount: 20 } } };
    // Mirroring the Seed edit, and reopening the saved pair, both drop it.
    expect(mirrorSeedIntoBlueprint(reviewed.blueprint, longer).arcLookahead).toBeUndefined();
    expect(reconcileStorySeedBlueprint(longer, reviewed.blueprint).blueprint.arcLookahead).toBeUndefined();
    // The same length keeps it.
    expect(mirrorSeedIntoBlueprint(reviewed.blueprint, reviewed.seed).arcLookahead).toEqual(lookahead);
  });

  it('drops the removed long-term goal field during normalization', () => {
    const empty = createEmptyStorySeedInput();
    const seed = normalizeStorySeedInput({ ...empty, story: {
      ...empty.story,
      optional: { ...empty.story.optional, funSettings: { longTermGoal: 'Discarded' } },
    } });
    expect(seed.story.optional.funSettings).not.toHaveProperty('longTermGoal');
  });

  describe('the Story Length', () => {
    const lengthOf = (seed: StorySeedInput, arcCount: number): StorySeedInput =>
      ({ ...seed, story: { ...seed.story, optional: { ...seed.story.optional, arcCount } } });
    const base = () => {
      const seed = createEmptyStorySeedInput();
      seed.story.required = { premise: 'An exile returns.', genre: 'Fantasy', style: 'chinese', storyTags: ['exile'] };
      return seed;
    };

    it('records what Arc 1 was planned as, from the answer or an older Blueprint\'s saved length, never as sent', () => {
      expect(normalizeWorldBlueprint({ arcPlans: [arcOne], estimatedArcs: 1 }).arcOneScope).toBe('whole-story');
      expect(normalizeWorldBlueprint({ arcPlans: [arcOne], estimatedArcs: 12 }).arcOneScope).toBe('opening');
      // A Blueprint without Arc 1 has nothing to record.
      expect(normalizeWorldBlueprint({ estimatedArcs: 12 })).not.toHaveProperty('arcOneScope');
      // The scope comes from the answer's own length, whatever the answer claims.
      const finalized = finalizeGeneratedWorldBlueprint({ arcPlans: [arcOne], estimatedArcs: 1, arcOneScope: 'opening' }, base());
      expect(finalized.arcOneScope).toBe('whole-story');
    });

    it('lets a story begin only with a length from 10 to 40 arcs, and asks for Arc 1 again after a one-arc plan', () => {
      const planned = reconcileStorySeedBlueprint(base(), { arcPlans: [arcOne], estimatedArcs: 12 }).blueprint;
      expect(describeBlueprintArcPlanProblem(planned)).toBeUndefined();
      expect(describeBlueprintArcPlanProblem(mirrorSeedIntoBlueprint(planned, lengthOf(base(), 40)))).toBeUndefined();
      // A Blueprint saved before the range opens with its own length and names the fix.
      const older = reconcileStorySeedBlueprint(base(), { arcPlans: [arcOne], estimatedArcs: 4 }).blueprint;
      expect(older.estimatedArcs).toBe(4);
      expect(describeBlueprintArcPlanProblem(older)).toBe('Story Length must be a whole number of arcs from 10 to 40.');
      expect(describeBlueprintArcPlanProblem(mirrorSeedIntoBlueprint(older, lengthOf(base(), 10)))).toBeUndefined();
      // An older one-arc Blueprint planned Arc 1 as the whole story: a story of 10 or more arcs needs Arc 1 planned again.
      const whole = reconcileStorySeedBlueprint(base(), { arcPlans: [arcOne], estimatedArcs: 1 }).blueprint;
      expect(describeBlueprintArcPlanProblem(mirrorSeedIntoBlueprint(whole, lengthOf(base(), 11))))
        .toBe('Arc 1 was planned as the whole story, reaching the Destined Ending. Regenerate the Blueprint to plan Arc 1 as the opening of 11 arcs.');
    });

    it('loads a saved length up to 100 arcs, but generates from a length of 10 to 40 only, and reads a missing one as blank', () => {
      for (const arcCount of [0, 101, 2.5, '12']) {
        expect(validateStorySeedDraft({ ...base(), story: { ...base().story, optional: { ...base().story.optional, arcCount } } }).errors)
          .toContain('Story Length must be a whole number of arcs from 10 to 40.');
      }
      expect(normalizeStorySeedInput({ ...base(), story: { ...base().story, optional: { ...base().story.optional, arcCount: null } } }).story.optional)
        .not.toHaveProperty('arcCount');
      // A Seed saved before the range keeps its length; generating asks for one inside it.
      expect(normalizeStorySeedInput(lengthOf(base(), 4)).story.optional.arcCount).toBe(4);
      expect(normalizeStorySeedInput(lengthOf(base(), 100)).story.optional.arcCount).toBe(100);
      for (const arcCount of [4, 9, 41, 100]) {
        expect(validateStorySeedInput(lengthOf(base(), arcCount)).errors).toEqual(['Story Length must be a whole number of arcs from 10 to 40.']);
      }
      for (const arcCount of [10, 40]) expect(validateStorySeedInput(lengthOf(base(), arcCount)).valid).toBe(true);
    });
  });
});
