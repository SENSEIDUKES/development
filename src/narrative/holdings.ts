/**
 * Holdings: what each character has, uses, knows and is.
 *
 * Each chapter's plan says what changes (SENSEI, 2026-10-20: the chapter
 * loop): a holding fact of one of its events (`gains`, `loses`, `learns`…),
 * and what someone new already had before the chapter (`alreadyHas`). What a
 * character holds right now is never stored: it is worked out again, in story
 * order, from every chapter's plan, so reading or re-reading a chapter can
 * never count anything twice, and a rewritten chapter changes the result.
 *
 * Four facts, kept apart: a thing a character has (possession) and whether it
 * is in use (equipment); an ability they are learning or have learned, and how
 * well (mastery). Putting a sword away keeps it owned; sealing an ability keeps
 * it known. Whether an ability can be used is worked out: learned and not sealed.
 */

/** The kinds of Codex entry the plans name. */
export type CodexEntryKind = 'character' | 'thing' | 'ability';

/**
 * A Codex entry: one person, thing or ability the story knows, with one
 * permanent ID the app assigns, never a model. Names resolve to it exactly
 * (letter case, accents and punctuation aside), by its name or an alias. Its
 * look, who it is, its gender and age are worked out from the plans that cast
 * it, never kept here, so a rewritten chapter changes them too.
 */
export interface CodexEntry {
  id: string;
  storyId: string;
  kind: CodexEntryKind;
  /** How the story writes it. */
  name: string;
  /** Other names that resolve to it, such as a declared character's aliases. */
  aliases?: string[];
  /** The story's main character: the one `MC` names in a plan. */
  mainCharacter?: true;
  /** Where it came from: a character the Foundation declares, or the plan of the chapter that first named it. */
  origin: { source: 'foundation' } | { source: 'plan'; chapterId: string; chapterNumber: number };
  createdAt: string;
  /**
   * The voice it speaks in (SENSEI, 2026-10-18): a key of the SEIHouse voice
   * cast (`src/audio/voiceCast.ts`), never a provider's id, so any speech
   * engine can voice it. Given by code when a character first speaks; the
   * reader can change it on its Codex card.
   */
  voice?: CodexEntryVoice;
}

/** A character's voice: a SEIHouse cast key, and who chose it. */
export interface CodexEntryVoice {
  key: string;
  chosen: 'auto' | 'reader';
  at: string;
}

/**
 * What a holding change does, as the record keeps it: `has` and `knows` are
 * what someone already had before the chapter that first shows them, never a
 * gain; the rest are a plan's holding changes.
 */
export type HoldingVerb = 'has' | 'gained' | 'lost' | 'equipped' | 'unequipped' | 'knows' | 'learning' | 'learned' | 'improved' | 'sealed' | 'unsealed' | 'rank';

/** The checks the holdings rules run, by kind: what each flag says cannot be true. */
export type HoldingFlagKind =
  /** Equipping, putting away or losing something the record does not show them holding. */
  | 'not-held'
  /** Gaining again, without a count, something they already hold. */
  | 'already-held'
  /** A count the record cannot match: an earlier possession that disagrees, or losing more than they hold. */
  | 'count-mismatch'
  /** Improving or sealing an ability they have not learned. */
  | 'not-learned'
  /** Starting to learn, or learning, an ability they already know. */
  | 'already-learned'
  /** A known ability's level that disagrees with the record. */
  | 'level-differs'
  /** Improving a sealed ability, or unsealing one that is not sealed. */
  | 'sealed-state'
  /** Two entries of one kind whose names are close enough to be the same. */
  | 'possible-duplicate';
