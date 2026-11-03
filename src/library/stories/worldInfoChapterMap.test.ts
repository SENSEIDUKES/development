import { expect, it } from 'vitest';
import type { HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { worldInfoChapterMap } from './worldInfoChapterMap';

const plan = { arcNumber: 1, goals: [
  { id: 'g1', text: 'Survive the trials', chapters: 10 },
  { id: 'g2', text: 'Win the tournament', chapters: 10 },
  { id: 'g3', text: 'Face the elder', chapters: 10 },
] };

it('gives World Info the story\'s chapters, the reader\'s read ones, and each arc\'s goals with where the story resolved them', () => {
  const state = {
    stories: [{ id: 's1', arcPlans: [{ plan, effectiveChapter: 1, reason: 'initial' }], goalCompletions: [
      { goalId: 'g1', goalText: 'Survive the trials', arcNumber: 1, chapterNumber: 8, evidence: '…', outcome: 'completed' },
      { goalId: 'g2', goalText: 'Win the tournament', arcNumber: 1, chapterNumber: 20, evidence: '', outcome: 'missed' },
    ] }],
    chapters: [
      { storyId: 's1', chapterNumber: 1, title: 'One' }, { storyId: 's1', chapterNumber: 2, title: 'Two' },
      { storyId: 's1', chapterNumber: 31, title: 'Thirty-one' }, { storyId: 'other', chapterNumber: 1, title: 'Elsewhere' },
    ],
  } as unknown as HarnessWorkspaceState;
  const map = worldInfoChapterMap(state, 's1', [1]);
  expect(map.chapters).toEqual([{ number: 1, title: 'One', read: true }, { number: 2, title: 'Two' }, { number: 31, title: 'Thirty-one' }]);
  expect(map.arcs).toEqual([
    { number: 1, firstChapter: 1, lastChapter: 30, goals: [
      { text: 'Survive the trials', startChapter: 1, endChapter: 10, resolved: { chapterNumber: 8, outcome: 'reached' } },
      { text: 'Win the tournament', startChapter: 11, endChapter: 20, resolved: { chapterNumber: 20, outcome: 'missed' } },
      { text: 'Face the elder', startChapter: 21, endChapter: 30 },
    ] },
    // Arc 2 has a chapter but no plan yet: its range, no goals.
    { number: 2, firstChapter: 31, lastChapter: 60, goals: [] },
  ]);
});
