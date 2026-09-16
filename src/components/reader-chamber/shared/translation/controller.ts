/**
 * The Reader translation controller.
 *
 * One owner for the whole derived-layer lifecycle: resolve the skill, freeze
 * the request, reuse or regenerate the cache, deduplicate concurrent asks,
 * validate the reply, and save. Nothing here ever writes to the canonical
 * chapter — on any failure the caller keeps rendering exactly what it had.
 */

import type { SenLanguageCode } from '../../../../lib/language';
import {
  selectTranslationGlossaryEntries,
} from '../../../harness-generation/shared/translationSkill';
import type { HarnessSkillManifest } from '../../../harness-generation/shared/types';
import type { ReaderChapter } from '../types';
import {
  READER_TRANSLATION_SCHEMA_VERSION,
  isReaderTranslationFresh,
  readerTranslationKey,
  type DerivedChapterTranslation,
  type ReaderTranslationGlossaryEntry,
  type ReaderTranslationRequest,
} from './contract';
import { buildReaderFacingChapter, readerFacingContentHash } from './readerFacing';
import type { ReaderTranslationProvider } from './provider';
import type { ReaderTranslationRepository } from './repository';
import { resolveReaderTranslationSkill } from './skill';
import { validateReaderTranslationResponse } from './validate';

export type ReaderTranslationOutcome =
  /** The resolved reading language is the story's own: show canon, ask nothing. */
  | { status: 'original' }
  | { status: 'ready'; translation: DerivedChapterTranslation }
  /** No matching `reader` Translation skill is installed for this language. */
  | { status: 'unavailable'; message: string }
  | { status: 'failed'; message: string };

export interface ReaderTranslationStory {
  id: string;
  originalLanguage: SenLanguageCode;
}

export interface ReaderTranslationControllerOptions {
  repository: ReaderTranslationRepository;
  provider: ReaderTranslationProvider;
  installedSkills?: readonly HarnessSkillManifest[];
  now?: () => Date;
}

/**
 * The glossary never travels whole. Only the entries this chapter's own
 * reader-facing material references are frozen onto the request, matched by
 * the same boundary-aware rules the generation side uses.
 */
const selectGlossary = (
  skill: HarnessSkillManifest,
  matchSource: string,
): ReaderTranslationGlossaryEntry[] | undefined => {
  const resource = skill.translation?.glossary;
  if (!resource) return undefined;
  const entries = selectTranslationGlossaryEntries(resource, matchSource);
  return entries.length ? entries : undefined;
};

export class ReaderTranslationController {
  private readonly repository: ReaderTranslationRepository;
  private readonly provider: ReaderTranslationProvider;
  private readonly now: () => Date;
  private installedSkills: readonly HarnessSkillManifest[];
  /** In-flight work, so two readers asking for the same view call once. */
  private readonly inFlight = new Map<string, Promise<ReaderTranslationOutcome>>();

  constructor(options: ReaderTranslationControllerOptions) {
    this.repository = options.repository;
    this.provider = options.provider;
    this.installedSkills = options.installedSkills ?? [];
    this.now = options.now ?? (() => new Date());
  }

  setInstalledSkills(skills: readonly HarnessSkillManifest[]): void {
    this.installedSkills = skills;
  }

  async translate(input: {
    story: ReaderTranslationStory;
    chapter: ReaderChapter;
    targetLanguage: SenLanguageCode;
  }): Promise<ReaderTranslationOutcome> {
    const { story, chapter, targetLanguage } = input;
    // The canonical chapter is already in this language: show it immediately.
    if (targetLanguage === story.originalLanguage) return { status: 'original' };

    const resolution = resolveReaderTranslationSkill(this.installedSkills, targetLanguage);
    if (!resolution.ok) return { status: 'unavailable', message: resolution.message };
    const skill = resolution.skill;

    const source = buildReaderFacingChapter(chapter);
    if (!source.blocks.length) return { status: 'original' };
    const sourceContentHash = readerFacingContentHash(source);

    const cached = this.repository.read(story.id, chapter.number, targetLanguage);
    if (cached && isReaderTranslationFresh(cached, {
      sourceContentHash,
      skillId: skill.id,
      skillVersion: skill.version,
    })) {
      return { status: 'ready', translation: cached };
    }

    // The canonical chapter or the skill has moved on; the stale entry is
    // regenerated rather than shown.
    const key = `${readerTranslationKey(story.id, chapter.number, targetLanguage)}::${sourceContentHash}::${skill.version}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const work = this.generate({ story, chapter, targetLanguage, skill, source, sourceContentHash })
      .finally(() => { this.inFlight.delete(key); });
    this.inFlight.set(key, work);
    return work;
  }

  private async generate(input: {
    story: ReaderTranslationStory;
    chapter: ReaderChapter;
    targetLanguage: SenLanguageCode;
    skill: HarnessSkillManifest;
    source: ReturnType<typeof buildReaderFacingChapter>;
    sourceContentHash: string;
  }): Promise<ReaderTranslationOutcome> {
    const { story, chapter, targetLanguage, skill, source, sourceContentHash } = input;
    const glossary = selectGlossary(skill, JSON.stringify(source).toLocaleLowerCase());

    // Frozen before the provider is called, so a retry replays this input.
    const request: ReaderTranslationRequest = {
      schemaVersion: READER_TRANSLATION_SCHEMA_VERSION,
      storyId: story.id,
      chapterNumber: chapter.number,
      ...(chapter.persistenceId ? { chapterId: chapter.persistenceId } : {}),
      sourceLanguage: story.originalLanguage,
      targetLanguage,
      sourceContentHash,
      skill: { id: skill.id, version: skill.version, targetLanguage },
      instructions: skill.instructions ?? '',
      ...(glossary ? { glossary } : {}),
      source,
      frozenAt: this.now().toISOString(),
    };

    try {
      const reply = await this.provider.translate(request);
      const validated = validateReaderTranslationResponse(reply.rawProviderResponse, source);
      const translation: DerivedChapterTranslation = {
        schemaVersion: READER_TRANSLATION_SCHEMA_VERSION,
        storyId: request.storyId,
        chapterNumber: request.chapterNumber,
        ...(request.chapterId ? { chapterId: request.chapterId } : {}),
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        sourceContentHash: request.sourceContentHash,
        skillId: skill.id,
        skillVersion: skill.version,
        title: validated.title,
        blocks: validated.blocks,
        receipt: reply.receipt,
        status: 'ready',
      };
      this.repository.write(translation);
      return { status: 'ready', translation };
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'This chapter could not be translated.';
      // The canonical chapter is untouched and stays on screen.
      return { status: 'failed', message };
    }
  }
}
