import { describe, expect, it } from 'vitest';
import { ARC_LENGTH, MAX_ROADMAP_ARCS, activeArcGoal, arcGenerationContext, arcGoalSegments, arcsCanBeAddedBeforeFinal, confirmArcGoal, createArcChapterPosition, editArcPlan, insertArcsBeforeFinal, validateArcPlan, validateArcRoadmap, type ArcPlan } from '@seihouse/sen/arc-goals';

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

describe('Arc roadmap lengthening', () => {
  const arc = (arcNumber: number, ...ids: string[]): ArcPlan => ({
    arcNumber,
    goals: ids.map((id, index) => ({ id, text: `Goal ${id}.`, chapters: index ? 1 : ARC_LENGTH - ids.length + 1 })),
  });
  const roadmap = [arc(1, 'arc-1-open', 'arc-1-trial'), arc(2, 'arc-2-war'), arc(3, 'arc-3-ending')];

  it('validates a whole roadmap in order with identities unique across arcs', () => {
    expect(validateArcRoadmap(roadmap, 3)).toEqual(roadmap);
    expect(() => validateArcRoadmap(roadmap, 4)).toThrow('3 of 4 arcs');
    expect(() => validateArcRoadmap([roadmap[1]])).toThrow('run in order');
    expect(() => validateArcRoadmap([roadmap[0], arc(2, 'arc-1-open')])).toThrow('more than one arc');
  });

  it('inserts new arcs before the final arc, which keeps its goals and becomes the last arc', () => {
    const lengthened = insertArcsBeforeFinal(roadmap, [arc(9, 'arc-3-siege'), arc(9, 'arc-4-return')]);
    expect(lengthened.map(plan => plan.arcNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(lengthened.slice(0, 2)).toEqual(roadmap.slice(0, 2));
    expect(lengthened[2].goals.map(goal => goal.id)).toEqual(['arc-3-siege']);
    expect(lengthened[3].goals.map(goal => goal.id)).toEqual(['arc-4-return']);
    expect(lengthened[4]).toEqual({ ...roadmap[2], arcNumber: 5 });
    expect(roadmap[2].arcNumber).toBe(3);
  });

  it('gives a new goal a unique identity when a saved or earlier new goal already uses it', () => {
    const lengthened = insertArcsBeforeFinal(roadmap, [arc(3, 'arc-3-ending', 'arc-1-open'), arc(4, 'arc-3-ending')]);
    expect(lengthened[2].goals.map(goal => goal.id)).toEqual(['arc-3-ending-2', 'arc-1-open-2']);
    expect(lengthened[3].goals.map(goal => goal.id)).toEqual(['arc-3-ending-3']);
    expect(lengthened[4].goals.map(goal => goal.id)).toEqual(['arc-3-ending']);
  });

  it('refuses to re-plan: a one-arc roadmap, an empty or invalid addition, or a roadmap past the limit', () => {
    expect(arcsCanBeAddedBeforeFinal([roadmap[0]])).toBe(false);
    expect(arcsCanBeAddedBeforeFinal(roadmap)).toBe(true);
    expect(() => insertArcsBeforeFinal([roadmap[0]], [arc(2, 'new')])).toThrow('one-arc roadmap');
    expect(() => insertArcsBeforeFinal(roadmap, [])).toThrow('at least one arc');
    expect(() => insertArcsBeforeFinal(roadmap, [{ arcNumber: 3, goals: [{ id: 'short', text: 'Too short.', chapters: 40 }] }])).toThrow('total 100');
    const full = Array.from({ length: MAX_ROADMAP_ARCS }, (_, index) => arc(index + 1, `arc-${index + 1}`));
    expect(() => insertArcsBeforeFinal(full, [arc(1, 'one-too-many')])).toThrow(`at most ${MAX_ROADMAP_ARCS} arcs`);
  });
});
