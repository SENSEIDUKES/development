import type { Bookmark, ReaderCodexStoryPatch, ReaderPreferences, StoryWorld } from './story';
import type { ReadingAnchor } from '../components/reader-chamber/shared/cinematicScroll/anchors';

/**
 * A reader's own state for one story: where they are, what they marked, and
 * how they like to read. It is never story canon and never Generation Model
 * Call content, so it lives beside the story rather than inside its journal.
 */
export interface ReaderStoryState {
  schemaVersion: typeof READER_STATE_SCHEMA_VERSION;
  storyId: string;
  bookmarks: Bookmark[];
  readerPreferences?: ReaderPreferences;
  readingAnchor?: ReadingAnchor;
  lastReadChapter?: number;
  lastReadAt?: string;
  readingStats?: StoryWorld['readingStats'];
  /** Decorative backdrops picked for Codex reveal cards; presentation only, never approved media. */
  assignedRevealBackdrops?: Record<string, string>;
  readChapters: number[];
  updatedAt: string;
}

/** Host-owned durable storage for Reader state, one record per story. */
export interface ReaderStateRepository {
  load(storyId: string): Promise<ReaderStoryState | undefined>;
  save(state: ReaderStoryState): Promise<void>;
}

export const READER_STATE_SCHEMA_VERSION = 1;

/** The Reader patch fields owned by Reader state rather than by story canon. */
export const READER_STATE_FIELDS = [
  'bookmarks', 'readerPreferences', 'readingAnchor', 'lastReadChapter',
  'lastReadAt', 'lastReadScrollPosition', 'readingStats', 'assignedRevealBackdrops',
] as const satisfies ReadonlyArray<keyof ReaderCodexStoryPatch>;

type ReaderStateField = typeof READER_STATE_FIELDS[number];
export type ReaderStatePatch = Pick<ReaderCodexStoryPatch, ReaderStateField>;

const READER_FIELD_SET = new Set<string>(READER_STATE_FIELDS);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const positiveInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1;

/** Separates Reader-owned fields from the story fields the host must route to canon. */
export function splitReaderStatePatch(patch: ReaderCodexStoryPatch): { reader: ReaderStatePatch; story: ReaderCodexStoryPatch } {
  const reader: Record<string, unknown> = {};
  const story: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) (READER_FIELD_SET.has(key) ? reader : story)[key] = value;
  return { reader: reader as ReaderStatePatch, story: story as ReaderCodexStoryPatch };
}

/**
 * The first Reader state for a story. Values the story already carries (for
 * example bookmarks or settings saved before Reader state existed) seed it,
 * so opening the Reader never drops them.
 */
export function createReaderStoryState(storyId: string, seed: Partial<StoryWorld> = {}, now = new Date().toISOString()): ReaderStoryState {
  return applyReaderStatePatch({
    schemaVersion: READER_STATE_SCHEMA_VERSION, storyId, bookmarks: [], readChapters: [], updatedAt: now,
  }, {
    bookmarks: seed.bookmarks, readerPreferences: seed.readerPreferences, readingAnchor: seed.readingAnchor,
    lastReadChapter: seed.lastReadChapter, lastReadAt: seed.lastReadAt, readingStats: seed.readingStats,
    assignedRevealBackdrops: seed.assignedRevealBackdrops,
  }, now);
}

/** Applies a Reader patch. `undefined` values clear optional fields; raw pixel offsets are never kept. */
export function applyReaderStatePatch(state: ReaderStoryState, patch: ReaderStatePatch, now = new Date().toISOString()): ReaderStoryState {
  const next: ReaderStoryState = { ...state, updatedAt: now };
  if ('bookmarks' in patch) next.bookmarks = Array.isArray(patch.bookmarks) ? structuredClone(patch.bookmarks) : [];
  if ('readerPreferences' in patch) next.readerPreferences = patch.readerPreferences ? structuredClone(patch.readerPreferences) : undefined;
  if ('readingAnchor' in patch) next.readingAnchor = patch.readingAnchor ? structuredClone(patch.readingAnchor) : undefined;
  if ('lastReadChapter' in patch) next.lastReadChapter = positiveInteger(patch.lastReadChapter) ? patch.lastReadChapter : undefined;
  if ('lastReadAt' in patch) next.lastReadAt = typeof patch.lastReadAt === 'string' ? patch.lastReadAt : undefined;
  if ('readingStats' in patch) next.readingStats = patch.readingStats ? structuredClone(patch.readingStats) : undefined;
  if ('assignedRevealBackdrops' in patch) {
    const entries = object(patch.assignedRevealBackdrops)
      ? Object.entries(patch.assignedRevealBackdrops).filter(([, url]) => typeof url === 'string') : [];
    next.assignedRevealBackdrops = entries.length ? Object.fromEntries(entries) : undefined;
  }
  for (const key of Object.keys(next) as Array<keyof ReaderStoryState>) if (next[key] === undefined) delete next[key];
  return next;
}

export function setReaderChapterRead(state: ReaderStoryState, chapterNumber: number, read: boolean, now = new Date().toISOString()): ReaderStoryState {
  const others = state.readChapters.filter(value => value !== chapterNumber);
  return { ...state, readChapters: read ? [...others, chapterNumber].sort((a, b) => a - b) : others, updatedAt: now };
}

/** Reader state wins over whatever the derived story view carries for these fields. */
export function overlayReaderState(story: StoryWorld, state: ReaderStoryState): StoryWorld {
  const result: StoryWorld = { ...story, bookmarks: state.bookmarks };
  for (const key of ['readerPreferences', 'readingAnchor', 'lastReadChapter', 'lastReadAt', 'readingStats', 'assignedRevealBackdrops'] as const) {
    if (state[key] === undefined) delete result[key];
    else (result as unknown as Record<string, unknown>)[key] = state[key];
  }
  delete result.lastReadScrollPosition;
  return result;
}

/** Validates a stored record for one story; anything unreadable is treated as absent. */
export function readReaderStoryState(value: unknown, storyId: string): ReaderStoryState | undefined {
  if (!object(value) || value.schemaVersion !== READER_STATE_SCHEMA_VERSION || value.storyId !== storyId) return undefined;
  if (!Array.isArray(value.bookmarks) || !Array.isArray(value.readChapters) || typeof value.updatedAt !== 'string') return undefined;
  const bookmarks = value.bookmarks.filter((bookmark): bookmark is Bookmark => object(bookmark)
    && typeof bookmark.id === 'string' && positiveInteger(bookmark.chapterNumber)
    && Number.isSafeInteger(bookmark.paragraphIndex) && (bookmark.paragraphIndex as number) >= 0);
  const state = applyReaderStatePatch({
    schemaVersion: READER_STATE_SCHEMA_VERSION, storyId, bookmarks, readChapters: value.readChapters.filter(positiveInteger),
    updatedAt: value.updatedAt,
  }, {
    ...(object(value.readerPreferences) ? { readerPreferences: value.readerPreferences as unknown as ReaderPreferences } : {}),
    ...(object(value.readingAnchor) && positiveInteger(value.readingAnchor.chapterNumber) ? { readingAnchor: value.readingAnchor as unknown as ReadingAnchor } : {}),
    ...(positiveInteger(value.lastReadChapter) ? { lastReadChapter: value.lastReadChapter } : {}),
    ...(typeof value.lastReadAt === 'string' ? { lastReadAt: value.lastReadAt } : {}),
    ...(object(value.readingStats) ? { readingStats: value.readingStats as StoryWorld['readingStats'] } : {}),
    ...(object(value.assignedRevealBackdrops) ? { assignedRevealBackdrops: value.assignedRevealBackdrops as Record<string, string> } : {}),
  }, value.updatedAt);
  return state;
}

/** The chapter to open: the last one read when it still exists, otherwise the first. */
export function resolveReaderOpeningChapter(state: ReaderStoryState | undefined, chapterNumbers: readonly number[]): number {
  const available = [...chapterNumbers].sort((a, b) => a - b);
  if (state?.lastReadChapter && available.includes(state.lastReadChapter)) return state.lastReadChapter;
  return available[0] ?? 1;
}
