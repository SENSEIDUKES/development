/**
 * The Translation CAPA Skill contract: what a language skill may declare, and
 * how its glossary resource is validated and selected from.
 *
 * A Translation skill's target language is structural metadata. It is never
 * inferred from the skill's name, filename, instructions, or package title.
 * The glossary is a reference resource, not prompt text — only the entries a
 * chapter actually touches reach the CAPA Prompt.
 */

import { isSenLanguageCode, type SenLanguageCode } from '../lib/language';
import type { HarnessSelectedTranslationGlossary, HarnessSkillApplication, HarnessSkillManifest, HarnessTranslationGlossaryEntry, HarnessTranslationGlossaryResource, HarnessTranslationSkillMetadata, ImmediateChapterRequest, StoryInformationPacket } from './generation';

/**
 * Story Information and every machine-facing field are canonical English, so
 * a story written in English needs no Translation skill.
 */
export const HARNESS_CANONICAL_LANGUAGE: SenLanguageCode = 'en';

export const TRANSLATION_GLOSSARY_ENTRY_LIMIT = 5_000;
const TERM_LENGTH_LIMIT = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const requiredText = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Translation glossary ${label} is required.`);
  }
  if (value.length > TERM_LENGTH_LIMIT) {
    throw new Error(`Translation glossary ${label} exceeds ${TERM_LENGTH_LIMIT} characters.`);
  }
  return value.trim();
};

const optionalText = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return requiredText(value, label);
};

const canonicalKey = (term: string) => term.trim().toLowerCase();

/**
 * Validates an untrusted glossary resource. `expectedLanguage` is the language
 * the host explicitly selected; a resource declaring a different one is
 * rejected rather than silently retargeted.
 */
export const validateTranslationGlossaryResource = (
  value: unknown,
  expectedLanguage: SenLanguageCode,
): HarnessTranslationGlossaryResource => {
  if (!isRecord(value)) throw new Error('A Translation glossary must be a JSON object.');
  if (!isSenLanguageCode(value.targetLanguage)) {
    throw new Error('The Translation glossary declares an unsupported target language.');
  }
  if (value.targetLanguage !== expectedLanguage) {
    throw new Error(`This glossary targets ${value.targetLanguage}, but the skill targets ${expectedLanguage}.`);
  }
  if (!Array.isArray(value.entries) || !value.entries.length) {
    throw new Error('A Translation glossary must contain at least one entry.');
  }
  if (value.entries.length > TRANSLATION_GLOSSARY_ENTRY_LIMIT) {
    throw new Error(`A Translation glossary may hold at most ${TRANSLATION_GLOSSARY_ENTRY_LIMIT.toLocaleString()} entries.`);
  }

  const seen = new Map<string, string>();
  const entries = value.entries.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Translation glossary entry ${index + 1} must be an object.`);
    const term = requiredText(raw.term, `entry ${index + 1} term`);
    const translation = requiredText(raw.translation, `entry ${index + 1} translation`);
    const key = canonicalKey(term);
    const duplicate = seen.get(key);
    if (duplicate) throw new Error(`Translation glossary term or alias "${term}" collides with "${duplicate}" after normalization.`);
    seen.set(key, term);

    let aliases: string[] | undefined;
    if (raw.aliases !== undefined) {
      if (!Array.isArray(raw.aliases)) throw new Error(`Translation glossary entry "${term}" has invalid aliases.`);
      const cleaned = raw.aliases.map((alias, aliasIndex) =>
        requiredText(alias, `entry "${term}" alias ${aliasIndex + 1}`));
      const uniqueAliases = [...new Map(cleaned.map(alias => [canonicalKey(alias), alias])).values()];
      for (const alias of uniqueAliases) {
        const aliasKey = canonicalKey(alias);
        const aliasDuplicate = seen.get(aliasKey);
        if (aliasDuplicate) {
          throw new Error(`Translation glossary term or alias "${alias}" collides with "${aliasDuplicate}" after normalization.`);
        }
        seen.set(aliasKey, alias);
      }
      if (uniqueAliases.length) aliases = uniqueAliases;
    }

    const note = optionalText(raw.note, `entry "${term}" note`);
    const entry: HarnessTranslationGlossaryEntry = { term, translation };
    if (aliases) entry.aliases = aliases;
    if (note) entry.note = note;
    return entry;
  });

  const source = isRecord(value.source)
    ? { path: requiredText(value.source.path, 'source path'), sha256: requiredText(value.source.sha256, 'source sha256') }
    : undefined;

  return { targetLanguage: value.targetLanguage, entries, ...(source ? { source } : {}) };
};

/** Validates the structural Translation metadata carried on a manifest. */
export const validateTranslationSkillMetadata = (
  value: unknown,
  skillName: string,
): HarnessTranslationSkillMetadata => {
  if (!isRecord(value)) throw new Error(`Translation skill ${skillName} must declare its Translation metadata.`);
  if (!isSenLanguageCode(value.targetLanguage)) {
    throw new Error(`Translation skill ${skillName} must declare exactly one supported target language.`);
  }
  const targetLanguage = value.targetLanguage;
  if (value.glossary === undefined || value.glossary === null) return { targetLanguage };
  return { targetLanguage, glossary: validateTranslationGlossaryResource(value.glossary, targetLanguage) };
};

export const translationTargetLanguage = (skill: HarnessSkillManifest): SenLanguageCode | undefined =>
  skill.slot === 'translation' ? skill.translation?.targetLanguage : undefined;

/** The two jobs a Translation package may declare: writing canonical chapters, or translating them for a reader. */
export type TranslationPackageApplication = Extract<HarnessSkillApplication, 'generation' | 'reader'>;

/** A Translation-slot skill that declares this job and exactly this language. */
export const isTranslationPackageFor = (
  skill: HarnessSkillManifest,
  targetLanguage: SenLanguageCode,
  application: TranslationPackageApplication,
): boolean =>
  skill.slot === 'translation'
  && skill.applications.includes(application)
  && skill.translation?.targetLanguage === targetLanguage;

/** An explicit choice of one installed package, when a caller has one. */
export interface TranslationPackageSelection {
  id: string;
  version?: string;
  contentDigest?: string;
}

export type TranslationPackageResolution =
  | { status: 'resolved'; skill: HarnessSkillManifest }
  /** No installed package declares this job and language (or the selection). */
  | { status: 'missing' }
  /** Packages with different identities qualify; none is ever chosen silently. */
  | { status: 'ambiguous' }
  /** The newest qualifying release is installed with different content. */
  | { status: 'conflicting-content'; version: string };

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

/** Immutable identity of a package's selected instruction content. */
export const translationSkillContentDigest = (skill: HarnessSkillManifest): string =>
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

/**
 * The one rule for choosing an installed Translation package, shared by
 * chapter writing (`generation`) and Reader translation (`reader`). A package
 * qualifies only by its declared job and language, never by its name. Several
 * installed versions of one package resolve to the newest; packages with
 * different identities are an explicit ambiguity unless the caller selected one.
 */
export const resolveTranslationPackage = (
  installed: readonly HarnessSkillManifest[],
  targetLanguage: SenLanguageCode,
  application: TranslationPackageApplication,
  selection?: TranslationPackageSelection,
): TranslationPackageResolution => {
  const compatible = installed.filter(candidate => isTranslationPackageFor(candidate, targetLanguage, application));
  const selected = selection
    ? compatible.filter(skill => skill.id === selection.id
      && (selection.version === undefined || skill.version === selection.version)
      && (selection.contentDigest === undefined
        || translationSkillContentDigest(skill) === selection.contentDigest))
    : compatible;
  if (!selected.length) return { status: 'missing' };

  const identities = new Set(selected.map(skill => skill.id));
  if (!selection && identities.size > 1) return { status: 'ambiguous' };

  const newest = [...selected].sort((left, right) =>
    compareSkillVersions(right.version, left.version)
    || translationSkillContentDigest(left).localeCompare(translationSkillContentDigest(right), 'en'))[0];
  const sameRelease = selected.filter(skill => skill.id === newest.id && skill.version === newest.version);
  if (new Set(sameRelease.map(translationSkillContentDigest)).size > 1) {
    return { status: 'conflicting-content', version: newest.version };
  }
  return { status: 'resolved', skill: newest };
};

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

/**
 * Scripts written without spaces between words. A word-boundary test is
 * meaningless in them — every neighbouring character is a word character — so
 * only these may fall back to loose substring matching.
 */
const UNSEGMENTED_SCRIPT = new RegExp(
  '[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}'
  + '\\p{Script=Thai}\\p{Script=Lao}\\p{Script=Khmer}'
  + '\\p{Script=Myanmar}\\p{Script=Tibetan}]',
  'u',
);

/**
 * A complete-phrase match: the phrase appears without adjoining word
 * characters, so the glossary term "Qi" matches "his Qi surged" but never the
 * "qi" inside "equipped".
 */
const matchesPhrase = (haystack: string, needle: string): boolean => {
  for (let index = haystack.indexOf(needle); index >= 0; index = haystack.indexOf(needle, index + 1)) {
    const before = haystack[index - 1];
    const after = haystack[index + needle.length];
    if (!(before && WORD_CHARACTER.test(before)) && !(after && WORD_CHARACTER.test(after))) return true;
  }
  return false;
};

/** The frozen generation inputs a glossary is matched against. */
export const translationMatchSource = (
  storyInformation: StoryInformationPacket,
  immediateChapterRequest: ImmediateChapterRequest,
): string => {
  const story = storyInformation.currentStory;
  const entities = Object.values(storyInformation.canonicalState).flat() as Array<Record<string, unknown>>;
  const text = [
    story.title,
    story.premise,
    story.permanentInstructions,
    story.toneStyle,
    story.genre,
    story.openingSetup,
    story.declaredCanon,
    story.characters,
    story.worldFacts,
    story.intendedDirection,
    ...(story.cast ?? []).flatMap(member => [member.name, member.role, member.relationshipToMC]),
    ...(story.identities ?? []).flatMap(identity => [identity.name, ...(identity.aliases ?? []), identity.evidence]),
    ...story.corrections.flatMap(correction => [correction.reason, correction.replacement?.label, ...Object.values(correction.replacement?.facts ?? {})]),
    storyInformation.storyDirection.destinedEnding,
    ...storyInformation.storyDirection.hardPins,
    storyInformation.arc?.activeGoal.text,
    storyInformation.rhythm?.suggestion,
    ...storyInformation.previouslyOn.flatMap(entry => [entry.title, entry.recap]),
    ...entities.flatMap(entity => [
      ...Object.values(entity).filter((value): value is string => typeof value === 'string'),
      ...(Array.isArray(entity.aliases) ? entity.aliases as string[] : []),
      ...Object.values((entity.facts as Record<string, string> | undefined) ?? {}),
    ]),
    immediateChapterRequest.direction?.choice.kind === 'reader' ? immediateChapterRequest.direction.choice.text : immediateChapterRequest.direction?.choice.suggestion,
  ];
  return text.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join('\n')
    .toLowerCase();
};

/**
 * Selects only the glossary entries the frozen Story Information Packet and
 * Immediate Chapter Request actually reference. Complete phrase matches are
 * preferred over partial substring matches, and the loose substring pass is
 * available only to terms written in an unsegmented script, where a boundary
 * test cannot apply. The full resource never travels into the prompt.
 */
export const selectTranslationGlossaryEntries = (
  resource: HarnessTranslationGlossaryResource,
  matchSource: string,
): HarnessTranslationGlossaryEntry[] => {
  const phrase: HarnessTranslationGlossaryEntry[] = [];
  const substring: HarnessTranslationGlossaryEntry[] = [];

  for (const entry of resource.entries) {
    const candidates = [entry.term, ...(entry.aliases ?? [])].map(value => value.toLowerCase());
    if (candidates.some(candidate => matchesPhrase(matchSource, candidate))) phrase.push(entry);
    else if (candidates.some(candidate =>
      UNSEGMENTED_SCRIPT.test(candidate) && matchSource.includes(candidate))) substring.push(entry);
  }

  return [...phrase, ...substring];
};

export const buildSelectedTranslationGlossary = (
  skill: HarnessSkillManifest,
  matchSource: string,
): HarnessSelectedTranslationGlossary | undefined => {
  const resource = skill.translation?.glossary;
  if (!resource) return undefined;
  const entries = selectTranslationGlossaryEntries(resource, matchSource);
  if (!entries.length) return undefined;
  return {
    skillId: skill.id,
    skillVersion: skill.version,
    targetLanguage: resource.targetLanguage,
    ...(resource.source ? { source: { ...resource.source } } : {}),
    entries,
    availableEntryCount: resource.entries.length,
  };
};

/** Renders the selected reference appended inside the Translation section. */
export const presentSelectedTranslationGlossary = (
  selection: HarnessSelectedTranslationGlossary,
): string => [
  `TRANSLATION GLOSSARY REFERENCE (${selection.targetLanguage}) — ${selection.entries.length} of ${selection.availableEntryCount} installed entries selected for this chapter`,
  'Use these renderings for the listed terms in reader-facing content. Machine-facing fields stay in canonical English.',
  ...selection.entries.map(entry => {
    const aliases = entry.aliases?.length ? ` [also: ${entry.aliases.join(', ')}]` : '';
    const note = entry.note ? ` — ${entry.note}` : '';
    return `- ${entry.term}${aliases} → ${entry.translation}${note}`;
  }),
].join('\n');
