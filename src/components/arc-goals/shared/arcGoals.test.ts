import { describe, expect, it } from 'vitest';
import { ARC_LENGTH, ARC_LOOKAHEAD_TEXT_LIMIT, MAX_ARC_LOOKAHEAD, MAX_ROADMAP_ARCS, activeArcGoal, arcGenerationContext, arcGoalSegments, arcLookaheadFromPlans, arcPlanFromDraft, confirmArcGoal, createArcChapterPosition, editArcPlan, normalizeArcLookahead, validateArcPlan, type ArcPlan } from '@seihouse/sen/arc-goals';

const plan: ArcPlan = { arcNumber: 1, goals: [
  { id: 'rank', text: 'Reach Foundation rank.', chapters: 70 },
  { id: 'enemy', text: 'Kill the invader.', chapters: 30 },
] };

describe('Central SEN arc authority', () => {
  it('owns exactly 100 chapters and accepts one through five goals', () => {
    expect(ARC_LENGTH).toBe(100);
    expect(createArcChapterPosition(100)).toMatchObject({ arcNumber: 1, chapterInArc: 100 });
    expect(createArcChapterPosition(101)).toMatchObject({ arcNumber: 2, chapterInArc: 1 });
    expect(() => createArcChapterPosition(1, 50)).toThrow('exactly 100');
    for (let count = 1; count <= 5; count++) {
      const goals = Array.from({ length: count }, (_, index) => ({ id: String(index), text: 'Goal', chapters: index ? 1 : 101 - count }));
      expect(validateArcPlan({ arcNumber: 1, goals }).goals).toHaveLength(count);
    }
    expect(() => validateArcPlan({ arcNumber: 1, goals: [] })).toThrow();
    expect(() => validateArcPlan({ arcNumber: 1, goals: Array.from({ length: 6 }, (_, i) => ({ id: String(i), text: 'Goal', chapters: 1 })) })).toThrow();
  });

  it('allows unequal weights and covers every chapter with sequential non-overlapping segments', () => {
    const segments = arcGoalSegments(plan);
    expect(segments.map(goal => [goal.startChapter, goal.endChapter])).toEqual([[1, 70], [71, 100]]);
    const completed = [{ goalId: 'rank', chapterNumber: 70, evidence: 'She reached Foundation rank.' }];
    for (let chapter = 1; chapter <= 100; chapter++) {
      expect(segments.filter(goal => chapter >= goal.startChapter && chapter <= goal.endChapter)).toHaveLength(1);
      expect(activeArcGoal(plan, chapter, completed).id).toBe(chapter <= 70 ? 'rank' : 'enemy');
    }
  });

  it('uses prose evidence for completion and never advances an unconfirmed goal', () => {
    const context = arcGenerationContext(plan, 70, 'Unite the heavens.');
    expect(confirmArcGoal(context, 70, 'She tried.', { goalId: 'rank', completed: true, evidence: 'She reached Foundation rank.' })).toBeUndefined();
    expect(confirmArcGoal(context, 70, 'She tried.', { goalId: 'rank', completed: false, evidence: 'She tried.' })).toBeUndefined();
    const done = confirmArcGoal(context, 70, 'She reached Foundation rank.', { goalId: 'rank', completed: true, evidence: 'She reached Foundation rank.' });
    expect(done?.chapterNumber).toBe(70);
    expect(arcGenerationContext(plan, 71, 'Ending').activeGoal.id).toBe('rank');
    expect(arcGenerationContext(plan, 71, 'Ending', [done!]).activeGoal.id).toBe('enemy');
  });

  it('allows unrestricted edits as new validated plan revisions', () => {
    const edited: ArcPlan = { ...plan, goals: [
      { id: 'enemy', text: 'Expose the invader before the duel.', chapters: 40 },
      { id: 'rank', text: 'Reach Foundation rank through the surviving path.', chapters: 60 },
    ] };
    expect(editArcPlan(plan, edited)).toEqual(edited);
    expect(() => editArcPlan(plan, { ...edited, goals: [{ ...edited.goals[0], chapters: 41 }, edited.goals[1]] })).toThrow('total 100');
    expect(() => editArcPlan(plan, { ...edited, arcNumber: 2 })).toThrow('another arc');
  });
});

describe('Arcs planned as they begin', () => {
  it('keeps a usable look-ahead: arcs after the last planned one, within the length, one line each, nearest first, at most two', () => {
    expect(normalizeArcLookahead([
      { arcNumber: 4, direction: 'Four.' }, { arcNumber: 1, direction: 'Already planned.' }, { arcNumber: 2, direction: ' Two,\n  across lines. ' },
      { arcNumber: 2, direction: 'A second Arc 2.' }, { arcNumber: 3, direction: 'Three.' }, { arcNumber: 9, direction: 'Past the end.' }, { arcNumber: 5, direction: '   ' }, 'junk',
    ], { afterArc: 1, plannedArcCount: 5 })).toEqual([{ arcNumber: 2, direction: 'Two, across lines.' }, { arcNumber: 3, direction: 'Three.' }]);
    expect(normalizeArcLookahead('not a list', { afterArc: 1 })).toEqual([]);
    expect(normalizeArcLookahead([{ arcNumber: 2, direction: 'x'.repeat(ARC_LOOKAHEAD_TEXT_LIMIT + 50) }], { afterArc: 1 })[0].direction).toHaveLength(ARC_LOOKAHEAD_TEXT_LIMIT);
    expect(MAX_ARC_LOOKAHEAD).toBe(2);
  });

  it('turns saved later arcs into a look-ahead for Blueprints that planned every arc', () => {
    const later = [2, 3, 4].map(arcNumber => ({ arcNumber, goals: [{ id: `arc-${arcNumber}-a`, text: `Arc ${arcNumber} begins.`, chapters: 50 }, { id: `arc-${arcNumber}-b`, text: `Arc ${arcNumber} ends.`, chapters: 50 }] }));
    expect(arcLookaheadFromPlans(later, { afterArc: 1, plannedArcCount: 4 })).toEqual([
      { arcNumber: 2, direction: 'Arc 2 begins. Then Arc 2 ends.' }, { arcNumber: 3, direction: 'Arc 3 begins. Then Arc 3 ends.' },
    ]);
  });

  it('gives a planned arc its number and goal identities no other arc uses, whatever the draft carried', () => {
    const plan = arcPlanFromDraft({ arcNumber: 9, goals: [{ id: 'arc-1-a', text: 'Dive\nto the stacks.', chapters: 60 }, { text: 'Reopen the archive.', chapters: 40 }] }, 2, ['arc-2-1']);
    expect(plan).toEqual({ arcNumber: 2, goals: [{ id: 'arc-2-1-2', text: 'Dive to the stacks.', chapters: 60 }, { id: 'arc-2-2', text: 'Reopen the archive.', chapters: 40 }] });
    expect(() => arcPlanFromDraft({ goals: [{ text: 'Too short.', chapters: 40 }] }, 2)).toThrow('total 100');
    expect(() => arcPlanFromDraft({}, 2)).toThrow('no goals');
  });
});
