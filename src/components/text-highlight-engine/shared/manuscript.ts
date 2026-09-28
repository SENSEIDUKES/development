import { isValidPassage, type PassageEdit, type PassageSelection, type TextHighlightBlock } from './selection';

/**
 * The manuscript: the plain page SEN features point at.
 *
 * It holds text, reading order and permanent addresses, and nothing else.
 * A paragraph and a sentence each receive a permanent ID when they are
 * created; the number a reader sees is only their current position. Sentence
 * boundaries are split once and saved, never recomputed while reading.
 *
 * What an attachment means — a Sound Cue, a narration instruction, a Mind
 * Palace entry — belongs to the system that owns its payload. The manuscript
 * only keeps each attachment on the words it was placed on.
 */

/** Prototype page size. Full chapter length is a later, separate problem. */
export const MANUSCRIPT_PROTOTYPE_WORD_LIMIT = 500;

export interface ManuscriptSentence {
  id: string;
  /** UTF-16 offsets into the paragraph text, start inclusive, end exclusive. Whitespace between sentences belongs to none. */
  start: number;
  end: number;
}

export interface ManuscriptParagraph extends TextHighlightBlock {
  /** Saved boundaries in reading order. */
  sentences: readonly ManuscriptSentence[];
}

export interface Manuscript {
  /** A draft can still change. Sealed, this version is the chapter. */
  status: 'draft' | 'sealed';
  /** Used only to split sentences. */
  locale: string;
  /** Reading order. A paragraph's number is its position here, never its identity. */
  paragraphs: readonly ManuscriptParagraph[];
}

export type ManuscriptIdFactory = (kind: 'paragraph' | 'sentence') => string;

export const createManuscriptId: ManuscriptIdFactory = kind => {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${kind === 'paragraph' ? 'p' : 's'}-${random}`;
};

export interface ManuscriptOptions {
  createId?: ManuscriptIdFactory;
  locale?: string;
}

interface TextRange { start: number; end: number }

/** A bracketed System line such as "[Breakthrough: Lv. 1]" is always its own sentence. */
const SYSTEM_LINE = /\[[^[\]\n]*\]/g;
/** A split right after one of these is an abbreviation, not a sentence end. */
const ABBREVIATION_END = /(?:^|[^\p{L}])(?:Mr|Mrs|Ms|Dr|St|Mt|Lv|Lvl|vs|etc)\.$/u;
/** A piece that continues in lowercase ("“Run!” she shouted.") belongs to the sentence before it. */
const LOWERCASE_START = /^[“"‘'(]*\p{Ll}/u;

const trimRange = (text: string, range: TextRange): TextRange | undefined => {
  let { start, end } = range;
  while (start < end && /\s/u.test(text[start])) start += 1;
  while (end > start && /\s/u.test(text[end - 1])) end -= 1;
  return start < end ? { start, end } : undefined;
};

const segmentRanges = (text: string, locale: string): TextRange[] => {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(text),
      part => ({ start: part.index, end: part.index + part.segment.length }));
  }
  const ranges: TextRange[] = [];
  let start = 0;
  for (const match of text.matchAll(/[.!?…]+["'”’)\]]*\s+/gu)) {
    ranges.push({ start, end: match.index + match[0].length });
    start = match.index + match[0].length;
  }
  if (start < text.length) ranges.push({ start, end: text.length });
  return ranges;
};

/**
 * Sentence boundaries for one piece of text, as trimmed offsets. Uses the
 * runtime's sentence segmenter with a few guards for the primary English
 * reading experience. Callers save the result; it is never re-run to read.
 */
export function splitSentences(text: string, locale = 'en'): TextRange[] {
  const chunks: Array<TextRange & { systemLine: boolean }> = [];
  let cursor = 0;
  for (const match of text.matchAll(SYSTEM_LINE)) {
    if (match.index > cursor) chunks.push({ start: cursor, end: match.index, systemLine: false });
    chunks.push({ start: match.index, end: match.index + match[0].length, systemLine: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) chunks.push({ start: cursor, end: text.length, systemLine: false });

  const sentences: TextRange[] = [];
  for (const chunk of chunks) {
    if (chunk.systemLine) { sentences.push({ start: chunk.start, end: chunk.end }); continue; }
    const pieces = segmentRanges(text.slice(chunk.start, chunk.end), locale)
      .map(piece => trimRange(text, { start: piece.start + chunk.start, end: piece.end + chunk.start }))
      .filter((piece): piece is TextRange => Boolean(piece));
    const merged: TextRange[] = [];
    for (const piece of pieces) {
      const previous = merged.at(-1);
      if (previous && (ABBREVIATION_END.test(text.slice(previous.start, previous.end))
        || LOWERCASE_START.test(text.slice(piece.start, piece.end)))) previous.end = piece.end;
      else merged.push({ ...piece });
    }
    sentences.push(...merged);
  }
  return sentences;
}

const sentencesFor = (text: string, locale: string, createId: ManuscriptIdFactory, offset = 0, inherited: readonly string[] = []) =>
  splitSentences(text, locale).map((range, index): ManuscriptSentence => ({
    id: inherited[index] ?? createId('sentence'), start: range.start + offset, end: range.end + offset,
  }));

const createParagraph = (text: string, locale: string, createId: ManuscriptIdFactory): ManuscriptParagraph => ({
  id: createId('paragraph'), text, sentences: sentencesFor(text, locale, createId),
});

/** Whitespace-delimited words: an honest count for the primary English page only. */
export const countManuscriptWords = (manuscript: Pick<Manuscript, 'paragraphs'>): number =>
  manuscript.paragraphs.reduce((total, paragraph) => {
    const text = paragraph.text.trim();
    return total + (text ? text.split(/\s+/u).length : 0);
  }, 0);

/** A new draft page. Every paragraph and sentence gets its permanent ID here. */
export function createManuscript(texts: readonly string[], { createId = createManuscriptId, locale = 'en' }: ManuscriptOptions = {}): Manuscript {
  const manuscript: Manuscript = { status: 'draft', locale, paragraphs: texts.map(text => createParagraph(text, locale, createId)) };
  if (countManuscriptWords(manuscript) > MANUSCRIPT_PROTOTYPE_WORD_LIMIT) {
    throw new RangeError(`A prototype manuscript holds at most ${MANUSCRIPT_PROTOTYPE_WORD_LIMIT} words.`);
  }
  return manuscript;
}

/** Adds a paragraph at a reading position. Every existing paragraph and sentence keeps its identity. */
export function insertParagraph(manuscript: Manuscript, index: number, text: string, { createId = createManuscriptId }: Pick<ManuscriptOptions, 'createId'> = {}): Manuscript {
  if (manuscript.status === 'sealed') return manuscript;
  const paragraphs = [...manuscript.paragraphs];
  paragraphs.splice(Math.max(0, Math.min(index, paragraphs.length)), 0, createParagraph(text, manuscript.locale, createId));
  return { ...manuscript, paragraphs };
}

// ─── Anchors ────────────────────────────────────────────────────────────────

export type ManuscriptAnchorLevel = 'paragraph' | 'sentence' | 'span';

/**
 * Where an attachment sits. Every anchor keeps the words it was placed on so
 * it can tell when those words changed, instead of drifting onto others.
 */
export type ManuscriptAnchor =
  | { level: 'paragraph'; blockId: string; text: string }
  | { level: 'sentence'; blockId: string; sentenceId: string; text: string }
  /** An exact range. `detached` marks a span whose words an edit replaced; it is never moved elsewhere. */
  | ({ level: 'span'; detached?: true } & PassageSelection);

export type ManuscriptAnchorResolution =
  | { status: 'placed'; selection: PassageSelection }
  /**
   * The words are not the ones attached to. A paragraph or sentence anchor that
   * still exists reports where it is now (`current`); a detached span has none.
   */
  | { status: 'changed'; current?: PassageSelection }
  /** The paragraph or sentence no longer exists. */
  | { status: 'missing' };

const paragraphContent = (paragraph: TextHighlightBlock) => trimRange(paragraph.text, { start: 0, end: paragraph.text.length });

const selectionOf = (paragraph: TextHighlightBlock, range: TextRange): PassageSelection => ({
  blockId: paragraph.id, selectedText: paragraph.text.slice(range.start, range.end), startOffset: range.start, endOffset: range.end,
});

/** The one resolver every attachment type shares: the exact current range, or why there is none. */
export function resolveAnchor(manuscript: Manuscript, anchor: ManuscriptAnchor): ManuscriptAnchorResolution {
  const paragraph = manuscript.paragraphs.find(candidate => candidate.id === anchor.blockId);
  if (!paragraph) return { status: 'missing' };
  if (anchor.level === 'span') {
    const { blockId, selectedText, startOffset, endOffset } = anchor;
    const selection = { blockId, selectedText, startOffset, endOffset };
    return !anchor.detached && isValidPassage(paragraph, selection) ? { status: 'placed', selection } : { status: 'changed' };
  }
  const range = anchor.level === 'paragraph'
    ? paragraphContent(paragraph)
    : paragraph.sentences.find(sentence => sentence.id === anchor.sentenceId);
  if (!range) return { status: anchor.level === 'paragraph' ? 'changed' : 'missing' };
  const selection = selectionOf(paragraph, range);
  return selection.selectedText === anchor.text ? { status: 'placed', selection } : { status: 'changed', current: selection };
}

export interface ManuscriptAddress {
  paragraph: { id: string; number: number };
  /** Every saved sentence the range touches, numbered through the whole page. */
  sentences: ReadonlyArray<{ id: string; number: number }>;
  /** The range is exactly one saved sentence. */
  exactSentence: boolean;
  /** The range is the paragraph's whole text. */
  wholeParagraph: boolean;
}

/** Where a range sits on the page: its paragraph and the saved sentences it touches. */
export function locateSelection(manuscript: Manuscript, selection: PassageSelection): ManuscriptAddress | undefined {
  let sentenceNumber = 0;
  for (const [index, paragraph] of manuscript.paragraphs.entries()) {
    if (paragraph.id !== selection.blockId) { sentenceNumber += paragraph.sentences.length; continue; }
    if (!isValidPassage(paragraph, selection)) return undefined;
    const sentences = paragraph.sentences.flatMap((sentence, position) =>
      sentence.start < selection.endOffset && sentence.end > selection.startOffset
        ? [{ id: sentence.id, number: sentenceNumber + position + 1 }] : []);
    const touched = paragraph.sentences.filter(sentence => sentences.some(entry => entry.id === sentence.id));
    const content = paragraphContent(paragraph);
    return {
      paragraph: { id: paragraph.id, number: index + 1 },
      sentences,
      exactSentence: touched.length === 1 && touched[0].start === selection.startOffset && touched[0].end === selection.endOffset,
      wholeParagraph: Boolean(content) && content!.start === selection.startOffset && content!.end === selection.endOffset,
    };
  }
  return undefined;
}

/**
 * The anchor for a selection at the chosen level: its exact words, the one
 * saved sentence it lies in, or its whole paragraph. A selection touching
 * several sentences has no single sentence to attach to.
 */
export function anchorAtLevel(manuscript: Manuscript, selection: PassageSelection, level: ManuscriptAnchorLevel): ManuscriptAnchor | undefined {
  const paragraph = manuscript.paragraphs.find(candidate => candidate.id === selection.blockId);
  if (!paragraph || !isValidPassage(paragraph, selection)) return undefined;
  if (level === 'span') {
    const { blockId, selectedText, startOffset, endOffset } = selection;
    return { level, blockId, selectedText, startOffset, endOffset };
  }
  if (level === 'paragraph') {
    const content = paragraphContent(paragraph);
    return content && { level, blockId: paragraph.id, text: paragraph.text.slice(content.start, content.end) };
  }
  const touched = paragraph.sentences.filter(sentence => sentence.start < selection.endOffset && sentence.end > selection.startOffset);
  return touched.length === 1
    ? { level, blockId: paragraph.id, sentenceId: touched[0].id, text: paragraph.text.slice(touched[0].start, touched[0].end) }
    : undefined;
}

export const sameAnchorTarget = (left: ManuscriptAnchor, right: ManuscriptAnchor): boolean => {
  if (left.level !== right.level || left.blockId !== right.blockId) return false;
  if (left.level === 'sentence') return left.sentenceId === (right as typeof left).sentenceId;
  if (left.level === 'span') {
    const other = right as typeof left;
    return left.startOffset === other.startOffset && left.endOffset === other.endOffset && left.selectedText === other.selectedText;
  }
  return true;
};

// ─── Attachments and the one edit rule ─────────────────────────────────────

export interface ManuscriptAttachment<Payload = unknown> {
  id: string;
  /** The owning system, e.g. `sound-cue`. The manuscript never interprets it. */
  kind: string;
  anchor: ManuscriptAnchor;
  /** Owned and read only by the attachment's system. */
  payload: Payload;
}

export interface ManuscriptState<Payload = unknown> {
  manuscript: Manuscript;
  attachments: readonly ManuscriptAttachment<Payload>[];
  /** The latest deletion, so Undo restores that paragraph's sentences and attachments exactly. */
  deletion?: { before: ManuscriptParagraph; after: string; attachments: readonly ManuscriptAttachment<Payload>[] };
}

export type ManuscriptEditResult<Payload> =
  | { ok: true; state: ManuscriptState<Payload> }
  | { ok: false; reason: 'sealed' | 'stale' | 'word-limit' };

/**
 * Saved sentences after an edit. Sentences wholly before the edit stay,
 * sentences after it shift, and only the touched sentences are split again;
 * the new pieces inherit the touched IDs in order, so correcting a word keeps
 * the sentence's identity.
 */
function rebaseSentences(
  paragraph: ManuscriptParagraph, text: string, start: number, removed: number, inserted: number,
  locale: string, createId: ManuscriptIdFactory,
): ManuscriptSentence[] {
  const end = start + removed;
  const delta = inserted - removed;
  const touches = (sentence: ManuscriptSentence) => removed === 0
    ? sentence.start <= start && sentence.end >= start
    : sentence.start < end && sentence.end > start;
  const touched = paragraph.sentences.filter(touches);
  const before = paragraph.sentences.filter(sentence => !touches(sentence) && sentence.end <= start);
  const after = paragraph.sentences.filter(sentence => !touches(sentence) && sentence.start >= end)
    .map(sentence => ({ ...sentence, start: sentence.start + delta, end: sentence.end + delta }));
  const regionStart = Math.min(start, ...touched.map(sentence => sentence.start));
  const regionEnd = Math.max(end, ...touched.map(sentence => sentence.end)) + delta;
  const rewritten = sentencesFor(text.slice(regionStart, regionEnd), locale, createId, regionStart, touched.map(sentence => sentence.id));
  return [...before, ...rewritten, ...after];
}

/** Spans wholly before an edit stay, spans after it shift, spans overlapping it are detached — never moved. */
function rebaseSpan(anchor: Extract<ManuscriptAnchor, { level: 'span' }>, start: number, removed: number, inserted: number): ManuscriptAnchor {
  if (anchor.detached) return anchor;
  const delta = inserted - removed;
  const shifted = { ...anchor, startOffset: anchor.startOffset + delta, endOffset: anchor.endOffset + delta };
  if (removed === 0) {
    if (anchor.startOffset >= start) return shifted;
    return anchor.endOffset <= start ? anchor : { ...anchor, detached: true };
  }
  if (anchor.endOffset <= start) return anchor;
  if (anchor.startOffset >= start + removed) return shifted;
  return { ...anchor, detached: true };
}

const replaceParagraph = (manuscript: Manuscript, paragraph: ManuscriptParagraph): Manuscript => ({
  ...manuscript, paragraphs: manuscript.paragraphs.map(candidate => candidate.id === paragraph.id ? paragraph : candidate),
});

/**
 * Applies one Text Highlight Engine edit to the page and every attachment on
 * it. This is the only place edits move attachments: paragraph and sentence
 * attachments follow their IDs and read as changed when their words change;
 * spans stay, shift, or are detached. Undo of the latest deletion restores
 * that paragraph's saved sentences and attachments exactly.
 */
export function applyPassageEdit<Payload>(
  state: ManuscriptState<Payload>, edit: PassageEdit, { createId = createManuscriptId }: Pick<ManuscriptOptions, 'createId'> = {},
): ManuscriptEditResult<Payload> {
  const { manuscript } = state;
  if (manuscript.status === 'sealed') return { ok: false, reason: 'sealed' };
  const paragraph = manuscript.paragraphs.find(candidate => candidate.id === edit.before.id);
  if (!paragraph || paragraph.text !== edit.before.text || edit.after.id !== paragraph.id) return { ok: false, reason: 'stale' };

  const start = edit.selection.startOffset;
  const removed = edit.operation === 'undo' ? 0 : edit.selection.endOffset - start;
  const inserted = edit.after.text.length - edit.before.text.length + removed;
  if (start < 0 || removed < 0 || inserted < 0 || start + removed > paragraph.text.length
    || edit.after.text.slice(0, start) !== paragraph.text.slice(0, start)
    || edit.after.text.slice(start + inserted) !== paragraph.text.slice(start + removed)) return { ok: false, reason: 'stale' };

  const inParagraph = (attachment: ManuscriptAttachment<Payload>) => attachment.anchor.blockId === paragraph.id;
  const moveWithText = (attachment: ManuscriptAttachment<Payload>) => inParagraph(attachment) && attachment.anchor.level === 'span'
    ? { ...attachment, anchor: rebaseSpan(attachment.anchor, start, removed, inserted) } : attachment;

  const { deletion } = state;
  if (edit.operation === 'undo' && deletion?.before.id === paragraph.id && deletion.after === paragraph.text && deletion.before.text === edit.after.text) {
    const restored = new Set(deletion.attachments.map(attachment => attachment.id));
    return { ok: true, state: {
      manuscript: replaceParagraph(manuscript, deletion.before),
      attachments: [
        // Attachments placed on this paragraph after the deletion move with the restored words.
        ...state.attachments.filter(attachment => !(inParagraph(attachment) && restored.has(attachment.id))).map(moveWithText),
        ...deletion.attachments,
      ],
    } };
  }

  const next: ManuscriptParagraph = {
    ...paragraph, text: edit.after.text,
    sentences: rebaseSentences(paragraph, edit.after.text, start, removed, inserted, manuscript.locale, createId),
  };
  const nextManuscript = replaceParagraph(manuscript, next);
  if (edit.operation === 'replace' && countManuscriptWords(nextManuscript) > MANUSCRIPT_PROTOTYPE_WORD_LIMIT) return { ok: false, reason: 'word-limit' };
  return { ok: true, state: {
    manuscript: nextManuscript,
    attachments: state.attachments.map(moveWithText),
    ...(edit.operation === 'delete'
      ? { deletion: { before: paragraph, after: edit.after.text, attachments: state.attachments.filter(inParagraph) } }
      : deletion && deletion.before.id !== paragraph.id ? { deletion } : {}),
  } };
}

/** Places or replaces one attachment. A sealed page is fixed. */
export function placeAttachment<Payload>(state: ManuscriptState<Payload>, attachment: ManuscriptAttachment<Payload>): ManuscriptState<Payload> {
  if (state.manuscript.status === 'sealed') return state;
  return { ...state, attachments: [...state.attachments.filter(existing => existing.id !== attachment.id), attachment] };
}

export function removeAttachment<Payload>(state: ManuscriptState<Payload>, id: string): ManuscriptState<Payload> {
  if (state.manuscript.status === 'sealed') return state;
  return { ...state, attachments: state.attachments.filter(attachment => attachment.id !== id) };
}

/**
 * Confirms a paragraph or sentence attachment whose words changed, so it now
 * belongs to the current words. A detached span has no current words to keep.
 */
export function keepAttachment<Payload>(state: ManuscriptState<Payload>, id: string): ManuscriptState<Payload> {
  const attachment = state.attachments.find(candidate => candidate.id === id);
  if (state.manuscript.status === 'sealed' || !attachment || attachment.anchor.level === 'span') return state;
  const resolution = resolveAnchor(state.manuscript, attachment.anchor);
  if (resolution.status !== 'changed' || !resolution.current) return state;
  const anchor = { ...attachment.anchor, text: resolution.current.selectedText };
  return { ...state, attachments: state.attachments.map(candidate => candidate.id === id ? { ...candidate, anchor } : candidate) };
}

export const flaggedAttachments = <Payload>(state: ManuscriptState<Payload>) =>
  state.attachments.filter(attachment => resolveAnchor(state.manuscript, attachment.anchor).status !== 'placed');

/** Seals the draft: this version becomes the chapter. Refused while any attachment is flagged. */
export function sealManuscript<Payload>(state: ManuscriptState<Payload>):
  | { ok: true; state: ManuscriptState<Payload> }
  | { ok: false; reason: 'flagged-attachments'; count: number } {
  const flagged = flaggedAttachments(state).length;
  if (flagged) return { ok: false, reason: 'flagged-attachments', count: flagged };
  return { ok: true, state: { manuscript: { ...state.manuscript, status: 'sealed' }, attachments: state.attachments } };
}
