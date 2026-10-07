# NovelExpanded app

The NovelExpanded app as its own place, at **`/app/`** on every preview and
deployment. It holds only the core application spine from [`NOVEL_EXPANDED.md`](../../NOVEL_EXPANDED.md),
the minimum path through the product:

**Home → Create (Story Seed and World Blueprint) → Story View (World Info) → Reader**

The Workshop is where systems are built and inspected one at a time. The app is
where they are used together, the way a reader meets them.

- Created: 2026-10-01 (piece 1)
- Last updated: 2026-10-06
- Owner: `host` (`scripts/ownershipInventory.mjs`). The app is a host of the
  Library and SEN packages, like any outside app would be.

## Pages and addresses

Each page is a query on the app's own address, so a deployment needs no
rewrites and every page survives a reload.

| Page | Address | What it is |
| --- | --- | --- |
| Home | `/app/` | The reader's stories, newest first, and Carve New Destiny |
| Create | `/app/?page=create` | The Library's Story Seed journey: the seed, its World Blueprint, Manifest Story |
| Story View | `/app/?story=<id>` | The story's World Info page: Start Story, Start Reading, Continue, and Export story (the whole story as one file, for sharing a test) |
| Reader | `/app/?story=<id>&read=1` | The reading-only Reader, with the Generation Overlay while a chapter is written |

- Moving inside the app adds a browser history entry, so Back and Forward walk the same pages.
- Manifest Story replaces Create with the new story, so Back from it goes Home.
- `/app` without the slash redirects to `/app/` (the Vite dev and preview servers, and `vercel.json`).
- A story id the app does not have goes Home.

## Same chapters as the Workshop

The app writes chapters exactly as the Workshop's HARNESS page does:

- the official CAPA skills (`src/host/generation/capa/`), installed in memory, so the app never writes the Workshop's imported-skill inventory;
- the Library's sound words and Sound Cues (`LIBRARY_BASE_MEDIA`), played through the reader mixer below;
- chapter tags and recaps recorded in the chapter write, with no separate memory call;
- the Model Router's chapter model (`useModelPreference('chapters')`), the one choice shared with the Workshop;
- the equipped Familiar on the Generation Overlay, with its animation and elemental accents.

`NovelExpandedApp.equippedFamiliarId` accepts the host profile's current choice
and updates the veil when it changes. There are no account or equipment screens
in this app yet, so visitors use the existing catalogue default, Quill. This is
presentation only: it grants no ownership and writes no profile or equipment data.

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
Info and while a chapter is written, with no model and nothing to wait for (a
browser starts sound on the reader's first tap). In the Reader each chapter's
own scene takes over, as its writer chose it; leaving the Reader brings the
app's music back.

## Its own storage

The app's stories, reading places and Story Seeds are separate from the
Workshop's, so neither can overwrite the other (`services.ts`):

| What | Where |
| --- | --- |
| Stories | IndexedDB `novelexpanded-harness-stories-v1` |
| Reading places | IndexedDB `novelexpanded-reader-state-v1` |
| Narration voices and speed (Reader Settings) | localStorage `novelexpanded-reader-read-aloud` |
| The access token | localStorage `seihouse-development-access-token`, shared with the Workshop |
| Story Seeds | localStorage `novelexpanded-story-seeds-v1` |

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
6 requests per 30 minutes, the Workshop's limit; with it there is no limit. A
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
- from its own files, a package entry outside its list: `@seihouse/library/{stories,story-seed,home,shell,presentation}` and `@seihouse/sen/{story-seed,harness-generation,presentation,reader-runtime,styles.css}`.

It runs in `check:app`, `verify`, `npm run build` (before `vite build`, so a
deployment cannot ship an app that breaks it) and CI. When it fails, reconnect
nothing: only what is being built now belongs in the app. Ask the owner when a
task needs something the list does not allow.

## Files

| File | Responsibility |
| --- | --- |
| `app/index.html` (repository root) | The app's page; loads `main.tsx` |
| `main.tsx` | Stylesheets (`src/host/styles/theme.css`, `@seihouse/sen/styles.css`) and the real services |
| `NovelExpandedApp.tsx` | Providers, the opening gate, and the four pages; Chapter 1 begins at Manifest Story |
| `appMusic.ts` | The app's own music, from SEN Soundscapes, on every page and while a chapter is written |
| `routes.ts` | Addresses and history |
| `services.ts` | Storage, the writer, the official skills and the Blueprint client |
| `HomePage.tsx` | Home inside the Library workspace shell |
| `CreatePage.tsx` | Create: `CreationModal` in a guest Story Seed runtime; asks for the token before a Blueprint |
| `AccessTokenSheet.tsx` | The access token sheet, one for the whole app |
| `accessToken.ts` | The chapter writer with the owner's token: a chapter at the limit asks for it and is sent again |
| `storyCreationRuntime.ts` | The guest Story Seed runtime; which seeds already became stories |

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

- Story Settings (CAPA and media slots) inside Create and Story View.
- Cover art on Story View.
- Profile, accounts and server-side storage.

## Verification

- `src/novel-expanded/*.test.ts(x)`: the four pages, browser Back, an unknown story, the token sheet, a skill load failure.
- `scripts/checkNovelExpandedApp.test.ts`: the guard, including the real app.
- `scripts/verifyNovelExpandedApp.browser.mjs`: the walk in Chromium at 390px and 1440px against the dev server, with stubbed APIs and a stand-in for the browser's speech (headless Chromium has no voices).

## History

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
