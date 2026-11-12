import { conditionAfter, worldCardConditions, type Condition, type ConditionNow } from '../../../narrative/conditions';
import type { ConditionsSection } from '../../../narrative/generation';
import type { CodexEntry } from '../../../narrative/holdings';
import { STATUS_KIND, type StatusAttachment } from '../../../narrative/statuses';
import { worldCardsOfKind, type WorldRecord } from '../../../narrative/worldRecord';
import { normalizeIdentityLabel } from './canonicalProjection';
import { namesNearlyMatch, type HoldingPassage } from './holdings';

/**
 * Conditions in the HARNESS: what each character carries at a chapter.
 *
 * Two things say what someone carries, and code puts them together:
 *
 * - **Their card** states their conditions with the whole course
 *   (`narrative/conditions`); the stage each has reached is worked out from
 *   the chapter count alone. A card's conditions begin with the card: in
 *   Chapter 1 for one the world opened with, in the chapter a later card
 *   entered.
 * - **The page** begins and ends conditions (SENSEI, 2026-11-11): a status tag
 *   marks the sentence where the prose gives someone a lasting condition, and
 *   one marked `ended` the sentence where the prose ends one. A condition the
 *   page began has no course: it stands until the page ends it. An `ended` tag
 *   ends a card's condition too, so a cure stops its course.
 *
 * Nothing here is stored and nothing is a model. The tags only say where the
 * prose showed a beginning or an end; how a condition goes in between is its
 * card's course, run by the chapter count.
 */

/** A condition someone carries: as it stands now, and where the page began it when the page did. */
export type CarriedCondition = ConditionNow & { began?: HoldingPassage };

/** One character's conditions at a chapter. */
export interface CharacterConditions {
  /** Who: their Codex entry's ID, or `character:` and their name while they have none. */
  key: string;
  /** Their world card, when they have one. */
  cardKey?: string;
  name: string;
  mainCharacter: boolean;
  conditions: CarriedCondition[];
}

/** An `ended` tag that ended nothing: no one carried a condition of that name there. */
export interface ConditionFlag {
  kind: 'condition-not-carried';
  message: string;
  chapterId: string;
  chapterNumber: number;
  recordId: string;
  blockId: string;
  name: string;
}

export interface ConditionsState {
  /** Everyone who carries something, the main character first. */
  characters: CharacterConditions[];
  flags: ConditionFlag[];
}

/** The chapters conditions are read from: each with its number and its status tags. */
export type ConditionsChapter = { id: string; chapterNumber: number; statuses?: readonly StatusAttachment[] };

const label = normalizeIdentityLabel;
/** A condition's name as it is compared: its own words, whole, so "broken arm (left)" is never "broken arm (right)". */
const conditionKey = (name: string) => name.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
/** What a name says in brackets: the part that tells two conditions of one name apart (left, right). */
const inBrackets = (name: string) => (name.match(/\(([^)]*)\)/)?.[1] ?? '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
/** Two names a tagger could mean one condition by: near in their words, and never told apart by what each says in brackets. */
const nearCondition = (left: string, right: string) => namesNearlyMatch(left, right)
  && (!inBrackets(left) || !inBrackets(right) || inBrackets(left) === inBrackets(right));
const paragraphIndex = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);

interface Carrier {
  key: string;
  cardKey?: string;
  name: string;
  mainCharacter: boolean;
  /** The chapter their card's conditions began in. */
  since: number;
  card: Array<{ condition: Condition; endedIn?: number }>;
  page: Array<{ name: string; began: HoldingPassage }>;
}

/**
 * What every character carries as `chapterNumber` stands: their card's
 * conditions at the stage the chapter count gives, and the ones the page
 * began, less every one the page ended. `chapters` are the chapters whose tags
 * count: the ones committed before a chapter being written, or all of them
 * for the story as it stands.
 */
export function deriveConditions({ world, entries = [], chapters = [], chapterNumber }: {
  world?: WorldRecord;
  /** This story's Codex entries, so a tag and a card that name one person are one person. */
  entries?: readonly CodexEntry[];
  chapters?: readonly ConditionsChapter[];
  chapterNumber: number;
}): ConditionsState {
  const now = Math.max(1, Math.floor(chapterNumber));
  const carriers = new Map<string, Carrier>();
  const byLabel = new Map<string, string>();
  const characters = entries.filter(entry => entry.kind === 'character');
  const know = (key: string, names: readonly string[]) => { for (const name of names) if (!byLabel.has(label(name))) byLabel.set(label(name), key); };
  for (const entry of characters) know(entry.id, [entry.name, ...(entry.aliases ?? [])]);

  for (const card of worldCardsOfKind(world, 'character')) {
    const names = [card.name, ...(card.aliases ?? [])];
    const entry = characters.find(candidate => candidate.cardKey === card.key)
      ?? characters.find(candidate => !candidate.cardKey && names.some(name => [candidate.name, ...(candidate.aliases ?? [])].some(other => label(other) === label(name))));
    const key = entry?.id ?? `character:${label(card.name)}`;
    know(key, names);
    if (carriers.has(key)) continue;
    carriers.set(key, {
      key, cardKey: card.key, name: entry?.name ?? card.name, mainCharacter: Boolean(card.mainCharacter || entry?.mainCharacter),
      since: Math.max(1, card.enteredInChapter),
      card: card.enteredInChapter <= now ? worldCardConditions(card).map(condition => ({ condition })) : [],
      page: [],
    });
  }

  const flags: ConditionFlag[] = [];
  const carrierOf = (subject: { name: string; entryId?: string }): Carrier => {
    const entry = subject.entryId ? characters.find(candidate => candidate.id === subject.entryId) : undefined;
    const key = subject.entryId ?? byLabel.get(label(subject.name)) ?? `character:${label(subject.name)}`;
    const known = carriers.get(key);
    if (known) return known;
    const carrier: Carrier = { key, name: entry?.name ?? subject.name, mainCharacter: Boolean(entry?.mainCharacter), since: 1, card: [], page: [] };
    carriers.set(key, carrier);
    return carrier;
  };
  /** A card's condition that is still carried in `chapter`: not ended by the page, and not passed by its own course. */
  const standing = (carrier: Carrier, chapter: number) => carrier.card
    .filter(entry => entry.endedIn === undefined && conditionAfter(entry.condition, chapter - carrier.since));
  /**
   * The condition a tag names, among those the carrier has in `chapter`. Its
   * exact name wins: the name itself, or the name as the tagger's list shows
   * it, with how it shows now ("Old wall wound (opens again)"). Only when no
   * name is exact does a near one count (a tagger's "frost-burned hands" for
   * "frost-burned hand"), and only when it is near exactly one: a name that
   * could be two conditions names neither.
   */
  const named = (carrier: Carrier, chapter: number, name: string): { page: number } | { card: Carrier['card'][number] } | undefined => {
    const candidates = [
      ...carrier.page.map((condition, page) => ({ found: { page }, name: condition.name, keys: [conditionKey(condition.name)] })),
      ...standing(carrier, chapter).map(card => ({
        found: { card }, name: card.condition.name,
        keys: [conditionKey(card.condition.name), ...card.condition.stages.map(stage => conditionKey(`${card.condition.name} (${stage})`))],
      })),
    ];
    const wanted = conditionKey(name);
    const exact = candidates.find(candidate => candidate.keys.includes(wanted));
    if (exact) return exact.found;
    const near = candidates.filter(candidate => nearCondition(candidate.name, name));
    return near.length === 1 ? near[0].found : undefined;
  };

  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
    const ordered = [...chapter.statuses ?? []].filter(record => record.kind === STATUS_KIND)
      .sort((left, right) => paragraphIndex(left.anchor.blockId) - paragraphIndex(right.anchor.blockId) || left.anchor.startOffset - right.anchor.startOffset);
    for (const record of ordered) {
      const carrier = carrierOf(record.payload.subject);
      const name = record.payload.status;
      const carried = named(carrier, chapter.chapterNumber, name);
      if (record.payload.ended) {
        if (carried && 'page' in carried) carrier.page.splice(carried.page, 1);
        else if (carried) carried.card.endedIn = chapter.chapterNumber;
        else {
          flags.push({
            kind: 'condition-not-carried', chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: record.id, blockId: record.anchor.blockId, name: carrier.name,
            message: `Chapter ${chapter.chapterNumber}: a tag says ‘${name}’ ended for ${carrier.name}, but they carried no such condition. It is left out.`,
          });
        }
        continue;
      }
      // Already carried, by their card or from an earlier sentence: it is not carried twice.
      if (carried) continue;
      carrier.page.push({ name, began: { chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: record.id, blockId: record.anchor.blockId, text: record.anchor.selectedText } });
    }
  }

  const carried = [...carriers.values()].map((carrier): CharacterConditions => ({
    key: carrier.key,
    ...(carrier.cardKey ? { cardKey: carrier.cardKey } : {}),
    name: carrier.name,
    mainCharacter: carrier.mainCharacter,
    conditions: [
      ...carrier.card.filter(entry => entry.endedIn === undefined)
        .flatMap(entry => { const as = conditionAfter(entry.condition, now - carrier.since); return as ? [as] : []; }),
      ...carrier.page.map(({ name, began }): CarriedCondition => ({ name, endsIf: [], began })),
    ],
  })).filter(character => character.conditions.length);
  // The main character first; everyone else in the order the world, then the story, brought them.
  return { characters: carried.sort((left, right) => Number(right.mainCharacter) - Number(left.mainCharacter)), flags };
}

/** The Conditions section the writer reads for `chapterNumber`, or undefined when no one carries anything. */
export function conditionsSection(input: Parameters<typeof deriveConditions>[0]): ConditionsSection | undefined {
  const characters = deriveConditions(input).characters.map(({ name, mainCharacter, conditions }) => ({
    name, ...(mainCharacter ? { mainCharacter: true as const } : {}),
    // Where the page began one is the record's to know, not the writer's to read.
    conditions: conditions.map(({ began: _began, ...condition }) => condition),
  }));
  return characters.length ? { characters } : undefined;
}

/** The longest one condition reads in a list a model is given. */
const CONDITION_LABEL_CHARACTERS = 200;
/** A condition in a few words, for a list: its name, and how it shows now when its card says. */
export const conditionLabel = (condition: Pick<ConditionNow, 'name' | 'showing'>) =>
  `${condition.name}${condition.showing ? ` (${condition.showing})` : ''}`.slice(0, CONDITION_LABEL_CHARACTERS);
