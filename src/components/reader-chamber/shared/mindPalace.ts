import type { Bookmark } from '../../../narrative/story';

/**
 * Mind Palace: passages the reader chooses to keep from the story itself.
 * Each saved passage is a Reader bookmark anchored to the chapter's stable
 * block identity and the exact canonical text it held when saved, so it can
 * never silently point at a different passage after the chapter changes.
 * Reader state only: never story canon and never sent to the writer.
 */

/** A readable block: its stable identity (when the chapter has one) and its canonical text. */
export interface MindPalaceBlock {
  id?: string;
  text: string;
}

const EXCERPT_ELLIPSIS = /(?:\.\.\.|…)+\s*$/;

/** Whitespace-, case- and quote-insensitive form used to compare passages. */
export const normalizePassage = (text: string) => text
  .replace(/[“”„«»]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

/** Bookmarks saved before anchoring carried only a truncated excerpt ending in an ellipsis. */
const excerptStem = (bookmark: Bookmark) => normalizePassage((bookmark.paragraphExcerpt ?? '').replace(EXCERPT_ELLIPSIS, ''));

/**
 * The block index a bookmark belongs to in this chapter's blocks, or
 * undefined when the passage it was saved from is no longer there.
 *
 * Anchored bookmarks match by block identity and exact passage text; a block
 * whose text changed is not the saved passage. Bookmarks saved before
 * anchoring match by their excerpt: at their saved position first, then
 * anywhere in the chapter when exactly one block begins with it.
 */
export function resolveBookmarkIndex(bookmark: Bookmark, chapterNumber: number, blocks: readonly MindPalaceBlock[]): number | undefined {
  if (bookmark.chapterNumber !== chapterNumber) return undefined;
  if (bookmark.passage !== undefined) {
    const passage = normalizePassage(bookmark.passage);
    const byId = bookmark.blockId ? blocks.findIndex(block => block.id === bookmark.blockId) : -1;
    if (byId >= 0) return normalizePassage(blocks[byId].text) === passage ? byId : undefined;
    // A chapter without stable block identities: the exact passage at its saved place, or its only copy.
    if (!bookmark.blockId && normalizePassage(blocks[bookmark.paragraphIndex]?.text ?? '') === passage) return bookmark.paragraphIndex;
    const copies = blocks.flatMap((block, index) => normalizePassage(block.text) === passage ? [index] : []);
    return copies.length === 1 ? copies[0] : undefined;
  }
  const stem = excerptStem(bookmark);
  if (!stem) return undefined;
  const startsWithStem = (block?: MindPalaceBlock) => Boolean(block) && normalizePassage(block!.text).startsWith(stem);
  if (startsWithStem(blocks[bookmark.paragraphIndex])) return bookmark.paragraphIndex;
  const matches = blocks.flatMap((block, index) => startsWithStem(block) ? [index] : []);
  return matches.length === 1 ? matches[0] : undefined;
}

/** This chapter's bookmarks by the block they resolve to; unplaced bookmarks are left out. */
export function mapBookmarksToBlocks(bookmarks: readonly Bookmark[] | undefined, chapterNumber: number, blocks: readonly MindPalaceBlock[]): Map<number, Bookmark> {
  const map = new Map<number, Bookmark>();
  for (const bookmark of bookmarks ?? []) {
    const index = resolveBookmarkIndex(bookmark, chapterNumber, blocks);
    if (index !== undefined && !map.has(index)) map.set(index, bookmark);
  }
  return map;
}

/** A new Mind Palace entry for one block, anchored to its identity and exact canonical text. */
export function createAnchoredBookmark(input: {
  id: string;
  chapterNumber: number;
  index: number;
  block: MindPalaceBlock;
  note: string;
  createdAt: string;
}): Bookmark {
  const passage = input.block.text.trim();
  return {
    id: input.id,
    chapterNumber: input.chapterNumber,
    paragraphIndex: input.index,
    ...(input.block.id ? { blockId: input.block.id } : {}),
    passage,
    paragraphExcerpt: passage.length > 150 ? `${passage.slice(0, 150)}…` : passage,
    ...(input.note.trim() ? { note: input.note.trim() } : {}),
    createdAt: input.createdAt,
  };
}

/** The saved words to show for an entry: the full passage when kept, otherwise the old excerpt. */
export const bookmarkPassageText = (bookmark: Bookmark) =>
  bookmark.passage ?? (bookmark.paragraphExcerpt ?? '').replace(EXCERPT_ELLIPSIS, '').trim();
