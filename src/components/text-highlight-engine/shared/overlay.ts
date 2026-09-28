import type { PassageSelection } from './selection';

/** One tinted range drawn behind the prose, e.g. every placed Sound Cue in a Cues overlay. */
export interface OverlayMark {
  id: string;
  selection: PassageSelection;
  /** Any CSS color; keep it translucent so the words stay readable. */
  tone: string;
}

/** One quiet number beside the words, never on them: a paragraph's ¶2 or a sentence's 8. */
export interface OverlayPin {
  id: string;
  blockId: string;
  /** UTF-16 offset into the block text of the character the number belongs to. */
  offset: number;
  label: string;
  /**
   * `margin` sits in the start margin, level with the line holding `offset`
   * (paragraph numbers); `raised` sits in the line spacing just above that
   * character, like a verse number (sentence numbers).
   */
  placement: 'margin' | 'raised';
}

/**
 * What a host wants drawn with its prose. The engine never interprets marks
 * or pins; it only places them by the words they point at.
 */
export interface TextHighlightOverlay {
  marks?: readonly OverlayMark[];
  pins?: readonly OverlayPin[];
}
