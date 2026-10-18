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
- **Last updated:** 2026-10-13
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
- **Creator production:** the Highlight Engine, targeted regeneration, manual
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

Advanced tools, such as the Highlight Engine, manual media placement, custom
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

The Highlight Engine gives SEN an author half beside the reader half. It is one
engine for highlighting part of a story and attaching something to it: prose
today, the images of sequential art later (Stage E5), never a separate "text"
and "image" engine. Every paragraph, sentence and span has a permanent address,
and every attachment knows when its words change. In the Reader it is **Create
mode**. That means:

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
- **The Codex grows with the record** (SENSEI, 2026-10-13). The information tags
  exist to fill the Codex, and the Codex is where the owner checks them, so it is
  remade alongside them: it shows only what the record holds today, and each new
  information tag adds its own part as it is built. What is stored and how it is
  shown are not one for one: the record stays exact and medium-neutral, while the
  Codex presents it to immerse the reader, closer to a game's character screen
  than a table. What it must finally hold so a story can be translated into other
  media is in
  [the HARNESS principles](./src/components/harness-generation/HARNESS_PRINCIPLES.md#translation-across-media-the-world-record).
- **One record, many views** (SENSEI, 2026-10-13). Each main category (characters,
  factions, items, and later places, the Bestiary's species and the rest) is one
  record, built the same way. Power Rankings, Karma and the other Codex mechanics
  are not separate stores fed separately, as the old Codex had them: they are
  different ways of displaying that same record. Everything about one character
  shows together when their card is opened; nothing about them is scattered
  across pages.
- **Manifesting happens while reading** (SENSEI, 2026-10-13). A name the story
  has met glows in the chapter; the reader taps it, a small card opens over the
  text, and Manifest makes its picture right there. Nothing the story has not
  yet shown can be manifested. The Codex is where the reader looks at what they
  have collected, so by the time they open it most of its cards already wear
  their pictures; it is a gallery of cards, not a place to manifest from.
  **For testing first** (SENSEI, 2026-10-15): before manifesting while reading
  is built, an opened Codex card offers Manifest, so the owner can see how well
  the looks the story wrote down bring its characters and items to life. It
  uses the prompts manifesting while reading will use.

## Where we are (2026-10-10)

The current implementation status, and the only section that says what is built.
Update it whenever it changes.

- **Built:**
  - Chapters are narration plus Sound Cues in the tiny SEN language (#295).
  - Each chapter asks for about 1,500 words (1,200 to 1,700; SENSEI,
    2026-10-14, after 2,500 read too long) in exactly 35 paragraphs for now, so
    the writer's accuracy can be measured; the range to return to is 30 to 55.
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
    **The Codex** shows what the story's record knows (below). No Mind Palace,
    reader translation or read marks.
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
    page.** Fate, the Codex and Reader Settings open as **panels** over it,
    with the chapter still readable and scrollable, so the reader can look
    back at what they just read while they decide: on phones a sheet that
    drops to half height ("Show the chapter"), on laptops a panel at the right
    with the chapter moved beside it. Listen reads on under a panel. An arc's
    goals take the screen, and the reader comes back to their exact place.
  - **The Codex, remade on the record (2026-10-13):** a panel like Fate,
    opened from the bottom bar's Codex button, holding only what the record
    knows today. It is a **gallery of cards** (since the same day, from
    SENSEI): every category is the same card, its art filling it and its name
    at its foot, and opening a card shows everything the record knows about
    it together, its art large at the top. A card shows its unmanifested aura
    until its picture is manifested, which comes with manifesting while
    reading. **Characters:** everyone
    the story has met (they stepped onto the page, spoke, or held, used or
    learned something), the main character first; characters the Story Seed
    declares but the chapters have not reached stay out. Named beasts are
    characters too. Each opens to their rank, first appearance, their **Look**
    (since 2026-10-14: its one line and each trait the chapters state, with a
    link to every change), **first words**,
    **Equipped** and **Carried** things, **Abilities** (learning, known or
    sealed, with their stage) and a **Chronicle** of every change.
    **Factions:** sects, clans and other bodies of people, never characters,
    even when the writer tags one as speaking (those the Story Seed declares,
    or a name ending in a word like Sect, Clan or Tribe), each opening to its
    first words. **Items:** every thing that stepped onto the page or changed
    hands, who holds it now, its Look and everything that happened to it;
    things lost, used up or given away sit below, under **Archived**
    (2026-10-14). A **Bestiary** comes later (SENSEI, 2026-10-13): it
    holds species and unique beast groups (the dragon kin), while a named beast
    (the Dragon King, an emperor and the main villain) is a character.
    **Record checks** close each gallery, for testing. Every fact links to its
    passage, after a confirm (2026-10-14, SENSEI: an instant jump lost the
    reader's place): "Go to Chapter 4?" with Go or Stay. On Go the chapter
    behind the Codex moves to it and lights it while the Codex stays open,
    lowered to half height on a phone. It is worked out
    again from the chapters each time, so it always matches them. The older
    seven-tab Codex is out of the Reader; it stays in the code. The Workshop's
    Codex card (`?preview=reader-codex`) shows the new Codex reading
    Sundered Heavens as its Development view.
  - **Codex pictures, for testing looks (2026-10-15, SENSEI):** an opened
    character or item card whose look the record wrote down offers
    **Manifest**. One picture is made from that look (its line and each trait
    the chapters state) and the story's own tradition, genre, tone and world,
    and the card wears it at once; **Manifest again** makes a new one in its
    place. A card with no look yet says Manifest waits for one, since nothing
    the story has not shown can be manifested. Pictures use the Model Router's
    image choice (**Codex Picture**), share the cover's visitor limit, and are
    kept on the device until the database. The two prompts, character and item,
    are on the Image Prompts page to refine. No Energy is taken yet. The
    Workshop's Codex makes a stand-in picture, with no image model.
  - **Right-to-left reading (2026-10-13):** Arabic, Hebrew, Persian and Urdu
    are SEN languages, so a story can be written in them, and the Reader reads
    such a story right to left. The direction comes from the story's language,
    never a reader's toggle. The text and its title run right to left, and the
    lit sentence and Sound Cue highlights follow the words. Back, the chapter
    arrows and the bars' ends mirror, and the chapter list opens in the story's
    direction. The sentence controls keep their order, as media controls do in
    every language. An English name, a number or a System line inside Arabic
    keeps its own order. Each script is set in a font chosen for it: Noto
    Naskh Arabic and Noto Serif Hebrew beside a serif, Noto Sans Arabic and Noto
    Sans Hebrew beside a sans. Urdu is set in Naskh for now, not the Nastaliq
    its readers often expect. Speech finds Arabic «…» and Hebrew „…“ quotes, and
    an Arabic ؟ or Urdu ۔ ends a sentence.
  - **A place to work on the Reader:** the Workshop's Reader Chamber card
    (`?preview=reader-chamber`) shows the app's Reader as its Development view.
    It is the same component the app renders, so the two cannot drift apart. It
    reads SENSEI's Sundered Heavens test, the same story begun again in Arabic
    for right-to-left reading (Advanced), or any story saved with Export story.
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
    every chapter the writer writes a soundscape tag and an atmosphere tag,
    separate sounds with separate tags since 2026-10-12
    (`[[soundscape: mystical]] [[atmosphere: forest]]`; before, one
    `[[soundtrack: mystical | forest]]`), from the story's
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
      and the music note, never on them. In the Reader its recall lives in the
      top bar; the writing veil wears the same Familiar.
      **Direction (2026-10-16):** the Familiar becomes a contextual guide across
      the whole app, explaining and controlling features, with accessibility
      and translation central to that role. **First experiment:** its microphone
      reviews and saves the Reader's existing four Fate choices, with touch and
      typing equivalents and a separate confirmation. One global interaction
      owner accepts screen-supplied actions and a replaceable voice adapter.
      General conversation, translation and hands-free activation come later.
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
    (under a quarter of its 1,200-word minimum) is a failed write: nothing is
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
  - **Create mode:** the Highlight Engine's tools are in the Reader as Create
    mode: wording, Sound Cues, and the chapter's soundscape and atmosphere
    (each its opening, and one change partway through) on the newest chapter.
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
  - **First appearance, with its look (2026-10-14, Stage E1 step 1):** the
    writer tags each character or named thing the moment it first steps onto
    the page (`[[appears: Name | character]]`, `[[appears: Thing | thing]]`)
    and each change to a look (`[[look: Name | what changed]]`), taught by SEN
    Appearance on every chapter. Each is saved on its sentence and names the
    same Codex entry holdings use. Then a second small step after the chapter
    is saved, the **look step**, reads each tagged passage (with the Story
    Seed's notes on a declared character, and the look before a change) and
    writes the look down: one line and the traits the passage states, in
    words any medium can use, never how to show it, and where the passage
    differs from the Story Seed. One short call with the chapter's own model,
    only when the chapter tagged an appearance. Every later chapter's writer
    reads who and what has appeared, with each latest look, in Story
    Information's new **Appeared** section, and keeps those looks; the Codex
    shows each look on its card. Checks flag an appearance tagged twice, a
    look for someone who never appeared, and someone who speaks before any
    tag shows them. A story begun before the tag (Test Story - Blade) tags
    everyone on the page again in its next chapter, since nobody has appeared
    on its record yet. Places wait for the Place tag.
    After the first test (Test Story - Blade, chapters 3 to 10): every new
    character was tagged and the looks held from chapter to chapter, but no
    thing was tagged. So a thing now steps onto the page with the first
    Holdings tag that shows it (held, gained, taken up or put away) and gets
    its look, with nothing more for the writer to do; and a look tag in the
    paragraph that first shows someone is read as that first look, never a
    change (SEN Appearance 1.1.0).
- **Not tested yet:**
  - a right-to-left story with a real model, and Listen in Arabic and Hebrew
    on real phones, whose voices for those languages differ from device to
    device;
  - real generation with a real model on the Vercel preview: a real Blueprint
    (Arc 1 only, filled slots), a real arc planned at a new arc, and real
    speaker tags;
  - holdings with a real model: the 10-chapter test, comparing what the
    chapters show against the Codex. The first run (six chapters)
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
  - the appearance tags and the look step with a real model: whether the
    writer tags everyone new on the page and keeps the looks Appeared gives,
    and whether the looks written down match the prose (each chapter's
    `looks` in the export shows them);
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
2. **Agent:** manifesting while reading ([its direction](#how-we-build)):
   names the record has met glow in the chapter and open a card with
   Manifest, whose picture the Codex's card then wears. It waits on the
   owner's refinement of the Color Codes, which the glowing names use (SENSEI,
   2026-10-13). The Codex as a card gallery is built.
3. **Owner:** test the first information tag, **first appearance with
   appearance** (Stage E1, step 1, built 2026-10-14), by writing the next
   chapters of Test Story - Blade on to ten and exporting it: does the writer
   tag everyone new, do the looks written down match the prose, and do later
   chapters keep them? Then Stage E1 step 2, Status.
4. **Agent:** the next step of reading in every script (product track, item
   1): a reading font chosen on purpose for each remaining script. Right-to-left
   reading is built.
5. **Either track's next piece** below, when the owner asks for it.

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
   **Right-to-left is built (2026-10-13)**, for Arabic, Hebrew, Persian and
   Urdu (see [Where we are](#where-we-are-2026-10-10)). What remains: a font
   chosen on purpose for each other script the SEIHouse fonts do not cover
   (Chinese, Japanese, Korean, Thai), the owner's choice of Nastaliq for Urdu,
   and vertical Japanese and Chinese text.
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
5. **Cinematic scrolling**, the Reader's default way to read: the reader looks
   at the screen, never scrolls, and the world activates in front of them.
   Built after right-to-left reading, on a Reader Chamber that is properly
   built. Agreed with the owner (2026-10-13):
   - **The big Play button starts it.** Nothing else to turn on.
   - **The voice is the clock.** The page moves with Listen's voice (its
     playhead is ready for it): a faster voice scrolls faster, a slower one
     slower, and the two never drift apart.
   - **A constant slow glide**, never a jump or a stop-and-start; the sentence
     being read stays at one place on the screen. It replaces today's
     follow-the-voice jumps (`useFollowNarration`).
   - **One timeline.** Sound Cues fire as the voice reaches their words, over
     the chapter's atmosphere. Manifestations join the same timeline later
     without a redesign; how they appear (a Codex entry or character taking
     the full screen, for example) is decided with their redesign.
   - **A touch hands the page back to the reader** at once. **Resume** glides
     back to the voice; nothing pulls the reader back on a timer.
   - **At a chapter's end**, regular mode writes the next chapter and goes
     on; Fate Survival stops at Fate.

   Later, on the same timeline: a **silent version** that moves at a reading
   pace with only the atmosphere and Sound Cues; **writing one chapter ahead**,
   an option so regular mode never waits on the writing screen (the reader
   gives up some authoring for it); **streamer mode**, where nobody touches the
   screen, with Alter Fate on stream after it. Production's cinematic scroll
   (`reader-chamber/reference/`, described in `PRODUCTION_READER.md`) shows its
   spring glide, its hand-back and its Resume pill, but it guessed each
   paragraph's length; this one follows the manuscript's spoken sentences.
   AI narration (generated once per language, stored and shared) comes after,
   on the same script.

### The engine track: the world record and the Codex

**Stage E0: prove what is built.** Basic first: nothing new is added on top of
tags that have not been measured with a real model. The tests are the ones
under [Not tested yet](#where-we-are-2026-10-10): the 10-chapter holdings test
with the strict tag shape, speaker tags, the soundtrack tag, Rewrite and the
Holdings fixer. Done when an exported story shows the tags landing reliably
(the Codex agrees with the prose, speakers are tagged from Chapter 1,
few sounds lost). A cost check can ride along: the same test on a second, cheaper
model added to the Model Router, comparing tag accuracy and each chapter's
receipt.

**Stage E1: the information tags, one at a time.** Each is a new kind in the
tiny SEN language, built with the five parts the
[vocabulary](./src/components/harness-generation/ARCHITECTURE_VOCABULARY.md#the-tag-system-the-tiny-sen-language)
defines, proven with a real model before the next begins, and shown in the
Codex as it is built (as holdings and speakers are today). Together they
complete the [world record](./src/components/harness-generation/HARNESS_PRINCIPLES.md#translation-across-media-the-world-record).

1. **First appearance, with appearance:** when a character, thing or place first
   appears, and later when its look changes (a scar, new robes, a
   breakthrough). The writer tags the moment; the full description can be
   gathered by a small separate step after the chapter is saved, registered in
   the Model Router, so the writer's job stays small.
   **Decided (2026-10-13, the owner left these to the agent):** the writer
   types `[[appears: Name | character]]` or `[[appears: Name | thing]]` where
   someone or something is first on the page, and `[[look: Name | what
   changed]]` when a look changes; the description is gathered by the separate
   step, not written into the tag. A being that is both a thing and a
   character (a sword with a spirit, like Chi Lian in Test Story - Blade) is
   **two entries**, the thing and the character, since an artist draws them
   apart; the bound tie (step 5) joins them. Places wait for step 3, which
   reuses the same tag. Every later chapter is told each appeared character's
   and thing's one-line look, so looks stay consistent, and a declared
   character's Story Seed look is the starting look the prose is checked
   against.
   **Built (2026-10-14):** the tags, SEN Appearance, the Appeared section, the
   look step (registered as Look Describer) and each Look in the Codex, as
   [Where we are](#where-we-are-2026-10-10) says. Not yet proven with a real
   model.
2. **Status:** alive, wounded, transformed, sealed away, and so on. Moved
   before Place on 2026-10-14 (SENSEI): "the world remembers what you did"
   mostly comes from Status and Ties, so a dead sect leader stays dead because
   his card says so, and a pin naming him can close (Stage E3).
3. **Place:** places become Codex entries, and the record knows where each
   character is.
4. **Scene:** where a story scene starts, where it is, when (time of day,
   conditions) and who is present. With appearance, this is what an artist
   needs to draw a panel. Its first piece is the cast plan before writing
   (Stage E3).
5. **Ties:** allied, hostile, related, bound.

**Stage E2: complete the Codex on the record.** The Codex is remade alongside
the tags ("the Codex grows with the record", [How we build](#how-we-build)):
since 2026-10-13 it has characters (with their holdings as one section of each
character's sheet) and items, each fact linked to the passage that made it.
Each tag of Stage E1 adds its part (looks, places, scenes, status, ties); what
remains here is the rest of its categories (factions, the timeline) and its
finish. Done when the record passes the two tests in the principles: **the
artist test** and **the save-game test**.

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

**Long-story memory: decided (2026-10-14, SENSEI).** Storage is not the
problem; showing the writer the right things at the right time is. Show every
past choice every chapter and the story keeps bringing them up, forced and
creepy; show too little and the world forgets what the reader did. One rule
answers both: **the writer sees what the next chapter touches.** Nothing is
ever deleted; everything else waits in the full record.

- **Alter Fate is "what happens next."** Each choice is kept exactly as the
  reader wrote it, with its chapter number (Ch. 67: "Kill the sect leader."),
  never summarized or interpreted (already true: `HarnessChapter.path`). It is
  used up by the next chapter, then becomes history, hidden from the writer.
- **A past choice comes back only when relevant:** when the next chapter
  touches what it was about (the arc goal, the reader's new direction, the pins,
  or who is on the page). What a choice was about needs no model: the chapter
  that carried it out already tagged everyone involved. It returns as history,
  the reader's words with that chapter's saved recap, at most about three.
- **Consequence, never recap.** The narration never recaps a past choice or
  reminds the reader of it. A character it affected may react to it in their
  own words when the story reaches them: "You killed my master" is a
  consequence; "Three months ago, you chose to kill the sect leader" is a
  recap. The writer is told the difference, so it never avoids the event.
- **Choices about a direction, not a person** ("Leave the sect forever",
  "Give up cultivation") are not left to recall. What changed in the world
  becomes state (a tie that ends; a status, or abilities sealed); what the
  reader keeps holding to becomes a pin ("Never return to the sect").
- **A Hard Pin is "what I'm working toward."** It stays in front of the
  writer every chapter until it ends (already true, at most 3,
  `HARD_PIN_LIMIT`). Two kinds share the 3 slots: **rules** ("Lin never
  betrays his sect") never resolve; **goals** ("Find my mother's killer")
  close. A pin ends three ways: the reader drops it; Status closes it when it
  names someone with a card ("Kill Zhao Wuchen" closes when his card says
  dead); or, when it names no one yet, the writer reports it resolved with a
  verbatim passage, as it reports an arc goal reached, and the HARNESS checks
  the passage is in the chapter. The reader sees "Pin resolved" and can reopen
  it. Open threads live in pins; finished actions live in history.
- **The reader decides which is which, never a model.** Readers will type a
  goal into Alter Fate ("Find my mother's killer"). After they submit, the Fate
  page offers one tap: **Pin this as a goal?** Any past Alter Fate can be made
  a pin from the story's history.
- **How much the writer sees.** Already capped by recency: the main character
  and up to 20 characters and 10 things in Appeared, holdings for the main
  character and 6 others, the last 5 recaps. Added: the arc goal, the reader's
  direction and the pins pull an older card back from the full record by name.
  Later, recall by meaning (above) finds vaguer references ("the old smith
  from the mountain"). The reader's own Codex keeps every card, this arc's
  first.
- **The known hole: who is in a chapter before it is written.** Today the
  writer decides inside its one call, so a long-gone character who returns
  mid-chapter gets no card. First fix, no model: pull the card of every name
  in the reader's direction, the arc goal, the pins and the last recap. Full
  fix: a small "who is in this chapter" call before writing, the first piece
  of Scene (Stage E1, step 4).
- **Snapshots.** At 1,000 chapters, working everything out from every chapter
  each time is too slow: a snapshot of the record is saved at each arc's end,
  and at each branch point once Alter Fate branches exist (every branch is its
  own world; Rewrite this chapter is already a tiny branch). Each world
  rebuilds from its own latest snapshot.

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
| Reader Chamber | Where chapters are read: a HARNESS story's chapters on the Highlight Engine with Sound Cues, Listen and the soundtrack (`HarnessReaderSession`). Its Workshop card (`?preview=reader-chamber`) shows this Reader as Development, beside production's Reader as the Original Reference; the older development Reader is no longer on it. |
| Listen / Read Aloud | The Reader reading a chapter aloud in three voices with the spoken sentence lit (`useReadAloud`, SEN's `reader-runtime`). Its voices and speed live in Reader Settings → Narration. |
| Reader Settings | The Reader's settings sheet: Text, Audio, then Narration. |
| Chapter body | What shows the chapter inside the Reader's frame: prose today (`ProseChapterBody`), sequential art later (`ReaderChapterBody`). |
| Rewrite this chapter | The reader's request to write the newest chapter again, with an optional note (`rewriteLatestChapter`, `chapterRewriteGap`). |
| Holdings fixer | SEN's unseen check after each chapter, which settles small holdings problems and keeps a record on the chapter (`planHoldingsFix`, `applyHoldingsFixes`, the `fix-holdings` call). The Library, later the Familiar, sets how far it goes. |
| Look step | SEN's unseen step after each chapter that tagged an appearance: it writes down how each character and thing looks from the passage that shows it, and keeps the looks on the chapter (`planLookSubjects`, `chapterLooks`, the `describe-looks` call; Look Describer in the Model Router). |
| Appeared | The Story Information section listing every character and thing already on the page, with its latest look, so the writer keeps every look (`appearancesSection`). |
| Codex | The story's world as its record knows it, opened in the Reader as a panel: characters, factions and items today (a Bestiary of species later), every fact linked to its passage (`StoryCodex`, worked out by `deriveStoryCodex`). It grows as each information tag is built. |
| Highlight Engine | SEN's engine for highlighting part of a story and attaching to it: prose today, sequential-art images later. Its lab is at `?preview=highlight-engine`; in the Reader it is Create mode. Never "Text Highlight Engine". |
| Story Settings | The only place a user meets the HARNESS: language, reading mode, CAPA skills and media. On Story View (`StorySettings`) and in Create's Settings (`CreateStorySettings`), from `@seihouse/library/stories`. |
| Harness Generation | The developer instrument for the HARNESS (`?preview=harness-generation`). Never a product page. |
