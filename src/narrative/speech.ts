import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/text-highlight-engine/shared/manuscript';

/**
 * Speech in prose: where a paragraph's spoken lines sit, and who speaks them.
 *
 * A spoken line is quoted speech, found the same way everywhere: the HARNESS
 * when it places speaker records, and Read Aloud when it picks a voice. Only
 * the outermost quote counts (『…』 inside 「…」 and ‘…’ inside “…” stay part of
 * the outer line), a curly opener also accepts a straight closer and the
 * reverse (writers mix them), and a quote that never closes runs to the end of
 * the paragraph, the convention for one speech across several paragraphs.
 */

/** A spoken line's place in its paragraph, quotation marks included: UTF-16 offsets, start inclusive, end exclusive. */
export interface SpokenLine {
  start: number;
  end: number;
  /** False when the quote runs on to the end of the paragraph: the speech continues in the next one. */
  closed: boolean;
}

/** Each opening mark and the marks that may close it. */
const CLOSERS: Readonly<Record<string, readonly string[]>> = {
  '“': ['”', '"'],
  '"': ['"', '”'],
  '「': ['」'],
  '『': ['』'],
  '«': ['»'],
};

/** Every quoted spoken line in one paragraph, in reading order. */
export function findSpokenLines(text: string): SpokenLine[] {
  const lines: SpokenLine[] = [];
  let index = 0;
  while (index < text.length) {
    const closers = CLOSERS[text[index]];
    if (!closers) { index += 1; continue; }
    const start = index;
    let end = text.length;
    let closed = false;
    for (let cursor = start + 1; cursor < text.length; cursor += 1) {
      if (closers.includes(text[cursor])) { end = cursor + 1; closed = true; break; }
    }
    lines.push({ start, end, closed });
    index = end;
  }
  return lines;
}

/** The names a story's main character answers to (their own name first), and every other name the story declares. */
export interface MainCharacterNames {
  names: readonly string[];
  others: readonly string[];
}

/** Scripts written without spaces between words: a name there is found anywhere in a sentence. */
const SPACELESS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
/** Who a pronoun stands for is unknown, so a line attributed with one is never guessed. */
const SUBJECT_PRONOUNS = new Set(['he', 'she', 'they', 'we', 'you', 'it']);
/** Capitalised words that open a sentence without naming anyone. */
const SENTENCE_OPENERS = new Set([
  'a', 'an', 'the', 'his', 'her', 'its', 'their', 'our', 'your', 'my', 'this', 'that', 'these', 'those', 'then', 'there',
  'when', 'while', 'as', 'but', 'and', 'or', 'so', 'if', 'in', 'on', 'at', 'with', 'without', 'from', 'for', 'to', 'of',
  'by', 'after', 'before', 'still', 'even', 'only', 'yet', 'now', 'once', 'again', 'no', 'not', 'someone', 'everyone',
  'nobody', 'something', 'nothing', 'all', 'both', 'each', 'every', 'some', 'another', 'behind', 'beside', 'around',
]);
const WORD = /[\p{L}\p{M}][\p{L}\p{M}\p{N}'’-]*/gu;
const SENTENCE = /[^.!?。！？]*(?:[.!?。！？]+|$)/gu;

/** Where a name first appears in a sentence: as a whole word, or anywhere in a script without spaces. */
function firstMention(sentence: string, name: string, matchCase: boolean): number {
  const wanted = name.trim();
  if (!wanted) return -1;
  const haystack = matchCase ? sentence : sentence.toLowerCase();
  const needle = matchCase ? wanted : wanted.toLowerCase();
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) {
    if (SPACELESS.test(wanted)) return at;
    const before = sentence[at - 1] ?? '';
    const after = sentence[at + wanted.length] ?? '';
    if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)) return at;
  }
  return -1;
}

/**
 * Who one sentence of narration names first: the main character (their name,
 * an alias, a part of their name no other name shares, or "I"), someone else,
 * or a pronoun, which tells nobody who. Undefined when it names no one.
 */
function namedFirst(sentence: string, cast: MainCharacterNames): 'main' | 'other' | 'pronoun' | undefined {
  const marks: Array<{ at: number; who: 'main' | 'other' | 'pronoun' }> = [];
  const mark = (at: number, who: 'main' | 'other' | 'pronoun') => { if (at >= 0) marks.push({ at, who }); };
  // A name's single words count only when capitalised, so "the" in "the Iron Sect" is never a person.
  const partsOf = (name: string) => name.split(/\s+/u).filter(part => part.length > 1 && /^\p{Lu}/u.test(part));
  const otherWords = new Set(cast.others.flatMap(partsOf));
  for (const name of cast.names) mark(firstMention(sentence, name, false), 'main');
  for (const part of partsOf(cast.names[0] ?? '')) if (!otherWords.has(part)) mark(firstMention(sentence, part, true), 'main');
  for (const name of cast.others) mark(firstMention(sentence, name, false), 'other');
  for (const part of otherWords) mark(firstMention(sentence, part, true), 'other');
  const opening = sentence.search(/[\p{L}\p{N}]/u);
  for (const match of sentence.matchAll(WORD)) {
    const word = match[0];
    const lower = word.toLowerCase();
    if (word === 'I') mark(match.index, 'main');
    else if (SUBJECT_PRONOUNS.has(lower)) mark(match.index, 'pronoun');
    // A capitalised word nobody declared is still somebody: it stops a guess, never makes one.
    else if (/^\p{Lu}/u.test(word) && !(match.index === opening && SENTENCE_OPENERS.has(lower))) mark(match.index, 'other');
  }
  // At the same place, a declared name beats the capitalised word it starts with.
  const rank = { main: 0, pronoun: 1, other: 2 } as const;
  return marks.sort((left, right) => left.at - right.at || rank[left.who] - rank[right.who])[0]?.who;
}

/**
 * Who the narration says speaks a quoted line that no speaker tag named, the
 * way a reader tells: the sentence right after the line in its paragraph
 * ("…,” Jiuyan said.), or, when that names no one, the sentence that leads
 * into it (Jiuyan frowned. “…”), then the ones before that. `main` when that
 * sentence names the main character before anyone else; `other` when it names
 * someone else first; undefined when it names no one or starts with a pronoun,
 * since a pronoun could be anyone.
 */
export function narratedSpeaker(text: string, lines: readonly SpokenLine[], index: number, cast: MainCharacterNames): 'main' | 'other' | undefined {
  const line = lines[index];
  if (!line) return undefined;
  const verdict = (sentence: string) => namedFirst(sentence, cast);
  const after = text.slice(line.end, lines[index + 1]?.start ?? text.length).match(SENTENCE)?.[0] ?? '';
  const told = verdict(after);
  if (told) return told === 'pronoun' ? undefined : told;
  const before = (text.slice(lines[index - 1]?.end ?? 0, line.start).match(SENTENCE) ?? []).filter(sentence => sentence.trim());
  for (const sentence of before.reverse()) {
    const led = verdict(sentence);
    if (led) return led === 'pronoun' ? undefined : led;
  }
  return undefined;
}

/**
 * Speaker records: who speaks one spoken line. A record is a manuscript span
 * attachment on the line's exact words, so the HARNESS (from a writer's
 * speaker tag), a person, or a later local model all write the same record,
 * and it knows when its words change.
 */
export const SPEAKER_KIND = 'speaker';

/**
 * The main character's own speaker tag, `[[@MC]]`. The writer marks the main
 * character's speech with it whatever name the prose uses, so whether a tagged
 * line is theirs is the writer's call; only speech the writer left untagged is
 * read from its narration (`narratedSpeaker`).
 */
export const MAIN_CHARACTER_SPEAKER_TAG = 'MC';

/** Where a speaker record sits: an exact span of one paragraph. */
export type SpeakerAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

export interface SpeakerPayload {
  /** Who placed it: the HARNESS from a writer's speaker tag, or a person. */
  origin: 'harness' | 'manual';
  /** The speaker's name as the story knows them. */
  speaker: string;
  /** Whether the speaker is the story's main character. */
  protagonist: boolean;
}

export interface SpeakerAttachment extends ManuscriptAttachment<SpeakerPayload> {
  kind: typeof SPEAKER_KIND;
  anchor: SpeakerAnchor;
}

export const speakerAttachmentId = (blockId: string, start: number, end: number) => `speaker:${blockId}:${start}-${end}`;

/** A saved speaker record for one paragraph's text, when it is whole and its words are unchanged. */
export function isSpeakerOnText(record: SpeakerAttachment, blockId: string, text: string): boolean {
  const anchor = record?.anchor;
  if (!anchor || anchor.level !== 'span' || anchor.detached || anchor.blockId !== blockId) return false;
  const { startOffset: start, endOffset: end } = anchor;
  return record.kind === SPEAKER_KIND && Number.isInteger(start) && Number.isInteger(end)
    && start >= 0 && end > start && end <= text.length && text.slice(start, end) === anchor.selectedText
    && typeof record.payload?.speaker === 'string' && record.payload.speaker.trim().length > 0;
}
