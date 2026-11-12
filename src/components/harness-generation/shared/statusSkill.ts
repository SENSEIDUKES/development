import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How status is kept, in the tiny SEN language: a tag on the sentence where
 * the prose shows a lasting condition begin, and one marked `ended` where it
 * shows one end. The HARNESS saves each on its sentence; what someone carries
 * is worked out from them and from their card. Rank is Holdings' own tag. What a note is, and where tags may go, is said once for every tag
 * kind by the HARNESS tag rules.
 */
export const SEN_STATUS_INSTRUCTIONS = `When the prose shows a lasting condition begin (a wound, an illness, a poison, a curse, a seal, captivity, death), tag that sentence: [[status: Name | the condition]]
When it shows one of their listed conditions end (healed, cured, freed, unsealed), tag that sentence: [[status: Name | the condition, as listed | ended]]
Example: {"paragraph": 7, "words": "Elder Qin slid down the pillar and did not rise again.", "tag": "[[status: Elder Qin | dead]]"}
Example: {"paragraph": 12, "words": "The last of the poison left him with the dawn.", "tag": "[[status: ${MAIN_CHARACTER_SPEAKER_TAG} | poisoned | ended]]"}
A condition is something they will still carry in the next chapter (each character's conditions so far are listed below). Name it in a few plain words, the same words every time. Never a moment that is over within the scene, a mood, a plan or a rumour. A listed condition getting better or worse is not a tag: only its end is. Rank is the rank tag.`;
