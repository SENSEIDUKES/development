import { splitSentences } from '../../highlight-engine/shared/manuscript';
import type { CodexEntry } from '../../../narrative/holdings';
import { isTieTagWord, type WordTag } from '../../../narrative/marks';
import { TIE_KIND, tieId, type TieAttachment, type TiePayload } from '../../../narrative/ties';
import type { WorldRecord } from '../../../narrative/worldRecord';
import { normalizeIdentityLabel } from './canonicalProjection';
import { holdingName, pointedSentence, type CodexEntryResolver, type HoldingPassage } from './holdings';

/**
 * Ties in the HARNESS, built the way status is: each tie tag read into a tie
 * on the sentence it points at, its two names resolved when its chapter
 * commits, and how each pair stands now worked out again, in story order,
 * from every chapter. Never a model.
 */

/** The most ties the tagger reads beside one character, the latest the story showed: enough to keep a cast straight, and a bound on every request. */
export const TAG_SUBJECT_TIES = 12;

/** More words than a tie should carry: it says how two stand, not what happened between them. */
const TIE_WORD_LIMIT = 8;

export type ReadTieTag =
  | { ok: true; tie: Omit<TiePayload, 'origin'> }
  | { ok: false; problem: string };

/** One word tag read as a tie: the first name, the second, then how they stand now. */
export function readTieTag(tag: WordTag): ReadTieTag {
  if (!isTieTagWord(tag.word)) return { ok: false, problem: `a ${tag.word} tag is not a tie` };
  const [first, second, ...rest] = tag.parts;
  const named = holdingName(first);
  if ('note' in named) return { ok: false, problem: `‘${named.note}’ is a note about the story, not a name, so its tie tag was set aside` };
  const other = second ? holdingName(second) : undefined;
  if (!other) return { ok: false, problem: `a tie tag for ${named.name} named no one to be tied to` };
  if ('note' in other) return { ok: false, problem: `‘${other.note}’ is a note about the story, not a name, so its tie tag was set aside` };
  const tie = rest.join('; ').trim();
  if (!tie) return { ok: false, problem: `a tie tag for ${named.name} and ${other.name} said nothing about how they stand` };
  if (tie.split(/\s+/).length > TIE_WORD_LIMIT) return { ok: false, problem: `a tie tag for ${named.name} and ${other.name} told what happened instead of how they stand, so it was set aside` };
  if (normalizeIdentityLabel(named.name) === normalizeIdentityLabel(other.name)) return { ok: false, problem: `a tie tag tied ${named.name} to themselves, so it was set aside` };
  return { ok: true, tie: { subject: { name: named.name }, other: { name: other.name }, tie } };
}

export interface TiePlacement {
  /** Each tie on its sentence. Names are as the tag wrote them; entries are resolved when the chapter commits. */
  ties: TieAttachment[];
  /** Plain reasons for every tag that could not become a tie. */
  problems: string[];
}

/** Places one tie for every readable tie tag, on the sentence it points at. */
export function placeTies({ paragraphs, locale }: {
  paragraphs: ReadonlyArray<{ blockId: string; text: string; wordTags: readonly WordTag[] }>;
  locale?: string;
}): TiePlacement {
  const ties: TieAttachment[] = [];
  const problems: string[] = [];
  for (const { blockId, text, wordTags } of paragraphs) {
    const tags = wordTags.filter(tag => isTieTagWord(tag.word));
    if (!tags.length) continue;
    const sentences = splitSentences(text, locale);
    for (const tag of tags) {
      const read = readTieTag(tag);
      if (!read.ok) { problems.push(read.problem); continue; }
      const sentence = pointedSentence(sentences, tag.offset);
      if (!sentence) { problems.push(`a tie tag for ${tag.parts[0]} pointed at no sentence`); continue; }
      ties.push({
        id: tieId(blockId, sentence.start, sentence.end, ties.length),
        kind: TIE_KIND,
        anchor: { level: 'span', blockId, startOffset: sentence.start, endOffset: sentence.end, selectedText: text.slice(sentence.start, sentence.end) },
        payload: { origin: 'harness', ...read.tie },
      });
    }
  }
  return { ties, problems };
}

/**
 * Resolves every tie's two names when its chapter commits, sharing the
 * chapter's resolver. The first is a character; the second is the thing the
 * story already has by that name (a sword bound to its spirit), or one of the
 * world's thing cards not met yet, else a character. A tie naming a place, a
 * faction or an ability, in the Codex or only among the world's cards, is no
 * tie between two beings, and one that resolves both names to
 * the same entry ties no one; both are left out rather than made into
 * characters.
 */
export const resolveTies = (ties: readonly TieAttachment[], resolver: CodexEntryResolver, world?: WorldRecord): TieAttachment[] =>
  ties.flatMap(record => {
    // A name the Codex has not met yet may still be one of the world's cards: a thing becomes that thing,
    // and a place, a faction, an ability or a species is no one to be tied to.
    const worldCard = (name: string) => world?.cards
      .find(card => [card.name, ...(card.aliases ?? [])].some(label => normalizeIdentityLabel(label) === normalizeIdentityLabel(name)));
    const first = resolver.existing(record.payload.subject.name);
    const second = resolver.existing(record.payload.other.name);
    const firstCard = first ? undefined : worldCard(record.payload.subject.name);
    const secondCard = second ? undefined : worldCard(record.payload.other.name);
    // Decided before anything is made, so a tie left out leaves no entry behind.
    if ((first && first.kind !== 'character') || (firstCard && firstCard.kind !== 'character')) return [];
    if ((second && second.kind !== 'character' && second.kind !== 'thing') || (secondCard && secondCard.kind !== 'character' && secondCard.kind !== 'thing')) return [];
    const subject = first ?? resolver.character(firstCard?.name ?? record.payload.subject.name);
    const other = second ?? (secondCard?.kind === 'thing' ? resolver.entry('thing', secondCard.name) : resolver.character(secondCard?.name ?? record.payload.other.name));
    if (subject.id === other.id) return [];
    return [{
      ...record,
      payload: {
        ...record.payload,
        subject: { name: record.payload.subject.name, entryId: subject.id },
        other: { name: record.payload.other.name, entryId: other.id },
      },
    }];
  });

/** How a pair stands now, with the passage that showed it. */
export interface CurrentTie {
  tie: string;
  /** The two, as the latest tag named them, in the tag's order. */
  names: [string, string];
  /** Their Codex entries, once resolved, in the same order. */
  entryIds: [string | undefined, string | undefined];
  passage: HoldingPassage;
}

/** The key one side of a tie is kept under: its Codex entry, or its name until one exists. */
const sideKey = (side: TiePayload['subject']) => side.entryId ?? `name:${normalizeIdentityLabel(side.name)}`;
/** The key a tie is kept under: its pair, whichever of the two a tag names first. */
export const tieKey = (payload: Pick<TiePayload, 'subject' | 'other'>) => [sideKey(payload.subject), sideKey(payload.other)].sort().join('|');

const paragraphIndex = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);

/**
 * How each pair stands now: the pair's latest tie tag in story order, chapter
 * by chapter and in reading order within one. Nothing here is stored.
 */
export function deriveTies(
  chapters: ReadonlyArray<{ id: string; chapterNumber: number; ties?: readonly TieAttachment[] }>,
  entries: readonly Pick<CodexEntry, 'id' | 'name'>[] = [],
): Map<string, CurrentTie> {
  const now = new Map<string, CurrentTie>();
  const nameOf = (side: TiePayload['subject']) => (side.entryId ? entries.find(entry => entry.id === side.entryId)?.name : undefined) ?? side.name;
  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
    const ordered = [...chapter.ties ?? []].filter(record => record.kind === TIE_KIND)
      .sort((left, right) => paragraphIndex(left.anchor.blockId) - paragraphIndex(right.anchor.blockId) || left.anchor.startOffset - right.anchor.startOffset);
    for (const record of ordered) {
      const { subject, other, tie } = record.payload;
      // Set again at the end, so the pairs stay in the order the story last showed each.
      now.delete(tieKey(record.payload));
      now.set(tieKey(record.payload), {
        tie,
        names: [nameOf(subject), nameOf(other)],
        entryIds: [subject.entryId, other.entryId],
        passage: { chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: record.id, blockId: record.anchor.blockId, text: record.anchor.selectedText },
      });
    }
  }
  return now;
}

/** One of an entry's ties now: who it is with, how they stand, and where the story showed it. */
export interface EntryTie {
  /** The other one, as the record names them. */
  with: string;
  withEntryId?: string;
  tie: string;
  passage: HoldingPassage;
}

/** Every tie one Codex entry has now, by its entry or any of its names, in the order the story last showed each. */
export function tiesOfEntry(ties: ReadonlyMap<string, CurrentTie>, entry: Pick<CodexEntry, 'id' | 'name' | 'aliases'>): EntryTie[] {
  const names = new Set([entry.name, ...(entry.aliases ?? [])].map(normalizeIdentityLabel));
  const isEntry = (index: 0 | 1, tie: CurrentTie) => tie.entryIds[index] === entry.id || (!tie.entryIds[index] && names.has(normalizeIdentityLabel(tie.names[index])));
  const found: EntryTie[] = [];
  for (const tie of ties.values()) {
    const side = isEntry(0, tie) ? 0 : isEntry(1, tie) ? 1 : undefined;
    if (side === undefined) continue;
    const otherSide = side === 0 ? 1 : 0;
    found.push({ with: tie.names[otherSide], ...(tie.entryIds[otherSide] ? { withEntryId: tie.entryIds[otherSide] } : {}), tie: tie.tie, passage: tie.passage });
  }
  return found.sort((left, right) => left.passage.chapterNumber - right.passage.chapterNumber);
}

/** An entry's ties as one line: "Ning Hao (sworn enemies); Little Frost (bonded companion)". */
export const tiesLine = (ties: readonly EntryTie[]) => ties.map(tie => `${tie.with} (${tie.tie})`).join('; ');
