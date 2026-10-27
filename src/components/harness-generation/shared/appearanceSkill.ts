import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How every look is kept, in the tiny SEN language: a tag on each character or
 * thing the moment it steps onto the page, and one on each change to a look
 * where the prose shows it. The HARNESS removes the tags,
 * saves each on its sentence, and checks it against what came before; a small
 * step after the chapter is saved reads those sentences and writes each look
 * down, so the next chapter keeps it. The tag forms use placeholders (Name,
 * Thing), so no example can slip into a story; the main character's name is
 * the speakers' own, `MC`. When to describe a character in full is the Author
 * skill's, never a tag's; where tags may go is said once for every tag kind by
 * the HARNESS tag rules.
 */
export const SEN_APPEARANCE_INSTRUCTIONS = `When someone or a named thing not in Appeared first steps onto the page, tag it in that sentence and describe them there:
[[appears: Name | character]]  [[appears: Thing | thing]] (a thing no one holds)
Example: [[appears: Old Wen | character]] A gaunt figure in ash-grey robes stepped out.
When a look changes (a scar, new clothes, a breakthrough): [[look: Name | what changed]]
Example: [[look: ${MAIN_CHARACTER_SPEAKER_TAG} | a fresh scar across the left cheek]]
Use the full name the story will keep using. Keep every look in Appeared until a look tag changes it. Only who is on the page, not mentioned or remembered.`;
