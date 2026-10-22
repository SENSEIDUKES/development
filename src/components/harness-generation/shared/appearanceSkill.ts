import type { HarnessSkillManifest } from '../../../narrative/generation';
import { MAIN_CHARACTER_SPEAKER_TAG } from '../../../narrative/speech';

/**
 * How the writer keeps every look, in the tiny SEN language: it reads who and
 * what is already on the page in Story Information's Appeared section, tags
 * each character or thing the moment it steps onto the page, and tags each
 * change to a look where the prose shows it. The HARNESS removes the tags,
 * saves each on its sentence, and checks it against what came before; a small
 * step after the chapter is saved reads those sentences and writes each look
 * down, so the next chapter keeps it. The tag forms use placeholders (Name,
 * Thing), so no example can slip into a story; the main character's name is
 * the speakers' own, `MC`. When to describe a character in full is the
 * response contract's (its CHARACTER DESCRIPTIONS); where tags may go is said
 * once for every tag kind by the HARNESS tag rules.
 */
export const SEN_APPEARANCE_INSTRUCTIONS = `When someone or a named thing not in Appeared first steps onto the page, tag it in that sentence and describe them there:
[[appears: Name | character]]  [[appears: Thing | thing]] (a thing no one holds)
Example: [[appears: Old Wen | character]] A gaunt figure in ash-grey robes stepped out.
When a look changes (a scar, new clothes, a breakthrough): [[look: Name | what changed]]
Example: [[look: ${MAIN_CHARACTER_SPEAKER_TAG} | a fresh scar across the left cheek]]
Use the full name the story will keep using. Keep every look in Appeared until a look tag changes it. Only who is on the page, not mentioned or remembered.`;

/** SEN's bundled Appearance skill. It occupies the Appearance slot, which the HARNESS fills on every chapter. */
export const SEN_APPEARANCE_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-appearance',
  version: '1.2.0',
  name: 'SEN Appearance',
  description: 'Tags each character and thing when it steps onto the page and each change to a look, so every look stays true.',
  slot: 'appearance',
  applications: ['generation'],
  instructions: SEN_APPEARANCE_INSTRUCTIONS,
  author: 'SEIHouse',
};
