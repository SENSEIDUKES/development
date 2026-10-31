import { splitSentences } from '../../highlight-engine/shared/manuscript';
import type { CodexEntry } from '../../../narrative/holdings';
import { isStatusTagWord, type WordTag } from '../../../narrative/marks';
import { STATUS_KIND, statusId, type StatusAttachment, type StatusPayload } from '../../../narrative/statuses';
import { normalizeIdentityLabel } from './canonicalProjection';
import { holdingName, pointedSentence, type CodexEntryResolver, type HoldingPassage } from './holdings';

/**
 * Status in the HARNESS, built the way appearances are: each status tag read
 * into a status on the sentence it points at, its name resolved to a Codex
 * character when its chapter commits, and each character's status now worked
 * out again, in story order, from every chapter. Never a model.
 */

/** More words than a status should carry: it says how someone is, not what happened. */
const STATUS_WORD_LIMIT = 8;

export type ReadStatusTag =
  | { ok: true; status: Omit<StatusPayload, 'origin'> }
  | { ok: false; problem: string };

/** One word tag read as a status: who, then how they are now. */
export function readStatusTag(tag: WordTag): ReadStatusTag {
  if (!isStatusTagWord(tag.word)) return { ok: false, problem: `a ${tag.word} tag is not a status` };
  const [written, ...rest] = tag.parts;
  const named = holdingName(written);
  if ('note' in named) return { ok: false, problem: `‘${named.note}’ is a note about the story, not a name, so its status tag was set aside` };
  const status = rest.join('; ').trim();
  if (!status) return { ok: false, problem: `a status tag for ${named.name} said nothing about how they are` };
  if (status.split(/\s+/).length > STATUS_WORD_LIMIT) return { ok: false, problem: `a status tag for ${named.name} told what happened instead of how they are, so it was set aside` };
  return { ok: true, status: { subject: { name: named.name }, status } };
}

export interface StatusPlacement {
  /** Each status on its sentence. Names are as the tag wrote them; entries are resolved when the chapter commits. */
  statuses: StatusAttachment[];
  /** Plain reasons for every tag that could not become a status. */
  problems: string[];
}

/** Places one status for every readable status tag, on the sentence it points at. */
export function placeStatuses({ paragraphs, locale }: {
  paragraphs: ReadonlyArray<{ blockId: string; text: string; wordTags: readonly WordTag[] }>;
  locale?: string;
}): StatusPlacement {
  const statuses: StatusAttachment[] = [];
  const problems: string[] = [];
  for (const { blockId, text, wordTags } of paragraphs) {
    const tags = wordTags.filter(tag => isStatusTagWord(tag.word));
    if (!tags.length) continue;
    const sentences = splitSentences(text, locale);
    for (const tag of tags) {
      const read = readStatusTag(tag);
      if (!read.ok) { problems.push(read.problem); continue; }
      const sentence = pointedSentence(sentences, tag.offset);
      if (!sentence) { problems.push(`a status tag for ${tag.parts[0]} pointed at no sentence`); continue; }
      statuses.push({
        id: statusId(blockId, sentence.start, sentence.end, statuses.length),
        kind: STATUS_KIND,
        anchor: { level: 'span', blockId, startOffset: sentence.start, endOffset: sentence.end, selectedText: text.slice(sentence.start, sentence.end) },
        payload: { origin: 'harness', ...read.status },
      });
    }
  }
  return { statuses, problems };
}

/** Resolves every status's name to a Codex character when its chapter commits, sharing the chapter's resolver. */
export const resolveStatuses = (statuses: readonly StatusAttachment[], resolver: CodexEntryResolver): StatusAttachment[] =>
  statuses.map(record => {
    const entry = resolver.character(record.payload.subject.name);
    return { ...record, payload: { ...record.payload, subject: { name: record.payload.subject.name, entryId: entry.id } } };
  });

/** A character's status now, with the passage that showed it. */
export interface CurrentStatus {
  status: string;
  passage: HoldingPassage;
}

/** The key a status is kept under: its Codex entry, or its name until one exists. */
export const statusKey = (subject: StatusPayload['subject']) => subject.entryId ?? `character:${normalizeIdentityLabel(subject.name)}`;

const paragraphIndex = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);

/**
 * Each character's status now: the latest status tag in story order, chapter
 * by chapter and in reading order within one. Nothing here is stored.
 */
export function deriveStatuses(chapters: ReadonlyArray<{ id: string; chapterNumber: number; statuses?: readonly StatusAttachment[] }>): Map<string, CurrentStatus> {
  const now = new Map<string, CurrentStatus>();
  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
    const ordered = [...chapter.statuses ?? []].filter(record => record.kind === STATUS_KIND)
      .sort((left, right) => paragraphIndex(left.anchor.blockId) - paragraphIndex(right.anchor.blockId) || left.anchor.startOffset - right.anchor.startOffset);
    for (const record of ordered) {
      now.set(statusKey(record.payload.subject), {
        status: record.payload.status,
        passage: { chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: record.id, blockId: record.anchor.blockId, text: record.anchor.selectedText },
      });
    }
  }
  return now;
}

/** One Codex entry's status now, by its entry or any of its names. */
export const statusOfEntry = (statuses: ReadonlyMap<string, CurrentStatus>, entry: Pick<CodexEntry, 'id' | 'name' | 'aliases'>) =>
  statuses.get(entry.id) ?? [entry.name, ...(entry.aliases ?? [])].map(name => statuses.get(`character:${normalizeIdentityLabel(name)}`)).find(Boolean);
