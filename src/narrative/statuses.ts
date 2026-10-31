import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/highlight-engine/shared/manuscript';
import type { HoldingRef } from './holdings';

/**
 * Status: how a character is now (SENSEI, 2026-10-31, Stage E1 step 2).
 *
 * The tagger tags the sentence where the prose shows a character's condition
 * change (`[[status: Elder Qin | dead]]`); the HARNESS saves each tag as a
 * status on that sentence, the same way it saves an appearance. A character's
 * status now is never stored: it is the latest status tag in story order,
 * worked out again from every chapter, so a rewritten chapter changes it.
 * Someone with no status tag is simply as the story first showed them.
 */

/** The attachment kind of a status. */
export const STATUS_KIND = 'status';

export interface StatusPayload {
  /** Who placed it: the HARNESS from a tag, or a person. */
  origin: 'harness' | 'manual';
  /** Who: as the tag wrote it, and the Codex entry it resolved to when its chapter committed. */
  subject: HoldingRef;
  /** How they are now, in the tag's few words: "dead", "badly wounded", "sealed in the stone". */
  status: string;
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
