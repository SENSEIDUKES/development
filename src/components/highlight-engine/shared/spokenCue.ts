import type { SoundCueAttachment } from '../../../audio/inlineAudio';
import { createMediaCatalog, soundVocabulary, type FrozenNarrativeMedia } from '../../../audio/media';
import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import { soundWordRecording } from '../../../audio/soundCuePlacement';
import { normalizeSoundWord } from '../../../audio/soundWords';
import { wordRanges } from '../../../narrative/words';
import { createManualSoundCue } from './manualCue';
import type { PassageSelection, TextHighlightBlock } from './selection';

/** A place in the chapter: a paragraph and an offset into it. */
export interface ChapterPlace { blockId: string; offset: number }

/** Words a person named, found in the chapter. */
export interface SpokenWordsMatch {
  selection: PassageSelection;
  /** The paragraph's place in the chapter, from 0. */
  paragraph: number;
  /** How many times the words appear in the chapter. */
  occurrences: number;
}

/** Recognized speech rarely keeps case, apostrophes or accents: "Wei's" is heard as "weis". */
const foldWord = (word: string, locale?: string) => word.normalize('NFKD').replace(/\p{M}/gu, '')
  .toLocaleLowerCase(locale).replace(/['’]/g, '');

/**
 * Finds words a person said (or typed) in the chapter, whatever their case or
 * punctuation: "whistling drafts" finds “whistling drafts,”. Where they appear
 * more than once, the first at or after `from` (where the reader is) wins,
 * then the first in the chapter. The selection holds whole words only.
 */
export function findSpokenWords(blocks: readonly TextHighlightBlock[], spoken: string, options: { from?: ChapterPlace; locale?: string } = {}): SpokenWordsMatch | undefined {
  const wanted = wordRanges(spoken, options.locale).map(word => foldWord(spoken.slice(word.start, word.end), options.locale));
  if (!wanted.length) return undefined;
  const found: Array<{ paragraph: number; start: number; end: number }> = [];
  blocks.forEach((block, paragraph) => {
    const words = wordRanges(block.text, options.locale);
    const folded = words.map(word => foldWord(block.text.slice(word.start, word.end), options.locale));
    for (let index = 0; index + wanted.length <= words.length; index++) {
      if (wanted.every((word, offset) => folded[index + offset] === word)) {
        found.push({ paragraph, start: words[index].start, end: words[index + wanted.length - 1].end });
      }
    }
  });
  if (!found.length) return undefined;
  const fromParagraph = options.from ? blocks.findIndex(block => block.id === options.from!.blockId) : -1;
  const after = fromParagraph < 0 ? undefined : found.find(place => place.paragraph > fromParagraph
    || (place.paragraph === fromParagraph && place.end > options.from!.offset));
  const chosen = after ?? found[0];
  const block = blocks[chosen.paragraph];
  return {
    selection: { blockId: block.id, startOffset: chosen.start, endOffset: chosen.end, selectedText: block.text.slice(chosen.start, chosen.end) },
    paragraph: chosen.paragraph,
    occurrences: found.length,
  };
}

/** How many words a "right there" Sound Cue takes from the end of what was just read. */
export const WORDS_JUST_READ = 3;

/**
 * "Right there", while listening: the last few whole words of the part of the
 * sentence the voice was reading. Listen knows the part being read, not the
 * word, so the cue sits where that part ends, nearest to the moment the
 * listener reacted.
 */
export function wordsJustRead(block: TextHighlightBlock, read: { start: number; end: number }, locale?: string, count = WORDS_JUST_READ): PassageSelection | undefined {
  const words = wordRanges(block.text, locale).filter(word => word.start >= read.start && word.end <= read.end);
  if (!words.length) return undefined;
  const first = words[Math.max(0, words.length - count)];
  const last = words[words.length - 1];
  return { blockId: block.id, startOffset: first.start, endOffset: last.end, selectedText: block.text.slice(first.start, last.end) };
}

/** Where a spoken Sound Cue goes: words the person named, or what the voice was just reading. */
export type SpokenCueTarget = { kind: 'words'; words: string } | { kind: 'just-read' };

export type SpokenSoundCueResult =
  | { ok: true; cue: SoundCueAttachment; paragraph: number; occurrences: number }
  | { ok: false; problem: string };

/**
 * A Sound Cue a person asks for by voice or typing, on the newest chapter: a
 * story sound word and where it goes. The result is the same record a
 * highlighted selection places (origin manual), checked by the same rules, so
 * the same request always gives the same cue. A problem is a plain sentence
 * the host can show or speak.
 */
export function resolveSpokenSoundCue(input: {
  blocks: readonly TextHighlightBlock[];
  soundCues: readonly SoundCueAttachment[];
  media: FrozenNarrativeMedia;
  chapterNumber: number;
  sound: string;
  target: SpokenCueTarget;
  /** The part of a sentence Listen is reading or paused on, when it has started. */
  listening?: { blockId: string; start: number; end: number };
  locale?: string;
}): SpokenSoundCueResult {
  const sound = normalizeSoundWord(input.sound);
  if (!soundVocabulary(input.media).some(word => word.word === sound)) return { ok: false, problem: `“${input.sound}” is not one of this story's sounds.` };
  if (input.soundCues.length >= SOUND_CUE_RULES.maxPerChapter) {
    return { ok: false, problem: `This chapter already has ${SOUND_CUE_RULES.maxPerChapter} Sound Cues, the most a chapter holds.` };
  }
  let match: { selection: PassageSelection; paragraph: number; occurrences: number } | undefined;
  if (input.target.kind === 'just-read') {
    const read = input.listening;
    const paragraph = read ? input.blocks.findIndex(block => block.id === read.blockId) : -1;
    const selection = read && paragraph >= 0 ? wordsJustRead(input.blocks[paragraph], read, input.locale) : undefined;
    if (!selection) return { ok: false, problem: 'Start Listen first, or say the words the sound goes on.' };
    match = { selection, paragraph, occurrences: 1 };
  } else {
    if (wordRanges(input.target.words, input.locale).length > SOUND_CUE_RULES.maxWords) {
      return { ok: false, problem: `A Sound Cue sits on 1 to ${SOUND_CUE_RULES.maxWords} words. Say fewer words.` };
    }
    const from = input.listening && { blockId: input.listening.blockId, offset: input.listening.start };
    match = findSpokenWords(input.blocks, input.target.words, { from, locale: input.locale });
    if (!match) return { ok: false, problem: `I can't find “${input.target.words}” in this chapter.` };
  }
  const block = input.blocks[match.paragraph];
  const uses = input.soundCues.filter(cue => cue.payload.sound === sound).length;
  const recording = soundWordRecording(input.media.soundCues, sound, input.chapterNumber + uses);
  if (!recording) return { ok: false, problem: `“${sound}” has no recording to play.` };
  const occupied = input.soundCues.map(cue => cue.anchor);
  const result = createManualSoundCue(block, match.selection, recording.cue, createMediaCatalog(input.media), occupied);
  if (!result.ok) {
    return { ok: false, problem: result.reason === 'overlapping-placement'
      ? `“${match.selection.selectedText}” already has a Sound Cue on some of its words.`
      : `A Sound Cue can't go on “${match.selection.selectedText}”.` };
  }
  return { ok: true, cue: result.cue, paragraph: match.paragraph, occurrences: match.occurrences };
}
