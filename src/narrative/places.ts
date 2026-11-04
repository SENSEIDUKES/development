import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/highlight-engine/shared/manuscript';
import type { HoldingRef } from './holdings';

/**
 * Place: where a character is now (SENSEI, 2026-11-04, Stage E1 step 3).
 *
 * The tagger tags the sentence where a character arrives somewhere
 * (`[[place: Shen Yuan | Summit Hall]]`); the HARNESS saves each tag on that
 * sentence, the same way it saves a status. Where a character is now is never
 * stored: it is the latest place tag in story order, worked out again from
 * every chapter, so a rewritten chapter changes it. The place itself is a
 * Codex entry of its own, reached by the world's place cards by name, and
 * steps onto the page with the appearance tag (`[[appears: Summit Hall |
 * place]]`), or with the first place tag that names it. Where a scene is
 * belongs to the Scene tag.
 */

/** The attachment kind of a place tag. */
export const PLACE_KIND = 'place';

export interface PlacePayload {
  /** Who placed it: the HARNESS from a tag, or a person. */
  origin: 'harness' | 'manual';
  /** Who: as the tag wrote it, and the Codex entry it resolved to when its chapter committed. */
  subject: HoldingRef;
  /** Where they are now: as the tag wrote it, and the place's Codex entry. */
  place: HoldingRef;
}

/** Where a place tag sits: the sentence its tag points at, as an exact span of its paragraph. */
export type PlaceAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

/** One place tag: a manuscript span attachment on the sentence where a character arrives. */
export interface PlaceAttachment extends ManuscriptAttachment<PlacePayload> {
  kind: typeof PLACE_KIND;
  anchor: PlaceAnchor;
}

/** A place tag's id: its sentence, and its place among the chapter's place tags. */
export const placeId = (blockId: string, start: number, end: number, index: number) => `place:${blockId}:${start}-${end}:${index}`;
