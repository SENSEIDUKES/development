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
- **Last updated:** 2026-10-11
- **Owner:** SENSEI, SEIHouse Productions

## Vision and build state

The first half of this document is the product: the product family, the product
map, what SEN and Expanded Novels each cover, who they serve, and how SEIHouse means
to sustain them. The capabilities it names are vision: they say where the product is
going, not what exists.

The second half is how we build it. [Where we are](#where-we-are-2026-10-08) is the
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
- **Every arc is 30 chapters,** one standard size the product prices and sells by. A
  complete novel runs about 10 arcs (300 chapters); a long epic 30 to 40 (900 to 1,200).
- **A goal's chapters are a budget, not a quota.** The story reaches a goal when it earns
  it, and the next goal starts in the following chapter. Every chapter changes something;
  the story never marks time to fill a goal's chapters.
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
on the Fate page (`FatePage`), opened from the Reader. A reader who does not like the
newest chapter can have it written again, with a note on what to change, until they
move on to the next one.

## The HARNESS is invisible

The HARNESS writes every chapter, but no reader ever visits it. It is an
implementation system inside SEN, not SEN itself. A user only meets it as **Story
Settings**, which hold the CAPA skill slots and the media slots. Why it is built the
way it is (the problems it solves and the one principle behind them) is in
[HARNESS_PRINCIPLES.md](./src/components/harness-generation/HARNESS_PRINCIPLES.md).

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
  advanced layer. For example, the chapter paragraph counter asks for one fixed count
  (50) while its accuracy is measured; a range (40–80), then story styles with their
  own ranges, come only after it works.
- **One kind at a time, in the tiny SEN language.** The model says what happens and
  where, the manuscript gives it a place, and the HARNESS turns it into exact,
  repeatable behavior. Each kind of content is rebuilt this way from the ground up.
- **Everything writes the same records.** A Sound Cue placed by the HARNESS, by a
  person, or later by a local model is the same manuscript attachment. No tool gets
  a side channel.
- **The Codex waits.** It is designed after the expanded-novel reading experience is
  right, so its categories, and what the model is told to document, can be designed
  on purpose. Its page is in the Reader Chamber (2026-10-10), as it is and not yet
  filled with the story's world, so that design can happen there. What it must
  hold so a story can be translated into other media is in
  [the HARNESS principles](./src/components/harness-generation/HARNESS_PRINCIPLES.md#translation-across-media-the-world-record).

## Where we are (2026-10-10)

The current implementation status, and the only section that says what is built.
Update it whenever it changes.

- **Built:**
  - Chapters are narration plus Sound Cues in the tiny SEN language (#295).
  - Each chapter asks for exactly 50 paragraphs for now, so the writer's accuracy
    can be measured; the range to return to is 40 to 80 (#296).
  - **The way in works end to end in the Workshop:** Story Seed → World
    Blueprint → **Start Story** → the story's **World Info** page → **Begin
    Story** → the **Reader Chamber**, where Chapter 1 is written under the Aura
    Veil and opens when it is saved. Once a story has chapters the button says
    **Continue**.
  - **The Reader Chamber is reading and listening:** chapters sit on the Text
    Highlight Engine (read-only), with Sound Cues active. Next writes the next
    chapter; Fate directs it. **Listen** reads the chapter aloud with the
    browser's own voices in three parts: the Narrator for the prose, the
    Protagonist voice for the main character's spoken lines, the Side voice for
    everyone else's. The sentence being spoken is lit and the page follows it.
    **The soundtrack is SEIHouse's own audio player** (its reader mixer), and
    each chapter has its own scene: **music** (pieces of one mood from SEN
    Soundscapes, Volume 1, one after another) and one **atmosphere** (a bed from
    SEN Atmospheres, Volume 1), both chosen by the chapter's writer once, at its
    start (below). Every piece and bed was measured so the player can level it
    toward −20 LUFS, and every SEIHouse audio host gives the player permission
    to process its files (CORS, on every response), so it turns loud files down
    and quiet ones up. The levels are not even yet: 22 beds are too quiet to
    reach −20 even at the player's largest boost and need re-exporting. The
    atmosphere plays from the moment the Reader opens (while Chapter 1 is
    written too) and under what opens over the chapter (Fate, the Codex, an
    arc's goals); only leaving the Reader stops it. Atmosphere loops play as their
    files are made, with no overlap at the loop point. Sound Cues play over it
    at the loudness of their Energy, Listen dips it, and a **sleep timer** stops
    it, Listen included. A small **note** above the bottom bar mutes all story
    audio with a tap; a long-press opens Audio settings. **Reader Settings**
    opens with **Text** (the font, the title font, size, line spacing and
    weight, remembered on the device), then **Audio** (presets, master, the Soundscapes, Atmosphere and Sound
    Cues levels and the sleep timer), then **Scene**: Automatic plays each
    chapter's own music and atmosphere; a piece or an atmosphere the reader
    chooses stays, whatever the chapters choose. Then **Narration** (the three
    voices and the speed, remembered on the device for each story language). The
    mix and the Scene choice are remembered on the device, never in the story.
    **Holdings**, one of the Codex's pages, lists what each character has now,
    for checking the chapters (below). The Codex itself is not yet filled with
    the story's world. No Mind Palace, reader translation or read marks.
  - **The Reader reads in the SEIHouse fonts:** chapters in **SEIHouse Sans**,
    the reading font from the font repo (SEIHouse/FONT-LAB), titles in a
    **SEIHouse Display** cut (Ink by default; Soft, Edge and Wide are there to
    test), with the earlier Noto Serif and Alegreya still to choose. A slim top
    bar (Back, the story and chapter, the reader's **Familiar**, Reader
    Settings) stays
    at the top while reading, and a **bottom bar** stays at the
    bottom with what the reader acts with: **Listen** and its skip controls
    on the left, **Codex** as the large button in the middle, then the
    **chapter switcher** — previous, "5/10", next — and Fate on the right.
    Play and Fate anchor the outer edges; Codex sits in the middle. Each pill
    centers in the space between its neighboring main actions at every screen
    size. Play and Fate are gray; Codex is cyan.
    Both control pills are smaller than the main actions. During Listen,
    sentence navigation sits to the right of that same play/pause button,
    with Back to narration floating above the bar on the left only when the
    narrated sentence is out of view (the audio note floats on the right);
    playback adds no second bottom row.
    The skip buttons stay visible before playback starts and can choose a
    sentence silently. The left playback button alone plays, pauses and resumes;
    there is no separate Stop button.
    The prose keeps about
    60 characters a line. The
    Reader is a **frame** around a **chapter body**: prose today, so a
    sequential-art view can take the body's place later. The frame is built
    to serve reading, never interrupt it: **the chapter never leaves the
    page.** Fate and Reader Settings open as **panels** over it, with the
    chapter still readable and scrollable, so the reader can look back at what
    they just read while they decide: on phones a sheet that drops to half
    height ("Show the chapter"), on laptops a panel at the right with the
    chapter moved beside it. Listen reads on under a panel. **The Codex** is its
    own page inside the Reader Chamber, opened from the bottom bar: the
    development Codex, shown as it is and not yet filled with the story's
    world, so it can be designed in the Reader. Holdings is one of its pages.
    The Codex and an arc's goals take the screen, and the reader comes back to
    their exact place.
  - **A place to work on the Reader:** the Workshop's Reader Chamber card
    (`?preview=reader-chamber`) shows the app's Reader as its Development view.
    It is the same component the app renders, so the two cannot drift apart. It
    reads SENSEI's Sundered Heavens test or any story saved with Export story.
    Its scenes put the reader on Chapter 1, in the middle, before the newest
    chapter, on the newest one, or at the story start. Writing replays the
    chapters the story already has, behind the writing screen, so no model is
    called. Its Original Reference is production's Reader, for comparison.
  - **Music everywhere in the app, with no model:** NovelExpanded plays calm
    pieces of SEN Soundscapes on Home, Create and World Info (**Menu music**).
    The Reader never opens to it: it always plays its own music, each
    chapter's scene, or for a chapter written before scenes and while a
    chapter is written, mystical pieces. Leaving the Reader brings the menu
    music back. Browsers and phones start no sound before the reader's first
    tap (scrolling does not count), so the music begins with the first tap
    anywhere, on Home too; until then the music note says to tap.
  - **Leaving the page never stops the sound:** another tab, another app to
    send a text, a locked phone. The app never pauses the music or the
    atmosphere for it, and time away does not count toward the ten minutes
    without a touch after which the music rests. Sound a phone paused meanwhile
    plays on when the reader comes back (a phone that hushes Listen's voice
    gets the line read again). Only the reader's own mute and the sleep timer
    stop it.
  - **Menu music is the reader's choice, and one tap silences it:** Profile
    Settings › Customization › Sound has a **Menu music** switch (on for a new
    reader, kept on the device). While it is on, the **music note** shows on
    every page of the app outside the Reader (Home, World Info, Create and
    Profile): a tap mutes all sound at once (the same switch as the Reader's note);
    hovering it with a mouse, or holding it on a phone, opens a **Music
    volume** slider right there. On phones and tablets it floats just above
    the bottom bar's right end, as the Reader's note floats above its Listen
    bar, faint while the page scrolls; on laptops it sits in the header beside
    Help and Search. Off, the menus are silent and the note goes; the Reader
    keeps its own music. The switch is in the app's own Profile Settings too.
  - **A chapter's soundtrack, in the tiny SEN language:** at the very start of
    every chapter the writer writes one soundtrack tag, the mood of its music
    and its atmosphere (`[[soundtrack: mystical | forest]]`), from the story's
    own lists (the 15 moods at least three pieces share; 20 atmosphere words).
    Only the first counts, so a passing fight never brings on war music. Beds
    that share a word take turns from chapter to chapter, and a chapter that
    chose nothing goes on with the scene before it.
  - **Writing survives leaving the Reader:** the chapter being written belongs
    to the story, not to the screen. Back out mid-write and it keeps writing;
    come back and it is still writing, or there. A write a closed browser cut
    off is finished by the reader's next Write (a saved reply needs no new
    model call). In the app, Chapter 1 begins the moment the story is made
    (Manifest Story), so it is ready, or nearly, when the reader starts; a Fate
    Survival story's first chapter waits for the reader's direction.
  - **Low reasoning by default:** every model that offers a `low` reasoning
    level is sent it unless the reader chooses another, since testing found low
    as good and far faster.
  - **The Aura Veil has two screens:** one narrative manifestation and one media
    reveal. The narrative one shows while a chapter is written.
  - **The separate memory call is retired.** Tags record Sound Cues, speakers and
    Holdings in the chapter write. There is no follow-up or on-request memory
    extraction, and no “story memory incomplete” warning. Historical saved records
    remain readable; Holdings never use them.
  - **The NovelExpanded app has its own address, `/app/`**, linked from the
    Workshop home. It shows only the core application spine: Home → Create
    (Story Seed and World Blueprint) → Story View (World Info) → Reader. It
    writes the same chapters as the Workshop, keeps its own stories, Story
    Seeds and reading places, and asks once for the owner's access token,
    which unlocks Blueprints and lifts the chapter limit, saving it on this
    device. `npm run check:app` fails the build if it reaches an old system
    ([`src/novel-expanded/README.md`](./src/novel-expanded/README.md)).
  - **The app sits in the Library Shell:** Home and World Info have the
    Library's header (NovelExpanded, Help and Search, and the music note on
    laptops; on phones and tablets the note floats above the bottom bar), its
    navigation and its footer. The navigation shows only the app's two places,
    Home and Create: the bottom strip on phones and tablets, the Pathways
    sidebar on laptops, which opens the way the reader last left it on the
    device. Search opens the reader's stories; the footer offers Help and the
    draft Terms, Privacy and Cookies. Create is Story Seed in the shell's
    workspace mode (Sections, Story Bank, Settings, Back). The Reader stays
    full-screen. Discover joins the navigation when its page comes to the app.
  - **Profile is in the app, with what it connects to,** so the pieces can be
    seen working together and refined there. Profile is a third place in the
    navigation (Home, Create, Profile, with Settings beside it); it is the
    Library's Cultivator Cave, whole:
    - **The reader's profile is kept on the device:** the Dao Name and its aura,
      the languages, the default Reading Mode, the equipped Familiar and its
      size. It is the one record every surface reads, so a choice in Settings
      shows everywhere at once, and Create starts new Story Seeds from its
      reading language and Reading Mode.
    - **A practice economy:** QI, Energy, the Daily Dao Pillar, rewards and
      Familiars run on the Library's real economy, in the page. Until the
      database it is a practice account: 1,000,000 QI and every Familiar
      unlocked, so each can be tested; what the reader does with it lasts for
      the visit, and a reload opens the account again.
    - **The profile picture:** made from the reader's photo, three to choose
      from, the chosen one kept on the device.
    - **What needs a server says so:** Keyboard
      Shortcuts, Redeem Code, Sever Link, Harmony sync, backup and import, the
      Aether Router and the Inbox show, disabled, with "Not in the app yet."
    - **One Familiar for the app:** minimized to its recall in every Library
      header (beside the music note on laptops); summoned, it floats over the
      pages and keeps its place, starting on phones just above the bottom bar
      and the music note, never on them. It stays out of the immersive Reader,
      and the writing veil wears the same Familiar.
  - **Story Settings are in the app, off the developer page** (piece 4). The
    story's own settings, the only place a reader meets the HARNESS:
    - **On Story View**, closed until opened: the Story Language (fixed when the
      story began), the Reading Mode, the **CAPA skill slots** (choose the Author,
      Pacing, Continuity and Style skills; Fate, Accessibility, Translation, Sound
      Cues, Soundtrack, Speakers and Holdings follow the story's own choices and
      say so; each hand-equipped slot also takes a skill package, installed on
      the device), the **Media Loadout** (the Library's own sounds, shown
      equipped, or your own Soundscape and Sound Cue packages, imported as
      `.spp` and kept on the device) and the story's own **Sound Words**, the only sounds the writer may
      name (at most 30, from a preset, the Library's or one installed from a
      Sound Words `.spp`, then edited; changing the Sound Cue pack never changes
      them, and an empty list plays none). A change applies to the
      chapters written from then on, and waits while one is being written.
    - **In Create**, Story Seed's Settings holds the language and Reading Mode, then
      the CAPA skills, media and Sound Words the story will start with. What the reader changes
      waits on the device until Manifest Story makes it the new story's.
    - The Harness Generation developer page shows the same panels, with its own
      inspection added (each skill's instructions, the Official Requirements, slot
      uploads).
  - **Cover art, made on the cover** (piece 5, remade 2026-10-09): World Info's
    empty cover says **Manifest**; the reader chooses one cover (5 Energy) or three
    to choose from (15). Covers come from the story's own words (its title, genre,
    tradition, logline, main character, tone, world and tags; never its chapters)
    with the owner's approved cover template, the title drawn on, behind the Aura
    Veil's media reveal. One is revealed and worn; three come alive in a picker and
    the reader keeps one. World Info and Home's card wear it; a kept cover keeps a
    small Manifest and a download on its corner. Covers are made with the Model
    Router's image choice, **Nano Banana 2 Lite** unless the reader picks another;
    visitors may make 3 every 30 minutes and the owner's access token lifts the
    limit. Until the database, a cover is kept on the device, beside the stories.
  - **Story Length is set from the start:** the Story Seed's ARC page asks how many
    arcs of 30 chapters the story should run, 10 to 40 (300 to 1,200 chapters); left
    blank, the World Blueprint suggests one in that range, written by the same model
    the chapters are. The Blueprint's length box saves as you type, with no separate
    save step, and a changed length throws away the private look-ahead written for
    the old one.
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
    each spoken line (`[[@MC]]` for the main character, `[[@Name]]` for anyone
    else), and the HARNESS records whether it is the main character. That is what gives Listen its three voices. A line
    the writer left untagged is voiced from its narration, as a reader tells: the Side voice when the
    narration names someone else ("Lin Xiao said"), otherwise the Protagonist voice, as production read it.
    A placeholder copied from the instructions (`[[@Name]]`) counts as no tag.
  - **Sound tags never leave broken lines:** the writer wraps words already in its
    sentence. A tag written on its own line or between sentences has its words
    removed, and its sound moves onto the nearby words that say the same thing, or
    onto the nearest sentence.
  - **Holdings, the first information tags:** the things each character owns, the
    abilities they can use, and their rank. Never plot facts: a name keeps no
    count or description inside it, and a name that reads as a note about the
    story (a sighting, a countdown) is set aside. Every chapter, the writer reads
    the Holdings section (the main character first), uses only what is there, and tags each change where
    it happens (`[[gained: MC | Thing]]`, `lost`, `equipped`, `unequipped`,
    `learning`, `learned`, `improved`, `sealed`, `unsealed`, `rank`, and `has`
    or `knows` the first time the story shows something already held). It ends
    its reply with the main character's closing list; a tag written there instead
    of the prose is still recorded, at the chapter's end. Each name becomes a Codex
    entry with an app-made ID; plain rules flag what cannot be true (moving up a
    stage while still learning is progress, kept as that stage, never a check); nothing is
    stored that could count twice. The Reader's **Holdings** page shows it all,
    each change linked to its passage, with the checks worth testing. Chapters
    written before this have nothing recorded. The tag system is defined in
    [the vocabulary](./src/components/harness-generation/ARCHITECTURE_VOCABULARY.md#the-tag-system-the-tiny-sen-language).
  - **Every chapter keeps the story's point of view, and is a whole chapter:**
    the Style skill chooses the point of view when the story opens (first person
    suits a Japanese story), and the HARNESS reads it from the opening chapter
    and tells every later chapter to keep it. A reply far short of a chapter
    (under a quarter of its 1,800-word minimum) is a failed write: nothing is
    saved, and the Reader says so with Next ready to try again. A chapter's
    title is its name alone; the Reader numbers it. The writer is told roughly how
    many words each paragraph needs to reach the minimum, never to carry a
    countdown ("nine days remain") into a recap, since later chapters read it
    after time has passed, and never to lean on a pet word within a chapter.
  - **Openings and descriptions, in plain wording only:** each chapter is told
    where it sits in its arc ("Chapter 7 of 30 in Arc 1"). The first chapter of
    the story or of a new arc may ground the reader in the world; every other
    chapter picks up from where the last recap leaves off and opens however
    the moment calls for, so openings vary: the setting is one way to begin,
    never a habit. A character gets the full portrait
    when they first appear, come back after time away, or change (a
    breakthrough, a power-up, new gear, an injury, a new rank), and a light
    touch between. The writer still gets the same Story Information on every
    chapter; nothing is withheld. Some repetition is the AI's mark and the
    author's to polish; this only makes it rarer.
  - **The writer's tags, in one strict shape:** every tag kind is taught the
    same way (its job, its format, what is required, what is forbidden, and a
    check before it returns), and what every tag shares is said once. Sounds
    are tagged where they happen (`[[sound: blade drawn | drew his sword |
    high]]`), naming one of the story's sound words, on up to 8 words; the
    numbered marks and separate list that lost sounds in the tests are gone.
    Speakers must be tagged from Chapter 1 on, one speaker per paragraph.
  - **Writer Instructions, in the Workshop:** every block of text the writer
    reads before the story, from the live code, with its version, size and
    the date it last changed, and a dated history. A change to the writer's
    instructions fails the build until it is written in that history.
  - **Export story,** on World Info, saves a story as one file: every chapter
    with the exact instructions, Story Information and request the writer was
    given, and its raw reply. It is how a test is shared.
  - **Rewrite this chapter:** at the end of the newest chapter, until the next
    one is written, a quiet link lets the reader have it written again, with an
    optional note on what to change. The new version is written from the story
    as it stood before that chapter, with the same direction; the writer sees
    the set-aside version's title and recap and the note, never its prose.
    Everything worked out from the old version (its holdings, the goals it
    reached or missed, an ending it wrote) goes with it. The reader keeps the old
    version until the new one is saved; a failed rewrite changes nothing and
    keeps the note. The set-aside version stays in the export.
  - **The Holdings fixer, unseen:** after each chapter is saved, SEN runs the
    Holdings checks on it and fixes the small problems quietly: a corrected tag,
    one corrected sentence, or two names merged into one entry. It never reads
    the chapter: each problem becomes a small case (the sentence, its tags, what
    the record shows, and what the chapter itself recorded about it earlier), and one short call with the chapter's own model, at its
    lowest reasoning, answers them. That call is made only when a check flags
    a problem in that chapter which the plain rules cannot settle: a chapter
    with nothing flagged makes no call, and a problem left from an earlier
    chapter never makes a later one call. A closing list that is off where no
    sentence of the chapter could show a change (the chapter never names the
    item, or names it only up to its own last tag for it) is settled without a
    call. A fix stands only when it leaves fewer problems; a contradiction too
    big for one sentence is recorded and left as it is. The reader sees none of
    it; each chapter keeps a record of what was checked and changed, in the
    export, and the fixer's instructions are on the Writer Instructions page.
    The Library sets how far it may go (records only, or off), which is where
    the Familiar will control it.
- **Not tested yet:**
  - real generation with a real model on the Vercel preview: a real Blueprint
    (Arc 1 only, filled slots), a real arc planned at a new arc, and real
    speaker tags;
  - holdings with a real model: the 10-chapter test, comparing what the
    chapters show against the Holdings page. The first run (six chapters)
    stayed on one scene: its export showed a 25-chapter first goal and the
    writer told to fill it, so nothing happened that Holdings could record.
    Arcs are now 30 chapters, goals hand over when reached, and every chapter
    must change something. The second run (five chapters) moved every chapter,
    and showed a point-of-view switch, a failed write saved as Chapter 3,
    numbered titles, and a slate lost from Holdings because it was only tagged
    as equipped; all four are fixed. Both runs also showed loose tag wording:
    no speaker tags in either Chapter 1, and 36% of sounds lost. The tags are
    now taught in one strict shape, and the test runs again on a new story;
  - Rewrite this chapter and the Holdings fixer with a real model: how often the
    fixer is called, what it costs next to a chapter, and whether its fixes
    hold (each chapter's record in the export shows it);
  - Listen on real phones (iPhone Safari, Android Chrome), whose voices differ
    from device to device;
  - the soundtrack tag with a real model: whether the writer chooses one mood
    and atmosphere that fit each chapter, and keeps to one tag;
  - the music on an iPhone: eight SEN Soundscapes files are named `.wav` but
    hold MP3, and their server labels them WAV, which Safari may refuse until
    they are renamed or relabelled.
- **Not yet as [The World Blueprint](#the-world-blueprint) describes:**
  branching, and the warnings on Blueprint changes, are not built.
- **Not connected yet:**
  - Covers live on the device, not in R2: the database (and an account) will
    keep them. No real model has made a cover yet; the first owner test will.
  - The Text Highlight Engine's tools (fixes, cue placement) are not in the Reader.
  - The app's Profile runs on the device and a practice economy: there are no
    accounts, database or server-side storage yet, so nothing the economy holds
    survives a reload, and the account and server pieces wait.
  - Creator Space and Discover are Library package entries the Workshop
    previews; the NovelExpanded app does not use them yet.
- **Not rebuilt yet:**
  - manifestations;
  - System Panels, including the Fate Survival result card;
  - creature events.
- **Everything else on the [product map](#the-product-map)** that this section
  does not list is not built.

## What comes next

The plan, in stages, so any session can pick up where the last one stopped. Two
tracks run side by side: **the product** (what a reader sees and does) and **the
engine and its world record** (what the HARNESS and the Codex know). The order
inside each track is the order to build in; the owner can reorder it. Why the
engine track is shaped this way is in
[HARNESS_PRINCIPLES.md](./src/components/harness-generation/HARNESS_PRINCIPLES.md).

### Next up

When a session asks "what now?", start here:

1. **Owner:** run the next real-model test (Stage E0) on a new story and export
   it. Everything after it depends on knowing the strict tags hold.
2. **Agent:** design the first information tag, **first appearance with
   appearance** (Stage E1, step 1), as a written proposal for the owner before
   any code: the tag, its teaching, its rules, its home, and what the Codex
   shows. The [principles](./src/components/harness-generation/HARNESS_PRINCIPLES.md#translation-across-media-the-world-record)
   say what it must capture.
3. **Agent:** right-to-left reading in the Reader (product track, item 1).
4. **Either track's next piece** below, when the owner asks for it.

### The product track

1. **Read in every script, starting with right-to-left.** The target is
   roughly 60 languages, and the Reader today lays out only left-to-right
   text. A story in Arabic, Hebrew, Persian or Urdu must read right to left:
   the text, its alignment, the lit sentence during Listen, Sound Cue
   highlights, and the Reader's own controls mirrored where a right-to-left
   reader expects them (the chapter switcher's previous and next swap sides).
   The direction comes from the story's language, never a reader's toggle.
   Mixed text (an English name or a number inside Arabic) must keep its own
   order. Each script also needs a reading font that covers it (where the
   SEIHouse fonts do not, a fallback chosen on purpose). Vertical Japanese and Chinese text is a later,
   separate step. Verified with a real right-to-left chapter in the Reader
   Chamber workspace, on a phone and a laptop.
2. **Branching and Blueprint change warnings** ([its direction](#the-world-blueprint)):
   a reader takes a published creator's Blueprint, keeps the Story Seed, and makes
   their own version; every Blueprint change carries a hard warning about what it
   could cause.
3. **Refine the creation-to-reading interaction** in the Workshop: Story Seed → Story
   View → Reader Chamber, including the manifestation sequence and World Cards. The
   new path (Story Seed → HARNESS → new reader) is connected; what remains is how it
   looks and feels. The Reader itself is worked on in the Reader Chamber workspace
   (`?preview=reader-chamber`), which renders the app's own Reader.
4. **Grow the NovelExpanded app** (`/app/`) piece by piece, until it is the
   whole app the owner wants. Piece 1, the core application spine at its own
   address with a check that fails the build if the app imports an old system,
   is built; so are piece 2, the Library Shell around it, piece 3, Profile
   with everything it connects to, piece 4, Story Settings in Create and Story
   View, and piece 5, cover art on Story View through the media reveal. Next
   pieces:
   - a Workshop switch to inspect the app's stories;
   - Discover.

   **The owner's plan:** assemble the app here, a piece at a time, until it is
   right; then copy it into its own repository and build the database there
   (accounts, server-side storage, a kept economy), which completes it. The
   app's host pieces (`src/host/`) are where the device and practice stand-ins
   live, so that is where the database's real ones replace them.
5. **Cinematic scrolling**, the Reader's default way to read: the page moves
   with Listen's voice (its playhead is ready for it), and later Sound Cues and
   manifestations fire as the voice reaches them. AI narration (generated once
   per language, stored and shared) comes after, on the same script.

### The engine track: the world record and the Codex

**Stage E0: prove what is built.** Basic first: nothing new is added on top of
tags that have not been measured with a real model. The tests are the ones
under [Not tested yet](#where-we-are-2026-10-10): the 10-chapter holdings test
with the strict tag shape, speaker tags, the soundtrack tag, Rewrite and the
Holdings fixer. Done when an exported story shows the tags landing reliably
(the Holdings page agrees with the prose, speakers are tagged from Chapter 1,
few sounds lost). A cost check can ride along: the same test on a second, cheaper
model added to the Model Router, comparing tag accuracy and each chapter's
receipt.

**Stage E1: the information tags, one at a time.** Each is a new kind in the
tiny SEN language, built with the five parts the
[vocabulary](./src/components/harness-generation/ARCHITECTURE_VOCABULARY.md#the-tag-system-the-tiny-sen-language)
defines, proven with a real model before the next begins, and shown on the
Codex page as a plain list for checking (as Holdings is today). Together they
complete the [world record](./src/components/harness-generation/HARNESS_PRINCIPLES.md#translation-across-media-the-world-record).

1. **First appearance, with appearance:** when a character, thing or place first
   appears, and later when its look changes (a scar, new robes, a
   breakthrough). The writer tags the moment; the full description can be
   gathered by a small separate step after the chapter is saved, registered in
   the Model Router, so the writer's job stays small.
2. **Place:** places become Codex entries, and the record knows where each
   character is.
3. **Scene:** where a story scene starts, where it is, when (time of day,
   conditions) and who is present. With appearance, this is what an artist
   needs to draw a panel.
4. **Status:** alive, wounded, transformed, sealed away, and so on.
5. **Ties:** allied, hostile, related, bound.

**Stage E2: design the Codex on the record.** Only now, with real entries to
show, is the Codex designed for readers ("the Codex waits", [How we
build](#how-we-build)): its categories (characters, places, things and
abilities, factions, the timeline), each entry linked to the passages that
made it, Holdings becoming one section of a character's entry. Done when the
record passes the two tests in the principles: **the artist test** and **the
save-game test**.

**After E2: keeping the record true when a reader edits a chapter.** Create
mode lets a reader change the newest chapter before it is sealed: its words,
its Sound Cues, its speakers and holdings. A first version
([#368](https://github.com/SENSEIDUKES/development/pull/368), closed and kept
on its branch `claude/chapter-reread`) reread any changed chapter with a model
when it was sealed: the whole chapter in, the whole chapter back word for word
with its tags, and a new recap. It was closed because it reread far too much:
a moved Sound Cue or a fixed comma cost about as much as writing the chapter
again. It comes back once the Codex is designed, on this principle (SENSEI):

- **The trigger is the record, never the words.** Most edits change nothing
  the story knows: a comma, a reworded sentence, a Sound Cue added, swapped
  or removed (the reader places cues by hand on exact words, so there is
  nothing for a model to read). Only an edit that leaves a **conflict with
  what the Codex holds** from that chapter matters.
- **Conflicts are found without a model.** Each fact a chapter gives the
  record is pinned to its words (today a speaker and a holdings change; later
  every information tag from Stage E1). An edit that breaks a pin is known at
  once: the fact shows under Create mode's *Needs a new spot*.
- **The reader settles a conflict for free.** Placing the fact on its new
  words, or removing it, costs nothing.
- **A model only for what is left at the seal, and only for it.** For each
  conflict still open: the fact, the words it was on, and the paragraph as it
  is now: does the fact still hold, and where? A few hundred tokens, and a
  recap update only when a fact changed. Never the whole chapter.
- **One list of the facts a chapter holds.** The check runs over that list,
  so every kind of fact the Codex gains joins it without a redesign.
- **The known gap.** A rewrite that changes the story without touching any
  pinned fact (“he lost the duel” made “he won the duel” in plain prose) is
  invisible to the check. When this comes back, the owner chooses: a
  **This changes the story** choice at the seal that runs a fuller reread, or
  accept the gap.

**Stage E3: recall for long stories.** The Codex says which entities matter to
the next chapter; a recall step picks the earlier passages about them, so the
Story Information Packet stays small at any length. Start with a Workshop
experiment on an exported story (can it find the right passages?) before
wiring it into the writer. This is where an embedding model fits.

**Stage E4: the remaining kinds.** System Panels (including the Fate Survival
result card), manifestations and creature events, one at a time, in the same
tiny SEN language. Then **the Familiar over the Holdings fixer**: the Library's
Familiar decides how far the fixer goes, and what to do with the contradictions
it records as too big to fix quietly.

**Stage E5: translation across media.** The first other medium is a
**sequential-art view** of the Reader. One Reader serves both prose and art,
sharing its core (the story and its chapters, the reader's place, Next Chapter
and Fate, the Codex, the music and atmosphere, Sound Cues and speakers, the
settings storage), while each view owns its own layout: prose keeps its bars,
text settings and cinematic scroll; art takes the whole screen, hides its
controls until a tap in the middle, turns pages with the thumb, and goes
straight on to the next chapter.

1. **The thumb test, before anything is connected.** In the Reader Chamber
   workspace, a sequential-art scene loads about three chapters of panel
   images for Sundered Heavens (made with Manga Studio as it is today, by hand,
   or placeholders) as the chapter body (`ReaderChapterBody`), in two modes:
   **page flip** (manga, right to left) and **vertical strip** (manhwa and
   manhua). Controls hide until a tap; a few Sound Cues and the chapter's
   atmosphere are pinned to panels by hand. No HARNESS or Codex change. The
   owner reads it on a phone, three chapters straight: can they go chapter to
   chapter without thinking, do the controls stay out of the way, does a Sound
   Cue on a panel feel right, do the Codex and Fate feel natural from the art?
   If only the layout needed changing, the one-Reader design is confirmed; if
   a shared part feels wrong (Fate interrupting the flow, for example), that
   part splits, and the story, audio and Codex stay shared underneath.
2. **The view, made real:** the frame lets a chapter body own its controls and
   gestures, not only its content. Display settings (direction, fit, page or
   strip) take the place of Text settings; Sound Cues fire when their panel
   comes on screen; Listen reads the panels' dialogue or stays off.
3. **Art from the record:** panels drawn from the scene and appearance records
   (Stage E1), with Sound Cues and speakers pinned to panels the way they are
   pinned to sentences today.

Manga Studio, and later animation and game exports, are studio work on the
same record; none of them adds anything medium-specific to the story itself.

## Names

| Name | What it is |
| --- | --- |
| SEN | SEIHouse Expanded Novels: the product-independent, licensable expanded-novel engine (`@seihouse/sen`). [The product family](#the-product-family). |
| Expanded Novels | SEIHouse's first-party product on SEN, at NovelExpanded.com. In code, the Library (`@seihouse/library`), presented as the Celestial Library. |
| SEA | SEIHouse Expanded Albums: SEIHouse's expanded-music product, separate from SEN. It inherits the shared infrastructure SEN pressure-tests. |
| NovelExpanded app | Expanded Novels' app at NovelExpanded.com. Built at `/app/` (piece 1: the core application spine of Home, Create, Story View and Reader; piece 2: the Library Shell around it; piece 3: Profile, with the Familiar and a practice economy; piece 4: Story Settings in Create and Story View; piece 5: cover art on Story View), in `src/novel-expanded/`. |
| Story Seed / World Blueprint | Where a story is created (`?preview=story-seed`, and Create in the app). The Blueprint is the novel's transferable core: what a reader takes to make their own version ([The World Blueprint](#the-world-blueprint)). |
| Story View | The story's own page: cover art, the story, Enter. Built today as the World Info page (`WorldCardInfo`), where Begin Story or Continue leads into the Reader Chamber, with Manifest on its cover and the story's Story Settings below it. |
| Reader Chamber | Where chapters are read: a HARNESS story's chapters on the Text Highlight Engine with Sound Cues, Listen and the soundtrack (`HarnessReaderSession`). Its Workshop card (`?preview=reader-chamber`) shows this Reader as Development, beside production's Reader as the Original Reference; the older development Reader is no longer on it. |
| Listen / Read Aloud | The Reader reading a chapter aloud in three voices with the spoken sentence lit (`useReadAloud`, SEN's `reader-runtime`). Its voices and speed live in Reader Settings → Narration. |
| Reader Settings | The Reader's settings sheet: Text, Audio, then Narration. |
| Chapter body | What shows the chapter inside the Reader's frame: prose today (`ProseChapterBody`), sequential art later (`ReaderChapterBody`). |
| Rewrite this chapter | The reader's request to write the newest chapter again, with an optional note (`rewriteLatestChapter`, `chapterRewriteGap`). |
| Holdings fixer | SEN's unseen check after each chapter, which settles small holdings problems and keeps a record on the chapter (`planHoldingsFix`, `applyHoldingsFixes`, the `fix-holdings` call). The Library, later the Familiar, sets how far it goes. |
| Text Highlight Engine (manuscript lab) | The manuscript editor at `?preview=text-highlight-engine`. |
| Story Settings | The only place a user meets the HARNESS: language, reading mode, CAPA skills and media. On Story View (`StorySettings`) and in Create's Settings (`CreateStorySettings`), from `@seihouse/library/stories`. |
| Harness Generation | The developer instrument for the HARNESS (`?preview=harness-generation`). Never a product page. |
