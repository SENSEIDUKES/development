import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How ties are kept, in the tiny SEN language: a tag on the sentence where
 * the prose shows how two characters stand with each other form or change.
 * The HARNESS saves each on its sentence; a pair's latest one is how they
 * stand now. The ties a story opens with are its world cards' own, so a tag
 * records only a change. What a note is, and where tags may go, is said once
 * for every tag kind by the HARNESS tag rules.
 */
export const SEN_TIE_INSTRUCTIONS = `When the prose shows a tie between two characters form or change (they swear brotherhood, become master and disciple, turn enemies, betray, marry, bond), tag that sentence: [[tie: Name | Other | how they stand now]]
Example: {"paragraph": 5, "words": "Shen Yuan knelt and touched his forehead to the floor before Elder Qin.", "tag": "[[tie: ${MAIN_CHARACTER_SPEAKER_TAG} | Elder Qin | master and disciple]]"}
A few plain words for how the two stand now (each character's ties so far are listed below). Other may be a thing bound to them, like a sword with a spirit. Only real changes the prose shows: never a passing mood, a plan or a rumour.`;
