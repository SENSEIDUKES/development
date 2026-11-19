# Arc goals on cards

**Status:** Proposed. Part 1 (the numbers) is built; part 2, SENSEI's one Main Goal
per arc proven by a card, waits on SENSEI's answers below.

**Owner's direction (SENSEI, 2026-11-18):** almost every arc comes back as three
long goals (10, 10, 10 or 8, 8, 14). A goal like "Su Ming and Ling Chao make a
connection" is met in Chapter 1 and then sits in front of the writer for seven
more chapters, so the writer does not know where to take the story. Two fixes:
require more, shorter goals, decided by arithmetic; then tie arc goals and the
Destined Ending to real cards and to tags being achieved.

## Part 1: the numbers (built 2026-11-19)

One rule decides the count: **a goal takes at most 8 chapters**
(`ARC_GOAL_CHAPTERS.max`). An arc is 30 chapters, so it needs at least
30 ÷ 8 = **4 goals**, rounded up. At 3 chapters a step (`ARC_GOAL_CHAPTERS.min`), at
most 30 ÷ 3 = **10 goals** fit (`ARC_GOAL_COUNT`, `@seihouse/sen/arc-goals`).

- Both planners (the Blueprint's Arc 1, SEN Arc Planner 1.4.0, and the planner for
  each later arc) are asked for 4 to 10 goals of at most 8 chapters each. Each goal
  must be **an event a chapter can show happening** (a meeting, a betrayal, a
  breakthrough), never a state the story sits in ("grow closer").
- The response schema says the same (`ARC_PLAN_DRAFT_SCHEMA`), and code refuses a
  plan that breaks it (`arcPlanPacingProblem` in `arcPlanFromDraft`). A refused
  Blueprint saves nothing and asks to generate again. A refused arc plan fails the
  planning step, and the reader plans again from the same place.
- A creator's own Arc 1 goal longer than 8 chapters is refused before the Blueprint
  call, and the ARC page says to split it. Nothing the creator wrote is shortened
  quietly.
- **Saved plans are untouched.** Stories and Blueprints planned before this rule
  keep reading as they are (`validateArcPlan` only checks a plan's shape). An
  existing story gets the new pacing from its next arc. Reader edits in the arc
  review are the reader's, and are held only to the plan's shape.

What part 1 cannot fix: **the writer still decides when a goal is met**, by
reporting it with a passage, and every goal can be missed. Part 2 changes both.

## Part 2: one Main Goal per arc, proven by a card (proposed)

**SENSEI's direction (2026-11-19):** each arc has **one Main Goal**, attached to a
change on a Codex card. The arc's steps (today's goals) are demoted to **rails**: they
keep the writer on a path toward the Main Goal, and they never count for or against the
reader's progress. Only the Main Goal can fail.

> Arc 1: *Su Ming joins the Azure Sect as an official outer court disciple.*
> Proven when a chapter's tags show Su Ming's card **joined** to the Azure Sect's card.

### What changes

| | Today | Proposed |
| --- | --- | --- |
| What can fail | Every goal is completed or missed at its deadline | Only the Main Goal, at the arc's end |
| Who decides it is met | The writer, with a quoted passage | Code, from the chapter's tags on the named cards |
| The steps | Goals with deadlines, recorded as reached or missed | Rails: 4 to 10 steps (part 1) the writer works through. A step can slip or be re-planned without a mark against the reader |
| Fate Survival's broken route | Counts missed goals | Only a missed Main Goal |
| The Destined Ending | Words | The same thing at story scale: the final arc's Main Goal, with one to three card changes |

### Standard tags

A Main Goal is checkable only if the tags it waits for say the same thing in every
story. Today a status ("badly wounded") and a tie ("sworn brothers") are free words, so
code cannot compare them. The proposal keeps the free words as the story's own flavor,
and adds **one standard value from a very short list** that every model can follow. These
are new words on the tags the Chapter Tagger already writes, not new parallel tags:

| Kind | On | Standard values (draft) | Today's tag |
| --- | --- | --- | --- |
| **Condition** | one card | alive, wounded, captured, sealed, dead (a thing or place: intact, damaged, destroyed) | Status |
| **Connection** | two cards | joined, left, ally, enemy, neutral | Ties |
| **Standing** | a card within a faction | the rank names on that faction's card (outer disciple, inner disciple, elder) | Holdings, rank |
| **Location** | a card and a place card | at (already a card reference, so already standard) | Place |

Su Ming's goal is then: Connection, Su Ming → Azure Sect, **joined** (and, if SENSEI
wants the rank to matter, Standing: **outer disciple**).

### How it closes

1. The arc planner writes the Main Goal's words, its card change (kind, cards, standard
   value), and the rails toward it. It names only cards that exist; the World at
   Chapter 0 already makes them before Chapter 1.
2. After each chapter is tagged, code compares the tags with the Main Goal. A match
   completes the arc's goal, with the tagged sentence as evidence.
3. The rails keep the writer moving; when one is reached early, the next starts at once
   (`activeArcGoal`), but none is recorded as missed.
4. At the arc's last chapter an unmet Main Goal is missed. Fate modes keep their
   meanings: off track in Regular Reader mode, a broken route in Fate Survival.

### One mechanism, three users

The Main Goal's card change is the same check Stage E3 plans for a Hard Pin ("closes
when his card says dead", `NOVEL_EXPANDED.md`). Main Goals, the Destined Ending and
goal pins should share **one** check, owned by SEN beside the arc contract.

### Claude's view

- **One failable goal is the right product.** It gives the reader one clear thing to
  win or lose per arc, and it lets the steps be honest rails that can bend when the
  reader redirects the story, which happens constantly.
- **Membership belongs on the faction card, not the place card.** The Azure Sect is
  likely both a faction and a place. "Joined" is a Connection to the faction; "arrives
  at the gate" is a Location at the place. Keeping them apart stops a goal from
  closing just because Su Ming walked through the gate.
- **The tagger becomes the referee, so a missed tag must not fail an arc.** Before a
  Main Goal is marked missed, code should look at the card's current state (worked out
  from every chapter, not just the last), and the reader should be able to mark it met
  themselves (tags already accept a `manual` origin).
- **Keep the list tiny and fixed in SEN.** Four kinds, about five values each, defined
  once in `@seihouse/sen/contracts` beside `WORLD_CARD_KINDS`, so a host such as the
  Library can show them in its own skin but never add to them.

## SENSEI decides first

1. **The lists.** Are Condition, Connection, Standing and Location the right four
   kinds, and the draft values above the right ones? Is Standing worth having in the
   first version, or only Condition and Connection?
2. **More than one change?** May a Main Goal need two card changes (joined *and*
   outer disciple), or exactly one?
3. **Rails the reader sees.** Does the reader still see the steps on the Fate page and
   the arc review, or only the Main Goal?
4. **The reader's edit.** In the arc review, does the reader pick the cards and value
   on a phone, or edit only the words while the planner keeps the card change?
5. **The ending.** Does the reader see the Destined Ending's card changes on the
   Blueprint, or are they hidden like the look-ahead?
6. **Met early.** If the Main Goal's change happens in Chapter 5, does the arc's goal
   close there while the rails carry on, or does the planner re-plan the rest of the arc?

## History

- **2026-11-19:** Part 1 built: 4 to 10 goals of at most 8 chapters for every planned
  arc. Part 2 rewritten to SENSEI's direction: one failable Main Goal per arc on a
  card change, the steps as rails, and standard tag values. Open questions listed.
