import type { HarnessSkillManifest } from '../../../narrative/generation';
import { MAIN_CHARACTER_SPEAKER_TAG, UNNAMED_SPEAKER } from '../../../narrative/speech';

/**
 * How the writer says who speaks (SENSEI, 2026-10-19): each paragraph's
 * `speaker` field in the reply, as the original Light Novels app's writer
 * labelled each block's speaker. Since the chapter loop (2026-10-20) the field
 * is a menu: the main character is always `MC`, anyone else goes by their name
 * in the Chapter Plan, anyone unnamed is `someone else`, and a paragraph where
 * no one speaks is `none`. The HARNESS reads the field as the paragraph's
 * speaker and finds the quoted lines; the Reader voices them. It never
 * mentions point of view: the Style skill chooses that, and the HARNESS keeps
 * it (`CurrentStoryProjection.pointOfView`).
 */
export const SEN_SPEAKERS_INSTRUCTIONS = `Each paragraph's speaker is who speaks in it: ${MAIN_CHARACTER_SPEAKER_TAG} for the main character, anyone else by their name in the Chapter Plan, ${UNNAMED_SPEAKER} for anyone unnamed, none when no one speaks.
Example: {"speaker": "${MAIN_CHARACTER_SPEAKER_TAG}", "text": "“Hold the gate,” he said."}
A new speaker starts a new paragraph. Speech goes in quotation marks.
A line without its speaker is read in the wrong voice.`;

/** SEN's bundled Speakers skill. It occupies the Speakers slot, which the HARNESS fills on every chapter. */
export const SEN_SPEAKERS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-speakers',
  version: '4.0.0',
  name: 'SEN Speakers',
  description: 'Names who speaks in each paragraph, in its speaker field: MC, a character of the Chapter Plan, someone else or none, so the Reader can voice it.',
  slot: 'speakers',
  applications: ['generation'],
  instructions: SEN_SPEAKERS_INSTRUCTIONS,
  author: 'SEIHouse',
};
