import type { ProseMark } from '../narrative/marks';
import { wholeWordRange } from '../narrative/words';
import type { AudioEnergy } from './audioTags';
import { SOUND_CUE_KIND, type SoundCueAttachment } from './inlineAudio';
import { isMediaResourceProvenance, type FrozenNarrativeMedia } from './media';
import { isPublicHttpsMediaUrl } from './mediaUrl';
import { extractReaderVisibleAudioText, isReaderSystemLine } from './readerVisibleText';
import { SOUND_CUE_RULES, soundCueWordIssue } from './soundCueRules';
import { normalizeSoundWord, type SoundWord } from './soundWords';

/** What a writer said: the sound at one of its marks. */
export interface SoundCueSignal {
  mark: number;
  sound: string;
  energy?: AudioEnergy;
}

/** One paragraph of clean prose, its id, and the marks read out of it. */
export interface SoundCueParagraph {
  blockId: string;
  text: string;
  marks: readonly ProseMark[];
}

export type SoundCueSetAsideReason =
  | 'unknown-sound'
  | 'duplicate-signal'
  | 'missing-mark'
  | 'not-prose'
  | 'no-words'
  | 'too-many-words'
  | 'overlaps'
  | 'over-limit'
  | 'no-recording';

export interface SoundCueSetAside {
  mark: number;
  sound: string;
  reason: SoundCueSetAsideReason;
  /** The marked words, when the mark was found. */
  words?: string;
}

export interface SoundCuePlacement {
  soundCues: SoundCueAttachment[];
  setAside: SoundCueSetAside[];
}

interface Candidate {
  signal: SoundCueSignal & { sound: string };
  paragraph: number;
  blockId: string;
  start: number;
  end: number;
  words: string;
}

/**
 * Places a writer's Sound Cues, deterministically. Each signal names a mark
 * and a sound word; the cue sits on the whole words that mark wraps. It is set
 * aside, never forced, when the word is not one of the story's, its mark is
 * missing or already used, the paragraph is not shown as prose, or the words
 * break the finished-cue rules (1–5 whole words, no overlap, at most ten in a
 * chapter, first in reading order kept). The recording is the sound word's,
 * preferring the Energy asked for, in a stable rotation so repeated sounds
 * vary. The same input always places the same cues.
 */
export function placeSoundCues(input: {
  paragraphs: readonly SoundCueParagraph[];
  signals: readonly SoundCueSignal[];
  vocabulary: readonly SoundWord[];
  recordings: FrozenNarrativeMedia['soundCues'];
  chapterNumber: number;
  locale?: string;
}): SoundCuePlacement {
  const words = new Set(input.vocabulary.map(sound => sound.word));
  const setAside: SoundCueSetAside[] = [];
  const marks = new Map<number, { paragraph: number; mark: ProseMark }>();
  input.paragraphs.forEach((paragraph, index) => paragraph.marks.forEach(mark => {
    if (!marks.has(mark.id)) marks.set(mark.id, { paragraph: index, mark });
  }));

  const usedMarks = new Set<number>();
  const candidates: Candidate[] = [];
  for (const raw of input.signals) {
    const sound = normalizeSoundWord(raw.sound);
    const signal = { ...raw, sound };
    if (!words.has(sound)) { setAside.push({ mark: raw.mark, sound, reason: 'unknown-sound' }); continue; }
    if (usedMarks.has(raw.mark)) { setAside.push({ mark: raw.mark, sound, reason: 'duplicate-signal' }); continue; }
    usedMarks.add(raw.mark);
    const found = marks.get(raw.mark);
    if (!found) { setAside.push({ mark: raw.mark, sound, reason: 'missing-mark' }); continue; }
    const paragraph = input.paragraphs[found.paragraph];
    const marked = paragraph.text.slice(found.mark.start, found.mark.end);
    const visible = extractReaderVisibleAudioText(paragraph.text).cleanText;
    if (visible !== paragraph.text || isReaderSystemLine(visible)) {
      setAside.push({ mark: raw.mark, sound, reason: 'not-prose', words: marked });
      continue;
    }
    const whole = wholeWordRange(paragraph.text, found.mark.start, found.mark.end, input.locale);
    if (!whole) { setAside.push({ mark: raw.mark, sound, reason: 'no-words', words: marked }); continue; }
    const wrapped = paragraph.text.slice(whole.start, whole.end);
    if (soundCueWordIssue(paragraph.text, whole.start, whole.end, input.locale)) {
      setAside.push({ mark: raw.mark, sound, reason: 'too-many-words', words: wrapped });
      continue;
    }
    candidates.push({ signal, paragraph: found.paragraph, blockId: paragraph.blockId, start: whole.start, end: whole.end, words: wrapped });
  }

  candidates.sort((left, right) => left.paragraph - right.paragraph || left.start - right.start || left.signal.mark - right.signal.mark);
  const uses = new Map<string, number>();
  const soundCues: SoundCueAttachment[] = [];
  const placed: Candidate[] = [];
  for (const candidate of candidates) {
    const { signal } = candidate;
    if (placed.some(other => other.paragraph === candidate.paragraph && candidate.start < other.end && candidate.end > other.start)) {
      setAside.push({ mark: signal.mark, sound: signal.sound, reason: 'overlaps', words: candidate.words });
      continue;
    }
    if (soundCues.length >= SOUND_CUE_RULES.maxPerChapter) {
      setAside.push({ mark: signal.mark, sound: signal.sound, reason: 'over-limit', words: candidate.words });
      continue;
    }
    const recordings = input.recordings
      .filter(({ cue, provenance }) => cue.metadata.sound === signal.sound
        && isPublicHttpsMediaUrl(cue.public_url) && isMediaResourceProvenance(provenance))
      .sort((left, right) => left.cue.public_url.localeCompare(right.cue.public_url));
    const matching = signal.energy ? recordings.filter(({ cue }) => cue.metadata.studio_tags?.energy === signal.energy) : [];
    const pool = matching.length ? matching : recordings;
    if (!pool.length) {
      setAside.push({ mark: signal.mark, sound: signal.sound, reason: 'no-recording', words: candidate.words });
      continue;
    }
    const used = uses.get(signal.sound) ?? 0;
    uses.set(signal.sound, used + 1);
    const { cue, provenance } = pool[(input.chapterNumber + used) % pool.length];
    placed.push(candidate);
    soundCues.push({
      id: `sound-cue:${candidate.blockId}:${candidate.start}-${candidate.end}`,
      kind: SOUND_CUE_KIND,
      anchor: { level: 'span', blockId: candidate.blockId, startOffset: candidate.start, endOffset: candidate.end, selectedText: candidate.words },
      payload: {
        origin: 'harness',
        sound: signal.sound,
        ...(signal.energy ? { energy: signal.energy } : {}),
        cue: {
          publicUrl: cue.public_url,
          provenance: structuredClone(provenance),
          category: cue.category,
          ...(cue.metadata.studio_tags ? { tags: { ...cue.metadata.studio_tags } } : {}),
        },
      },
    });
  }
  return { soundCues, setAside };
}

const SET_ASIDE_MESSAGES: Record<SoundCueSetAsideReason, string> = {
  'unknown-sound': 'is not one of this story\'s sound words',
  'duplicate-signal': 'repeats a mark another Sound Cue already used',
  'missing-mark': 'has no mark in the prose',
  'not-prose': 'is marked in a line the Reader shows as a system line',
  'no-words': 'wraps no words',
  'too-many-words': `covers more than ${SOUND_CUE_RULES.maxWords} words`,
  overlaps: 'overlaps another Sound Cue',
  'over-limit': `is past the chapter's ${SOUND_CUE_RULES.maxPerChapter} Sound Cues`,
  'no-recording': 'has no playable recording',
};

/** A plain sentence for one set-aside cue: `Sound Cue 3 "blade drawn" covers more than 5 words ("...").` */
export const describeSetAsideSoundCue = (item: SoundCueSetAside) =>
  `Sound Cue ${item.mark} "${item.sound}" ${SET_ASIDE_MESSAGES[item.reason]}${item.words ? ` ("${item.words}")` : ''}; it was set aside.`;
