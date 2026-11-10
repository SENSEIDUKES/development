import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/highlight-engine/shared/manuscript';
import type { HoldingRef } from './holdings';

/**
 * Ties: how two characters stand with each other now (SENSEI, 2026-11-08,
 * Stage E1 step 5: allied, hostile, related, bound).
 *
 * The tagger tags the sentence where a tie forms or changes
 * (`[[tie: Lin Qingshan | Ning Hao | sworn enemies]]`); the HARNESS saves each
 * tag on that sentence, the same way it saves a status. A tie belongs to the
 * pair, whichever of the two the tag names first, and how they stand now is
 * never stored: it is the pair's latest tie tag in story order, worked out
 * again from every chapter, so a rewritten chapter changes it. The second
 * name may be a thing as well as a character, for a being bound to an object
 * (a sword's spirit and its sword are two entries, joined by a tie). The ties
 * a story opens with are its world cards' own; a tag records each change.
 */

/** The attachment kind of a tie tag. */
export const TIE_KIND = 'tie';

export interface TiePayload {
  /** Who placed it: the HARNESS from a tag, or a person. */
  origin: 'harness' | 'manual';
  /** The first of the two: as the tag wrote it, and the Codex entry it resolved to when its chapter committed. */
  subject: HoldingRef;
  /** The second of the two, a character or a thing: as the tag wrote it, and its Codex entry. */
  other: HoldingRef;
  /** How they stand now, in the tag's few words: "sworn enemies", "master and disciple", "betrothed". */
  tie: string;
}

/** Where a tie tag sits: the sentence its tag points at, as an exact span of its paragraph. */
export type TieAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

/** One tie tag: a manuscript span attachment on the sentence where a tie forms or changes. */
export interface TieAttachment extends ManuscriptAttachment<TiePayload> {
  kind: typeof TIE_KIND;
  anchor: TieAnchor;
}

/** A tie tag's id: its sentence, and its place among the chapter's tie tags. */
export const tieId = (blockId: string, start: number, end: number, index: number) => `tie:${blockId}:${start}-${end}:${index}`;
