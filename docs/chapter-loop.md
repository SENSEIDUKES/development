# The chapter loop: the record, Fate and CTE

- **Created:** 2026-10-20
- **Owner:** SENSEI
- **Status:** step 2 is built (2026-10-20): the planner, the checks, the
  writer's new handoff and the record made from plans, in the prompt words
  SENSEI approved, which the Workshop's Writer Instructions page shows from
  the live code. Steps 3 onward are design. Every chapter of a SEN story runs
  this loop, and every agent builds to it.
  [`NOVEL_EXPANDED.md`](../NOVEL_EXPANDED.md) stays the source of truth for
  what is built; the order this design is built in is [below](#build-order).
- **Replaces:** `docs/cte-consequences.md`, folded in here, and the plan to
  tag information in the prose (the old Stage E1 of `NOVEL_EXPANDED.md`).
- **Sources outside this repository**, all by SENSEI: *The Consciousness Garden
  Theory* v1.5 (sections 12 to 15: the Consciousness Translation Engine, its
  variables and its laws), the *Fragmentation Checker — Deterministic Spec*,
  and the repositories `SEIHouse/CTE-ENGINE` (its variable doctrine) and
  `SEIHouse/CTE-LAB`. This repository is public, so the engine's mathematics
  and the checker's weights are not copied here: an agent building them asks
  the owner for the documents.

## Why one loop

Until 2026-10-19 the writer did everything in one call: it wrote the prose,
tagged media in it, and tagged information in it (who appeared, looks,
holdings, status). The media tags worked: the writer recognizes a moment and
picks a word from the story's own list, and no tag is a correct answer. The
information tags failed: open vocabularies, rules to tag every change, many
shapes, and everything downstream depending on them. Consequences did not
exist at all: tell the writer the army charges, and the army charges and wins,
because a model agrees by default.

These are one problem with one answer (SENSEI, 2026-10-20). What happens in a
chapter, and what it does to the people in it, is decided before the chapter
is written: by Fate (the planner) and by the Consciousness Translation Engine
(CTE). The Codex keeps it, and the writer narrates it. **The writer narrates
consequences; it never decides them.** As in a tabletop game, the player
declares what they try, something else decides how it goes, and only then is
the scene described.

## Rules that hold

1. **Media in the prose, information in the record.** Sound Cues, soundscape
   and atmosphere stay tags in the prose, and each paragraph's speaker stays a
   field of the writer's reply. Nothing else the story knows is tagged in the
   prose, and no information tag is ever built again.
2. **The writer narrates; it never decides.** Who is on the page, what happens
   to them, how their attempts turn out and what that does to them are decided
   before the writer is called. The writer adds no fact of its own: no one
   gains, loses, learns, is hurt or dies unless the plan says so, and no new
   named character enters unless the plan casts them.
3. **Models choose from menus; code keeps the score.** A model's structured
   output is choices from fixed menus plus a few words where words are needed.
   Every number (pressure, state, odds, scores) is computed by code from those
   choices and the record. Models are shown plain words that code writes from
   fixed tables, never the numbers.
4. **No model measures.** Every CTE variable is measured by deterministic code
   from the record, in milliseconds. Nothing is extracted from the prose, by
   code or by a model. The record is complete without extraction because the
   plan is the record: structured events emitted when the story is generated,
   which is the Fragmentation spec's one hard requirement.
5. **One shape feeds everything.** A chapter's events are what the writer
   narrates, what CTE runs, what the Codex records and what the probes count.
6. **The record is medium-neutral.** It says who, what, where, when and in what
   condition; never a panel, a camera, a frame or an art style. A studio
   (Manga Studio, animation, a game) translates it
   ([the world record](../src/components/harness-generation/HARNESS_PRINCIPLES.md#translation-across-media-the-world-record)).
7. **Two model calls a chapter:** the planner and the writer. Everything else
   in the loop is code. (The arc planner's call, once at the start of each arc,
   stays as it is.) Any further model call needs the owner's approval, and
   so does every change to a prompt's exact words.
8. **No compatibility in development.** When the loop's shapes change, saved
   stories reset (the schema version moves): no aliases, dual reads or
   migrations ([conventions](../skills/seihouse-codebase-conventions/SKILL.md)).

## The loop

Each chapter, in this order:

| # | Step | Who | Reads | Produces |
|---|---|---|---|---|
| 1 | The record | the Codex | | everything as the last chapter left it: cards, the event log, CTE state |
| 2 | Probes | code | the record | each CTE variable of each tracked character, with its evidence |
| 3 | Readout | code | the probes' scores, CTE state | each tracked character's condition in plain words: what they carry, how close they are to breaking |
| 4 | The planner (Fate) | model call 1 | the record, the readout, this chapter's direction, Fate Pressure | the plan: the cast and the chapter's events, chosen from menus |
| 5 | Checks | code | the plan, the record | the plan with every fact that cannot be true dropped and flagged, by the plain rules the Holdings page uses; never a refused chapter |
| 6 | The world judge | code | each attempt, the record, Fate Pressure | each attempt's outcome |
| 7 | The CTE engine | code | each event's pressure on each person, their state, their ties | each person's result (grows, holds or breaks) and their state after |
| 8 | The writer | model call 2 | the plan with outcomes and results in plain words, and the story information it reads today | the chapter: prose with media tags, a speaker for each paragraph, a recap and the next-chapter possibilities |
| 9 | Record update | code | the plan, the results | the new record: facts from the events, state from CTE's memory cycle, each fact linked to its chapter |

Steps 2, 3, 6 and 7 arrive in build order steps 3 to 5; until then the loop
runs without them, and the planner decides outcomes itself. Rewrite runs steps
4 to 9 again from the same record.

## The record

The Codex is the record, and the reader's view of it. It holds:

- **Entities:** characters, things, abilities, and later places and factions,
  each with one permanent ID the app assigns, never a model. A being that is
  both a thing and a character (a sword with a spirit) is two entries, since
  an artist draws them apart; a bound tie joins them (decided 2026-10-13).
- **Cards:** each entity's current facts: its look (one line, then traits),
  gender and age for a character, holdings and rank, status, voice, who it is
  in one line, and later where it is.
- **The event log:** every event of every chapter, in story order. State at
  any chapter is worked out from it; nothing is stored that could count twice.
- **CTE state:** each tracked character's variables, and each tie between two
  characters who have met (see [CTE](#cte-independent-probes-one-engine)).
- **Snapshots** at each arc's end and branch point, as
  [long-story memory](../NOVEL_EXPANDED.md#the-engine-track-the-chapter-loop-and-the-world-record)
  decides.

Every fact links to its chapter. Media attachments (Sound Cues and the rest)
still sit on their words. The Story Seed's characters and things become cards
when the story is created, hidden from the reader until they are first cast.

## The plan: cast and events

The planner returns two lists. The field names below are the design's; the
exact menus and the prompt's words are approved by the owner before they are
built.

### Cast

Everyone and everything on the page in this chapter: who appears, speaks or
acts, and any object that matters to the scene. Never someone only mentioned
or remembered. The main character is always in the cast, as `MC`.

| Field | For | What |
|---|---|---|
| name | everyone | the exact Codex name; for someone new, a full name the story will keep |
| kind | everyone | character or thing |
| who | someone new | who they are in the story, in one line |
| gender, age | a character whose card has none | from menus that map onto the voice cast's (`src/audio/voiceCast.ts`) |
| look | a card with no look | the whole look: one line, then the traits of its kind (`CHARACTER_LOOK_TRAITS`, `THING_LOOK_TRAITS`) |
| starting state | a tracked character whose card has none (build step 3) | structured picks that code turns into the starting variables ([open decision 1](#open-decisions)) |

### Events

An event is one beat of the chapter: something happens, it presses on
someone, and it changes the record.

| Field | What |
|---|---|
| kind | what sort of beat, from a menu |
| actor | who acts: a cast name, `MC`, or nobody when something befalls people |
| targets | who or what it is aimed at |
| attempt | what the actor tries, in a few words, when the beat is an attempt |
| outcome | how it turns out: clean success, success at a cost, partial, failure or disaster; the world judge's once it is built |
| presses | each person it puts pressure on, and how hard, from a menu |
| facts | what it changes in the record (below) |
| how | how it happens, in a few words, for the writer and the Codex |

Each fact is about one entity:

| Fact | Fields | Built from |
|---|---|---|
| holding | who; gains, loses, equips, unequips, has, learning, learns, improves, seals, unseals, knows or rank; what; count or level | today's Holdings record (`HoldingVerb`) |
| status | who; wounded, recovered, dead, revived, sealed, captured, freed, transformed, damaged, repaired or destroyed; how | the states of draft #393's Status design (its tag is not built) |
| look | who; what changes | |
| goal | who; set or resolved; what; priority or outcome | the Fragmentation spec's `GOAL_SET`, `GOAL_RESOLVED` |
| value | who; which value; held or rejected | `VALUE_STATED` |
| commitment | who; to whom; what is owed; entered, fulfilled, released or broken | `COMMITMENT` |
| stance | who; toward whom; said or acted; warm or hostile | `STANCE_STATED`, `STANCE_ACTED` |

The event itself, its actor, kind and targets, is the spec's `ACTION_TAKEN`.

Most chapters hold a handful of events. One small shape, used a few times, is
what keeps the planner reliable: the writer broke when one call carried too
many jobs.

## CTE: independent probes, one engine

CTE is the Consciousness Translation Engine of CGT v1.5. Its doctrine is
CTE-ENGINE's (`docs/CTE_VARIABLE_APP_ARCHITECTURE.md` there): **the variable
tools investigate; the CTE engine synthesizes.**

```text
the record (events) → independent probes → the variables → the CTE engine → a result → plain words → a model
```

- **Probes.** Each variable has its own probe: a focused, deterministic
  measurement over the record. Before one is built it gets a doctrine file on
  CTE-ENGINE's variable template: its definition, what it is not, its evidence
  rules and its false positives. A probe returns the shape CTE-ENGINE defines
  (variable, score, confidence, evidence, source). Missing evidence is `null`,
  never `0`. A probe can improve on its own; the shape it hands the engine
  changes slowly and carefully.
- **Fragmentation is the first probe.** The Fragmentation Checker spec counts
  contradictions in a character's own record: goal conflict, commitment debt,
  value violation, behavioral variance and relational duality. It measures
  `F_structural`, structural contradiction in the record, one observable face
  of Fragmentation, and the code names it that way. Telling growth from
  betrayal is the engine's job, not the checker's.
- **The variables.** CGT v1.5 has fourteen. Eleven belong to a character (a
  seed): Coherence `C`, Fragmentation `F`, Resistance `R`, Permeability `M`,
  Awareness `A`, Growth Capacity `G`, Integration Rate `I`, Perception `P`,
  Will `W`, Pressure Load `PL` and Base Field Support `E0`. Three belong to a
  tie between two characters (an edge): Recognition `Rec`, how one reads the
  other; Disposition `D`, how the other really stands; and Coupling `K`. The
  music engine used nine; a story uses all fourteen.
- **The engine** runs CGT section 13's laws: effective pressure against the
  adaptation score gives the Transformation Result, whose phase is the
  consequence. **Syntrophic:** the pressure becomes growth. **Threshold:**
  strained, holding. **Dissipative:** the pressure exceeds capacity, and the
  character fractures. Its memory cycle updates each state afterwards, and
  pressure that did not register carries into later chapters; coupling between
  characters runs between cycles. It is pure code: the same inputs always give
  the same result, in milliseconds. CGT section 14's worked examples are its
  first tests. Every coefficient is a placeholder until it is fitted against
  observations.
- **What models are told.** Code turns the numbers into plain words from fixed
  tables. Before planning, each tracked character's condition; after the
  events, each person's result: whether they grow, hold or break, and what in
  them moved.
- **SEN is CTE's lab.** CGT names repeatable measurement as the step not yet
  earned. In SEN the record is ground truth for what happened, so raters cannot
  disagree about it; readers can run the validation study the Fragmentation
  spec describes (ranking how divided characters seem, against the probe's
  ranking); and a miscalibrated coefficient only makes an arc feel off.

Neither CTE repository built the engine: CTE-ENGINE lists it as deferred, and
CTE-LAB measures Fragmentation only, with a model judging the evidence, which
the deterministic spec replaces. It is built here first.

## Fate Pressure and the world judge

The planner is Fate. The reader's choice on the Fate page is what the main
character tries; Fate decides what the chapter does with it.

- **Fate Pressure** (Mortal, Immortal or Heaven, chosen in the Story Seed's
  Origin) is how hard the world pushes. Today it only tunes Rhythm, which
  chapter function the HARNESS favors when the reader leaves the path to it
  (`src/components/harness-generation/shared/rhythm.ts`); Rhythm stays, as one
  input to the planner. In the loop
  it also sizes every pressure load CTE receives (code maps the planner's
  how-hard choice through the tier) and sets how strictly the world judge
  rules:
  - **Mortal:** lighter pressure. Characters mostly grow or hold; failures
    cost something but rarely break anyone.
  - **Immortal:** real stakes. Success often comes at a cost; enough strain can
    fracture a character.
  - **Heaven:** brutal. Large pressure loads; dissipative outcomes are common.

  This is CGT's Law of Restriction as a story setting: the reader chooses how
  much restriction the story's seeds grow under. When it lands, Fate Pressure's
  definition changes in the code, `NOVEL_EXPANDED.md` and the Workshop Docs
  together.
- **The world judge** decides how each attempt turns out, as one of the
  outcomes, weighed against the record (holdings, ranks, status, later
  factions) and Fate Pressure. It is also the Fate Survival judge: in survival
  mode a disaster can end the story. Fate Survival stays a separate axis from
  Fate Pressure: who directs, and whether the story can end in failure.
- **Reader requests** reach the planner from the Fate page and the Codex: Bring
  back on a card, Add a character, and Add a faction once factions are
  entities.

## What each model call sees and returns

**The planner** sees the story's basics from the Story Seed (title, genre,
premise, world facts and language, and the opening setup for Chapter 1); the
Codex, one short line per card, the main character first; the readout; the
latest recaps; this chapter's direction (the reader's direction or chosen
path, or Rhythm's recommendation), the arc goal, the Hard Pins, whether the
story is Fate Survival, and the reader's requests; and, on a rewrite, the
reader's note. It reads the Destined Ending and the route to it (SENSEI,
2026-10-20: on 2026-10-19 it only cast the chapter; it now decides how the
story moves toward its ending). It returns the plan, which also says which
event reaches the arc goal and, in Fate Survival, which ends the story. It is
registered in the Model Router and runs on the chapter's model.

**The writer** sees what it sees today, except Holdings and Appeared, which a
chapter plan section replaces: everyone on the page with their look, what they
hold and how they are; someone new in full, in the chapter they first appear;
and each event with its outcome, how it happens and each person's result. The
Destined Ending, the arc goal, Rhythm and the reader's direction as an order
move to the planner, so the writer decides nothing (SENSEI, 2026-10-20). It
returns today's reply without the main character's holdings list, `plan`,
`chapterFunction`, `arcCompletion` or `storyEnded`. Its speaker field is a
menu: `MC`, each character in the cast, someone else, or nobody.

## What retires

In one change, in build order step 2, with no compatibility:

- the SEN Holdings and SEN Appearance skills, their slots, their tag words in
  `src/narrative/marks.ts`, and the code that reads them;
- the Holdings and Appeared sections of the Story Information Packet, and the
  reply's `mainCharacterHoldings`;
- the Holdings fixer and the Look Describer, and their Model Router entries;
- facts pinned to sentences: every fact links to its chapter;
- the Status tag of draft #393: Status is built in the plan instead.

Manifest stops rewriting a look: it draws the look already on the card.

## Build order

Each step is a complete loop a story can be read through and tested; nothing
is tested half-built (SENSEI, 2026-10-19).

1. **This design** (docs only).
2. **The loop.** Built 2026-10-20. The planner, the checks, the writer's new
   handoff and the record update, with events in their final shape from the
   start: cast, looks, gender, age, holdings, status, goals, values,
   commitments and stances. Everything under [What retires](#what-retires)
   went in the same change, and the owner approved the exact prompt words
   first. Still to come in this step: the Fate page's Bring back and Add a
   character, whose words the owner approves first.
3. **The CTE engine**, with the Fragmentation probe. Each tracked character's
   card carries its state; Fate Pressure sizes the loads; the writer is told
   who grows, holds or breaks.
4. **The world judge.** Outcomes from the record and Fate Pressure, and Fate
   Survival's judge.
5. **The other probes**, one variable at a time, each with its doctrine file
   and its validation.
6. **Ties, places, factions and scenes.** Ties are CTE's edges, from stances
   said and acted and from contact; places and factions become entities; scenes
   say where, when and who is present. The record then passes the artist test
   and the save-game test.
7. **Translation across media:** the sequential-art view, then Codex to Manga
   Studio (`NOVEL_EXPANDED.md`, Stage E5).

## Open decisions

Each belongs to the owner, at the step where it matters. A recommendation is
an agent's, not a decision.

1. **Where a character's starting state comes from** (step 3). Recommended: a
   few structured picks for each character in the Story Seed (one of CGT's
   archetypes, for example), and the planner's picks for someone new, which
   code turns into numbers. Choosing who someone is counts as authoring, not
   measuring.
2. **Who owns a variable over time** (step 3). The memory cycle moves some
   variables (Coherence, Fragmentation, Awareness, Pressure Load); probes read
   others from the record. Where both touch one, one has to win. Recommended:
   the engine moves it, and the probe corrects it.
3. **Who decides outcomes** (step 4). Recommended: code, with odds from the
   record and Fate Pressure and a seeded roll; a model judge agrees with the
   reader by default, the gap this loop closes. Still open: how much
   randomness, and whether readers see the odds or only the outcome.
4. **Which characters CTE tracks** (step 3): everyone with a card, or only
   those the story focuses on.
5. **A rewrite without a note** (step 2). Decided (SENSEI, 2026-10-20): it
   keeps the plan, since the reader disliked the telling, not the events, so
   the same plan is written again in new words with no planner call. A rewrite
   with a note plans again from the note.
6. **Create mode**, when it returns: an edit to the prose no longer changes
   the record, so changing what happened means editing the chapter's events.
   Its reread design (`NOVEL_EXPANDED.md`, after Stage E2) is redone for this.
7. **The story as a structure** (step 5): CTE-LAB measured the Fragmentation of
   the whole story; the Fragmentation spec measures each character. Does SEN
   measure both?
8. **Where Stage E4's kinds go** (System Panels, manifestations, creature
   events): media in the prose, or events in the plan.
