import { SETTING_CONDITIONS, SETTING_SEASONS, SETTING_TIMES } from '../../../narrative/settings';

/**
 * How settings are kept, in the tiny SEN language: a tag on the sentence that
 * says when it is or what it is like. Novels say it only sometimes, so the tag
 * follows the prose and never asks for more. The time of day, the conditions
 * and the season are picked from fixed lists, so a view can draw them; the
 * novel's own words stay beside them. Where someone is is the place tag's, and
 * the mood is the atmosphere's. What a note is, and where tags may go, is said
 * once for every tag kind by the HARNESS tag rules.
 */
export const SEN_SETTING_INSTRUCTIONS = `When the prose says when it is or what it is like (the time of day, the weather, the season, time passing, a date in the story), tag that sentence: [[setting: one or more of the words below | the novel's own words]]
TIME OF DAY: ${Object.keys(SETTING_TIMES).join(', ')}
CONDITIONS: ${Object.keys(SETTING_CONDITIONS).join(', ')}
SEASON: ${Object.keys(SETTING_SEASONS).join(', ')}
Example: {"paragraph": 1, "words": "Snow had fallen all night, and the moon above the sect was red.", "tag": "[[setting: night | snow | heavy snow under a blood moon]]"}
Example: {"paragraph": 9, "words": "Three years passed.", "tag": "[[setting: three years later]]"}
Pick each word from the lists exactly as written; the novel's own words are a few, only for what the lists cannot say. Only what the prose says: never guess a time it does not give. Never the place (that is the place tag) and never the mood (that is the atmosphere).`;
