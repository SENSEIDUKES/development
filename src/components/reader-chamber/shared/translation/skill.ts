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
import type { HarnessSkillManifest } from '../../../../narrative/generation';

export type ReaderTranslationSkillResolution =
  | { ok: true; skill: HarnessSkillManifest }
  | { ok: false; message: string };

export interface ReaderTranslationSkillSelection {
  id: string;
  version?: string;
  contentDigest?: string;
}

const inlineDigest = (value: string): string => {
  let low = 0x811c9dc5;
  let high = 0x01000193;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    low = Math.imul(low ^ code, 0x01000193) >>> 0;
    high = Math.imul(high ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `inline-${high.toString(16).padStart(8, '0')}${low.toString(16).padStart(8, '0')}`;
};

/** Immutable identity of the selected instruction content. */
export const readerTranslationSkillContentDigest = (skill: HarnessSkillManifest): string =>
  skill.source?.sha256 ?? inlineDigest(skill.instructions ?? '');

const compareNumericToken = (left: string, right: string): number => {
  const normalizedLeft = left.replace(/^0+/, '') || '0';
  const normalizedRight = right.replace(/^0+/, '') || '0';
  return normalizedLeft.length - normalizedRight.length || normalizedLeft.localeCompare(normalizedRight);
};

/** Semver-friendly and deterministic for host versions that add labels. */
const compareSkillVersions = (left: string, right: string): number => {
  const tokenize = (value: string) => value.match(/\d+|[A-Za-z]+|[^A-Za-z\d]+/g) ?? [];
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  for (let index = 0; index < Math.max(leftTokens.length, rightTokens.length); index += 1) {
    const leftToken = leftTokens[index];
    const rightToken = rightTokens[index];
    if (leftToken === undefined) return rightToken === '-' ? 1 : -1;
    if (rightToken === undefined) return leftToken === '-' ? -1 : 1;
    if (leftToken === rightToken) continue;
    const leftNumeric = /^\d+$/.test(leftToken);
    const rightNumeric = /^\d+$/.test(rightToken);
    if (leftNumeric && rightNumeric) return compareNumericToken(leftToken, rightToken);
    if (leftNumeric !== rightNumeric) return leftNumeric ? 1 : -1;
    return leftToken.toLowerCase().localeCompare(rightToken.toLowerCase(), 'en');
  }
  return 0;
};

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
  selection?: ReaderTranslationSkillSelection,
): ReaderTranslationSkillResolution => {
  const compatible = installed.filter(candidate => isReaderTranslationSkill(candidate, targetLanguage));
  const selected = selection
    ? compatible.filter(skill => skill.id === selection.id
      && (selection.version === undefined || skill.version === selection.version)
      && (selection.contentDigest === undefined
        || readerTranslationSkillContentDigest(skill) === selection.contentDigest))
    : compatible;
  if (!selected.length) {
    return {
      ok: false,
      message: selection
        ? `The selected ${getSenLanguageLabel(targetLanguage)} reading package is not installed, so this chapter is shown in its original language.`
        : `No ${getSenLanguageLabel(targetLanguage)} reading package is installed, so this chapter is shown in its original language.`,
    };
  }

  const identities = new Set(selected.map(skill => skill.id));
  if (!selection && identities.size > 1) {
    return {
      ok: false,
      message: `More than one ${getSenLanguageLabel(targetLanguage)} reading package is installed. Choose one explicitly before translating; this chapter is shown in its original language.`,
    };
  }

  const newest = [...selected].sort((left, right) =>
    compareSkillVersions(right.version, left.version)
    || readerTranslationSkillContentDigest(left).localeCompare(readerTranslationSkillContentDigest(right), 'en'))[0];
  const sameRelease = selected.filter(skill => skill.id === newest.id && skill.version === newest.version);
  if (new Set(sameRelease.map(readerTranslationSkillContentDigest)).size > 1) {
    return {
      ok: false,
      message: `The selected ${getSenLanguageLabel(targetLanguage)} reading package has conflicting content for version ${newest.version}. Reinstall it before translating; this chapter is shown in its original language.`,
    };
  }
  return { ok: true, skill: newest };
};
