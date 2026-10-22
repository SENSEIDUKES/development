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
export const SEN_SPEAKERS_INSTRUCTIONS = `Every paragraph with speech starts with its speaker: [[@Name]]
Example: [[@${MAIN_CHARACTER_SPEAKER_TAG}]] “Hold the gate,” he said.
A new speaker starts a new paragraph. Speech goes in quotation marks.
A line without its speaker is read in the wrong voice.`;

/** SEN's bundled Speakers skill. It occupies the Speakers slot, which the HARNESS fills on every chapter. */
export const SEN_SPEAKERS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-speakers',
  version: '2.3.0',
  name: 'SEN Speakers',
  description: 'Tags who speaks each spoken line, the main character with their own tag, so the Reader can voice it.',
  slot: 'speakers',
  applications: ['generation'],
  instructions: SEN_SPEAKERS_INSTRUCTIONS,
  author: 'SEIHouse',
};
