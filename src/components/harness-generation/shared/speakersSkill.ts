import type { HarnessSkillManifest } from '../../../narrative/generation';
import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How the writer says who speaks (SENSEI, 2026-10-19): each paragraph's
 * `speaker` field in the reply, as the original Light Novels app's writer
 * labelled each block's speaker. A writer fills a field the reply asks for;
 * it drops a tag in its prose (the Blade and Diner tests tagged 1 of 27,
 * 0 of 26 and 5 of 26 lines). The main character is always `MC`; everyone
 * else is named as Story Information names them. The HARNESS reads the field
 * as the paragraph's speaker and finds the quoted lines; the Reader voices
 * them. A `[[@Name]]` tag a writer still writes is read as before. It never
 * mentions point of view: the Style skill chooses that, and the HARNESS keeps
 * it (`CurrentStoryProjection.pointOfView`).
 */
export const SEN_SPEAKERS_INSTRUCTIONS = `Each paragraph's speaker is who speaks in it: ${MAIN_CHARACTER_SPEAKER_TAG} for the main character, anyone else by the name Story Information uses. Empty when no one speaks.
Example: {"speaker": "${MAIN_CHARACTER_SPEAKER_TAG}", "text": "“Hold the gate,” he said."}
A new speaker starts a new paragraph. Speech goes in quotation marks.
A line without its speaker is read in the wrong voice.`;

/** SEN's bundled Speakers skill. It occupies the Speakers slot, which the HARNESS fills on every chapter. */
export const SEN_SPEAKERS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-speakers',
  version: '3.0.0',
  name: 'SEN Speakers',
  description: 'Names who speaks in each paragraph, in its speaker field, the main character as MC, so the Reader can voice it.',
  slot: 'speakers',
  applications: ['generation'],
  instructions: SEN_SPEAKERS_INSTRUCTIONS,
  author: 'SEIHouse',
};
