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
  type ReaderTranslationGlossarySource,
  type ReaderTranslationRequest,
} from './contract';
import { buildReaderFacingChapter, readerFacingContentHash } from './readerFacing';
import type { ReaderTranslationProvider } from './provider';
import type { ReaderTranslationRepository } from './repository';
import {
  readerTranslationSkillContentDigest,
  resolveReaderTranslationSkill,
  type ReaderTranslationSkillSelection,
} from './skill';
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
): { entries: ReaderTranslationGlossaryEntry[]; source?: ReaderTranslationGlossarySource } | undefined => {
  const resource = skill.translation?.glossary;
  if (!resource) return undefined;
  const entries = selectTranslationGlossaryEntries(resource, matchSource);
  return entries.length ? {
    entries,
    ...(resource.source ? { source: { ...resource.source } } : {}),
  } : undefined;
};

const readerFacingGlossaryMatchSource = (source: ReturnType<typeof buildReaderFacingChapter>): string => {
  const values: string[] = [source.title];
  const collectValues = (value: unknown): void => {
    if (typeof value === 'string') values.push(value);
    else if (Array.isArray(value)) value.forEach(collectValues);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectValues);
  };
  for (const block of source.blocks) {
    if (block.text) values.push(block.text);
    if (block.system) collectValues(block.system);
  }
  return values.join('\n').toLowerCase();
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
    skillSelection?: ReaderTranslationSkillSelection;
  }): Promise<ReaderTranslationOutcome> {
    const { story, chapter, targetLanguage, skillSelection } = input;
    // The canonical chapter is already in this language: show it immediately.
    if (targetLanguage === story.originalLanguage) return { status: 'original' };

    const resolution = resolveReaderTranslationSkill(this.installedSkills, targetLanguage, skillSelection);
    if (!resolution.ok) return { status: 'unavailable', message: resolution.message };
    const skill = resolution.skill;
    const skillContentDigest = readerTranslationSkillContentDigest(skill);
    const skillIdentity = { id: skill.id, version: skill.version, contentDigest: skillContentDigest };

    const source = buildReaderFacingChapter(chapter);
    if (!source.blocks.length) return { status: 'original' };
    const sourceContentHash = readerFacingContentHash(source);

    const cached = this.repository.read(story.id, chapter.number, targetLanguage, skillIdentity);
    if (cached && isReaderTranslationFresh(cached, {
      sourceContentHash,
      skillId: skill.id,
      skillVersion: skill.version,
      skillContentDigest,
    })) {
      return { status: 'ready', translation: cached };
    }

    // The canonical chapter or the skill has moved on; the stale entry is
    // regenerated rather than shown.
    const key = `${readerTranslationKey(story.id, chapter.number, targetLanguage, skillIdentity)}::${sourceContentHash}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const work = this.generate({ story, chapter, targetLanguage, skill, skillContentDigest, source, sourceContentHash })
      .finally(() => { this.inFlight.delete(key); });
    this.inFlight.set(key, work);
    return work;
  }

  private async generate(input: {
    story: ReaderTranslationStory;
    chapter: ReaderChapter;
    targetLanguage: SenLanguageCode;
    skill: HarnessSkillManifest;
    skillContentDigest: string;
    source: ReturnType<typeof buildReaderFacingChapter>;
    sourceContentHash: string;
  }): Promise<ReaderTranslationOutcome> {
    const { story, chapter, targetLanguage, skill, skillContentDigest, source, sourceContentHash } = input;
    const glossary = selectGlossary(skill, readerFacingGlossaryMatchSource(source));

    // Frozen before the provider is called, so a retry replays this input.
    const request: ReaderTranslationRequest = {
      schemaVersion: READER_TRANSLATION_SCHEMA_VERSION,
      storyId: story.id,
      chapterNumber: chapter.number,
      ...(chapter.persistenceId ? { chapterId: chapter.persistenceId } : {}),
      sourceLanguage: story.originalLanguage,
      targetLanguage,
      sourceContentHash,
      skill: { id: skill.id, version: skill.version, contentDigest: skillContentDigest, targetLanguage },
      instructions: skill.instructions ?? '',
      ...(glossary ? {
        glossary: glossary.entries,
        ...(glossary.source ? { glossarySource: glossary.source } : {}),
      } : {}),
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
        skillContentDigest,
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
