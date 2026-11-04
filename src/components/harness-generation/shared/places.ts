import { splitSentences } from '../../highlight-engine/shared/manuscript';
import type { CodexEntry } from '../../../narrative/holdings';
import { isPlaceTagWord, type WordTag } from '../../../narrative/marks';
import { PLACE_KIND, placeId, type PlaceAttachment, type PlacePayload } from '../../../narrative/places';
import { normalizeIdentityLabel } from './canonicalProjection';
import { holdingName, pointedSentence, type CodexEntryResolver, type HoldingPassage } from './holdings';

/**
 * Place in the HARNESS, built the way status is: each place tag read into a
 * place tag on the sentence it points at, its two names resolved when its
 * chapter commits (the character, and the place's own Codex entry), and where
 * each character is now worked out again, in story order, from every chapter.
 * Never a model.
 */

/** More words than a place's name should carry: it names where, not what happens there. */
const PLACE_WORD_LIMIT = 8;
/** The most characters a place's name may carry: a name every later tagging request sends (TAG_NAME_CHARACTERS). */
const PLACE_NAME_CHARACTERS = 200;

export type ReadPlaceTag =
  | { ok: true; place: Omit<PlacePayload, 'origin'> }
  | { ok: false; problem: string };

/** One word tag read as a place tag: who, then where they are now. */
export function readPlaceTag(tag: WordTag): ReadPlaceTag {
  if (!isPlaceTagWord(tag.word)) return { ok: false, problem: `a ${tag.word} tag is not a place` };
  const [written, ...rest] = tag.parts;
  const named = holdingName(written);
  if ('note' in named) return { ok: false, problem: `‘${named.note}’ is a note about the story, not a name, so its place tag was set aside` };
  const where = rest.join('; ').trim();
  if (!where) return { ok: false, problem: `a place tag for ${named.name} named no place` };
  const place = holdingName(where);
  if ('note' in place || where.split(/\s+/).length > PLACE_WORD_LIMIT || place.name.length > PLACE_NAME_CHARACTERS) return { ok: false, problem: `a place tag for ${named.name} described more than a place, so it was set aside` };
  return { ok: true, place: { subject: { name: named.name }, place: { name: place.name } } };
}

export interface PlacePlacement {
  /** Each place tag on its sentence. Names are as the tag wrote them; entries are resolved when the chapter commits. */
  places: PlaceAttachment[];
  /** Plain reasons for every tag that could not become a place tag. */
  problems: string[];
}

/** Places one place tag for every readable place tag, on the sentence it points at. */
export function placePlaces({ paragraphs, locale }: {
  paragraphs: ReadonlyArray<{ blockId: string; text: string; wordTags: readonly WordTag[] }>;
  locale?: string;
}): PlacePlacement {
  const places: PlaceAttachment[] = [];
  const problems: string[] = [];
  for (const { blockId, text, wordTags } of paragraphs) {
    const tags = wordTags.filter(tag => isPlaceTagWord(tag.word));
    if (!tags.length) continue;
    const sentences = splitSentences(text, locale);
    for (const tag of tags) {
      const read = readPlaceTag(tag);
      if (!read.ok) { problems.push(read.problem); continue; }
      const sentence = pointedSentence(sentences, tag.offset);
      if (!sentence) { problems.push(`a place tag for ${tag.parts[0]} pointed at no sentence`); continue; }
      places.push({
        id: placeId(blockId, sentence.start, sentence.end, places.length),
        kind: PLACE_KIND,
        anchor: { level: 'span', blockId, startOffset: sentence.start, endOffset: sentence.end, selectedText: text.slice(sentence.start, sentence.end) },
        payload: { origin: 'harness', ...read.place },
      });
    }
  }
  return { places, problems };
}

/**
 * Resolves every place tag's two names when its chapter commits, sharing the
 * chapter's resolver: the character, and the place. A tag whose "who" is a
 * place the story already has is no character arriving, so it is left out
 * rather than made into a character.
 */
export const resolvePlaces = (places: readonly PlaceAttachment[], resolver: CodexEntryResolver): PlaceAttachment[] =>
  places.filter(record => resolver.existing(record.payload.subject.name)?.kind !== 'place').map(record => {
    const who = resolver.character(record.payload.subject.name);
    const where = resolver.entry('place', record.payload.place.name);
    return {
      ...record,
      payload: {
        ...record.payload,
        subject: { name: record.payload.subject.name, entryId: who.id },
        place: { name: record.payload.place.name, entryId: where.id },
      },
    };
  });

/** Where a character is now, with the passage where they arrived. */
export interface CurrentPlace {
  /** The place, as the record names it: its Codex entry's name once resolved. */
  place: string;
  placeEntryId?: string;
  /** Who, as the latest tag named them. */
  name: string;
  passage: HoldingPassage;
}

/** The key a character's place is kept under: their Codex entry, or their name until one exists. */
export const placeKey = (subject: PlacePayload['subject']) => subject.entryId ?? `character:${normalizeIdentityLabel(subject.name)}`;

const paragraphIndex = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);

/**
 * Where each character is now: the latest place tag in story order, chapter
 * by chapter and in reading order within one. Nothing here is stored.
 */
export function derivePlaces(
  chapters: ReadonlyArray<{ id: string; chapterNumber: number; places?: readonly PlaceAttachment[] }>,
  entries: readonly Pick<CodexEntry, 'id' | 'name'>[] = [],
): Map<string, CurrentPlace> {
  const now = new Map<string, CurrentPlace>();
  const nameOf = (place: PlacePayload['place']) => (place.entryId ? entries.find(entry => entry.id === place.entryId)?.name : undefined) ?? place.name;
  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
    const ordered = [...chapter.places ?? []].filter(record => record.kind === PLACE_KIND)
      .sort((left, right) => paragraphIndex(left.anchor.blockId) - paragraphIndex(right.anchor.blockId) || left.anchor.startOffset - right.anchor.startOffset);
    for (const record of ordered) {
      now.set(placeKey(record.payload.subject), {
        place: nameOf(record.payload.place),
        ...(record.payload.place.entryId ? { placeEntryId: record.payload.place.entryId } : {}),
        name: record.payload.subject.name,
        passage: { chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: record.id, blockId: record.anchor.blockId, text: record.anchor.selectedText },
      });
    }
  }
  return now;
}

/** One Codex entry's place now, by its entry or any of its names. */
export const placeOfEntry = (places: ReadonlyMap<string, CurrentPlace>, entry: Pick<CodexEntry, 'id' | 'name' | 'aliases'>) =>
  places.get(entry.id) ?? [entry.name, ...(entry.aliases ?? [])].map(name => places.get(`character:${normalizeIdentityLabel(name)}`)).find(Boolean);
