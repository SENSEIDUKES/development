import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How every look is kept, in the tiny SEN language: a tag on each character,
 * thing or place the moment it steps onto the page, and one on each change to a look
 * where the prose shows it, each on its sentence. The HARNESS saves each on its
 * sentence and checks it against what came before. The sentence an appears
 * tag sits on is kept as the look (SENSEI, 2026-11-05, from The Nomad's
 * Foundation: Lin Yuan's tag sat on "Lin Yuan.", the line where he says his
 * name, three paragraphs after the prose showed him), so it is the sentence
 * that describes them, even before their name. The tag forms use placeholders (Name, Thing), so no
 * example can slip into a story; the main character's name is the speakers'
 * own, `MC`. When to describe a character in full is the Author skill's, never
 * a tag's; what a note is, and where tags may go, is said once for every tag
 * kind by the HARNESS tag rules.
 */
export const SEN_APPEARANCE_INSTRUCTIONS = `When someone, a named thing or a named place steps onto the page for the first time in the story, tag the sentence that shows what they look like:
[[appears: Name | character]]  [[appears: Thing | thing]] (a thing no one holds)  [[appears: Place | place]]
That sentence is kept as their look. Choose the first one that describes them, even when their name only comes later; never one that only says their name, speaks for them or tells their past. When nothing describes them, the sentence where they are first on the page.
Example: {"paragraph": 2, "words": "A gaunt figure in ash-grey robes stepped out.", "tag": "[[appears: Old Wen | character]]"} (named Old Wen two paragraphs later)
When the prose shows a look changing (a scar, new clothes, a breakthrough), tag that sentence: [[look: Name | what changed]]
Example: {"paragraph": 9, "words": "The cut had closed into a pale line down his cheek.", "tag": "[[look: ${MAIN_CHARACTER_SPEAKER_TAG} | a pale scar down the left cheek]]"}
Use the full name the story will keep using. Only who is on the page, not mentioned or remembered.`;
