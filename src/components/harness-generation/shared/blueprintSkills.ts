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

const ORIGIN_INSTRUCTIONS = `This is an Eastern fantasy web novel: cultivation, martial sects, clans, dynasties, spirit beasts, and a hero who rises through a hard world.

Read the Story Seed's genre, tags and premise through this tradition. Treat its tropes as tools you may pick up, not a checklist. Where the Seed leaves space open, fill it from Eastern fantasy, never from Western fantasy defaults (knights, elves, dragons as Western beasts, wizard towers), unless the Seed asks for them.

The Seed's style (story.required.style) is the novel tradition the creator chose:
- Chinese: xianxia, wuxia and xuanhuan. Sects, cultivation realms, pills, treasures, face, and the Heavens. Chinese names, written in pinyin.
- Korean: murim and modern-system fantasy. Clans, martial factions, regression, ranks and status windows. Korean names.
- Japanese: light-novel fantasy. Academies, guilds, dungeons, adventurers, and named skills. Japanese names.

Names, titles, ranks and places all follow the chosen tradition.

These novels take their time over how people look, and readers expect it. How they do it depends on the kind of story. Read the Seed's tags, genre and premise for what kind of story this is and who it is written for, and describe its people the way that kind of story does: whom it lingers on, what it notices about men and about women, and the imagery it reaches for.

Where the Seed gives no clear signal, describe men and women with the same care.

Whatever the style, give each person their own description; never the same phrase for two characters.`;

const WORLD_INSTRUCTIONS = `Build the world as it stands the moment Chapter 1 opens: the people, places, things, powers and factions the opening of the story stands on. Chapters change the world afterwards and may add to it. What exists at the start is written here.

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

Whoever the premise or an Arc 1 goal is about has a card of their own, person or beast, named or not: someone the hero has not met yet is still a character, written where they are when the story opens. One with no name yet goes by what the story will first call them. A species card describes a kind of creature and never stands in for one of them.

The places cover the ground Arc 1 stands on: where the story opens, and wherever its Arc 1 goals will take it. When several places sit inside a larger one, the larger one has a card too.

Choose the supporting cast and factions for the opening arc: the mentor, the rival, the elder, the enemy at the gate. Use fewer cards before you pad them; an empty card list is better than a filler card.

The main character is a character card with seven slots of their own:
- startingIdentity: who the world sees when the story opens: their position, name and standing ("the disowned third son of the Lin clan").
- personality: how they think and act, in a few words.
- mainFlaw: the fault inside them that causes trouble: pride, distrust, recklessness. It is a trait, not a circumstance.
- startingWeakness: what they lack or cannot yet do when the story opens: a crippled meridian, no sect, no money. It is a circumstance the story can change, not a trait.
- secretAdvantage: the hidden edge only they have, which others do not know about: a soul in a ring, a past life's memory, a system.
- moralAlignment: where they stand between ruthless and righteous.
- backgroundProfile: their fuller past, beyond the one-line bio: where they come from and what brought them here.`;

const ARC_INSTRUCTIONS = `Decide where the story ends before you plan how it begins.

destinedEnding: the novel's fixed destination, in one or two sentences. The whole story travels toward it, and its final arc arrives at it.

estimatedArcs: the story's length in arcs. Each arc is exactly 30 chapters. Choose a length the Destined Ending honestly needs.

title and logline: the novel's name, and its promise in one sentence: who, what they want, and what stands in the way.

mainOpposition: the force that stands against the hero across the story: a person, a faction, a law of the world, or the Heavens themselves.

arcOne: plan only Arc 1, as 1 to 5 goals in order. Each goal is one line, and says what happens, not how it feels. Each takes a whole number of chapters, weighted by what it needs, and together they take exactly 30. Goals never overlap. No Arc 1 goal reaches or resolves the Destined Ending: the story has far to go.

arcLookahead: one line each for Arc 2 and Arc 3 (never beyond the story's length), saying where the road goes next on its way to the Destined Ending. When one of them is the final arc, its line arrives at the Destined Ending. Readers never see this; it guides the planning of those arcs, which happens when the story reaches them.`;

export const SEN_EASTERN_FANTASY_ORIGIN_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-eastern-fantasy',
  version: '1.3.0',
  name: 'SEN Eastern Fantasy',
  description: 'Builds the world of an Eastern fantasy web novel, in the Chinese, Korean or Japanese tradition the creator chose.',
  slot: 'origin',
  applications: ['generation'],
  instructions: ORIGIN_INSTRUCTIONS,
  author: 'SEIHouse',
};

export const SEN_WORLD_BUILDER_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-world-builder',
  version: '1.5.0',
  name: 'SEN World Builder',
  description: 'Builds the world as Chapter 1 opens: the cards an artist could draw it from and a game could load it from.',
  slot: 'world',
  applications: ['generation'],
  instructions: WORLD_INSTRUCTIONS,
  author: 'SEIHouse',
};

export const SEN_ARC_PLANNER_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-arc-planner',
  version: '1.1.0',
  name: 'SEN Arc Planner',
  description: 'Chooses the Destined Ending and the story\'s length first, then plans Arc 1 toward it.',
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
