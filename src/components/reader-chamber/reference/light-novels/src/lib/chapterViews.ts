import type {
  ChapterDiagnostics,
  ChapterGenerationInternals,
  ChapterProse,
  GeneratedChapter,
  PersistedChapter,
  ReaderChapter,
  StreamingChapter,
} from '../types';

/**
 * Conversions between the three chapter lifecycle stages.
 *
 * The field lists below are the single source of truth for what leaves a
 * chapter when it is written to the Story document. They used to exist three
 * times — as `ChapterContent`'s shape, as the writes in
 * `persistGeneratedChapter`, and as a run of `delete` statements in
 * `persistentStorageManager` — with nothing keeping them in agreement. When
 * they disagreed, a field silently failed to round-trip and the reader
 * rendered a chapter the pipeline thought it had saved.
 */

/** Prose keys stripped off the scaffold and stored as a `ChapterContent` row. */
export const CHAPTER_PROSE_KEYS = [
  'generatedContent',
  'blocks',
  'statsChangeMessage',
  'cuePayload',
] as const satisfies readonly (keyof ChapterProse)[];

/**
 * Diagnostic keys stripped alongside the prose. Reader-visible once hydrated,
 * so they are not treated as pipeline internals.
 */
export const CHAPTER_DIAGNOSTIC_KEYS = [
  'contextManifest',
] as const satisfies readonly (keyof ChapterDiagnostics)[];

/** Pipeline-internal keys that move onto `ChapterContent` at save time. */
export const CHAPTER_GENERATION_INTERNAL_KEYS = [
  '_isNewContent',
  'handoff',
  'contract',
] as const satisfies readonly (keyof ChapterGenerationInternals)[];

/** Every key that does not survive a write to the Story document. */
export const CHAPTER_NON_PERSISTED_KEYS = [
  ...CHAPTER_PROSE_KEYS,
  ...CHAPTER_DIAGNOSTIC_KEYS,
  ...CHAPTER_GENERATION_INTERNAL_KEYS,
] as const;

/**
 * Whether a chapter currently carries readable prose.
 *
 * `hasContent` records that prose was generated and stored; it says nothing
 * about whether this in-memory copy has been hydrated with it. Callers that
 * are about to render need the latter.
 */
export const hasReadableProse = (
  chapter: Pick<ReaderChapter, 'generatedContent' | 'blocks'> | null | undefined,
): boolean => {
  if (!chapter) return false;
  // Array.isArray rather than `blocks?.length`: a legacy or malformed record
  // can carry a non-array here, and a string would report a truthy length.
  return Boolean(chapter.generatedContent) || (Array.isArray(chapter.blocks) && chapter.blocks.length > 0);
};

/**
 * Every key these helpers remove is optional on `GeneratedChapter`, so
 * deleting it leaves a value that still satisfies the type.
 */
type OmittableChapterKey = (typeof CHAPTER_NON_PERSISTED_KEYS)[number];

const withoutKeys = <T extends GeneratedChapter>(
  chapter: T,
  keys: readonly OmittableChapterKey[],
): T => {
  const next: T = { ...chapter };
  for (const key of keys) {
    delete next[key];
  }
  return next;
};

/**
 * Drop prose, diagnostics and pipeline internals, leaving the scaffold that is
 * written to the Story document.
 *
 * Returns a new object; the input is not mutated.
 */
export const toPersistedChapter = (chapter: GeneratedChapter): PersistedChapter =>
  withoutKeys(chapter, CHAPTER_NON_PERSISTED_KEYS);

/**
 * In-place variant for the persistence manager, which strips chapters while
 * walking a deep clone of the story it is about to write.
 */
export const stripNonPersistedChapterFields = (chapter: GeneratedChapter): void => {
  for (const key of CHAPTER_NON_PERSISTED_KEYS) {
    delete chapter[key];
  }
};

/**
 * Narrow a chapter to what the reading surface may see.
 *
 * The pipeline internals are dropped rather than merely untyped, so a reader
 * component cannot read a `handoff` or `contract` that persistence has already
 * moved onto `ChapterContent`. `contextManifest` is kept: it round-trips, and
 * the reader's context inspector renders it.
 */
export const toReaderChapter = (chapter: GeneratedChapter): ReaderChapter =>
  withoutKeys(chapter, CHAPTER_GENERATION_INTERNAL_KEYS);

/**
 * Overlay an in-flight generation onto the chapter the reader is rendering.
 *
 * This is the adapter the reader was missing: `ReaderScreen` used to splice
 * `streamingChapter.content` / `.blocks` onto a chapter by hand, which meant
 * the reading surface had to know the pipeline's partial wire shape. Changing
 * `StreamingChapter` now breaks here, once, instead of silently degrading the
 * reader.
 *
 * Returns the chapter unchanged when the stream is for a different chapter.
 */
export const applyStreamingChapter = (
  chapter: GeneratedChapter,
  streaming: StreamingChapter | null | undefined,
): ReaderChapter => {
  const base = toReaderChapter(chapter);
  if (!streaming || streaming.number !== chapter.number) return base;
  return {
    ...base,
    generatedContent: streaming.content,
    blocks: streaming.blocks,
  };
};
