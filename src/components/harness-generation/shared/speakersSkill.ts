import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * How the writer says who speaks, in the tiny SEN language: a speaker tag,
 * `[[@Name]]`, before the speech it names. The HARNESS removes the tags, finds
 * the quoted lines, and decides from the Story Information it gave the writer
 * whether each speaker is the main character; the Reader voices them. The
 * example uses a placeholder, so no real name leans on the writer's casting.
 */
export const SEN_SPEAKERS_INSTRUCTIONS = `Speakers

Every paragraph in which someone speaks begins with a speaker tag, [[@Name]]. Put spoken words in quotation marks, “…” or the story language's own such as 「…」 or «…», never dashes. Start a new paragraph when the speaker changes; if a second person speaks within the same paragraph, put their own tag just before their words. Name each speaker exactly as Current Story Information names them, in that spelling even when the chapter is written in another language, and the main character too, even when the story is told in the first person. Anyone not listed there is named the way the prose names them. Tags go only inside paragraphs, never in the title, recap or evidence. For example:
[[@Name]] “Hold the gate,” she said.`;

/** SEN's bundled Speakers skill. It occupies the Speakers slot, which the HARNESS fills on every chapter. */
export const SEN_SPEAKERS_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-speakers',
  version: '1.0.0',
  name: 'SEN Speakers',
  description: 'Tags who speaks each spoken line; the HARNESS records whether it is the main character, so the Reader can voice it.',
  slot: 'speakers',
  applications: ['generation'],
  instructions: SEN_SPEAKERS_INSTRUCTIONS,
  author: 'SEIHouse',
};
