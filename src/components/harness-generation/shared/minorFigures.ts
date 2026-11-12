import type { AppearanceAttachment } from '../../../narrative/appearances';
import type { CodexEntry, CodexEntryKind, HoldingChangeAttachment } from '../../../narrative/holdings';
import type { HarnessChapter, LeftOutTag } from '../../../narrative/generation';
import type { PlaceAttachment } from '../../../narrative/places';
import type { StatusAttachment } from '../../../narrative/statuses';
import type { TieAttachment } from '../../../narrative/ties';
import type { WorldRecord } from '../../../narrative/worldRecord';
import { normalizeIdentityLabel } from './canonicalProjection';
import { isMinorEntry, type DeclaredCharacter } from './holdings';
import { holdingTagText } from './holdingsFixer';
import { placeTagText, statusTagText } from './recordChecks';
import { isMainCharacterTag } from './speakers';

/**
 * Minor figures and the tags they may carry (SENSEI, 2026-11-11: "the taggers
 * are not inventing… they're uncovering"; step 3b of making the record lead
 * and the story follow).
 *
 * In a story with a world, the cards are who and what the story is about. The
 * tagger is handed them and marks where they are on the page and what happens
 * to them there. Anyone else a chapter names is a minor figure: the record
 * keeps where they appear and what they say, and nothing more, until a reader
 * promotes them to a card. A thing or place that is no card is named only in a
 * card character's own tag (what they gained, where they arrived), so it gets
 * no appears tag of its own.
 *
 * The tagger is told this in the tag rules. `tagsOfCards` holds it to that: it
 * takes one read's tags before any of their names becomes a Codex entry, keeps
 * the ones a card carries, and names every other one, so the Codex can list
 * what was left out among its checks. A story with no cards at all has nothing
 * to tell a minor figure from, and keeps every tag.
 */

/** The tags of one read that name someone or something. */
export interface NamingTags {
  holdingChanges?: readonly HoldingChangeAttachment[];
  appearances?: readonly AppearanceAttachment[];
  statuses?: readonly StatusAttachment[];
  places?: readonly PlaceAttachment[];
  ties?: readonly TieAttachment[];
}

export interface TagsOfCards {
  holdingChanges: HoldingChangeAttachment[];
  appearances: AppearanceAttachment[];
  statuses: StatusAttachment[];
  places: PlaceAttachment[];
  ties: TieAttachment[];
  /** Every tag that was not kept, in the order above. */
  leftOut: LeftOutTag[];
}

const appearanceTagText = ({ payload }: Pick<AppearanceAttachment, 'payload'>) => payload.event === 'look'
  ? `[[look: ${payload.subject.name} | ${payload.change ?? ''}]]`
  : `[[appears: ${payload.subject.name} | ${payload.entity ?? 'character'}]]`;
const tieTagText = ({ payload }: Pick<TieAttachment, 'payload'>) => `[[tie: ${payload.subject.name} | ${payload.other.name} | ${payload.tie}]]`;

/**
 * One read's tags, without the ones only a card carries. `entries` are the
 * story's Codex entries as they stand before this chapter's tags name anyone
 * new, so a name no entry answers to is a minor figure stepping onto the page.
 */
export function tagsOfCards({ tags, storyId, entries, world, declared }: {
  tags: NamingTags;
  storyId: string;
  entries: readonly CodexEntry[];
  world: WorldRecord | undefined;
  declared: readonly DeclaredCharacter[];
}): TagsOfCards {
  const all = {
    holdingChanges: [...tags.holdingChanges ?? []],
    appearances: [...tags.appearances ?? []],
    statuses: [...tags.statuses ?? []],
    places: [...tags.places ?? []],
    ties: [...tags.ties ?? []],
  };
  if (!world?.cards.length) return { ...all, leftOut: [] };

  const cards = entries.filter(entry => entry.storyId === storyId && !isMinorEntry(entry, world));
  const main = declared.find(character => character.mainCharacter);
  const mainNames = new Set((main ? [main.name, ...(main.aliases ?? [])] : []).map(normalizeIdentityLabel).filter(Boolean));
  const answers = (entry: CodexEntry, name: string) => [entry.name, ...(entry.aliases ?? [])].some(candidate => normalizeIdentityLabel(candidate) === normalizeIdentityLabel(name));
  const isCard = (name: string, kinds?: readonly CodexEntryKind[]) => Boolean(normalizeIdentityLabel(name))
    && cards.some(entry => (!kinds || kinds.includes(entry.kind)) && answers(entry, name));
  const isCardCharacter = (name: string) => isMainCharacterTag(name) || mainNames.has(normalizeIdentityLabel(name)) || isCard(name, ['character']);

  const leftOut: LeftOutTag[] = [];
  const keep = <T extends { id: string; anchor: { blockId: string } }>(records: readonly T[], kept: (record: T) => boolean, named: (record: T) => Pick<LeftOutTag, 'tag' | 'name' | 'why'>) =>
    records.filter(record => {
      if (kept(record)) return true;
      leftOut.push({ id: record.id, blockId: record.anchor.blockId, ...named(record) });
      return false;
    });
  const minor = (name: string, tag: string) => ({ tag, name, why: 'minor-figure' as const });

  return {
    holdingChanges: keep(all.holdingChanges, change => isCardCharacter(change.payload.holder.name), change => minor(change.payload.holder.name, holdingTagText(change))),
    appearances: keep(all.appearances, ({ payload }) => {
      // A changed look is a card's. Anyone may step onto the page; a thing or a place does only when it is a card.
      if (payload.event === 'look') return isCardCharacter(payload.subject.name) || isCard(payload.subject.name);
      const entity = payload.entity ?? 'character';
      return entity === 'character' || isCard(payload.subject.name, [entity]);
    }, appearance => appearance.payload.event === 'look'
      ? minor(appearance.payload.subject.name, appearanceTagText(appearance))
      : { tag: appearanceTagText(appearance), name: appearance.payload.subject.name, why: 'not-a-card' }),
    statuses: keep(all.statuses, status => isCardCharacter(status.payload.subject.name), status => minor(status.payload.subject.name, statusTagText(status))),
    places: keep(all.places, place => isCardCharacter(place.payload.subject.name), place => minor(place.payload.subject.name, placeTagText(place))),
    // A tie is kept while one of the two is a card: it is that card's tie, whoever the other is.
    ties: keep(all.ties, ({ payload }) => isCardCharacter(payload.subject.name) || isCardCharacter(payload.other.name) || isCard(payload.other.name),
      tie => minor(tie.payload.subject.name, tieTagText(tie))),
    leftOut,
  };
}

/** A tag the tagger placed that the chapter did not keep, as one of the Codex's checks. */
export interface LeftOutTagFlag {
  kind: 'tag-left-out';
  message: string;
  chapterId: string;
  chapterNumber: number;
  recordId: string;
  blockId: string;
  name: string;
}

/** Every tag the story's chapters left out, in story order. */
export const leftOutTagFlags = (chapters: readonly Pick<HarnessChapter, 'id' | 'chapterNumber' | 'tagging'>[]): LeftOutTagFlag[] =>
  [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber).flatMap(chapter => (chapter.tagging?.leftOut ?? []).map((left): LeftOutTagFlag => ({
    kind: 'tag-left-out',
    message: left.why === 'not-a-card'
      ? `Chapter ${chapter.chapterNumber}: ‘${left.name}’ is not a card, so it steps onto the page only in a card character's own tag. ${left.tag} is left out.`
      : `Chapter ${chapter.chapterNumber}: ‘${left.name}’ is a minor figure, who keeps only where they appear and what they say. ${left.tag} is left out. Promote them to a card to keep tags like it.`,
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    recordId: left.id,
    blockId: left.blockId,
    name: left.name,
  })));
