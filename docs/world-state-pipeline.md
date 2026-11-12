# The world state pipeline: the missing half

The owner's direction (SENSEI, 2026-11-08), written for a fresh agent. **The
architecture half of phase 1 is built (2026-11-11); the rest is a plan.** See
[Where phase 1 stands](#where-phase-1-stands-2026-11-11). Each phase has
questions that SENSEI answers before it starts. Nothing here is decided beyond
what the plan marks as agreed.

## Read first

SENSEI is not a coder. Agents write the code; SENSEI decides, approves the
words a model reads, and judges results by seeing them in the Workshop and the
app. Every phase ends with something SENSEI can look at.

This continues [The world at Chapter 0](./world-at-chapter-0.md). Read that doc
first, especially its principle ("RimWorld generates the whole world before
play") and its standing rules. Those rules apply here unchanged: no new model
call without SENSEI's approval, a model's exact words shown and approved before
they change, every word a model reads recorded in the Writer Instructions
history, no compatibility layers, SENSEI merges.

**To hand this to a new chat:** "Read docs/world-state-pipeline.md, then
docs/world-at-chapter-0.md. Phase 1's architecture is built. We are at its
second half, the words the models read; show SENSEI each change first."

## Why this doc exists (SENSEI's context, 2026-11-08)

- **The World at Chapter 0 plan came first.** SENSEI knew what the
  architecture needed long before the tagger work. He worked on the tagger
  first because he could not yet understand his own tagger architecture. Now
  he does.
- **The tagger works as built.** When this pipeline lands, the tagger's
  wording needs to be refined to match its new job: uncovering cards, never
  inventing them. It does **not** need redesigning.
- **The tagger will be split further.** Each tag kind becomes its own HARNESS
  slot, in the CAPA style, so that each one can be tuned on its own. The
  Highlight Engine's creative side can then re-run a single kind (only places,
  say) instead of the whole tagger. Today one `tag-chapter` call carries every
  information and media instruction (`src/server/harness-generation/tagger.ts`),
  and only the media group can be read again on its own (`focus: 'media'`).
- **The remaining information tags** are built around today's architecture
  before this pipeline starts, so they too will only need their wording
  refined later.
- **The names are SENSEI's own** ("I'm just naming shit like chapter zero
  because I don't know what the actual correct term for shit is"). Clear names
  matter for the agents who build this and for anyone who licenses SEN. See
  [Names](#names-what-these-things-are-called-elsewhere) below.

## The problem, as the test story showed it

From *The Frost-Scaled Companion* (exported 2026-11-08, three chapters, tagged
by Claude Haiku and MiniMax). The tagger is doing world-building that should
already be done:

- **Little Frost had no card.** The whole story is about the companion, but the
  world held only the species (Frost-Scaled Fox). The tagger had to invent the
  name, decide it was a character, and pick a sentence to serve as its look.
- **Lin's look became an action line.** Lin had a Chapter 0 card with a proper
  look ("A lean young man in patched brown hunting clothes…"). Chapter 1's
  tagger never marked him appearing. Chapter 2's tagger marked him (and Little
  Frost, again) as appearing, so *"Lin Qingshan tightened his hunting coat
  around the wounded cub in his arms…"* became his look in Story Information.
  The tagger is never told who has already appeared
  (`tagSubjectsOfStory`, `shared/tagger.ts`).
- **Places stopped moving.** The Hidden Frost Cavern had a card and was
  tagged. The mountainside, the northern pass and the ridge existed nowhere,
  so the tagger had no name to give them, and Lin's place stayed in the cavern
  for two chapters.
- **Background figures became Codex characters.** A nameless "Hunter" and
  "Frost Sect Attendant" became Codex entries, because nothing had decided
  whether Ning Hao's men are people or background.
- **A lasting wound was lost.** Status keeps one line per character, and the
  newest one wins. Little Frost's wounded leg from Chapter 1 was replaced by
  "stronger on the third tail sweep" in Chapter 3.

Most of what looked like tagger mistakes is the tagger being asked to make the
world instead of pointing at it.

## The idea (agreed with SENSEI, 2026-11-08)

1. **The Blueprint makes the whole world, across every arc**: the main cast,
   the endgame enemies, allied factions, places, things and abilities. This is
   mostly built.
2. **Every main card is a real Codex entry from the moment it is made.** It is
   who they are at that point, period.
3. **Everything after that is a tag that changes the card**: an arm cut off, a
   new rank, a new sword. The card plus its changes, in story order, is the
   character now.
4. **Taggers uncover, they never invent a main card.** The tag says "this card
   is on the page now, here," and records real changes.
5. **Cards carry their ties and their timing**: "the main character's love
   interest", "does not appear until Arc 4". Ties are built (the `ties` and
   `connectionToMC` slots in `WORLD_CARD_KINDS`, `src/narrative/worldRecord.ts`).
   Timing has never existed. Every PR in both repositories and every branch
   was searched on 2026-11-08, and no card has ever had an arc field. The only
   number on a card is `enteredInChapter`, which records when the card was
   created, not when it is due.
6. **There is one way to make a main card**, and every source uses it:
   - the Blueprint;
   - each new arc;
   - **Alter Fate, mid-story.** At Chapter 36 the reader writes "Have Ren the
     Mysterious Strangler come through and wipe out the Azura Dragon Sect" and
     taps **Add character**. Either the reader fills in Ren's card as they
     would in the Blueprint, or the system fills it in. Either way Ren is now a
     real main card, as of Chapter 36. The reader can also say how long Ren
     stays, for example one arc only. The prompt goes to the writer as
     direction; the card goes into the Codex as who Ren is.
7. **Minor figures are allowed.** The writer may still bring in guards,
   hunters and shopkeepers. They get a light side-character profile, not a
   main card, and the reader can promote one they like to a real card.
8. **Arc end is a code check, with no AI.** It decides what carries on into
   the next arc and what goes into deep memory (kept, but put away: the
   academy once the story has left it). Then the next arc's new cards are made,
   like a small Blueprint (the dragon frost fields, the temple).

## What exists today (checked in the code, 2026-11-08)

- **The world before Chapter 1.** The Blueprint fills cards of every
  `WORLD_CARD_KINDS` kind (character, thing, ability, faction, place, species,
  World rules), carried on the story as `worldAtChapterZero`. A reader meets
  each card when the story reaches it, unless the world is open to its reader
  (`openToTheReader`, an imported novel). The writer reads the whole world as
  THE WORLD AT CHAPTER 0.
- **Codex entries.** Only the main character and the Foundation's declared
  characters get an entry before Chapter 1 (`origin: { source: 'foundation' }`,
  `shared/holdings.ts`). Every other entry is made the first time a tag names
  it (`createCodexEntryResolver`). A world card and an entry meet by name.
- **What is on the page** is worked out from every chapter's tags in order and
  is never stored (`deriveAppearances`, `shared/appearances.ts`). Status and
  Place keep one current line each, and the latest tag wins
  (`shared/statuses.ts`, `shared/places.ts`).
- **Arcs.** Arc 1's goals and one-line directions for Arcs 2 and 3 are on the
  ARC page (#563). The arc planner runs when each arc begins, and the Reader
  shows the arc's page then.
- **Alter Fate** today is "what happens next": the reader's direction for the
  next chapter, kept word for word on the chapter (`HarnessChapter.path`).
  The older add-character and add-faction forms
  (`reader-codex/shared/codex/ReaderCodexFate.tsx`) only drop a loose note into
  the story's memory. They are the idea of this, not the real version.
- **Long-story memory** is already decided in `NOVEL_EXPANDED.md` ("the writer
  sees what the next chapter touches"), including a snapshot of the record at
  each arc's end. Deep memory should build on that and not start over.

## Two earlier decisions this would reverse

Both are in [The world at Chapter 0](./world-at-chapter-0.md). The doc that
replaces them should say so plainly:

- **Decision 4, "Later arrivals stay Fate's":** characters and anything else
  arriving after Chapter 0 are created by the chapter writer as they appear.
  Under this plan, a main card is made through the one way in (the Blueprint,
  an arc, or Alter Fate), never discovered by a tag.
- **"Deliberately not in it: making Chapter 0 cards into Codex entries up
  front"** (in *What phase C built*). Under this plan, every main card is an
  entry from the start.

## Phases

### Phase 1: every main card is an entry from the start

- Every Blueprint card becomes its Codex entry when the story is created,
  hidden from the reader until the story reaches it, as cards already are.
- Cards get their timing: the arc in which they are due to enter.
- The tagger is told which cards are already on the page and which have not
  been met yet. Its words change from naming whoever appears to linking each
  appearance to a card. This is a wording refinement, not a redesign, with
  every word shown to SENSEI first.
- Minor figures get their light profile, with Promote to card.

**SENSEI decides first:** how minor figures are kept and promoted; whether
conditions stack (see the questions below); what happens when the writer
brings in someone who matters and was never planned.

**Decided (SENSEI, 2026-11-11),** after the ten-chapter run of *The
Frost-Scaled Companion*:

- **Minor figures get a light profile.** A background person or item the
  writer invents ("neighbor", "man with the net", "small bundle") gets a small
  entry in its own Minor section of the Codex: what the prose calls it, the
  sentence that introduced it, and the chapters it was in. No look, status,
  place or ties are tracked. Promote turns one into a real card.
- **Conditions stack.** Each lasting condition stays on the card until a tag
  ends it. The status tag either adds a condition or ends one. A passing
  moment ("buried in snow to the knees") is not a status.
- **The reader promotes.** Someone unplanned who matters starts as a minor
  figure and becomes a real card, as of that chapter, only when the reader
  taps Promote, through the same way in as the Blueprint and Alter Fate.

- **The reader fills a promoted card; the rest stays blank.** Promote makes
  the card with its name and the sentence that introduced it. The reader fills
  whichever slots they want. No model call fills the others. (This answers
  open question 3 for Promote only; Alter Fate's Add character is Phase 2's.)

- **Architecture first, the taggers second** (SENSEI, 2026-11-11: "Keep the
  taggers as phase two. I would like to just focus on getting this part of the
  architecture first"). Phase 1 is built in two halves: what needs no change
  to any model's words, then the words.

#### Where phase 1 stands (2026-11-11)

**Built, with no change to any words a model reads:**

- **Every card is a Codex entry from the start.** When a story is created,
  each card of a kind a tag can name (character, thing, ability, place) gets
  its Codex entry, with `origin: { source: 'world' }` and `cardKey`, the card
  it is (`codexEntriesWithWorldCards`, `shared/holdings.ts`). A tag finds that
  entry; it never makes one for a card. Revising the opening world keeps the
  entries in step, and a chapter that is rewritten or tagged again never takes
  a card's entry away. Schema 48 gives every saved story's cards their
  entries; an entry a chapter had already made by a card's name becomes that
  card's entry and keeps its ID.
- **A card's look is its card's** (`worldCardLook`, `deriveAppearances`). The
  sentence an appears tag sits on is where the story met them, never what they
  look like. The writer reads the card's Look in Appeared, the Codex shows it
  as "From its card", and Manifest pictures it with no call to the look
  writer. Once a look tag changes it, the look is written again from the
  card's look and every change. Someone with no card, or a card with no Look,
  keeps the story's own words, as before.
- **Minor figures.** In a story with a world record, an entry a tag made that
  has no card is a minor figure (`isMinorEntry`). The Codex lists them under
  **Minor**, with what the prose calls them, the sentence that introduced
  them and the chapters they were in, and no card. A story with no world
  record has no main cards to tell them from, so it reads as before.
- **Promote** (`promoteMinorFigure`, `shared/promotion.ts`). The reader
  promotes a minor figure to a real card, as of the latest chapter. The card
  starts with its name only, and the reader fills its slots in the Codex
  (`fillPromotedCard`); no model is called. Its entry keeps its ID. Someone
  only speaker tags name can be promoted too: their entry is made with the
  card. A promoted card leaves out Holds, Knows and Rank (and a thing's Held
  by and Count), because the story's tags already record those and a second
  statement would be counted on top.

**Also built (2026-11-11), with words SENSEI approved:** the character card
states its whole look. It gained Build, Face, Hair, Clothing, Marks and
Bearing, its Look is a short portrait, and the World and Origin skills say how
to write one (see the Harness Generation README's history).

**Not built: each needs words a model reads, so SENSEI approves them first.**

- **The tagger is told which cards are on the page.** It still reads the same
  list of names. Its wording has not changed from naming whoever appears to
  linking each appearance to a card, so it still tags statuses, places and
  ties for minor figures. The Codex does not show those for a minor figure.
- **Cards carry their timing** (the arc a card is due in). The Blueprint has
  to fill it, which changes the Blueprint's words.

**Two gaps the plan did not name, found in the ten-chapter run:**

- **A card that states the future.** Lin's Chapter 0 card said "Bonded to the
  Frost-Scaled Fox", which happens in Chapter 6. The Blueprint wrote an arc's
  outcome as an opening fact.
- **Background places.** A place with no card that a tag names ("Cloudpeak
  Mountains") is a minor figure too. Phase 3's arc cards are where new places
  are meant to come from.

**Blueprint words SENSEI approved on 2026-11-11, now built** (SEN World
Builder 1.4.0 and the Blueprint's own rules), from the same cards:

- **Before Chapter 1 only.** Cards stated what the story later makes happen
  (the gap above).
- **Who gets a card.** Whoever the premise or an Arc 1 goal is about, even
  with no name yet (the cub).
- **Look and holds agree.** Lin's look had a bow and Elder Bai's a staff,
  while neither card held one, so the tagger made them minor items.
- **Places.** All three places sat inside "Cloudpeak Mountains", which had no
  card; none covered where Arc 1 happens; one was held by "Unclaimed", which
  is no faction.

The first, second and fourth are in the World skill; the third and "a slot
that names a card is left blank when no card fits" are in the Blueprint's own
rules, which no skill replaces. Code backs the last: a place's Inside or Held
by that the Blueprint filled with a name no card has is cleared
(`fillBlankSeedSlots`), and what the creator wrote is never touched. Not yet
tried with a real model.

**SENSEI sees:** a new test story's Codex, full before Chapter 1, with cards
revealed as the chapters reach them, and no main card made by a tag.

### Phase 2: Alter Fate adds real cards

- Alter Fate's Add character (and faction, place, thing, ability) makes a real
  card through the same way in as the Blueprint, as of the current chapter.
- The reader fills the card in or lets the system fill it, and sets how long
  it stays.
- The reader's prompt goes to the writer as direction, exactly as Alter Fate
  works today.

**SENSEI decides first:** who fills a card when the reader does not (the
Blueprint's card-filling, code, or a new model call, which needs his approval
with its exact words); what "how long it stays" can be set to.

**SENSEI sees:** at Chapter 36, add Ren, write the next chapter, and find Ren
in the Codex as a full card that changes only through tags.

### Phase 3: arc boundaries

- **Arc start:** the cards due in this arc come into play, and the arc's new
  cards are made like a small Blueprint.
- **Arc end:** a code check sorts what carries on and what goes into deep
  memory, using the arc-end snapshot already planned in `NOVEL_EXPANDED.md`.
- Deep memory can come back when the story returns to it.

**SENSEI decides first:** the carry-on rules; how something returns from deep
memory; what happens when an Alter Fate card's time runs out.

**SENSEI sees:** an arc change in a test story, the Codex showing what carried
on and what was put away, and the new arc's cards.

## Open questions for SENSEI

1. **How much does an arc plan decide?** Only who and what are in it, or also
   roughly what they do? Harness principle 8 ("the user decides what matters,
   the AI decides how it plays out") suggests only who and what.
2. **Someone unplanned who matters.** If the writer brings in someone the
   reader comes to care about, does that card go through the one way in when
   it is promoted, as of that chapter?
3. **Who fills a card when the reader does not**, mid-story: the Blueprint's
   own card-filling, code from tables (the RimWorld way), or a new model call?
4. **Carry-on and deep memory.** Some candidate code rules: the main character
   and companions always carry on; anyone tied to the next arc's goals carries
   on; anyone not seen for a whole arc goes to deep memory. Can the reader
   override?
5. **Does a condition stack or replace?** In RimWorld a lost arm is its own
   entry on the colonist, and a second injury sits beside it. Under that
   model, Little Frost's wound and its exhaustion would both stand until each
   one changed. Today the newest status replaces the old one.
6. **"How long it stays"** for an Alter Fate card: what it can be set to, and
   what happens when it runs out.
7. **The side-character profile.** The Story Seed has a side cast; nothing
   exists yet for figures the writer invents. Is that profile still to be
   built?

## Names: what these things are called elsewhere

SEN's names were made up along the way. Most of these ideas have established
names in game design, simulation software and language technology. This table
maps them, so agents can look up how others solved them and licensees can
recognize what they are buying. **Renaming anything is SENSEI's decision.**
The table only maps the names; it renames nothing.

| SEN's name | What it is | Established name (field) |
| --- | --- | --- |
| World at Chapter 0 | The whole world, made before the story starts | **World generation** ("worldgen", games); the **initial world state** (simulation) |
| Codex card / Codex entry | One character, place, thing or faction the story knows | **Entity** (software, games); RimWorld calls a character a *pawn* |
| Card kind, its slots | The kind of entity and the fields it has | **Entity type** or **archetype**, its **attributes** or **components** (game architecture) |
| A card being made | An entity coming into the world | **Spawning** or **instantiation** (games) |
| The card plus its changes, in order | Working out the present from a starting point and every change since | **Event sourcing**: the baseline, then the event log (software). The HARNESS already works this way: nothing it derives is stored |
| Arc-end snapshot | A saved copy of the state, so the log need not be replayed from the start | **Snapshot** (event sourcing; the word SEN already uses) |
| A tag | A mark on the words where something happens | **Annotation** (language technology) |
| The tagger inventing a name | Finding names in prose and making new entries for them | **Named entity recognition** (NER, language technology) |
| The tagger uncovering a card | Linking a mention in the prose to an entity already known | **Entity linking** (language technology). This plan moves the tagger from NER to entity linking |
| "The cub" means Little Frost | Knowing two phrases mean the same entity | **Coreference resolution** (language technology) |
| Hidden cards the reader meets as the story reaches them | Known to the system, not yet shown to the player | **Fog of war**; **discovery** or **progressive reveal** (games) |
| The cards due in an arc | Who and what an arc brings in | **Roster**; a **spawn schedule** for when each enters (games) |
| Arc-end sort | Deciding what stays active and what is put away | RimWorld's **world pawns** and the *world pawn garbage collector*, which decides which off-map pawns to keep; **active set** and **archive** (games, simulation) |
| Deep memory | Kept, but out of the active story | **Cold storage** or the **archive**; what stays in play is the **working set** (software) |
| Status that stacks | Several lasting conditions on one character at once | **Status effects** or **conditions**; RimWorld's *hediffs* (health differences) |
| Holdings | What a character carries and knows | **Inventory**; abilities known are **skills** (games) |
| Ties | Who is bound to whom, and how | **Relationships**; the **social graph** (games, software) |
| Fate (the system steering the story) | The part that decides what the story does next, within the user's direction | **Storyteller** (RimWorld: Cassandra, Phoebe, Randy); **AI Director** (Left 4 Dead); **drama manager** (interactive-narrative research, e.g. *Façade*) |
| Fate Pressure | How hard the storyteller pushes | **Storyteller difficulty** or **intensity** (RimWorld, AI Director) |
| Alter Fate's Add character | The user putting something new into the running world | **Director intervention**; in RimWorld, the dev-mode *spawn* tools |
| Arc goals / Destined Ending | Where the story is headed, step by step and at the end | **Objectives** or **quests** / the **endgame** (games) |
| Hard Pins | Rules and goals that hold until they end | **Constraints** (planning); goal pins are **open objectives** |
| Minor figures | People the story uses without tracking them | **Background characters** or **extras**; in games, unnamed **NPCs**. Promoting one makes a **named NPC** |
| Foundation | The story's fixed facts and direction | **Story bible** or **canon** (publishing, television) |

## History

- **2026-11-11 (built):** the page begins and ends conditions. The status tag
  marks where the prose gives someone a lasting condition and, with `ended`,
  where it ends one, a card's condition included, so a cure stops its course.
  Conditions stand side by side; a passing moment is not one. SENSEI approved
  the tagger's words first.
- **2026-11-11 (built):** conditions. A character's card states each lasting
  condition with its stages, its pace in chapters and what ends it; code moves
  it as chapters pass, the writer is told where each stands before every
  chapter, and the Codex lists what each character carries. SENSEI approved
  the words first.
- **2026-11-11 (built):** the Blueprint builds Arc 1's whole world as it
  stands before Chapter 1: cards state nothing the story has yet to do,
  whoever the premise is about has a card, a look shows only what is held,
  and places point at real cards. SENSEI approved the words first.
- **2026-11-11 (built):** phase 1's architecture half: every card is a Codex
  entry from the start, a card's look is its card's, minor figures, and
  Promote with the reader filling the card. SENSEI asked for the architecture
  before the taggers. No words a model reads changed. See
  [Where phase 1 stands](#where-phase-1-stands-2026-11-11).
- **2026-11-11:** SENSEI answered Phase 1's three questions (minor figures get
  a light profile, conditions stack, the reader promotes); they are recorded
  under Phase 1. This settles open questions 2, 5 and 7. He also decided that
  the reader fills a promoted card and the rest stays blank, with no model
  call. Nothing is built yet.
- **2026-11-08:** Written from SENSEI's direction after *The Frost-Scaled
  Companion* test: the missing half of the World at Chapter 0 architecture.
  The tagger keeps its design and gets refined wording later. The remaining
  information tags are built first, by the current agent.
