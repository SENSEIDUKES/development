import type { HarnessSkillManifest } from '../../../narrative/generation';
import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How the writer keeps holdings, in the tiny SEN language: it reads what every
 * character has in Story Information's Holdings section, uses only that, and
 * tags each change where the story makes it. The HARNESS removes the tags,
 * saves each change on its sentence, and checks it against what came before.
 * The tag forms use placeholders (Name, Thing, Ability), so no example item
 * can slip into a story. The main character's name is the speakers' own, `MC`.
 * Where tags may go is said once for every tag kind by the HARNESS tag rules.
 */
export const SEN_HOLDINGS_INSTRUCTIONS = `When the chapter changes what someone has (Holdings in Story Information), tag it in the sentence that shows it:
[[gained: Name | Thing | count]]  [[lost: Name | Thing | count | reason]]
[[equipped: Name | Thing]]  [[unequipped: Name | Thing]]
[[learning: Name | Ability]]  [[learned: Name | Ability]]  [[improved: Name | Ability | new level]]
[[sealed: Name | Ability]]  [[unsealed: Name | Ability]]  [[rank: Name | new rank]]
[[has: Name | Thing]]  [[knows: Name | Ability | level]]  already theirs, shown for the first time
Example: [[gained: ${MAIN_CHARACTER_SPEAKER_TAG} | Iron Key]] He pocketed the iron key.
Thing: an object. Ability: a technique, skill or power. One short name each, used every time. Count, reason and level are optional. Only the story's present: no plans, memories or lies.`;

/** SEN's bundled Holdings skill. It occupies the Holdings slot, which the HARNESS fills on every chapter. */
export const SEN_HOLDINGS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-holdings',
  version: '2.2.0',
  name: 'SEN Holdings',
  description: 'Keeps what every character has, uses, knows and is: the writer reads it, uses only it, and tags every change where it happens.',
  slot: 'holdings',
  applications: ['generation'],
  instructions: SEN_HOLDINGS_INSTRUCTIONS,
  author: 'SEIHouse',
};
