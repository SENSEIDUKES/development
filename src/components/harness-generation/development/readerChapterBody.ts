import type { ComponentType, RefObject } from 'react';
import type { TextHighlightBlock } from '@seihouse/sen/text-highlight-engine';
import type { ResolvedReaderText } from '@seihouse/sen/reader-runtime';
import type { HarnessWorkspaceState } from '../../../narrative/generation';
import type { NarrationHighlight } from './useFollowNarration';

/** One saved chapter of a HARNESS story, as the Reader shows it. */
export type ReaderChapter = HarnessWorkspaceState['chapters'][number];

/**
 * What the Reader's frame hands the chapter body: the one chapter on screen.
 *
 * The frame (top bar, chapter navigation, Listen, Reader Settings, the Fate,
 * Holdings and arc pages, the writing screen) is the same for every body. The
 * body decides only how the chapter looks: prose today (`ProseChapterBody`),
 * sequential art later. Whatever it draws, it keeps three marks the frame
 * reads, so Listen's starting point, its follow-along and Holdings' passage
 * links work for every body:
 *
 * - its root element, given `articleRef`, carries `data-chapter-number`;
 * - the chapter title carries `data-read-aloud-title`;
 * - each passage carries `data-sen-text-block="<block id>"` (a panel marks the
 *   passage it shows).
 */
export interface ReaderChapterBodyProps {
  chapter: ReaderChapter;
  /** The chapter's passages, under the ids its Sound Cues, speakers and Holdings use. */
  blocks: readonly TextHighlightBlock[];
  /** The story's language, for the passage's `lang`. */
  locale?: string;
  /** The body's root element. */
  articleRef: RefObject<HTMLElement | null>;
  /** What Listen is reading now: a sentence of a passage, or the title. */
  highlight?: NarrationHighlight;
  /** Listen is playing or paused. */
  reading: boolean;
  /** The reader's text settings, from Reader Settings → Text. */
  text: ResolvedReaderText;
}

/** A way of showing a chapter inside the Reader's frame. */
export type ReaderChapterBody = ComponentType<ReaderChapterBodyProps>;
