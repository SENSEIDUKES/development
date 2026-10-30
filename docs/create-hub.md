# Create: the creator's hub, and the manuscript way in (living plan)

**Status:** the owner's working plan, written 2026-10-29 from SENSEI's direction
in the session that moved the Chapter Tagger to notes in the margin
([#482](https://github.com/SENSEIDUKES/development/pull/482)) and gave it its
own model choice ([#484](https://github.com/SENSEIDUKES/development/pull/484)).
Nothing below is built yet except what "Where this stands" says. Any agent
picking this up should read it top to bottom, then
[NOVEL_EXPANDED.md](../NOVEL_EXPANDED.md) (the product map and How we build),
[HARNESS_PRINCIPLES](../src/components/harness-generation/HARNESS_PRINCIPLES.md)
and the [vocabulary](../src/components/harness-generation/ARCHITECTURE_VOCABULARY.md).

## How to use this (read first)

SENSEI is not a coder. Agents write all code. SENSEI decides, approves every
word a model reads, and judges results by seeing and hearing them in the app,
never by reading code. Every phase below ends with something SENSEI can open,
and no phase starts on an undecided question.

**To hand this to a new chat:** "Read docs/create-hub.md. The author's world
view is designed and waiting on SENSEI's approval; once approved it is built,
and phase B closes on SENSEI's run in it."

## The problem, in SENSEI's words (2026-10-29)

> "I want to separate the tagger from the AI generation part for a bit. That's
> one of the reasons why this is getting convoluted, because we're trying to do
> two things at once. I want to focus on just putting on a story we already
> have and having it tag it properly."

> "I don't want to separate the AI generation from the tagger in some crazy
> convoluted way where I got to re-engineer it all back together later."

> "I simply don't have the user facing side of this. I don't have anywhere in
> here where you can just sit there, import the novel, and there's tagging
> language already there. If we just threw it in there right now, it would be
> all haphazard."

> "The entire other half of SEN is the Studios app. It is where you go to
> create your sound cue packs, soundscape, etc., and you have legal ownership
> of them, because it's not just pure AI generated. You curated it and ported
> it back into the HARNESS. This includes your translation skills, authoring
> skills, and everything else the HARNESS can do to curate the story towards
> you. When you import that novel, you can go make your goblin sounds and have
> it all automatically tagged to the best of our abilities. Then you use the
> Highlight Engine and go fine tune it."

> "This also includes the multimedia aspects, like manga, games, etc.,
> eventually."

## The loop Create is the hub of

1. **A novel comes in.** An author or a publisher brings their own chapters into
   Create. It becomes a world like any other, with no Story Seed and no World
   Blueprint. (Today the only way in is to write a world from a Seed.)
2. **They equip what they made.** In the Studios they make the material that is
   theirs: Sound Cue packs with their own sound words, Soundscapes and
   atmospheres, and the CAPA skills that shape the HARNESS toward them
   (author, style, translation). It comes back as SPP packages through the
   Creator Toolkit. The East Asian flavour is SEIHouse's own instance; the
   engine is the loop.
3. **The tagger reads their chapters against their vocabulary** and places what
   it can: notes in the margin, never a retyped page. One tagger, one path,
   the same for a generated chapter and an imported one.
4. **They finish by hand in the Highlight Engine:** move a cue, add one, fix a
   speaker. Everything writes the same manuscript attachments; no side channel.
5. **Later, the Codex is the hand-off to the other media.** Media tags fill the
   Reader; information tags fill the Codex; the Codex is what Manga Studio, MP
   Studio and a game read. The information tags are not a competing priority
   to the media tags: they are what the multimedia studios will consume.

## Where this stands (verified 2026-10-29)

- **Create is the Creator Space** (#480): Energy, the Creator Toolkit rail,
  "Your worlds" with Open and Studio per world, and Create at the end, which
  starts a world from a Story Seed. Much of it still shows sample data. Today a
  world's card and its Studio button both open its Story View. **The Studio
  button belongs to NovelExpanded Studios** (the Library Studios repo), not to
  anything in this plan.
- **The tagger is a stage of its own.** It runs once after a chapter is
  written and again on demand, returns notes, and the HARNESS places them on
  the chapter's own paragraphs. It has its own model and reasoning choice in
  the Model Router. Since #487 (2026-10-29) the engine reads **any committed
  chapter, one at a time**, and the record counts its notes. #487 also put a
  Chapters card and a chapter page on World Info. **That was the wrong place**
  (SENSEI, 2026-10-30): World Info is the regular novel page every reader
  opens, and nobody there wants tagging. They come off when the author's world
  view (below) is built, and the regular novel page goes back to what it was.
- **The intake exists.** Sound Words packages (a story's own words, at most 30),
  Sound Cue packs, Soundscape and atmosphere packs, and CAPA skill packages
  all install from SPP and reach the tagger and the writer. The Studios do not
  export SPP yet (SENSEI makes packages by hand for now; Studios export is
  coming and is not this plan's concern).
- **The record supports an author's world.** A world can be open to its reader
  (`openToTheReader`), which is how an imported novel's Codex shows every card
  from the start.
- **The measurement that started this.** On The Nine-Fold Furnace (gpt-6-luna,
  then Claude Haiku 5.5, 2026-10-29), the new tagger placed every note it wrote
  (34 notes, none dropped) but wrote too few: it tagged only speakers on the
  story's list, found one sound in six chapters because the story was tagged
  against the Library's 30 combat words, chose the identical soundscape for
  three chapters, and tagged two characters as newly appearing in chapter 5.
  Chapters 1 to 3 cannot be re-tagged at all. Every one of those is a reason
  for this plan.

## Decided

- **Create is the hub.** The manuscript way in, the author's world view (its
  own section below) with its chapters and their tagging, and the Toolkit are
  one page family, not a developer surface.
- **Tagging is an author's tool, seen only in the author's world view.** Never
  on World Info, the Reader or Story Settings. (SENSEI, 2026-10-30: "99% of all
  the users could give less of a fuck about this... nobody wants to see that
  on the regular.")
- **One tagging path.** Nothing is forked for imported novels. A generated
  chapter and an imported one go through the same stage and show the same
  record.
- **Speakers are for named characters, named by the prose.** A speaker tag
  goes on anyone the prose names, whether or not the story's list has them
  yet: the list is for spelling and aliases, never a gate, and an imported
  novel has no list at all. The clerk, the buyer and "someone shouted" are the
  narrator's voice. (SENSEI, 2026-10-29: "the random person on the street
  doesn't need a vocal tag. That's the narrator voice.") The platform already
  places a speaker tag with a new name and makes the Codex card from it; what
  failed on The Nine-Fold Furnace was the teaching ("anyone else goes by the
  name the story already has, listed below"), which the model read as "only
  these people". That is the defect phase D's speaker step fixes and tests:
  the tagger discovers a named speaker before anyone confirms the card
  (confirmation is phase E's). The warning that counts untagged spoken lines
  is rewritten to count only named speakers.
- **The Codex opens for the author in Create.** An author knows what happens in
  chapter 159; the reader does not. In Create the Codex shows every card so the
  author can curate it; in the Reader it unlocks as the story reaches each
  card. This is later engineering, not this plan's first phases.
- **Rebuild the tags one kind at a time**, each measured on a real chapter
  before the next, media tags first: soundscape and atmosphere, then Sound
  Cues, then speakers, then the information tags (holdings, appearances) with
  the "already on the page" list the tagger is missing today.

## The author's world view (designed with SENSEI, 2026-10-30)

Not built yet. It has no name of its own: it is what a world opens to in Create.

> "This page is going to be essentially the author's tool, where the real
> authors can go into these novels and tag multiple chapters at a time, or see
> exactly what novels they got... almost like the old iTunes setup, where it's
> extremely simple." (SENSEI, 2026-10-30)

```
┌──────────────────────────────────────────────────────────────┐
│            [ Novel ]  Sequential Art      ← medium switcher  │
├───────────────┬──────────────────────────────────────────────┤
│  WORLDS       │  Blueprint | Chapters | Codex | Assets       │
│ ┌───┐ Nine-   │──────────────────────────────────────────────│
│ │img│ Fold    │  ☐  1  The Furnace Wakes     2,140   Tagged  │
│ └───┘ Furnace │  ☑  2  Ash on the Steps      1,980   Not yet │
│ ┌───┐ Ashes   │  ☑  3  Ninth Meridian        2,305   Not yet │
│ │img│ of the… │                                              │
│ └───┘         │  [ Tag 2 chapters ]   · cost shown first     │
│               │  42 chapters · 30 tagged · 12 not yet        │
└───────────────┴──────────────────────────────────────────────┘
```

- **The way in:** tapping a world under Your worlds in Create opens this view,
  that world chosen. No second entrance. ("That should just be the default
  view when you click one of these your worlds inside of the create page.")
- **Who sees it:** the world's author, only here.
- **Medium switcher:** Novel, active; Sequential Art shown but inactive until it
  exists. The worlds stay the same; the medium decides what the tabs show.
- **Worlds:** every world the author has, as a mini world card with its cover
  (the app's own compact world card, not a new one). A column on the left on a
  laptop, as in iTunes; on a phone, a row of cards across the top, as Your
  worlds is today.
- **Tabs, for the chosen world:** Blueprint, Chapters, Codex, Assets. No Seed
  tab: the Blueprint already is that ("We don't really need a seed category.
  Blueprint is already that.").
  - **Blueprint:** the world's existing Blueprint. An imported novel shows it
    empty, with a short note that an imported novel has none.
  - **Chapters:** the iTunes list. One row per chapter: a checkbox, its number
    and title, then quiet columns for its words and its tagging (Tagged, Not
    yet, Not read). Click to check, shift-click for a run, a header box for all.
    **Tag** reads the checked chapters in order, one call each, with its cost
    shown before it runs and Stop while it runs; each row changes as its
    chapter lands. A footer line counts them ("42 chapters · 30 tagged · 12 not
    yet"). Opening a chapter shows it with its tags lit and the findings per
    kind (the view #487 built, moved here and nowhere else).
  - **Codex:** where the world's pictures and every card live, the author's
    Codex that shows every card ahead of the reader (phase E). Marked as coming
    until that is built.
  - **Assets:** every skill pack on the world, CAPA skills and media skills
    alike, so the author can keep track of what they have customized.
- **What comes off:** the Chapters card and the chapter page #487 put on
  World Info.

## Phases, in order

| # | Phase | Agents build | SENSEI decides | SENSEI sees | Where it stands |
|---|---|---|---|---|---|
| A | This design | This document | Approve or cut | This doc | approved 2026-10-29 (merged) |
| B | Tag any chapter, a few at a time | The author's world view (its section above): the Worlds column, the Novel medium, the four tabs, with Chapters working (check chapters, Tag them in order, cost shown first, each row updating, open a chapter to see its tags lit and the findings per kind) and Blueprint and Assets showing what already exists; Codex marked as coming. The World Info additions from #487 come off in the same change. The engine underneath (any chapter, the counted record) is already built. No whole-story run yet (SENSEI, 2026-10-29: "one chapter at a time, a couple chapters at a time, until we get this right") | Approve this design; decision 4 below | The Nine-Fold Furnace's chapters 1 to 3 tagged from the Chapters tab | designed 2026-10-30; waits on SENSEI's approval |
| C | The manuscript way in. *A manuscript world is an authored world; expansion is a later action, and the tagger discovers before it confirms.* | A second way to start a world beside the Seed: the author's chapters in (see decisions 1 to 3), a world with no Seed and no Blueprint, open to its reader, readable in the Reader, with Story Settings for its language, its main character and its sound words | Decisions 1 to 3 below | A novel of SENSEI's choosing in the app, untagged, opening in the Reader | waits on B |
| D | The tagging loop, one kind at a time | For each kind: the teaching rewritten for that kind alone, re-tag, count against the sentences the prose offers (the agent lists them), fix, repeat. Order: soundscape and atmosphere (and the category vocabulary they choose from), Sound Cues (with the story's own words equipped), speakers for named characters, then holdings and appearances with the already-appeared list | Approve each kind's words; equip the packs for the test story | Each kind landing on a chapter SENSEI can hear and see: music that changes between chapters, cues on the bells, voices on the named cast | waits on B; C helps |
| E | The Codex open in Create | The Codex tab of the author's world view: every card and every picture, ahead of the reader | When; what the author may edit | The whole world in Create, the reached part in the Reader | later |
| G | Tag the whole story | Tag all chapters of an imported manuscript in order as one run: what happens when it stops halfway (resume from the first chapter without a record from this run, cancel, never re-tag what is done) and clearing a bad run across chapters | Decisions 5 and 6 below | A long novel tagged end to end | later, after D works on single chapters |
| F | The Studios hand-off | Nothing here: SPP export from the Studios (their repo), then Manga Studio, MP Studio and games reading the Codex | Separate missions | A pack made in a Studio equipped in Create; later, a manga drawn from the Codex | later |

## Decisions for SENSEI, not to be guessed

**Phase C:**

1. **How a novel comes in.** Pasted text with chapter breaks the author marks,
   a file (plain text, Markdown, EPUB), or both. Recommendation: pasted text
   first, one chapter per paste or blank-line-separated chapters, with a file
   later. Basic first.
2. **What a manuscript world must know.** At least its title, its language and
   who the main character is (the speaker tag `MC` and the Reader's Protagonist
   voice need that). Recommendation: ask for those three and nothing else; the
   Codex grows from tags and from what the author adds in phase E.
3. **What Story View shows for a world with no Seed.** The Seed and Blueprint
   sections have nothing to show. Recommendation: hide them for a manuscript
   world rather than show them empty.

**Phase B:**

4. **What the record says when nothing landed.** Today the record names every
   dropped note and its reason (the words are not in that paragraph, are in it
   twice, name a paragraph the chapter lacks, or could not be placed without
   changing the prose) and every placed tag the HARNESS set aside (no recording
   for that sound, more than eight words, a name that reads as a note). It
   cannot say "the tagger found nothing here", because silence is not a note.
   Recommendation: the chapter view says it in those words, per kind, so a
   quiet chapter and a failed one never look alike. **Built as recommended
   (2026-10-29), open to SENSEI's cut:** the chapter view says it per kind,
   and a kind the story equipped nothing for (no Sound Words, no soundscapes)
   says it was never asked for instead. It moves into the author's world view
   with the rest.

**Later (phase G, the whole-story run), not now** (SENSEI, 2026-10-29: single
chapters first, until the tagging is right):

5. **A run that stops halfway.** Hundreds of calls, in order, each chapter's
   record saved as it lands, cancel, resume from the first chapter without a
   record from this run, never re-tag what is done, a failed chapter named and
   skipped.
6. **Clearing a bad run.** Re-tagging replaces a chapter's tags and nothing
   keeps the ones before; a Clear tags action per chapter and per story, no
   history of past taggings. Basic first.
7. **Energy for tagging: SENSEI sets it from the numbers; not decided yet.**
   The rule is simple (SENSEI, 2026-10-29): nothing with generation in it is
   free, and the user always sees what they spent and what it cost, even
   through the Library's own Energy conversion. Writing a chapter is one
   write that tags the chapter before it is saved, so its Energy covers both
   calls, and the money is made back by the time the chapter exists. Nothing
   tags again after a world is uploaded to the Immortal Hub: readers make no
   model call, ever. Tagging a chapter again while fine-tuning, and tagging an
   imported manuscript once, are creator actions in the subscriber tier and
   will cost Energy too, at a split SENSEI sets (a third of a chapter, or
   whatever the numbers say). What the plan gives him for that: every tagging
   call keeps its receipt with the exact tokens in and out (on The Nine-Fold
   Furnace, Haiku read a chapter for about 5,000 in and 1,500 out), so the
   conversion is set from real numbers. This plan is for Expanded Novels; a
   publisher licensing SEN gets the same engine at publisher prices, which is
   not a second design.

## Hard constraints

- Never change a word of the author's prose. The tagger writes notes; the
  HARNESS places them. That guarantee is structural and stays so.
- No new model call without SENSEI's approval. Tagging is the one call; it is
  already registered in the Model Router.
- Every word a model reads is shown to SENSEI before and after, and goes
  through the Writer Instructions page with its dated history.
- The chapter writer's prompt is not touched by any of this.
- Development only. Never production data or another repository. The Studios
  repo is its own missions.

## Verification bar

- `npm run verify` green; the Workshop preview in step with the app at 390px
  and desktop for every surface touched.
- Phase B is done when The Nine-Fold Furnace's chapters 1 to 3 carry a tagging
  record on the page, written by the tagger, against a real model.
- Phase D is done, per kind, when SENSEI hears or sees it in the Reader on a
  real chapter, not when a test passes.

## History

- **2026-10-29:** Written from SENSEI's direction after the first real run of
  the margin-note tagger. Phase A awaiting approval.
- **2026-10-29 (review):** Phase B gains its decisions (a run that stops,
  clearing, what the record says when nothing landed, cost); speakers are
  named by the prose, not gated by the list, and the Nine-Fold Furnace failure
  is named as the teaching defect phase D fixes; phase C opens with "a
  manuscript world is an authored world; expansion is a later action, and the
  tagger discovers before it confirms."
- **2026-10-29 (SENSEI's cut):** Phase B is one chapter at a time, or a few by
  hand. The whole-story run, with its resume, cancel and clearing questions, is
  its own later phase (G). Energy for tagging is SENSEI's to set from the
  receipts and is not decided: nothing with generation in it is free, the user
  always sees the cost, nothing tags after upload, and re-tagging and imports
  are creator actions in the subscriber tier. The plan speaks for Expanded
  Novels; a publisher gets the same engine at publisher prices.
- **2026-10-29 (phase A approved, phase B built):** SENSEI merged the plan.
  Phase B: any committed chapter can be tagged, one at a time
  (`retagChapter`, `retagChapterGap`), and World Info has a Chapters card
  (`StoryChapterList`): every chapter with its record (`describeChapterTagging`),
  per kind, and Tag this chapter. The record counts its notes (schema 41). The
  Workshop's HARNESS workspace shows the same record and action. Correction to
  the first draft: the app's Story View had no chapter list; "Tag this chapter
  again" lived only in the Workshop. Phase B is done when SENSEI has tagged The
  Nine-Fold Furnace's chapters 1 to 3 against a real model and the records
  read true; phase C (the manuscript way in) waits on decisions 1 to 3.
- **2026-10-29 (SENSEI's cut of the first phase B surface):** "This is not, I
  don't even know what I'm looking at." The record under World Info's cards
  read like a log. Rebuilt as a page: the Chapters card lists the chapters,
  and each opens its Studio page, the prose with its tags lit where they
  landed, the findings per kind as switches beside it, one action. SENSEI's
  bar for every surface from here: Apple-plain, you know what you're doing at
  once, with an artistic first impression, and customizable.
- **2026-10-30 (the author's world view, and #487's wrong place):** On
  examining #487, SENSEI: tagging was put on World Info, the regular novel page
  every reader opens, when the place for it had not been designed yet, and that
  design was the first step. The plan's own words "in the world's Studio" were
  wrong twice over: Create's Studio button is NovelExpanded Studios, and there
  was no such place. Designed with SENSEI: the author's world view, what a world
  opens to in Create, iTunes-plain (Worlds on the left as mini world cards, a
  Novel | Sequential Art switcher, Blueprint | Chapters | Codex | Assets),
  authors only. Phase B is rewritten to build it; #487's World Info additions
  come off in the same change. The engine work from #487 stands.
