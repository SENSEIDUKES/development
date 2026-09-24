import { describe, expect, it } from 'vitest';
import {
  applyReaderStatePatch,
  createReaderStoryState,
  overlayReaderState,
  readReaderStoryState,
  resolveReaderOpeningChapter,
  setReaderChapterRead,
  splitReaderStatePatch,
} from './readerState';
import type { StoryWorld } from './story';

const now = '2026-09-24T12:00:00.000Z';
const anchor = { chapterNumber: 2, paragraphIndex: 4, intraBlockRatio: 0.5, savedAt: now };
const bookmark = { id: 'b1', chapterNumber: 2, paragraphIndex: 3, paragraphExcerpt: 'The gate…', createdAt: now };

describe('Reader state', () => {
  it('routes reader-owned fields away from story canon', () => {
    const { reader, story } = splitReaderStatePatch({ bookmarks: [bookmark], readingAnchor: anchor, memory: { characters: [] }, assignedRevealBackdrops: { a: 'b' }, mediaDescriptors: {} });
    expect(reader).toEqual({ bookmarks: [bookmark], readingAnchor: anchor, assignedRevealBackdrops: { a: 'b' } });
    expect(story).toEqual({ memory: { characters: [] }, mediaDescriptors: {} });
  });

  it('seeds from values the story already carried so none are dropped', () => {
    const state = createReaderStoryState('s1', { bookmarks: [bookmark], readerPreferences: { fontSize: 'xl', fontFamily: 'serif', lineHeight: 'relaxed', paragraphSpacing: 'normal' }, lastReadChapter: 2, readingAnchor: anchor }, now);
    expect(state).toMatchObject({ storyId: 's1', bookmarks: [bookmark], lastReadChapter: 2, readingAnchor: anchor, readChapters: [] });
    expect(state.readerPreferences?.fontSize).toBe('xl');
  });

  it('clears fields explicitly set to undefined and never keeps pixel offsets', () => {
    const seeded = createReaderStoryState('s1', { readingAnchor: anchor, lastReadChapter: 2 }, now);
    const cleared = applyReaderStatePatch(seeded, { readingAnchor: undefined, lastReadScrollPosition: 900 }, now);
    expect(cleared.readingAnchor).toBeUndefined();
    expect('lastReadScrollPosition' in cleared).toBe(false);
    expect(cleared.lastReadChapter).toBe(2);
  });

  it('tracks read chapters in order without duplicates', () => {
    let state = createReaderStoryState('s1', {}, now);
    state = setReaderChapterRead(state, 3, true, now);
    state = setReaderChapterRead(state, 1, true, now);
    state = setReaderChapterRead(state, 3, true, now);
    expect(state.readChapters).toEqual([1, 3]);
    expect(setReaderChapterRead(state, 1, false, now).readChapters).toEqual([3]);
  });

  it('overlays reader state over whatever the story view carries', () => {
    const story = { id: 's1', bookmarks: [], readerPreferences: { fontSize: 'sm' }, lastReadScrollPosition: 400 } as unknown as StoryWorld;
    const state = createReaderStoryState('s1', { bookmarks: [bookmark], lastReadChapter: 2 }, now);
    const overlaid = overlayReaderState(story, state);
    expect(overlaid.bookmarks).toEqual([bookmark]);
    expect(overlaid.lastReadChapter).toBe(2);
    expect(overlaid.readerPreferences).toBeUndefined();
    expect(overlaid.lastReadScrollPosition).toBeUndefined();
  });

  it('reads only a valid record for the requested story', () => {
    const state = createReaderStoryState('s1', { bookmarks: [bookmark], lastReadChapter: 2 }, now);
    expect(readReaderStoryState(structuredClone(state), 's1')).toEqual(state);
    expect(readReaderStoryState(state, 'other')).toBeUndefined();
    expect(readReaderStoryState({ ...state, schemaVersion: 99 }, 's1')).toBeUndefined();
    expect(readReaderStoryState({ ...state, bookmarks: [bookmark, { id: 'bad', chapterNumber: 0 }] }, 's1')?.bookmarks).toEqual([bookmark]);
  });

  it('opens the last-read chapter when it still exists', () => {
    const state = createReaderStoryState('s1', { lastReadChapter: 2 }, now);
    expect(resolveReaderOpeningChapter(state, [1, 2, 3])).toBe(2);
    expect(resolveReaderOpeningChapter(state, [1])).toBe(1);
    expect(resolveReaderOpeningChapter(undefined, [4, 5])).toBe(4);
  });
});
