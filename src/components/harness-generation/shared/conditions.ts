import { conditionAfter, worldCardConditions, type ConditionNow } from '../../../narrative/conditions';
import type { ConditionsSection } from '../../../narrative/generation';
import { worldCardsOfKind, type WorldRecord } from '../../../narrative/worldRecord';

/**
 * Conditions in the HARNESS: what each character carries at a chapter, worked
 * out from their card and the chapter count alone (`narrative/conditions`).
 * Nothing here is stored and nothing is a model: the card states the whole
 * course, and code runs it as the chapters pass.
 *
 * A condition begins with its card: in Chapter 1 for a card the world opened
 * with, in the chapter a later card entered.
 */

/** One character's conditions at a chapter. */
export interface CharacterConditions {
  /** The character's world card. */
  cardKey: string;
  name: string;
  mainCharacter: boolean;
  conditions: ConditionNow[];
}

/**
 * Every character's conditions as they stand in `chapterNumber`, the main
 * character first. A card that has not entered yet carries nothing yet, and a
 * condition that has passed is no longer listed.
 */
export function deriveConditions(world: WorldRecord | undefined, chapterNumber: number): CharacterConditions[] {
  const chapter = Math.max(1, Math.floor(chapterNumber));
  return worldCardsOfKind(world, 'character')
    .filter(card => card.enteredInChapter <= chapter)
    .map(card => {
      const elapsed = chapter - Math.max(1, card.enteredInChapter);
      const conditions = worldCardConditions(card)
        .flatMap(condition => { const now = conditionAfter(condition, elapsed); return now ? [now] : []; });
      return { cardKey: card.key, name: card.name, mainCharacter: Boolean(card.mainCharacter), conditions };
    })
    .filter(character => character.conditions.length)
    .sort((left, right) => Number(right.mainCharacter) - Number(left.mainCharacter));
}

/** The Conditions section the writer reads for `chapterNumber`, or undefined when no one carries anything. */
export function conditionsSection(world: WorldRecord | undefined, chapterNumber: number): ConditionsSection | undefined {
  const characters = deriveConditions(world, chapterNumber)
    .map(({ name, mainCharacter, conditions }) => ({ name, ...(mainCharacter ? { mainCharacter: true as const } : {}), conditions }));
  return characters.length ? { characters } : undefined;
}
