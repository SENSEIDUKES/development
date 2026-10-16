import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/highlight-engine/shared/manuscript';
import type { HoldingRef } from './holdings';

/**
 * Status: how someone or something now is.
 *
 * The writer tags the moment a character's or thing's state changes
 * (`[[status: Zhao Wuchen | dead]]`, `[[status: MC | wounded | a spear through
 * his side]]`, `[[status: Crimson Broadsword | destroyed]]`); the HARNESS saves
 * each tag as a status change on the sentence it points at. How each is now is
 * never stored: it is worked out again, in story order, from every chapter's
 * current status changes, so a rewritten chapter changes the result, and a
 * dead character stays dead because the record says so.
 *
 * States come from one short list, so plain rules can check them: a
 * character is wounded or recovered, dead or revived, sealed away, captured,
 * freed, or transformed; a thing is damaged, repaired or destroyed, sealed,
 * freed or transformed. Places and factions get their status with their own
 * tags.
 */

/** The states a character can change to. */
export const CHARACTER_STATES = ['wounded', 'recovered', 'dead', 'revived', 'sealed', 'captured', 'freed', 'transformed'] as const;
/** The states a thing can change to. */
export const THING_STATES = ['damaged', 'repaired', 'destroyed', 'sealed', 'freed', 'transformed'] as const;
export type StatusState = (typeof CHARACTER_STATES)[number] | (typeof THING_STATES)[number];

/**
 * What a state leaves someone or something in until another changes it. The
 * rest only end one (`recovered` ends `wounded`, `revived` ends `dead`,
 * `freed` ends `sealed` and `captured`, `repaired` ends `damaged`).
 */
export const LASTING_STATES = ['dead', 'wounded', 'sealed', 'captured', 'transformed', 'damaged', 'destroyed'] as const;
export type LastingState = (typeof LASTING_STATES)[number];

/** The attachment kind of a status change. */
export const STATUS_CHANGE_KIND = 'status-change';

export interface StatusChangePayload {
  /** Who placed it: the HARNESS from a writer's tag, or a person. */
  origin: 'harness' | 'manual';
  /** Who or what: as the writer wrote it, and the Codex entry it resolved to when its chapter committed. */
  subject: HoldingRef;
  state: StatusState;
  /** How, in the writer's few words (`a spear through his side`), when it gave them. */
  detail?: string;
  /** What kind of entry the subject resolved to when its chapter committed. */
  entity?: 'character' | 'thing';
}

/** Where a status change sits: the sentence its tag points at, as an exact span of its paragraph. */
export type StatusChangeAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

/**
 * One status change: a manuscript span attachment on the sentence that shows
 * it, so the HARNESS (from a tag) and a person write the same record, and it
 * knows when its words change.
 */
export interface StatusChangeAttachment extends ManuscriptAttachment<StatusChangePayload> {
  kind: typeof STATUS_CHANGE_KIND;
  anchor: StatusChangeAnchor;
}

/** A status change's id: its sentence, and its place among the chapter's status changes. */
export const statusChangeId = (blockId: string, start: number, end: number, index: number) => `status:${blockId}:${start}-${end}:${index}`;

/** The checks the status rules run, by kind: what each flag says cannot be true. */
export type StatusFlagKind =
  /** A state that only a character can be in given to a thing, or the other way round. */
  | 'wrong-kind'
  /** A state someone or something is already in (dead twice, sealed twice). */
  | 'status-repeated'
  /** A state that ends another that never began (recovered without a wound, revived without a death, freed without a seal or capture). */
  | 'status-without-cause'
  /** A dead character speaks, acts, holds or changes, without being revived first. */
  | 'after-death'
  /** A destroyed thing is held, used or changed again. */
  | 'after-destroyed'
  /** A status tag that names no one the record can find: a faction, or a name it cannot place. */
  | 'status-unknown';

/** One lasting state, as the writer reads it: what, how, and since which chapter. */
export interface StatusSectionState {
  state: LastingState;
  detail?: string;
  since: number;
}

/** One character or thing the writer reads as not as they were: every lasting state they are in now. */
export interface StatusSectionEntry {
  name: string;
  entity: 'character' | 'thing';
  mainCharacter?: true;
  states: StatusSectionState[];
}

/**
 * The Status section of the Story Information Packet: every character and
 * thing whose state has changed and not changed back (dead, wounded, sealed
 * away, destroyed). The main character comes first; then the most recently
 * changed. Someone well and whole is not listed.
 */
export interface StatusSection {
  entries: StatusSectionEntry[];
}
