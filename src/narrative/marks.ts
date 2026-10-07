import { AUDIO_ENERGIES, type AudioEnergy } from '../audio/audioTags';
import { normalizeSoundWord } from '../audio/soundWords';

/**
 * Marks: how a writer says "here" in its own prose, in the tiny SEN language.
 *
 * A sound tag wraps the words where a sound plays and names the sound, with an
 * optional Energy: `[[sound: blade drawn | drew his sword | high]]`. The words
 * stay in the text; the rest of the tag is removed. A speaker tag names who
 * speaks the speech that follows it: `[[@Lin Feng]] “Run!”`. A word tag names
 * a change to what a character has: `[[gained: MC | Rusted Iron Sword]]`.
 * Tags are transport only: `readMarks` removes every one and reports where
 * each sat in the clean text, so no bracket ever reaches a reader.
 *
 * A numbered span mark (`[[1|drew his sword]]`) is the retired form of a sound
 * tag, whose number pointed into a separate list. It is still read, so an old
 * habit never leaks into the prose, and reported in `marks`, but nothing is
 * placed from it. Reading it is tolerant: spaces around the number, a missing
 * or different separator (`[[1 drew]]`, `[[1:drew]]`), full-width brackets,
 * pipes and digits, a single closing bracket, and the words written before the
 * number (`[[drew his sword|1]]`) all still read. A mark that never closes is
 * removed with its words kept. A lone `]]` with no open mark is ordinary text.
 * A point mark (`[[1]]`) is removed and reported.
 *
 * A speaker tag is read before anything else at a bracket, so a tag can never
 * be mistaken for a mark, and a tag inside an open span leaves the span whole.
 * It tolerates spaces, full-width brackets and ＠, one closing bracket, a
 * number written after the name (`[[@Lin Feng|1]]`), and words written inside
 * it (`[[@Lin Feng|“Run!”]]`, whose words stay). A tag that never closes, or
 * whose name is empty or too long to be a name, is still removed and reported,
 * so no part of it leaks. `[[Lin Feng]]` without the @ is ordinary text.
 *
 * A word tag begins with its tag word and says what changed, in parts split by
 * pipes: `[[gained: MC | Rusted Iron Sword]]`. It points at what follows it.
 * The tag words are the language's own (`TAG_WORDS`), each with the other
 * spellings a writer slips into ("obtained" for gained); letter case, spaces,
 * full-width colons, pipes and brackets, and a single closing bracket all
 * read. A tag word with fewer than two parts, or one that never closes, is
 * still removed and reported, so no part of it leaks. An unknown word with a
 * pipe after its colon (`[[obtainedd: MC | Sword]]`) is a slipped tag: removed
 * and reported too. Without a pipe, `[[Note: …]]` is ordinary text.
 *
 * A sound tag reads the same slips: letter case, spaces, full-width brackets,
 * colons and pipes, a single closing bracket, other words for "sound" ("sfx",
 * "sound effect"), and the Energy written before the words instead of after
 * them. Other tags inside its words are read as usual. A sound tag that never
 * closes keeps its words; one opened inside another span, or wrapping nothing,
 * counts for nothing and keeps its words. One with no words to wrap
 * (`[[sound: thunder]]`) is removed and reported, so its sound word never
 * becomes prose. Given the story's sound words, a tag written the other way
 * round (`[[sound: drew his sword | blade drawn]]`) is read the right way.
 */

/** A span mark's place in the clean text: UTF-16 offsets, start inclusive and end exclusive. */
export interface ProseMark {
  id: number;
  start: number;
  end: number;
}

export type ProseMarkIssue =
  /** A point mark `[[n]]`; not used by any kind yet, so it is removed. */
  | { kind: 'point'; id: number }
  /** A span that never closed; its opening was removed and its words kept. */
  | { kind: 'unclosed'; id: number }
  /** A span opened inside another; only the outer span counts. */
  | { kind: 'nested'; id: number }
  /** A number used by an earlier mark in the same text; only the first counts. */
  | { kind: 'duplicate'; id: number }
  /** A span that wraps no text. */
  | { kind: 'empty'; id: number };

/** A speaker tag's name, and where it sat in the clean text: the speech it names follows it. */
export interface SpeakerTag {
  name: string;
  /** UTF-16 offset in the clean text. */
  offset: number;
}

/** A speaker tag that named nobody: empty, too long to be a name, or never closed. It was removed. */
export interface SpeakerTagIssue { kind: 'unnamed' }

/**
 * The tag words of the tiny SEN language, each with the other spellings a
 * writer may slip into. Holdings are the first kind written this way: what a
 * character has, uses, knows and is, tagged where the story changes it.
 */
export const TAG_WORDS = {
  has: ['has', 'had', 'have', 'holds', 'owns', 'carries'],
  gained: ['gained', 'gain', 'gains', 'obtained', 'obtain', 'acquired', 'acquire', 'received', 'receive', 'got'],
  lost: ['lost', 'lose', 'loses', 'used up', 'consumed', 'spent', 'broke', 'broken', 'destroyed', 'gave', 'gave away', 'given', 'sold', 'stolen', 'dropped'],
  equipped: ['equipped', 'equip', 'equips', 'wields', 'wield', 'wielded', 'wears', 'wear', 'wore'],
  unequipped: ['unequipped', 'unequip', 'unequips', 'put away', 'stowed', 'stow', 'sheathed'],
  knows: ['knows', 'know', 'knew', 'known'],
  learning: ['learning', 'studying', 'practicing', 'practising'],
  learned: ['learned', 'learnt', 'learn', 'learns'],
  improved: ['improved', 'improve', 'improves'],
  sealed: ['sealed', 'seal', 'seals'],
  unsealed: ['unsealed', 'unseal', 'unseals'],
  rank: ['rank', 'ranked'],
} as const satisfies Record<string, readonly string[]>;

export type TagWord = keyof typeof TAG_WORDS;

/** A word tag, and where it sat in the clean text: it points at what follows it. */
export interface WordTag {
  word: TagWord;
  /** The writer's own spelling, when it was another accepted one ("obtained" for gained). */
  spelling?: string;
  /** The parts between the pipes, trimmed, in order: who, then what. */
  parts: string[];
  /** UTF-16 offset in the clean text. */
  offset: number;
}

/** A word tag that could not be read. It was removed, so nothing of it leaks. */
export type WordTagIssue =
  /** A tag word with fewer than two parts. */
  | { kind: 'incomplete'; word: TagWord }
  /** A tag word that never closed. */
  | { kind: 'unclosed'; word: TagWord }
  /** A word that is not a tag word, written as a tag (a pipe after its colon). */
  | { kind: 'unknown'; word: string };

/** The words a sound tag wraps in the clean text, and the sound the writer named for them. */
export interface SoundTag {
  /** The sound word as written, trimmed. Whether it is one of the story's is decided where the cue is placed. */
  sound: string;
  /** The Energy the writer asked for, when it gave one. */
  energy?: AudioEnergy;
  /** UTF-16 offsets in the clean text, start inclusive and end exclusive. */
  start: number;
  end: number;
}

export type SoundTagIssue =
  /** A sound tag with no sound word, or no words to wrap (`[[sound: thunder]]`). Nothing of it but its words stays. */
  | { kind: 'incomplete' }
  /** A sound tag that never closed; its opening was removed and its words kept. */
  | { kind: 'unclosed'; sound: string }
  /** A sound tag opened inside another span; only the outer one counts, and its words stay. */
  | { kind: 'nested'; sound: string }
  /** A sound tag that wraps no text. */
  | { kind: 'empty'; sound: string };

/** The words a sound tag may open with, letter case and hyphens aside: `[[sfx: …]]` is `[[sound: …]]`. */
export const SOUND_TAG_WORDS = ['sound', 'sounds', 'sfx', 'sound cue', 'sound effect'] as const;

/**
 * A soundtrack tag: the chapter's music and atmosphere, chosen once at its
 * start (`[[soundtrack: mystical | forest]]`). Which parts are words of the
 * story's soundtrack is decided where the chapter is accepted.
 */
export interface SoundtrackTag {
  /** The parts between the pipes, trimmed, in order: the music's mood, then the atmosphere. */
  parts: string[];
  /** UTF-16 offset in the clean text. */
  offset: number;
}

/** The words a soundtrack tag may open with, letter case and hyphens aside: `[[scene: …]]` is `[[soundtrack: …]]`. */
export const SOUNDTRACK_TAG_WORDS = ['soundtrack', 'sound track', 'scene', 'music'] as const;

export interface MarkReadingOptions {
  /**
   * The story's sound words. With them, a sound tag whose words and sound word
   * were written the other way round is read the right way, so the sound word
   * never becomes prose.
   */
  soundWords?: Iterable<string>;
}

export interface MarkReading {
  /** The text with every mark removed and its ends trimmed. */
  text: string;
  /** Sound tags in reading order. */
  sounds: SoundTag[];
  soundIssues: SoundTagIssue[];
  /** Retired numbered span marks in reading order: read so they never leak, never placed. */
  marks: ProseMark[];
  issues: ProseMarkIssue[];
  /** Speaker tags in reading order. */
  speakers: SpeakerTag[];
  speakerIssues: SpeakerTagIssue[];
  /** Word tags in reading order. */
  wordTags: WordTag[];
  wordTagIssues: WordTagIssue[];
  /** Soundtrack tags in reading order; one that never closed is removed with nothing read from it. */
  soundtracks: SoundtrackTag[];
}

const TAG_WORD_SPELLINGS = new Map<string, TagWord>(
  (Object.entries(TAG_WORDS) as Array<[TagWord, readonly string[]]>).flatMap(([word, spellings]) => spellings.map(spelling => [spelling, word] as const)),
);

/** A spelling's tag word: letter case, hyphens and repeated spaces aside ("Put-Away" is unequipped). */
export const tagWordOf = (spelling: string): TagWord | undefined =>
  TAG_WORD_SPELLINGS.get(spelling.trim().toLowerCase().replace(/[\s-]+/g, ' '));

/** Longer than this, a speaker tag's "name" is prose written into the tag, not a name. */
export const SPEAKER_TAG_NAME_LIMIT = 48;

const OPEN = String.raw`(?:[\[［]{2})`;
const CLOSE = String.raw`(?:[\]］]{1,2})`;
const DIGITS = String.raw`([0-9０-９]{1,3})`;
const GAP = String.raw`[ \t　]*`;
const SEPARATOR = String.raw`[|｜:：]`;

/** `[[1]]` */
const POINT = new RegExp(String.raw`${OPEN}${GAP}${DIGITS}${GAP}[\]］]{2}`, 'y');
/** `[[1|` `[[1:` `[[1 ` `[[1` and `[1|` */
const SPAN_OPEN = new RegExp(String.raw`(?:${OPEN}${GAP}${DIGITS}${GAP}(?:${SEPARATOR}${GAP})?|[\[［]${GAP}${DIGITS}${GAP}[|｜]${GAP})`, 'y');
/** `[[drew his sword|1]]`, but never `[[1|2]]`, which is the usual order. */
const REVERSED = new RegExp(String.raw`${OPEN}${GAP}(?![0-9０-９]{1,3}${GAP}${SEPARATOR})([^\[\]［］|｜\n]{1,80}?)${GAP}[|｜]${GAP}${DIGITS}${GAP}[\]］]{2}`, 'y');
const SPAN_CLOSE = new RegExp(CLOSE, 'y');
const AT = String.raw`[@＠]`;
const NAME = String.raw`([^\[\]［］|｜:：\n]*?)`;
/** `[[@Lin Feng]]` `[[ @Lin Feng ]` `［［＠林］］`, and the slips `[[@Lin Feng|1]]` and `[[@Lin Feng|“Run!”]]`. */
const SPEAKER = new RegExp(String.raw`${OPEN}${GAP}${AT}${GAP}${NAME}${GAP}(?:(${SEPARATOR})${GAP}(?:${DIGITS}${GAP}[\]］]{1,2})?|[\]］]{1,2})`, 'y');
/** `[@Lin Feng]`, read only at the very start of a paragraph. */
const SPEAKER_SINGLE = new RegExp(String.raw`[\[［]${GAP}${AT}${GAP}${NAME}${GAP}[\]］]`, 'y');
/** A tag that never closes: removed up to the speech it was meant to name. */
const SPEAKER_UNCLOSED = new RegExp(String.raw`${OPEN}${GAP}${AT}[^\[\]［］|｜\n“"「『«]{0,${SPEAKER_TAG_NAME_LIMIT}}`, 'y');
const TAG_WORD = String.raw`([A-Za-z]+(?:[ \t-][A-Za-z]+)?)`;
const COLON = String.raw`[:：]`;
const PIPE = /[|｜]/;
/** `[[gained: MC | Rusted Iron Sword]]` `［［gained：MC｜剣］］` `[[Gained:MC|Sword]` */
const WORD_TAG = new RegExp(String.raw`${OPEN}${GAP}${TAG_WORD}${GAP}${COLON}([^\[\]［］\n]{0,240})${CLOSE}`, 'y');
/** A word tag that never closes: removed through the end of the sentence it ran into. */
const WORD_TAG_UNCLOSED = new RegExp(String.raw`${OPEN}${GAP}${TAG_WORD}${GAP}${COLON}[^\[\]［］\n.!?。！？“"「]{0,120}[.!?。！？]?`, 'y');
const SOUND_TAG_WORD = String.raw`(?:sounds?|sfx|sound[ \t-]?(?:cue|effect))`;
const ENERGY = String.raw`(${AUDIO_ENERGIES.join('|')})`;
/** `[[sound: blade drawn |`, or `[[sound: blade drawn | high |` with the Energy first: the words follow it. */
const SOUND_OPEN = new RegExp(String.raw`${OPEN}${GAP}${SOUND_TAG_WORD}${GAP}${COLON}${GAP}([^\[\]［］|｜\n]{1,120}?)${GAP}[|｜]${GAP}(?:${ENERGY}${GAP}[|｜]${GAP})?`, 'iy');
/** `[[sound: thunder]]`: a sound tag with nothing to wrap. */
const SOUND_POINT = new RegExp(String.raw`${OPEN}${GAP}${SOUND_TAG_WORD}${GAP}${COLON}[^\[\]［］|｜\n]{0,48}${CLOSE}`, 'iy');
/** A sound tag with no pipe that never closes: removed through the end of the sentence it ran into. */
const SOUND_UNCLOSED = new RegExp(String.raw`${OPEN}${GAP}${SOUND_TAG_WORD}${GAP}${COLON}[^\[\]［］|｜\n.!?。！？“"「]{0,120}[.!?。！？]?`, 'iy');
/** `| high]]`: the Energy written after a sound tag's words, closing it. */
const SOUND_CLOSE_WITH_PART = new RegExp(String.raw`[|｜]${GAP}([^\[\]［］|｜\n]{0,24}?)${GAP}${CLOSE}`, 'y');
const SOUNDTRACK_TAG_WORD = String.raw`(?:sound[ \t-]?track|scene|music)`;
/** `[[soundtrack: mystical | forest]]` `［［soundtrack：mystical｜forest］］` `[[Scene: mystical]]` */
const SOUNDTRACK_TAG = new RegExp(String.raw`${OPEN}${GAP}${SOUNDTRACK_TAG_WORD}${GAP}${COLON}([^\[\]［］\n]{0,120})${CLOSE}`, 'iy');
/** A soundtrack tag that never closes: removed through the end of the sentence it ran into. */
const SOUNDTRACK_UNCLOSED = new RegExp(String.raw`${OPEN}${GAP}${SOUNDTRACK_TAG_WORD}${GAP}${COLON}[^\[\]［］\n.!?。！？“"「]{0,120}[.!?。！？]?`, 'iy');

const toNumber = (digits: string) => Number(digits.replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 0xff10)));
const isSpace = (character: string | undefined) => character !== undefined && /[ \t　]/.test(character);
const energyOf = (value: string | undefined): AudioEnergy | undefined => {
  const energy = value?.trim().toLowerCase();
  return (AUDIO_ENERGIES as readonly string[]).includes(energy ?? '') ? energy as AudioEnergy : undefined;
};

/** A span open in the text: a numbered mark or a sound tag. Only the outer one counts. */
type OpenSpan = { start: number; inner: boolean } & ({ kind: 'mark'; id: number } | { kind: 'sound'; sound: string; energy?: AudioEnergy });

const matchAt = (pattern: RegExp, text: string, index: number) => {
  pattern.lastIndex = index;
  return pattern.exec(text);
};

/**
 * Reads and removes every mark in one text (one paragraph, a title, a recap).
 * Offsets in the result refer to the returned clean text.
 */
export function readMarks(source: string, { soundWords }: MarkReadingOptions = {}): MarkReading {
  const knownSounds = soundWords ? new Set([...soundWords].map(normalizeSoundWord)) : undefined;
  let text = '';
  const sounds: SoundTag[] = [];
  const soundIssues: SoundTagIssue[] = [];
  const marks: ProseMark[] = [];
  const issues: ProseMarkIssue[] = [];
  const speakers: SpeakerTag[] = [];
  const speakerIssues: SpeakerTagIssue[] = [];
  const wordTags: WordTag[] = [];
  const wordTagIssues: WordTagIssue[] = [];
  const soundtracks: SoundtrackTag[] = [];
  const used = new Set<number>();
  /** Spans open in the text, outermost first: an inner one's closing is consumed without ending the outer. */
  const spans: OpenSpan[] = [];
  /** Words were written inside a speaker tag: its closing bracket comes after them. */
  let tagWords = false;

  /** Removing a token between two spaces would leave a double space; keep one. */
  const skipDoubledSpace = (next: number) => (isSpace(text.at(-1)) && isSpace(source[next]) ? next + 1 : next);

  /** The span's words, without the spaces at its ends; undefined when it wraps nothing. */
  const wrapped = (start: number, end: number) => {
    let from = start;
    let to = end;
    while (from < to && isSpace(text[from])) from += 1;
    while (to > from && isSpace(text[to - 1])) to -= 1;
    return from === to ? undefined : { start: from, end: to };
  };

  const addSpan = (id: number, start: number, end: number) => {
    const range = wrapped(start, end);
    if (!range) { issues.push({ kind: 'empty', id }); return; }
    if (used.has(id)) { issues.push({ kind: 'duplicate', id }); return; }
    used.add(id);
    marks.push({ id, ...range });
  };

  const openSpan = (span: OpenSpan) => {
    if (spans.length) {
      if (span.kind === 'mark') issues.push({ kind: 'nested', id: span.id });
      else soundIssues.push({ kind: 'nested', sound: span.sound });
    }
    spans.push({ ...span, inner: spans.length > 0 });
  };

  /** Closes the innermost open span; only the outer one is recorded. */
  const closeSpan = (trailing?: string) => {
    const span = spans.pop()!;
    if (span.inner) return;
    if (span.kind === 'mark') { addSpan(span.id, span.start, text.length); return; }
    const words = text.slice(span.start).trim();
    // `[[sound: thunder | high]]` names an Energy, not words: it is removed whole.
    if (!span.energy && energyOf(words)) {
      text = text.slice(0, span.start);
      soundIssues.push({ kind: 'incomplete' });
      return;
    }
    if (!span.sound) { soundIssues.push({ kind: 'incomplete' }); return; }
    let sound = span.sound;
    // Written the other way round, `[[sound: drew his sword | blade drawn]]`: the words were written first.
    if (knownSounds && !knownSounds.has(normalizeSoundWord(sound)) && knownSounds.has(normalizeSoundWord(words))
      && !speakers.some(tag => tag.offset > span.start) && !wordTags.some(tag => tag.offset > span.start)) {
      text = text.slice(0, span.start) + sound;
      sound = words;
    }
    const range = wrapped(span.start, text.length);
    if (!range) { soundIssues.push({ kind: 'empty', sound }); return; }
    const energy = span.energy ?? energyOf(trailing);
    sounds.push({ sound, ...(energy ? { energy } : {}), ...range });
  };

  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === '[' || character === '［') {
      const tag = matchAt(SPEAKER, source, index) ?? (text.trim() ? null : matchAt(SPEAKER_SINGLE, source, index));
      if (tag) {
        const name = tag[1].trim();
        if (name && name.length <= SPEAKER_TAG_NAME_LIMIT) speakers.push({ name, offset: text.length });
        else speakerIssues.push({ kind: 'unnamed' });
        // A separator with no number after it means the writer's words follow inside the tag.
        if (tag[2] && !tag[3]) tagWords = true;
        index = skipDoubledSpace(index + tag[0].length);
        continue;
      }
      const unclosedTag = matchAt(SPEAKER_UNCLOSED, source, index);
      if (unclosedTag) {
        speakerIssues.push({ kind: 'unnamed' });
        index = skipDoubledSpace(index + unclosedTag[0].length);
        continue;
      }
      const soundtrack = matchAt(SOUNDTRACK_TAG, source, index);
      if (soundtrack) {
        soundtracks.push({ parts: soundtrack[1].split(PIPE).map(part => part.trim()).filter(Boolean), offset: text.length });
        index = skipDoubledSpace(index + soundtrack[0].length);
        continue;
      }
      const unclosedSoundtrack = matchAt(SOUNDTRACK_UNCLOSED, source, index);
      if (unclosedSoundtrack) {
        index = skipDoubledSpace(index + unclosedSoundtrack[0].length);
        continue;
      }
      const sound = matchAt(SOUND_OPEN, source, index);
      if (sound) {
        const energy = energyOf(sound[2]);
        openSpan({ kind: 'sound', sound: sound[1].trim(), ...(energy ? { energy } : {}), start: text.length, inner: false });
        index = skipDoubledSpace(index + sound[0].length);
        continue;
      }
      const soundPoint = matchAt(SOUND_POINT, source, index) ?? matchAt(SOUND_UNCLOSED, source, index);
      if (soundPoint) {
        soundIssues.push({ kind: 'incomplete' });
        index = skipDoubledSpace(index + soundPoint[0].length);
        continue;
      }
      const wordTag = matchAt(WORD_TAG, source, index);
      const word = wordTag ? tagWordOf(wordTag[1]) : undefined;
      if (wordTag && (word || PIPE.test(wordTag[2]))) {
        const parts = wordTag[2].split(PIPE).map(part => part.trim()).filter(Boolean);
        const spelling = wordTag[1].trim().toLowerCase().replace(/[\s-]+/g, ' ');
        if (!word) wordTagIssues.push({ kind: 'unknown', word: wordTag[1].trim() });
        else if (parts.length < 2) wordTagIssues.push({ kind: 'incomplete', word });
        else wordTags.push({ word, ...(spelling !== word ? { spelling } : {}), parts, offset: text.length });
        index = skipDoubledSpace(index + wordTag[0].length);
        continue;
      }
      const unclosedWordTag = wordTag ? null : matchAt(WORD_TAG_UNCLOSED, source, index);
      const unclosedWord = unclosedWordTag ? tagWordOf(unclosedWordTag[1]) : undefined;
      if (unclosedWordTag && unclosedWord) {
        wordTagIssues.push({ kind: 'unclosed', word: unclosedWord });
        index = skipDoubledSpace(index + unclosedWordTag[0].length);
        continue;
      }
      const point = matchAt(POINT, source, index);
      if (point) {
        issues.push({ kind: 'point', id: toNumber(point[1]) });
        index = skipDoubledSpace(index + point[0].length);
        continue;
      }
      const reversed = matchAt(REVERSED, source, index);
      if (reversed) {
        const start = text.length;
        text += reversed[1];
        const id = toNumber(reversed[2]);
        if (spans.length) issues.push({ kind: 'nested', id });
        else addSpan(id, start, text.length);
        index += reversed[0].length;
        continue;
      }
      const opening = matchAt(SPAN_OPEN, source, index);
      if (opening) {
        openSpan({ kind: 'mark', id: toNumber(opening[1] ?? opening[2]), start: text.length, inner: false });
        index = skipDoubledSpace(index + opening[0].length);
        continue;
      }
    }
    if (spans.at(-1)?.kind === 'sound' && (character === '|' || character === '｜')) {
      const closing = matchAt(SOUND_CLOSE_WITH_PART, source, index);
      if (closing) {
        closeSpan(closing[1]);
        index = skipDoubledSpace(index + closing[0].length);
        continue;
      }
      // Any other pipe inside a sound tag's words is the tag's, never prose.
      index = skipDoubledSpace(index + 1);
      continue;
    }
    if (spans.length && (character === ']' || character === '］')) {
      const closing = matchAt(SPAN_CLOSE, source, index)!;
      closeSpan();
      index = skipDoubledSpace(index + closing[0].length);
      continue;
    }
    if (tagWords && (character === ']' || character === '］')) {
      tagWords = false;
      index = skipDoubledSpace(index + matchAt(SPAN_CLOSE, source, index)![0].length);
      continue;
    }
    text += character;
    index += 1;
  }
  const outer = spans[0];
  if (outer?.kind === 'mark') issues.push({ kind: 'unclosed', id: outer.id });
  if (outer?.kind === 'sound') soundIssues.push({ kind: 'unclosed', sound: outer.sound });

  // Trim the ends and shift every span and tag with them.
  const lead = text.length - text.trimStart().length;
  const trimmed = text.trim();
  const at = (offset: number) => Math.min(trimmed.length, Math.max(0, offset - lead));
  return {
    text: trimmed,
    sounds: sounds.map(tag => ({ ...tag, start: at(tag.start), end: at(tag.end) })),
    soundIssues,
    marks: marks
      .map(mark => ({ id: mark.id, start: at(mark.start), end: at(mark.end) }))
      .sort((left, right) => left.start - right.start || left.id - right.id),
    issues,
    speakers: speakers.map(tag => ({ name: tag.name, offset: at(tag.offset) })),
    speakerIssues,
    wordTags: wordTags.map(tag => ({ ...tag, offset: at(tag.offset) })),
    wordTagIssues,
    soundtracks: soundtracks.map(tag => ({ ...tag, offset: at(tag.offset) })),
  };
}

/** The text with every mark removed, for fields that carry no marks (a title, a recap, evidence). */
export const stripMarks = (text: string) => readMarks(text).text;
