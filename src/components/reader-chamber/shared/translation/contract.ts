/**
 * The derived Reader translation contract.
 *
 * A translation is a *derived reading layer*. The canonical chapter stays in
 * the story's Original Language and is never overwritten: prose, chapter
 * blocks, System Panels, media metadata, and story memory all remain exactly
 * as generated. What a translation carries is a reader-facing overlay keyed by
 * canonical block ID, merged onto the canonical blocks only while rendering.
 *
 * Everything machine-facing is deliberately absent from this contract. Block
 * IDs appear as identifiers and never as translatable values; block types,
 * enums, entity triggers, speaker keys, music and creature classifications,
 * asset identifiers, audio routing, and World Cue intents are not represented
 * here at all, so there is nothing for a translation to change.
 */

import type { SenLanguageCode } from '../../../../lib/language';

/**
 * Bump on any change to the derived shape. Development persistence has no
 * migration path: a stored translation at another version is discarded and
 * regenerated, never read.
 */
export const READER_TRANSLATION_SCHEMA_VERSION = 1 as const;

export interface ReaderFacingLabelledValue {
  label: string;
  value: string;
}

/**
 * The reader-visible text of one System Panel. Structural companions —
 * `direction`, `tone`, `trend`, `presentation`, `promptType`, `kind`, the
 * numeric bar `value`/`max`, and the Fate `outcome` enum — are canonical and
 * are not carried here.
 */
export interface ReaderFacingSystem {
  title?: string;
  flavor?: string;
  rarity?: string;
  rows?: ReaderFacingLabelledValue[];
  badge?: ReaderFacingLabelledValue;
  /** Outcome labels, positionally matched to the canonical `changes`. */
  changes?: string[];
  worldNotice?: {
    entries: Array<{
      title: string;
      body?: string;
      details?: ReaderFacingLabelledValue[];
    }>;
  };
  status?: {
    level?: string;
    bars?: Array<{ label: string; display?: string }>;
    stats?: Array<{ label: string; value: string }>;
    effects?: Array<{ name: string; detail?: string; value?: string }>;
    abilities?: Array<{ name: string; detail?: string }>;
  };
  fate?: {
    timelineScar?: string;
    permanentCosts?: string[];
    newStoryState?: string;
    newActiveStats?: string[];
    genreShift?: string;
  };
}

/** One block's reader-facing values. `id` identifies; it is never translated. */
export interface ReaderFacingBlock {
  id: string;
  text?: string;
  system?: ReaderFacingSystem;
}

/** Everything of a chapter that may be shown to a reader, and nothing else. */
export interface ReaderFacingChapter {
  title: string;
  blocks: ReaderFacingBlock[];
}

export interface ReaderTranslationSkillReference {
  id: string;
  version: string;
  targetLanguage: SenLanguageCode;
}

/** One glossary entry selected for this chapter, frozen onto the request. */
export interface ReaderTranslationGlossaryEntry {
  term: string;
  aliases?: string[];
  translation: string;
  note?: string;
}

/**
 * The frozen request. Source chapter, target language, selected skill, and
 * selected glossary entries are all fixed before the provider is called, so a
 * retry or a replay reuses this exact input rather than reselecting against
 * state that has moved on.
 */
export interface ReaderTranslationRequest {
  schemaVersion: typeof READER_TRANSLATION_SCHEMA_VERSION;
  storyId: string;
  chapterNumber: number;
  chapterId?: string;
  sourceLanguage: SenLanguageCode;
  targetLanguage: SenLanguageCode;
  sourceContentHash: string;
  skill: ReaderTranslationSkillReference;
  /** The skill's own generation instructions for this language. */
  instructions: string;
  glossary?: ReaderTranslationGlossaryEntry[];
  source: ReaderFacingChapter;
  frozenAt: string;
}

export interface ReaderTranslationReceipt {
  provider: string;
  model: string;
  generatedAt: string;
  durationMs?: number;
}

/**
 * The saved derived artifact. It records what was translated, from and into
 * what, against which source revision and skill version, and by which model —
 * enough to decide on its own whether it is still valid.
 */
export interface DerivedChapterTranslation {
  schemaVersion: typeof READER_TRANSLATION_SCHEMA_VERSION;
  storyId: string;
  chapterNumber: number;
  chapterId?: string;
  sourceLanguage: SenLanguageCode;
  targetLanguage: SenLanguageCode;
  /** The canonical reader-facing content this overlay was derived from. */
  sourceContentHash: string;
  skillId: string;
  skillVersion: string;
  title: string;
  /** Reader-facing values mapped to their canonical block IDs. */
  blocks: ReaderFacingBlock[];
  receipt: ReaderTranslationReceipt;
  status: 'ready' | 'failed';
  failure?: { message: string; failedAt: string };
}

/** Identity of one cached translation: a chapter shown in one language. */
export const readerTranslationKey = (
  storyId: string,
  chapterNumber: number,
  targetLanguage: SenLanguageCode,
): string => `${storyId}::${chapterNumber}::${targetLanguage}`;

/**
 * A cached translation may only be reused while it still describes the
 * chapter that is on screen and the skill that is installed. Either moving on
 * makes it stale, and stale means regenerate — never show.
 */
export const isReaderTranslationFresh = (
  translation: DerivedChapterTranslation,
  against: { sourceContentHash: string; skillId: string; skillVersion: string },
): boolean =>
  translation.schemaVersion === READER_TRANSLATION_SCHEMA_VERSION
  && translation.status === 'ready'
  && translation.sourceContentHash === against.sourceContentHash
  && translation.skillId === against.skillId
  && translation.skillVersion === against.skillVersion;
