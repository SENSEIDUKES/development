import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../../../narrative/story';
import { bookmarkPassageText, createAnchoredBookmark, mapBookmarksToBlocks, resolveBookmarkIndex } from './mindPalace';

const blocks = [
  { id: 'c2-p1', text: 'A keeper waited on the causeway with a lantern.' },
  { id: 'c2-p2', text: '"Who are you?" he asked.' },
  { id: 'c2-p3', text: 'Mara gave him the only name she still owned.' },
];
const kept = (index: number, note = '') => createAnchoredBookmark({ id: `b${index}`, chapterNumber: 2, index, block: blocks[index], note, createdAt: 'now' });

describe('Mind Palace passages', () => {
  it('anchors a kept passage to its block identity and exact text', () => {
    expect(kept(2, ' Her last name. ')).toEqual({
      id: 'b2', chapterNumber: 2, paragraphIndex: 2, blockId: 'c2-p3',
      passage: 'Mara gave him the only name she still owned.',
      paragraphExcerpt: 'Mara gave him the only name she still owned.', note: 'Her last name.', createdAt: 'now',
    });
    expect(resolveBookmarkIndex(kept(2), 2, blocks)).toBe(2);
    expect(resolveBookmarkIndex(kept(2), 3, blocks)).toBeUndefined();
  });

  it('follows its passage when blocks move, and refuses a block whose words changed', () => {
    const bookmark = kept(1);
    // A block inserted before it: the passage is found by identity at its new place.
    expect(resolveBookmarkIndex(bookmark, 2, [{ id: 'c2-p0', text: 'The bells were silent.' }, ...blocks])).toBe(2);
    // The same identity now holds different words: never the saved passage.
    const rewritten = blocks.map(block => block.id === 'c2-p2' ? { ...block, text: '"Name yourself," he said.' } : block);
    expect(resolveBookmarkIndex(bookmark, 2, rewritten)).toBeUndefined();
    // Gone entirely.
    expect(resolveBookmarkIndex(bookmark, 2, blocks.filter(block => block.id !== 'c2-p2'))).toBeUndefined();
    expect(mapBookmarksToBlocks([bookmark, kept(0)], 2, rewritten)).toEqual(new Map([[0, kept(0)]]));
  });

  it('finds an older excerpt-only bookmark on its passage, and never guesses between copies', () => {
    const legacy: Bookmark = { id: 'old', chapterNumber: 2, paragraphIndex: 0, paragraphExcerpt: 'Mara gave him the only…', createdAt: 'then' };
    // Its saved position now holds another passage; the excerpt still finds the right one.
    expect(resolveBookmarkIndex(legacy, 2, blocks)).toBe(2);
    expect(resolveBookmarkIndex({ ...legacy, paragraphExcerpt: 'Mara gave him the only...' }, 2, blocks)).toBe(2);
    expect(resolveBookmarkIndex(legacy, 2, [...blocks, { id: 'c2-p4', text: 'Mara gave him the only coin she had.' }])).toBeUndefined();
    expect(bookmarkPassageText(legacy)).toBe('Mara gave him the only');
  });

  it('works for chapters without block identities by exact text', () => {
    const plain = blocks.map(({ text }) => ({ text }));
    const bookmark = createAnchoredBookmark({ id: 'p', chapterNumber: 2, index: 1, block: plain[1], note: '', createdAt: 'now' });
    expect(bookmark).not.toHaveProperty('blockId');
    expect(resolveBookmarkIndex(bookmark, 2, plain)).toBe(1);
    expect(resolveBookmarkIndex(bookmark, 2, [{ text: 'Inserted.' }, ...plain])).toBe(2);
  });
});
