/**
 * Storage for derived Reader translations.
 *
 * This is a cache of a derived layer, not story data. Losing it costs a
 * regeneration and nothing else, so Development persistence takes the strict
 * route: a stored collection at another schema version is cleared, never read
 * and never migrated.
 */

import type { SenLanguageCode } from '../../../../lib/language';
import {
  READER_TRANSLATION_SCHEMA_VERSION,
  readerTranslationKey,
  type DerivedChapterTranslation,
  type ReaderTranslationSkillReference,
} from './contract';

type CacheSkillIdentity = Pick<ReaderTranslationSkillReference, 'id' | 'version' | 'contentDigest'>;

export interface ReaderTranslationRepository {
  read(
    storyId: string,
    chapterNumber: number,
    targetLanguage: SenLanguageCode,
    skill: CacheSkillIdentity,
  ): DerivedChapterTranslation | null;
  write(translation: DerivedChapterTranslation): void;
  clear(): void;
}

export class InMemoryReaderTranslationRepository implements ReaderTranslationRepository {
  private readonly records = new Map<string, DerivedChapterTranslation>();

  read(storyId: string, chapterNumber: number, targetLanguage: SenLanguageCode, skill: CacheSkillIdentity) {
    return this.records.get(readerTranslationKey(storyId, chapterNumber, targetLanguage, skill)) ?? null;
  }

  write(translation: DerivedChapterTranslation) {
    this.records.set(
      readerTranslationKey(translation.storyId, translation.chapterNumber, translation.targetLanguage, {
        id: translation.skillId,
        version: translation.skillVersion,
        contentDigest: translation.skillContentDigest,
      }),
      translation,
    );
  }

  clear() {
    this.records.clear();
  }
}
