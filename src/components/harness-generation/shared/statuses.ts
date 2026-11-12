import { splitSentences } from '../../highlight-engine/shared/manuscript';
import { isStatusTagWord, type WordTag } from '../../../narrative/marks';
import { STATUS_KIND, statusId, type StatusAttachment, type StatusPayload } from '../../../narrative/statuses';
import { normalizeIdentityLabel } from './canonicalProjection';
import { holdingName, pointedSentence, type CodexEntryResolver } from './holdings';

/**
 * Status in the HARNESS, built the way appearances are: each status tag read
 * into a status on the sentence it points at, and its name resolved to a Codex
 * character when its chapter commits. What each character carries, from these
 * and from their card, is worked out in `conditions.ts`. Never a model.
 */

/** More words than a condition that begins should carry: it says how someone is, not what happened. */
const STATUS_WORD_LIMIT = 8;

export type ReadStatusTag =
  | { ok: true; status: Omit<StatusPayload, 'origin'> }
  | { ok: false; problem: string };

/** One word tag read as a status: who, then the condition, then `ended` when the prose ends it there. */
export function readStatusTag(tag: WordTag): ReadStatusTag {
  if (!isStatusTagWord(tag.word)) return { ok: false, problem: `a ${tag.word} tag is not a status` };
  const [written, ...rest] = tag.parts;
  const named = holdingName(written);
  if ('note' in named) return { ok: false, problem: `‘${named.note}’ is a note about the story, not a name, so its status tag was set aside` };
  // A last part that says "ended" marks the sentence where the prose ends the condition.
  const ended = rest.length > 1 && /^ended$/i.test(rest.at(-1)!.trim());
  const status = (ended ? rest.slice(0, -1) : rest).join('; ').trim();
  if (!status) return { ok: false, problem: `a status tag for ${named.name} said nothing about how they are` };
  // An end names a condition already carried, by the words it is listed under, however many those are:
  // only a beginning is held to a few words, since that is where a tag could tell what happened instead.
  if (!ended && status.split(/\s+/).length > STATUS_WORD_LIMIT) return { ok: false, problem: `a status tag for ${named.name} told what happened instead of how they are, so it was set aside` };
  return { ok: true, status: { subject: { name: named.name }, status, ...(ended ? { ended: true as const } : {}) } };
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

/** The key a status is kept under: its Codex entry, or its name until one exists. */
export const statusKey = (subject: StatusPayload['subject']) => subject.entryId ?? `character:${normalizeIdentityLabel(subject.name)}`;
