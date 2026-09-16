/**
 * Which installed skill may translate a chapter for a reader.
 *
 * Reader translation and canonical generation are different jobs. The story's
 * equipped Translation skill exists to help *write* the canonical chapter in
 * the story's Original Language; it is never reused to render that chapter in
 * some other language a reader asked for. A Reader translation needs a skill
 * that declares the requested target language *and* the `reader` application.
 *
 * There is deliberately no fallback. If no such skill is installed the Reader
 * keeps showing the original chapter and says the language package is missing,
 * because a generic or English skill would silently produce something the
 * author never approved.
 */

import { getSenLanguageLabel, type SenLanguageCode } from '../../../../lib/language';
import type { HarnessSkillManifest } from '../../../harness-generation/shared/types';

export type ReaderTranslationSkillResolution =
  | { ok: true; skill: HarnessSkillManifest }
  | { ok: false; message: string };

/** A Translation-slot skill that declares `reader` and the exact language. */
export const isReaderTranslationSkill = (
  skill: HarnessSkillManifest,
  targetLanguage: SenLanguageCode,
): boolean =>
  skill.slot === 'translation'
  && skill.applications.includes('reader')
  && skill.translation?.targetLanguage === targetLanguage;

export const resolveReaderTranslationSkill = (
  installed: readonly HarnessSkillManifest[],
  targetLanguage: SenLanguageCode,
): ReaderTranslationSkillResolution => {
  const skill = installed.find(candidate => isReaderTranslationSkill(candidate, targetLanguage));
  if (skill) return { ok: true, skill };
  return {
    ok: false,
    message: `No ${getSenLanguageLabel(targetLanguage)} reading package is installed, so this chapter is shown in its original language.`,
  };
};
