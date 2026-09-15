import { describe, expect, it } from 'vitest';
import { ARC_LENGTH, activeArcGoal, arcGenerationContext, arcGoalSegments, confirmArcGoal, createArcChapterPosition, editArcPlan, reconcileArcGoal, validateArcPlan, type ArcPlan } from './arcGoals';
import { createArcChapterPosition as legacyPosition } from '../../chapter-generation/shared/packets/livingStoryState';

const plan: ArcPlan = { arcNumber: 1, goals: [
  { id: 'rank', text: 'Reach Foundation rank.', chapters: 70 },
  { id: 'enemy', text: 'Kill the invader.', chapters: 30 },
] };
describe('Central SEN arc authority', () => {
  it('owns exactly 100 chapters and accepts one through five goals', () => {
    expect(legacyPosition).toBe(createArcChapterPosition);
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
  it('uses prose evidence for completion; time alone never advances or extends a goal', () => {
    const context = arcGenerationContext(plan, 70, 'Unite the heavens.');
    expect(confirmArcGoal(context, 70, 'She tried.', { goalId: 'rank', completed: true, evidence: 'She reached Foundation rank.' })).toBeUndefined();
    expect(confirmArcGoal(context, 70, 'She tried.', { goalId: 'rank', completed: false, evidence: 'She tried.' })).toBeUndefined();
    const done = confirmArcGoal(context, 70, 'She reached Foundation rank.', { goalId: 'rank', completed: true, evidence: 'She reached Foundation rank.' });
    expect(done?.chapterNumber).toBe(70);
    expect(arcGenerationContext(plan, 71, 'Ending').activeGoal.id).toBe('rank');
    expect(arcGenerationContext(plan, 71, 'Ending').completionDeadline).toBe(70);
    expect(arcGenerationContext(plan, 71, 'Ending', [done!]).activeGoal.id).toBe('enemy');
    expect(activeArcGoal(plan, 50, [{ ...done!, chapterNumber: 40 }]).id).toBe('rank');
  });
  it('preserves all elapsed allocations while allowing current wording and remaining weights to change', () => {
    const edited = { ...plan, goals: [{ ...plan.goals[0], text: 'Reach the new rank.', chapters: 65 }, { ...plan.goals[1], chapters: 35 }] };
    expect(editArcPlan(plan, edited, 60)).toEqual(edited);
    expect(() => editArcPlan(plan, edited, 68)).toThrow('Already-generated');
    expect(() => editArcPlan(plan, { ...plan, goals: [...plan.goals].reverse() }, 1)).toThrow('Already-generated');
    expect(() => editArcPlan(plan, { ...plan, goals: [{ ...plan.goals[0], chapters: 71 }, plan.goals[1]] }, 0)).toThrow('total 100');
  });
  it('reroutes only an evidenced canonical impossibility and keeps the original immutable', () => {
    const context = arcGenerationContext(plan, 80, 'Ending', [{ goalId: 'rank', chapterNumber: 70, evidence: 'Rank reached.' }]);
    const result = { goalId: 'enemy', impossible: true, evidence: 'The invader died in the collapse.', replacement: 'Secure the abandoned fortress.' };
    expect(reconcileArcGoal(plan, context, 80, 'She requested mercy.', result)).toBeUndefined();
    const next = reconcileArcGoal(plan, context, 80, result.evidence, result)!;
    expect(next.goals[1]).toEqual({ ...plan.goals[1], text: result.replacement });
    expect(plan.goals[1].text).toBe('Kill the invader.');
  });
  it('allows overdue active wording to change without extending its deadline or reallocating history', () => {
    const edited = { ...plan, goals: [{ ...plan.goals[0], text: 'Master the surviving cultivation technique.' }, plan.goals[1]] };
    expect(editArcPlan(plan, edited, 80, activeArcGoal(plan, 81).id)).toEqual(edited);
    expect(() => editArcPlan(plan, edited, 80, 'enemy')).toThrow('historical');
    expect(() => editArcPlan(plan, { ...edited, goals: [{ ...edited.goals[0], chapters: 81 }, { ...edited.goals[1], chapters: 19 }] }, 80, 'rank')).toThrow('Already-generated');
  });
});
