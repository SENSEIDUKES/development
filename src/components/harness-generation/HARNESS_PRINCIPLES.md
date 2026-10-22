# The HARNESS: what it is for

- **Created:** 2026-10-11
- **Owner:** SENSEI, SEIHouse Productions
- **Status:** the owner's design principles for the HARNESS and the Codex it feeds.

This file says **why** the HARNESS is shaped the way it is. The parts it names
(CAPA, the Story Information Packet, the Generated Chapter, tags, Codex entries,
holdings) are defined once, in
[ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md); read that file for
what each part is. What is built today is listed only in
[NOVEL_EXPANDED.md › Where we are](../../../NOVEL_EXPANDED.md#where-we-are-2026-10-10),
and what gets built next in
[NOVEL_EXPANDED.md › What comes next](../../../NOVEL_EXPANDED.md#what-comes-next).

## What the HARNESS is

The HARNESS is not a story generator. It is the engine inside SEN that turns
an imperfect, replaceable language model into long-form narrative that stays
reliable for hundreds of chapters, and it keeps what the story means in a form
every other medium can use.

It feels simple because one principle governs it:

> **The model proposes; the engine decides and remembers.**
>
> Keep the model's responsibility small. Let it communicate meaning through
> simple signals (the tags of the tiny SEN language), and let the engine own
> the durable structure: IDs, state, numbering, placement, checks, history and
> storage.

Every rule in the vocabulary follows from it. The model writes prose and marks
where things happen; the engine reads the marks, resolves names to permanent
entries, works out state, places attachments, and drops or flags what cannot be
true instead of refusing the chapter. Because the engine carries the structure,
the model can be cheap, can be swapped, and can even be absent: the Reader
Chamber workspace runs the whole HARNESS from saved replies with no model call.

## The problems it solves

These are separate engineering problems. The principle above is how one engine
answers all of them. Each has a plain status: **proven** (built and shown with
real chapters), **built** (built, not yet proven at scale), **started** (the
first pieces exist) or **goal** (designed for, not built).

| # | Problem | The question | Status (2026-10-11) |
|---|---|---|---|
| 1 | Long-form continuity | Can a story stay coherent across hundreds or 1,000+ chapters without putting the whole past into every request? | **Started.** The writer never sees earlier chapters, only the Story Information Packet: recaps, the arc's plan and the current record. The Packet still grows about 180 tokens a chapter, and there is no recall of older passages yet. 1,000+ chapters is the goal, not proven. |
| 2 | Economic efficiency | Can that run on Flash-tier, sub-penny models instead of frontier reasoning every chapter? | **Proven at small scale.** About 9,000 tokens in and 3,500 out per chapter on Flash-tier models. |
| 3 | Creator customizability | Can a creator swap style, pacing, accessibility, translation, media rules and sound vocabularies without rebuilding the engine? | **Built.** CAPA skill slots, managed slots and Story Settings. |
| 4 | Deterministic stability | Do items, abilities, speakers, sounds and state transitions stay reliable when the model is imperfect? | **Built.** The tag reader and its plain rules, the Holdings fixer, looks written on demand, the failed-write guard. Real-model accuracy of the strict tag shape is still being measured. |
| 5 | Provider independence | Can the model be replaced because the system around it carries the intelligence? | **Built.** The Model Router, two providers, and the replay writer, which runs the HARNESS with no model at all. |
| 6 | Translation across media | Can the same chapter carry the meaning that drives sound, narration, the Codex, sequential art, animation and games? | **Started.** Sound Cues, the soundtrack and speakers already drive the Reader and Listen. The rest needs the world record below. |
| 7 | Human/AI interoperability | Can the same records come from the writer model, an imported manuscript, the Highlight Engine, a local model or the author's own hand? | **Started.** The rule exists (everything writes the same manuscript attachments) and manual placement works for Sound Cues. Manuscript import and local models are not built. |
| 8 | Editable history | Can the story be rewritten or redirected without corrupting what comes after? | **Built, narrow.** Rewrite works for the newest chapter. State is always worked out again from each chapter's current tags, so nothing counts twice, and later chapters are checked again after an edit. Editing mid-story is not built. |
| 9 | Inspectability | Can anyone see why the engine did what it did? | **Built.** Every attempt keeps its frozen inputs, raw reply and receipt; every chapter keeps its warnings and the fixer's record; Export story carries it all. This is what made the owner's tests and the replay workspace possible, and it is what a licensee will ask for. |

## Rules that follow from the principle

1. **The model never owns state.** No IDs, counts, chapter numbers, placement
   or storage from the model. It names things; the engine resolves them.
2. **Signals, not structures.** The model's whole job beyond prose is a small
   set of tags in one strict shape. A new need is a new tag kind, added one at
   a time, each with its five parts (tag, teaching, reading, rules, home).
3. **Never refuse a chapter for a bad signal.** A wrong tag is dropped and
   flagged; only a reply far below the chapter scale is a failed write.
4. **Nothing is stored that could count twice.** State is derived from each
   chapter's current tags, in story order, every time.
5. **Every fact points at its passage.** Records are manuscript attachments on
   the sentence they came from, so an edit carries them, and a reader, author
   or tool can always find where a fact was established.
6. **Small separate steps over a bigger writer.** When something needs judgment
   (the Holdings fixer after a chapter is saved, and the look writer when
   something needs a full look), it is a small, separate, registered call that
   runs only when needed, never more work for the chapter writer.
7. **Keep receipts.** Every model call keeps what it was given and what it
   returned.

## Translation across media: the world record

SEIHouse is a translator of artistic expression. For SEN, that means the
Codex holds what the story **means**, apart from any one way of showing it, so
the same story can become a sequential-art chapter, an animation or a game
and still be interpreted correctly. The HARNESS feeds that record through
information tags; the Codex keeps it and shows it.

### The minimal set

To show a story in another medium you need the facts the prose describes, not
the prose:

| Fact | What it answers | Today |
|---|---|---|
| **Entities** | Who and what exists: characters, things, abilities, places, factions, each with one permanent ID | Characters, things and abilities **have** (Codex entries). Places and factions missing |
| **Appearance** | What each entity looks like, and when that changes (a scar, new robes, a breakthrough) | Characters and things **have** (appears and look tags keep the writer's own description; a full look is written on demand). Places wait for the Place tag |
| **State over time** | What everything is like at any chapter: holdings and rank; status (alive, wounded, transformed); where each character is | Holdings and rank **have**. Status and location missing |
| **Ties** | Who is allied, hostile, related or bound to whom | **Missing** |
| **Scenes** | Where a scene starts, where it is, when (time of day, conditions), and who is present | **Missing**. Each chapter has one musical scene today, not story scenes |
| **Moments** | The beats inside a scene that matter most, with their intensity | **Roughly have**: Sound Cues carry Energy |
| **Voice** | Who says each line, and how they sound | **Have** (speaker tags name a Codex character; their voice from the SEIHouse cast lives on their card) |
| **Mood** | How it feels | **Have** (the chapter's soundtrack and atmosphere) |
| **World rules** | The power system, ranks, factions and laws | **Partly**, in the World Blueprint and the story's foundation |

### What stays out of it

The record is **medium-neutral**. It says "Gu Chen, scarred left cheek, grey
robes, at the North Ridge Gate, at dusk, wounded". It never says "panel 3,
close-up", a camera angle, a frame count, a level layout or an art style.
Those are interpretations and belong to the studio or exporter that does the
translating (Manga Studio, an animation tool, a game exporter), never to the
story.

### How it is built

The same way as Holdings: the writer tags only the moment something changes
("enters", "arrives at", "is wounded", "now wears"); the engine resolves names
to entries and works out current state; every fact points at its passage. Full
descriptions (a character's whole look) are written by a small separate call
only when something needs them (on demand, since 2026-10-17), from the
passages the tags mark, so the chapter writer's job stays small, cheap models
keep working, and no call is spent on a look nothing uses.

### Two tests for "enough"

- **The artist test:** can someone draw any scene from the record alone,
  without reading the chapter?
- **The save-game test:** can a game load the world exactly as it stands at
  Chapter N: who is where, holding what, in what condition, allied with whom?

When both pass, the record is enough. Anything more is the studio's job.

### Recall at length

The record answers "what is true now". Long stories also need "what happened
before that matters here". The Codex says which entities matter to the next
chapter; a recall step can then pick the earlier passages about them. That
keeps the Packet small at any length (problem 1) and is where an embedding
model, such as an on-device one, fits. It finds passages; it never replaces
the record, which must stay exact.

## History

- **2026-10-17:** Looks on demand: no call after a chapter. The writer's own
  description is kept by code; a full look, the core record a picture, manga
  or game draws from, is written for one entry when something needs it and
  kept on its Codex entry until a new tag changes it.
- **2026-10-14:** Appearance has its first pieces: the appears and look tags,
  and the look step that writes each look down after a chapter is saved,
  medium-neutral, from the passage that shows it.
- **2026-10-11:** Created from the owner's framing of the HARNESS as a
  constraint-management engine for long-form narrative: the nine problems, the
  one principle, the rules that follow, and the world record that lets the
  Codex translate a story into other media.
