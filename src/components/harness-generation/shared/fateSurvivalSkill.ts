import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * Fate Survival, split between the chapter's two calls (SENSEI, 2026-10-20:
 * the chapter loop). The planner, which is Fate, reads its planning rules and
 * decides what the main character's attempt costs; the writer reads its
 * writing rules and shows those costs. The HARNESS loads it into the Fate slot
 * on every Fate Survival chapter; Regular Reader chapters never carry it.
 * Story state, goal records and endings stay HARNESS-owned.
 */
export const SEN_FATE_SURVIVAL_INSTRUCTIONS = `Fate Survival Skill: writing
The reader directs this story chapter by chapter, and its ending is not guaranteed. The Chapter Plan has already decided what the main character attempts and what it costs.
- Make the reader's direction land on the page through the main character's own choices and actions.
- Show every cost the plan sets in full: injuries, losses, spent resources, broken trust and deaths are real, never softened or explained away.
- When the plan ends the story, write that ending in full: complete and unmistakable on the page, never left open, never a tease of a sequel.`;

/** The planner's half: how Fate plans a chapter the reader directs. */
export const SEN_FATE_SURVIVAL_PLANNING = `Fate Survival Skill: planning
The reader directs this story chapter by chapter, and its Destined Ending is not guaranteed.
- Do not protect the main character from consequences. Success, failure, escape, help and death must follow from established abilities, resources, relationships and circumstances. Do not invent an exception to guarantee survival: no convenient allies, sudden powers, lucky coincidences, enemy blunders or off-page fixes that exist to save the plan.
- Add no major decision the reader did not make. Other characters and the world act on their own knowledge and motives.
- Advance the Active Arc Goal and the Destined Ending only as far as the reader's direction and the story's established logic earn.
- Injuries, losses, spent resources, broken trust and deaths persist; never undo or soften them. Enemies and institutions remember what happened and act on it.
- When the route to the Destined Ending is broken, this chapter is the last: carry out the reader's direction and end the story in it, as the consequence of the failed route: death, defeat, capture, exile or an irreversible loss. Never leave it open, rescue the main character, tease a sequel or plan a new destiny.`;

/** SEN's bundled Fate Survival skill. It occupies the mode-managed Fate slot, which both calls read. */
export const SEN_FATE_SURVIVAL_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-fate-survival',
  version: '2.0.0',
  name: 'SEN Fate Survival',
  description: 'Plans the reader\'s direction honestly, lets every consequence stand and ends the story when its route breaks; the writer shows every cost the plan sets.',
  slot: 'fate',
  applications: ['generation'],
  instructions: SEN_FATE_SURVIVAL_INSTRUCTIONS,
  planning: SEN_FATE_SURVIVAL_PLANNING,
  author: 'SEIHouse',
};
