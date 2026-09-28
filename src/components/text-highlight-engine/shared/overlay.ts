import type { PassageSelection } from './selection';

/** One tinted range drawn over the prose, e.g. every placed Sound Cue in a Cues overlay. */
export interface OverlayMark {
  id: string;
  selection: PassageSelection;
  /** Any CSS color; keep it translucent so the words stay readable. */
  tone: string;
  /** A short tag shown above the range's first line. */
  label?: string;
}

/** One numbered chip at a text position, e.g. a paragraph's P2 or a sentence's S8. */
export interface OverlayPin {
  id: string;
  blockId: string;
  /** UTF-16 offset into the block text where the chip sits. */
  offset: number;
  label: string;
  /** `above` sits over the line (paragraph numbers); `raised` sits at the character like a superscript. */
  placement: 'above' | 'raised';
}

/**
 * What a host wants drawn over its prose. The engine never interprets marks
 * or pins; it only places them on the words they point at.
 */
export interface TextHighlightOverlay {
  marks?: readonly OverlayMark[];
  pins?: readonly OverlayPin[];
}
