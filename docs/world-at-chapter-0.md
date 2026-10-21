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

## Standing rules any agent must keep

- Never add a model call without SENSEI's approval.
- Show the exact prompt words and get approval before they change.
- No compatibility layers; the dev repo changes its architecture freely.
- SENSEI merges; never merge without "merge it".
- Don't delete or bypass the HARNESS. Keep tag complexity minimal. No
  code-based extraction from prose.

## History

- 2026-10-21: started from SENSEI's conversation after the chapter loop's step
  2 merged (PRs #414, #418).
