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

export const READER_TRANSLATION_STORAGE_KEY = 'seihouse.reader.translations.v2';
export const MAX_CACHED_TRANSLATIONS = 24;

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Minimal shape check; the derived values themselves were validated on save. */
const isStoredTranslation = (value: unknown): value is DerivedChapterTranslation =>
  isRecord(value)
  && value.schemaVersion === READER_TRANSLATION_SCHEMA_VERSION
  && typeof value.storyId === 'string'
  && typeof value.targetLanguage === 'string'
  && typeof value.sourceContentHash === 'string'
  && typeof value.skillId === 'string'
  && typeof value.skillVersion === 'string'
  && typeof value.skillContentDigest === 'string'
  && Array.isArray(value.blocks);

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

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Browser-backed cache. Every storage failure degrades to "no cached
 * translation" rather than breaking reading: the canonical chapter is always
 * still on screen.
 */
export class WebReaderTranslationRepository implements ReaderTranslationRepository {
  constructor(
    private readonly storage: WebStorageLike | null =
      typeof window === 'undefined' ? null : window.localStorage,
    private readonly storageKey = READER_TRANSLATION_STORAGE_KEY,
  ) {}

  private load(): Record<string, DerivedChapterTranslation> {
    if (!this.storage) return {};
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(this.storageKey);
    } catch {
      return {};
    }
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) throw new Error('unusable');
      const entries = Object.entries(parsed).filter(
        (entry): entry is [string, DerivedChapterTranslation] => isStoredTranslation(entry[1]),
      );
      // Stale local translation data is reset, not migrated: anything the
      // current schema cannot read is dropped along with it.
      if (entries.length !== Object.keys(parsed).length) {
        this.save(Object.fromEntries(entries));
      }
      return Object.fromEntries(entries);
    } catch {
      this.clear();
      return {};
    }
  }

  private save(records: Record<string, DerivedChapterTranslation>): void {
    let entries = Object.entries(records);
    if (!entries.length) {
      try {
        this.storage?.removeItem(this.storageKey);
      } catch {
        // The cache is advisory; repeated validation is the only cost.
      }
      return;
    }
    if (entries.length > MAX_CACHED_TRANSLATIONS) {
      entries = entries.slice(entries.length - MAX_CACHED_TRANSLATIONS);
    }
    while (entries.length) {
      try {
        this.storage?.setItem(this.storageKey, JSON.stringify(Object.fromEntries(entries)));
        return;
      } catch {
        // A full store costs the oldest entries, not the newest translation.
        entries = entries.slice(Math.max(1, Math.ceil(entries.length / 2)));
      }
    }
  }

  read(storyId: string, chapterNumber: number, targetLanguage: SenLanguageCode, skill: CacheSkillIdentity) {
    return this.load()[readerTranslationKey(storyId, chapterNumber, targetLanguage, skill)] ?? null;
  }

  write(translation: DerivedChapterTranslation) {
    const records = this.load();
    records[readerTranslationKey(translation.storyId, translation.chapterNumber, translation.targetLanguage, {
      id: translation.skillId,
      version: translation.skillVersion,
      contentDigest: translation.skillContentDigest,
    })] = translation;
    this.save(records);
  }

  clear() {
    try {
      this.storage?.removeItem(this.storageKey);
    } catch {
      // Nothing further to do; the cache is advisory.
    }
  }
}
