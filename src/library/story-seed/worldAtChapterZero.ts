import {
  WORLD_CARD_KINDS,
  worldCardKey,
  type WorldRecord,
  type WorldCard,
  type WorldCardKindId,
} from '@seihouse/sen/contracts';
import type { StorySeedInput } from '@seihouse/sen/story-seed';

/**
 * The world as it stands at Chapter 0, read out of a Story Seed.
 *
 * The Seed holds the Codex's own card kinds (`WORLD_CARD_KINDS`), so this is a
 * straight reading, not an interpretation: every card the author filled, and
 * every card the World Blueprint filled for the blanks, in the one shape the
 * Codex shows. A reconciled Seed already carries the Blueprint's values
 * (`reconcileStorySeedBlueprint`), so the world is complete here before the
 * first chapter is written.
 *
 * Nothing invents a card: a blank Seed makes an empty world, and the chapters
 * go on creating whoever and whatever arrives after Chapter 0.
 */

/** Any Story Seed card, read by slot name. */
type SeedCard = { name?: string; aliases?: string[] };

const slotText = (source: SeedCard, field: string): string => {
  const value = (source as Record<string, unknown>)[field];
  return typeof value === 'string' ? value.trim() : '';
};

const slotsOf = (kind: WorldCardKindId, source: SeedCard): Record<string, string> =>
  Object.fromEntries(WORLD_CARD_KINDS.find(candidate => candidate.id === kind)!.slots
    .filter(slot => slot.id !== 'name' && !slot.aliases)
    .flatMap(slot => {
      const value = slotText(source, slot.id);
      return value ? [[slot.id, value] as const] : [];
    }));

const cardFrom = (
  kind: WorldCardKindId,
  source: SeedCard,
  extra: Partial<Pick<WorldCard, 'mainCharacter'>> = {},
): WorldCard | undefined => {
  const name = source.name?.trim();
  if (!name) return undefined;
  const aliases = (source.aliases ?? []).map(alias => alias.trim()).filter(Boolean);
  return {
    key: worldCardKey(kind, name),
    kind,
    name,
    ...(aliases.length ? { aliases } : {}),
    ...extra,
    // Everything a Story Seed and its Blueprint make is the world the story
    // opens with, so every card here entered before Chapter 1.
    enteredInChapter: 0,
    slots: slotsOf(kind, source),
  };
};

const cardsFrom = (kind: WorldCardKindId, list: readonly SeedCard[] | undefined): WorldCard[] =>
  (list ?? []).flatMap(entry => {
    const card = cardFrom(kind, entry);
    return card ? [card] : [];
  });

/**
 * Reads the world at Chapter 0 out of a Story Seed. Pass the reconciled Seed
 * (the Blueprint's values promoted into it) so the world is the complete one
 * the story opens with.
 */
export const worldAtChapterZeroFromStorySeed = (seed: StorySeedInput): WorldRecord => {
  const foundations = seed.world.optional.worldFoundations;
  const main = foundations.mainCharacter
    ? cardFrom('character', foundations.mainCharacter, { mainCharacter: true })
    : undefined;
  // The World rules sheet: one card for the whole story, and only when the
  // world states a rule. Its name is never shown; the sheet is the card.
  const rules = foundations.powerSystem
    ? cardFrom('world-rules', { ...foundations.powerSystem, name: 'World rules' })
    : undefined;
  const cards = [
    ...(main ? [main] : []),
    ...cardsFrom('character', foundations.additionalCharacters),
    ...cardsFrom('thing', foundations.things),
    ...cardsFrom('ability', foundations.startingAbilities),
    ...cardsFrom('place', foundations.places),
    ...cardsFrom('faction', foundations.factions),
    ...cardsFrom('species', foundations.species),
    ...(rules && Object.keys(rules.slots).length ? [rules] : []),
  ];
  // A card with a name and nothing else is still part of the world: the save-game
  // test needs to know it exists. A world with no card at all is simply empty.
  return { cards };
};
