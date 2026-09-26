import { expect, it } from 'vitest';
import type { HarnessChapter, HarnessStory } from '@seihouse/sen/harness-generation';
import { creatorWorldsFromHarness } from './CreatorSpaceHost';

const story = (id: string, extra: Partial<HarnessStory> = {}) => ({ id, title: `World ${id}`, updatedAt: `2026-09-2${id.length}T00:00:00Z`, ...extra }) as HarnessStory;
const chapter = (storyId: string, chapterNumber: number) => ({ storyId, chapterNumber }) as HarnessChapter;

it('projects written chapters and standing into Create world cards', () => {
  expect(creatorWorldsFromHarness({
    stories: [story('a'), story('bb', { visibility: 'shared' }), story('ccc', { visibility: 'public' }), story('dddd', { visibility: 'public', conclusion: {} as HarnessStory['conclusion'] })],
    // A chapter number recorded twice still counts once.
    chapters: [chapter('a', 1), chapter('a', 2), chapter('a', 2), chapter('dddd', 1)],
  })).toEqual([
    { id: 'a', title: 'World a', chapterCount: 2, status: 'draft', updatedAt: '2026-09-21T00:00:00Z' },
    { id: 'bb', title: 'World bb', chapterCount: 0, status: 'shared', updatedAt: '2026-09-22T00:00:00Z' },
    { id: 'ccc', title: 'World ccc', chapterCount: 0, status: 'public', updatedAt: '2026-09-23T00:00:00Z' },
    { id: 'dddd', title: 'World dddd', chapterCount: 1, status: 'complete', updatedAt: '2026-09-24T00:00:00Z' },
  ]);
});
