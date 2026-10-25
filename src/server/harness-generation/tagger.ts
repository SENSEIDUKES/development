import {
  HARNESS_TAG_RULES,
  SEN_APPEARANCE_INSTRUCTIONS,
  SEN_HOLDINGS_INSTRUCTIONS,
  SEN_SOUNDTRACK_INSTRUCTIONS,
  SEN_SOUND_CUES_INSTRUCTIONS,
  SEN_SPEAKERS_INSTRUCTIONS,
  presentSoundVocabulary,
  presentSoundtrackVocabulary,
  type HarnessGenerationResponse,
  type HarnessTagRequest,
  type HarnessTagSubject,
} from '@seihouse/sen/harness-generation';
import { resolveConfiguredHarnessModel, type ResolvedHarnessGenerationConfig } from './config';
import { createHarnessTextProvider } from './provider';
import { HarnessGenerationExecutionError, type HarnessProviderFactory } from './execute';
import { lowestReasoningLevel, requireTextModelKey } from '../model-router/catalog';

/**
 * The tagger (SENSEI, 2026-10-24): one call that reads a chapter already
 * written and writes the app's tags into it. "If you take the AI generation of
 * the novel out, this tagger needs to be able to still tag the story with
 * sound cues, etc." — so it is told nothing about how the story got here. The
 * chapter, who and what already exists, what each character was carrying, and
 * the words it may name; no Foundation, no arc, no packet.
 *
 * It teaches the tags from the same skills the writer reads
 * (`SEN_*_INSTRUCTIONS`), so the tag language has one owner and the writer's
 * own words do not change. Those skills were written for an author writing the
 * chapter, and one HARNESS sentence re-points them at finished prose
 * (`HARNESS_TAGGER_READING`, approved 2026-10-25).
 *
 * The chapter comes back as the same paragraphs with tags written in, which is
 * what lets the HARNESS prove the prose was not touched: it strips every tag
 * the way it always has and checks each paragraph against the one it sent.
 */

/** Who the tagger is and what its job is, said first (SENSEI approved, 2026-10-25). */
export const HARNESS_TAGGER_ROLE = [
  'You tag a finished chapter of a novel. The chapter is already written and is not yours to change: you add the app\'s tags to it, and nothing else. A tag marks where something happens in the prose — a sound, who speaks, a change to what someone has, someone stepping onto the page — so the app can play it, voice it and record it.',
].join('\n\n');

/**
 * The one sentence that re-points the tag skills at finished prose (SENSEI
 * approved, 2026-10-25). The skills say "your sentence", "wrap its own words"
 * and "describe them there", because an author writing the chapter reads them;
 * a tagger cannot describe anything. Rather than rewrite five sets of approved
 * words, and change what the writer reads in the process, this says it once.
 */
export const HARNESS_TAGGER_READING = 'The tag teaching below was written for the author writing the chapter. Where it tells you to write, wrap or describe something, tag what the finished prose already says, where it says it; where it points at Story Information, the names it means are the ones listed below.';

/** What the tagger hands back (SENSEI approved, 2026-10-25). */
export const HARNESS_TAGGER_RETURN = 'Return every paragraph, in order, with its tags written in: the same count, and each one\'s words exactly as they arrived, to the letter and the space. Never reword, correct, shorten, join or split a paragraph, and never write a paragraph of your own. A paragraph with nothing to tag comes back unchanged. The app removes every tag before anyone reads, and checks each paragraph against the one it sent: a paragraph whose words changed has its tags dropped.';

const HEADINGS = {
  role: '# WHAT YOU DO',
  reading: '# HOW TO READ THE TAG TEACHING',
  tagging: '# THE TAGS',
  returning: '# HOW TO RETURN THE CHAPTER',
} as const;

/**
 * The tag teaching, in the order the tags read: the HARNESS rules that hold
 * for every kind, then one section per kind the story actually uses. A story
 * with no sound words is never taught to tag a sound it cannot name.
 */
export const presentTaggerTagTeaching = (request: Pick<HarnessTagRequest, 'soundWords' | 'soundtrack'>) => {
  const soundWords = request.soundWords ?? [];
  const soundtrack = request.soundtrack;
  const hasSoundtrack = Boolean(soundtrack?.music?.length || soundtrack?.atmospheres?.length);
  return [
    HARNESS_TAG_RULES,
    SEN_SPEAKERS_INSTRUCTIONS,
    SEN_HOLDINGS_INSTRUCTIONS,
    SEN_APPEARANCE_INSTRUCTIONS,
    ...(soundWords.length ? [[SEN_SOUND_CUES_INSTRUCTIONS, presentSoundVocabulary(soundWords)].filter(Boolean).join('\n')] : []),
    ...(hasSoundtrack ? [[SEN_SOUNDTRACK_INSTRUCTIONS, presentSoundtrackVocabulary(soundtrack!)].filter(Boolean).join('\n')] : []),
  ].join('\n\n');
};

/**
 * Who and what the story already has, one per line under its kind. This is the
 * list that keeps a tag from inventing a second identity for someone the
 * record already holds.
 */
export const presentTagSubjects = (subjects: readonly HarnessTagSubject[]) => {
  const groups: Array<[HarnessTagSubject['kind'], string]> = [['character', 'CHARACTERS'], ['thing', 'THINGS'], ['ability', 'ABILITIES']];
  const lines = groups.flatMap(([kind, label]) => {
    const of = subjects.filter(subject => subject.kind === kind);
    if (!of.length) return [];
    return [[`${label}:`, ...of.map(subject => [
      `- ${subject.name}`,
      subject.mainCharacter ? ' (the main character)' : '',
      subject.aliases?.length ? ` — also called: ${subject.aliases.join(', ')}` : '',
    ].join(''))].join('\n')];
  });
  return lines.length ? lines.join('\n\n') : 'The story has nothing recorded yet: tag by the names the chapter itself uses.';
};

/** What each character was carrying going into this chapter, so nothing already theirs reads as newly got. */
export const presentTagHoldings = (holdings: HarnessTagRequest['holdings']) => {
  const characters = holdings?.characters ?? [];
  if (!characters.length) return 'Nothing is recorded yet.';
  return characters.map(character => {
    const lists = ([['in hand', character.inHand], ['carries', character.carries], ['knows', character.knows], ['learning', character.learning]] as const)
      .filter(([, items]) => items?.length).map(([label, items]) => `- ${label}: ${items!.join('; ')}`);
    const name = `${character.name}${character.mainCharacter ? ' (main character)' : ''}`;
    if (!character.rank && !lists.length) return `${name}: nothing recorded.`;
    return [`${name}${character.rank ? ` · rank: ${character.rank}` : ''}`, ...lists].join('\n');
  }).join('\n\n');
};

/**
 * The chapter as the tagger reads it: one numbered paragraph per line, so the
 * answer can be lined up against it paragraph for paragraph.
 */
export const presentTagChapter = (paragraphs: readonly string[]) =>
  paragraphs.map((paragraph, index) => `${index + 1}. ${paragraph}`).join('\n\n');

/** One entry per paragraph, in reading order. Non-strict, like every HARNESS schema. */
export const TAGGER_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    paragraphs: {
      type: 'array',
      items: { type: 'string' },
      description: 'Every paragraph of the chapter, in order, with its tags written in and its words otherwise unchanged.',
    },
  },
  required: ['paragraphs'],
} as const;

/** The most paragraphs one chapter may send to be tagged. */
export const TAG_PARAGRAPH_LIMIT = 400;
/** The most characters one paragraph may carry. */
export const TAG_PARAGRAPH_CHARACTERS = 8_000;
/** The most names the tagger is given, and the longest one. */
export const TAG_SUBJECT_LIMIT = 600;
export const TAG_NAME_CHARACTERS = 200;

/** How long one tagging call may take, at most. */
export const TAGGER_TIMEOUT_MS = 120_000;

export const buildHarnessTagPrompt = (request: HarnessTagRequest) => ({
  systemInstruction: [
    HEADINGS.role, HARNESS_TAGGER_ROLE,
    HEADINGS.reading, HARNESS_TAGGER_READING,
    HEADINGS.tagging, presentTaggerTagTeaching(request),
    HEADINGS.returning, HARNESS_TAGGER_RETURN,
  ].join('\n\n'),
  userPrompt: [
    `CHAPTER ${request.chapterNumber} · Language: ${request.language} · ${request.paragraphs.length} paragraph${request.paragraphs.length === 1 ? '' : 's'}`,
    ['WHO AND WHAT THE STORY ALREADY HAS (tag by these names, never a new one for someone already here)', presentTagSubjects(request.subjects)].join('\n'),
    ['WHAT EACH CHARACTER HAD GOING INTO THIS CHAPTER', presentTagHoldings(request.holdings)].join('\n'),
    ['THE CHAPTER', presentTagChapter(request.paragraphs)].join('\n'),
    `Return the ${request.paragraphs.length} paragraphs with their tags written in, and nothing else. Do not return the numbers.`,
  ].join('\n\n'),
  responseJsonSchema: TAGGER_RESPONSE_SCHEMA,
});

export const executeHarnessTagging = async (
  request: HarnessTagRequest,
  config: ResolvedHarnessGenerationConfig,
  providerFactory?: HarnessProviderFactory,
): Promise<HarnessGenerationResponse> => {
  const model = resolveConfiguredHarnessModel(request.model, config);
  const apiKey = requireTextModelKey(model, config.keys);
  const provider = providerFactory ? providerFactory({ apiKey, model }) : createHarnessTextProvider(model, config);
  const prompt = buildHarnessTagPrompt(request);
  try {
    return await provider.generate({
      systemInstruction: prompt.systemInstruction,
      userPrompt: prompt.userPrompt,
      responseJsonSchema: prompt.responseJsonSchema,
      reasoningLevel: lowestReasoningLevel(model),
      temperature: 0,
      maxOutputTokens: config.maxOutputTokens,
      timeoutMs: Math.min(config.timeoutMs, TAGGER_TIMEOUT_MS),
    });
  } catch (error) {
    throw new HarnessGenerationExecutionError(error);
  }
};
