# CTE as the consequence layer

- **Created:** 2026-10-19
- **Owner:** SENSEI
- **Status:** direction, not built. Details are still being worked out.
  [`NOVEL_EXPANDED.md`](../NOVEL_EXPANDED.md) stays the source of truth for what
  is built.
- **Sources:** *The Consciousness Garden Theory* v1.5 (sections 12–15, the
  Consciousness Translation Engine) and the *Fragmentation Checker —
  Deterministic Spec*, both by SENSEI. Neither is in this repository.

## The gap

Consequences don't exist yet. Tell the writer the army charges and the army
charges and wins. Models agree by default, so a reader's choice meets no
resistance, and Fate Survival can't mean much while survival is never in doubt.

## The principle

**The writer narrates consequences; it never decides them.** As in tabletop
role-playing games, the player declares what they try, something else decides
how it goes, and only then is the scene described.

## Where CTE fits

CTE (the Consciousness Translation Engine) is already a consequence engine. It
takes a pressure event, runs it against a seed's state, and returns a
Transformation Result in one of three phases:

| Phase | Meaning in a story |
| --- | --- |
| Syntrophic | The pressure becomes growth |
| Threshold | Strained, holding |
| Dissipative | The pressure exceeds capacity; the character fractures |

Its memory cycle updates the state afterwards, and unregistered pressure
carries into later chapters.

How CGT maps onto a story:

- **Seeds are characters.** The node variables (Coherence, Fragmentation,
  Resistance, Will and the rest) are a character's inner condition.
- **Edges are relationships.** Recognition (how one character reads another)
  against Disposition (that character's real stance) gives betrayal and
  dramatic irony in numbers. This is the relations side of the Codex, rebuilt
  with real mechanics.
- **A reader's Fate choice is the pressure event.**

## The consequence pipeline

1. **The reader chooses.**
2. **A world judge decides what happened to the world:** a material outcome
   (forces lost, an item broken, an alliance ended), weighed against the record
   (Holdings, ranks, factions). Outcomes can be graded: clean success, success
   at a cost, partial, failure, disaster.
3. **CTE decides what it did to the people involved:** whether each affected
   character grows, holds or breaks, and how their relationships shift.
4. **The writer receives both as fixed facts** and makes them land.
5. **The record keeps them,** so later chapters inherit the consequence instead
   of undoing it.

The world judge is likely the same system as the unbuilt Fate Survival judge.
Like the Holdings fixer, it can settle what plain rules can and call a model only
for the rest.

## Fate Pressure sets how hard the world pushes

Fate Pressure (Mortal, Immortal, Heaven, chosen in the Story Seed's Origin)
becomes the size of the pressure load each event brings, and how strictly the
world judge rules:

- **Mortal:** lighter pressure. Characters mostly grow or hold; failures cost
  something but rarely break anyone.
- **Immortal:** real stakes. Success often comes at a cost; enough strain can
  fracture a character.
- **Heaven:** brutal. Large pressure loads; dissipative outcomes are common.

This is CGT's Law of Restriction as a story setting: the reader chooses how much
restriction the story's seeds grow under.

Fate Survival stays a separate axis: who directs, and whether the story can end
in failure. Fate Pressure answers how hard the world pushes back.

**Naming:** today Fate Pressure only tunes Rhythm, and the Workshop Docs say it
does not decide survival. When this lands, that definition must change in the
code, `NOVEL_EXPANDED.md` and the Workshop Docs together.

## Measurement comes from the record

The Fragmentation Checker's core rule matches how SEN already works: emit
structured events at generation time, so measurement never needs a model call.
Its events become new tags in the tiny SEN language, beside `gained`, `lost` and
`appears`:

| Event | Fields |
| --- | --- |
| `GOAL_SET` | character, goal, object, priority |
| `GOAL_RESOLVED` | character, goal, outcome |
| `VALUE_STATED` | character, value, polarity |
| `ACTION_TAKEN` | character, action, tags, targets |
| `COMMITMENT` | character, to whom, obligation |
| `STANCE_STATED` | character, toward whom, polarity |
| `STANCE_ACTED` | character, toward whom, polarity |

As the spec says, the checker measures `F_structural` (contradiction in the
record), not Fragmentation itself. Telling growth apart from betrayal is CTE's
job, not the checker's.

## SEN is CTE's lab

CGT names repeatable measurement as the step not yet earned. SEN can provide it:

- **The record is ground truth.** What happened in a chapter is in its tags;
  raters can't disagree about it.
- **Readers can run the validation study** the Fragmentation spec describes:
  ranking how divided characters seem, against the checker's ranking.
- **Being wrong is cheap.** A miscalibrated coefficient makes an arc feel off.

Every coefficient stays a placeholder until fitted against observations.

## Open questions

- How the world judge weighs the record, and how much randomness it allows.
- Whether readers see the odds, or only the outcome.
- Which characters CTE tracks: everyone, or only those the story focuses on.
- How the new event tags are taught to the writer, and which come first.
- Exact mapping from each Fate Pressure tier to pressure loads.
