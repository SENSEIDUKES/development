/**
 * Which installed skill may translate a chapter for a reader.
 *
 * Reader translation and canonical generation are different jobs. The
 * Translation package the HARNESS loads for a non-English story exists to help
 * *write* the canonical chapter in the story's Original Language; it is never
 * reused to render that chapter in some other language a reader asked for. A
 * Reader translation needs a skill that declares the requested target language
 * *and* the `reader` application. Both jobs choose through the one rule in
 * `resolveTranslationPackage`.
 *
 * There is deliberately no fallback. If no such skill is installed the Reader
 * keeps showing the original chapter and says the language package is missing,
 * because a generic or English skill would silently produce something the
 * author never approved.
 */

import { getSenLanguageLabel, type SenLanguageCode } from '../../../../lib/language';
import type { HarnessSkillManifest } from '../../../../narrative/generation';
import {
  isTranslationPackageFor,
  resolveTranslationPackage,
  translationSkillContentDigest,
  type TranslationPackageSelection,
} from '../../../../narrative/translationSkill';

export type ReaderTranslationSkillResolution =
  | { ok: true; skill: HarnessSkillManifest }
  | { ok: false; message: string };

export type ReaderTranslationSkillSelection = TranslationPackageSelection;

/** Immutable identity of the selected instruction content. */
export const readerTranslationSkillContentDigest = translationSkillContentDigest;

/** A Translation-slot skill that declares `reader` and the exact language. */
export const isReaderTranslationSkill = (
  skill: HarnessSkillManifest,
  targetLanguage: SenLanguageCode,
): boolean => isTranslationPackageFor(skill, targetLanguage, 'reader');

export const resolveReaderTranslationSkill = (
  installed: readonly HarnessSkillManifest[],
  targetLanguage: SenLanguageCode,
  selection?: ReaderTranslationSkillSelection,
): ReaderTranslationSkillResolution => {
  const resolution = resolveTranslationPackage(installed, targetLanguage, 'reader', selection);
  const language = getSenLanguageLabel(targetLanguage);
  switch (resolution.status) {
    case 'resolved':
      return { ok: true, skill: resolution.skill };
    case 'missing':
      return {
        ok: false,
        message: selection
          ? `The selected ${language} reading package is not installed, so this chapter is shown in its original language.`
          : `No ${language} reading package is installed, so this chapter is shown in its original language.`,
      };
    case 'ambiguous':
      return {
        ok: false,
        message: `More than one ${language} reading package is installed. Choose one explicitly before translating; this chapter is shown in its original language.`,
      };
    case 'conflicting-content':
      return {
        ok: false,
        message: `The selected ${language} reading package has conflicting content for version ${resolution.version}. Reinstall it before translating; this chapter is shown in its original language.`,
      };
  }
};
