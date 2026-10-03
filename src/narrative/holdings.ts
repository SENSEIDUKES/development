import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/text-highlight-engine/shared/manuscript';
import type { TagWord } from './marks';

/**
 * Holdings: what each character has, uses, knows and is.
 *
 * The writer tags every change where the story makes it
 * (`[[gained: MC | Rusted Iron Sword]]`); the HARNESS saves each tag as a
 * holding change on the sentence it points at. What a character holds right
 * now is never stored: it is worked out again, in story order, from the
 * changes saved on each chapter's current version, so reading or re-reading
 * a chapter can never count anything twice, and a changed chapter changes the
 * result. Tags say what happened; the saved changes tell the next chapter what
 * remains true.
 *
 * Four facts, kept apart: a thing a character has (possession) and whether it
 * is in use (equipment); an ability they are learning or have learned, and how
 * well (mastery). Putting a sword away keeps it owned; sealing an ability keeps
 * it known. Whether an ability can be used is worked out: learned and not sealed.
 */

/** The kinds of Codex entry holdings name. */
export type CodexEntryKind = 'character' | 'thing' | 'ability';

/**
 * A Codex entry: one person, thing or ability the story knows, with one
 * permanent ID the app assigns, never the writer. Names resolve to it exactly
 * (letter case, accents and punctuation aside), by its name or an alias.
 */
export interface CodexEntry {
  id: string;
  storyId: string;
  kind: CodexEntryKind;
  /** How the story writes it. */
  name: string;
  /** Other names that resolve to it, such as a declared character's aliases. */
  aliases?: string[];
  /** The story's main character: the one `MC` names in a tag. */
  mainCharacter?: true;
  /** Where it came from: a character the Foundation declares, or the first tag that named it. */
  origin: { source: 'foundation' } | { source: 'tag'; chapterId: string; chapterNumber: number };
  createdAt: string;
}

/** The attachment kind of a holding change. */
export const HOLDING_CHANGE_KIND = 'holding-change';

/** A holding change's verb is its tag word. */
export type HoldingVerb = TagWord;

/** Who or what a change names: as the writer wrote it, and the Codex entry it resolved to when its chapter committed. */
export interface HoldingRef {
  name: string;
  entryId?: string;
}

export interface HoldingChangePayload {
  /** Who placed it: the HARNESS from a writer's tag, or a person. */
  origin: 'harness' | 'manual';
  verb: HoldingVerb;
  /** The character whose holdings change. */
  holder: HoldingRef;
  /** The thing or ability. A rank change has none. */
  target?: HoldingRef;
  /** How many of a counted thing ("3" pills). Absent: one when gained, all when lost. */
  count?: number;
  /** A level in the story's own words (knows, learned, improved), or the new rank (rank). */
  level?: string;
  /** How or why, in the writer's words: used up, broken, given away, bought. */
  reason?: string;
}

/** Where a holding change sits: the sentence its tag points at, as an exact span of its paragraph. */
export type HoldingChangeAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

/**
 * One holding change: a manuscript span attachment on the sentence that shows
 * it, so the HARNESS (from a tag), a person, or later a familiar all write the
 * same record, and it knows when its words change.
 */
export interface HoldingChangeAttachment extends ManuscriptAttachment<HoldingChangePayload> {
  kind: typeof HOLDING_CHANGE_KIND;
  anchor: HoldingChangeAnchor;
}

/** A change's id: its sentence, and its place among the chapter's changes (one sentence can hold several). */
export const holdingChangeId = (blockId: string, start: number, end: number, index: number) => `holding:${blockId}:${start}-${end}:${index}`;

/** One character's holdings as the writer reads them: exact names, in a few short lists. */
export interface HoldingsSectionCharacter {
  name: string;
  mainCharacter?: true;
  rank?: string;
  /** Things in use: in hand, worn, active. */
  inHand?: string[];
  /** Things held but not in use, with a count when more than one. */
  carries?: string[];
  /** Learned abilities, with their level and whether they are sealed. */
  knows?: string[];
  learning?: string[];
}

/**
 * The Holdings section of the Story Information Packet: what each character
 * has right now. The main character always comes first, even with nothing
 * recorded yet; then the characters whose holdings changed most recently.
 */
export interface HoldingsSection {
  characters: HoldingsSectionCharacter[];
}
