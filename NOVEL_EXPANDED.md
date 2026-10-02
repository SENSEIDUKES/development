# NovelExpanded

> **Read this before any product work.** It is the product owner's direction for
> SEN and Expanded Novels, written down so every session starts from it. When a
> task and this document disagree, ask the owner. Do not guess, and do not bring
> back an older design because it used to exist.
>
> **Recent development activity does not redefine the product.** Never treat the
> subsystem currently receiving the most work as the whole of SEN or Expanded
> Novels; use the [product map](#the-product-map) in this document to preserve
> context.

- **Created:** 2026-09-29
- **Last updated:** 2026-10-01
- **Owner:** SENSEI, SEIHouse Productions

## Vision and build state

The first half of this document is the product: the product family, the product
map, what SEN and Expanded Novels each cover, who they serve, and how SEIHouse means
to sustain them. The capabilities it names are vision: they say where the product is
going, not what exists.

The second half is how we build it. [Where we are](#where-we-are-2026-10-01) is the
only section that says what is built today. A capability the first half names that
Where we are does not list is not built. Knowing the whole product should shape every
decision, but it is not a work order: build what the task asks for, and never
reconnect an old system because it once offered something on the map.

## The product family

SEIHouse's narrative work has three layers. Know which layer a piece of work belongs
to before starting it.

### SEN, the product-independent engine

SEN (SEIHouse Expanded Novels) is the expanded-novel engine, independent of any one
product. It is licensable: another publisher or rights-holder can embed it with their
own branding, catalog, accounts and commercial rules, and with their own books, since
AI chapter generation is only one of the content sources SEN accepts.
[The complete SEN experience](#the-complete-sen-experience) lists what it covers.

### Expanded Novels, SEIHouse's first-party product

Expanded Novels, at NovelExpanded.com, is the product SEIHouse builds on SEN. In code
and in the packages it is the Library (`@seihouse/library`, presented as the
Celestial Library). **SEN is the engine. Expanded Novels is SEIHouse's flagship
implementation of that engine.** [What Expanded Novels adds](#what-expanded-novels-adds)
lists what it brings beyond SEN.

Expanded Novels is SEN's proving ground. Improvements proven here can become portable
SEN capabilities when they are genuinely host-independent.

SEN's full name is SEIHouse Expanded Novels, but "Expanded Novels" on its own always
means the first-party product.

### Shared SEIHouse infrastructure

Beneath both sit systems that belong to neither product: SPP (the SEIHouse
Productions Package) and CAPA, the Model Router, provenance, asset and version
systems, shared UI primitives, media infrastructure, storage and provider boundaries,
and cross-medium identity and continuity. They are designed so SEN pressure-tests
them and SEA can inherit them later. Some live inside SEN or the Library today
because that is where they were first needed. Do not put something in `@seihouse/sen`
merely because SEN uses it first.

### SEN and SEA

SEN and SEA (SEIHouse Expanded Albums) are separate media products, but SEN is
currently SEIHouse's primary proving ground. Reusable systems are designed for medium
independence where that is real, never forced. SEN's advances can lower SEA's future
cost without turning SEN into a music product.

### The layers and the code

The layers describe the product, not the package graph: something Expanded Novels
offers can still be built from SEN parts. **The Library may depend on SEN. SEN must
never depend on the Library.** [`src/package/README.md`](./src/package/README.md)
decides which package a piece of code belongs to, and the [README](./README.md)
explains the split.

## The product map

SEN and Expanded Novels together cover all of these areas. Any one task touches a few
of them; the product is all of them.

- **Expanded-reading experience:** the Reader Chamber, cinematic presentation,
  narration and TTS, translation, accessibility, Sound Cues, Soundscapes and
  Manifestations.
- **Interactive fiction:** story direction, Rhythm, Alter Fate, Fate Survival, the
  Destined Ending, arcs and goals, and branching.
- **Living world:** the Codex, with characters, locations, factions, the Bestiary,
  artifacts, the timeline, terminology, relationships and world memory.
- **Creator production:** the Text Highlight Engine, targeted regeneration, manual
  media placement, custom sounds and music, custom genres and story tags, CAPA, and
  deeper author controls.
- **Library metagame:** profiles, Familiars, Relics, Achievements, Mystery Scrolls,
  QI, DAO XP, Cultivator Rank, Elemental Titles, discovery and community.
- **Studios and expanded media:** Soundscape and audio tools, Library Cues, Manga
  Studio, and the longer path into other visual, musical, game and other forms.
- **Physical and virtual expression:** 3D-printed artifacts, eventually physical
  objects that are digitally linked and carry provenance, and virtual-world
  (metaverse) expressions.
- **Creator economy:** reader → world builder → author → producer → IP operator, and
  potentially an actual business.

## The complete SEN experience

Everything SEN offers a host. A host turns on what it has the rights to and wants:

- cinematic reading and scrolling;
- inline media;
- Sound Cues, Soundscapes and Manifestations;
- TTS and triple narration, with voices for the narration and for the characters;
- translation, with roughly 60 languages as the target;
- accessibility reading modes: Clear Reading, Easy Read and Literal Reading;
- reader state and position;
- the Codex, a living reference to the story's world;
- manuscript interpretation;
- interactive narrative and Fate, optional, where the host has the rights and wants it;
- author and editing capabilities, where the host enables them.

The HARNESS is an implementation system inside SEN. It is not SEN itself. The same is
true of the manuscript.

## What Expanded Novels adds

On top of SEN, Expanded Novels adds SEIHouse's own product:

- Story Seeds and World Blueprints;
- public worlds, discovery, and branching other creators' worlds;
- the Library account and profile;
- QI, DAO XP and Cultivator Rank;
- Relics, Mystery Scrolls, Achievements, Familiars and Elemental Titles;
- creator spaces, boosts, activity and community;
- the Library economy and advanced creator tiers;
- custom genres and story tags;
- Library media packs;
- creator monetization and business systems.

## Users and progressive disclosure

**Do not expose the entire production system to every user.**

**The user is a reader who directs. The chapter should arrive right without them
touching anything.** The creator is the user. Most users are entertainment users:
they come because their fantasy is being fulfilled in front of them, they direct it,
create it and are entertained by it, and it never feels like work. Their loop is
create or direct → generate → manifest → read → continue.

Advanced tools, such as the Text Highlight Engine, manual media placement, custom
sound design and the Studios, are deliberate creator actions, not permanent Reader
UI. A user reaches for them; they never stand between a reader and the chapter.

The user ladder:

1. **Entertainment user:** reads and directs. About 95% of people will never
   highlight a word and change it, because the chapter already works. They get the
   basic tools for fixing what the AI gets wrong.
2. **Author / serious creator:** gets the vast majority of the author tools, above all
   the ones that expand customization and usually cost generation, such as developing
   your own beast roars and your own soundscapes to match the universe you are
   creating.
3. **Creator-business / IP operator:** turns a fictional universe into products, and
   potentially a business ([the creator economy](#studios-the-creator-economy-and-the-physical-and-virtual-future)).

The tiers exist to serve these users, not to hold features back. The Basic tier is
for the entertainment user and the Author tier for the serious creator. Which tools
sit in which tier, and what the advanced creator tiers add, is still open.

The Library owns the tier rules, the same way it owns who may equip a Media Pack. SEN
never knows about tiers. A host passes in the actions it allows (for example the Text
Highlight Engine's `actions` and `removeActions`), so another company using SEN can
make its own split.

## Studios, the creator economy, and the physical and virtual future

- **Studios** are dedicated places for deliberate creation: Soundscape and audio
  tools, Library Cues and Manga Studio, and over the longer run other visual,
  musical, game and other forms of the same world.
- **The creator economy** runs from reader to world builder, author, producer and IP
  operator, and potentially to an actual business. The aim is to reduce the
  organizational infrastructure it takes to turn a fictional universe into products.
- **Physical and virtual expression** carries a world off the page: 3D-printed
  artifacts, eventually physical objects digitally linked to their world and carrying
  provenance, and expressions in virtual worlds and the metaverse.

## Business strategy: SEN licensing

- Expanded Novels users are not the only, or necessarily the primary, long-term
  revenue target.
- SEN is intended to become licensable infrastructure for publishers, rights-holders
  and reading apps. The aim is that a major rights-holder can say, "We want the SEN
  experience for our catalog."
- Expanded Novels proves and advances SEN. That lets the consumer product put
  participation, creativity and a healthy creator economy ahead of extraction.
- SEN licensing helps fund SEIHouse's invention, SEA included.

For the work, this means everything in SEN must run inside a rights-holder's own app,
with their branding, catalog, accounts and commercial rules, never SEIHouse's. That is
why SEN never depends on the Library.

## The core application spine

Four pages carry a user from nothing to reading:

1. **Home:** the reader's stories.
2. **Story Seed / World Blueprint:** the reader fills in what they care about, and AI
   fills in whatever they don't want to write. Story Settings live here.
3. **Story View:** create the cover art, see the story, and Enter.
4. **Reader Chamber:** just reading. Chapters arrive here.

This is the minimum path through the product, not the complete product surface. Do
not infer the scope of SEN or Expanded Novels from these four pages.

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

Reading and directing are the heart of the product: the loop most users live in. A
reader who wants to kill the sect leader instead of sparing them says so and hits
Next Chapter, and the next chapter makes it happen. Today the reader's direction lives
on the Fate page (`FatePage`), opened from the Reader.

## The HARNESS is invisible

The HARNESS writes every chapter, but no reader ever visits it. It is an
implementation system inside SEN, not SEN itself. A user only meets it as **Story
Settings**, which hold the CAPA skill slots and the media slots.

The Workshop's Harness Generation page (`?preview=harness-generation`, with its
internals shown only through `showHarnessInternals`) is a developer instrument, never
a product page. For HARNESS terms, use
[ARCHITECTURE_VOCABULARY.md](./src/components/harness-generation/ARCHITECTURE_VOCABULARY.md).

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

The current implementation status, and the only section that says what is built.
Update it whenever it changes.

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
    Workshop home. It shows only the core application spine: Home → Create
    (Story Seed and World Blueprint) → Story View (World Info) → Reader. It
    writes the same chapters as the Workshop, keeps its own stories, Story
    Seeds and reading places, and asks for the Blueprint access token on
    Create. `npm run check:app` fails the build if it reaches an old system
    ([`src/novel-expanded/README.md`](./src/novel-expanded/README.md)).
  - **Story Length is set from the start:** the Story Seed's ARC page asks how many
    arcs the story should run (1 to 100); left blank, the World Blueprint suggests one.
  - **Story Language and Reading Mode come from the Story Seed:** chapters are
    written in the story's language, one of 11 today, and Clear Reading, Easy Read
    or Literal Reading loads SEN's matching Accessibility skill on every chapter.
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
  - The Library's account and metagame surfaces (profile, cultivation, Relics,
    rewards, Familiars, the Celestial Store, Creator Space) are Library package
    entries the Workshop previews; the NovelExpanded app uses none of them yet.
- **Not rebuilt yet:**
  - soundscapes;
  - manifestations;
  - System Panels, including the Fate Survival result card;
  - creature events.
- **Everything else on the [product map](#the-product-map)** that this section
  does not list is not built.

## What comes next

1. **Branching and Blueprint change warnings** ([its direction](#the-world-blueprint)):
   a reader takes a published creator's Blueprint, keeps the Story Seed, and makes
   their own version; every Blueprint change carries a hard warning about what it
   could cause.
2. **Refine the creation-to-reading interaction** in the Workshop: Story Seed → Story
   View → Reader Chamber, including the manifestation sequence and World Cards. The
   new path (Story Seed → HARNESS → new reader) is connected; what remains is how it
   looks and feels.
3. **Grow the NovelExpanded app** (`/app/`) piece by piece. Piece 1, the core
   application spine at its own address with a check that fails the build if the
   app imports an old system, is built. Next pieces:
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
| SEN | SEIHouse Expanded Novels: the product-independent, licensable expanded-novel engine (`@seihouse/sen`). [The product family](#the-product-family). |
| Expanded Novels | SEIHouse's first-party product on SEN, at NovelExpanded.com. In code, the Library (`@seihouse/library`), presented as the Celestial Library. |
| SEA | SEIHouse Expanded Albums: SEIHouse's expanded-music product, separate from SEN. It inherits the shared infrastructure SEN pressure-tests. |
| NovelExpanded app | Expanded Novels' app at NovelExpanded.com. Built at `/app/` (piece 1: the core application spine of Home, Create, Story View and Reader), in `src/novel-expanded/`. |
| Story Seed / World Blueprint | Where a story is created (`?preview=story-seed`, and Create in the app). The Blueprint is the novel's transferable core: what a reader takes to make their own version ([The World Blueprint](#the-world-blueprint)). |
| Story View | The story's own page: cover art, the story, Enter. Built today as the World Info page (`WorldCardInfo`), where Start Story or Start Reading leads into the Reader Chamber. |
| Reader Chamber | Where chapters are read: a HARNESS story's chapters on the Text Highlight Engine with Sound Cues and Listen (`HarnessReaderSession`). The older Reader Chamber preview (`?preview=reader-chamber`) is not part of this path. |
| Listen / Read Aloud | The Reader reading a chapter aloud in three voices with the spoken sentence lit (`useReadAloud`, SEN's `reader-runtime`). Its voices and speed live in Reader Settings → Narration. |
| Reader Settings | The Reader's settings sheet. Narration is its only section today. |
| Text Highlight Engine (manuscript lab) | The manuscript editor at `?preview=text-highlight-engine`. |
| Story Settings | The only place a user meets the HARNESS: language, reading mode, CAPA skills and media. |
| Harness Generation | The developer instrument for the HARNESS (`?preview=harness-generation`). Never a product page. |
