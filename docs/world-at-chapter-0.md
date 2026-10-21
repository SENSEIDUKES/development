# The World at Chapter 0 (living plan)

**Status:** a working plan SENSEI is shaping in conversation. It is not
approved doctrine yet. Nothing here is built. Any agent picking this up should
read it top to bottom, then [the chapter loop](chapter-loop.md),
[HARNESS_PRINCIPLES](../src/components/harness-generation/HARNESS_PRINCIPLES.md)
and the [vocabulary](../src/components/harness-generation/ARCHITECTURE_VOCABULARY.md).

## The problem, in SENSEI's words (2026-10-21)

> "We already had planned out what the codex slots were going to be. And yet I
> made the story seed and blueprint first, and they were never actually
> connected. That's literally the missing gap."

> "Everything that's going to be on [the Codex] needs to be fillable inside the
> story seed first. That's the point. ... And then the world can make up the
> shit afterwards that's not filled in."

> "We need to follow the RimWorld example. RimWorld was able to do all this
> stuff without AI because the entire world is planned before you hit
> generate. The religion, the characters' abilities, what factions are in that
> world."

> "If we got to break it more to fix it, it's what it is."

## The line: what the Codex must hold (already decided, 2026-10-11)

SENSEI (2026-10-21): "What exactly would make this not multimedia? How do we
take it to a manga and recreate it one for one? That's the line." This was
decided in [HARNESS_PRINCIPLES](../src/components/harness-generation/HARNESS_PRINCIPLES.md#translation-across-media-the-world-record)
and is the only measure of the Codex. **No fields beyond it.**

**Two tests for "enough":**

- **The artist test:** can someone draw any scene from the record alone,
  without reading the chapter?
- **The save-game test:** can a game load the world exactly as it stands at
  Chapter N: who is where, holding what, in what condition, allied with whom?

When both pass, the record is enough. Anything more is the studio's job.

**The minimal set:** entities (characters, things, abilities, places,
factions, each with one permanent ID); appearance and its changes; state over
time (holdings, rank, status, where each character is); ties; scenes (where,
when, conditions, who is present); moments; voice; mood; world rules (power
system, ranks, factions, laws).

**Medium-neutral:** the record says "Gu Chen, scarred left cheek, grey robes,
at the North Ridge Gate, at dusk, wounded", never a panel, camera, frame or
art style.

**What it means here:** the Story Seed and Blueprint must pass both tests **at
Chapter 0**. An artist can draw the opening scene, and a game can load the
starting world, from the Seed and Blueprint alone. Today they fail mainly on
appearance (only the main character, as one prose line), entities (no place
or faction cards), location (nobody is anywhere) and world rules (prose only).

## The whole pipeline, as SENSEI sees it (2026-10-21)

> **Seed > Blueprint > Planner > Writer.**
> "Chapter 1: the Planner gets the relevant Codex info / story direction + CTE
> and informs the Writer how to proceed. No interpreting from the planner. Just
> announcing the direction. CTE does the interpreting. The writer has enough
> freedom to do what it wants in the scene but must follow the planner's plan.
> Simplified example: CTE informs the planner that the next scene needs to
> lower the Pressure load so the MC's reaction is realistic."

How this lines up with what is built (see [the chapter loop](chapter-loop.md)):

| SENSEI's role | Designed in the chapter loop | Built today |
|---|---|---|
| Seed and Blueprint make the world | (this plan) | Prose only; no Chapter 0 record |
| CTE interprets: what the people can bear, what is realistic | Steps 2, 3 and 7: probes, readout, the CTE engine (code) | **Not built** |
| Outcomes judged, not chosen | Step 6: the world judge (code) | **Not built**; the planner picks outcomes itself |
| Planner announces direction from Codex, story direction and CTE | Step 4 | Built, but it reads no CTE, so it also does CTE's and the judge's work |
| Writer follows the plan, free in the scene | Step 8 | Built as "decides nothing"; the line for its freedom is not drawn |

The disconnect is build order: CTE and the world judge are not built, so the
planner interprets and decides what they should. Open point for SENSEI: draw
the writer's freedom precisely. Free in how a scene is told (staging,
dialogue, small beats, pacing); bound to the plan's facts and outcomes; and
anything new that would matter to the record (a new person, item or injury)
is either forbidden or has to be planned.

## The principle

RimWorld generates the whole world before play: factions and their relations,
ideologies, every colonist's traits, skills, gear and history. Play never
invents the world; it only changes state that already exists.

SEN today does the opposite. The Story Seed and the World Blueprint describe
the world in prose and a few fields. The real world state (the Codex record)
is only built piece by piece, by the chapter planner, the first time something
appears. So Fate is doing world generation and storytelling at once, one
chapter at a time, and anything the seed never had a slot for gets invented
mid-story.

**The fix:** the Codex card kinds are the master schema. The Story Seed and
Blueprint are the world as it stands at Chapter 0, written in that same schema.

## Decisions so far (SENSEI, 2026-10-21)

1. **The Codex defines the slots.** Every kind of Codex card, today's and the
   ones still to come, has the same slots in the Story Seed.
2. **Every slot is optional.** Like everything else in the Story Seed, none is
   required.
3. **What the author leaves blank is filled before generation.** The world is
   complete before Chapter 1, not filled in when something first appears.
4. **Later arrivals stay Fate's.** Characters, factions and anything else that
   enters after Chapter 0 are still created by the chapter planner, as now.
5. **Breaking things to fix this is fine.** This is the development repo with
   no compatibility (SENSEI: "the whole point is to change the architecture").
6. **The Bestiary is one of these kinds.** It describes the creatures natural to
   the world (goblins, dragonkin, whatever the world has), filled in before
   generation the way RimWorld fills in religions. Per NOVEL_EXPANDED
   (2026-10-13): it holds species and unique beast groups; a named beast (the
   Dragon King) is a character.

## What exists today (inventory, 2026-10-21)

### Story Seed → Harness (`StoryFoundationInput`, `src/narrative/generation.ts`)

Only `premise` is required. The rest is prose, plus a thin cast list:

- Prose: title, premise, tone and style, genre, opening situation, declared
  canon, characters, world facts, intended direction, permanent instructions.
- `cast`: per character only **name, role, relationship to the main character,
  is-main-character**.
- `identities`: names and aliases of characters, **location-world** and
  **faction**, each with a line of evidence. These help name resolution; they
  never become Codex cards.
- Direction: Destined Ending, Fate Pressure, Fate Survival, hard pins, fun
  settings, Arc 1 plan and look-ahead, planned arc count.

### World Blueprint (`WorldBlueprint`, `src/components/story-seed/shared/types.ts`)

Generated from the seed, and **almost entirely prose strings**:

- worldOverview, startingLocation, societyStructure (each with an optional
  generated "detail"), powerSystemOutline, styleBible, tropeRules,
  firstArcPromise, logline.
- `mainCharacter`: name, age, personality, **appearance** (one prose string),
  backgroundProfile; plus a legacy `mcProfile` string.
- `majorFactions: string[]` and `initialCharacters: string[]`: lists of prose.
- Arc 1 plan, look-ahead, Destined Ending.

None of it is written into the Codex record. The record only starts at the
first chapter's plan.

### The Codex record (built from chapter plans)

- **Card kinds that exist:** character, thing, ability (`CodexEntryKind`).
- **Character card:** who they are, gender, age, whole look (summary and
  traits) and look changes, status, holdings (owned, equipped), abilities
  (learning, learned, sealed, level), rank, goals, values, commitments both
  ways, stances (said and acted), voice, first words, chronicle.
- **Thing card:** look, holder, status, history.
- **Factions** show in the Codex page only by name (declared or named like a
  Sect or Clan). They have no card fields and no record.
- **Missing kinds** (HARNESS_PRINCIPLES "minimal set"): places, factions as
  real cards, the Bestiary, ties, scenes, world rules (power system, ranks,
  laws: today only prose in the Blueprint).

### The gap, in one table

| Codex card holds | Seed can set it | Blueprint sets it | Who fills it today |
|---|---|---|---|
| Character: name, role | yes | yes (prose) | author / Blueprint |
| Character: who they are | no | prose only | planner, at first appearance |
| Character: gender, age | no | main character age only | planner, at first appearance |
| Character: look | no | main character, one prose line | planner, at first appearance |
| Character: holdings, abilities, rank | no | no | planner, at first appearance |
| Character: goals, values, debts, stances | no | no | planner, over chapters |
| Thing, ability (starting ones) | no | no | planner, at first appearance |
| Faction | name only | prose list | nobody (no card) |
| Place | name only | starting location prose | nobody (no card) |
| Bestiary species | no | no | nobody (no card) |
| World rules (power system, ranks) | no | prose outline | nobody (no structure) |

## The proposed shape (for SENSEI's review)

1. **One definition per card kind.** Each kind (character, thing, ability,
   faction, place, species, and later ones) is defined once: its slots and
   their menus. Everything else is derived from it: the seed form's slots, the
   Blueprint's fill step, the planner's menus, and the Codex page. A new kind
   then brings its seed slots with it, so the seed and the Codex can never
   drift apart again.
2. **The seed becomes Chapter 0's plan.** What the author fills, and what the
   Blueprint fills in for the blanks, is written as a Chapter 0 entry in the
   same record the chapter plans feed. The record is already built from plans,
   so this needs no second path. Example: the hero's heirloom sword is "already
   had" at Chapter 0, so the checks know it exists from the first event.
3. **The Blueprint step fills the world.** It stops being mostly prose and
   produces the Chapter 0 record for every blank slot, once, before Chapter 1.
4. **The planner only decides what happens.** It plans from a complete world.
   It still creates whoever and whatever arrives later.
5. **Manifest pictures and voices can exist before Chapter 1**, since looks and
   genders exist from Chapter 0.

## Open questions for SENSEI

1. **The full list of card kinds.** Known: character, thing, ability, faction,
   place, Bestiary species. Mentioned: religion. Others to decide: power or
   cultivation system and its ranks, sects as factions or separate, artifacts,
   history and events, laws.
2. **What each new kind holds** (faction, place, species, religion): its slots,
   and which can change over the story.
3. **Who fills the blanks at world generation**, per slot:
   - the author, by hand;
   - code from menus and tables (the RimWorld way: free and repeatable), for
     example rank scales, starting gear by role, faction relations;
   - one model call per story, for what needs imagination (looks, histories,
     religions). This would be a new model call and needs SENSEI's approval,
     with its exact words shown first.
4. **Where the author fills slots**: on the Story Seed page, in the Blueprint
   review, or both.
5. **Prose fields that stay prose**: style bible, trope rules, logline and the
   like are not Codex facts. Which Blueprint prose becomes structured, and
   which stays as writing guidance.

## After this: simplify what the gaps forced (SENSEI, 2026-10-21)

> "After we fix the story seed and the blueprint, I guess the next step would
> be to look at all this shit we just did, because a lot of it's probably not
> needed. We probably added a lot of extra juice to cover these deficiencies,
> when a lot of it could be much more straightforward."

Once the world is complete at Chapter 0, review every piece built to cover for
a world that didn't exist yet, and remove or shrink what is no longer needed.
Candidates to review (not decided; each needs checking against the new shape):

- **The planner inventing starting entities:** a whole look, gender, age and
  "who they are" for anyone the Codex has no card for. For the starting cast
  this moves to Chapter 0; it stays only for newcomers.
- **"Already has" (`alreadyHas`)** and the checks around it: its kind menu
  flag, and setting aside what the Codex already lists. Mostly there to give
  starting characters their starting gear mid-story.
- **The "already has a look" check**, which sets aside a second look for
  someone who has one.
- **Declared-character handling:** the resolver's "declared" path, Story Seed
  cast lines marked `fromStorySeed`, and `identities` (characters,
  location-world, factions) used only for name matching. These become Chapter 0
  cards.
- **The Codex guessing factions from names** ending in Sect, Clan or Tribe.
  These become faction cards.
- **Blueprint prose and its "detail" layers** (world overview, starting
  location, society, power system, with their detail and basis fields), where
  they now hold facts that belong in cards.
- **Adding people an event names but the cast forgot**, and reading an
  off-menu cast kind as a character: possibly less needed when the planner
  plans from a complete world. Still needed for newcomers.

Rule for the review: keep what still guards against a real planner mistake;
remove what only existed because the world was missing.

## Standing rules any agent must keep

**Protect the CAPA HARNESS above everything** (SENSEI, 2026-10-21: "As long
as you guys don't fuck up my CAPA harness, I'll be able to fix it again. ...
I don't need nobody fucking up my harness."). It is how SENSEI recovers from
any other mistake. That means, for this plan and the cleanup after it:

- The writer's prompt skeleton (`HARNESS_PROMPT_PARTS` in
  `src/server/harness-generation/prompt.ts`) and its order stay as they are;
  new text goes into the one part it belongs to (`promptSkeleton.test.ts`).
- CAPA stays the home of the story's skills: the CAPA Schema, its slots
  (including who reads each one: planner, writer or both), the CAPA Skills and
  the CAPA Prompt. Story Seed and Blueprint work feeds Story Information; it
  never moves into, replaces or works around CAPA.
- The Writer Instructions page and its dated history stay complete; every
  change to words a model reads is shown there and approved first.
- The cleanup removes pieces that covered for missing world state. It never
  removes or bypasses a HARNESS part, a CAPA slot or a skill.

- Never add a model call without SENSEI's approval.
- Show the exact prompt words and get approval before they change.
- No compatibility layers; the dev repo changes its architecture freely.
- SENSEI merges; never merge without "merge it".
- Don't delete or bypass the HARNESS. Keep tag complexity minimal. No
  code-based extraction from prose.

## History

- 2026-10-21: started from SENSEI's conversation after the chapter loop's step
  2 merged (PRs #414, #418).
