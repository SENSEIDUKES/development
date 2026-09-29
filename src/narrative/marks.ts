/**
 * Marks: how a writer says "here" in its own prose, in the tiny SEN language.
 *
 * A span mark wraps the words where something happens: `[[1|drew his sword]]`.
 * The number ties the mark to the signal that says what happened. Marks are
 * transport only: `readMarks` removes every one and reports where each span
 * sat in the clean text, so no bracket ever reaches a reader.
 *
 * Writers slip, so reading is tolerant: spaces around the number, a missing or
 * different separator (`[[1 drew]]`, `[[1:drew]]`), full-width brackets,
 * pipes and digits, a single closing bracket, and the words written before the
 * number (`[[drew his sword|1]]`) all still read. A mark that never closes is
 * removed with its words kept. A lone `]]` with no open mark is ordinary text.
 * A point mark (`[[1]]`) is reserved for future kinds: it is removed and
 * reported.
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

export interface MarkReading {
  /** The text with every mark removed and its ends trimmed. */
  text: string;
  /** Span marks in reading order. */
  marks: ProseMark[];
  issues: ProseMarkIssue[];
}

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

const toNumber = (digits: string) => Number(digits.replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 0xff10)));
const isSpace = (character: string | undefined) => character !== undefined && /[ \t　]/.test(character);

const matchAt = (pattern: RegExp, text: string, index: number) => {
  pattern.lastIndex = index;
  return pattern.exec(text);
};

/**
 * Reads and removes every mark in one text (one paragraph, a title, a recap).
 * Offsets in the result refer to the returned clean text.
 */
export function readMarks(source: string): MarkReading {
  let text = '';
  const marks: ProseMark[] = [];
  const issues: ProseMarkIssue[] = [];
  const used = new Set<number>();
  let open: { id: number; start: number } | undefined;
  /** Spans opened inside the open one: their closings are consumed without ending it. */
  let nested = 0;

  /** Removing a token between two spaces would leave a double space; keep one. */
  const skipDoubledSpace = (next: number) => (isSpace(text.at(-1)) && isSpace(source[next]) ? next + 1 : next);

  const addSpan = (id: number, start: number, end: number) => {
    let from = start;
    let to = end;
    while (from < to && isSpace(text[from])) from += 1;
    while (to > from && isSpace(text[to - 1])) to -= 1;
    if (from === to) { issues.push({ kind: 'empty', id }); return; }
    if (used.has(id)) { issues.push({ kind: 'duplicate', id }); return; }
    used.add(id);
    marks.push({ id, start: from, end: to });
  };

  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === '[' || character === '［') {
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
        if (open) issues.push({ kind: 'nested', id });
        else addSpan(id, start, text.length);
        index += reversed[0].length;
        continue;
      }
      const opening = matchAt(SPAN_OPEN, source, index);
      if (opening) {
        const id = toNumber(opening[1] ?? opening[2]);
        if (open) {
          issues.push({ kind: 'nested', id });
          nested += 1;
        } else open = { id, start: text.length };
        index = skipDoubledSpace(index + opening[0].length);
        continue;
      }
    }
    if (open && (character === ']' || character === '］')) {
      const closing = matchAt(SPAN_CLOSE, source, index)!;
      if (nested > 0) nested -= 1;
      else {
        addSpan(open.id, open.start, text.length);
        open = undefined;
      }
      index = skipDoubledSpace(index + closing[0].length);
      continue;
    }
    text += character;
    index += 1;
  }
  if (open) issues.push({ kind: 'unclosed', id: open.id });

  // Trim the ends and shift every span with them.
  const lead = text.length - text.trimStart().length;
  const trimmed = text.trim();
  return {
    text: trimmed,
    marks: marks
      .map(mark => ({ id: mark.id, start: Math.max(0, mark.start - lead), end: Math.min(trimmed.length, mark.end - lead) }))
      .sort((left, right) => left.start - right.start || left.id - right.id),
    issues,
  };
}

/** The text with every mark removed, for fields that carry no marks (a title, a recap, evidence). */
export const stripMarks = (text: string) => readMarks(text).text;
