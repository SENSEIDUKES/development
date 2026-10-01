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

/**
 * Speaker records: who speaks one spoken line. A record is a manuscript span
 * attachment on the line's exact words, so the HARNESS (from a writer's
 * speaker tag), a person, or a later local model all write the same record,
 * and it knows when its words change.
 */
export const SPEAKER_KIND = 'speaker';

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
