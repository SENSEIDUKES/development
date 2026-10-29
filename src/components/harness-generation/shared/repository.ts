import { cloneHarnessValue, stableHarnessId } from './ids';
import { SEN_NOVEL_AUTHOR_SKILL } from './authorSkill';
import { HARNESS_GENERATION_SCHEMA_VERSION, type HarnessWorkspaceState } from '../../../narrative/generation';
import { WORLD_CARD_KINDS, worldCardKey } from '../../../narrative/worldRecord';

export const createEmptyHarnessWorkspaceState = (): HarnessWorkspaceState => ({
  schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION,
  revision: 0,
  stories: [],
  foundations: [],
  attempts: [],
  chapters: [],
  canonicalRecords: [],
  corrections: [],
  batches: [],
  arcPlanOperations: [],
  codexEntries: [],
  worldCards: [],
});

export interface HarnessGenerationRepository {
  load(): Promise<HarnessWorkspaceState>;
  /**
   * Saves `state` as the next revision, atomically, only while the stored
   * workspace is still at `state.revision` (the revision it was read at).
   * Otherwise it writes nothing and throws a `HarnessWorkspaceConflictError`:
   * another page saved since, and saving would overwrite what it wrote.
   */
  save(state: HarnessWorkspaceState): Promise<void>;
}

/** What a page is told when it saves from a workspace another page has saved since. */
export const HARNESS_WORKSPACE_CONFLICT_MESSAGE = 'Your stories changed in another tab. Reload to see them.';

/** A save refused because the stored workspace moved on from the revision it was read at. */
export class HarnessWorkspaceConflictError extends Error {
  constructor(message: string = HARNESS_WORKSPACE_CONFLICT_MESSAGE) {
    super(message);
    this.name = 'HarnessWorkspaceConflictError';
  }
}

/**
 * The compare-and-set every repository makes inside its one write: what to
 * store for `state`, given what is stored now (undefined when nothing is). It
 * is `state` as the next revision when the stored workspace is still at the
 * revision `state` was read at; anything else throws, and nothing is written.
 */
export const nextHarnessWorkspaceRevision = (stored: unknown, state: HarnessWorkspaceState): HarnessWorkspaceState => {
  const storedRevision = stored === undefined ? 0 : isCurrentHarnessWorkspaceState(stored) ? stored.revision : undefined;
  if (storedRevision !== state.revision) throw new HarnessWorkspaceConflictError();
  return { ...cloneHarnessValue(state), revision: state.revision + 1 };
};

export const isCurrentHarnessWorkspaceState = (value: unknown): value is HarnessWorkspaceState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<HarnessWorkspaceState> & { schemaVersion?: number };
  return candidate.schemaVersion === HARNESS_GENERATION_SCHEMA_VERSION
    && Number.isInteger(candidate.revision)
    && Array.isArray(candidate.stories)
    && Array.isArray(candidate.foundations)
    && Array.isArray(candidate.attempts)
    && Array.isArray(candidate.chapters)
    && Array.isArray(candidate.canonicalRecords)
    && Array.isArray(candidate.corrections)
    && Array.isArray(candidate.batches)
    && Array.isArray(candidate.arcPlanOperations)
    && Array.isArray(candidate.codexEntries)
    && Array.isArray(candidate.worldCards);
};

const hasWorkspaceShape = (value: unknown): value is Record<string, unknown> & { schemaVersion?: unknown } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return ['stories', 'foundations', 'attempts', 'chapters', 'canonicalRecords',
    'corrections', 'batches', 'arcPlanOperations'].every(field => Array.isArray(candidate[field]));
};

type StoredWorkspace = Record<string, unknown> & { schemaVersion: number };

/**
 * Explicit upgrade steps, keyed by the version they upgrade from. Nothing
 * before schema 27 (arcs of 30 chapters) upgrades, by the product owner's
 * decision: every earlier story was a test story planned in 100-chapter arcs,
 * so that storage is kept untouched and the page starts fresh.
 */
const HARNESS_WORKSPACE_MIGRATIONS: Record<number, (stored: StoredWorkspace) => StoredWorkspace> = {
  // 28 adds only optional fields (a rewrite request and its replaced-by record,
  // a chapter's Holdings fixer record): every saved story reads as it is.
  27: stored => ({ ...stored, schemaVersion: 28 }),
  // 29 adds only optional fields (a chapter's scene, the atmospheres in frozen
  // media, a frozen soundtrack vocabulary): every saved story reads as it is.
  28: stored => ({ ...stored, schemaVersion: 29 }),
  // 30 adds only an optional story field (the creator's Author's notes):
  // every saved story reads as it is.
  29: stored => ({ ...stored, schemaVersion: 30 }),
  // 31 adds only an optional story field (the story's own sound words): every
  // saved story reads as it is and keeps its recordings' words until edited;
  // every chapter keeps the cues it saved and every attempt what it froze.
  30: stored => ({ ...stored, schemaVersion: 31 }),
  // 32 adds only optional chapter fields (its appearances and the looks
  // written down from them): every saved story reads as it is.
  31: stored => ({ ...stored, schemaVersion: 32 }),
  // 34 adds only an optional Foundation field (the world at Chapter 0, which a
  // story made before it simply has none of): every saved story reads as it is.
  // It skips 33, the chapter loop's version, rolled back on 2026-10-22: a
  // workspace that loop saved has no step and is kept untouched instead.
  32: stored => ({ ...stored, schemaVersion: 34 }),
  // 35 adds only an optional packet section (the world at Chapter 0, carried to
  // the writer): every attempt keeps the packet it froze, and a story with no
  // Chapter 0 world simply has no such section.
  34: stored => ({ ...stored, schemaVersion: 35 }),
  // 36 gives every world card the chapter it entered in. Nothing could add a
  // card after Chapter 0 before this version, so every saved card is the world
  // the story opened with, and its key is rewritten with it.
  35: stored => ({ ...upgradeSavedWorldCards(stored), schemaVersion: 36 }),
  // 37 gives the world record a home of its own on the workspace, so a chapter
  // can add a card to it. Every saved story's cards are the ones its author
  // wrote, so the record opens from each story's active Foundation.
  36: stored => ({ ...stored, worldCards: openingWorldCardsOf(stored), schemaVersion: 37 }),
  // 38 drops the semantic-event memory system: the events a writer used to
  // return, the capability receipts and projections made from them, and the
  // saved extraction receipts. Nothing had written to them since chapter state
  // moved to the tags, so a saved story loses nothing it was using. A chapter's
  // `eventIds` and an attempt's preserved events go with them.
  37: ({ events, capabilityReceipts, projections, memoryRecoveries, ...stored }) => ({
    ...stored,
    chapters: (stored.chapters as Array<Record<string, unknown>>).map(({ eventIds, ...chapter }) => chapter),
    attempts: (stored.attempts as Array<Record<string, unknown>>).map(({ preservedEvents, rejectedEvents, eventsPreservedAt, postCommitProcessing, ...attempt }) => ({
      ...attempt,
      // An attempt saved at the stage that no longer exists carries on from the prose.
      ...(attempt.stage === 'events_preserved' ? { stage: 'prose_accepted' } : {}),
      ...(attempt.recoveryStage === 'events_preserved' ? { recoveryStage: 'prose_accepted' } : {}),
      // The chapter's id was settled at the retired stage and is settled when
      // the prose is accepted now. An attempt saved at the prose checkpoint
      // never reached the old stage, so it is carrying none: without one it
      // would tag and then be refused at the commit, with no way to finish.
      ...(attempt.acceptedDraft && !attempt.pendingChapterId
        ? { pendingChapterId: stableHarnessId('hch', String(attempt.id), 'schema-38') }
        : {}),
    })),
    schemaVersion: 38,
  }),
  // 39 takes tagging off the chapter writer: the five tag slots leave the CAPA
  // Schema, so a saved story that somehow equipped one would be refused at
  // every chapter ("not a supported CAPA skill slot"), and the Author skill
  // reaches 1.1.0 with the craft rules that moved out of the HARNESS, so a
  // story still asking for 1.0.0 would be refused as not installed. Frozen
  // prompts are left exactly as they were sent: each is the record of what its
  // own chapter read, tag teaching and all.
  38: stored => ({
    ...stored,
    stories: (stored.stories as Array<Record<string, unknown>>).map(story => {
      const loadout = story.skillLoadout;
      if (!loadout || typeof loadout !== 'object' || Array.isArray(loadout)) return story;
      const kept = Object.fromEntries(Object.entries(loadout as Record<string, unknown>)
        .filter(([slot]) => !RETIRED_TAG_SLOTS.has(slot)));
      const author = kept.author as { id?: unknown; version?: unknown } | undefined;
      return {
        ...story,
        skillLoadout: author?.id === SEN_NOVEL_AUTHOR_SKILL.id && author.version === '1.0.0'
          ? { ...kept, author: { ...author, version: SEN_NOVEL_AUTHOR_SKILL.version } }
          : kept,
      };
    }),
    schemaVersion: 39,
  }),
  // 40 numbers the workspace with its revision, so a save from a page that
  // read an older one is refused. No saved workspace was numbered before, so
  // each starts at 0; its stories, chapters and plans read as they are.
  39: stored => ({ ...stored, revision: 0, schemaVersion: 40 }),
};

/** The CAPA slots that left the schema when the tagger took the tags (schema 39). */
const RETIRED_TAG_SLOTS = new Set(['soundCues', 'soundtrack', 'speakers', 'holdings', 'appearance']);

/**
 * Every saved story's opening cards, as rows of the living record: read from
 * the story's active Foundation revision, which is where the world lived until
 * this version. A story with no world, or whose revision cannot be found, adds
 * nothing; its record simply opens empty, exactly as it reads today.
 */
const openingWorldCardsOf = (stored: StoredWorkspace): unknown[] => {
  const stories = Array.isArray(stored.stories) ? stored.stories : [];
  const foundations = Array.isArray(stored.foundations) ? stored.foundations : [];
  return stories.flatMap(story => {
    if (!story || typeof story !== 'object') return [];
    const { id, activeFoundationRevisionId } = story as { id?: unknown; activeFoundationRevisionId?: unknown };
    if (typeof id !== 'string' || typeof activeFoundationRevisionId !== 'string') return [];
    const revision = foundations.find(candidate => (candidate as { id?: unknown })?.id === activeFoundationRevisionId);
    const cards = ((revision as { input?: { worldAtChapterZero?: { cards?: unknown } } })?.input?.worldAtChapterZero ?? {}).cards;
    if (!Array.isArray(cards)) return [];
    return cards.flatMap(card => (card && typeof card === 'object' && !Array.isArray(card) ? [{ ...card, storyId: id }] : []));
  });
};

/**
 * Brings every world card a saved workspace holds up to the world record,
 * wherever that workspace keeps one: a Foundation revision's input and each
 * attempt's frozen Story Information Packet both carry the record under the
 * same field.
 *
 * Each card enters in Chapter 0, since nothing could add one later before this
 * version, and each key is computed again from the card's own kind and name,
 * because that is the record's standing rule and the key no longer names
 * Chapter 0. A saved key left as it was would not match the one this build
 * computes for the same card, so the Codex and Holdings would read one card as
 * two.
 */
const upgradeSavedWorldCards = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(entry => upgradeSavedWorldCards(entry)) as unknown as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([field, entry]) => {
    if (field !== 'worldAtChapterZero' || !entry || typeof entry !== 'object') return [field, upgradeSavedWorldCards(entry)];
    const cards = (entry as { cards?: unknown }).cards;
    if (!Array.isArray(cards)) return [field, entry];
    return [field, { ...entry, cards: cards.map(card => {
      if (!card || typeof card !== 'object' || Array.isArray(card)) return card;
      const { kind, name } = card as { kind?: unknown; name?: unknown };
      // A card whose kind the schema does not know is dropped when the record
      // is read, so it keeps the key it was saved with.
      const known = WORLD_CARD_KINDS.find(candidate => candidate.id === kind);
      const keyed = known && typeof name === 'string' && name.trim()
        ? { key: worldCardKey(known.id, name.trim()) }
        : {};
      return { ...card, ...keyed, enteredInChapter: 0 };
    }) }];
  })) as unknown as T;
};

/**
 * Upgrades saved storage from an earlier schema version through each explicit
 * step to the current version. Returns undefined when no path exists or the
 * stored value is not a workspace; the caller then preserves it untouched.
 */
export const migrateHarnessWorkspaceState = (value: unknown): HarnessWorkspaceState | undefined => {
  if (!hasWorkspaceShape(value) || typeof value.schemaVersion !== 'number') return undefined;
  let current = cloneHarnessValue(value) as StoredWorkspace;
  while (current.schemaVersion !== HARNESS_GENERATION_SCHEMA_VERSION) {
    const step = HARNESS_WORKSPACE_MIGRATIONS[current.schemaVersion];
    if (!step) return undefined;
    current = step(current);
  }
  return isCurrentHarnessWorkspaceState(current) ? current as unknown as HarnessWorkspaceState : undefined;
};

/**
 * Reads saved Harness Generation storage. Current storage is read as is;
 * storage from an earlier version with an explicit migration is upgraded with
 * every story, chapter and plan kept (schema 27 upgrades; nothing before it
 * does). Anything else (an earlier or unknown version, or an
 * unrecognized shape) cannot be read and yields an empty workspace; hosts keep
 * an untouched copy of it (see the IndexedDB repository) before replacing it.
 * Every structural change to a persisted field must bump
 * `HARNESS_GENERATION_SCHEMA_VERSION` and add its migration step here.
 */
export const readHarnessWorkspaceState = (value: unknown): HarnessWorkspaceState =>
  isCurrentHarnessWorkspaceState(value) ? cloneHarnessValue(value) : migrateHarnessWorkspaceState(value) ?? createEmptyHarnessWorkspaceState();
