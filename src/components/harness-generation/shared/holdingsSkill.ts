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
export const SEN_HOLDINGS_INSTRUCTIONS = `JOB: Story Information's Holdings section is the things each character owns, the abilities they can use, and their rank, at this chapter's start. Tag every change, so the next chapter starts from the truth.
FORMAT (count and reason are optional; level is optional except on improved):
[[gained: Name | Thing | count]]
[[lost: Name | Thing | count | reason]] used up, broken, given or taken away
[[equipped: Name | Thing]] in hand, worn or in use
[[unequipped: Name | Thing]] put away, still owned
[[learning: Name | Ability]] practice begins
[[learned: Name | Ability]] usable now
[[improved: Name | Ability | new level]]
[[sealed: Name | Ability]] / [[unsealed: Name | Ability]] its use lost / regained
[[rank: Name | new rank]] in the story's own words
[[has: Name | Thing]] / [[knows: Name | Ability | level]] held before this chapter, shown for the first time
REQUIRED:
- Each tag at the start of the sentence that shows the change.
- Name: ${MAIN_CHARACTER_SPEAKER_TAG} for the main character; anyone else exactly as Story Information writes them.
- Thing: an object. Ability: a technique, skill or power. Each keeps one short exact name, with no count or description inside it; a count goes in its own place.
- Characters use only what they have. A new thing or ability comes only when the story earns it.
FORBIDDEN: Tags for plans, promises, dreams, memories or lies. Events, news, deadlines, places, people or alliances as things or abilities. A found manual treated as a learned technique, or a learned technique as mastered.
CHECK BEFORE YOU RETURN: Every change has its tag in the prose, and mainCharacterHoldings lists by exact name, with no tags, every thing the main character owns and every ability they know or are learning.`;

/** SEN's bundled Holdings skill. It occupies the Holdings slot, which the HARNESS fills on every chapter. */
export const SEN_HOLDINGS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-holdings',
  version: '2.1.0',
  name: 'SEN Holdings',
  description: 'Keeps what every character has, uses, knows and is: the writer reads it, uses only it, and tags every change where it happens.',
  slot: 'holdings',
  applications: ['generation'],
  instructions: SEN_HOLDINGS_INSTRUCTIONS,
  author: 'SEIHouse',
};
