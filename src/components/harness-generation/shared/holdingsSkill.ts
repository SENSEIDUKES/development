import type { HarnessSkillManifest } from '../../../narrative/generation';
import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How the writer keeps holdings, in the tiny SEN language: it reads what every
 * character has in Story Information's Holdings section, uses only that, and
 * tags each change where the story makes it. The HARNESS removes the tags,
 * saves each change on its sentence, and checks it against what came before.
 * The examples use placeholders (Name, Thing, Ability), so no example item can
 * slip into a story. The main character's tag is the speakers' own, `MC`.
 */
export const SEN_HOLDINGS_INSTRUCTIONS = `Holdings

Story Information's Holdings section lists what each character has now: the things they hold (in hand or carried), the abilities they know or are learning, and their rank. It is the truth at the start of this chapter. Characters use only what they hold. Develop and use what they already have; give a new thing or ability only when the story earns it. Finding a manual is not learning its technique, and learning a technique is not mastering it.

Tag every change to what a character has where the story makes it, at the start of the sentence that shows it. Tags are removed before anyone reads the chapter.
Things: [[gained: Name | Thing]], with a count for several ([[gained: Name | Thing | 3]]); [[lost: Name | Thing]] when used up, broken, given away, stolen or sold, with a count and the reason when they help ([[lost: Name | Thing | 1 | used up]]); [[equipped: Name | Thing]] when taken in hand, worn or put to use; [[unequipped: Name | Thing]] when put away and still owned.
Abilities: [[learning: Name | Ability]] when practice begins; [[learned: Name | Ability]] when it can be used; [[improved: Name | Ability | new level]]; [[sealed: Name | Ability]] and [[unsealed: Name | Ability]].
Rank: [[rank: Name | new rank]], in the story's own words.
The first time the story shows something a character already had before this chapter, tag it [[has: Name | Thing]] or [[knows: Name | Ability | level]].
The main character is always ${MAIN_CHARACTER_SPEAKER_TAG}: [[gained: ${MAIN_CHARACTER_SPEAKER_TAG} | Thing]]. Write every other name exactly as Story Information writes it; give a new thing one name and keep it. Tag only what happens in the story's present, never a plan, promise, dream, memory or lie. Tags go only inside paragraphs, and double brackets are only for tags and marks.

After the chapter, list in mainCharacterHoldings every thing the main character has and every ability they know or are learning, each by its exact name.`;

/** SEN's bundled Holdings skill. It occupies the Holdings slot, which the HARNESS fills on every chapter. */
export const SEN_HOLDINGS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-holdings',
  version: '1.0.0',
  name: 'SEN Holdings',
  description: 'Keeps what every character has, uses, knows and is: the writer reads it, uses only it, and tags every change where it happens.',
  slot: 'holdings',
  applications: ['generation'],
  instructions: SEN_HOLDINGS_INSTRUCTIONS,
  author: 'SEIHouse',
};
