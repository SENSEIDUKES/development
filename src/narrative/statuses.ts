import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/highlight-engine/shared/manuscript';
import type { HoldingRef } from './holdings';

/**
 * Status: where the page begins or ends a condition (SENSEI, 2026-10-31, Stage
 * E1 step 2; a beginning or an end since 2026-11-11).
 *
 * The tagger tags the sentence where the prose shows a lasting condition begin
 * (`[[status: Elder Qin | dead]]`) and the sentence where it shows one end
 * (`[[status: MC | poisoned | ended]]`); the HARNESS saves each tag as a status
 * on that sentence, the same way it saves an appearance. What a character
 * carries now is never stored: it is their card's conditions and the ones the
 * page began, less the ones the page ended, worked out again from every
 * chapter (`deriveConditions`), so a rewritten chapter changes it.
 */

/** The attachment kind of a status. */
export const STATUS_KIND = 'status';

export interface StatusPayload {
  /** Who placed it: the HARNESS from a tag, or a person. */
  origin: 'harness' | 'manual';
  /** Who: as the tag wrote it, and the Codex entry it resolved to when its chapter committed. */
  subject: HoldingRef;
  /** The condition, in the tag's few words: "dead", "badly wounded", "sealed in the stone". */
  status: string;
  /** The prose ends this condition here. Absent: the prose begins it here. */
  ended?: true;
}

/** Where a status sits: the sentence its tag points at, as an exact span of its paragraph. */
export type StatusAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

/** One status: a manuscript span attachment on the sentence that shows it. */
export interface StatusAttachment extends ManuscriptAttachment<StatusPayload> {
  kind: typeof STATUS_KIND;
  anchor: StatusAnchor;
}

/** A status's id: its sentence, and its place among the chapter's statuses. */
export const statusId = (blockId: string, start: number, end: number, index: number) => `status:${blockId}:${start}-${end}:${index}`;
