# NovelExpanded app

The NovelExpanded app as its own place, at **`/app/`** on every preview and
deployment. It holds the core application spine from [`NOVEL_EXPANDED.md`](../../NOVEL_EXPANDED.md),
the minimum path through the product:

**Home → Create (Story Seed and World Blueprint) → Story View (World Info) → Reader**

and, beside it, the reader's **Profile** (the Library's Cultivator Cave) with
everything it connects to: Settings, the Familiar, and the economy the Cave shows.

The Workshop is where systems are built and inspected one at a time. The app is
where they are used together, the way a reader meets them.

- Created: 2026-10-01 (piece 1)
- Last updated: 2026-10-10
- Owner: `host` (`scripts/ownershipInventory.mjs`). The app is a host of the
  Library and SEN packages, like any outside app would be.

## Workshop synchronization

The existing Home workspace (`?preview=light-novels-home`, card **Home**)
loads `/app/` directly in its Development pane at mobile, tablet and laptop
sizes. It therefore shows the same shell, branding, Home states and saved browser
stories as the app. Its actions use the app's real services and storage; it does
not seed or reset stories. Original Reference keeps the historical Light Novels
Home and Compare shows both.

Changes to an app surface must keep its equivalent Workshop Development preview
current in the same change, as required by `AGENTS.md`. Share source or load the
app route instead of maintaining a separate copy of its presentation. Preserve
historical references and verify both destinations on mobile and desktop.

- **2026-10-10:** Connected the existing Home Workshop Development pane to the
  actual app route to prevent shell and page drift; kept the original comparison.

## Pages and addresses

Each page is a query on the app's own address, so a deployment needs no
rewrites and every page survives a reload.

| Page | Address | What it is |
| --- | --- | --- |
| Home | `/app/` | The reader's stories, newest first, and Carve New Destiny |
| Create | `/app/?page=create` | The Library's Story Seed journey: the seed, its World Blueprint, Manifest Story |
| Story View | `/app/?story=<id>` | The story's World Info page: Begin Story or Continue, Manifest on the cover, Story Settings, and Export story (the whole story as one file, for sharing a test) |
| Reader | `/app/?story=<id>&read=1` | The reading-only Reader, with the Generation Overlay while a chapter is written |
| Blueprint | `/app/?story=<id>&blueprint=1` | The story's own World Blueprint, opened from World Info's Blueprint button. Every story on the device is the reader's own, so it opens for its creator: editable while the novel is private, saved as a new Foundation revision the next chapter uses |
| Profile | `/app/?page=profile` | The Library's Cultivator Cave; its own pages in `cave` (Settings: `&cave=/settings`). |

- Home and Story View sit in the Library Shell; Create is Story Seed in the shell's workspace mode; Profile is the Cave, which draws the same shell itself; the Reader is full-screen (below).
- Moving inside the app adds a browser history entry, so Back and Forward walk the same pages.
- Manifest Story replaces Create with the new story, so Back from it goes Home.
- `/app` without the slash redirects to `/app/` (the Vite dev and preview servers, and `vercel.json`).
- A story id the app does not have goes Home.

## The Library Shell

- **2026-10-09** — The Home and World Info footer replaces its text title with
  the same approved wordmark as the header, above “An Experience by SEIHouse”.

- **2026-10-09** — Home and World Info use SENSEI's approved NovelExpanded
  wordmark with the Familiar star in place of the title plaque, alongside the
  original glowing Celestial Library dragon emblem. Both return to Home;
  the Familiar, Help and Search keep their actions. The dragon falls back to
  the existing local image when the media server cannot load.
  The image is served locally from `public/novel-expanded/wordmark.png`.
  Other pages retain their page-specific identity.

The app's pages sit in the Library's own shell (`@seihouse/library/shell`), the
same one the Workshop's Library preview shows, with only the places the app has
built:

- **Home and Story View** (`AppShell.tsx`): the Library header (NovelExpanded,
  the Familiar's recall, Help and Search), the navigation and the footer around
  the page.
  - **The music note** (while Menu music is on): on phones and tablets it floats
    just above the bottom bar's right end, as the Reader's note floats above its
    Listen bar, faint while the page scrolls; on laptops it sits in the header
    before Help and Search.
  - **Navigation:** Home, Create and Profile (`appPlaces.ts`, given to every
    Library navigation in the app by `LibraryDestinationsProvider`, the Cave's
    included); on phones and tablets the bottom strip, and from 1024px the
    Pathways sidebar, with Settings at its foot beside Profile. Story View keeps
    Home selected. Discover joins when its page comes to the app.
  - **The sidebar's choice is kept:** a double tap or double click switches it
    between open and the icon rail, and it opens that way on the next visit.
  - **Search** finds Home, Create, Profile, Settings and each of the reader's
    stories, and opens its World Info.
  - **The footer** has Explore (Your stories, Create a story, Your profile),
    Support (Help, Settings) and the legal row. Terms, Privacy and Cookies open the Library's draft documents,
    marked as drafts. Social channels wait for published addresses.
- **Create** is Story Seed in the shell's workspace mode: its task bar (Sections,
  Story Bank, Settings, Back) stands where the strip was, with the same music note
  (`WorkspaceHeaderSoundProvider`), floating above the task bar on phones and
  tablets and in Story Seed's header on laptops.
- **Profile** is the Library's Cave (`LibraryProfile`, below), with its own
  header, navigation and pages; its logo returns Home.
- **The Reader** stays outside the shell. It is immersive and scrolls the page
  itself. Story View is framed by the shell through `StoryPages`' `frame`, so Start
  Story still begins Chapter 1 when the Reader opens.

## Profile

`ProfilePage.tsx` mounts the Library's Cultivator Cave (`@seihouse/library/profile`)
for this device's one reader, who is always signed in (there are no accounts yet).
It is the Cave the Workshop's User Profile preview shows, on the app's own services:

- **The reader's profile, on this device** (`src/host/profile/`). The Dao Name and
  its aura, the languages (with the Cave's 30-second confirmation), the default
  Reading Mode, the equipped Familiar and its size are saved in the reader's
  device preferences (`novelexpanded-reader-profile`) the moment they change. It
  is the one record every surface reads: the Cave, the floating Familiar, the
  writing veil's Familiar, and Create, where a new Story Seed starts from the
  profile's reading language and Reading Mode.
- **A practice economy** (`src/host/economy/`). QI, DAO XP, Energy, the Daily Dao
  Pillar, rewards and Familiars are the Library's real economy, every ledger and
  rule of `/api/library-economy`, running in the page. Until the database, it is
  a practice account: it opens with 1,000,000 QI and every Familiar unlocked, so
  each can be equipped, trained and shown; what the reader does with it (a Dao
  Pillar claim, an offering, a purchase) lasts for the visit, and a reload opens
  the account again. Nothing reaches a server.
- **The profile picture is made from the reader's photo.** Profile's portrait
  builder sends the photo (made smaller first) to `/api/profile-picture` with
  the approved prompt, three times, and shows the three portraits to choose
  from, each with a download button; the chosen one is kept, small, in the
  profile on this device. It uses the Model Router's image choice (Nano Banana
  2 Lite by default); visitors may make 2 sets of 3 every 30 minutes, and the
  access token lifts the limit. Each portrait shows 5 Energy leaving (practice:
  nothing is taken yet).
- **What needs a server says so.** Keyboard Shortcuts, Redeem Code, Sever Link, Harmony sync, backup and import,
  the Aether Router and the Inbox still show, disabled, with "Not in the app
  yet." The reader is not an owner, so the Akashic Switchboard does not show.
- **Its Stories page** lists the reader's stories and their Story Seeds, and
  exports a seed the way Story Seed does.

## Story Settings

The story's own settings, the only place a reader meets the HARNESS (the
Library's `StorySettings` and `CreateStorySettings`, `@seihouse/library/stories`):

- **Story View:** below the World Card, closed until opened: the Story Language
  (fixed when the story began), the Reading Mode, the CAPA skill slots (the
  Author, Pacing, Continuity and Style skills to choose from the official
  ones; the managed slots say what fills them) and the Media Loadout (the
  Library's own sounds, with the sound words the writer may use; the app has
  no other packs yet). A change applies to chapters written from then on; while
  a chapter is being written the settings wait and say so.
- **Create:** Story Seed's Settings sheet holds the Story Language and Reading
  Mode, then the CAPA skills and media the story will start with (the Style
  skill follows the Seed's tradition unless changed). What the reader changes
  is a draft on this device (`novelexpanded-reader-create-story-settings`):
  Manifest Story starts the story with it (`startHarnessStoryFromSeed`), then
  clears it. A chosen skill no longer installed, or a pack no longer unlocked,
  falls back to the default.

## Cover art

The cover on World Info is where covers are made. A story without one shows
**Manifest** across its cover; tapping it offers **One cover** (5 Energy) or
**Three to choose from** (15 Energy). The covers are made from the story's own
words (title, genre, tradition, logline, main character, tone, world and tags;
never its chapters) with the owner's approved cover template, the title drawn
on, through `/api/story-cover`, one request per cover, behind the Aura Veil's
media reveal. One cover is kept and revealed; three open a picker where they
come alive one after another, and the reader keeps one ("Use this cover"; the
others are let go, and each can be downloaded first). A kept cover shows a
small Manifest and a download in its lower corners, and World Info and Home's
card wear it.

- The image model is the Model Router's Images choice (`useModelPreference('images')`),
  Nano Banana 2 Lite unless the reader picks another.
- Visitors may make 3 covers every 30 minutes, so three to choose from uses the
  whole allowance; the owner's access token lifts the limit, asked for once for
  all three in the same sheet as chapters (`coverMakerWithAccessToken`).
- Covers are kept on this device (`src/host/media/storyCovers.ts`, IndexedDB
  `novelexpanded-story-covers-v1`) until the database keeps them in R2; covers
  made but not kept are never saved.

## The Familiar

`AppFamiliar.tsx` gives the app one Familiar, the profile's equipped one:

- It starts minimized: its recall sits in every Library header (Home, World Info,
  Create, the Cave), beside the music note on laptops. Summoned, it floats over
  the page and keeps its place from page to page.
- On phones and tablets it starts at the bottom right just above the bottom bar
  and the music note floating over it, never on them (the Library's
  `useLibraryBottomClearance`), and it can be dragged anywhere above them.
- A Familiar or size chosen in the Cave changes it at once, and the writing veil
  wears the same Familiar.
- The Reader is immersive: the Familiar and its recall stay out of it.

## Same chapters as the Workshop

The app writes chapters exactly as the Workshop's HARNESS page does:

- the official CAPA skills (`src/host/generation/capa/`), installed in memory, so the app never writes the Workshop's imported-skill inventory;
- the Library's sound words and Sound Cues (`LIBRARY_BASE_MEDIA`), played through the reader mixer below;
- chapter tags and recaps recorded in the chapter write, with no separate memory call;
- the Model Router's chapter model (`useModelPreference('chapters')`), the one choice shared with the Workshop;
- the equipped Familiar on the Generation Overlay, with its animation and elemental accents: the reader's profile's (Quill, the catalogue default, for a new reader).

The app opens only once its stories are open and the skills are installed. If
either fails, it says so plainly, with Retry.

## Sound

The app's one sound owner is SEIHouse's audio player: `main.tsx` creates one
reader mixer for the page (`createHostReaderMixer`, with SEN Atmospheres,
Volume 1) and `NovelExpandedApp` provides it. The reader's mix is saved with
their other device preferences (`novelexpanded-reader-audio-mixer`), and so is
their Scene choice (`novelexpanded-reader-soundtrack-choice`). The older
single-channel player is not used by the app.

The app has its own music (`appMusic.ts`): calm pieces of SEN Soundscapes,
Volume 1 (`APP_MUSIC_MOOD`, ambient), one after another, on Home, Create, World
Info and while a chapter is written, with no model and nothing to wait for. In
the Reader each chapter's own scene takes over, as its writer chose it; leaving
the Reader brings the app's music back.

- **The first tap starts it.** Browsers and phones start no sound before the
  reader's first tap, and scrolling does not count. The music begins with the
  first tap anywhere, on Home as on any page; until then the music note says to
  tap. The browser walk checks this in a Chromium that follows that rule.
- **Leaving the page never stops it** (`keepPlayingWhileAway` in
  `src/host/reader/readerMixer.ts`): another tab, another app, a locked phone.
  The mixer does not pause while the page is hidden (`pauseWhenHidden: false`),
  time away does not count toward its idle rest (ten minutes without a touch on
  the page), and on return anything the browser or the phone paused plays on.
  The reader's mute and the sleep timer still stop it.

## Its own storage

The app's stories, reading places and Story Seeds are separate from the
Workshop's, so neither can overwrite the other (`services.ts`):

| What | Where |
| --- | --- |
| Stories | IndexedDB `novelexpanded-harness-stories-v1` |
| Reading places | IndexedDB `novelexpanded-reader-state-v1` |
| Narration voices and speed (Reader Settings) | localStorage `novelexpanded-reader-read-aloud` |
| The Reader's text: font, title font, size, line spacing, weight (Reader Settings → Text) | localStorage `novelexpanded-reader-text-settings` |
| The laptop sidebar open or minimized | localStorage `novelexpanded-reader-library-sidebar-mode` |
| The access token | localStorage `seihouse-development-access-token`, shared with the Workshop |
| Story Seeds | localStorage `novelexpanded-story-seeds-v1` |
| Story Settings chosen in Create, until Manifest | localStorage `novelexpanded-reader-create-story-settings` |
| Covers | IndexedDB `novelexpanded-story-covers-v1` |
| The reader's profile (name, aura, languages, Reading Mode, Familiar) | localStorage `novelexpanded-reader-profile` |
| The practice economy (QI, Energy, Dao Pillar, rewards, Familiars) | The page only: a reload opens it again |

A story started in the app shows on the app's Home, not on the Workshop's
developer page, and the other way round. There are no accounts yet: every seed
belongs to this browser's one reader.

## The access token

The owner's Development access token (`STORY_SEED_BLUEPRINT_ACCESS_TOKEN` on the
server) unlocks World Blueprints and lifts the chapter limit. The app asks for
it once, in a small sheet, the first time a Blueprint needs it or a chapter
reaches the limit, and saves it on this device. A token the server does not
accept is forgotten and asked for again.

Chapter writing (`/api/harness-generation`) allows a visitor without the token
6 requests per 30 minutes, the Workshop's limit, and covers (`/api/story-cover`)
3; with it there is no limit. A
chapter refused at the limit asks for the token and is sent again with it. The
server refused it before any model call, so nothing is written twice.

## What the app may reach: `npm run check:app`

`scripts/checkNovelExpandedApp.mjs` walks the app's real import graph from the
module `app/index.html` loads. It fails, printing the chain of files that got
there, when the app reaches:

- Workshop, test, deferred or unowned code (every `reference/` replica, preview mocks, `src/styles.css`);
- an older system's entry: `@seihouse/sen/reader-chamber`, `reader-codex`, `cards`, `translation`, or `@seihouse/library/generation`;
- the HARNESS developer page (`src/library/generation/`);
- the older Reader's code in `src/components/reader-chamber/` or `reader-codex/`, apart from five contracts the current Reader shares (reading language, manifestation eligibility, reading anchors, the semantic reading position, the Codex types);
- from its own files, a package entry outside its list: `@seihouse/library/{stories,story-seed,home,shell,presentation,profile,familiar}` and `@seihouse/sen/{story-seed,harness-generation,presentation,reader-runtime,styles.css}`. Profile and Familiar joined on 2026-10-07, when the owner brought the Profile into the app.

It runs in `check:app`, `verify`, `npm run build` (before `vite build`, so a
deployment cannot ship an app that breaks it) and CI. When it fails, reconnect
nothing: only what is being built now belongs in the app. Ask the owner when a
task needs something the list does not allow.

## Files

| File | Responsibility |
| --- | --- |
| `app/index.html` (repository root) | The app's page; loads `main.tsx` |
| `main.tsx` | Stylesheets (`src/host/styles/theme.css`, which also loads the SEIHouse fonts, SEIHouse Sans and the four SEIHouse Display cuts; `@seihouse/sen/styles.css`), the Library scrollbar on the page, and the real services |
| `NovelExpandedApp.tsx` | Providers (the mixer, the app's places, the music note for every Library header, the remembered sidebar, the economy), the opening gate, the Familiar and the pages; Chapter 1 begins at Manifest Story |
| `AppShell.tsx` | The Library Shell around Home and Story View: header, navigation, footer |
| `appPlaces.ts` | The app's places (Home, Create, Profile) and where each page sits in the Library's navigation |
| `ProfilePage.tsx` | Profile: the Library's Cave on the device profile and the practice economy |
| `AppFamiliar.tsx` | The app's one Familiar: the header recall and the floating companion |
| `appMusic.ts` | The app's own music, from SEN Soundscapes, on every page and while a chapter is written |
| `routes.ts` | Addresses and history |
| `services.ts` | Storage, the writer, the official skills, the Blueprint client, the reader's profile and the practice economy |
| `HomePage.tsx` | Home: the reader's stories, in `AppShell` |
| `CreatePage.tsx` | Create: `CreationModal` in a guest Story Seed runtime, starting new seeds from the profile's defaults; asks for the token before a Blueprint |
| `AccessTokenSheet.tsx` | The access token sheet, one for the whole app |
| `accessToken.ts` | The chapter writer with the owner's token: a chapter at the limit asks for it and is sent again |
| `storyCreationRuntime.ts` | The guest Story Seed runtime; which seeds already became stories |
| `src/host/media/storyCovers.ts`, `storyCoverClient.ts` | Covers kept on the device, and the cover server's client |

Story View and the Reader are the Library's `StoryPages` (`@seihouse/library/stories`).

## Arcs

Create's ARC page asks for the story's length in arcs (Story Length); left
blank, the World Blueprint suggests one. The Blueprint shows Arc 1's goals and
that length, nothing about later arcs. When a story reaches a new arc, the Reader's Next reads
"Arc N begins" and opens the World Blueprint's goal section for that arc
(SEN's `BlueprintArcPage`). Pressing Next plans the arc with one model
request through the Library's `planArc`; the reader reviews or edits the goals
(Fate Survival: one time), then writes or directs the arc's first chapter.

## Not in the app yet

- Accounts and server-side storage: the database, and with it a kept economy, sync, backup, codes, the Inbox and sign-out.
- Discover. It joins the shell's navigation when its page comes.

## Verification

- `src/novel-expanded/*.test.ts(x)`: the four pages and Profile, browser Back, an unknown story, the token sheet, a skill load failure, the Familiar across pages and out of the Reader, Settings kept on the device, Create's defaults from the profile, Story Settings chosen in Create becoming the new story's, a pack no longer unlocked, a cover made with the Router's image model and worn on World Info and Home, the token asked for at the cover limit, and a profile picture made from a photo (three to choose from, the chosen one kept) with the token asked for once at the limit.
- `src/library/stories/storySettings.test.tsx`: Story View's Story Settings (closed until opened, a Reading Mode saved, waiting while a chapter is written), the cover behind the media reveal, and the Create draft.
- `src/server/story-cover/http.test.ts`, `src/server/profile-picture/http.test.ts` and `src/library/model-router/server.test.ts`: the cover and profile picture routes (Nano Banana 2 Lite by default, the Router's choice, clipped fields or a readable photo, plain failures) and the Router's image calls (Gemini and OpenRouter, with an attached photo).
- `src/host/profile/*.test.ts(x)` and `src/host/economy/practiceEconomy.test.ts`: the device profile, the Cave's controller over it, and the practice account.
- `scripts/checkNovelExpandedApp.test.ts`: the guard, including the real app.
- `scripts/verifyNovelExpandedApp.browser.mjs`: the walk in Chromium at 390px and 1440px against the dev server, with stubbed APIs (a stand-in cover among them) and a stand-in for the browser's speech (headless Chromium has no voices): Create's Story Settings, Story View's Story Settings, and Manifest on the cover (three to choose from, the picker) to World Info and Home.

## History

- **2026-10-10** — The Reader reads in the SEIHouse fonts from the font repo: SEIHouse Sans for the chapter, a SEIHouse Display cut for its title. Reader Settings opens with Text (font, title font, size, line spacing, weight), kept on the device. A slim top bar stays at the top while reading, and the prose keeps about 60 characters a line.
- **2026-10-09** — World Info's four cards: **Codex**, **Portal**, **Information** and **Settings**. Information, marked with the story's format, holds everything about the world, Author's notes last. Settings opens the story's Story Settings (language and Reading Mode, skills, media and Author's notes) below the cards, in place of the separate Story Settings panel. Portal opens the world's other media; every story is a novel so far, so it says so until adaptations exist.
- **2026-10-09** — Covers are made on the cover: World Info's empty cover says Manifest, and the reader chooses one cover (5 Energy) or three to choose from (15). Three come alive in a picker and the reader keeps one; the others are let go. Every cover uses the owner's approved template with the title drawn on. The Manifest cover button beneath World Info is gone.
- **2026-10-09** — One Energy badge everywhere Energy shows: the Profile home's balance, the Store, the cost beside Make my portraits and New cover, beside Write Chapter in the Reader (1 Energy, with "−1" as each chapter arrives) and beside Manifest in Story Seed (a chapter's price for now). Practice only.
- **2026-10-08** — The profile picture comes to the app: the reader's photo goes straight to the image model with the approved prompt, three portraits to choose from, the chosen one kept on the device. Images default to Nano Banana 2 Lite for now. Every image made (portraits, covers) has a download button, and shows its Energy cost (5 per image) with "−5" floaters as it arrives; nothing is taken yet.
- **2026-10-08** — Story Settings and cover art come to the app. Story View has the story's Story Settings (language, Reading Mode, CAPA skill slots, media), closed until opened, and Create's Settings holds the skills and media a new story starts with, kept on the device until Manifest. Manifest cover on Story View makes a cover from the story's own words behind the media reveal, with the Model Router's image choice (Nano Banana 2 by default); World Info and Home wear it, and it is kept on the device. Visitors may make 3 covers every 30 minutes; the access token lifts the limit.
- **2026-10-07** — Profile comes to the app, with everything it connects to: the Library's Cultivator Cave in the navigation (Home, Create, Profile; Settings beside Profile on laptops, and in Search and the footer), on the reader's profile kept on this device and a practice economy in the page (1,000,000 QI and every Familiar unlocked, fresh each visit, until the database). The account and server pieces show "Not in the app yet." One Familiar for the app: its recall in every Library header, summoned it floats above the bottom bar and the music note on phones and keeps its place across pages, and it stays out of the Reader; the writing veil wears the same Familiar. Create starts new Story Seeds from the profile's reading language and Reading Mode.
- **2026-10-07** — Sound on phones: the music note floats just above the bottom bar's right end outside the Reader too (in the header on laptops), and leaving the page (another tab, another app, a locked phone) never stops the sound; time away does not count toward the idle rest, and sound a phone paused plays on at return. Checked that the first tap anywhere on Home starts the menu music, under a browser's no-sound-before-a-tap rule.
- **2026-10-07** — The Library Shell, in full: Home and Story View sit in the Library's header, navigation and footer, with the app's two places, Home and Create (the strip on phones, the Pathways sidebar on laptops, remembered on this device); Search opens the reader's stories; the footer offers Help and the draft legal pages. Create is Story Seed in the shell's workspace mode, and its header now carries the music note too. The Reader stays full-screen. Discover and Profile join when their pages come to the app.
- **2026-10-07** — Menu music is the reader's: a music note in Home's header mutes all sound with one tap, and hovering it (or holding it on a phone) opens a Music volume slider. It shows while the Menu music setting is on (on by default, kept on this device; its switch is in Profile Settings › Sound, in the Workshop until Profile comes to the app); off, the menus are silent. The Reader never opens to the menu music: it plays its own (each chapter's scene, or mystical pieces for a chapter written before scenes and while a chapter is written), and leaving it brings the menu music back.
- **2026-10-06** — The generation veil uses the host's equipped Familiar and its
  elemental colors. Visitors use Quill, the catalogue default. A host can pass
  `equippedFamiliarId`; there is no new profile, equipment store or account page.

- **2026-10-06** — Phase 4. The app plays its own music from SEN Soundscapes, Volume 1 on every page and while a chapter is written, and in the Reader each chapter's own music and atmosphere, chosen by its writer (Reader Settings → Audio → Scene lets the reader keep their own instead). The atmosphere and Sound Cues keep playing under the Reader's own pages. Chapter 1 begins the moment the story is made, while the reader looks over World Info (a Fate Survival story waits for its first direction); a chapter keeps writing when the reader leaves the Reader, and the reader's next Write finishes one a closed browser cut off. Models that offer `low` reasoning get it by default.
- **2026-10-06** — Rewrite this chapter: at the end of the newest chapter, until the next one is written, the Reader offers one quiet link to have it written again, with an optional note; the writing screen covers it, and a failed rewrite keeps the chapter and the note. After each chapter is saved, SEN's Holdings fixer quietly settles the chapter's small holdings problems and keeps a record on the chapter (in Export story). It sends the reader's access token when there is one, and never asks for it: a refused check is only recorded.
- **2026-10-05** — The Reader's sound is SEIHouse's audio player: the reader's atmosphere under the chapter, Sound Cues over it at their Energy (they can overlap now), Listen dipping it, a sleep timer, a note above the Listen bar that mutes it (long-press opens Audio), and Reader Settings → Audio before Narration. The mix is kept on this device. The older single-channel player is gone from the app.

- **2026-10-04** — The access token lifts the chapter limit. Chapters had a limit of 6 every 30 minutes per visitor that the token never lifted, so testing stopped at the seventh. Now the token is saved on this device and sent with every chapter, the server lets it past the limit, and a chapter refused at the limit asks for the token once and is written with it. Visitors without it keep the limit.
- **2026-10-03** — From the five-chapter test: every chapter keeps the point of view the story opened in; a reply far short of a chapter is never saved, and the Reader says so with Next ready to try again; titles drop a "Chapter N:" the writer added, so the Reader and Listen say the number once; a thing first shown taken in hand is recorded in Holdings.
- **2026-10-03** — Listen reads like production: speech the writer left untagged is voiced from its narration (another named speaker gets the Side voice, otherwise the main character's), the default voices are the computer's own rather than online ones, and each line follows the last after production's 50 ms gap.
- **2026-10-03** — Arcs are 30 chapters and a goal reached early hands over to the next; every chapter must change something. Stories saved before (all test stories) are set aside untouched and the app opens empty.
- **2026-10-03** — Export story on Story View: one file with the story, every chapter, and for each chapter the exact instructions, Story Information and request the writer was given and its raw reply, so a test can be shared and read.
- **2026-10-03** — Holdings: the writer reads what each character has and tags every change; the Reader's Holdings page (beside Fate) lists it, each change linked to its passage, with the checks to compare against the chapters. The app's stories carry their Codex entries in the same saved workspace.
- **2026-10-01** — The Reader reads aloud in three voices: Listen, the spoken sentence lit, Reader Settings → Narration, with the voices and speed kept on this device and SEIHouse's voices from the Library. `check:app` also refuses the older Reader's narration.
- **2026-10-01** — The World Blueprint plans Arc 1 only and fills every blank Story Seed slot; each later arc is planned and reviewed when it begins, in the Reader. Add Arcs is gone.
- **2026-10-01** — Piece 1: the four pages at `/app/`, on separate storage, with the same chapters as the Workshop and the `check:app` guard.
