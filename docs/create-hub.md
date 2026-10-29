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

**To hand this to a new chat:** "Read docs/create-hub.md. We are at phase B."

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
  "Your worlds" with Open and Studio per world (Studio opens the world's Story
  View today), and Create at the end, which starts a world from a Story Seed.
  Much of it still shows sample data.
- **The tagger is a stage of its own.** It runs once after a chapter is
  written and again on demand ("Tag this chapter again"), returns notes, and
  the HARNESS places them on the chapter's own paragraphs. It has its own
  model and reasoning choice in the Model Router. **It can only re-tag the
  newest chapter.**
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

- **Create is the hub.** The manuscript way in, the per-world Studio with its
  chapters and their tagging, and the Toolkit are one page family, not a
  developer surface.
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

## Phases, in order

| # | Phase | Agents build | SENSEI decides | SENSEI sees | Where it stands |
|---|---|---|---|---|---|
| A | This design | This document | Approve or cut | This doc | awaiting approval |
| B | Tag any chapter, tag the whole story | In the world's Studio (today Create's Studio button opens Story View, where "Tag this chapter again" already lives): every chapter with its tagging state (read or not, by which model, notes placed, notes dropped and why, tags set aside and why, and "the tagger found nothing here" said plainly), Tag this chapter and Tag all chapters, in order, with the same guards re-tagging has today (a chapter with a hand-placed Sound Cue or a Holdings fixer merge is skipped and named, never silently re-tagged) | Decisions 4 to 7 below | The Nine-Fold Furnace with chapters 1 to 3 tagged, and a chapter's record on the page | next |
| C | The manuscript way in. *A manuscript world is an authored world; expansion is a later action, and the tagger discovers before it confirms.* | A second way to start a world beside the Seed: the author's chapters in (see decisions 1 to 3), a world with no Seed and no Blueprint, open to its reader, readable in the Reader, with Story Settings for its language, its main character and its sound words | Decisions 1 to 3 below | A novel of SENSEI's choosing in the app, untagged, opening in the Reader | waits on B |
| D | The tagging loop, one kind at a time | For each kind: the teaching rewritten for that kind alone, re-tag, count against the sentences the prose offers (the agent lists them), fix, repeat. Order: soundscape and atmosphere (and the category vocabulary they choose from), Sound Cues (with the story's own words equipped), speakers for named characters, then holdings and appearances with the already-appeared list | Approve each kind's words; equip the packs for the test story | Each kind landing on a chapter SENSEI can hear and see: music that changes between chapters, cues on the bells, voices on the named cast | waits on B; C helps |
| E | The Codex open in Create | The author's view of every card, ahead of the reader | When; what the author may edit | The whole world in Create, the reached part in the Reader | later |
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

**Phase B** (a long run over a whole story is not one call; these were missed
in the first draft and named by review, 2026-10-29):

4. **A run that stops halfway.** Tag all chapters on a long novel is hundreds
   of calls. Recommendation: it runs in order, saves each chapter's record as
   it lands, can be cancelled, and resumes from the first chapter without a
   record from this run; it never re-tags a chapter already done in the same
   run, and a chapter that fails is named and skipped, not the end of the run.
5. **Clearing a bad run.** Re-tagging replaces a chapter's tags; nothing keeps
   the ones before. Recommendation: a Clear tags action per chapter and per
   story (the chapter keeps every word and its record says it was cleared), and
   no history of past taggings for now. Basic first.
6. **What the record says when nothing landed.** Today the record names every
   dropped note and its reason (the words are not in that paragraph, are in it
   twice, name a paragraph the chapter lacks, or could not be placed without
   changing the prose) and every placed tag the HARNESS set aside (no recording
   for that sound, more than eight words, a name that reads as a note). It
   cannot say "the tagger found nothing here", because silence is not a note.
   Recommendation: the chapter view says it in those words, per kind, so a
   quiet chapter and a failed one never look alike.
7. **What Tag all chapters costs.** The product rule is paid at the point of
   generation, in Energy. A tag call is small beside a chapter write (about a
   third of the input, far less output) but five hundred of them are not
   nothing. Recommendation: metered in Energy per chapter at a fraction of a
   write's cost, with the owner's access token lifting it in Development as it
   does for writes today; capped per world or free to a creator who imported
   the novel are the alternatives. Undecided until SENSEI says.

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
  tagger discovers before it confirms.
