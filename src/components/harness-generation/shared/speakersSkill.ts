import type { HarnessSkillManifest } from '../../../narrative/generation';
import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How the writer says who speaks, in the tiny SEN language: a speaker tag
 * before the speech it names. The main character's is always `[[@MC]]`, so the
 * writer, who knows the story, says which lines are theirs (as production's
 * writer labelled each line's role); everyone else's is `[[@Name]]`. The
 * HARNESS removes the tags and finds the quoted lines; the Reader voices them.
 * Its example uses the main character's tag, so no real name leans on the
 * casting, and no tag form holds a placeholder name a writer could copy (a
 * copied `[[@Name]]` is read as no tag). It never mentions point of view: the Style skill chooses that, and
 * the HARNESS keeps it (`CurrentStoryProjection.pointOfView`). Where tags may
 * go is said once for every tag kind by the HARNESS tag rules.
 */
export const SEN_SPEAKERS_INSTRUCTIONS = `JOB: Tag who speaks each spoken line, so it can be read aloud in their voice.
FORMAT: [[@${MAIN_CHARACTER_SPEAKER_TAG}]] for the main character, whatever the prose calls them. Anyone else: the same tag with their own name after the @, exactly as Story Information writes it.
EXAMPLE: [[@${MAIN_CHARACTER_SPEAKER_TAG}]] “Hold the gate,” he said.
REQUIRED:
- In every chapter, including the first: each paragraph with speech starts with its speaker's tag.
- One speaker per paragraph: start a new paragraph when the speaker changes.
- Speech in quotation marks: “…”, 「…」 or «…».
FORBIDDEN: Dashes for speech. A tag with a word from these instructions in place of a real name.
CHECK BEFORE YOU RETURN: Every paragraph with a quotation mark starts with a speaker tag naming a real character.`;

/** SEN's bundled Speakers skill. It occupies the Speakers slot, which the HARNESS fills on every chapter. */
export const SEN_SPEAKERS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-speakers',
  version: '2.1.0',
  name: 'SEN Speakers',
  description: 'Tags who speaks each spoken line, the main character with their own tag, so the Reader can voice it.',
  slot: 'speakers',
  applications: ['generation'],
  instructions: SEN_SPEAKERS_INSTRUCTIONS,
  author: 'SEIHouse',
};
