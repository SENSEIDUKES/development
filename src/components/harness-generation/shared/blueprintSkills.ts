import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * SEN's World Blueprint skills: the Origin, World and Arc slots of the CAPA
 * Schema, read by the call that builds a story's world before Chapter 1
 * (SENSEI, 2026-11-05: "split up the Blueprint prompt into 3 CAPA slots …
 * a publisher who licenses SEN could simply say 'Western Fantasy' for the
 * origin"). Each is a normal, replaceable skill; the Blueprint's permanent
 * rules are not, and live with its prompt. The words were approved by SENSEI
 * on 2026-11-05 before they were written here, and each change since before
 * it was made.
 */

const ORIGIN_INSTRUCTIONS = `This is an Eastern fantasy web novel.`;

const WORLD_INSTRUCTIONS = `Build the world and its principal cast as they stand the moment Chapter 1 opens. Chapters change the world afterwards and may add to it. What exists at the start is written here.

Build the main character and supporting cast from the Seed's chosen style, premise, genre and selected tags, within the Origin. Give the relationships and conflicts those choices promise the people who will carry them. Their cards state their relationships and circumstances when the story opens.

Establish the main antagonist or opposing force now, alongside the cast. If the creator supplied a Destined Ending, account for whoever or whatever stands against it; otherwise establish the opposition from the Origin before the Arc skill chooses the ending. A person or beast has their own character card, and an opposing faction has its own faction card and the principal characters behind it. A law of the world or the Heavens need not become a person: write that opposition in the world rules.

mainOpposition: name that established person, faction or force and say what puts them against the hero across the novel. The Arc skill will use this opposition and the completed cast.

A card says how things stand before Chapter 1 begins, and nothing after. What the premise or an Arc 1 goal brings about belongs to the story: a bond not yet formed, a rank not yet reached, a thing not yet found is never written as done. Write where each one starts instead.

Two tests decide whether a card holds enough, and nothing beyond them belongs on one:
- an artist must be able to draw the opening scene from these cards alone, without reading a chapter;
- a game must be able to load the world exactly as it stands: who is where, holding what, in what condition, allied with whom.

Write what the world is, never how it is shown: "at the North Ridge Gate, at dusk, wounded", never a panel, a camera, a frame count or an art style.

Keep every slot to one short, concrete fact, except a Look. A Look is a short portrait of two or three sentences. The main character's backgroundProfile adds what the cards do not already say; it never repeats a card.

A Look is what someone would notice about this person and no one else. Choose the few details that are theirs alone and leave the rest to the slots. No two people in the cast are described through the same features, and no Look opens the way another does.

A person's nature shows in how they look: in their face, how they hold themselves, how they dress and keep themselves. Write what is seen, never the trait's name.

Leave Marks blank when they have none.

A condition is something lasting that a character carries into the story: a wound, an illness, a curse, a seal. Give one only where the story will feel it, and write its whole course now: how it shows at each stage, how fast it moves, and what would end it. It then runs by itself as the chapters pass, whatever else happens, until something ends it. A mood is not a condition. Most characters have none.

Whoever the premise, selected tags or a creator-supplied arc goal calls for has a card of their own, person or beast, named or not: someone the hero has not met yet is still a character, written where they are when the story opens. One with no name yet goes by what the story will first call them. A species card describes a kind of creature and never stands in for one of them.

Build the places the opening, premise, selected tags and any creator-supplied Arc 1 goals need. The Arc skill plans on this established ground afterwards. When several places sit inside a larger one, the larger one has a card too.

Complete the principal cast and factions the novel needs before planning its ending or arcs. Keep the cast specific to this story; do not add filler to meet a count.

The main character is a character card with seven slots of their own:
- startingIdentity: who the world sees when the story opens: their position, name and standing ("the disowned third son of the Lin clan").
- personality: how they think and act, in a few words.
- mainFlaw: the fault inside them that causes trouble: pride, distrust, recklessness. It is a trait, not a circumstance.
- startingWeakness: what they lack or cannot yet do when the story opens: a crippled meridian, no sect, no money. It is a circumstance the story can change, not a trait.
- secretAdvantage: the hidden edge only they have, which others do not know about: a soul in a ring, a past life's memory, a system.
- moralAlignment: where they stand between ruthless and righteous.
- backgroundProfile: their fuller past, beyond the one-line bio: where they come from and what brought them here.`;

const ARC_INSTRUCTIONS = `Begin only after the World skill has completed the cast, world cards and main opposition. Use those established people, relationships and conflicts to choose the Destined Ending, then plan the route toward it. Never leave a principal character for the ending or arc plan to invent.

destinedEnding: the novel's fixed destination, in one or two sentences. The whole story travels toward it, and its final arc arrives at it.

estimatedArcs: the story's length in arcs. Each arc is exactly 30 chapters. When the creator has not chosen a length, use these approximate scales:
- Short novel: about 300 chapters, or 10 arcs.
- Medium novel: about 600 chapters, or 20 arcs.
- Long novel: about 900 chapters, or 30 arcs.
Choose the scale from the premise, the cast's relationships, the breadth of the conflict and the journey to the Destined Ending. These are guides, not the only allowed lengths; choose the number of arcs this story needs. When the creator chose a length, use it exactly.

title and logline: the novel's name, and its promise in one sentence: who, what they want, and what stands in the way.

arcOne: plan only Arc 1, as 1 to 5 goals in order. Each goal is one line, and says what happens, not how it feels. Each takes a whole number of chapters, weighted by what it needs, and together they take exactly 30. Goals never overlap. No Arc 1 goal reaches or resolves the Destined Ending: the story has far to go.

arcLookahead: one line each for Arc 2 and Arc 3 (never beyond the story's length), saying where the road goes next on its way to the Destined Ending. When one of them is the final arc, its line arrives at the Destined Ending. Readers never see this; it guides the planning of those arcs, which happens when the story reaches them.`;

export const SEN_EASTERN_FANTASY_ORIGIN_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-eastern-fantasy',
  version: '1.4.0',
  name: 'SEN Eastern Fantasy',
  description: 'Sets the Blueprint in Eastern fantasy web novels.',
  slot: 'origin',
  applications: ['generation'],
  instructions: ORIGIN_INSTRUCTIONS,
  author: 'SEIHouse',
};

export const SEN_WORLD_BUILDER_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-world-builder',
  version: '1.7.0',
  name: 'SEN World Builder',
  description: 'Builds the world as Chapter 1 opens: the cards an artist could draw it from and a game could load it from.',
  slot: 'world',
  applications: ['generation'],
  instructions: WORLD_INSTRUCTIONS,
  author: 'SEIHouse',
};

export const SEN_ARC_PLANNER_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-arc-planner',
  version: '1.3.0',
  name: 'SEN Arc Planner',
  description: 'Uses the completed cast and world to choose the Destined Ending and story length, then plans Arc 1 toward it.',
  slot: 'arc',
  applications: ['generation'],
  instructions: ARC_INSTRUCTIONS,
  author: 'SEIHouse',
};

/**
 * The World Blueprint's skills when the host names no others. A publisher
 * replaces them for the whole host (for example its own Origin); there is no
 * per-story choice, because the Blueprint runs before the story exists.
 */
export const SEN_BLUEPRINT_DEFAULT_SKILLS: readonly HarnessSkillManifest[] = [
  SEN_EASTERN_FANTASY_ORIGIN_SKILL,
  SEN_WORLD_BUILDER_SKILL,
  SEN_ARC_PLANNER_SKILL,
];
