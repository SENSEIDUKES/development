/**
 * The Reader's view of the translation controller.
 *
 * The hook only reports state and cancels stale work. It holds no translation
 * logic of its own and never reaches a model: every decision — skill
 * resolution, freezing, caching, validation — belongs to the controller.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SenLanguageCode } from '../../../../lib/language';
import type { HarnessSkillManifest } from '../../../harness-generation/shared/types';
import type { ReaderChapter } from '../types';
import type { DerivedChapterTranslation } from './contract';
import {
  ReaderTranslationController,
  type ReaderTranslationStory,
} from './controller';
import { ReaderTranslationHttpProvider } from './provider';
import { WebReaderTranslationRepository } from './repository';

export type ChapterTranslationStatus =
  | 'original'
  | 'translating'
  | 'ready'
  | 'unavailable'
  | 'failed';

export interface ChapterTranslationState {
  status: ChapterTranslationStatus;
  /** Present only while `status` is `ready`. */
  translation: DerivedChapterTranslation | null;
  /** Reader-facing explanation for `unavailable` and `failed`. */
  message: string | null;
}

const ORIGINAL: ChapterTranslationState = { status: 'original', translation: null, message: null };

let sharedController: ReaderTranslationController | null = null;

/** One controller per page, so its cache and request de-duplication persist. */
export const readerTranslationController = (): ReaderTranslationController => {
  sharedController ??= new ReaderTranslationController({
    repository: new WebReaderTranslationRepository(),
    provider: new ReaderTranslationHttpProvider(),
  });
  return sharedController;
};

/** Test and Workshop seam for supplying a controller with its own fixtures. */
export const setReaderTranslationController = (
  controller: ReaderTranslationController | null,
): void => {
  sharedController = controller;
};

export interface UseChapterTranslationInput {
  story: ReaderTranslationStory;
  chapter: ReaderChapter;
  /** The language the Reader resolved for display, not the reader's raw choice. */
  targetLanguage: SenLanguageCode;
  /** Host-installed skills; the Reader never reads a host inventory itself. */
  installedSkills?: readonly HarnessSkillManifest[];
}

export function useChapterTranslation({
  story,
  chapter,
  targetLanguage,
  installedSkills,
}: UseChapterTranslationInput): ChapterTranslationState {
  const [state, setState] = useState<ChapterTranslationState>(ORIGINAL);
  const controller = useMemo(readerTranslationController, []);
  const requestRef = useRef(0);

  // A host that passes nothing would otherwise hand the controller a new empty
  // array on every render.
  const skills = useMemo(() => installedSkills ?? [], [installedSkills]);
  useEffect(() => {
    controller.setInstalledSkills(skills);
  }, [controller, skills]);

  const chapterNumber = chapter.number;
  // The canonical material itself is the dependency: a re-rendered identical
  // chapter must not re-request, and an edited one must.
  const chapterSignature = useMemo(
    () => JSON.stringify(chapter.blocks ?? []) + chapter.title,
    [chapter.blocks, chapter.title],
  );
  const skillSignature = useMemo(
    () => skills.map(skill => `${skill.id}@${skill.version}`).join(','),
    [skills],
  );

  useEffect(() => {
    if (targetLanguage === story.originalLanguage) {
      setState(ORIGINAL);
      return;
    }
    const request = ++requestRef.current;
    setState(current => (
      current.status === 'translating' ? current : { status: 'translating', translation: null, message: null }
    ));
    void controller.translate({ story, chapter, targetLanguage }).then(outcome => {
      // A reader who moved on before this resolved keeps what they moved to.
      if (request !== requestRef.current) return;
      setState(
        outcome.status === 'ready'
          ? { status: 'ready', translation: outcome.translation, message: null }
          : outcome.status === 'original'
            ? ORIGINAL
            : { status: outcome.status, translation: null, message: outcome.message },
      );
    });
    // `chapterSignature` and `skillSignature` stand in for the object
    // identities of `chapter` and `skills`, which change on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, story.id, story.originalLanguage, targetLanguage, chapterNumber, chapterSignature, skillSignature]);

  return state;
}
