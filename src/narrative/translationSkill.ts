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
import type { HarnessSelectedTranslationGlossary, HarnessSkillManifest, HarnessTranslationGlossaryEntry, HarnessTranslationGlossaryResource, HarnessTranslationSkillMetadata, ImmediateChapterRequest, StoryInformationPacket } from './generation';

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

/**
 * Whether a Translation skill may be equipped on a story. Compatibility is
 * decided by the story's permanent Original Language, never by reader
 * preference or skill naming.
 */
export const isTranslationSkillCompatible = (
  skill: HarnessSkillManifest,
  storyOriginalLanguage: SenLanguageCode,
): boolean => translationTargetLanguage(skill) === storyOriginalLanguage;

export const translationCompatibilityError = (
  skill: HarnessSkillManifest,
  storyOriginalLanguage: SenLanguageCode,
): string =>
  `${skill.name} translates into ${translationTargetLanguage(skill) ?? 'no declared language'}, but this story's Original Language is ${storyOriginalLanguage}. Install a Translation skill for ${storyOriginalLanguage} or leave the slot empty.`;

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
    ...story.authorDirections.map(direction => direction.direction),
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
    immediateChapterRequest.assignment,
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
