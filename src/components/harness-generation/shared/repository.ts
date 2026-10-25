import { cloneHarnessValue } from './ids';
import { HARNESS_GENERATION_SCHEMA_VERSION, type HarnessWorkspaceState } from '../../../narrative/generation';
import { WORLD_CARD_KINDS, worldCardKey } from '../../../narrative/worldRecord';

export const createEmptyHarnessWorkspaceState = (): HarnessWorkspaceState => ({
  schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION,
  stories: [],
  foundations: [],
  attempts: [],
  chapters: [],
  events: [],
  capabilityReceipts: [],
  canonicalRecords: [],
  projections: [],
  corrections: [],
  batches: [],
  arcPlanOperations: [],
  codexEntries: [],
  worldCards: [],
});

export interface HarnessGenerationRepository {
  load(): Promise<HarnessWorkspaceState>;
  save(state: HarnessWorkspaceState): Promise<void>;
}

export const isCurrentHarnessWorkspaceState = (value: unknown): value is HarnessWorkspaceState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<HarnessWorkspaceState> & { schemaVersion?: number };
  return candidate.schemaVersion === HARNESS_GENERATION_SCHEMA_VERSION
    && Array.isArray(candidate.stories)
    && Array.isArray(candidate.foundations)
    && Array.isArray(candidate.attempts)
    && Array.isArray(candidate.chapters)
    && Array.isArray(candidate.events)
    && Array.isArray(candidate.capabilityReceipts)
    && Array.isArray(candidate.canonicalRecords)
    && Array.isArray(candidate.projections)
    && Array.isArray(candidate.corrections)
    && Array.isArray(candidate.batches)
    && Array.isArray(candidate.arcPlanOperations)
    && Array.isArray(candidate.codexEntries)
    && Array.isArray(candidate.worldCards);
};

const hasWorkspaceShape = (value: unknown): value is Record<string, unknown> & { schemaVersion?: unknown } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return ['stories', 'foundations', 'attempts', 'chapters', 'events', 'capabilityReceipts', 'canonicalRecords',
    'projections', 'corrections', 'batches', 'arcPlanOperations'].every(field => Array.isArray(candidate[field]));
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
};

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
