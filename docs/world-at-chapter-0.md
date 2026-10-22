# The World at Chapter 0 (living plan)

**Status:** the owner's working plan. **Phase B, the World at Chapter 0, is
built** (2026-10-22; see the History at the end). The phases after it are not.
Any agent picking this up should read it top to bottom, then
[HARNESS_PRINCIPLES](../src/components/harness-generation/HARNESS_PRINCIPLES.md)
and the [vocabulary](../src/components/harness-generation/ARCHITECTURE_VOCABULARY.md).

The chapter loop's own design document was rolled back with its code on
2026-10-22 ([#421](https://github.com/SENSEIDUKES/development/pull/421)), so
this plan no longer links to it. What it had designed — CTE as code, the world
judge, and their build order — is named below where this plan depends on it; the
owner decides when it comes back.

## Where this stands, and how to use it (read first)

SENSEI is not a coder (2026-10-21: "I can't do anything but tell you guys my
ideas and hope you guys choose the right shit"). Agents write all code.
SENSEI decides, approves words, and judges results by **seeing** them in the
Workshop and the app, never by reading code. So every phase below ends with
something SENSEI can look at, and no phase starts on an undecided question.

**Already designed in the chapter loop (rolled back, #421):** CTE as code
(section "CTE: independent probes, one engine"): a probe per CGT variable
measured from the record by code, an engine running CGT section 13, plain
words for the models. The world judge. Build order steps 3 to 7. Its open
decisions 1 to 4 belong to SENSEI at those steps. Decision 1, where a
character's starting CTE state comes from, is part of the World at Chapter 0:
picks in the Seed, turned into numbers by code.

**Phases, in order:**

| # | Phase | Agents build | SENSEI does | SENSEI sees | Where it stands |
|---|---|---|---|---|---|
| A | Finish this design | Card kinds drafted (below); revise from SENSEI's cuts | Approve or cut the list | This doc | **done** |
| B | World at Chapter 0 | Seed slots, Blueprint fill, Chapter 0 record | Approve any new model words or calls | Seed and Blueprint pages; the Codex full before Chapter 1 | **built 2026-10-22** |
| C | CTE engine + first probe | CGT section 13 as code, the Fragmentation probe, CGT section 14's examples as tests | Hand over CGT v1.5 (PDF); decide chapter-loop decisions 1, 2, 4 | A **CTE panel**: each character's variables, phase and evidence per chapter | next |
| D | Planner reads CTE + Fate Pressure | The readout in plain words; the tier as the aim | Approve the planner's new words | The plan and the readout side by side on the Harness Generation page | waits on C |
| E | World judge | Outcomes by code | Decide chapter-loop decision 3 | Outcomes and their reasons | waits on C |
| F | Other probes, one variable at a time | Each probe with its doctrine file | Approve each doctrine file in plain words | The CTE panel filling in | waits on C |
| G | Cleanup | Remove what covered for the missing world | Approve removals | Fewer warnings, same results | last |

**What is not ready yet:** the CGT numbers are in SENSEI's PDF, not the repo;
the pressures per Fate Pressure tier (later, not to be invented); the writer's
freedom line. Two pieces of phase B are deliberately left for their own steps,
each with its own approval: **what the chapter writer reads from this world**
(today it still reads what it always read, so the Story Information it gets is
unchanged), and a character's **starting CTE state**, which is phase C's and
whose numbers are the owner's.

**To hand this to a new chat:** "Read docs/world-at-chapter-0.md. Phase B is
built. We are at phase C." Attach the CGT v1.5 PDF before phase C.

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

How this lines up with what is built:

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

### Fate Pressure sets the planner's target (SENSEI, 2026-10-21)

> "Fate Pressure was supposed to essentially change how the planner perceives
> what those scores should inform the writer. If it's a low Mortal Fate
> Pressure, then keeping the main character inside that optimal pressure load
> range is ideal. On the opposite end, if they chose the Heaven pressure, then
> increasing the pressure on the seed is literally the point."

So Fate Pressure is not only how hard the world pushes (the chapter loop's
"sizes every pressure load" and "how strictly the world judge rules"). It is
the **target the direction aims for**, read against CTE's scores:

- **Mortal:** keep the main character inside the optimal pressure load range.
  When CTE shows them over it, the direction eases off; under it, it adds.
- **Heaven:** raising the pressure on the seed is the point. The direction
  pushes past the comfortable range on purpose.
- **Immortal:** between the two.

**Measured by the character's CGT phase** (SENSEI, 2026-10-21: "Mortal, Heaven
and Immortal simply go based off the Syntrophic state of the character").
From CGT v1.5 (section 13), each event's Transformation Result is
`TR = AS − EP`, and its phase is:

| Phase | Condition | Meaning |
|---|---|---|
| Syntrophic | TR > +15 | pressure metabolized into growth |
| Threshold | −15 ≤ TR ≤ +15 | strained survival, holding under tension |
| Dissipative | TR < −15 | fragmentation; pressure exceeds capacity |

**The mechanism, not the numbers** (SENSEI, 2026-10-21: "I'm not saying
Mortal = 24/7 bliss and nirvana. I'm explaining what the actual mechanism is
at all"). The tier decides how the direction is aimed relative to the
character's Syntrophic state, read from CTE: lower tiers aim to keep the
character near it, higher tiers aim to push them away from it. The actual
pressures and bands per tier are **not decided** and will be set later; no
agent should invent them.

CGT v1.5's variables (node: C, F, R, M, A, G, I, P, W, PL 0–150, E0; edge:
Recognition, Disposition, Coupling) and its memory cycle (13.2: each phase's
updates, with PL multiplied by 0.75, 0.95 and more after a dissipative event)
are the source CTE is built from. The PDF is SENSEI's; its numbers are not
copied into the repo yet.

In SENSEI's pipeline this stays CTE's interpreting, not the planner's: code
reads the scores against the tier's target and hands the planner a plain
direction, for example "lower the pressure load this chapter". The planner
announces it.

**Built today:** Fate Pressure only tunes Rhythm (which chapter function is
favored). It is not in the planner's input, and there is no CTE to score
against. Open questions (later): the actual pressures per tier; whether the target applies to the
main character only or to every tracked character; and the exact plain words
the planner receives (SENSEI approves them).

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

## What the gap was (inventory, 2026-10-21; closed 2026-10-22)

This is the record of what was missing when the plan was written. Phase B
closed it: the Foundation now also carries `worldAtChapterZero`, the Seed holds
every Codex slot, and the Codex shows places, factions, species and the World
rules sheet. The prose fields below are still there, and shrinking them is
phase G's cleanup.

### Story Seed → Harness (`StoryFoundationInput`, `src/narrative/generation.ts`)

Only `premise` was required. The rest was prose, plus a thin cast list:

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

## The shape (1 to 3 and 5 built 2026-10-22; 4 waits on the planner)

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

## The card kinds (approved and built; the code is `WORLD_CARD_KINDS`)

Built only from the record's line: a slot is here because the **artist test**
(draw it) or the **save-game test** (load it as it stands) needs it. Nothing
else. Every slot is optional in the Seed; blanks are filled before Chapter 1.
"Have" means the card already holds it today.

### 1. Character (have)

| Slot | Test | Changes over the story | Today |
|---|---|---|---|
| Name, other names | both | rarely (a new title) | have |
| Who they are, one line | artist | rarely | have |
| Gender, age | artist | age with time | have |
| Look: one line, then traits | artist | yes (look facts) | have |
| Species (if not human) | artist | no | **new** |
| Where they are (a place) | save-game | yes | **new** |
| Holds and knows (things, abilities), rank | both | yes | have |
| Status (wounded, captured, dead...) | both | yes | have |
| Goals, values, debts | save-game | yes | have |
| Ties to others (allies, enemies, family, bound) | save-game | yes | **started** (stances, debts) |
| Belongs to (factions) | save-game | yes | **new** |
| Voice | other media | no | have |
| Starting CTE picks (chapter-loop decision 1) | CTE | via the engine | **new** |

### 2. Thing (have)

Name; look; count; who holds it or where it lies; status (damaged,
destroyed). **New:** where it lies when no one holds it.

### 3. Ability (have, thin)

Name; who knows it and at what level (on the character); **new:** how it looks
when used (the artist must draw the technique), and which rank ladder its
levels follow (from World rules).

### 4. Place (new)

Name; look (to draw it: terrain, buildings, light, scale); inside which larger
place (a hall in a sect in a mountain range); who holds it (a faction);
condition (intact, burning, ruined). Changes: condition, holder.

### 5. Faction (new)

Name; kind (sect, clan, empire, guild, order, religion...); look (emblem,
colors, dress, so members are drawn right); seat (a place); leader (a
character); ties to other factions (allied, rival, at war, vassal); standing
(rising, ruling, fallen). Members come from each character's "belongs to".
Changes: leader, ties, standing, seat.

### 6. Species, the Bestiary (new)

Name; look; where it lives (places); how dangerous or how strong, on the
world's rank ladder; whether it speaks or thinks. A named beast is a
character with this species (NOVEL_EXPANDED, 2026-10-13). Changes: rarely
(a species driven out, wiped out).

### 7. World rules (new, one per story)

Not a card per entity: the one sheet every other card refers to.

- **The rank ladder(s):** the ordered ranks of the power system (Qi
  Condensation 1 to 9, then ...). Character ranks, ability levels and species
  strength are chosen from it, so code can compare them.
- **Laws and customs** that change what can happen (no killing inside the
  city, the sect bans outside techniques), each one line.
- **Era and material conditions:** this is CGT's base field E0 (non-social
  environment), which CTE reads.

### Not cards (already part of the record, or later)

Ties (between characters, and between factions) live on the cards above.
Scenes, moments, mood and voice belong to chapters, not to Chapter 0. The
starting scene (where Chapter 1 opens, when, conditions, who is present) is
the one scene the Seed sets.

### Still for SENSEI to decide

1. **Religion:** built as a kind of faction (a body of people with a belief and
   a look), as drafted. Its own card kind if the owner wants one.
2. **Cut or keep** anything above. The rule for adding back: name which test
   fails without it. A cut is one line in `WORLD_CARD_KINDS`.
3. **Anything missing** that the artist or save-game test needs and this list
   doesn't cover.
4. **Who reads it:** the Codex now shows the world before Chapter 1 to whoever
   opens it. If a reader should meet the world only as the story reaches it,
   that is one rule in the record, not a rebuild.

## Open questions for SENSEI

1. **More card kinds?** Built: character, thing, ability, faction, place,
   Bestiary species, World rules. Religion is a kind of faction. Still to
   decide if the tests need them: artifacts apart from things, history and
   events.
2. **Who fills the blanks at world generation**, per slot — today one model
   call (the Blueprint's) fills every blank:
   - the author, by hand;
   - code from menus and tables (the RimWorld way: free and repeatable), for
     example rank scales, starting gear by role, faction relations;
   - one model call per story, for what needs imagination (looks, histories,
     religions). This is the Blueprint's own call; its words are on the Writer
     Instructions page. A *second* call would need SENSEI's approval, with its
     exact words shown first.
3. **Where the author fills slots**: both today, on the Story Seed page and in
   the Blueprint review. Whether both should stay.
4. **Prose fields that stay prose**: style bible, trope rules, logline and the
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

## What phase B built (2026-10-22)

The world is now recorded before Chapter 1, in the Codex's own card kinds.

- **One definition per card kind** (`src/narrative/worldRecord.ts`,
  `WORLD_CARD_KINDS`): character, thing, ability, place, faction, species and
  the one World rules sheet, each slot carrying which test needs it and whether
  the story changes it. The Story Seed's fields, the Blueprint's instruction,
  the Blueprint's answer schema and the Codex's cards are all written from it,
  so none of them can hold a slot another one lacks. Tests fail on drift.
- **The Seed holds every slot.** The character and faction cards gained the
  slots they were missing (look, species, where they are, status, what they
  hold and know, goals, ties, what they belong to, voice; a faction's kind,
  emblem, seat, leader, standing and ties), and the kinds with no home at all
  arrived: Things, Abilities as cards, Places, the Bestiary, and the World
  rules sheet (the ladder, the laws, the age). Every slot is optional, as
  before.
- **The Blueprint fills the blanks.** The one existing Blueprint call now also
  writes the world at Chapter 0; no new model call was added. Its words are on
  the Workshop's Writer Instructions page, under *Before the story*, with their
  dated history. The default output budget rose to 16,384 tokens, since the
  answer now carries the world.
- **The Codex is full before Chapter 1.** The record reads the world from the
  story's Foundation, and the Codex opens with Characters, Items, Abilities,
  Places, Factions, the Bestiary and the World rules sheet. A card says it is
  the world as it began; what the chapters record lands on those same cards,
  never a second one. See it at `?preview=reader-codex` → Development →
  **Before Chapter 1**.
- **Deliberately not in it:** what the chapter writer reads from this world
  (its own step, its own approval), and the Ability card's place in the
  Codex beyond its own tab.

## History

- 2026-10-22: phase B built (the card kinds, the Seed's slots, the Blueprint's
  fill, the Chapter 0 record and the Codex before Chapter 1). The plan document
  itself returns here after the rollback of 2026-10-22 (#421), which undid the
  chapter loop and this file with it.
- 2026-10-21: started from SENSEI's conversation after the chapter loop's step
  2 merged (PRs #414, #418).
