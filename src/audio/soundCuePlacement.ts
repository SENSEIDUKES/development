import type { SoundTag } from '../narrative/marks';
import { wholeWordRange } from '../narrative/words';
import type { AudioEnergy } from './audioTags';
import { SOUND_CUE_KIND, type SoundCueAttachment } from './inlineAudio';
import { isMediaResourceProvenance, type FrozenNarrativeMedia } from './media';
import { isPublicHttpsMediaUrl } from './mediaUrl';
import { extractReaderVisibleAudioText, isReaderSystemLine } from './readerVisibleText';
import { SOUND_CUE_RULES, soundCueWordIssue } from './soundCueRules';
import { normalizeSoundWord, type SoundWord } from './soundWords';

/** One paragraph of clean prose, its id, and the sound tags read out of it. */
export interface SoundCueParagraph {
  blockId: string;
  text: string;
  sounds: readonly SoundTag[];
}

export type SoundCueSetAsideReason =
  | 'unknown-sound'
  | 'not-prose'
  | 'no-words'
  | 'too-many-words'
  | 'overlaps'
  | 'over-limit'
  | 'no-recording';

/** A sound tag that became no Sound Cue, where it sat, and why. */
export interface SoundCueSetAside {
  /** The sound word the writer named, in its one spelling. */
  sound: string;
  energy?: AudioEnergy;
  reason: SoundCueSetAsideReason;
  blockId: string;
  /** The tag's words in the clean paragraph: UTF-16 offsets, start inclusive and end exclusive. */
  start: number;
  end: number;
  words: string;
}

export interface SoundCuePlacement {
  soundCues: SoundCueAttachment[];
  setAside: SoundCueSetAside[];
}

/** A tag that may become a cue: where it sits, as it would be set aside, and its paragraph's place. */
interface Candidate {
  tag: Omit<SoundCueSetAside, 'reason'>;
  paragraph: number;
}

/**
 * Places a writer's Sound Cues, deterministically. Each sound tag names a
 * sound word and wraps the words where it happens; the cue sits on those
 * whole words. A tag is set aside, never forced, when its word is not one of
 * the story's, its paragraph is not shown as prose, or its words break the
 * finished-cue rules (whole words within the word limit, no overlap, at most
 * ten in a chapter, first in reading order kept). The recording is the sound
 * word's, preferring the Energy asked for, in a stable rotation so repeated
 * sounds vary. The same input always places the same cues.
 */
export function placeSoundCues(input: {
  paragraphs: readonly SoundCueParagraph[];
  vocabulary: readonly SoundWord[];
  recordings: FrozenNarrativeMedia['soundCues'];
  chapterNumber: number;
  locale?: string;
}): SoundCuePlacement {
  const words = new Set(input.vocabulary.map(sound => sound.word));
  const setAside: SoundCueSetAside[] = [];
  const candidates: Candidate[] = [];
  input.paragraphs.forEach((paragraph, index) => {
    const visible = extractReaderVisibleAudioText(paragraph.text).cleanText;
    const prose = visible === paragraph.text && !isReaderSystemLine(visible);
    for (const tag of paragraph.sounds) {
      const sound = normalizeSoundWord(tag.sound);
      const where = { sound, ...(tag.energy ? { energy: tag.energy } : {}), blockId: paragraph.blockId };
      const marked = { ...where, start: tag.start, end: tag.end, words: paragraph.text.slice(tag.start, tag.end) };
      if (!words.has(sound)) { setAside.push({ ...marked, reason: 'unknown-sound' }); continue; }
      if (!prose) { setAside.push({ ...marked, reason: 'not-prose' }); continue; }
      const whole = wholeWordRange(paragraph.text, tag.start, tag.end, input.locale);
      if (!whole) { setAside.push({ ...marked, reason: 'no-words' }); continue; }
      const wrapped = { ...where, start: whole.start, end: whole.end, words: paragraph.text.slice(whole.start, whole.end) };
      if (soundCueWordIssue(paragraph.text, whole.start, whole.end, input.locale)) {
        setAside.push({ ...wrapped, reason: 'too-many-words' });
        continue;
      }
      candidates.push({ tag: wrapped, paragraph: index });
    }
  });

  candidates.sort((left, right) => left.paragraph - right.paragraph || left.tag.start - right.tag.start);
  const uses = new Map<string, number>();
  const soundCues: SoundCueAttachment[] = [];
  const placed: Candidate[] = [];
  for (const candidate of candidates) {
    const { tag } = candidate;
    if (placed.some(other => other.paragraph === candidate.paragraph && tag.start < other.tag.end && tag.end > other.tag.start)) {
      setAside.push({ ...tag, reason: 'overlaps' });
      continue;
    }
    if (soundCues.length >= SOUND_CUE_RULES.maxPerChapter) {
      setAside.push({ ...tag, reason: 'over-limit' });
      continue;
    }
    const recordings = input.recordings
      .filter(({ cue, provenance }) => cue.metadata.sound === tag.sound
        && isPublicHttpsMediaUrl(cue.public_url) && isMediaResourceProvenance(provenance))
      .sort((left, right) => left.cue.public_url.localeCompare(right.cue.public_url));
    const matching = tag.energy ? recordings.filter(({ cue }) => cue.metadata.studio_tags?.energy === tag.energy) : [];
    const pool = matching.length ? matching : recordings;
    if (!pool.length) {
      setAside.push({ ...tag, reason: 'no-recording' });
      continue;
    }
    const used = uses.get(tag.sound) ?? 0;
    uses.set(tag.sound, used + 1);
    const { cue, provenance } = pool[(input.chapterNumber + used) % pool.length];
    placed.push(candidate);
    soundCues.push({
      id: `sound-cue:${tag.blockId}:${tag.start}-${tag.end}`,
      kind: SOUND_CUE_KIND,
      anchor: { level: 'span', blockId: tag.blockId, startOffset: tag.start, endOffset: tag.end, selectedText: tag.words },
      payload: {
        origin: 'harness',
        sound: tag.sound,
        ...(tag.energy ? { energy: tag.energy } : {}),
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
  'not-prose': 'is in a line the Reader shows as a system line',
  'no-words': 'wraps no words',
  'too-many-words': `covers more than ${SOUND_CUE_RULES.maxWords} words`,
  overlaps: 'overlaps another Sound Cue',
  'over-limit': `is past the chapter's ${SOUND_CUE_RULES.maxPerChapter} Sound Cues`,
  'no-recording': 'has no playable recording',
};

/** A plain sentence for one set-aside tag: `The "blade drawn" sound on “drew his sword” has no playable recording; it was set aside.` */
export const describeSetAsideSoundCue = (item: SoundCueSetAside) =>
  `The "${item.sound}" sound on “${item.words}” ${SET_ASIDE_MESSAGES[item.reason]}; it was set aside.`;
