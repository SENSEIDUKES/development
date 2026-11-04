import type { PassageSelection } from './selection';

/** One tinted range drawn behind the prose, e.g. every placed Sound Cue in an Audio overlay. */
export interface OverlayMark {
  id: string;
  selection: PassageSelection;
  /** Any CSS color; keep it translucent so the words stay readable. */
  tone: string;
  /**
   * The range needs a decision (e.g. a cue whose words changed): it keeps its
   * tone and gains a dashed underline in `--sen-overlay-attention` (amber).
   */
  attention?: boolean;
  /**
   * How the range is drawn: `fill` (the default) tints behind the words, like
   * a highlighter; `underline` draws a line in the tone under them, quieter, so
   * two families of marks read apart on one page. (A third, colored words, is
   * planned.)
   */
  style?: OverlayMarkStyle;
}

export type OverlayMarkStyle = 'fill' | 'underline';

/**
 * A tone at full strength for a line: a tint is kept translucent so words stay
 * readable over it, but a 2px line that faint disappears. An rgba() tone keeps
 * its color and gains opacity; any other color is used as given.
 */
export const lineTone = (tone: string) => tone.replace(/^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)$/, 'rgba($1,$2,$3, .95)');

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
