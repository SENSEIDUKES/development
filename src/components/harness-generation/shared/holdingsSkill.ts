import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How holdings are kept, in the tiny SEN language: a tag on each change the
 * chapter makes, where it makes it. The HARNESS removes the tags,
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
