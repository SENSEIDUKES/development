# NovelExpanded

> **Read this before any product work.** It is the product owner's direction for
> NovelExpanded, written down so every session starts from it. When a task and
> this document disagree, ask the owner. Do not guess, and do not bring back an
> older design because it used to exist.

- **Created:** 2026-09-29
- **Last updated:** 2026-10-01
- **Owner:** SENSEI, SEIHouse Productions

## What NovelExpanded is

NovelExpanded (NovelExpanded.com) is SEIHouse's own app for expanded novels. It is
the Library, SEIHouse's first-party host, built on SEN, the portable expanded-novel
engine. The [README](./README.md) explains that split and which lane owns what.

**The user is a reader who directs. The chapter should arrive right without them
touching anything.**

The creator is the user. Most people come because their fantasy is being fulfilled
in front of them: they direct it, create it and are entertained by it, and it never
feels like work. They read, decide what happens next, and hit Next Chapter.

## The four pages

The whole product is one straight line:

1. **Home:** the reader's stories.
2. **Story Seed / World Blueprint:** the reader fills in what they care about, and AI
   fills in whatever they don't want to write. Story Settings live here.
3. **Story View:** create the cover art, see the story, and Enter.
4. **Reader Chamber:** just reading. Chapters arrive here.

## The World Blueprint

The World Blueprint is the novel's transferable core. Keep this in mind for every
Blueprint, arc and sharing decision.

- **It is what moves between users.** A creator who publishes a novel publicly can
  let readers take the story and make their own version of it. The reader takes the
  creator's Blueprint, keeps the same Story Seed, changes whatever they want inside
  the Blueprint, and goes on with their own version of that novel. That is how
  branching will work.
- **It is always modifiable, but changing it is discouraged.** Every change comes
  with a hard warning that says what it could cause ("if you change this, it could
  cause this issue"). Nothing in it is locked away from its owner.
- **AI fills every blank.** The reader fills in what they care about, and the model
  fills every Story Seed slot they left blank. It never rewrites what they wrote.
- **The reader sees only the first arc.** In the Blueprint the reader sees Arc 1 and
  its goals, nothing further. Readers change the story on a whim, so there is no
  point generating many arc goals ahead of time. The model still gets a short
  look-ahead of the next couple of arcs so it has good direction; the reader does
  not see it.
- **Each new arc is planned when it begins.** At the beginning of every new arc, its
  goals are generated, continuing from where the last arc left off: the next path to
  the Destined Ending.
- **The Blueprint reappears at every new arc,** at least its goal section, so the
  reader sees the new arc's goals, and can change them, before its first chapter is
  written.

## The core loop: read, direct, Next Chapter

Reading and directing are the product. A reader who wants to kill the sect leader
instead of sparing them says so and hits Next Chapter, and the next chapter makes it
happen. Today the reader's direction lives on the Fate page (`FatePage`), opened from
the Reader.

## The HARNESS is invisible

The HARNESS writes every chapter, but no reader ever visits it. A user only meets it
as **Story Settings**, which hold the CAPA skill slots and the media slots.

The Workshop's Harness Generation page (`?preview=harness-generation`, with its
internals shown only through `showHarnessInternals`) is a developer instrument, never
a product page. For HARNESS terms, use
[ARCHITECTURE_VOCABULARY.md](./src/components/harness-generation/ARCHITECTURE_VOCABULARY.md).

## Two tiers, for two kinds of user

The tiers exist to serve different users, not to hold features back.

- **Basic (most users):** about 95% of people will never highlight a word and change
  it, because the chapter already works. They get the basic tools for fixing what the
  AI gets wrong.
- **Author tier:** the vast majority of the author tools, above all the ones that
  expand customization and usually cost generation, such as developing your own beast
  roars and your own soundscapes to match the universe you are creating. It is for a
  specific kind of user.

Which tools sit in which tier is still open.

Library owns the tier rules, the same way it owns who may equip a Media Pack. SEN
never knows about tiers. A host passes in the actions it allows (for example the
Text Highlight Engine's `actions` and `removeActions`), so another company using SEN
can make its own split.

## The author half

The Text Highlight Engine gives SEN an author half beside the reader half. Every
paragraph, sentence and span has a permanent address, and every attachment knows
when its words change. That means:

- a regular author can leave AI out entirely, bring their own book into SEN, and add
  Sound Cues, soundscapes and manifestations;
- an AI-written chapter can be made genuinely the reader's own;
- later, a small local model (a 9B or 14B, for example) can regenerate one line
  without breaking what surrounds it.

## How we build

- **Only what we are building exists.** The old architecture is not preserved,
  reconnected or kept compatible for its own sake, and there is no backward
  compatibility unless the owner asks for it. Do not wire an old system back in
  because it used to be there. [DEVELOPMENT_RECONSTRUCTION.md](./DEVELOPMENT_RECONSTRUCTION.md)
  still says what must be protected: authentication, Postgres, R2 and persistence.
- **Basic first.** Prove the simplest version with a real model before adding the
  advanced layer. For example, the chapter paragraph counter uses one range (50–100)
  now; story styles with their own ranges come only after it works.
- **One kind at a time, in the tiny SEN language.** The model says what happens and
  where, the manuscript gives it a place, and the HARNESS turns it into exact,
  repeatable behavior. Each kind of content is rebuilt this way from the ground up.
- **Everything writes the same records.** A Sound Cue placed by the HARNESS, by a
  person, or later by a local model is the same manuscript attachment. No tool gets
  a side channel.
- **The Codex waits.** It is designed after the expanded-novel reading experience is
  right, so its categories, and what the model is told to document, can be designed
  on purpose.

## Where we are (2026-10-01)

Update this section whenever it changes.

- **Built:**
  - Chapters are narration plus Sound Cues in the tiny SEN language (#295).
  - Each chapter asks for an exact paragraph count from 50 to 100 (#296).
  - **The way in works end to end in the Workshop:** Story Seed → World
    Blueprint → **Start Story** → the story's **World Info** page → **Start
    Story** → the **Reader Chamber**, where Chapter 1 is written under the Aura
    Veil and opens when it is saved. Returning readers get **Continue · Ch. N**.
  - **The Reader Chamber is reading and listening:** chapters sit on the Text
    Highlight Engine (read-only), with Sound Cues active. Next writes the next
    chapter; Fate directs it. **Listen** reads the chapter aloud with the
    browser's own voices in three parts: the Narrator for the prose, the
    Protagonist voice for the main character's spoken lines, the Side voice for
    everyone else's. The sentence being spoken is lit and the page follows it.
    **Reader Settings** has one section, Narration (the three voices and the
    speed, remembered on the device for each story language). No Codex, Mind
    Palace, reader translation or read marks.
  - **The Aura Veil has two screens:** one narrative manifestation and one media
    reveal. The narrative one shows while a chapter is written.
  - **The memory call after each chapter is off** in the Library; it runs only
    on request until the Codex returns.
  - **The NovelExpanded app has its own address, `/app/`**, linked from the
    Workshop home. It shows only the four pages in a straight line: Home →
    Create (Story Seed and World Blueprint) → Story View (World Info) → Reader.
    It writes the same chapters as the Workshop, keeps its own stories, Story
    Seeds and reading places, and asks for the Blueprint access token on
    Create. `npm run check:app` fails the build if it reaches an old system
    ([`src/novel-expanded/README.md`](./src/novel-expanded/README.md)).
  - **Story Length is set from the start:** the Story Seed's ARC page asks how many
    arcs the story should run (1 to 100); left blank, the World Blueprint suggests one.
  - **The World Blueprint shows Arc 1 only**, with the story's length. The model
    gets a short private look-ahead of the next arcs. Each later arc is planned
    when the reader presses Next at its start, from where the last arc left off,
    and the World Blueprint's goal section opens in the Reader for review before
    that arc's first chapter, in both modes. The model fills every Story Seed slot
    left blank and never changes what the creator wrote. Add arcs is gone.
  - **Dialogue speakers, in the tiny SEN language:** the writer tags who speaks
    each spoken line (`[[@Name]]`), and the HARNESS records whether it is the
    main character. That is what gives Listen its three voices. Chapters
    written before this read every quoted line in the Side voice.
- **Not tested yet:**
  - real generation with a real model on the Vercel preview: a real Blueprint
    (Arc 1 only, filled slots), a real arc planned at a new arc, and real
    speaker tags;
  - Listen on real phones (iPhone Safari, Android Chrome), whose voices differ
    from device to device.
- **Not yet as [The World Blueprint](#the-world-blueprint) describes:**
  branching, and the warnings on Blueprint changes, are not built.
- **Not connected yet:**
  - The CAPA skill and media slots still sit on the Harness Generation page, not in
    Story Settings.
  - The World Info page has no cover art yet: the media reveal is not connected
    to a cover generator.
  - The Text Highlight Engine's tools (fixes, cue placement) are not in the Reader.
- **Not rebuilt yet:**
  - soundscapes;
  - manifestations;
  - System Panels, including the Fate Survival result card;
  - creature events.

## What comes next

1. **Branching and Blueprint change warnings** ([its direction](#the-world-blueprint)):
   a reader takes a published creator's Blueprint, keeps the Story Seed, and makes
   their own version; every Blueprint change carries a hard warning about what it
   could cause.
2. **Refine the creation-to-reading interaction** in the Workshop: Story Seed → Story
   View → Reader Chamber, including the manifestation sequence and World Cards. The
   new path (Story Seed → HARNESS → new reader) is connected; what remains is how it
   looks and feels.
3. **Grow the NovelExpanded app** (`/app/`) piece by piece. Piece 1, the four
   pages at their own address with a check that fails the build if the app
   imports an old system, is built. Next pieces:
   - Story Settings (CAPA and media slots) inside Create and Story View, leaving
     the developer page;
   - cover art on Story View through the media reveal;
   - a Workshop switch to inspect the app's stories;
   - real accounts and server-side storage.

   The app can move to its own repository once SEN is stable enough to install
   as a package.
4. **Rebuild the remaining kinds** one at a time, then design the Codex.
5. **Cinematic scrolling**, the Reader's default way to read: the page moves
   with Listen's voice (its playhead is ready for it), and later Sound Cues and
   manifestations fire as the voice reaches them. AI narration (generated once
   per language, stored and shared) comes after, on the same script.

## Names

| Name | What it is |
| --- | --- |
| NovelExpanded app | The product at NovelExpanded.com: the four pages. Built at `/app/` (piece 1: Home, Create, Story View, Reader), in `src/novel-expanded/`. |
| Story Seed / World Blueprint | Where a story is created (`?preview=story-seed`, and Create in the app). The Blueprint is the novel's transferable core: what a reader takes to make their own version ([The World Blueprint](#the-world-blueprint)). |
| Story View | The story's own page: cover art, the story, Enter. Built today as the World Info page (`WorldCardInfo`), where Start Story or Start Reading leads into the Reader Chamber. |
| Reader Chamber | Where chapters are read: a HARNESS story's chapters on the Text Highlight Engine with Sound Cues and Listen (`HarnessReaderSession`). The older Reader Chamber preview (`?preview=reader-chamber`) is not part of this path. |
| Listen / Read Aloud | The Reader reading a chapter aloud in three voices with the spoken sentence lit (`useReadAloud`, SEN's `reader-runtime`). Its voices and speed live in Reader Settings → Narration. |
| Reader Settings | The Reader's settings sheet. Narration is its only section today. |
| Text Highlight Engine (manuscript lab) | The manuscript editor at `?preview=text-highlight-engine`. |
| Story Settings | The only place a user meets the HARNESS: language, reading mode, CAPA skills and media. |
| Harness Generation | The developer instrument for the HARNESS (`?preview=harness-generation`). Never a product page. |
