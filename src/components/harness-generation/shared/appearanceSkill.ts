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
export const SEN_APPEARANCE_INSTRUCTIONS = `JOB: Story Information's Appeared section is every character and thing already on the page, with their look. Tag each one the moment it first steps onto the page, and each change to a look, so every look stays true.
FORMAT:
[[appears: Name | character]] a person or named creature, first on the page
[[appears: Thing | thing]] a named object, first on the page
[[look: Name | what changed]] a scar, new clothes, a breakthrough, an injury, a transformation
REQUIRED:
- Each tag at the start of the sentence that first shows them, or shows the change; that sentence and the ones after it describe the look.
- Name: ${MAIN_CHARACTER_SPEAKER_TAG} for the main character; anyone else exactly as Story Information writes them; someone new by the full name the story will keep using.
- Thing: one short name, the same its Holdings tags use.
- what changed: a few words naming only what can be seen.
- Everyone in Appeared keeps the look written there until a look tag changes it.
FORBIDDEN: appears for anyone already in Appeared. look before someone has appeared. Tags for someone only mentioned, remembered, imagined or offstage. Nameless crowds and extras. Places, factions and sects.
CHECK BEFORE YOU RETURN: Everyone and everything on the page that is not in Appeared has its appears tag, and every change to a look its look tag.`;

/** SEN's bundled Appearance skill. It occupies the Appearance slot, which the HARNESS fills on every chapter. */
export const SEN_APPEARANCE_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-appearance',
  version: '1.0.0',
  name: 'SEN Appearance',
  description: 'Tags each character and thing when it steps onto the page and each change to a look, so every look stays true.',
  slot: 'appearance',
  applications: ['generation'],
  instructions: SEN_APPEARANCE_INSTRUCTIONS,
  author: 'SEIHouse',
};
