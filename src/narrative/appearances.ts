import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/highlight-engine/shared/manuscript';
import type { HoldingRef } from './holdings';
import type { AppearanceTagWord } from './marks';

/**
 * Appearances: who and what is on the page, and how each looks.
 *
 * The writer tags the moment a character or thing first steps onto the page
 * (`[[appears: Lin Feng | character]]`) and each change to a look
 * (`[[look: Lin Feng | a scar across his left cheek]]`); the HARNESS saves each
 * tag as an appearance on the sentence it points at. A small step after the
 * chapter is saved reads those sentences and writes each look down
 * (`ChapterLooks`). Who has appeared and how each looks now is never stored:
 * it is worked out again, in story order, from every chapter's current
 * appearances and looks, so a rewritten chapter changes the result.
 *
 * The look is medium-neutral: what someone or something looks like, never how
 * to show it (no camera, framing, pose, lighting or art style). Places come
 * with the Place tag; factions are never given a look.
 */

/** What an appearance names: a character (a person or a named creature) or a thing. */
export type AppearanceEntity = 'character' | 'thing';

/** The attachment kind of an appearance. */
export const APPEARANCE_KIND = 'appearance';

/** An appearance's event is its tag word: on the page (`appears`), or a changed look (`look`). */
export type AppearanceEvent = AppearanceTagWord;

export interface AppearancePayload {
  /** Who placed it: the HARNESS from a writer's tag, or a person. */
  origin: 'harness' | 'manual';
  event: AppearanceEvent;
  /** Who or what: as the writer wrote it, and the Codex entry it resolved to when its chapter committed. */
  subject: HoldingRef;
  /** What kind of entry the subject is: written on an appears tag, worked out for a look when its chapter commits. */
  entity?: AppearanceEntity;
  /** A look tag's change, in the writer's few words. */
  change?: string;
}

/** Where an appearance sits: the sentence its tag points at, as an exact span of its paragraph. */
export type AppearanceAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

/**
 * One appearance: a manuscript span attachment on the sentence that shows it,
 * so the HARNESS (from a tag) and a person write the same record, and it
 * knows when its words change.
 */
export interface AppearanceAttachment extends ManuscriptAttachment<AppearancePayload> {
  kind: typeof APPEARANCE_KIND;
  anchor: AppearanceAnchor;
}

/** An appearance's id: its sentence, and its place among the chapter's appearances. */
export const appearanceId = (blockId: string, start: number, end: number, index: number) => `appearance:${blockId}:${start}-${end}:${index}`;

/** The traits a character's look is told by. Each is a few words in the story's own language; any may be unknown. */
export const CHARACTER_LOOK_TRAITS = ['build', 'face', 'eyes', 'hair', 'skin', 'clothing', 'marks', 'gear'] as const;
/** The traits a thing's look is told by. */
export const THING_LOOK_TRAITS = ['form', 'size', 'material', 'colour', 'condition', 'marks'] as const;
export type LookTrait = (typeof CHARACTER_LOOK_TRAITS)[number] | (typeof THING_LOOK_TRAITS)[number];

/** One look, as written down from the passages that show it: what an artist needs to draw it. */
export interface Look {
  /** One line, the first thing an artist needs. */
  summary: string;
  /** Only the traits the passages (or the author's declared look) state, by trait. */
  traits: Partial<Record<LookTrait, string>>;
}

/** The look written down for one appearance of a chapter. */
export interface DescribedLook extends Look {
  /** The appearance it describes (`AppearanceAttachment.id`). */
  appearanceId: string;
  /** Where the passage contradicts the look the story's author declared, in one short sentence. */
  conflict?: string;
}

/**
 * What the look step after commit wrote for one chapter: each appearance's
 * look, read from its passage. Kept on the chapter, in its export, so a test
 * shows what was read and written.
 */
export interface ChapterLooks {
  status: 'described' | 'failed';
  /** When it was written. */
  at: string;
  /** The model that wrote it. */
  model?: string;
  looks: DescribedLook[];
  /** Why it failed, in plain words. Nothing was written, and the chapter stands as it is. */
  problem?: string;
}

/** The checks the appearance rules run, by kind: what each flag says cannot be true. */
export type AppearanceFlagKind =
  /** An appears tag for someone or something already on the record's page. */
  | 'already-appeared'
  /** A look tag for someone or something that has not appeared. */
  | 'look-unseen'
  /** Someone speaks in a chapter written with the Appearance skill before any tag shows them appearing. */
  | 'speaks-unseen'
  /** An appears tag whose kind is neither character nor thing. */
  | 'unknown-kind';

/** One character or thing the writer reads as already on the page, with the look the record holds. */
export interface AppearancesSectionEntry {
  name: string;
  entity: AppearanceEntity;
  mainCharacter?: true;
  /** The look's one line, once it is written down. */
  look?: string;
}

/**
 * The Appeared section of the Story Information Packet: every character and
 * thing already on the page, with its look. The main character comes first
 * when they have appeared; then the characters, then the things, those seen
 * most recently first.
 */
export interface AppearancesSection {
  entries: AppearancesSectionEntry[];
}
