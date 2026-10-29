# Harness Generation

Where `reference/` exists, it holds the old production version, kept as reference
material for the remake; it is not edited or refreshed. New features do not get a
reference folder. Old systems stay until each is remade on the new path; never
reconnect them as they are or re-sync with the old production app. The destination
is SEN, Library and NovelExpanded built here, guided by `NOVEL_EXPANDED.md`.

> **Before changing Harness Generation behavior:** read
> [ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md) first. It is
> the single authoritative source for HARNESS, CAPA, CAPA Schema, CAPA
> Skill, CAPA Prompt, Story Information, Story Information Packet,
> Immediate Chapter Request, Generation Model Call, and Generated Chapter.
> Use those terms and definitions; do not redefine or reinterpret them in
> this file or elsewhere.

## Purpose

Harness Generation is an independent, checkpoint-first novel core. It gives an
author a frozen Foundation copied from a saved Story Seed, asks a provider for one complete
chapter, preserves raw output before interpreting it, accepts usable prose
as paragraphs with their Sound Cues, and carries saved recaps, story
direction, and the current canonical state into the next chapter while the
complete prose, evidence, and memory history stay in storage.

It is not a replacement, wrapper, import path, or compatibility layer for the
existing Chapter Generation feature.

## Workshop record

| Field | Value |
| --- | --- |
| First Workshop record | 2026-08-29 |
| Last recorded Workshop update | 2026-10-22 |
| Historical source inspection | 2026-09-12 — verified the creative author direction in `Light-Novels/src/server/prompts.ts` on `main` before extracting the Author skill |
| Lifecycle status | Reader-directed continuation (Fate page) in a Reader on the Highlight Engine that reads aloud in three voices over the SEIHouse audio player's soundtrack, each chapter with the music and atmosphere the tagger chose for it, with holdings tagged by the tagger, checked by plain rules and quietly fixed after each chapter by the Holdings fixer, the newest chapter rewritable with a note, a chapter's writing kept going when the reader leaves, the story's point of view kept from its opening, and failed writes never saved |

### History

- **2026-10-29 (any chapter tagged, one at a time, and the record on the
  page):** Phase B of `docs/create-hub.md`, approved by SENSEI's merge of the
  plan. `retagChapter(storyId, chapterId)` replaces `retagLatestChapter`: any
  committed chapter can be read again, with the same refusals (a hand-placed
  Sound Cue, a Holdings fixer merge, a chapter being written) and one more
  said in words, a chapter whose attempt is gone. What made newest-only safe
  now holds for every chapter: `codexEntriesWithoutChapter` keeps any entry a
  later chapter still names, whichever chapter first made it, and a thing is
  "already on the page" by the chapters before this one in reading order. The
  record counts its notes (`HarnessChapterTagging.notes`, written and placed;
  schema 41, a no-op upgrade). In the app, World Info gains a **Chapters**
  card (`WorldCardInfoProps.chapters`, filled by the Library's `StoryChapters`):
  every chapter with its record in words (`describeChapterTagging`: read or
  not, by which model and when, tokens in and out, notes written, placed and
  dropped, then one line per kind, "the tagger found nothing here" said in
  those words and a kind the story equipped nothing for said as never asked),
  and Tag this chapter on any of them. The Workshop's HARNESS workspace shows
  the same record and action (`ChapterTaggingRecord`, `TagChapterAction`). The
  plan's first draft had this wrong: the app's Story View had no chapter list,
  and "Tag this chapter again" lived only in the Workshop. **SENSEI's cut, the
  same day:** a record under the cards "reads like a log, not a tool". The
  Chapters card is now a list of rows, and each chapter opens its own Studio
  page (`StudioChapterPage`, `/app/?story=<id>&chapter=<n>`): the chapter's
  prose on the Highlight Engine with every tag lit on the words it landed on,
  one color per kind (`chapterTagMarks`; the information tags join
  `ATTACHMENT_COLORS`), the tagger's findings beside it as switches that light
  one kind alone, the record behind one line, and one action, Tag this chapter.
  Apple-plain on purpose: a creator should know what to do at a glance.

- **2026-10-29 (the Chapter Tagger's own model and reasoning):** SENSEI: "maybe
  cheap models with high reasoning are really good for tagging." The tagger
  read every chapter with the model that wrote it, at that model's lowest
  level. The host now chooses (`HarnessTaggerChoice`:
  `HarnessGenerationControllerOptions.tagger`, `setTagger`): a model of its own
  and a reasoning level, either absent meaning the old behaviour. The tag
  request carries both (`HarnessTagRequest.model`, `reasoningLevel`); the
  server sends the level when the model offers it and its lowest otherwise
  (`taggerReasoningLevel`); the chapter's tagging record names the model that
  read it. In the Library it is the Model Router's Chapter Tagger section
  (`useTaggerPreference`, `LibraryStoriesOptions.preferredTagger`), on the app
  and the Workshop's HARNESS preview alike; the HTTP client sends a tagging
  request as it is, never the chapter model's saved level. No new model call:
  the same one tagging call, with its own reader. "Tag this chapter again" is
  the experiment bench: same chapter, another tagger, and the record says how
  many notes landed.

- **2026-10-29 (the tagger writes in the margin, not on the page):** SENSEI's
  reading of the tagging failure: "You're in school. You write a page. Your
  teacher looks over it, writes marks. That's the whole concept here." The
  tagger used to hand the whole chapter back with tags written into it, and
  `readChapterTagging` compared that retyped copy to the real chapter to prove
  no word changed; when one had, every tag of the chapter was dropped. On The
  Nine-Fold Furnace (gpt-6-luna, three chapters) six paragraphs of 110 came
  back changed, for two reasons the tag teaching itself caused (it was written
  for an author composing a sentence: a sound's words copied back out of the
  tag to keep the paragraph "complete without it", and narration deleted to
  "start the paragraph with its speaker"), so all three chapters recorded
  `tagging.status: 'failed'`, the Reader was silent and the Codex empty (its
  cards unlock only from tags: `storyCodex.ts`, `reached()`). **The tagger now
  returns notes, never prose.** `TAGGER_RESPONSE_SCHEMA` is `{ notes: [{
  paragraph, words, tag }] }`: the paragraph's number, the exact words the tag
  belongs to, and the tag. `placeTagNotes` (`shared/tagger.ts`) finds each
  note's words in the chapter's own paragraph (as written, else with straight
  quotes read as the chapter's curly ones; found once, or the note is dropped
  as ambiguous), writes the tag in the inline form the tag reader reads (a
  speaker, holding, appearance or soundtrack tag before its words, a speaker
  moved to the start of the spoken line its words are in, a sound tag around
  them), keeps the note only while the paragraph still reads back exactly as
  the chapter has it, and feeds the result through `acceptChapterTags`, the
  one placement path, unchanged. So there is one copy of the novel and the
  tagger cannot change a word of it; the prose round-trip check stays as the
  HARNESS's own guarantee and no longer refuses a chapter. Failure moves from
  the chapter to the note: `tag_note_dropped` names each note that could not
  be placed and why, and every other note lands. `notesOfTaggedChapter` is the
  inverse, for the Workshop's replaying writer and the test fixtures, which
  replay a saved chapter's tags as the notes that put them back.
  `HARNESS_TAGGER_READING` is retired with the author-era teaching it bridged;
  the tag teaching is rewritten for the tagger (the exact words are on the
  Writer Instructions page, with the dated entry). Every tag form is
  unchanged except the sound tag, whose words leave the tag for the note
  (`[[sound: Sound Word | Energy]]`). Speakers now asks for a note on every
  spoken line, which ends "one speaker per paragraph" for the tagger. The
  stored shape is unchanged (schema 40): `HarnessChapterTagging` is the same
  record, and a chapter whose tagging failed under the old shape is recovered
  by tagging it again. Still open, for SENSEI: whole-book tagging (one
  chapter at a time since the 2026-10-29 phase B entry; the whole-story run is
  `docs/create-hub.md` phase G) and whether the Codex no-spoiler gate stands.

- **2026-10-29 (a save from another tab no longer overwrites):** The stories
  are one saved workspace, and each tab kept its own copy, so the later save
  of two tabs replaced the other's work, Create mode edits and Sound Cues
  placed by voice included. The workspace now carries a `revision` (schema 40;
  every saved workspace upgrades to revision 0, stories untouched). Every save
  is a compare-and-set: the repository writes a state only while storage is
  still at the revision it was read at, in one IndexedDB transaction, and
  otherwise refuses it with `HarnessWorkspaceConflictError` and writes
  nothing. Create mode shows "This chapter changed in another tab. Reload to
  see it." in its notice; any other save from a stale tab says "Your stories
  changed in another tab. Reload to see them." A tab's own saves run one after
  another, so it never refuses itself, and within one tab the newest save
  still wins, as PR #401 left it. Opening the stories no longer saves the
  recovery it reads (an interrupted request marked as unknown): it reads the
  same on every open, and saving it would refuse the chapter another tab was
  still writing.

- **2026-10-28 (Original Reference removed):** With the owner's approval, the
  old `reference/` baseline message (`HarnessGenerationReference.tsx`) and its
  Original Reference pane were removed. The workspace now shows Development alone.

- **2026-10-26 (tagging leaves the chapter writer, and the HARNESS stops
  teaching craft):** Two changes to the words the writer reads, both SENSEI's.

  **The writer stops tagging.** This is the step the tagger was built for
  (SENSEI, 2026-10-24): "we simply take out whatever we're currently having the
  writer model tag and put it inside a second model call." `# HOW TO TAG` is
  gone from the writer's instructions and with it the whole part, so the
  skeleton is eight parts, not nine, and the role line no longer names it. The
  five tag slots leave the CAPA Schema (`soundCues`, `soundtrack`, `speakers`,
  `holdings`, `appearance`), and with them `writesTags`, the CAPA Prompt's two
  halves (`taggingStart`, `capaPromptParts`) and the five skill manifests: the
  tag teaching is not a skill a host installs any more, it is the tagger's own
  prompt, which already read these exact words. Not one of them changed. About
  3,400 characters leave every chapter call, roughly 850 tokens.

  What follows from it: **the writer's reply carries no tags**, so a tag it
  strays into one is read only to be taken out of the prose and is never kept —
  a chapter's tags come from the tagging stage and nowhere else, and a failed
  tagging leaves an honestly untagged chapter rather than a half-tagged one.
  **The closing holdings list stays and is now asked on every chapter**, where
  it used to follow the Holdings skill: it is the independent cross-check the
  Holdings fixer reads against the tagger's holding tags, so two models agree
  instead of one checking itself. **The Holdings fixer runs off the tagging
  record** rather than that skill, so it skips a chapter that has no tags to
  fix. The sound words travel with the chapter the tagger reads, and the HTTP
  boundary checks them there against the same Sound Cue pack limits.

  **The HARNESS stops teaching craft.** From SENSEI reading the writer's own
  instructions: "a lot of it seems like we're restricting the creativity too
  much, not actually simply enforcing the structure." OPENINGS, CHARACTER
  DESCRIPTIONS and WORD CHOICE leave the HARNESS writing rules, which no skill
  can replace, for SEN Novel Author 1.1.0, which any author can. All three were
  added on 2026-10-07 after the Sundered Heavens test, where 7 of 8 chapters
  opened by describing the scenery and Gu Chen's full portrait came back nearly
  every chapter — real failures, but the fixes went past them into a menu of
  ways to open a chapter, five occasions that deserve a full portrait and a
  count of twice per chapter for a distinctive phrase, none of which the test
  asked for. Craft welded into the HARNESS is craft every licensee inherits
  with no way to remove it, which is Library skin in the SEN lane. What the
  failures actually asked for is three lines the author owns. OPENINGS also
  carried a second copy of "continue from the latest recap", already said three
  paragraphs above it. The HARNESS keeps the four rules the app itself reads
  back: the point of view it records, telling plans apart from what happened,
  continuing from the recaps the writer is actually given, and putting every
  change in the prose, which is where Holdings and the Codex read it from.

  Schema 39 drops the five slots from any story that somehow equipped one and
  moves a story's Author reference to 1.1.0, so neither is refused at the next
  chapter. Frozen prompts are left exactly as they were sent: each is the
  record of what its own chapter read, tag teaching and all.

- **2026-10-25 (the semantic-event memory system comes out):** The chapter
  writer used to return `memory.events` beside its prose: structured records of
  what happened, each carrying a quote the HARNESS checked back against the
  chapter. A capability engine turned those into canonical records across ten
  kinds, and the next chapter's packet read them. That was the story's memory.

  When chapter state moved to the writer's tags, the feeder was removed and the
  machinery was left standing: acceptance has returned an empty event list for
  every chapter since, so the event preserver preserved nothing, the capability
  engine ran zero times per chapter, and `capabilityReceipts` and `projections`
  were never written. `memoryRecoveries` had no writer anywhere in the
  repository and was still exported with every story. `replayStory` existed to
  drive all of it, so a committed chapter's "replay" and the workspace's
  "Repair chapter enhancements" button did nothing at all.

  All of it is gone: the four stores, the `events_preserved` stage (tagging now
  follows prose acceptance directly), the capability engine and its registry,
  the mechanical-continuity reading, `replayStory`, the chapter's `eventIds`,
  the attempt's preserved and rejected events, `postCommitProcessing`, and the
  developer panels that displayed them. Schema 38 drops them from saved stories
  and moves an attempt saved at the retired stage back to prose acceptance.
  **Nothing about writing a chapter changes**, because none of it ran.

  What the tags do not cover, the deletion makes visible rather than fixes:
  relationships, plot threads, mysteries and timeline had no replacement, and
  places and factions exist only as the author wrote them at Chapter 0.

- **2026-10-25 (the tagging stage on the paths that recover a chapter):** Adding
  the stage to the chapter pipeline left it out of the two paths that pick a
  chapter back up after a failed local write, and out of the one button that
  reaches them. A chapter recovered from the checkpoint *before* tagging went
  straight to the commit, so it was saved with no tags and no tagging record; a
  chapter recovered from the tagging checkpoint was sent to the tagger a second
  time, although the failed write had kept its first answer in memory, which
  spent another model call and could have answered differently. The path that
  restores a checkpoint now carries on exactly as the stages do, and a saved
  tagging falls through to the commit. The workspace also offers Resume for an
  attempt saved at `tagged`, which the controller could already finish. Found by
  CodeRabbit on [senseidukes/development#440](https://github.com/senseidukes/development/pull/440),
  after it merged.

- **2026-10-25 (the tagger reaches a story):** The tagger existed but could not
  touch a story, and the world record could describe a card a later chapter
  brought in that nothing could create. Three things close that. **The world
  record has a home:** it lived only on the Foundation, which is the author's
  record and is revised by them, so a chapter had nowhere to put a card. It is
  now `HarnessWorkspaceState.worldCards`, beside the Codex entries it works with;
  a story's record opens from the world its author wrote, and when the author
  revises their opening world their cards replace the ones the story opened with
  while every card a chapter brought in stays — the author owns Chapter 0, the
  chapters own what they added. Everything that needs the world reads the living
  record (the writer's packet, Holdings, the Codex). **Tagging runs as a stage of
  the write,** `tagged`, between `events_preserved` and `committed`, so its tags
  travel in the one write that already saves the chapter and the Codex entries
  its names resolve to, through the same shared resolver. A chapter is never
  refused for its tagging: no tagger, a provider that throws, an unreadable
  answer and one that changed a word all commit the chapter with its prose intact
  and a record saying what happened. **The newest chapter can be read again,**
  which recovers a failed tagging and is what a chapter changed in Create mode
  needs; it refuses a chapter carrying a Sound Cue the reader placed by hand, or
  one whose Holdings fixer joined a name into an older entry, since only a
  rewrite takes that alias back. Schema 37. Two defects found while building the
  re-tag path are fixed with it: the tagger's answer was read without being told
  who the main character is, so every tagged line was marked as somebody else's
  and Read Aloud would have voiced it with the Side voice; and a tagged chapter
  with no appearance tag saved no appearances list at all, erasing the difference
  between an empty list and never having been asked. Tagging has not left the
  chapter writer yet, so for now the writer still tags and a failed tagging falls
  back to its tags.
- **2026-10-25 (the chapter tagger):** SENSEI's architecture for tagging, built
  beside the writer rather than inside it: "we simply take out whatever we're
  currently having the writer model tag and put it inside a second model call
  where his job is just to read the chapter and add the tags for us." The reason
  it is shaped the way it is comes from the same conversation: "if you take the
  AI generation of the novel out, this tagger needs to be able to still tag the
  story with sound cues, etc." So the tagger receives the chapter, who and what
  the story already has, what each character was carrying, and the words it may
  name — and nothing about how the story got here. No Foundation, no arc, no
  Destined Ending, no Story Information Packet: a chapter an author wrote
  themselves has none of those and has to tag exactly as well, and a test fails
  if any of them reaches the prompt. It teaches the tags from the same five
  skills the writer reads, so the tag language keeps one owner and the writer's
  words do not change. The answer is the same paragraphs with tags written in,
  and that is what lets the HARNESS check the tagger instead of trusting it: the
  tags are read and removed through the same path a writer's reply goes through
  (`acceptChapterTags`), and the prose that falls out is compared to the prose
  that was sent. An answer that changed a word of the chapter is refused whole;
  the chapter is already committed and keeps every word, and tagging can be run
  again. Nothing calls it from the chapter loop yet, and tagging has not left
  the writer: both are the next change.
- **2026-10-24 (the world at Chapter 0 becomes the world record):** The record
  held only the world a story opens with, and its name said so. SENSEI's
  architecture for everything the Codex holds is that a card is made properly
  once, whenever it arrives, the same way the opening cast is made, and that the
  chapters' own tags then move the slots their kind marks as changing ("any new
  character should just be processed properly in the beginning", and on a
  character losing limbs later, "I thought that was the point of the tags").
  A record named after Chapter 0 cannot hold a rival who arrives in Chapter 14,
  so `WorldRecord` and `WorldCard` replace the Chapter 0 names, every card
  carries the `enteredInChapter` it entered the world in, and a card's key is
  its kind and its name alone, never its chapter, so one card keeps one identity
  for the whole story. A key written twice is read once, entered in the earliest
  chapter either copy claims. Everything a Story Seed and its Blueprint make
  enters in Chapter 0, and so does every card saved before this version, since
  nothing could add one later (schema 36). Plumbing only: no prompt words
  changed, and the writer still reads the world under the heading SENSEI
  approved, which is still the truth until something creates a later card.
- **2026-10-24 (the chapter writer reads the world at Chapter 0):** Phase C of
  [the World at Chapter 0 plan](../../../docs/world-at-chapter-0.md). Three
  things, and the first is why the other two were invisible. **The Foundation
  keeps the world:** `normalizeStoryFoundationInput` rebuilds the Foundation
  from the fields it knows and this one was never on that list, so every story
  dropped its world at creation and the Codex had nothing to show (SENSEI,
  2026-10-24). It is now read in through `normalizeWorldRecord`, which
  drops an unknown kind, a nameless card and a slot the kind does not define,
  and computes every key from the card's own kind and name. **The writer reads
  it:** its own Story Information section (schema 35), ahead of Current
  Canonical State, as compact labeled text rather than pretty-printed JSON;
  SENSEI approved the words in How to read the story information the same day.
  **Holdings starts from it:** what each character already holds, knows and
  ranks at before Chapter 1, with the chapters' changes layering on top — a
  chapter's tag resolves to a Codex entry of its own, so the two meet by name,
  the way this derivation's closing list and duplicate check already read
  names. Appeared is deliberately left empty at Chapter 1, because it means
  already described on the page. Where the Seed used to send a fact as prose
  and now has a card slot for it, the prose gives way, so the writer still
  reads each fact once.
- **2026-10-22 (the world at Chapter 0, the Codex before Chapter 1):** Phase B of
  [the World at Chapter 0 plan](../../../docs/world-at-chapter-0.md). The record
  gains its first layer: the world a Story Seed and its World Blueprint made,
  complete before Chapter 1. **One definition:** `WORLD_CARD_KINDS`
  (`src/narrative/worldRecord.ts`, the SEN contracts entry) defines every Codex
  card kind and its slots — character, thing, ability, place, faction, species
  and the one World rules sheet — each slot naming which of the record's two
  tests needs it. The Story Seed's fields, the Blueprint's instruction, its
  answer schema and the Codex's cards are all written from it, so none can hold
  a slot another lacks. **The record:** `StoryFoundationInput.worldAtChapterZero`
  (`WorldRecord`), read from the reconciled Seed at the one Seed → HARNESS
  translation point (`worldAtChapterZeroFromStorySeed`); nothing is stored
  twice. **Schema 34** (skipping 33, the rolled-back chapter loop's), with the
  no-op migration every additive version has: a story saved before it keeps
  every chapter and plan and simply has no world recorded. **The Codex:**
  `deriveStoryCodex` takes `world` and shows it before any chapter —
  `atChapterZero` facts on each character, item and faction card, and
  `abilities`, `places`, `species` and `worldRules` groups of their own — while
  a chapter's tags land on those same cards, matched by name, never a second
  card. `firstSeen` is now absent until the story meets a card, and the card
  says so ("In the world from the start"). **The reader meets a card when the
  story reaches it** (SENSEI, 2026-10-22: a reader of a generated novel is its
  creator, so its world would spoil it): the record is whole, and this reading
  of it holds each card back until a chapter brings it in, exactly as the Codex
  behaved before this world existed. A world open to its reader
  (`WorldRecord.openToTheReader`, for a novel its author brought in and
  is expanding) shows every card from the start; the World rules sheet, the
  world's frame rather than a card, shows either way, and a category appears
  only once the record holds one of its kind. An ability is reached like any
  other card: a `knows`, `learning` or `learned` tag puts it on a character,
  so its own card opens with the chapter that taught it. Places and the
  Bestiary have no tag that names them yet, so until one exists only a world
  open to its reader shows them. **The writer is untouched:** the CAPA
  Prompt, the prompt skeleton and the Story Information Packet are unchanged;
  what the chapter writer reads from this world is its own step, with its own
  approval. See it at `?preview=reader-codex` → Development → Before Chapter 1.

- **2026-10-22 (storage after the rollback):** The chapter loop, rolled back the same day, had opened the browser's story database at version 33, and a browser never opens a database at a lower version, so the restored build (schema 32) could not open or save any story in a browser that ran it. The database now opens at `harnessGenerationIndexedDbVersion()`, never below 33, worked out when it opens so a test that stands in for the HARNESS package can still load the file (`src/host/generation/indexedDbRepository.ts`). A workspace the loop saved (schema 33) is kept untouched, like any this build cannot read, and the page starts fresh; a browser that never ran the loop reads its stories as before. No shape changes and no upgrade step. Schema 33 is not reused: the next bump goes to 34.

- **2026-10-17 (looks on demand):** SENSEI's redesign after the Blade test, where Old Gu Feng got no look. **No call after a chapter:** the post-commit look step is gone (`planLookStep`, `describeCommittedLooks`). Each appearance keeps the writer's own description by code (`AppearancePassage.description`, the paragraph from the tag's sentence, up to 480 characters); Appeared shows it, with "· since then: …" for each change (`appearedLookLine`), and the Codex shows it under Look, "In the story's words" (`codex-look-description`). **A look when something needs it:** `controller.describeCodexLook(storyId, key)` is the one entry point for pictures, manga and games: one `describe-looks` call for that one entry, from every passage that shows it (`planCodexLook`), kept on the entry (`CodexEntry.look`, with `from`) and written again only once a new tag adds a passage (`lookStale`, `codex-look-stale`). Manifest asks for it first. A failure is kept with the model's own answer (`CodexEntry.lookFailure.raw`); the reader is lenient (a long line is cut; a single subject's sole look is taken whatever its id). The look writer's instruction now says it writes the core record every picture, comic and game draws from, keeps only how the subject looks, and writes the whole look as it stands after the last passage. **Sound Cues 2.6.0:** the tag wraps words of the writer's own sentence where they stand, never between sentences with words of its own (Blade Chapter 17 lost one that way); the example shows it inside a sentence. No schema change: the new fields are optional.
- **2026-10-17 (How to tag, rewritten):** SENSEI's step two of the prompt skeleton. Every tag skill drops the FORMAT / REQUIRED / FORBIDDEN / CHECK wall for what it marks, its format, one example and its few real rules (about 480 words where there were about 1,250); how a tag names someone is said once in the tag rules. Tag formats are unchanged, so reading, placement and the Codex are untouched. The CAPA Prompt's halves share one separator constant, and the chapter request and Mission Reminder are sent from the measured sections themselves.
- **2026-10-16 (prompt skeleton, step one):** SENSEI's layout for the Generation Model Call, modelled on how AI companies lay out a system prompt, so the story information stands clearly apart from the instructions and the writing apart from the tagging. The system instruction reads `# ROLE AND MISSION`, `# HOW TO WRITE` (the CAPA writing skills, then the HARNESS writing rules), `# HOW TO TAG` (the tag rules, then the tag skills), `# HOW TO READ THE STORY INFORMATION`, `# HOW TO RETURN THE CHAPTER`, `# HARD RULES`; the next message reads `# STORY INFORMATION`, `# THIS CHAPTER`, then `# MISSION REMINDER` last. Same words: the response and evidence contract is split by job, and the CAPA Prompt marks where its tag half begins (`taggingStart`). One call, no new cost. A test locks the order, and the Writer Instructions page shows every block under its part. Wording changes come next, one part at a time.
- **2026-10-16 (responsive bottom bar):** Below 640px the shared Reader shows five labeled controls: Listen, Playback, Codex, Chapters and Create. Listen and Codex remain circular anchors; Playback, Chapters and inactive Create are quieter, unboxed controls with full touch targets. Playback and Chapters open single-row, nonmodal strips; speed choices appear only when requested. Pointer opening keeps focus and reading position; keyboard opening enters the controls. The bar retains its existing height. Wider screens retain the inline arrangement with 44px group targets. The app and Workshop share the layout; the Workshop Fate shortcut also opens the compact chapter group. Narration, Fate, chapter generation and authoring behavior are unchanged.
- **2026-10-16 (soundtrack by category):** SEN Soundtrack 3.0.0, in SENSEI's approved words: the writer opens each chapter with `[[soundscape: Category | Tone | Tension | Energy]] [[atmosphere: Category | Energy]]`, from the story's music and atmosphere categories, and the HARNESS chooses the recordings (the atmosphere bed of that category with the closest energy, taking turns by chapter; the pieces of that music category closest to its tags). The writer no longer sees mood words or recording names. Until the packs carry SEN audio tags, a piece's or bed's group stands in for its category and a bed's proposed intensity for its energy: looser picks, never silence. Older mood and atmosphere words still read. Sound Cues are unchanged.
- **2026-10-16 (quick fixes from SENSEI's Blade test):** The Codex keeps changes out of the way: each held thing and ability shows one line for how it is now and since which chapter (`codex-slot-state`), with its changes behind History, the newest first, ten at a time (`codex-history`); a look's changes and the Chronicle work the same way. When a chapter model's provider rejects its key (HTTP 401 or 403), the server says so and names the model instead of the vague failure, so a reader fixes the key instead of retrying (three tries were lost to a rejected MiniMax key).
- **2026-10-15 (Codex pictures, for testing looks):** At SENSEI's request, before manifesting while reading: an opened character or item card offers **Manifest** once the record has written down its look (`StoryCodex` `pictures`, `CodexPictures` and `CodexPictureCard` in `shared/storyCodex.ts`; `HarnessReaderSession` `codexPictures`). One picture is made from the latest look and the story's tradition, genre, tone and world, and the card wears it at once; Manifest again replaces it. The host makes and keeps it: the Library's `CodexPictureService` and `codexPictureRequest`, the app's `useCodexPictures` over its own device store (`novelexpanded-codex-pictures-v1`), on the cover route (`src/server/story-cover/codexPicture.ts`, **Codex Picture** in the Model Router) with the Router's image model, the cover's visitor limit and the owner's token. The Image Prompts page shows the two new prompts. The Workshop's Codex makes a stand-in picture with no model.
- **2026-10-14 (after the first appearance test):** From SENSEI's Test Story - Blade export (chapters 3 to 10). **Things:** the writer tagged no thing, so `thingAppearancesFromHoldings` (`shared/appearances.ts`) gives each thing its first appearance at commit on the first holding tag that shows it (`has`, `gained`, `equipped`, `unequipped`), including things held before the tag existed; the look step describes it like any other. **Look tags:** `deriveAppearances` reads a look tag in the paragraph that first shows its subject as part of that first look, not a change (Chapter 9 had given two people two looks each); SEN Appearance 1.1.0 says so. **Chapter length:** about 1,500 words, `HARNESS_CHAPTER_TARGET_MIN_WORDS` 1,200 and `MAX` 1,700, in 35 paragraphs (`HARNESS_CHAPTER_PARAGRAPH_RANGE`), down from 1,800 to 2,500 in 50. **Codex:** things no longer held sit under **Archived** below the rest, with an Archived badge on their card; a fact's link (and a record check's) asks "Go to Chapter N?" with Go or Stay before it moves the chapter (`codex-go-confirm`).
- **2026-10-14 (first appearance, with its look):** Stage E1, step 1, as decided on 2026-10-13. **The tag:** `[[appears: Name | character]]` or `[[appears: Thing | thing]]` where someone or something first steps onto the page, `[[look: Name | what changed]]` where a look changes (`APPEARANCE_TAG_WORDS` in `src/narrative/marks.ts`, read apart from holdings everywhere: `readHoldingTag`, `placeHoldingChanges` and the closing list ignore them). **The teaching:** SEN Appearance 1.0.0 (`shared/appearanceSkill.ts`) in the new Appearance slot, `managedBy: 'always'`, after Holdings. **The reading:** `placeAppearances` and `readAppearanceTag` (`shared/appearances.ts`) save each tag on its sentence (`AppearanceAttachment`); acceptance warns `appearance_tags_incomplete`, and a chapter written with the skill keeps its list even empty. **The home:** at commit one `createCodexEntryResolver` resolves appearances and holding changes together, so a name both tag is one entry; `HarnessChapter.appearances`. **The rules:** `deriveAppearances` works out, in reading order, who and what is on the page, every change to a look and the latest look, flagging an appearance tagged twice, a look for someone who never appeared, an unknown kind, and (in chapters written with the skill) someone who speaks before appearing. **Story Information:** the Appeared section (`appearancesSection`: the main character, then 20 characters and 10 things seen most recently, each with its look's line), presented after Holdings (`presentAppearances`) and named in the response contract. **The look step:** after the Holdings fixer, `planLookSubjects` (`shared/lookDescriber.ts`) turns each accepted appearance into a subject (its passage, a declared character's Story Seed notes, the look before a change) and one `describe-looks` call with the chapter's model at its lowest reasoning (`src/server/harness-generation/lookDescriber.ts`, Look Describer in the Model Router, its own visitor bucket) writes each look down, medium-neutral; `chapterLooks` keeps it on `HarnessChapter.looks`, a failure included. The Holdings fixer never rewrites a sentence an appearance sits on, moves the appearances after one it rewrites, and points a merged name's appearances at the entry kept; a rewrite takes back the entries a chapter's appearances made; Create mode keeps appearances like any effect. **The Codex:** characters and items are met when they step onto the page, each card opens to its **Look** (its line, its traits, links to the passage and every change), and the appearance checks join the record checks. Schema 32 (optional fields, a no-op upgrade from 31). The Writer Instructions page shows SEN Appearance and the look step.
- **2026-10-13 (the Codex as a card gallery):** From SENSEI: the Codex must feel like collecting cards, not reading a table, and everything about one character belongs together. `StoryCodex` is now a gallery: one tab per category (Characters, Factions, Items), and every category uses the same card (`CodexCard`: its art filling a 3:4 card, its name and one line at its foot) and opens into the same profile (`Profile`: its art large at the top, then everything the record knows about it). A card without a picture shows its unmanifested aura; pictures will be manifested while reading, from a name glowing in the chapter, which waits on the owner's refinement of the Color Codes. Neutral colours throughout. Record checks close each gallery.
- **2026-10-13 (the Codex: factions apart, no line counts):** From SENSEI on a phone: the speech-bubble numbers on the roster read like comment counts, so they are gone (and the sheet's line count with them); a character's first words stay. Sects, factions and other bodies of people get their own **Factions** tab and are never characters, even when the writer tags one as speaking: a faction the Story Seed declares (`declaredFactions`, by name or alias) or a name whose last word names a body of people (Sect, Clan, Tribe, Empire…). Named beasts stay characters; a Bestiary of species and unique beast groups comes later.
- **2026-10-13 (the Codex, remade on the record):** From SENSEI: the information tags exist to fill the Codex, and the Codex is the only place to check them, so it is remade alongside the tags, holding only what the record knows today, presented to immerse the reader ("almost like a video game"), not as a one-for-one table of what is stored. `shared/storyCodex.ts` (`deriveStoryCodex`) works it out from the chapters each time: characters met by what they hold or say (speaker records, the main character by `protagonist`, declared aliases joining a speaker to their character; declared characters the chapters have not reached stay out), each with rank, holdings, first words, lines spoken and a chronicle; items with their holder now and every change; the holdings checks with their paragraphs. `development/StoryCodex.tsx` shows it: Characters (a roster of emblems in the Color Codes, each opening a sheet with Equipped, Carried, Abilities with their stage, and the Chronicle) and Items, with Record checks at the end. The Codex is now a Reader panel like Fate: a fact's link keeps the Codex open, moves the chapter to its passage and lights it (`data-codex-lit`), lowering the phone sheet to half height (`ReaderPanel`'s `peek`). `HoldingsPage` and `ReaderCodexPage` are gone; the older development Codex stays in `reader-codex/` for its own Workshop card's history. The Workshop's Codex card shows the new Codex reading Sundered Heavens as its Development view.
- **2026-10-13 (right-to-left reading):** Product track, item 1. Arabic (`ar`), Hebrew (`he`), Persian (`fa`) and Urdu (`ur`) join the SEN language registry (`src/lib/language.ts`) with direction `rtl` and their speech tags (older Android names Hebrew `iw`), so a story can be written in them. `HarnessReaderSession` sets the frame's `dir` from the story's language (`getSenTextDirection`), so the chapter, its title, the lit sentence and the Sound Cue highlights run right to left, and the bars mirror: Back and the chapter arrows flip (`rtl:-scale-x-100`), the chapter pill's ends are logical (`rounded-s/e-full`), Back to narration floats at the bar's start, and Create mode's paragraph gutter moves to the start side. The sentence controls keep left-to-right order (`dir="ltr"`), as media controls do in every language. The chapter list, which opens outside the frame, takes the story's direction (`ReaderTopBar`'s `direction`) and opens under the title's start. Speech (`src/narrative/speech.ts`) also finds Hebrew „…“ quotes, and an Arabic ؟ or Urdu ۔ ends a sentence when it looks for who spoke. The Library's Reader fonts name Noto Naskh Arabic and Noto Serif Hebrew beside each serif and title font, and Noto Sans Arabic and Noto Sans Hebrew beside each sans; the host theme loads them, and each downloads only for text in its script. Rubik keeps its own Arabic and Hebrew. Urdu is set in Naskh for now. The Workshop checks it on Sundered Heavens begun again in Arabic, its two chapters committed through the HARNESS (`rightToLeftSample.ts`).
- **2026-10-13 (Create mode: one overlay per sound):** From SENSEI: the overlay switch's Audio category shows Sound Cues, Soundscapes and Atmospheres separately (blue, red, yellow), opening on Sound Cues; Soundscapes and Atmospheres mark where the opening begins. The Soundscape and atmosphere picker under the switch is gone: the opening is chosen like a change, by highlighting a word in the chapter's first sentence and choosing Media → Audio → Soundscape or Atmosphere, each with its preview. The rest of the Create mode panel is unchanged.
- **2026-10-13 (Create mode shows the sound):** From SENSEI: in Create mode a chapter's sound could not be seen. The Audio overlay now marks the chapter's first word where its opening soundscape and atmosphere begin (purple and green, split when both open it), beside the Sound Cues (blue) and the one change of each; its legend reads Sound Cue, Soundscape, Atmosphere. A chapter with no Sound Cues says so above the page in Create mode only, with how to place one; it is still accepted. This change also brings SENSEI's soundscape, atmosphere and Atmospheres slot work (PRs 374 and 375, merged into their stacked branches instead of main) into main.
- **2026-10-13 (Sound Cues 2.4.0):** The writer is no longer told that a chapter may have no Sound Cues. Told so, it tagged none in SENSEI's Not A Wave chapters 1 and 2, whose prose rang a bell five times. Cues are still earned by the prose, at most 10, never added or bent to fit, and a chapter without one is still accepted.
- **2026-10-12 (soundscapes and atmospheres, three separate sounds):** From SENSEI: the music (soundscape), the atmosphere and Sound Cues each get their own tagging. **The writer:** SEN Soundtrack 2.0.0 writes `[[soundscape: Music Mood]]` and `[[atmosphere: Atmosphere]]`, each once at the chapter's start, in place of `[[soundtrack: Music Mood | Atmosphere]]` (still read; `SoundtrackTag.kind`); `chapterSoundtrack` takes the first tag of each kind, a word of the wrong kind is not used, and `soundtrack_incomplete` now also says when only one of the two was chosen. **Create mode:** a **Soundscape and atmosphere** section sets the chapter's opening music (an exact piece, `openingSound.soundscape.pieceId`) and atmosphere, locked at the start, with a preview through the reader mixer; Media → Audio → Soundscape or Atmosphere places one change of each partway through, on the word where it begins (`soundtrackChanges`, at most one of each after the opening: `SOUNDTRACK_CHANGE_RULES.perChapter` is 2, SENSEI's limit, because sequencing sound takes taste and restraint). `authorChapter` saves both and refuses a second change of a kind or one off its word; a change whose word is replaced waits under Needs a new spot like any effect. **The Reader:** `useSoundtrackChanges` plays the reader's opening over the writer's (each sound on its own) and switches to a change once its word reaches the reading line (55% down the screen) or Listen reads past it, and back when the reader scrolls above it (`readerSceneAt`); `useReaderSoundtrack` plays an exact piece when the scene names one, while a piece chosen in Reader Settings still wins.
- **2026-10-12 (Create mode):** From SENSEI: the Text Highlight Engine's authoring, inside the Reader. The bottom bar's far right is now Create mode (the lightning bolt). On the newest chapter, before anything is built on it, it swaps the prose for `ChapterAuthoring`: the chapter on the engine, editable, with the Overlays switch (Off / Cues, the ¶ and raised sentence numbers the model addresses as P2 S6, each Sound Cue tinted) and Media → Audio → Cue from the chapter's own recordings (else the story's media now, `describeStoryMedia`). Every change saves as it is made (`controller.authorChapter`, which keeps the paragraph count, refuses an empty paragraph and checks every Sound Cue, speaker and holding change sits on its words), so there is no seal step: moving on to the next chapter seals it, as `chapterRewriteGap` already decides. On an earlier chapter Create is greyed: only the newest chapter can be changed. Then, from SENSEI ("everything stays updatable until we seal"): an effect whose words a change replaced is no longer let go. It waits under **Needs a new spot** (`HarnessChapter.authoring.waiting`, kept across visits) until the reader places it again or removes it, or the chapter is sealed, when what still waits is let go. A changed chapter is marked (`authoring.editedAt`) so that it, and only it, is read again when it is sealed; that reread is the next piece. The bolt lights like Codex while Create mode is on.
- **2026-10-12 (Fate is a compass):** From SENSEI on a phone: the chapter pill was wider than the playback pill because Fate sat in its own glass circle, so the right side crowded Codex. Fate is now a plain compass step like the speed control (the lightning bolt is kept for the coming Create mode), both pills match, and the bar's gaps are even. When the next chapter waits on Fate, only its icon turns cyan.
- **2026-10-12 (the Reader Chamber fills the screen; Fate between the chapter arrows):** From SENSEI's clean-up list. **Full screen:** on a laptop the Reader was a 48rem column with its bars inside it, so it only looked right beside an open panel. Both bars now run edge to edge, and on a wide screen the chapter grows with the screen in steps (`reader-frame.css`: `--reader-scale` enlarges the text and title, up to 1.4×; `--reader-measure` lets lines run from 34em to 38em, about 60 to 66 characters); a panel shrinks the frame beside it, and the steps start 28rem later while one is open. **Header:** the story and chapter (now "Chapter 3 · its title") open the chapter list (`ReaderTopBar`, `reader-chapter-menu`), with a ▾ to say so; the story title is larger, and both bars are 4.5rem tall. **Bottom bar:** Listen and sentence controls, Codex in the middle, then ‹ Fate › (Fate between the chapter arrows); the far right keeps the place of the coming Create mode (`reader-create-slot`), with the story audio note above it. **Fate Survival goes through Fate every chapter:** at the newest chapter Fate and Next are greyed until the reader reaches the last paragraph (`useChapterFinished`: the last paragraph scrolled into view, or Listen reading to the end; watched only in Survival, kept for the visit); then Fate lights up and opens at the direction step, and Next waits until Fate has the next chapter's direction. Earlier chapters and Regular Reader are never locked. The picker styles are shared (`readerPicker.ts`).
- **2026-10-11 (Sound Words are the story's own):** A story keeps its own sound words (`HarnessStory.soundWords`, at most 30), apart from its recordings: `setSoundWords` saves them, changing the Sound Cue pack never changes them, and an empty list plays no Sound Cues. Each attempt freezes them, the word alone; the writer receives those a recording plays, one per line (SEN Sound Cues 2.3.0, with no example tag or meanings). A word with no recording stays the story's and its tags are set aside, the prose kept. Schema 31 upgrades every saved story as it is; saved chapters keep their cues and frozen attempts their instructions. Tone and Tension selection waits for the owner's recording grades.
- **2026-10-11 (Why the HARNESS exists, and the plan):** Documentation only. [HARNESS_PRINCIPLES.md](./HARNESS_PRINCIPLES.md) records the owner's framing: the HARNESS is not a story generator but the engine that keeps long-form narrative reliable on cheap, replaceable models, under one principle (the model proposes; the engine decides and remembers). It lists the nine problems it solves with a plain status for each, the rules that follow, and the world record the Codex needs so a story can be translated into sequential art, animation or games (with the artist test and the save-game test). `NOVEL_EXPANDED.md` › What comes next is now a staged plan in two tracks, with a Next up list for handoffs.
- **2026-10-10 (center the pills between anchored actions):** Play and Alter Fate stay at the outer edges, Codex stays centered, and each compact pill centers within the gap between neighboring main actions. Gray outer actions and cyan Codex are retained.
- **2026-10-10 (compact centered Reader controls):** The whole action group stays centered at desktop and mobile sizes. Play/Pause and Alter Fate use gray circles while Codex stays cyan. Both control pills are shorter and narrower than the main actions; behavior is unchanged.
- **2026-10-10 (matching control pills):** The two playback skip controls now share a single outlined pill matching the chapter selector, using the same border, rounded ends, height and compact sizing. Their playback behavior is unchanged.
- **2026-10-10 (mirrored Reader controls):** The bottom row now reads Play, playback skip controls, Codex, chapter selector, Alter Fate. Chapter controls moved from the top bar with their existing opening, position and newest-chapter action preserved. The three blue actions and their controls stay on one row; the narrowest phones use compact sizing.
- **2026-10-10 (matching primary Reader actions):** Play/Pause, Codex and Alter Fate now share the same large cyan circle, border and glow. Sentence skip controls remain smaller beside playback. Narrow layouts preserve space for all three actions without overlapping.
- **2026-10-10 (Codex as the primary center action):** Codex takes the large center button. Listen/Pause moves to the left, followed by previous and next sentence. Fate stays right; the conditional return-to-narration button stays floating above the left. The existing chapter, playback and Codex behavior is preserved in the shared app/Workshop frame.
- **2026-10-10 (floating return to narration):** Back to narration now floats above the bottom bar on the left, opposite the audio note. It appears only while the paused or playing narration is out of view and returns to that sentence without adding a bar control.
- **2026-10-10 (persistent skip controls):** The main Listen button alone switches between play, pause and resume; the separate square Stop button is removed. Both sentence skip controls remain visible before playback and can seek silently before Play. The app and Workshop share this behavior.
- **2026-10-10 (one bottom playback row):** Playback controls now flank the existing Listen/Pause button in the original bottom bar. Previous sentence and Back to narration sit left; Next sentence and Stop sit right. Codex and Fate keep the outer positions. Starting, pausing and stopping playback do not add a second row.
- **2026-10-10 (chapter switcher in the top bar):** Moved previous chapter, chapter position and next chapter into the shared Reader top bar. The switcher sits directly to the right of Settings on the existing single header row at every screen size. Existing chapter opening and the newest chapter's next step are preserved. The app and Workshop Development preview share this frame. Codex, Listen and Fate remain in the bottom bar.
- **2026-10-10 (the Reader Chamber's bars, in SENSEI's order):** Comparing the first Reader (production) with this one, SENSEI set the order: settings and what is being read on top, what the reader acts with at the bottom. **Top** (`ReaderTopBar`): Back, the story and chapter, the host's **companion** (`HarnessReaderSession`'s new `companion` slot; the Library puts the reader's Familiar there) and Reader Settings. **Bottom** (`ReaderBottomBar`, which replaces `ReadAloudPlayer`): the Codex, **Listen** as a large round button in the middle of the screen (Pause, Resume or "Listen from the start" in its place as it reads), **Fate** (the lightning of the first Reader's Alter Fate), and the chapters: previous, where the reader is ("5/10"), and next (at the newest chapter, the story's next step: `Next Chapter: Write Chapter N` and the like). Its two sides share the width equally, so Listen sits in the middle; on the narrowest phones (320px) the left side gives way rather than anything overlapping. While Listen reads, a strip above the bar names the speaker and holds previous and next sentence, Stop and Back to narration. The bar is always there, before Chapter 1 too, without Listen until there is a chapter; without speech, the middle is empty. The chapter's end keeps only the story's next step at the newest chapter, with the host's price beside Write (its button no longer carries the `Next Chapter:` name, which is the bar's); it is still what the soundtrack's End of chapter timer watches. **The phone sheet** (`ReaderPanel`, below 1024px) is one full-screen sheet moved by a transform: fully open it covers the screen (top bar included), at half height the chapter reads above it. It follows a drag on its centred handle and glides to the nearest stop when let go (a flick carries it further; well below half, it closes); a small circle beside the handle, wholly or half filled, shows the stop and toggles it. No "Show the chapter" words. Panels sit above the Workshop's controls and below the writing screen. The browser walk checks Listen sits in the middle of the bar and the Familiar's recall in the top bar.
- **2026-10-10 (the Reader Chamber: the Codex as its own page; Fate and Reader Settings as panels):** SENSEI's direction for the Reader shell: a home base for everything the Reader will hold, built "around serving the experience of reading, not interrupting it"; when deciding what happens next, skimming the chapter just read helps. The Codex is its own page inside the Reader Chamber, and Holdings is not a front-facing tool: it is one of the Codex's pages (beside Lore and Deep Memory). Only Fate and Reader Settings are panels. Before, Fate, Holdings and an arc's goals replaced the chapter (an early return per page), so Back lost the reading place. **One layer state:** `HarnessReaderSession` keeps one `ReaderLayer` (exported): a **panel** (`fate`, `settings`) or a **page** (`codex`, `arc`); opening one closes the others. **Panels** (`ReaderPanel`, exported with `useWideReader`) are non-modal dialogs over the chapter, which stays mounted, readable and scrollable (Reader Settings shows each text change on the chapter as it is made): below 1024px a sheet from the bottom with two heights (full, and half with the chapter above: its "Show the chapter"/"Raise" button or a drag on its handle; dragging down from half closes it); from 1024px a 28rem panel at the right, the chapter column moved beside it. Touching the chapter never closes a panel; Escape and Back to reading do. Opening focuses the panel's heading (unless its content took focus, as Fate's direction does); closing returns focus to what opened it. The SEIHouse UI drawers are modal even when asked not to be (vaul never passes `modal` to its dialog: focus is trapped and the page behind is hidden from assistive technology), so the Reader draws its own. **Pages** take the screen while the chapter waits underneath (`hidden`), and the reader's scroll place comes back when they close; reading a chapter from one opens it at its top. **The Codex page** (`ReaderCodexPage`): the top bar's Codex button (in place of Holdings) opens the development Reader Codex (`reader-codex/development/ReaderCodex`, loaded on first open) as it is, not yet fed the story's world, so its screens can be designed in the Reader: a quiet host runtime (no model call, image, voice or save) and, when the host has no player, a silent one for its voice cards. `ReaderCodex` takes `extraPages`, listed after Lore; the Reader adds Holdings (`HoldingsPage` without its own Back). The app's import guard (`check:app`) and browser walk allow `src/components/reader-codex/development|shared/` for this page; the old production Codex (`reference/`) and the older Reader stay out. **Listen** reads on under a panel; a page or the writing screen still pauses it. The Workshop's Pages shortcuts are Fate, Codex and Reader Settings. SEN 0.29.0.
- **2026-10-10 (the Reader: a frame, a chapter body, its text, the SEIHouse fonts):** SENSEI asked to fix the Reader's layout and font controls and to split it into a frame and a swappable chapter body, ready for a future sequential-art view, with the SEIHouse fonts from the font repo. **Frame and body:** `HarnessReaderSession` is the frame (top bar, chapter navigation, Listen, Reader Settings, the Fate, Holdings and arc pages, the writing screen) around a `chapterBody` (`ReaderChapterBody`, `development/readerChapterBody.ts`), prose by default (`ProseChapterBody`, the former inline `ChapterView`). A body gets the chapter, its passages, Listen's highlight and the reader's text settings, and keeps three marks the frame reads (`data-chapter-number`, `data-read-aloud-title`, `data-sen-text-block`), so Listen's starting point, its follow-along and Holdings' passage links work for any body; a sequential-art body marks each panel with the passage it shows. No HARNESS data changed. **Layout:** a slim top bar (`ReaderTopBar`) stays at the top of the screen in one row on the narrowest phones (Back, the story and chapter, Holdings, Fate, Reader Settings; Holdings shows its icon on phones); the prose column is 34em wide, about 60 characters a line in any font (it ran 85–90 on laptops; measured in em because a `ch` follows each font's own "0", which left SEIHouse Sans narrower than Noto Serif); Listen's follow-along and starting point count the bar as covered. **Text:** Reader Settings opens with Text: font, title font, size (15–22px, 17.2 by default), line spacing (Compact 1.5, Normal 1.85, Relaxed 2.15), weight (Light, Regular, Medium) and Reset text, kept on the device (`readReaderTextSettings`, key `text-settings`); the gear shows even without speech or a mixer. The Text Highlight Engine's paragraph line height had overridden the Reader's own; it now follows `--sen-text-line-height`. The fonts are the host's (`readerFonts`); SEN alone offers the theme's serif, sans and display. The Library offers SEIHouse Sans (default) and Noto Serif, and for titles SEIHouse Display Ink (default), Soft, Edge and Wide, and Alegreya. SEN 0.28.0, Library 0.30.0.
- **2026-10-10 (a holdings tag keeps its name):** From SENSEI's Sundered Heavens test, Chapters 7 and 8: the writer put a holdings tag where the thing's name belongs, and removing the tag removed the name ("a twist of that bit sharply into his scalp", "which held .", "tucking securely"). The tag reader (`src/narrative/marks.ts`, `namedInPlace`) now leaves the name in the tag's place when the sentence plainly lacks it: after an article, possessive or preposition, straight before the sentence ends, or before an adverb in -ly; never at a sentence's start, after its subject, before an article or possessive that opens the object, or where the thing's name is already written. Across all thirteen chapters of the owner's two test stories it changes exactly those three sentences. Chapters already saved keep their text; new chapters and rewrites get the name. SEN 0.27.1.
- **2026-10-09 (the Reader has a Workshop card):** The Reader Chamber card (`?preview=reader-chamber`) shows `HarnessReaderSession` as its Development view, exactly as the app hosts it (Library's `StoryPages` on its read page), on SENSEI's Sundered Heavens test or any story saved with Export story. Its writer makes no Generation Model Call: it returns each chapter's saved Generated Chapter, which the HARNESS validates, checkpoints and commits as it did when the story was written. No HARNESS code changed. See the Reader Chamber README.
- **2026-10-09 (a place beside Write):** `HarnessReaderSession` takes `renderWriteAside(chaptersWritten)`, shown beside the button that writes the next chapter and nowhere else; the count lets a host mark each new chapter as it arrives. The Library shows a chapter's Energy price there. SEN 0.26.0.
- **2026-10-08 (Story Settings leave the developer page):** The Story Settings, CAPA skill slot and Media Loadout panels move from the developer page into the Library's stories (`src/library/stories/settings/`): Story View shows them to every reader (`StorySettings`, closed until opened; a change waits while a chapter is written) and Create shows the skills and media a new story starts with (`CreateStorySettings`, a draft the host keeps until Manifest). The developer page renders the same panels with `inspect` (skill instructions, the Official Requirements, slot uploads), so there is one set. The controller adds `describeMediaSelection(selection)`, the sound and music words a Media Loadout gives before a story exists. Freezing, managed slots, retries and saved stories are unchanged. SEN 0.25.0, Library 0.26.0.
- **2026-10-07 (Openings and character descriptions, in wording only):** From the owner's Sundered Heavens test: 7 of 8 chapters opened by describing the scenery ("The soot of Rust-Vein Gorge…" in Chapters 5, 6 and 7), and Gu Chen's portrait from his profile ("flint-gray eyes", the copper mining wire in his hair) came back in nearly every chapter. None of "soot", "sulfur" or "slag" was in anything the writer was given: each chapter re-sets the scene from the same opening setup. By the owner's decision the fix is wording, not machinery (no word lists, checks or extra calls), and nothing the writer receives changes. The response contract adds OPENINGS (the first chapter of the story or of a new arc may ground the reader; every other chapter picks up from the latest recap and opens however the moment calls for, so openings vary naturally: the setting is one way to begin, never a habit) and CHARACTER DESCRIPTIONS (in full when a character first appears, returns after time away, or changes: a breakthrough, a power-up, new gear, an injury, a new rank; a light touch between), and the pet-word rule drops "not carried from chapter to chapter", which the writer, seeing recaps rather than earlier chapters, could never check. The chapter request says where the chapter sits in its arc (`presentArcPosition`, worked out from the chapter number by `createArcChapterPosition`, never stored). Recorded in the Writer Instructions history. The Reader also shows each chapter's word count beside its number (`Chapter 7 · 2,174 words`), a testing aid while chapter length is tuned. The Reader's music also starts with a different piece than the menu's whenever its mood has another (a calm piece that also answered the Reader's mood could start again by chance). SEN 0.24.1.
- **2026-10-07 (The Reader never opens to the menu music):** From the owner's testing: entering the Reader on chapters written before scenes kept the app's calm piece playing, and leaving changed it. The Reader now always plays its own music: the chapter's mood when a piece answers it, else `READER_MUSIC_MOOD` (`mystical`, the mood most of Volume 1 shares), which also plays while Chapter 1 is written (`HarnessReaderSession`'s new `soundscapes` gives the Reader the host's pieces before a chapter exists). `StorySoundtrack` never carries the host's piece into a hold, or a hold's piece back out. Leaving the Reader stops its atmosphere and sleep timer but leaves the music to the soundtrack, so the menu music returns in one step. SEN 0.24.0.
- **2026-10-06 (Phase 4: audio that's always there, and writing that survives leaving):** From the owner's testing notes. **Audio in the Reader:** the atmosphere and Sound Cues keep playing under the Reader's own pages (Fate, Holdings, an arc's page) and while a chapter is written; only leaving the Reader stops them and ends the listening session. Listen still pauses while its text is covered. The atmosphere plays from the moment the Reader opens, Chapter 1's writing screen included. The host mixer plays atmosphere loops as their files are made (no overlap at the loop point). **Writing survives leaving:** the chapter being written belongs to the controller (`chapterWrite`, `HarnessChapterWrite`), not to the surface that started it (`useNextChapterWriter` reads it), so backing out mid-write keeps it writing and coming back shows it; `writeNextChapter` finishes a write a closed browser interrupted before starting a new one (a saved reply with no new model call; a cut-off request asked again with what it froze). NovelExpanded begins Chapter 1 at Manifest Story (`nextChapterWaitsOnReader` keeps a Fate Survival story's first chapter waiting for the reader). **The soundtrack:** SEN Soundscapes, Volume 1 (43 composed pieces, each measured) is the soundscape catalog every new chapter is written with. `StorySoundtrack` (`src/narrative/soundtrack.ts`) plays pieces of one mood one after another on the reader mixer, with a hold (the Reader's chapter) over the host's own music: NovelExpanded plays calm pieces on its pages and while a chapter is written, and the Reader locks into each chapter's scene (`readingScene`, carried on from earlier chapters when one leaves a part out). The writer chooses that scene once, at the chapter's start, with the new soundtrack tag (`[[soundtrack: Music Mood | Atmosphere]]`), taught by SEN Soundtrack 1.0.0 in a new Soundtrack CAPA slot managed by the Media Loadout, from the story's music moods (the moods at least three pieces share) and atmosphere words (frozen media now carries the host's atmospheres). Acceptance keeps only the first tag (`chapterSoundtrack`), so a passing fight never brings on war music; extras, unknown words and a missing tag are flagged (`soundtrack_incomplete`). Reader Settings › Audio › Scene: Automatic (each chapter's own) or the reader's own piece and atmosphere, kept on the device. Schema 29 (optional fields, a no-op upgrade from 28). Recorded in the Writer Instructions history. SEN 0.23.0, Library 0.21.0.
- **2026-10-06 (A stage reached while still learning is kept; the fixer sees the chapter's own earlier tags):** From the owner's Sundered Heavens test. In Chapter 4 the writer began Heaven-Shattering Body Cultivation and then tagged its first stage (`improved … | Stage 1`); the rules called that improving before learning, raised a check and dropped the stage, so later chapters' writers never knew he had reached it (Chapter 6 tagged "began learning" again). Moving up a stage while still learning is now progress, as cultivation stories tell it: the stage is recorded, the ability stays under Learning (the writer reads "(Stage 1)", the Holdings page shows it), and a later `learned` keeps that stage. Improving an ability never begun is still a check. Because holdings are worked out from the tags every time, stories already written are read the new way: the owner's export now has no checks, and its seven chapters would make no fixer call. The fixer's sentence cases also show what the chapter itself recorded about the same item before that sentence (`earlier in this chapter, …`), so a case is never judged without it.
- **2026-10-06 (The Holdings fixer is called only when needed):** On the owner's ask, the fixer is never called unless a check flags a problem in the chapter itself that the plain rules cannot settle. That already held (the call is made only for cases built from the chapter's own flags); one rule is now exact: a closing-list problem is asked about only with the sentences that name the item after the chapter's own last tag for it, and with none it is settled as fine without a call, since nothing in the chapter could show a change the tags missed (a sword gained here and never named again, or a pill used up here and still listed). A sword gained and then named again, as it snaps, is still asked about, with that sentence alone. `holdingsFixerChapter.test.ts` guards it across chapters: clean chapters and closing lists nothing could fix make no call, and a problem answered "fine" in one chapter never makes a later one call.
- **2026-10-06 (Phase 3: Rewrite this chapter, and the Holdings fixer):** Two pieces, chosen and ordered by the owner. **Rewrite this chapter:** at the end of the newest chapter, until the next one is written, the Reader shows one quiet link that opens a box for an optional note (`ChapterRewrite.tsx`). `rewriteLatestChapter` writes the chapter again as one new attempt, prepared from the story as it stood before it (`withoutLatestChapter` in `shared/chapterRewrite.ts`: the chapter, the Codex entries it brought in, its goal outcomes, broken route and ending, and a direction chosen after it, all gone), with the chapter's own direction back in place. The request carries `rewrite` (the note, and the replaced version's title and recap, never its prose), and the writer is told to write the chapter afresh from the same point. The new version replaces the old one only when it commits, in one write; the replaced attempt keeps its reply (`replacedByChapterId`), so the export still shows it. `chapterRewriteGap` refuses while anything is built on the chapter (a chapter being written, a running batch, the next arc already planned from it, story memory or the reader's corrections on it). A failed rewrite changes nothing and keeps the reader's note; a rewrite interrupted by a closed page fails instead of holding the story, and retrying a failed one rewrites again. **Holdings fixer:** after each chapter commits, the controller turns the chapter's holdings flags into small cases (`planHoldingsFix` in `shared/holdingsFixer.ts`), settles closing-list names the chapter never mentions without asking, and sends the rest in one `fix-holdings` call with the chapter's own model at its lowest reasoning level, no randomness and a 60-second deadline (`src/server/harness-generation/holdingsFixer.ts`, registered in the Model Router as Holdings Fixer, with its own visitor bucket). `applyHoldingsFixes` keeps an answer only when it leaves the chapter with fewer problems: corrected tags, one corrected sentence (never one a Sound Cue or speaker sits on; spans after it move by the manuscript's own `rebaseSpan`), or a new entry merged into the one already there, which learns the new name. A contradiction too big for one sentence is recorded as `major` and left. Every case is kept on the chapter (`HarnessChapter.fixer`, exported), and a rewrite takes back what the fixer did. The host sets how far it goes (`holdingsFixer`: `off`, `records-only`, `records-and-sentences`, the default); `useLibraryStories` carries it, which is where the Familiar will control it. The app sends the reader's token with it but never asks for one on its behalf. The reader sees none of it. Schema 28 (optional fields, a no-op upgrade from 27). The fixer's instructions are on the Writer Instructions page.
- **2026-10-06:** Removed the separate memory model call, its on-request control and the recurring story-memory-incomplete warning. Chapter writing, acceptance, saving, Reader behavior, recaps, canonical-state readers and Holdings are unchanged. Historical stored extraction fields remain readable and ignored; no schema migration. SEN 0.21.0 removes the controller method/option and adapter method; Library’s peer range remains valid.

- **2026-10-06 (Phase 1 fixes from the owner's Sovereign Hive test):** Fixes only, no new features. **Sound tags:** 14 of 15 sound tags in the test sat on their own line or between sentences, with words of their own, leaving lower-case fragments ("his pick scraped salt crystal") and repeated phrases. Sound Cues 2.1.0 asks for tags around words already in the sentence, and acceptance now settles any tag that still lands outside a sentence (`soundTagRepair.ts`): its words are removed, its sound moves onto the nearby words that echo them (within the cue's 8-word limit), else onto the nearest sentence, and the chapter carries a `sound_tag_moved` warning. A paragraph never starts with the full stop a tag left behind. **Speakers:** Chapter 3 copied `[[@Name]]` from the instructions for 14 of Bo's lines. A placeholder speaker now counts as no tag (unless the story has someone by that name), so the line is voiced from its narration, and Speakers 2.1.0 shows no placeholder name to copy. **Holdings:** the list had grown into a notebook (plot facts, names with counts in them, and Chapter 1's tags written inside the closing list). `holdingName` takes a count or description out of a name ("Spirit Pill ×3", "3 Spirit Pills", "Core (cracked)"), keeps a number that belongs to the name ("1000 Year Ginseng"), and sets aside a name that reads as a note (a sentence, a sighting, a countdown); tags written in the closing list are recorded at the chapter's end, once, never repeating a change the prose already tagged; Holdings 2.1.0 asks for things and abilities only. **Writer:** the response contract keeps countdowns out of recaps and says an older recap's span of time counts from its own chapter ("nine days" had stood still for four chapters), and forbids leaning on a pet word ("arithmetic" ×13); the chapter request gives a words-per-paragraph guide and calls anything under the minimum too short (two chapters had come in at 1,594 and 1,248 words). Recorded in the Writer Instructions history. SEN 0.20.0.
- **2026-10-05 (The Reader's soundtrack is the SEIHouse audio player):** The owner's audio player (`@seihouse/audio-player` 4.0.0) replaces the single-channel player as the Reader's sound. `useReaderSoundtrack` (this folder) connects `HarnessReaderSession` to the host's reader mixer: the reader's chosen atmosphere plays while the chapter is on screen and fades out while a page covers it (Fate, Holdings, an arc's page, the writing screen), keeping a sleep timer, and leaving the Reader stops every layer; only the layers the chapter uses appear (Sound Cues when it has some; soundscapes are not chosen yet); the chapter's cues are warmed; while Listen speaks, the soundtrack dips (`LISTEN_DUCK`, 0.6) and the reader counts as active; a sleep timer that fires stops Listen too; the chapter's navigation coming into view, or Listen finishing the chapter, is the chapter's end. The player's ghost note sits above the Listen bar (tap mutes, long-press opens Audio; with no speech it still shows), and Reader Settings opens with Audio (the player's approved `ReaderMixerPanel`, loaded when the sheet first opens) before Narration. Sound Cues play through the mixer (`MixerCueControl`), overlapping, at their Energy. Without a host mixer none of this appears. SEN 0.19.0, Library 0.19.0.

- **2026-10-04 (A chapter stopped at the deadline says so):** After six OpenRouter chapter models were added (PR #319), the owner's chapter never arrived and the server logged "The configured model returned an empty response". The model was still writing when the HARNESS's 170-second deadline stopped it; OpenRouter answers 200 at once and holds the reply open, so the deadline landed while the reply was read and the error was swallowed. The server now reports the deadline, and the Reader says "The model was still writing after 170 seconds, so it was stopped. Choose a lower reasoning level or a faster model in the Model Router." GLM 5.3 Flash, Qwen 3.8 Flash and DeepSeek V4.1 Flash thought past the deadline on their own defaults; the Model Router now sends each a level that finishes, and routes GLM to its fastest OpenRouter provider (Library 0.17.1). Each answer logs one line with its model, time and token counts, never the story.
- **2026-10-04 (The writer's tags, one strict shape; sound tags; the Writer Instructions page):** The owner's two exports showed the tag instructions were worded too loosely: no speaker tags at all in either story's Chapter 1, 36% of sounds lost (3 to numbers that fell out of step with the list, 7 to the five-word limit). The owner approved one shape for every tag kind, then asked for it audited down to what the writer needs, so more kinds can stack.
  - **One shape:** every tag kind is taught as JOB, FORMAT, REQUIRED, FORBIDDEN and CHECK BEFORE YOU RETURN. What every tag shares is said once, as the HARNESS tag rules (`HARNESS_TAG_RULES`, `shared/tagRules.ts`), just before the first skill that teaches a tag: tags are machine notes removed before anyone reads; write each exactly as its FORMAT shows; each paragraph reads complete without them; never outside paragraphs; never written about in the prose. CAPA slots that teach a tag say so (`writesTags`). SEN Speakers 2.0.0 (every chapter including the first, one speaker per paragraph), SEN Holdings 2.0.0 (the same rules as a table) and SEN Sound Cues 2.0.0. The three kinds and the rules are 737 words, down from 874.
  - **Sound tags:** the writer puts a sound tag on the words where a sound happens, `[[sound: Sound Word | Words | Energy]]`, and the reply format no longer asks for a `soundCues` list, so no number can fall out of step. `readMarks` reads the tags (with the story's sound words, one written the other way round reads right); `placeSoundCues` places them. A writer that still returns the list, or still writes numbered marks, places nothing and is told so; the words are kept. The story's sound list is one line per word (`blade drawn: drew his sword`), after one example tag made from the first word.
  - **Eight words:** by the owner's decision a Sound Cue fits 1–8 whole words (`SOUND_CUE_RULES.maxWords`), for the writer and for cues placed by hand, so a natural phrase ("a horn blared across the terrace") keeps its sound.
  - **Writer Instructions:** a Workshop page (`?preview=writer-instructions`) shows every block the chapter writer reads before the story, from the live code, with its version, size and last change. A dated history records every change, and a test fails until a change is written there, so the instructions never change without the owner knowing.
  - **Versions:** SEN 0.17.0, Library 0.17.0.
- **2026-10-03 (What a five-chapter test showed: point of view, failed writes, titles, holdings):** The owner's Goblin test story (five chapters, exported) switched its point of view, saved a failed write as Chapter 3, numbered its own titles, and lost an item from Holdings. Each is fixed where it starts.
  - **Point of view:** Chapter 1 was told in the third person, Chapter 2 in the first, Chapter 4 switched mid-chapter, and Chapter 5 went back. The Japanese Style allows first person or close third, which is right for that tradition, but the writer sees only recaps of earlier chapters, never their prose, so it could not see which one the story opened in. The Style still chooses; the HARNESS now remembers. It reads the story's point of view from its earliest committed chapter that shows one clearly (`storyPointOfView`, `shared/pointOfView.ts`: in English narration with speech left out, "I", "me", "my" and "myself" against the main character's names, at least 8 and twice the other; anything less clear reads as nothing), carries it in Current Story Information (`CurrentStoryProjection.pointOfView`, worked out each time, never stored), and the response contract tells the writer to keep it and never switch. The SEN Speakers skill no longer mentions first person (v1.2.0: "whatever name or pronoun the prose uses for them"), so point of view is the Style's alone.
  - **Failed writes:** Chapter 3 came back as four paragraphs and 104 words, two of them the writer's own notes about the task ("Need fix tag syntax…"), with none of the fields that follow a chapter, and it was saved, because a short chapter was never refused. By the owner's decision that rule changes: a reply under a quarter of the chapter's minimum (`HARNESS_FAILED_WRITE_SHARE`, 450 of 1,800 words) is a failed write (`harnessFailedWrite`). It is never saved, its raw reply stays on the attempt, and the Reader says "Chapter 3 was not saved. The writer stopped after 104 words, far short of the 1,800 a chapter needs. You can try again." with Next ready to try again. A chapter that is only short is still kept and flagged. So that a whole chapter in Thai, Lao, Khmer or Burmese (written without spaces between words) is never mistaken for one, `countHarnessWords` now counts those words by the language's own rules (`wordRanges`); before, a Thai chapter counted about a fifth of its words.
  - **Titles:** the writer named every chapter "Chapter N: …", so the Reader showed "Chapter 3" twice and Read Aloud said it twice. Acceptance now drops a chapter label from the writer's title (`chapterTitleText`, `src/narrative/chapterTitle.ts`, in every SEN story language); a title that was only the label takes the HARNESS's "Chapter N". The Reader heading and Read Aloud do the same for chapters already saved, and the response contract says a title is the chapter's name alone.
  - **Holdings:** Chapter 1 tagged the slate Grit pulled from under a stone only as equipped. Equipping something the record did not show as held was flagged and left out, so the slate never reached Holdings and the writer dropped it from Chapter 2. Taking a thing in hand, or putting it away, now records it as held the first time the story shows it. Losing something never recorded is still flagged.
  - **Tests:** every test chapter is now long enough to be a chapter (`writtenChapter`, `src/test-utils/writtenChapter.ts`), and the failed write is the owner's own Chapter 3 reply (`STOPPED_WRITE_REPLY`).
  - **Versions:** SEN 0.16.0, Library 0.16.0.
- **2026-10-03 (Read Aloud: what worked in production):** The owner, testing on Windows, heard the main character and everyone else in one voice, and a pause of about three seconds whenever a character's voice began; production's Read Aloud never did either. We took what worked from production (`light-novels`, `useReaderPlayback`, `webSpeechCast`), not a copy.
  - **Who speaks:** a real export showed the writer tagging about half the spoken lines (Chapter 1: none of 45), and untagged speech went to the Side voice, the main character's included. Production's writer labelled every paragraph, and read an unlabelled quote in the main character's voice. Now Read Aloud reads speech nobody tagged from its narration (`narratedSpeaker`): the sentence after the quote ("…,” Lin Xiao said.), else the ones leading into it, names someone else first, so the Side voice; otherwise the main character's voice, production's default (`UNTAGGED_SPEECH_ROLE`). A quote whose own narration names no one takes another of its paragraph's speakers, one speaker to a paragraph as production read it; a pronoun is never guessed. Against the six chapters' own tags it never disagreed (42 of 42). It runs when the chapter is read, so chapters already written are voiced the new way. The Reader passes the main character's names from the chapter's frozen Story Information (`protagonistNames`).
  - **The pause:** our default voices were online ones on Windows (Chrome's Google voices, Edge's Microsoft Natural voices), which fetch every line. Production landed on the computer's own voices. `chooseDefaultVoices` now takes a voice on the device before an online one and a pick's standard voice before its Enhanced or Premium one, and the Library's picks are production's cast: Daniel or Google US English narrates, Rishi or the device's next voice (Microsoft David) is the Protagonist, Samantha or Zira the Side voice. Like production, the player clears the browser's queue before every line and waits 50 ms after a line ends. Reader Settings marks online voices. A reader's own saved choice still wins.
  - **Versions:** SEN 0.15.0 (breaking: `UNTAGGED_SPEECH_ROLE` is the Protagonist voice), Library 0.15.0.
- **2026-10-03 (Arcs of 30 chapters; goals as budgets):** The first real Holdings test (exported with Export story) stayed on one scene for six chapters: Arc 1's first goal had 25 of its 100 chapters, the writer was told to pace it across them without delivering it early, and a goal reached early stayed active until its segment ended.
  - **Arcs:** every arc is 30 chapters (`ARC_LENGTH`), the standard size the product prices and sells by.
  - **Handover:** a goal reached early hands over to the next in the following chapter, which keeps its own deadline and gains the spare chapters (`activeArcGoal`); once every goal is resolved the last stays active, as reached.
  - **The writer:** the response contract says a goal's chapters are a budget, not a quota (`completionDeadline` is the latest chapter, never a length to fill), that every chapter changes the story's situation and never ends where the last one ended, that the goal is the destination and not the only subject, and that a reached goal (`completionConfirmed`) is written past, never staged again. The next-chapter ideas must move the story on from where the chapter ends.
  - **Edits:** an arc edit can no longer give a goal not yet reached a deadline before the next chapter: `editArcGoals` refuses it in plain words, so no chapter works toward an overdue goal. Before, the edit was saved and the goal recorded missed in the next chapter.
  - **Storage and versions:** schema 27 upgrades nothing older, by the owner's decision (every earlier story was a test story): older storage is kept untouched and the page opens empty. SEN 0.14.0, Library 0.14.0.
- **2026-10-03 (Holdings: the tag system's first information tags):** The owner's number-one long-story problem: by chapter 10 the main character had ten abilities and seven weapons, because nothing remembered what they held. The writer now has two jobs in one call, the chapter and its tags, and no second call is added. Definitions live in [the vocabulary](./ARCHITECTURE_VOCABULARY.md#the-tag-system-the-tiny-sen-language).
  - **Word tags:** `readMarks` reads `[[word: who | what | more]]` (`TAG_WORDS`, with the other spellings each accepts); nothing it reads or cannot read reaches the prose.
  - **Holding changes:** each tag is saved as a `HoldingChangeAttachment` on the sentence it points at (`placeHoldingChanges`); a tag alone in its own paragraph moves to the next. When the chapter commits, every name resolves to a Codex entry with an app-made ID (`resolveHoldingChanges`, `HarnessWorkspaceState.codexEntries`); `MC` is the main character.
  - **Never stored, always worked out:** `deriveHoldings` rebuilds what everyone holds from each chapter's current changes in story order: owned with counts and equipped; learning or learned with a level, and sealed. Plain rules flag what cannot be true and leave it out; the writer's closing list (`closingHoldings`) is checked after each chapter; close names are flagged as possible duplicates.
  - **The writer reads it:** a protected Holdings section (section 8 of the packet) shows the main character first, then the most recently changed others. The SEN Holdings skill (an always-managed `holdings` slot) teaches the tags with placeholders, the pacing rule (use and grow what they have; new things only when the story earns them; finding a manual is not learning it) and the closing list (`mainCharacterHoldings` in the reply, a plain list of names).
  - **The Reader:** a Holdings page beside Fate lists each character's holdings, each change linked to its passage, and the Checks worth testing.
  - **Storage and versions:** schema 26 adds `codexEntries`, `HarnessChapter.holdingChanges` and `closingHoldings`; chapters written before carry over with nothing recorded. SEN 0.13.0, Library 0.13.0.
- **2026-10-02 (Listen voices from the owner's test; Fate Survival paths; a fixed chapter length):** Changes from SENSEI's first real test on the preview.
  - **The main character's own speaker tag.** A real chapter read the main character in both the Protagonist and the Side voice, and often in the Side voice. The protagonist was decided by matching the writer's tag to the main character's full name, so a shortened name of more than one word (a hyphenated given name such as "Jin-Woo" for "Sung Jin-Woo") fell to the Side voice, and the Story Seed's main character carries no nicknames to match. Production instead trusted the writer's role label on each line. Now the writer tags the main character's speech `[[@MC]]` whatever name the prose uses (`MAIN_CHARACTER_SPEAKER_TAG`, SEN Speakers v1.1.0), and the record is saved under the name Story Information gives them. A name tag remains the fallback: a part of one of the main character's names, word for word, counts when no other declared name shares it (`isProtagonist`). Chapters written before keep the voices they were saved with.
  - **Fate Survival offers the four paths.** The Fate page now offers Fate Survival the writer's three suggested directions as well as the reader's own words, as Regular Reader mode does. Nothing is automatic: there is no "Let fate decide", nothing starts chosen, and a chapter still waits for the reader's choice (`validateChapterDirectionChoice` accepts a chapter function in both modes). When the Reader opens the Fate page for a waiting chapter, focus lands on the first path rather than the text box, so a phone keyboard doesn't cover the options.
  - **Chapter length fixed at 50 paragraphs for testing.** `HARNESS_CHAPTER_PARAGRAPH_RANGE` is `{ min: 50, max: 50 }`, so every chapter asks for exactly 50 and the writer's accuracy can be compared chapter to chapter (the Harness Generation page shows "N paragraphs (50 asked)" and flags a miss). The range to return to is 40 to 80; `harnessChapterParagraphTarget` takes a range for that.
- **2026-10-01 (Read Aloud and dialogue speakers):** The owner asked for the prototype's triple-voice narration, remade rather than ported. **Reader:** `HarnessReaderSession` gains Listen and Reader Settings, whose only section is Narration.
  - **Voices:** the Narrator reads prose, the Protagonist voice the main character's spoken lines, the Side voice everyone else's.
  - **The light:** the sentence being spoken is lit through the engine's overlay, and the page follows it unless the reader is scrolling.
  - **Leaving the chapter:** Fate, a new arc's page and the writing screen pause speech; listening carries into the next chapter.
  - **Where it lives:** the engine is SEN's (`useReadAloud` in `./reader-runtime`); the host supplies `readerPreferences` and the Library its voices.
  - **Speakers, the third kind in the tiny SEN language:** the writer puts `[[@Name]]` before speech (SEN Speakers skill, an always-managed `speakers` slot). The HARNESS saves one speaker record per quoted line with whether the speaker is the main character, decided from the attempt's frozen Story Information (`placeSpeakers`, `protagonistNames`). Untagged speech is read in the Side voice and flagged (`speaker_tags_incomplete`). The response schema is unchanged.
  - **Storage and versions:** schema 25 adds `HarnessChapter.speakers`. SEN 0.12.0, Library 0.12.0.
- **2026-10-01 (Arcs planned as they begin):** Following the owner's World Blueprint direction (`NOVEL_EXPANDED.md`), a story made from a Blueprint starts with Arc 1 only: the Foundation takes `initialArcPlan`, the story's length (`plannedArcCount`) and the Blueprint's hidden look-ahead (`initialArcLookahead`, copied onto `HarnessStory.arcLookahead`); the whole-route `arcRoadmap` is gone. Each later arc is planned when the reader begins it (`planNextArc`, which handles every planning state), never inside a chapter write: `arcPlanGap` stops the chapter until then. Only the planner receives the planning context (`HarnessArcRequest.planning`: the arc's place in the length and whether it is final, the last three arcs' goals with their outcomes and a tally of earlier ones, and the look-ahead); it returns a goal draft, a fresh look-ahead and the ending, and the HARNESS assigns arc numbers and goal identities. The chapter writer never sees the look-ahead. Before an arc's first chapter its goals wait on the reader's review in both modes (`arcReviewGap`; Arc 1 is reviewed in the Blueprint): accept, or edit, which counts as the review; a public Regular novel can still accept. `nextArcStep` is the one answer the Reader, the Fate page and the Workshop page read. In the Reader, Next at the end of an arc says "Arc N begins" and opens `BlueprintArcPage`, the World Blueprint's goal section, which plans the arc, shows its goals for review, then writes (Regular) or directs (Survival) its first chapter. A batch pauses at the gate with the reason. Stories without a planned length still plan their next arc at each boundary. Schema 24 drops every stored roadmap copy. SEN 0.11.0, Library 0.11.0.
- **2026-10-01 (The way in, the new Reader, one veil):** A new story now goes Story Seed → World Blueprint → **World Info** → **Reader**. **World Info:** after Start Story, the Story Seed Workshop host opens `?preview=harness-generation&story=<id>&info=<id>`, and the Library surface shows the story's World Info page before its panel (`StoryDetailScreen` with `harnessStoryDisplay`: title, genre, the Seed's tags, the Blueprint logline or else the premise, and the chapter count; no invented art, author or arc). A story with no chapters offers **Start Story** (the World Info page's new `onStart`): the Reader opens and begins Chapter 1 at once (`startOnOpen`; Regular Reader writes it, Fate Survival asks for its direction first). A story with chapters offers Start Reading, or Continue · Ch. N from the host's Reader state. Back from the Reader returns to World Info, and Back from World Info to the panel, which gains a World Info button; "Open in SEN" is now "Open Reader Chamber". The Workshop keeps both pages in the URL (`info`, `read`). **Reader:** `HarnessReaderSession` is rebuilt as just reading. Each paragraph sits on the read-only Text Highlight Engine (block `c{n}-p{i}`) with its Sound Cues (`InlineAudioText`). It keeps Previous and Next, Next at the newest chapter (write, direct, or see how it ended), the Fate page from its header, and the reading place in host Reader state. The packaged Reader Chamber, Codex sheet, Mind Palace, reading settings and themes, reader translation, read-aloud and read marks are gone from it; their saved records are left untouched. With `renderWriting` the host shows a screen while a chapter is written: the Library shows the Aura Veil with the host's agent (`writingAgent`; the Workshop passes Versa), naming the chapter without a percentage it cannot know. **Memory:** the controller takes `chapterMemory: 'after-commit' | 'on-request'`. The Library uses `on-request`, because the Codex waits: the separate memory call no longer runs after each chapter, and the inspection panel's "Recover memory from saved prose" runs it on request. Chapters keep their recaps and Story Seed foundation for continuity. SEN 0.9.0, Library 0.9.0.
- **2026-09-29 (Basic paragraph counter):** The most basic chapter length control, with no story styles yet. For every chapter the HARNESS rolls an exact paragraph count from one range, 50–100 (`HARNESS_CHAPTER_PARAGRAPH_RANGE`, `harnessChapterParagraphTarget`). The roll is seeded by story and chapter number, so chapters vary in length while a retry keeps its number; it is frozen on the Immediate Chapter Request as `chapterScale.paragraphs`. The response schema requires exactly that many paragraphs (`minItems` = `maxItems`), the request says "exactly N paragraph entries" beside the unchanged word range, and `http.ts` refuses a count that is not a whole number from 1 to 600. A chapter that misses is kept, never retried, and flagged (`chapter_paragraphs_off_target`, `metrics.paragraphTarget`); the Workshop chapter row shows the count asked beside the count returned. Schema 23 upgrades schema 22 unchanged. Styles with their own ranges come after this is proven with a real model.
- **2026-09-29 (Tiny SEN language, part 1: the switch):** Chapters now speak the tiny SEN language, with narration and Sound Cues only. **Writer:** the model wraps the one to five words where a sound happens (`[[n|words]]`) and names it in a flat list (`soundCues: [{mark, sound, energy?}]`), choosing only from the story's sound words. The new managed CAPA slot **Sound Cues** (`media-loadout`, after Translation) carries SEN's bundled `SEN_SOUND_CUES_SKILL`; the story's frozen words close it as an example list whose header says the lines show how to mark and are not text for the chapter. A story with no sound words gets no section and no schema field. **Response contract:** `buildHarnessChapterResponseSchema(words)` drops dialogue, manifestations, System Panels, soundscapes and creature events; `soundCues` follows `paragraphs` with the words as an enum and a cap of ten; the contract keeps its no-invented-IDs guard and carries no Sound Cue wording. `http.ts` checks the words against the pack limits and answers 400 otherwise. **HARNESS:** media is frozen before CAPA; acceptance strips every mark from every reply string, then `placeSoundCues` places each cue on whole words (1–5, never in a system line, no overlap, first ten in reading order), picks that word's recording (matching Energy first, stable rotation), and stores a `SoundCueAttachment` span on paragraph `c{n}-p{i}`; set-aside cues become plain warnings. **Storage:** schema 22; `HarnessChapter` keeps paragraphs, prose and metrics, gains `soundCues`, loses `blocks`, `audioMoments` and `soundscapes`; by the product owner's decision there is no upgrade step, so earlier workspaces are kept untouched and the page starts fresh. **Reader:** one narration block per paragraph with its Sound Cues; the memory-based speaker guess is gone until dialogue is rebuilt. `acceptedChapterMedia.ts` and the World Cue intent system are deleted. SEN 0.8.0, Library 0.7.0.
- **2026-09-29 (Tiny SEN language, part 1: foundation):** First half of narration + Sound Cues in the tiny SEN language; how chapters are written is unchanged until part 2. **Sound words:** a Sound Cue recording now names the event it answers (`metadata.sound`, e.g. "blade drawn"), and a catalog declares its words with a 1–5 word example each (`SoundWord`, `validateSoundWords`, `soundVocabulary`). The default library's 92 Sound Cue recordings carry 30 starter words (`src/audio/data/library-sounds.v1.json`) and Energy read from their names. **Studio tags:** SENSEI's tagging system (`src/audio/audioTags.ts`): a Sound Cue's parent is its cue category, a Soundscape's parent is ADVENTURE, AMBIENT, EMOTIONS, FIGHTING, WAR or SPECIAL, and both share Tone, Energy and Tension. **Packs:** a Sound Cue Pack declares `sounds`, every recording names a declared word, and an equipped pack replaces the default Sound Cue set (words and recordings); the frozen Media Loadout carries the attempt's words and the Media Loadout panel lists them. **Marks:** `src/narrative/marks.ts` reads and removes `[[n|words]]` marks, tolerating the slips a writer makes, for part 2's contract. See `MEDIA_LOADOUT.md` and `src/audio/README.md`.
- **2026-09-26 (Story Settings: Translation and Accessibility):** Implements `docs/history/translation-accessibility-audit.md` with one product rule: users configure the story, the HARNESS decides the skills. **Story Settings:** the Story Seed's Settings sheet now holds Story Language (the existing Original Language control, moved there; the Blueprint Review confirms it read-only) and a new Reading Mode (production's Standard, Clear Reading, Easy Read, Literal Reading, `seed.story.optional.chapterWritingStyle`, kept out of every Blueprint request). A new seed takes the account's defaults; a saved seed keeps its own. The story copies both at creation (`HarnessStory.originalLanguage`, `HarnessStory.chapterWritingStyle`), and the novel page's Story Settings panel shows the Story Language and lets the owner change the Reading Mode for chapters still to come, in plain terms. **Managed slots:** `managedBy` now has three kinds. Accessibility (`reading-mode`) loads SEN's bundled skill for the mode (`SEN_READING_MODE_SKILLS`, production's instructions word for word), nothing for Standard. Translation (`story-language`) loads nothing for English, otherwise the one installed `generation` package for the language through `resolveTranslationPackage`, the rule Reader translation now shares; with none the chapter is still written and Story Settings says no specialized writing package is installed; competing packages are refused with a message. Neither slot is ever equipped by hand (`createStory`, `setSkillSlot`, initial loadouts and per-slot uploads all refuse), while Translation packages stay installable (`CapaSlotDefinition.installable`). **Prompt:** the Official Output Requirements travel only when Accessibility or Translation is loaded; a non-English story without a package gets only a one-line Story Language requirement and the machine-facing English rule; an English, Standard chapter carries none (about 320 estimated tokens saved). **Retry:** a failed chapter resends its frozen inputs only while the managed skills the story resolves still match, so a changed Reading Mode or package resolution rebuilds the request. **Surfaces:** the CAPA slot panel and SPP intake render only for a host that sets `showHarnessInternals` (the Workshop does); there the managed slots are read-only inspection cards. The Workshop's Dyslexic Readability sample is retired. Schema 21 removes hand-saved Translation and Accessibility references; a story without a Reading Mode reads as Standard. SEN 0.7.0, Library 0.5.0.
- **2026-09-26 (Library Create):** The Library workspace can open a requested novel: `initialStoryId` selects it once the stored stories load (the pre-hydration snapshot is empty, so the request waits for them; unknown ids fall back to the first story), and `initialFocus: 'next-chapter'` brings its Generate Chapter panel into view and focus once. The Workshop wrapper reads them from `story` and `focus`, which Library Create's Continue and Studio send, and which fixes Story Seed's existing "start story" handoff (it already sent `story=`). No HARNESS concept, contract or persistence changed.
- **2026-09-25 (Fate Phase 2):** Persistent steering is replaced by the reader's
  one-chapter direction. The HARNESS Reader's Alter Fate opens a new SEN **Fate
  page** (`development/FatePage.tsx`, built from `FatePanel.tsx`) showing the
  Destined Ending with its mode's promise, the active Arc Goal with where the
  route stands, and the next chapter's path. In Regular Reader mode fate decides
  by default (Rhythm's automatic pick), and the reader may intervene through four
  paths: one of the writer's three suggested directions, or their own words. Fate
  Survival offers only the reader's own words and writes nothing until they are
  given. In the Reader, Next at the newest chapter continues the story: Regular
  Reader mode writes the next chapter and opens it, Fate Survival goes to the
  direction step first (or writes once a direction is set), and the Fate page
  stays its own action for intervening. `controller.chooseChapterDirection` saves the
  choice as `HarnessStory.nextChapterDirection` for that one chapter; it survives
  failed attempts (a retry resends it, or rebuilds when the reader changed it)
  and is consumed in the same write that commits the chapter, which records its
  `path`. The choice travels only in the Immediate Chapter Request
  (`direction`); the packet's Rhythm section is sent only for automatic paths, so
  reader direction and Rhythm never compete. The Fate mode now reaches the
  writer (`storyDirection.fateMode`) and is fixed once a novel begins. Both modes
  now record Arc Goals honestly: a deadline chapter always commits, and a goal it
  did not achieve is recorded as missed (`ArcGoalCompletion.outcome: 'missed'`);
  the writer is never pushed into claiming success to save a chapter. The mode
  decides what a miss means (see "Fate modes" below): off track in Regular Reader
  mode, where a missed final goal lets the story continue past its roadmap toward
  the same Destined Ending; a broken route in Fate Survival, after which the next
  chapter must end the story and is saved only when its prose shows that ending.
  The writer reports, with a verbatim passage, that a Survival chapter completes
  the story's ending (`storyEnded`, for example a death); a story ends only when
  committed prose shows it, never on a chapter count, a broken route alone, or an
  unsupported claim. Every Fate Survival chapter call carries SEN's Fate Survival
  CAPA skill (`shared/fateSurvivalSkill.ts`) in the new mode-managed Fate slot:
  follow the reader's direction, pursue goals and the ending without forcing
  success, let consequences stand, and write the ending when the route breaks.
  An ended story writes and plans nothing more; no successor destiny is planned.
  The
  retired Survival visibility and Blueprint mystery/thread proposals, their
  packet section, `steerStory`, `revise-history` and the `NEXT CHAPTER ASSIGNMENT`
  wording are removed. Schema 20 migrates saved stories: a direction given since
  the last commit becomes the next chapter's direction, every earlier direction
  is kept read-only as `earlierSteering`, Survival keeps only its switch, and
  frozen attempts drop the retired fields. The Library workspace uses the same
  SEN Fate pieces in place of its steering form and private arc goal card.

- **2026-09-25:** The Story Seed handoff now carries the Blueprint's added world
  detail. Where the author wrote the world, society, or opening location, the
  Foundation keeps the author's line as the fact and adds the Blueprint's
  compatible detail beside it once: `World detail` and `Society detail` lines in
  `worldFacts`, and the opening detail on its own line after the author's opening
  in `openingSituation`. A detail travels only while its fact still reads as it
  did when the detail was generated or last reviewed, so a cleared or rewritten
  fact never receives a detail written for another. Generated supporting
  characters and factions that mention an author's character or faction now reach
  the Foundation as identities instead of being discarded upstream. The
  chapter-writing prompt and the packet's structure are unchanged; stories without
  detail keep identical Foundations. No HARNESS schema change.

- **2026-09-24:** Connected the Destined Ending and the Blueprint's arc roadmap.
  A story started from a reviewed Blueprint receives every arc's saved plan and
  the planned arc count (`StoryFoundationInput.arcRoadmap`/`plannedArcCount`);
  each arc keeps its own revision history (`harnessArcPlan`), and a roadmap
  story never calls the Arc planner at a boundary: after its final arc it stops
  with an explicit "route complete" error. The chapter request still carries
  only the active goal, its deadline, and now the arc's position on the route
  (`plannedArcCount`, `finalArc`); the response contract no longer tells the
  writer never to "complete" the Destined Ending, so the final arc can reach it
  while the ending stays user-owned. `arcGoalEditState` is the one edit rule:
  Regular Reader mode edits the active and upcoming arcs while the novel is
  private (completed arcs and completed goals never change); Fate Survival
  reviews each arc once (edit or `acceptArcGoals`) immediately before it
  begins and locks it when its generation begins (`arcGoalReviews`). The
  Destined Ending and arc count are fixed across Foundation revisions. Arc
  Goals are edited from the novel page's new Blueprint tab (Library
  `NovelBlueprintTab`), which also reopens and saves the novel's World
  Blueprint as a Foundation revision; the Active Arc Goal card and the HARNESS
  Reader Codex now show plans read-only. Schema 19 upgrades saved schema 18
  workspaces in place after the host keeps an untouched copy, instead of
  resetting them.
- **2026-09-24:** The Development Reader Chamber now reads saved HARNESS stories
  as a durable reading experience. `HarnessReaderSession` scopes the Reader
  runtime store to the saved story (story data and writes no longer touch the
  Workshop mock store), opens the last-read chapter, and routes Reader-owned
  fields — place, bookmarks, reader settings, read marks, decorative reveal
  backdrops — to host Reader state (`readerStateRepository`) instead of the
  correction journal. Codex, relationship, and media edits keep using the
  correction journal unchanged; bookmarks or settings already in the journal
  seed Reader state on first open and remain in the journal untouched. Image
  manifestation is disabled in HARNESS sessions (no durable image pipeline) so
  preview art can never be saved into a real story. The Workshop keeps the open
  story in the URL (`&read=<storyId>`) so a reload returns to the Reader. No
  HARNESS schema, prompt, Codex, or generation change; schema stays 18.
  Separately, the host repository no longer discards a workspace it cannot read:
  a stale or unreadable record is copied to a `preserved:` key in the same
  atomic write as the reset, and the Workshop offers it for download.

- **2026-09-23:** The Story Seed handoff reconciles the Seed and Blueprint first,
  so every Blueprint review edit reaches HARNESS through the Seed. Characters and
  factions come only from the Seed's structured lists (Blueprint-generated cast is
  promoted into them); the Blueprint contributes only its background and power
  outline prose. No HARNESS schema change.

- **2026-09-23:** Finished the Story Seed ↔ HARNESS verification; the upstream
  generation configuration is complete. The handoff now sends every Story Seed
  concept once: each character and faction travels only as a Foundation identity
  whose evidence is its single description (authored Seed entries with structured
  aliases, plus Blueprint additions); `characters` is no longer filled from the
  Seed, and `worldFacts` holds only World, Society, Power system, and Main
  Opposition. Title and opening no longer repeat inside World Identity JSON, Blueprint
  copies of authored entities are not re-sent, and storage IDs no longer reach the
  provider. No HARNESS schema change; stories created before this keep their frozen
  Foundation.

- **2026-09-20:** Story Seed Origin routing now retains Fate Survival settings and
  Blueprint mystery/thread proposals in a dedicated Foundation field. The packet
  and provider include one labeled Fate Survival context section only while enabled;
  disabled proposals remain saved but never enter ordinary chapter context. Pressure
  remains in rhythm direction and Destined Ending in story direction, each once;
  the handoff no longer copies any of these through `intendedDirection`. Schema 17
  resets stale Development HARNESS data; Story Seed and Blueprint storage stay intact.

- **2026-09-20:** Replaced the bloated Story Information delivery with the
  compact long-story generation packet. The Story Information Packet is now
  six distinct sections (`shared/context.ts`, `shared/canonicalProjection.ts`)
  budgeted by the one configuration in `shared/packetBudget.ts`: Current
  Story Information projected from stable Foundation fields (no Story Seed
  snapshot, storage record, or repeated copy), Destined Ending and Hard Pins,
  the Active Arc Goal from the existing Arc Plan authority, the persisted Fate
  Pressure rhythm direction with the previous chapter's matching suggestion,
  the latest five saved recaps, and the current canonical state: one latest
  applicable entry per resolved entity, deterministic alias and correction
  merging only, probable near-duplicates flagged for inspection, and
  relevance-ranked selection (current arc, request, cast, recent chapters)
  that compacts older entities before omitting any. Complete prior chapters,
  raw evidence passages, memory extractions, threads, mysteries, timelines, and
  the selection audit no longer reach the provider; the audit lives in packet
  `diagnostics` and the Development diagnostics panel. The Generation Model
  Call presents nine sections once, in order, adds the frozen Mission Reminder
  as its own request field, and returns the exact serialized request size,
  which the attempt persists (`requestMeasurement`). A provider retry resends
  the abandoned attempt's frozen inputs instead of rebuilding them from newer
  state. The per-story context policy and its controls were removed. Schema
  version 16 resets stale Development data.
- **2026-09-20:** Built the story-direction sources the later packet-assembly
  change will draw on, without changing the Generation Model Call inputs.
  `src/narrative/storyDirection.ts` is the shared domain contract: at most
  three user-created Hard Pins with no weighting field, the canonical Fate
  Pressure tiers (`mortal`, `immortal`, `heaven`), the three chapter
  functions, and the recap shape. Hard Pins live on the story and are written
  only through `setHardPins`; the chapter writer and the Arc planner cannot
  create or change them (`ignored_model_story_direction`). Fate Pressure is
  copied from the Story Seed domain value into `StoryFoundationInput` at the
  handoff and is never read from a label. The existing chapter reply gained
  five shallow strings (`recap`, `chapterFunction`, `nextProgression`,
  `nextWorldBuilding`, `nextConflict`); acceptance validates each on its own,
  warns (`optional_recap_omitted`, `optional_rhythm_metadata_omitted`) and
  never rejects prose for them, and the commit saves them once with their chapter.
  Recaps are author-editable (`editChapterRecap`) and survive reload, replay,
  retry, and export. `shared/rhythm.ts` holds the one Fate Pressure
  configuration (Development defaults, ported from the Workshop Scene Rhythm
  Tracker) and the deterministic recommendation persisted on the story at
  every commit and Foundation revision. `shared/missionReminder.ts` builds the
  short Mission Reminder from the Author portion of the frozen CAPA Prompt and
  freezes it on each attempt for inspection. The Library workspace shows the
  permanent Active Arc Goal (from the existing Arc Plan authority), the
  Destined Ending, the Hard Pins editor, Fate Pressure with recent rhythm,
  suggestions and recommendation, the Mission Reminder, and per-chapter
  recaps. Schema version 15 resets stale Development data.
- **2026-09-19:** Registered the six supplied CAPA SPP archives as validated,
  stable Development inventory and connected new Story Seed stories to the
  official Author, Pacing, Continuity, and exact Chinese/Japanese/Korean Style
  packages. Accessibility and Translation remain empty because no approved
  packages were supplied. Package/path/file/archive provenance is frozen with
  generation attempts; ordinary reloads preserve each story's saved equipment.
- **2026-09-17:** Repaired the Generation Model Call response contract. A real
  Gemini chapter request was failing with `400 INVALID_ARGUMENT` while the
  provider compiled the previous response schema (nested SEN blocks with
  conditional System Panel variants plus the full thirteen-category memory
  contract), before any prose was generated. The provider now returns required
  prose, optional title and continuation plan, arc completion, and six shallow
  semantic signal families (`dialogue`, `manifestations`, `systemPanels`,
  `soundscapes`, `soundCues`, `creatureEvents`), each item keyed by an exact
  prose `anchorText`. `shared/chapterSignals.ts` owns that contract; the HARNESS
  splits prose into canonical SEN blocks, matches anchors, validates each signal
  on its own, builds the detailed System Panel, dialogue, manifestation, creature,
  and media structures, resolves soundscapes and Sound Cues through the frozen
  Media Loadout, and assigns every ID and persistence field. An anchor must name
  one place in the chapter: a phrase found in more than one block, or more than
  once inside its block where the signal lands at an offset, is dropped rather
  than attached to the wrong sentence. Chapter memory left
  the chapter-writing call entirely: after a chapter commits, the existing
  separate extraction runs automatically through the host adapter, and its
  outcome never changes the committed chapter. Persisted shapes did not change,
  so the schema version stays at 11.
- **2026-09-16:** Accepted Word (`.docx`) SPP instruction files, installing only
  their extracted document text, and added a direct SPP upload to every CAPA skill
  slot that locks the destination, validates the package against it, and equips
  the installed skill for the open story in one flow. See
  [SPP_IMPORT.md](./SPP_IMPORT.md).
- **2026-09-16:** Added the separate Media Loadout and runtime catalog path.
  Registered Media Packs, host-account reward entitlements, and two independent
  story equipment slots remain distinct from CAPA and from each other. HARNESS
  consumes current entitlement snapshots without granting or persisting them,
  and rechecks optional expiration before equipment and resolution. Attempt snapshots freeze
  exact pack/version/source/digest catalogs outside every provider request;
  the existing Cue resolver and the canonical soundscape track contract resolve
  only authorized entries after generation. Chapters persist resolved media and
  provenance through reload, replay, later reward/equipment changes, Reader
  adaptation, and user-controlled shared-player playback. Semantic music region
  participates in deterministic matching without exposing catalogs. Schema version 11
  resets stale Development data. See [MEDIA_LOADOUT.md](./MEDIA_LOADOUT.md).
- **2026-09-16:** Removed Media from CAPA. The schema now has exactly six
  ordered writing slots: Author, Pacing, Continuity, Style, Accessibility, and
  Translation. Media skills can no longer be installed, equipped, assembled,
  or frozen; stale Development workspace and SPP inventory data reset through
  schema version 10 and the v3 inventory key. The permanent HARNESS response
  contract now owns the compact semantic handoff for System Panels,
  manifestations, dialogue/narration, soundscape and cue intent, and creature
  events. Existing normalization, catalog resolution, persistence, recovery,
  and Reader playback remained unchanged in that Phase 0 change; the later
  runtime implementation is documented separately above.
- **2026-09-16:** Made Translation glossary normalization deterministic, rejected canonical/alias collisions, matched only story-facing text and chapter directions, froze selected resource provenance, and separated imported Translation selections by language and glossary identity. Schema version 9 intentionally resets stale Development data.
- **2026-09-15:** Restored HARNESS Generated Chapters to the canonical SEN
  `StoryBlock` and media pathway. Response acceptance now normalizes optional
  dialogue, manifestation, music, atmosphere, beast-event, System Panel, and
  World Cue structures through the existing Chapter Generation and Library Cue
  validators; derives the one readable prose result from accepted block text;
  persists accepted blocks and application-resolved cues at every chapter
  checkpoint; and passes them intact into Reader Chamber. Schema version 6
  intentionally resets stale Development data. Author Skill V1 is unchanged;
  the structured pathway is independent of CAPA loadout slots.
- **2026-09-15:** Integrated the neutral SEN Arc Goals authority with the
  current CAPA Prompt / Story Information Packet generation boundary. Arc
  requirements remain Harness mechanics and do not modify Author Skill V1.
- **2026-09-15:** Corrected Arc Goals deadline enforcement, revision-based
  editing, schema reset behavior, and the normal generation response contract.
  Alter Fate routing remains outside this implementation. See
  [ownership and integration boundaries](../arc-goals/README.md).
- **2026-09-14:** Removed the compatibility leftovers from the CAPA / Story
  Information separation. The frozen Story Information Packet now lives on
  `HarnessGenerationAttempt.storyInformation` (was `contextSnapshot`) and
  `HarnessChapter.storyInformationPacketId` (was `contextSnapshotId`), with
  no alias. `HARNESS_GENERATION_SCHEMA_VERSION` moved to 4; saved local
  storage at any other version is reset to an empty workspace, never
  migrated (`readHarnessWorkspaceState` replaces `migrateHarnessWorkspaceState`,
  which used to carry Phase 2 data forward). This repository does not
  preserve backward compatibility for persisted shapes.
- **2026-09-13:** Implemented the canonical CAPA / Story Information separation.
  `CAPA_SCHEMA` is the single ordered slot registry; `assembleCapaPrompt` builds
  every active generation skill, Author included, into one CAPA Prompt in schema
  order; `compileStoryInformationPacket` produces a packet with no skill
  instructions; `buildImmediateChapterRequest` separates the current chapter's
  instruction from persistent steering. The Generation Model Call now receives
  the CAPA Prompt as its authoring instruction and the packet plus immediate
  request as its generation content, with the Harness response contract kept as
  a distinct block. One Gemini call, context selection, checkpoints, memory
  processing, and commits are unchanged.
- **2026-09-15:** Added permanent HARNESS Official Output Requirements after the
  replaceable CAPA Skills. They make equipped Translation and Accessibility
  instructions mandatory for reader-facing content while keeping machine-facing
  media and effect payloads in canonical English. Development displays the fixed
  section as a locked slot-shaped card after the six CAPA slots so it can be inspected without
  pretending it is an installable or replaceable CAPA Skill.
- **2026-09-13:** Established the canonical architecture vocabulary in
  [ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md) (HARNESS, CAPA,
  CAPA Schema, CAPA Skill, CAPA Prompt, Story Information, Story Information
  Packet, Immediate Chapter Request, Generation Model Call, Generated
  Chapter) and mapped existing names onto it, including the mismatches
  between it and `HarnessContextSnapshot`, the installable-skill system,
  and `buildHarnessGenerationPrompt`. No generation behavior, persisted
  contracts, or the Arc system changed.
- **2026-09-13:** Connected official SPP intake in the Development host to the existing
  installed-skill inventory, story slots, audited context and generation prompt.
  Added validated file inspection, explicit text selection, local installation and
  package provenance. Reduced repeated nested provider schema variants after a live
  baseline request exposed Gemini schema rejection; story acceptance stays unchanged.

- **2026-09-13:** Replaced the inherited placeholder author wording with the
  founder-approved **Author Skill V1**: a focused Mission, Boundaries,
  Philosophy, Reference shelf, and Remember statement. Style, pacing,
  continuity, structured-output behavior, and Harness mechanics remain outside the skill.
- **2026-09-12:** Promoted the source SEN light-novel author direction from a
  hidden generic server prompt into the bundled, visible, replaceable **Author**
  skill. Existing and new local Harness stories equip its exact version, the
  provider receives it first, and the skill card exposes its actual instructions.
- **2026-09-12:** Added the missing installable-skill layer: six visible per-story
  slots, host-injected versioned manifests, durable loadout references, frozen
  request snapshots, generation-instruction delivery, missing-install protection,
  and Workshop-only sample manifests. These skills are explicitly separate from
  the always-on deterministic capability registry.
- **2026-09-11:** Applied the supplied SEN Manifesting mark to the Harness's
  active creation controls. Checkpoint, provider, generation, and persistence
  behavior remain unchanged.
- **2026-09-06:** Addressed PR #175 review: scoped unsaved steering to the selected
  story, blocked steering at pending checkpoints, retained semantic details in
  protected chapter context, verified SEN quantity history, and isolated historical
  speaker resolution from later identities and corrections. Added focused regressions.
- **2026-09-06:** Added persistent future/history steering, priority context for
  author direction and mechanical continuity, bounded original-evidence lookup,
  partial-event repair, stable character identities, and a derived SEN Reader,
  Codex, and System-card session. Tested deterministic continuation through 50
  chapters and a real Gemini run with corrective checkpoint branches. See
  `CONTINUATION_EVALUATION.md` for the evidence and limitations.

- **2026-09-06:** Protected every author correction and the latest committed
  chapter from context trimming. These mandatory inputs may exceed the soft
  selection target, with the excess explained in the audit; optional history
  is omitted first. A missing head chapter stops generation before a provider
  call. Added a derived current-thread view ordered by chapter/event evidence,
  not replay timestamps: resolved threads leave the open handoff, supported
  reopenings remain possible, and original thread history stays intact.
- **2026-09-05:** Added typed, evidence-backed chapter memory, Foundation identity
  references, and explicit recovery from saved prose. Generation and recovery use
  the same categorized memory contract. Saving prose and interpreting it now have
  separate inspection states; incomplete interpretation remains visible.
- **2026-09-05:** Corrected generation context priorities: newest author changes
  precede chapter prose and derived records; recent prose is selected newest
  first and presented chronologically. Requests distinguish Foundation facts,
  future plans, explicit changes, and frozen source provenance. Arc promises
  remain arc-scale direction. Correction targets and budget omissions remain
  inspectable at the provider boundary.
- **2026-08-29:** Created the independent Harness Generation tab. It owns a
  premise-first Foundation, revision snapshots, a one-call Gemini adapter,
  tolerant prose acceptance, append-only semantic event evidence, versioned
  IndexedDB persistence, independently durable checkpoints, local export, and
  Chapter 1 → Chapter 2 context.
- **2026-08-29:** Added the in-place Phase 3 database migration, versioned
  deterministic capability registry, provenance-backed canonical views,
  append-only corrections, audited context selection, internal Codex/System
  intents, idempotent replay, and persisted sequential batches. Prose and raw
  semantic evidence remain the authority beneath every derived record.
- **2026-09-03:** Connected the Workshop experience through a one-way Story
  Seed handoff. Selecting a saved seed copies the seed and optional Blueprint
  into a frozen Harness Foundation; manual premise entry remains a secondary
  development fallback.

## Implementation inventory and boundaries
- `development/` contains the active client workspace.
- `shared/` owns the portable Foundation, response boundary, context compiler,
  controller, and browser repository contracts.
- `src/server/harness-generation/` owns provider configuration, prompt and API
  behavior. It is intentionally outside the published package.
- `src/workshop/previews/harness-generation/` is Workshop-only mounting.

The portable package entry is `@seihouse/sen/harness-generation`. It may use
generic SEN UI primitives and accept a neutral, host-injected Story Seed source,
  but it never imports Story Seed internals. The Workshop preview owns the only
Story Seed-to-Foundation adapter. HARNESS reuses Chapter Generation's public
SEN block normalization and accepted-media contracts, but not its legacy
generation cycle, prompts, planning, processing, or persistence.
`development/HarnessReaderSession.tsx` is the Reader's frame, filling the
screen: the top bar (`ReaderTopBar.tsx`, whose story and chapter open the chapter
list), the bottom bar (`ReaderBottomBar.tsx`: Listen, Codex, the chapter arrows
with Fate between them), Reader Settings and the Fate, Holdings and arc pages. The chapter on screen is its body (`readerChapterBody.ts`),
prose by default (`ProseChapterBody.tsx`: the read-only Highlight Engine with
the Sound Cues, in the reader's text settings). It owns no second persistence
path; the reading place is host Reader state and the text settings are a device
preference.
`shared/senAdapter.ts` still derives the SEN story the controller's reader-edit
path uses, though the Reader no longer edits. SEN stays provider-neutral.

## Durable generation behavior

1. Persist `request_started` before a provider request.
2. Persist the raw provider response immediately after it returns.
3. Accept the paragraphs as the authoritative chapter, strip every mark from
   the reply, place each Sound Cue on the words its mark wraps with a
   recording from the frozen Media Loadout, and persist that accepted chapter
   draft. A malformed or unplaceable cue becomes a warning, never lost prose.
4. Read the accepted chapter for its tags (one tagger call) and persist the
   `tagged` checkpoint. A retry from the prose checkpoint tags; a retry from
   the tagging checkpoint commits, without asking the tagger again.
5. Atomically append a chapter with its paragraphs and placed Sound Cues,
   attempt receipt, and updated story head. A rewrite first takes the story
   back to just before the chapter it replaces, in the same write.
6. Run the Holdings fixer on the new chapter. Its outcome is saved as the
   chapter's `fixer` record; a failed call or write leaves the committed
   chapter exactly as it was.

Only a committed chapter enters the next context snapshot.

**A stale tab never overwrites.** Every save carries the workspace revision it
was read at and lands, atomically, only while storage is still there; another
tab's save since makes it refuse with `HarnessWorkspaceConflictError`, writing
nothing, until the tab reloads.

**Storage resets preserve data.** A saved workspace this build cannot read (an
older schema version or an unreadable shape; schema 22 deliberately upgrades
nothing earlier) is still reset for this build, but
the host IndexedDB repository first copies the untouched record to a
`preserved:v<version>:<time>` key in the same transaction, and the Workshop
lists it with a download control. Reader state (the reading place) is stored
separately and is never affected by a HARNESS reset. If storage fails,
the controller retains the completed local checkpoint, blocks continuation,
and retries persistence without another model call.

## Phase 3 extension boundary

The SEN adapter translates supported
canonical character, location, faction, artifact and mechanical facts to existing
Reader contracts as story memory, world rules and character abilities. It never
turns extracted memory into a reader-visible System Panel: a panel exists only
where the chapter itself established one through a System Panel signal. Unknown relationships, speakers and unsupported effects remain
unknown. Exact, uniquely anchored speech receives the known speaker's role;
host-supplied cast identity establishes the main character without guessing from
paragraph order. Mechanical rows and status stats use the same preserved value.

## CAPA boundary

Development's complete SPP import flow and validation evidence are documented in
[SPP_IMPORT.md](./SPP_IMPORT.md). Terms are defined in
[ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md).

CAPA Skills are not the deterministic capability handlers above. Capability handlers
are permanent internal machinery that interprets committed evidence. CAPA Skills are
versioned packages in one of the eight CAPA Schema slots (`CAPA_SCHEMA` in
`shared/skills.ts`): Author, Pacing, Fate, Continuity, Style, Accessibility,
Translation, and Sound Cues. Author, Pacing, Continuity and Style are equipped per
story. Fate, Accessibility, Translation and Sound Cues are managed: the HARNESS resolves
them from the story's Fate mode, Reading Mode, Story Language and Media Loadout at every
loadout freeze, and nobody equips them. Users configure those through Story Settings and
the Media Loadout and never see a slot. The Media Loadout itself is not a CAPA slot:
only its sound words reach the writer, as the Sound Cues skill's list. The bundled SEN Novel Author is a normal, replaceable generation skill, not
hidden creative Harness behavior. It is equipped for new and previously saved local
stories.

The host supplies validated `HarnessSkillManifest` records. The Harness persists an
exact `id` and `version` reference in the story and refuses to generate if a
referenced version is unavailable. For each attempt it freezes the equipped manifests
in schema order and assembles every generation skill, Author first, once, into one
CAPA Prompt (`assembleCapaPrompt`). The permanent HARNESS Official Output Requirements
follow the skills only when a chapter needs them (an Accessibility or Translation skill is
loaded, or the story is not written in English) and are shown as a locked inspection card
in Development; they are not a CAPA Skill and cannot be equipped, removed, or reordered. That CAPA Prompt is frozen on the attempt and is
the model's complete authoring instruction; it never enters the Story Information
Packet. Only manifests declaring the `generation` application contribute text.
Reader and post-commit applications may be recorded in the frozen CAPA Prompt's
skill inventory for their owning host runtime and send nothing to the writing model.

When any loaded skill teaches a tag (Sound Cues, Soundtrack, Speakers, Holdings, Appearance), the
HARNESS tag rules (`HARNESS_TAG_RULES`) come once, just before the first of
them: what every tag kind shares, so no kind repeats it. Like the official
requirements they are HARNESS text, never a skill.

The separate permanent `HARNESS_RESPONSE_CONTRACT` describes the chapter reply:
the paragraphs, the Arc Goal and ending evidence, the recap and the three
suggestions, and the guard against invented IDs, URLs and assets. It carries no
tag wording: how to tag lives only in the CAPA skills, and every signal travels
as a tag inside `paragraphs`, so the response schema
(`buildHarnessChapterResponseSchema`) has no list of signals. It is fixed
HARNESS infrastructure, never an installable skill or loadout slot, and
contains no asset catalog, R2 path, filename, track list, unlocked-resource
list, or pack contents. HARNESS retains validation, placement, generated IDs,
ordering, persistence, and checkpoint recovery; sound words stay
machine-facing English while the words a sound tag wraps stay in the story's
language. Every block the writer reads is shown, from the live code, on the
Workshop's Writer Instructions page.

The Workshop's sample skill manifests remain preview data only. Media Packs use
the separate inventory and runtime boundary documented in
[MEDIA_LOADOUT.md](./MEDIA_LOADOUT.md). Development includes only two tiny test
catalog fixtures and a Workshop-owned temporary test reward adapter; it does not define product
packs, marketplace behavior, currency, scheduling, or a reward economy.

## Chapter direction and continuation

The reader directs one chapter at a time. `controller.chooseChapterDirection(id,
choice)` saves the path for the next chapter only: one of Rhythm's three chapter
functions with the idea the reader picked, or the reader's own direction in
their words (either mode). `null` returns Regular Reader mode to fate's
automatic pick. The choice travels in the Immediate Chapter Request, stays
through failed attempts, and is consumed when that chapter commits; the committed
chapter records the `path` it took. Fate Survival requires a direction for every
chapter and cannot run batches. Corrections, not directions, change established
canon; Foundation/Blueprint future plans are subordinate proposals.

In the HARNESS Reader, Next at the newest chapter continues the story
(`ReaderChamber`'s `continueAfterLatest`, supplied by `HarnessReaderSession`):
Regular Reader mode writes the next chapter, through Rhythm unless the reader
chose a path, and opens it; Fate Survival opens the Fate panel at the direction
step, or writes once a direction is set; an ended story shows how it ended. On
earlier chapters Next only navigates, and a swipe never writes. The Fate panel opens
over the chapter, which stays readable beside or above it. The Fate page and
Next share one writer (`useNextChapterWriter`), so a failed write reports the same
error in both places and keeps the chosen direction for the retry.

### Fate modes

Both modes record every Arc Goal honestly. A goal is achieved only when the writer
reports it with a verbatim passage from the chapter; when its deadline chapter
commits without that, it is recorded as missed. A chapter never waits for the
writer to claim a goal. The one chapter that can be held back is the one a broken
Fate Survival route requires to end the story: `missingRequiredEnding` keeps it
uncommitted until its prose shows that ending. `commitHarnessArc` applies the
rest, in the same write as the chapter:

| | Regular Reader | Fate Survival |
| --- | --- | --- |
| Who directs | Fate (Rhythm) by default; the reader may take any chapter | The reader, every chapter |
| Fate CAPA skill | None: the mode-managed Fate slot stays empty | SEN Fate Survival, loaded on every chapter call |
| Destined Ending | Guaranteed as the standing direction: every chapter pursues it; nothing forces the prose to reach it | Not guaranteed |
| A missed goal | The story is off track; the next goal begins; no consequence | Counted within its arc; the next goal begins |
| Route breaks | Never | When at least half of one arc's goals are missed (`goalsThatBreakRoute`: 1 of 1 or 2, 2 of 3 or 4, 3 of 5) or the final goal is missed (`HarnessStory.brokenRoute`) |
| Missed final goal | No ending is recorded. The story continues past its roadmap with that goal still its destination and no deadline (`route.status: 'past-final-goal'`); no arc or goal is invented. When the prose reaches the Destined Ending the story concludes (`reached-after-final-goal-missed`) | The route breaks (`final-goal-missed`) |
| After the route breaks | — | The next chapter must end the story (`route.status: 'broken'`, and the Fate Survival skill's ending rule). The reader still directs it. It commits only when its prose shows the ending (`storyEnded` with a verbatim passage); otherwise it is not saved, its direction stays in place, and the reader tries again. No recovery call is made. It may pass the arc's planned end but never begins, plans, reviews or locks another arc. A chapter that breaks the route and already shows a genuine ending ends the story at once |
| The story ends | The final goal achieved (`final-goal-completed`) | Only when committed prose shows it: the final goal achieved, or the writer's verbatim passage showing the ending (`story-ended`: a fatal ending at any point, or the ending a broken route requires). A chapter count, a broken route alone, or an unsupported claim never ends it |

After `HarnessStory.conclusion` is set no chapter is written or planned. How a
Regular reader might later change the Destined Ending, and any "continue this
series" flow after an ending, are deliberately not decided here.

The ordinary cycle is prepare context → one writing call → read the chapter for
its tags → commit → settle the chapter's holdings → continue. There is no
routine literary review loop or full-novel planning requirement. The packet
carries the latest five recaps, the world record, what each character has now,
who is already on the page, and the author's corrections; chapter prose never
enters it, and the audit records every omission with its reason.

The Reader preview derives chapter-scoped memory. Its reading settings
and edits are session-local; durable story changes belong to the reader's chapter
directions and corrections. Fully malformed optional output still requires usable source evidence;
replay does not invent missing facts or call the model again.

## Generation Model Call and inspection

Each attempt freezes the three HARNESS-prepared inputs and shows them separately:
the **Frozen CAPA Prompt**, the **Frozen Story Information Packet** (with its
**Included / Omitted** lists), and the **Immediate Chapter Request**. The packet
shows the exact selected Foundation revision, source Seed and optional Blueprint,
corrections (with target evidence), retained chapters, the reader's direction, and
selection reasons; it contains no skill instructions.

`buildHarnessGenerationPrompt` combines them into one provider call: the system
instruction is the CAPA Prompt followed by the distinct Harness response and
evidence contract; the generation content is the packet (Foundation, explicit
author changes, committed evidence, frozen source, coverage/omissions, persistent
author direction, mechanical continuity) followed by the Immediate Chapter Request
(chapter number, opening or continuation, and the assignment to act on now). The
coverage section states whether the actual last committed chapter was included.

Selection protects steering, Foundation, corrections with their target evidence,
quantified observations, and the latest committed chapter. These mandatory inputs
may exceed the soft budget. Recent prose is selected newest first before optional
compact developments, bounded lookup, canonical records, and derived handoff.
Optional items are included whole when they fit or omitted with a reason. The
budget counts estimated selected content, not exact provider tokens or prompt
formatting overhead. A missing latest chapter blocks continuation instead of
substituting older history.

The latest applicable correction overrides earlier conflicting evidence. Active
Foundation edits take precedence over its frozen source snapshot; explicit Seed
values take precedence over generated Blueprint elaboration. Opening setup is
for the story opening, while committed prose anchors continuation. Arc promises,
mysteries, and endings are future direction, not chapter deadlines or already
established events. Existing saved snapshots remain readable without migration.

## Retired memory call and historical state

The separate automatic/on-request memory model call, client method, server operation,
and Workshop recovery control are removed. Chapters no longer receive the recurring
“story memory incomplete” warning. Chapter writing, acceptance, saving, replay and the
Reader retain their existing paths. Sound Cues, speakers and Holdings come from tags;
recaps come from the chapter response.

Current Canonical State and its deterministic readers remain. Existing committed events,
canonical records, corrections and previously saved chapter checkpoints are still read;
the removed call produces no new event records. Historical `memoryRecoveries` requests,
raw replies, usage receipts and status fields remain stored and readable, but are never
resumed or applied. No stored data or schema version changes, and no migration is needed.
Deterministic replay of existing events remains available without a provider call.
Tests seed historical records directly to check their readers and saved-story compatibility.

## Implementation inventory and boundaries
The active `development/` and `shared/` implementation is exposed through its
package barrel and the host server route. Workshop previews and controls remain
separate from the packages and app.

### 2026-09-06 — Library UI ownership migration

Reusable presentation now comes from the canonical Library UI package. Portable SEN surfaces resolve presentation through the host provider; the first-party Workshop supplies LibraryPresentationProvider. Domain, generation, persistence, media, and locked reference sources are unchanged.

### 2026-09-20 — Story Seed Arc handoff

Story Seed initializes the existing Hard Pin authority with zero to three
author-owned entries and the existing Arc Plan authority with one initial goal.
Only the active goal and its deadline are presented to the generation model;
the full Arc Plan remains internal. Fun Settings are optional Current Story
Information and cannot override canon, CAPA, ending, pins, or the current goal.
They do not enter canonical state or CAPA. The saved HARNESS schema is now 18;
existing Development reset behavior rejects stale state.

### 2026-10-10 — Reader audio mute and synchronized Master faders

The shared Reader note is white for sound on and gray when muted or actively scrolling, without a mute slash. Tap mutes without disabling Master or losing its volume. Hold or right-click opens a compact Master fader; it and the Settings fader read and update the same saved mixer state. Zero volume keeps the icon visible, and unmute restores the last nonzero level, including after preference reload. Only switching Master off in Reader Settings hides the note. Narration retains its independent controls. NovelExpanded and the Workshop share the canonical host composition; Workshop Sound on uses the direct click gesture to unlock playback.

### 2026-10-10 — Narration speed in the playback pill

The bottom bar places the narration speed selector between Previous sentence and Next sentence, mirroring the chapter pill. Its compact labels use fractions (½, ¾, 1¼, 1½, 1¾), without a multiplier symbol, while keeping the exact saved rates and explicit spoken labels. The speed and chapter selectors share popup styling, current-selection marks, keyboard focus and dismissal. Half speed is supported by the narration engine and saved preferences, and also appears in Reader Settings. The selector uses the existing saved Read Aloud rate, stays in sync with Reader Settings, and appears before narration starts. The app and Workshop render the same ReaderBottomBar.

### 2026-10-10 — Chapter picker in the bottom bar

The chapter pill shows only the current chapter number, without a total, and opens a scrollable list of saved chapter numbers and full titles, with the current chapter marked. Selection uses the Reader's existing chapter navigation and saves the reading place; Previous and Next retain their existing behavior, including the next writing step. The app and Workshop share this picker, and both control pills keep their compact layout on phones.

### 2026-10-10 — Standard Reader bar visual refinement

The shared app and Workshop Reader bar uses 48px main actions (44px on narrow phones), quiet charcoal secondary fills, thin borders and a cyan Codex accent without a persistent glow. Matching compact control pills remain centered between the three action anchors, with extended vertical hit areas and consistent hover, pressed and keyboard focus states. Narration, chapter selection and saved preferences retain their existing behavior.

### 2026-10-10 — Matching standard Reader top bar

The shared Reader top bar matches the bottom bar's quiet charcoal buttons, thin borders, responsive 48/44px action sizes and interaction states. A readable sentence-case story title and subdued chapter label clarify the hierarchy. The Familiar remains beside Settings on the right; sticky behavior and all actions are unchanged.

### 2026-10-10 — Matching Reader selector menus

Chapter and narration speed menus share a restrained dark surface, thin border, rounded corners, quiet section heading and consistent 44px minimum rows. Current selections use a neutral highlight with a small cyan check. Existing selection, saved preferences, scrolling, focus and dismissal behavior remain in the canonical shared Reader bar.

### 2026-10-10 — Matching selector rims

Chapter and narration speed menus share a subtle 2px perimeter using the navigation seam's gold-to-cyan palette. The decorative rim follows their rounded corners without receiving pointer events; the compact audio capsule stays unchanged.

### 2026-10-10 — Library navigation seams

Reader bars and panel edges that meet the chapter use Library navigation's stationary 3px gold-to-cyan seam, including its fine highlight. The top bar's lower edge and bottom bar's upper edge run horizontally; Reader panels use an upper edge on mobile and a left edge on desktop. Decoration lives in the Library skin, does not receive pointer events or change layout, and falls back to normal system borders in forced colors.

### 2026-10-10 — Compact quick volume

Holding the soundtrack note reveals a 48px-wide vertical volume capsule immediately above the note, using the same glass as Reader menus. The visible label and percentage box are removed; the native slider retains its accessible Master volume name and percentage value, keyboard adjustment, Escape/focus return and outside-tap dismissal. Tap still mutes independently, zero volume never hides the note, and only Settings' Master switch removes it. Volume still reads and writes the original mixer shared with Settings. Reduced motion skips the short reveal.

### 2026-10-10 — Supporting Reader chrome

The default Reader is quiet infrastructure around the story's System Panels and Manifestations; distinctive custom looks belong in the Workshop. Codex now uses the same blue-gray glass, pale icon and rim as its neighboring controls. Its spectrum halo is a faint, close accent (18% resting opacity, 3px extension, 6px blur), with restrained interaction feedback.

### 2026-10-10 — Quieter Codex face, clearer halo

The Codex face is now smoked graphite with an ivory icon and neutral rim. The shared Library spectrum remains its color accent: the halo extends 8px beyond the button, with 10px blur and 80% resting opacity. The existing reduced-motion and forced-colors treatments remain in place.

### 2026-10-10 — Codex badge color and spectrum halo

The Library Reader skin gives the central Codex action a violet-to-gold glass face, pale-gold book icon and warm rim. Its small halo uses Library UI's header emblem spectrum palette and shared 18-second flow animation. Decorative layers do not receive pointer events or change layout; reduced motion keeps the halo still and forced colors removes the decoration. The portable Reader's action and host boundary stay unchanged.

### 2026-10-10 — Library glass in the Reader

Library's `reader-glass.css`, included by its package stylesheet, skins the portable Reader's material hooks with the Familiar action dock's blue-gray gradient, warm rim and cool inset highlight. Top and bottom bars, secondary controls, chapter/speed menus and Reader panels share that treatment; settings and long menus use a denser body for contrast. The prose background, layout, actions and persistence stay unchanged. Nested controls do not add backdrop filters; touch devices and reduced-transparency preferences use a denser fallback. Library owns the skin, so SEN does not import Library styling and hosts can supply their own material. App and Workshop use the same source.

### 2026-10-10 — Restored reading font choices

The shared host catalogue offers Literata, Rubik and System Mono alongside Noto Serif, with SEIHouse Sans retained as the default and reset choice. Title choices use the shorter Ink, Soft, Edge and Wide labels without changing saved identifiers. Font picker labels use the interface font so opening Settings does not fetch unused alternatives. Literata uses the existing Google Fonts stylesheet with swap fallback and downloads when selected; Rubik can reuse the interface font, and System Mono uses installed system faces. App regression coverage checks selection, persistence, reset and unstyled picker labels.

### 2026-10-10 — Reader Settings hierarchy and local presentation

Reader Settings now exposes Text, Audio and Narration as accessible category tabs, with the heading, category switcher and Close button outside the scrolling content. Each category starts at the top when selected. Text groups typefaces separately from size, spacing and weight; the sample block is removed because the chapter is the live preview, including with the existing half-height sheet. Audio puts the original mixer’s Master switch and volume first, keeps individual layers and the sleep timer, and places presets and scene choices below. Narration leads with speed, then grouped voice selectors and previews. Host-scoped styling uses the same quiet surfaces, borders and cyan accents as the Reader bars; the audio-player source and all preference/storage contracts remain unchanged. The app and Workshop share this composition. Regression coverage verifies tab changes preserve saved speed and presets, the sample is absent, and the existing Master/quick-volume and app Reader flows still work.

### 2026-10-11 — Connected audio glass and Reader scrollbars

The quick-volume capsule now grows from behind the note as one dense glass surface. The idle, unmuted note has a softer glass backing; both muted and scrolling ghost states leave only the gray glyph. The open capsule supplies its own backing, without stacking two surfaces. Reduced motion, reduced transparency and forced colors keep their respective fallbacks.

Chapter and narration menus, Settings and Fate reuse SEIHouse UI's overlay scrollbar with Library navigation's gold thumb and scroll/drag-only visibility. The chapter keeps its original document scroll owner, with a scoped gold native scrollbar that hides at rest and cleans up on exit. Half-height panels size their scrollport to the visible area so the thumb and the last settings remain reachable. App and Workshop use the same Reader implementation.

### 2026-10-11 — Opaque Reader bars

The Library Reader top and bottom bars retain their blue-gray finish and navigation seams with fully opaque gradient stops in every transparency mode. Chapter words cannot show through either bar. The host explicitly defaults Master audio on; saved Settings choices still take precedence.

### 2026-10-11 — Scroll-aware top bar and aligned audio note

The top bar slides away after intentional downward scrolling and returns on upward scrolling, near the chapter top, when its controls receive focus, or when the chapter changes. Reader panels keep it available. It follows the same actual scroll container as narration, ignores small direction changes and elastic overscroll, preserves the sticky layout slot, and respects reduced motion. The audio note is anchored to the center of the Fate action instead of an independent page-edge inset, including when quick volume expands.

### 2026-10-11 — Quieter speed control and a glass Back to narration

From SENSEI: between the sentence skips, normal speed shows a dim divider (∶) instead of "1"; a changed speed still shows its value (½, 1½…), and the picker and its spoken label are unchanged. Back to narration floats in the same resting glass as the story audio note (Library's `reader-glass-float` skin) instead of a ghost outline.

### 2026-10-14 — A lighter dip under Listen, louder Sound Cues

From SENSEI on mobile: with Listen reading aloud, Soundscapes and Atmosphere were inaudible even at full level, and Sound Cues were barely audible. Phones already lower a page's sound while their built-in speech voice talks, and the Reader's own dip (`LISTEN_DUCK`, music and atmosphere to 40%) stacked on top. The Reader's dip is now light (`LISTEN_DUCK` 0.25, to 75%), and a cue's Energy scales its level less (`SOUND_CUE_ENERGY_VOLUME`: low 0.8, medium 0.9, high 1; was 0.6, 0.8, 1).

### 2026-10-29 — Named Reader colors

From SENSEI, step one toward themed Reader Chambers: every color the Reader painted by hand (about 380 places across the bars, pickers, Fate, Codex, authoring, settings and the audio note) now points at a named role in `reader-colors.css`, and Library's Reader blue names its own control, ink, focus and settings colors in `reader-glass.css`. The defaults are the old colors: screenshots of the Reader, Codex, Settings, chapter list and playback picker at phone and desktop sizes match pixel for pixel. Setting the roles recolors the whole Reader, which is what a future Face pack will do.

