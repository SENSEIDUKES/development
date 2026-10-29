import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How every look is kept, in the tiny SEN language: a tag on each character or
 * thing the moment it steps onto the page, and one on each change to a look
 * where the prose shows it, each on its sentence. The HARNESS saves each on its
 * sentence and checks it against what came before; a small step after the
 * chapter is saved reads those sentences and writes each look down, so the
 * next chapter keeps it. The tag forms use placeholders (Name, Thing), so no
 * example can slip into a story; the main character's name is the speakers'
 * own, `MC`. When to describe a character in full is the Author skill's, never
 * a tag's; what a note is, and where tags may go, is said once for every tag
 * kind by the HARNESS tag rules.
 */
export const SEN_APPEARANCE_INSTRUCTIONS = `When someone or a named thing steps onto the page for the first time in the story, tag the sentence that shows it:
[[appears: Name | character]]  [[appears: Thing | thing]] (a thing no one holds)
Example: {"paragraph": 2, "words": "A gaunt figure in ash-grey robes stepped out.", "tag": "[[appears: Old Wen | character]]"}
When the prose shows a look changing (a scar, new clothes, a breakthrough), tag that sentence: [[look: Name | what changed]]
Example: {"paragraph": 9, "words": "The cut had closed into a pale line down his cheek.", "tag": "[[look: ${MAIN_CHARACTER_SPEAKER_TAG} | a pale scar down the left cheek]]"}
Use the full name the story will keep using. Only who is on the page, not mentioned or remembered.`;
