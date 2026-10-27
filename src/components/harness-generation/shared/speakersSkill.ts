import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How who speaks is said, in the tiny SEN language: a speaker tag before the
 * speech it names. The main character's is always `[[@MC]]`; everyone else's
 * is `[[@Name]]`. The
 * HARNESS removes the tags and finds the quoted lines; the Reader voices them.
 * Its example uses the main character's tag, so no real name leans on the
 * casting, and no tag form holds a placeholder name a writer could copy (a
 * copied `[[@Name]]` is read as no tag). It never mentions point of view: the Style skill chooses that, and
 * the HARNESS keeps it (`CurrentStoryProjection.pointOfView`). Where tags may
 * go is said once for every tag kind by the HARNESS tag rules.
 */
export const SEN_SPEAKERS_INSTRUCTIONS = `Start each paragraph with speech with its speaker: [[@Name]]
Example: [[@${MAIN_CHARACTER_SPEAKER_TAG}]] “Hold the gate,” he said.
One speaker per paragraph. Speech goes in quotation marks.`;
