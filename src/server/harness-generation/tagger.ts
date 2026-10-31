import {
  HARNESS_TAG_RULES,
  SEN_APPEARANCE_INSTRUCTIONS,
  SEN_HOLDINGS_INSTRUCTIONS,
  SEN_SOUNDTRACK_INSTRUCTIONS,
  SEN_SOUND_CUES_INSTRUCTIONS,
  SEN_SPEAKERS_INSTRUCTIONS,
  SEN_STATUS_INSTRUCTIONS,
  presentSoundVocabulary,
  presentSoundtrackVocabulary,
  type HarnessGenerationResponse,
  type HarnessTagRequest,
  type HarnessTagSubject,
} from '@seihouse/sen/harness-generation';
import { resolveConfiguredHarnessModel, type ResolvedHarnessGenerationConfig } from './config';
import { createHarnessTextProvider } from './provider';
import { HarnessGenerationExecutionError, type HarnessProviderFactory } from './execute';
import { CHAPTER_MODELS, lowestReasoningLevel, requireTextModelKey, type ReasoningLevel } from '../model-router/catalog';

/**
 * The tagger (SENSEI, 2026-10-24): one call that reads a chapter already
 * written and writes the app's tags for it. "If you take the AI generation of
 * the novel out, this tagger needs to be able to still tag the story with
 * sound cues, etc." — so it is told nothing about how the story got here. The
 * chapter, who and what already exists, what each character was carrying, and
 * the words it may name; no Foundation, no arc, no packet.
 *
 * It writes in the margin, never on the page (SENSEI, 2026-10-29: "You write
 * a page. Your teacher looks over it, writes marks. The page is never
 * retyped."). Its answer is a list of notes, each naming a paragraph, the exact
 * words the tag belongs to, and the tag; the HARNESS places every note on the
 * chapter's own paragraphs (`placeTagNotes`), so the tagger never holds a copy
 * of the prose and cannot change a word of it. The tag teaching below is
 * written for that reader: a tagger with the finished chapter in front of it.
 */

/** Who the tagger is and what its job is, said first. */
export const HARNESS_TAGGER_ROLE = [
  'You tag a finished chapter of a novel. The chapter is already written and is not yours to change: you write the app\'s tags beside it, as notes in the margin, and nothing else. A tag marks where something happens in the prose — a sound, who speaks, a change to what someone has, someone stepping onto the page, how someone is now — so the app can play it, voice it and record it.',
].join('\n\n');

/** What the tagger hands back: notes, never the chapter. */
export const HARNESS_TAGGER_RETURN = 'Return a list of notes, in reading order, and nothing else. Each note has three parts: "paragraph", the number of the paragraph as it is given below; "words", the exact words the tag belongs to, copied from that paragraph to the letter, enough of them to be found once in it; and "tag", the tag itself. Never return the chapter or any paragraph of it, and never write prose of your own. A paragraph with nothing to tag gets no note. The app places each note on the words it names: a note whose words are not in its paragraph, or are in it more than once, is dropped on its own, and every other note stands.';

const HEADINGS = {
  role: '# WHAT YOU DO',
  tagging: '# THE TAGS',
  returning: '# HOW TO RETURN YOUR NOTES',
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
    SEN_STATUS_INSTRUCTIONS,
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
      subject.status ? ` — status: ${subject.status}` : '',
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
 * The chapter as the tagger reads it: one numbered paragraph per line. The
 * number is what a note names.
 */
export const presentTagChapter = (paragraphs: readonly string[]) =>
  paragraphs.map((paragraph, index) => `${index + 1}. ${paragraph}`).join('\n\n');

/** A list of notes, each on one paragraph. Non-strict, like every HARNESS schema. */
export const TAGGER_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      description: 'One note per tag, in reading order. Empty when the chapter has nothing to tag.',
      items: {
        type: 'object',
        properties: {
          paragraph: { type: 'integer', description: 'The number of the paragraph, as given.' },
          words: { type: 'string', description: 'The exact words in that paragraph the tag belongs to, copied to the letter. Empty only for a soundscape or atmosphere tag.' },
          tag: { type: 'string', description: 'The tag, such as [[@MC]], [[gained: MC | Iron Key]] or [[sound: growl | low]].' },
        },
        required: ['paragraph', 'words', 'tag'],
      },
    },
  },
  required: ['notes'],
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

/**
 * How hard the tagger thinks: the level the Router's Chapter Tagger choice
 * asked for, when the model offers it; otherwise as little as the model
 * allows, as before. A level the model does not offer is dropped, never a
 * reason to refuse the tagging.
 */
export const taggerReasoningLevel = (model: string, requested: unknown): ReasoningLevel | undefined =>
  CHAPTER_MODELS.find(option => option.id === model)?.reasoning?.levels.find(level => level === requested) ?? lowestReasoningLevel(model);

export const buildHarnessTagPrompt = (request: HarnessTagRequest) => ({
  systemInstruction: [
    HEADINGS.role, HARNESS_TAGGER_ROLE,
    HEADINGS.tagging, presentTaggerTagTeaching(request),
    HEADINGS.returning, HARNESS_TAGGER_RETURN,
  ].join('\n\n'),
  userPrompt: [
    `CHAPTER ${request.chapterNumber} · Language: ${request.language} · ${request.paragraphs.length} paragraph${request.paragraphs.length === 1 ? '' : 's'}`,
    ['WHO AND WHAT THE STORY ALREADY HAS (tag by these names, never a new one for someone already here)', presentTagSubjects(request.subjects)].join('\n'),
    ['WHAT EACH CHARACTER HAD GOING INTO THIS CHAPTER', presentTagHoldings(request.holdings)].join('\n'),
    ['THE CHAPTER', presentTagChapter(request.paragraphs)].join('\n'),
    `Return your notes on these ${request.paragraphs.length} paragraphs, and nothing else.`,
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
      reasoningLevel: taggerReasoningLevel(model, request.reasoningLevel),
      temperature: 0,
      maxOutputTokens: config.maxOutputTokens,
      timeoutMs: Math.min(config.timeoutMs, TAGGER_TIMEOUT_MS),
    });
  } catch (error) {
    throw new HarnessGenerationExecutionError(error);
  }
};
