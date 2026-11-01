import { modelJsonCandidates } from '../../../narrative/modelJson';
import { chapterTitleFallback, defaultHarnessRuntime, stableHarnessId, type HarnessRuntime } from './ids';
import type { FrozenNarrativeMedia } from '../../../audio/media';
import { describeSetAsideSoundCue, placeSoundCues } from '../../../audio/soundCuePlacement';
import type { SoundWord } from '../../../audio/soundWords';
import type { SoundCueAttachment } from '../../../audio/inlineAudio';
import { isAppearanceTagWord, isHoldingTagWord, isStatusTagWord, readMarks, type MarkReading, type WordTag } from '../../../narrative/marks';
import { settleStraySoundTags } from './soundTagRepair';
import type { SpeakerAttachment } from '../../../narrative/speech';
import { chapterTitleText } from '../../../narrative/chapterTitle';
import type { HoldingChangeAttachment } from '../../../narrative/holdings';
import type { AppearanceAttachment } from '../../../narrative/appearances';
import type { StatusAttachment } from '../../../narrative/statuses';
import { isMainCharacterTag, isProtagonist, placeSpeakers, type ProtagonistNames } from './speakers';
import { holdingName, placeHoldingChanges } from './holdings';
import { placeAppearances } from './appearances';
import { placeStatuses } from './statuses';
import { chapterSoundtrack } from './soundtrack';
import { normalizeIdentityLabel } from './canonicalProjection';
import { ignoredSoundCueListWarning, stripReplyMarks } from './chapterSignals';
import {
  harnessChapterBody,
  harnessChapterBodyWarnings,
  harnessFailedWrite,
  harnessParagraphBlockId,
  normalizeHarnessParagraphs,
  splitHarnessProseParagraphs,
} from './chapterBody';
import { HARNESS_MEMORY_CATEGORIES } from '../../../narrative/generation';
import { CHAPTER_FUNCTIONS, CHAPTER_RECAP_TEXT_LIMIT, isChapterFunction, type ChapterFunction, type NextChapterSuggestions } from '../../../narrative/storyDirection';
import type { HarnessAcceptedChapterDraft, HarnessChapterRhythm, HarnessChapterScene, HarnessModelPlan, HarnessWarning, HarnessCanonicalKind } from '../../../narrative/generation';

type ParsedResponse = {
  accepted: true;
  draft: HarnessAcceptedChapterDraft;
  /** Chapter memory comes from the separate extraction call; the chapter reply carries none. */
  warnings: HarnessWarning[];
} | {
  accepted: false;
  reason: string;
  warnings: HarnessWarning[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const stringList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const values = value.map(nonEmptyString).filter((entry): entry is string => Boolean(entry));
  return values.length ? values : undefined;
};

const parseJsonObject = (raw: string): Record<string, unknown> | undefined => {
  for (const candidate of modelJsonCandidates(raw)) {
    try {
      const parsed = JSON.parse(candidate);
      if (isRecord(parsed)) return parsed;
    } catch {
      // A plain-prose recovery is deliberately evaluated below.
    }
  }
  return undefined;
};

const looksLikeRefusal = (value: string) =>
  /^(?:i(?:'m| am)?\s+(?:sorry[,;:]?\s*)?(?:unable|not able)|i cannot|i can't|this request|content policy|safety policy)/i
    .test(value.trim());

const looseJsonString = (value: string): string => {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
};

const recoverPlainProse = (raw: string): string | undefined => {
  const trimmed = raw.trim();
  const embeddedProse = trimmed.match(/"prose"\s*:\s*"((?:\\.|[^"\\])*)/s)?.[1];
  const candidate = embeddedProse === undefined
    ? trimmed.replace(/^```(?:text|markdown)?\s*/i, '').replace(/\s*```$/, '').trim()
    : looseJsonString(embeddedProse).trim();
  if (!candidate || looksLikeRefusal(candidate)) return undefined;
  // An invalid JSON envelope without a recoverable prose field is not prose.
  if ((candidate.startsWith('{') || candidate.startsWith('[')) && embeddedProse === undefined) return undefined;
  return /[\p{L}\p{N}]/u.test(candidate) ? candidate : undefined;
};

const appendIgnoredIdentityWarning = (
  source: Record<string, unknown>,
  warnings: HarnessWarning[],
) => {
  const ignored = [
    'id', 'storyId', 'runId', 'attemptId', 'chapterId', 'blockId', 'eventId',
    'chapterNumber', 'chapterIndex', 'continuation', 'provider', 'model',
  ].filter(key => source[key] !== undefined);
  if (ignored.length) {
    warnings.push({
      code: 'ignored_model_identity',
      message: `The harness ignored model-supplied ${ignored.join(', ')}; identity and ordering are application-owned.`,
    });
  }
};

const parsePlan = (value: unknown, warnings: HarnessWarning[]): HarnessModelPlan | undefined => {
  const prosePlan = nonEmptyString(value);
  if (prosePlan) return prosePlan;
  if (isRecord(value)) {
    const intent = nonEmptyString(value.intent);
    const beats = stringList(value.beats);
    if (intent || beats) return { ...(intent ? { intent } : {}), ...(beats ? { beats } : {}) };
  }
  if (value !== undefined && value !== null) {
    warnings.push({
      code: 'invalid_plan_omitted',
      message: 'The optional creative plan could not be read and was omitted.',
    });
  }
  return undefined;
};

/** Story direction is author-owned: a chapter reply can never write it. */
const STORY_DIRECTION_FIELDS = ['hardPins', 'fatePressure', 'destinedEnding', 'rhythmRecommendation'] as const;

const appendIgnoredStoryDirectionWarning = (source: Record<string, unknown>, warnings: HarnessWarning[]) => {
  const ignored = STORY_DIRECTION_FIELDS.filter(key => source[key] !== undefined);
  if (ignored.length) {
    warnings.push({
      code: 'ignored_model_story_direction',
      message: `The harness ignored model-supplied ${ignored.join(', ')}; Hard Pins, Fate Pressure, and the Destined Ending are author-owned story direction.`,
    });
  }
};

/** The optional "Previously On" recap: a short string, or a warning and nothing. */
const parseRecap = (value: unknown, warnings: HarnessWarning[]): string | undefined => {
  const recap = nonEmptyString(value);
  if (recap) {
    if (recap.length > CHAPTER_RECAP_TEXT_LIMIT) {
      warnings.push({
        code: 'optional_recap_omitted',
        message: `The recap ran past ${CHAPTER_RECAP_TEXT_LIMIT} characters and was kept for editing; shorten it before it is reused.`,
      });
    }
    return recap;
  }
  warnings.push({
    code: 'optional_recap_omitted',
    message: value === undefined
      ? 'The provider omitted the chapter recap; the chapter is kept and a recap can be written by hand.'
      : 'The provider recap was malformed and was omitted; the chapter is kept and a recap can be written by hand.',
  });
  return undefined;
};

/** The suggestion field names requested from the writer, one per chapter function. */
export const NEXT_CHAPTER_SUGGESTION_FIELDS: Record<ChapterFunction, string> = {
  progression: 'nextProgression',
  worldBuilding: 'nextWorldBuilding',
  conflict: 'nextConflict',
};

const rhythmWarning = (message: string): HarnessWarning => ({ code: 'optional_rhythm_metadata_omitted', message });

/**
 * Reads the completed chapter's function and the three next-chapter
 * possibilities. Each piece is validated on its own so one malformed value
 * never discards the others, and none of them can reject the prose.
 */
const parseRhythm = (parsed: Record<string, unknown>, warnings: HarnessWarning[]): HarnessChapterRhythm | undefined => {
  const rhythm: HarnessChapterRhythm = {};
  if (isChapterFunction(parsed.chapterFunction)) rhythm.chapterFunction = parsed.chapterFunction;
  else warnings.push(rhythmWarning(parsed.chapterFunction === undefined
    ? 'The provider omitted the completed chapter function; the rhythm history skips this chapter.'
    : `The provider chapter function was not one of ${CHAPTER_FUNCTIONS.join(', ')} and was omitted; the rhythm history skips this chapter.`));
  const suggestions: NextChapterSuggestions = {};
  for (const type of CHAPTER_FUNCTIONS) {
    const field = NEXT_CHAPTER_SUGGESTION_FIELDS[type];
    const text = nonEmptyString(parsed[field]);
    if (text && !/[\r\n]/.test(text)) suggestions[type] = text;
    else warnings.push(rhythmWarning(parsed[field] === undefined
      ? `The provider omitted the ${type} suggestion (${field}); the chapter is kept without it.`
      : `The provider ${type} suggestion (${field}) was malformed and was omitted; the chapter is kept without it.`));
  }
  if (Object.keys(suggestions).length) rhythm.nextChapterSuggestions = suggestions;
  return rhythm.chapterFunction || rhythm.nextChapterSuggestions ? rhythm : undefined;
};

/**
 * Reads a memory extraction reply. A readable extraction that reports no
 * developments is a legitimate result — a chapter can establish no new memory —
 * so it returns an empty list. Only a reply carrying no extraction at all
 * (neither the grouped memory object nor an event list) is unreadable.
 */
export const readHarnessMemoryEvents = (raw: string): unknown[] => {
  const parsed = parseJsonObject(raw);
  const extraction = parsed ? memoryExtraction(parsed) : undefined;
  if (!extraction) {
    throw new Error('Memory recovery returned no event list. Saved prose is unchanged.');
  }
  return extraction;
};

const memoryExtraction = (parsed: Record<string, unknown>): unknown[] | undefined => {
  if (!isRecord(parsed.memory)) return Array.isArray(parsed.events) ? parsed.events : undefined;
  const result: unknown[] = [];
  for (const [bucket, category] of Object.entries(HARNESS_MEMORY_CATEGORIES)) {
    const entries = parsed.memory[bucket];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) { result.push(entries); continue; }
    for (const entry of entries) result.push(isRecord(entry) ? { ...entry, category } : entry);
  }
  return result;
};

export interface HarnessResponseAcceptanceOptions {
  /** The attempt's frozen Media Loadout: the recordings a Sound Cue may use. */
  media?: FrozenNarrativeMedia;
  /** The sound words the writer was given (frozen on the CAPA Prompt). Without them no Sound Cue is placed. */
  soundVocabulary?: readonly SoundWord[];
  /** The story's language, for word edges. */
  locale?: string;
  /** The exact paragraph count the attempt asked for; a miss is kept and flagged. */
  paragraphTarget?: number;
  /**
   * The fewest words the attempt asked for. A reply far below it is a failed
   * write and is not accepted (`harnessFailedWrite`); a merely short one is kept and flagged.
   */
  minWords?: number;
  /** The main character's names, from the attempt's frozen Story Information: whose lines are the protagonist's. */
  protagonistNames?: ProtagonistNames;
  /** The writer was asked for speaker tags, so speech it left untagged is worth flagging. */
  speakersExpected?: boolean;
  /** The writer was asked for holdings tags and a closing list, so a missing list is worth flagging. */
  holdingsExpected?: boolean;
  /**
   * The writer was asked for appears and look tags, so the chapter keeps its
   * appearances even when it has none: the rules then know it was asked.
   */
  appearancesExpected?: boolean;
  /** The writer was asked to choose the chapter's soundtrack, so a chapter without one is worth flagging. */
  soundtrackExpected?: boolean;
}

/**
 * Reads the authoritative chapter body. `paragraphs` is the model-authored
 * body and the only field the response schema requests. A reply that carries
 * readable prose without it is still recovered rather than lost.
 */
const acceptedChapterBody = (
  parsed: Record<string, unknown>,
  warnings: HarnessWarning[],
): string[] | undefined => {
  const paragraphs = normalizeHarnessParagraphs(parsed.paragraphs);
  if (paragraphs) {
    if (parsed.prose !== undefined) {
      warnings.push({
        code: 'competing_prose_ignored',
        message: 'The harness ignored a prose field because the paragraphs array is the authoritative chapter body.',
      });
    }
    return paragraphs;
  }
  const prose = nonEmptyString(parsed.prose);
  if (!prose) return undefined;
  warnings.push({
    code: 'chapter_body_recovered',
    message: 'The provider returned chapter prose without the requested paragraphs array; the harness recovered its paragraphs from the blank lines in that prose.',
  });
  return splitHarnessProseParagraphs(prose);
};

/**
 * Reads the writer's tags out of every paragraph. The chapter keeps only the
 * clean text; each paragraph keeps the positions of its tags for placement.
 * Given the story's sound words, a sound tag written the other way round is
 * read the right way. A sound tag's words written beside a sentence rather
 * than inside one are removed and its sound moved to the nearby sentence
 * (`settleStraySoundTags`). A paragraph that held nothing but a tag is dropped; a
 * tag written alone in its own paragraph moves to the start of the next one.
 * A speaker tag with no paragraph after it is counted as naming no speech; a
 * word tag with none goes to the end of the last paragraph, where its change
 * happened. Numbered marks (`[[1|words]]`) are a retired form: they are
 * removed with their words kept, and nothing is placed from them.
 */
const readParagraphMarks = (
  paragraphs: readonly string[],
  warnings: HarnessWarning[],
  soundWords?: readonly SoundWord[],
  locale?: string,
  /**
   * Whether to settle a sound tag written beside its sentence instead of around
   * its words. It is a recovery for the chapter writer, which invents the words
   * it wraps and sometimes writes them outside the prose. The tagger wraps
   * words that are already in the chapter, so there is nothing stray to settle
   * and the repair would delete a paragraph that is only its sound ("BOOM").
   */
  { repairStraySounds = true }: { repairStraySounds?: boolean } = {},
) => {
  const read: MarkReading[] = [];
  let loose: MarkReading['speakers'] = [];
  let looseWords: WordTag[] = [];
  // The chapter's soundtrack tags in reading order, a paragraph that held nothing else included.
  const soundtracks: MarkReading['soundtracks'] = [];
  // Unreadable word tags, counted where each kind is reported: appearance and status tags apart from the rest.
  let wordTagIssues = 0;
  let appearanceTagIssues = 0;
  let statusTagIssues = 0;
  let soundTagIssues = 0;
  const options = soundWords?.length ? { soundWords: soundWords.map(sound => sound.word) } : {};
  // A sound tag written beside its sentence instead of around its words leaves no stray words behind.
  const read_ = paragraphs.map(paragraph => readMarks(paragraph, options));
  const settled = repairStraySounds
    ? settleStraySoundTags(read_, locale)
    : { readings: read_, moved: 0, removed: 0 };
  if (settled.removed) {
    warnings.push({
      code: 'sound_tag_moved',
      message: `${settled.removed} sound tag${settled.removed === 1 ? ' was' : 's were'} written beside a sentence instead of around its words: the tag's own words were removed${settled.moved ? `, ${settled.moved === settled.removed ? 'each' : settled.moved} sound moved onto nearby words that say it` : ''}${settled.moved < settled.removed ? `, and ${settled.removed - settled.moved} with no such words ${settled.removed - settled.moved === 1 ? 'was' : 'were'} dropped` : ''}.`,
    });
  }
  for (const reading of settled.readings) {
    for (const issue of reading.wordTagIssues) {
      if (issue.kind !== 'unknown' && isAppearanceTagWord(issue.word)) appearanceTagIssues += 1;
      else if (issue.kind !== 'unknown' && isStatusTagWord(issue.word)) statusTagIssues += 1;
      else wordTagIssues += 1;
    }
    soundTagIssues += reading.soundIssues.length;
    soundtracks.push(...reading.soundtracks);
    if (!reading.text) {
      loose = [...loose, ...reading.speakers.map(tag => ({ ...tag, offset: 0 }))];
      looseWords = [...looseWords, ...reading.wordTags.map(tag => ({ ...tag, offset: 0 }))];
      continue;
    }
    read.push(loose.length || looseWords.length
      ? { ...reading, speakers: [...loose, ...reading.speakers], wordTags: [...looseWords, ...reading.wordTags] }
      : reading);
    loose = [];
    looseWords = [];
  }
  const last = read.at(-1);
  if (last && looseWords.length) read[read.length - 1] = { ...last, wordTags: [...last.wordTags, ...looseWords.map(tag => ({ ...tag, offset: last.text.length }))] };
  const strandedTags = loose.length;
  const retired = read.reduce((count, reading) => count + reading.marks.length + reading.issues.length, 0);
  if (retired) {
    warnings.push({
      code: 'prose_marks_removed',
      message: `Removed ${retired} numbered mark${retired === 1 ? '' : 's'}, a retired form that places nothing, and kept ${retired === 1 ? 'its' : 'their'} words.`,
    });
  }
  if (soundTagIssues) {
    warnings.push({
      code: 'sound_cue_set_aside',
      message: `Removed ${soundTagIssues} unusable sound tag${soundTagIssues === 1 ? '' : 's'} (unclosed, nested, empty, or naming no sound or no words) and kept the prose.`,
    });
  }
  return { read, strandedTags, wordTagIssues, appearanceTagIssues, statusTagIssues, soundtracks };
};

/**
 * The chapter's scene from its soundtrack tag (`chapterSoundtrack`): the first
 * counts, and what it chose plays for the whole chapter. What could not be
 * used is flagged, never fatal; without a choice the Reader goes on with the
 * scene before.
 */
const acceptedScene = (
  tags: MarkReading['soundtracks'],
  chapterNumber: number,
  warnings: HarnessWarning[],
  options: HarnessResponseAcceptanceOptions,
): HarnessChapterScene | undefined => {
  const reading = chapterSoundtrack(tags, options.media, chapterNumber);
  const problems = [
    ...(!tags.length && options.soundtrackExpected ? ['the tagger chose no soundtrack, so the Reader goes on with the one before'] : []),
    ...(reading.unknown.length ? [`${reading.unknown.map(word => `“${word}”`).join(' and ')} ${reading.unknown.length === 1 ? 'is' : 'are'} not in the story's soundtrack words and ${reading.unknown.length === 1 ? 'was' : 'were'} not used`] : []),
    ...(tags.length && options.soundtrackExpected && !tags.some(tag => tag.kind !== 'atmosphere') ? ['the tagger chose no soundscape, so the music goes on from the chapter before'] : []),
    ...(tags.length && options.soundtrackExpected && !tags.some(tag => tag.kind !== 'soundscape') ? ['the tagger chose no atmosphere, so the one before goes on'] : []),
    ...(reading.extra ? [`${reading.extra} more soundtrack tag${reading.extra === 1 ? ' was' : 's were'} removed: only the first soundscape and the first atmosphere count`] : []),
  ];
  if (problems.length) warnings.push({ code: 'soundtrack_incomplete', message: `${problems.join('; ')}.`.replace(/^./, letter => letter.toUpperCase()) });
  return reading.scene;
};

/**
 * Places the writer's Sound Cues on the clean paragraphs, from their sound
 * tags, through the story's frozen sound words and recordings. Every tag it
 * cannot place is set aside with a plain reason; prose is never touched.
 */
const acceptedSoundCues = (
  paragraphs: ReadonlyArray<Pick<MarkReading, 'text' | 'sounds'>>,
  chapterNumber: number,
  warnings: HarnessWarning[],
  options: HarnessResponseAcceptanceOptions,
): SoundCueAttachment[] => {
  const tagged = paragraphs.reduce((count, paragraph) => count + paragraph.sounds.length, 0);
  if (!tagged) return [];
  if (!options.soundVocabulary?.length) {
    warnings.push({
      code: 'sound_cue_set_aside',
      message: `Set aside ${tagged} sound tag${tagged === 1 ? '' : 's'}: this story has no sound words.`,
    });
    return [];
  }
  const placement = placeSoundCues({
    paragraphs: paragraphs.map((paragraph, index) => ({ blockId: harnessParagraphBlockId(chapterNumber, index), text: paragraph.text, sounds: paragraph.sounds })),
    vocabulary: options.soundVocabulary,
    recordings: options.media?.soundCues ?? [],
    chapterNumber,
    locale: options.locale,
  });
  for (const item of placement.setAside) warnings.push({ code: 'sound_cue_set_aside', message: describeSetAsideSoundCue(item) });
  return placement.soundCues;
};

/**
 * Gives every spoken line its speaker from the writer's tags. Speech left
 * untagged is voiced from its narration by Read Aloud, and is flagged when the writer was asked
 * for tags or tagged other lines; tags that named nobody or no speech are
 * flagged too. A chapter is never rejected for its speakers.
 */
const acceptedSpeakers = (
  marked: { read: ReadonlyArray<Pick<MarkReading, 'text' | 'speakers' | 'speakerIssues'>>; strandedTags: number },
  chapterNumber: number,
  warnings: HarnessWarning[],
  options: HarnessResponseAcceptanceOptions,
): SpeakerAttachment[] => {
  const placement = placeSpeakers({
    paragraphs: marked.read.map((paragraph, index) => ({ blockId: harnessParagraphBlockId(chapterNumber, index), ...paragraph })),
    protagonist: options.protagonistNames ?? { names: [], others: [] },
  });
  const nameless = marked.read.reduce((count, paragraph) => count + paragraph.speakerIssues.length, 0);
  const unused = placement.unused + marked.strandedTags;
  const tagged = placement.speakers.length > 0 || unused > 0 || nameless > 0 || placement.placeholders > 0;
  const problems = [
    ...(placement.placeholders ? [`${placement.placeholders} speaker tag${placement.placeholders === 1 ? '' : 's'} named a placeholder such as "Name" instead of a speaker and ${placement.placeholders === 1 ? 'was' : 'were'} read as no tag`] : []),
    ...((tagged || options.speakersExpected) && placement.untagged
      ? [`${placement.untagged} spoken line${placement.untagged === 1 ? ' had' : 's had'} no speaker tag; Read Aloud takes the speaker from the narration`] : []),
    ...(unused ? [`${unused} speaker tag${unused === 1 ? '' : 's'} named no spoken line`] : []),
    ...(nameless ? [`${nameless} speaker tag${nameless === 1 ? '' : 's'} named nobody and ${nameless === 1 ? 'was' : 'were'} removed`] : []),
  ];
  if (problems.length) warnings.push({ code: 'speaker_tags_incomplete', message: `${problems.join('; ')}.` });
  return placement.speakers;
};

/** One holding tag's change in words: its verb, who (the main character however named), and the thing, ability or rank. */
const holdingTagKey = (tag: WordTag, protagonist?: ProtagonistNames) => {
  const [holder = '', ...rest] = tag.parts;
  const who = isMainCharacterTag(holder) || (protagonist ? isProtagonist(holder, protagonist) : false) ? 'main character' : normalizeIdentityLabel(holder);
  const named = tag.word === 'rank' ? undefined : holdingName(rest[0] ?? '');
  const what = named && 'name' in named ? named.name : tag.word === 'rank' ? rest.join(' ') : rest[0] ?? '';
  return `${tag.word}|${who}|${normalizeIdentityLabel(what)}`;
};

/**
 * Reads the writer's holding tags into holding changes on the sentences they
 * point at, and its closing list of the main character's holdings. Tags it
 * cannot read, and a missing or malformed list, are flagged; the chapter is
 * never rejected for its holdings.
 */
const acceptedHoldings = (
  parsed: Record<string, unknown>,
  marked: { read: ReadonlyArray<Pick<MarkReading, 'text' | 'wordTags'>>; wordTagIssues: number },
  chapterNumber: number,
  warnings: HarnessWarning[],
  options: HarnessResponseAcceptanceOptions,
): { changes: HoldingChangeAttachment[]; closing?: string[] } => {
  const raw = parsed.mainCharacterHoldings;
  // Tags written into the closing list instead of the prose still record their change, at the chapter's end,
  // once: a tag the prose already holds, or the list repeats, is the same change and is not counted again.
  const listed = Array.isArray(raw) ? raw.map(nonEmptyString).filter((entry): entry is string => Boolean(entry)).map(entry => readMarks(entry)) : undefined;
  const recorded = new Set(marked.read.flatMap(paragraph => paragraph.wordTags).filter(tag => isHoldingTagWord(tag.word)).map(tag => holdingTagKey(tag, options.protagonistNames)));
  const listedTags = (listed?.flatMap(entry => entry.wordTags) ?? []).filter(tag => isHoldingTagWord(tag.word)).filter(tag => {
    const key = holdingTagKey(tag, options.protagonistNames);
    if (recorded.has(key)) return false;
    recorded.add(key);
    return true;
  });
  const paragraphs = marked.read.map((paragraph, index) => ({ blockId: harnessParagraphBlockId(chapterNumber, index), text: paragraph.text, wordTags: [...paragraph.wordTags] }));
  const last = paragraphs.at(-1);
  if (last && listedTags.length) last.wordTags.push(...listedTags.map(tag => ({ ...tag, offset: last.text.length })));
  const placement = placeHoldingChanges({ paragraphs, locale: options.locale });
  const closing = listed
    ? [...new Set(listed.flatMap(entry => entry.text || entry.wordTags.filter(tag => isHoldingTagWord(tag.word) && tag.word !== 'rank' && tag.parts[1]).map(tag => tag.parts[1])).filter(Boolean))]
    : undefined;
  const problems = [
    ...(listedTags.length ? [`${listedTags.length} tag${listedTags.length === 1 ? ' was' : 's were'} written in the closing list instead of the prose and ${listedTags.length === 1 ? 'was' : 'were'} recorded at the chapter's end`] : []),
    ...(marked.wordTagIssues ? [`${marked.wordTagIssues} tag${marked.wordTagIssues === 1 ? ' was' : 's were'} unreadable and removed`] : []),
    ...placement.problems,
    ...(raw !== undefined && !closing ? ['the closing list of the main character\'s holdings was not a list and was set aside'] : []),
    ...(raw === undefined && options.holdingsExpected ? ['the writer returned no closing list of the main character\'s holdings, so this chapter is not checked against one'] : []),
  ];
  if (problems.length) warnings.push({ code: 'holding_tags_incomplete', message: `${problems.join('; ')}.`.replace(/^./, letter => letter.toUpperCase()) });
  return { changes: placement.changes, ...(closing ? { closing } : {}) };
};

/**
 * Reads the writer's appears and look tags into appearances on the sentences
 * they point at. Tags it cannot read are flagged; the chapter is never
 * rejected for its appearances. A chapter written with the Appearance skill
 * keeps its appearances even when it has none.
 */
const acceptedAppearances = (
  marked: { read: ReadonlyArray<Pick<MarkReading, 'text' | 'wordTags'>>; appearanceTagIssues: number },
  chapterNumber: number,
  warnings: HarnessWarning[],
  options: HarnessResponseAcceptanceOptions,
): AppearanceAttachment[] | undefined => {
  const paragraphs = marked.read.map((paragraph, index) => ({ blockId: harnessParagraphBlockId(chapterNumber, index), text: paragraph.text, wordTags: paragraph.wordTags }));
  const placement = placeAppearances({ paragraphs, locale: options.locale });
  const unreadable = marked.appearanceTagIssues;
  const problems = [
    ...(unreadable ? [`${unreadable} appearance tag${unreadable === 1 ? ' was' : 's were'} unreadable and removed`] : []),
    ...placement.problems,
  ];
  if (problems.length) warnings.push({ code: 'appearance_tags_incomplete', message: `${problems.join('; ')}.`.replace(/^./, letter => letter.toUpperCase()) });
  return placement.appearances.length || options.appearancesExpected ? placement.appearances : undefined;
};

/**
 * Reads the status tags into statuses on the sentences they point at, as
 * appearances are read. Tags it cannot read are flagged, never a reason to
 * refuse a chapter. A chapter the tagger read keeps its statuses even when it
 * has none, so the record knows it was asked.
 */
const acceptedStatuses = (
  marked: { read: ReadonlyArray<Pick<MarkReading, 'text' | 'wordTags'>>; statusTagIssues: number },
  chapterNumber: number,
  warnings: HarnessWarning[],
  options: HarnessResponseAcceptanceOptions,
): StatusAttachment[] => {
  const paragraphs = marked.read.map((paragraph, index) => ({ blockId: harnessParagraphBlockId(chapterNumber, index), text: paragraph.text, wordTags: paragraph.wordTags }));
  const placement = placeStatuses({ paragraphs, locale: options.locale });
  const unreadable = marked.statusTagIssues;
  const problems = [
    ...(unreadable ? [`${unreadable} status tag${unreadable === 1 ? ' was' : 's were'} unreadable and removed`] : []),
    ...placement.problems,
  ];
  if (problems.length) warnings.push({ code: 'status_tags_incomplete', message: `${problems.join('; ')}.`.replace(/^./, letter => letter.toUpperCase()) });
  return placement.statuses;
};

/**
 * Reads the tags out of paragraphs that are already written, and places every
 * one of them: the tagger's path (`shared/tagger.ts`).
 *
 * It runs the same tag reading and the same placement the writer's reply goes
 * through, so a tag means exactly one thing however it got into the prose
 * (HARNESS_PRINCIPLES: everything writes the same manuscript attachments).
 * What it does not do is anything only a writer's reply carries: no title, no
 * recap, no closing holdings list, and so no check against one.
 *
 * The clean text it returns is what the prose reads as once every tag is
 * removed. The tagger's caller compares it to the paragraphs it sent, which is
 * how the HARNESS proves a tagger changed no word of the chapter.
 */
export const acceptChapterTags = (
  paragraphs: readonly string[],
  chapterNumber: number,
  warnings: HarnessWarning[],
  options: HarnessResponseAcceptanceOptions = {},
) => {
  const marked = readParagraphMarks(paragraphs, warnings, options.soundVocabulary, options.locale, { repairStraySounds: false });
  // No reply field to read a closing list from: the tagger never returns one.
  const holdings = acceptedHoldings({}, marked, chapterNumber, warnings, options);
  return {
    /** The paragraphs as they read with every tag removed. */
    paragraphs: marked.read.map(reading => reading.text),
    soundCues: acceptedSoundCues(marked.read, chapterNumber, warnings, options),
    speakers: acceptedSpeakers(marked, chapterNumber, warnings, options),
    holdingChanges: holdings.changes,
    appearances: acceptedAppearances(marked, chapterNumber, warnings, options),
    statuses: acceptedStatuses(marked, chapterNumber, warnings, options),
    scene: acceptedScene(marked.soundtracks, chapterNumber, warnings, options),
  };
};

export const acceptHarnessModelResponse = (
  raw: string,
  chapterNumber: number,
  options: HarnessResponseAcceptanceOptions = {},
): ParsedResponse => {
  const warnings: HarnessWarning[] = [];
  const reply = parseJsonObject(raw);
  if (reply) {
    // Marks belong only in paragraphs: every other string the writer returned
    // (title, plan, recap, suggestions, a prose fallback) is read without them.
    const parsed = stripReplyMarks(reply);
    const ignoredSoundCues = ignoredSoundCueListWarning(reply);
    if (ignoredSoundCues) warnings.push(ignoredSoundCues);
    appendIgnoredIdentityWarning(parsed, warnings);
    appendIgnoredStoryDirectionWarning(parsed, warnings);
    // The model paragraphs are the authoritative chapter. The HARNESS reads the
    // writer's tags out of them, keeps the clean text exactly as written,
    // derives the readable prose from it, and places the Sound Cues its sound tags name.
    const source = acceptedChapterBody(parsed, warnings);
    const marked = source ? readParagraphMarks(source, warnings, options.soundVocabulary, options.locale) : { read: [], strandedTags: 0, wordTagIssues: 0, appearanceTagIssues: 0, statusTagIssues: 0, soundtracks: [] };
    const body = marked.read.length ? harnessChapterBody(marked.read.map(reading => reading.text), options.paragraphTarget) : undefined;
    if (!body || looksLikeRefusal(body.prose)) {
      return {
        accepted: false,
        reason: 'The provider response did not contain a usable chapter body.',
        warnings,
      };
    }
    const stopped = options.minWords ? harnessFailedWrite(body.metrics, options.minWords) : undefined;
    if (stopped) return { accepted: false, reason: stopped, warnings };
    if (parsed.blocks !== undefined) {
      warnings.push({
        code: 'competing_prose_ignored',
        message: 'The harness ignored a blocks field because the paragraphs array is the authoritative chapter body.',
      });
    }
    warnings.push(...harnessChapterBodyWarnings(body.metrics));
    const soundCues = acceptedSoundCues(marked.read, chapterNumber, warnings, options);
    const speakers = acceptedSpeakers(marked, chapterNumber, warnings, options);
    // The closing list is read as written, so a tag put there instead of the prose is not lost.
    const holdings = acceptedHoldings(reply, marked, chapterNumber, warnings, options);
    const appearances = acceptedAppearances(marked, chapterNumber, warnings, options);
    const scene = acceptedScene(marked.soundtracks, chapterNumber, warnings, options);
    // The chapter's number is the HARNESS's: a "Chapter 3:" the writer put before its title is dropped.
    const writtenTitle = nonEmptyString(parsed.title);
    const title = writtenTitle ? nonEmptyString(chapterTitleText(writtenTitle)) : undefined;
    if (!title) {
      warnings.push({
        code: 'missing_title',
        message: writtenTitle
          ? `The provider's title, “${writtenTitle}”, only numbered the chapter; the harness assigned ${chapterTitleFallback(chapterNumber)}.`
          : `The provider omitted a chapter title; the harness assigned ${chapterTitleFallback(chapterNumber)}.`,
      });
    }
    const plan = parsePlan(parsed.plan, warnings);
    const recap = parseRecap(parsed.recap, warnings);
    const rhythm = parseRhythm(parsed, warnings);
    return {
      accepted: true,
      draft: {
        paragraphs: body.paragraphs,
        prose: body.prose,
        metrics: body.metrics,
        ...(soundCues.length ? { soundCues } : {}),
        ...(speakers.length ? { speakers } : {}),
        ...(holdings.changes.length ? { holdingChanges: holdings.changes } : {}),
        ...(holdings.closing ? { closingHoldings: holdings.closing } : {}),
        ...(appearances ? { appearances } : {}),
        ...(scene ? { scene } : {}),
        title: title ?? chapterTitleFallback(chapterNumber),
        titleSource: title ? 'model' : 'harness-fallback',
        ...(plan ? { plan } : {}),
        ...(recap ? { recap } : {}),
        ...(rhythm ? { rhythm } : {}),
        responseMode: 'json',
      },
        warnings,
    };
  }

  const recovered = recoverPlainProse(raw);
  if (!recovered) {
    return {
      accepted: false,
      reason: 'The provider response could not be recovered as usable chapter prose.',
      warnings,
    };
  }
  // Read with the story's sound words, so a sound tag written the other way round never leaves its sound word in the prose.
  const soundWords = options.soundVocabulary?.length ? { soundWords: options.soundVocabulary.map(sound => sound.word) } : {};
  // Recovery places no cues, but a sound tag's stray words are removed all the same.
  const read = settleStraySoundTags(splitHarnessProseParagraphs(recovered).map(paragraph => readMarks(paragraph, soundWords)), options.locale);
  const body = harnessChapterBody(read.readings.map(reading => reading.text).filter(Boolean), options.paragraphTarget);
  const stopped = options.minWords ? harnessFailedWrite(body.metrics, options.minWords) : undefined;
  if (stopped) return { accepted: false, reason: stopped, warnings };
  warnings.push(
    {
      code: 'plain_prose_recovery',
      message: 'The response was not valid JSON, so the harness preserved its readable prose without marks and placed no Sound Cues, speakers, holding changes or appearances.',
    },
    {
      code: 'missing_title',
      message: `The provider response had no usable title; the harness assigned ${chapterTitleFallback(chapterNumber)}.`,
    },
    ...harnessChapterBodyWarnings(body.metrics),
    { code: 'optional_recap_omitted', message: 'Plain-prose recovery carries no recap; one can be written by hand.' },
    rhythmWarning('Plain-prose recovery carries no chapter function or next-chapter suggestions; the rhythm history skips this chapter.'),
  );
  return {
    accepted: true,
    draft: {
      paragraphs: body.paragraphs,
      prose: body.prose,
      metrics: body.metrics,
      title: chapterTitleFallback(chapterNumber),
      titleSource: 'harness-fallback',
      responseMode: 'plain-prose-recovery',
    },
    warnings,
  };
};
