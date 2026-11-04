import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How place is kept, in the tiny SEN language: a tag on the sentence where a
 * character arrives somewhere. The HARNESS saves each on its sentence; the
 * latest one is where that character is now. A place stepping onto the page
 * for the first time is the appearance tag's, and the first place tag that
 * names a place gives it one. What a note is, and where tags may go, is said
 * once for every tag kind by the HARNESS tag rules.
 */
export const SEN_PLACE_INSTRUCTIONS = `When the prose shows a character arrive somewhere (they enter, reach, are taken to, wake up in), tag that sentence: [[place: Name | Place]]
Example: {"paragraph": 3, "words": "He pushed the door open and stepped into the Red Lantern Inn.", "tag": "[[place: ${MAIN_CHARACTER_SPEAKER_TAG} | Red Lantern Inn]]"}
Name the place as the story keeps calling it (each character's place so far is listed below). Only where they really are now: never a place they remember, plan to go to or only hear about.`;
