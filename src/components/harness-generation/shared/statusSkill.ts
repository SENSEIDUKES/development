import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How status is kept, in the tiny SEN language: a tag on the sentence where
 * the prose shows how a character is now change. The HARNESS saves each on
 * its sentence; the latest one is that character's status. Rank is Holdings'
 * own tag. What a note is, and where tags may go, is said once for every tag
 * kind by the HARNESS tag rules.
 */
export const SEN_STATUS_INSTRUCTIONS = `When the prose shows a character's condition change (wounded, healed, poisoned, captured, freed, sealed, transformed, dead), tag that sentence: [[status: Name | how they are now]]
Example: {"paragraph": 7, "words": "Elder Qin slid down the pillar and did not rise again.", "tag": "[[status: Elder Qin | dead]]"}
Example: {"paragraph": 12, "words": "The poison had reached his chest.", "tag": "[[status: ${MAIN_CHARACTER_SPEAKER_TAG} | poisoned]]"}
A few plain words for how they are now (each character's status so far is listed below). Only real changes the prose shows: never a mood, a plan or a rumour. Rank is the rank tag.`;
