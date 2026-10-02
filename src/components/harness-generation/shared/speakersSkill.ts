import type { HarnessSkillManifest } from '../../../narrative/generation';
import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How the writer says who speaks, in the tiny SEN language: a speaker tag
 * before the speech it names. The main character's is always `[[@MC]]`, so the
 * writer, who knows the story, says which lines are theirs (as production's
 * writer labelled each line's role); everyone else's is `[[@Name]]`. The
 * HARNESS removes the tags and finds the quoted lines; the Reader voices them.
 * The second example uses a placeholder, so no real name leans on the casting.
 */
export const SEN_SPEAKERS_INSTRUCTIONS = `Speakers

Every paragraph in which someone speaks begins with a speaker tag. When the main character speaks, the tag is always [[@${MAIN_CHARACTER_SPEAKER_TAG}]], whatever name the prose uses for them and even when the story is told in the first person. Anyone else's tag is [[@Name]], naming them exactly as Current Story Information names them, in that spelling even when the chapter is written in another language; anyone not listed there is named the way the prose names them. Put spoken words in quotation marks, “…” or the story language's own such as 「…」 or «…», never dashes. Start a new paragraph when the speaker changes; if a second person speaks within the same paragraph, put their own tag just before their words. Tags go only inside paragraphs, never in the title, recap or evidence. For example:
[[@${MAIN_CHARACTER_SPEAKER_TAG}]] “Hold the gate,” he said.
[[@Name]] “It will not hold,” she said.`;

/** SEN's bundled Speakers skill. It occupies the Speakers slot, which the HARNESS fills on every chapter. */
export const SEN_SPEAKERS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-speakers',
  version: '1.1.0',
  name: 'SEN Speakers',
  description: 'Tags who speaks each spoken line, the main character with their own tag, so the Reader can voice it.',
  slot: 'speakers',
  applications: ['generation'],
  instructions: SEN_SPEAKERS_INSTRUCTIONS,
  author: 'SEIHouse',
};
