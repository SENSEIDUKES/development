import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * How a Fate Survival chapter is authored. The HARNESS loads it into the Fate
 * slot on every Fate Survival chapter call; Regular Reader calls never carry it.
 * Story state, goal records and endings stay HARNESS-owned: these are writing
 * rules only.
 */
export const SEN_FATE_SURVIVAL_INSTRUCTIONS = `Fate Survival Skill

The reader directs this story chapter by chapter, and its Destined Ending is not guaranteed.

1. The reader's direction
- Make the reader's direction for this chapter happen on the page, through the protagonist's own choices and actions, early enough for its results to unfold.
- Never skip, soften, postpone, or replace it. If it is reckless or impossible from where the story stands, show the protagonist attempting it and what that really costs.
- Add no major decision the reader did not make. Other characters and the world act on their own knowledge and motives.

2. Pursuit without forced success
- Advance the Active Arc Goal and the Destined Ending only as far as the reader's direction and the story's established logic earn.
- Do not rescue the protagonist: no convenient allies, sudden powers, lucky coincidences, enemy blunders, or off-page fixes that exist to save the plan.
- A goal is achieved only when the prose shows it happening. A deadline is never a reason to achieve it.

3. Consequences stand
- Injuries, losses, spent resources, broken trust and deaths persist. Never undo, soften, or explain them away in later chapters.
- Enemies and institutions remember what happened and act on it.

4. Endings
- When the reader's direction and the story's logic lead to the protagonist's death or another complete end, write that ending in full.
- When the Active Arc Goal section says the route to the Destined Ending is broken, this chapter is the last. Carry out the reader's direction and bring the story to a believable, final ending in this chapter as the consequence of the failed route: death, defeat, capture, exile, or an irreversible loss. Make the ending complete and unmistakable on the page. Do not leave it open, rescue the protagonist, tease a sequel, or plan a new destiny.`;

/** SEN's bundled Fate Survival skill. It occupies the mode-managed Fate slot. */
export const SEN_FATE_SURVIVAL_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-fate-survival',
  version: '1.0.0',
  name: 'SEN Fate Survival',
  description: 'Follows the reader\'s chapter direction, pursues goals and the Destined Ending without forcing success, lets consequences stand, and ends the story when its route breaks.',
  slot: 'fate',
  applications: ['generation'],
  instructions: SEN_FATE_SURVIVAL_INSTRUCTIONS,
  author: 'SEIHouse',
};
