# NovelExpanded app

The NovelExpanded app as its own place, at **`/app/`** on every preview and
deployment. It holds only the core application spine from [`NOVEL_EXPANDED.md`](../../NOVEL_EXPANDED.md),
the minimum path through the product:

**Home → Create (Story Seed and World Blueprint) → Story View (World Info) → Reader**

The Workshop is where systems are built and inspected one at a time. The app is
where they are used together, the way a reader meets them.

- Created: 2026-10-01 (piece 1)
- Last updated: 2026-10-01
- Owner: `host` (`scripts/ownershipInventory.mjs`). The app is a host of the
  Library and SEN packages, like any outside app would be.

## Pages and addresses

Each page is a query on the app's own address, so a deployment needs no
rewrites and every page survives a reload.

| Page | Address | What it is |
| --- | --- | --- |
| Home | `/app/` | The reader's stories, newest first, and Carve New Destiny |
| Create | `/app/?page=create` | The Library's Story Seed journey: the seed, its World Blueprint, Manifest Story |
| Story View | `/app/?story=<id>` | The story's World Info page: Start Story, Start Reading, Continue |
| Reader | `/app/?story=<id>&read=1` | The reading-only Reader, with the Aura Veil while a chapter is written |

- Moving inside the app adds a browser history entry, so Back and Forward walk the same pages.
- Manifest Story replaces Create with the new story, so Back from it goes Home.
- `/app` without the slash redirects to `/app/` (the Vite dev and preview servers, and `vercel.json`).
- A story id the app does not have goes Home.

## Same chapters as the Workshop

The app writes chapters exactly as the Workshop's HARNESS page does:

- the official CAPA skills (`src/host/generation/capa/`), installed in memory, so the app never writes the Workshop's imported-skill inventory;
- the Library's sound words and Sound Cues (`LIBRARY_BASE_MEDIA`);
- story memory read only on request (`useLibraryStories`);
- the Model Router's chapter model (`useModelPreference('chapters')`), the one choice shared with the Workshop;
- VERSA on the Aura Veil.

The app opens only once its stories are open and the skills are installed. If
either fails, it says so plainly, with Retry.

## Its own storage

The app's stories, reading places and Story Seeds are separate from the
Workshop's, so neither can overwrite the other (`services.ts`):

| What | Where |
| --- | --- |
| Stories | IndexedDB `novelexpanded-harness-stories-v1` |
| Reading places | IndexedDB `novelexpanded-reader-state-v1` |
| Narration voices and speed (Reader Settings) | localStorage `novelexpanded-reader-read-aloud` |
| Story Seeds | localStorage `novelexpanded-story-seeds-v1` |

A story started in the app shows on the app's Home, not on the Workshop's
developer page, and the other way round. There are no accounts yet: every seed
belongs to this browser's one reader.

## The World Blueprint access token

World Blueprints are still a development service behind
`STORY_SEED_BLUEPRINT_ACCESS_TOKEN`. The first Blueprint of a
visit asks for the token in a small sheet. It is kept only in that tab's
memory, never saved, and asked for again when the server does not accept it.

Chapter writing (`/api/harness-generation`) needs no token. It shares the
Workshop's limit of 6 requests per 30 minutes per visitor.

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
| `NovelExpandedApp.tsx` | Providers, the opening gate, and the four pages |
| `routes.ts` | Addresses and history |
| `services.ts` | Storage, the writer, the official skills and the Blueprint client |
| `HomePage.tsx` | Home inside the Library workspace shell |
| `CreatePage.tsx` | Create: `CreationModal` in a guest Story Seed runtime, and the token sheet |
| `AccessTokenSheet.tsx` | The token sheet |
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

- **2026-10-01** — The Reader reads aloud in three voices: Listen, the spoken sentence lit, Reader Settings → Narration, with the voices and speed kept on this device and SEIHouse's voices from the Library. `check:app` also refuses the older Reader's narration.
- **2026-10-01** — The World Blueprint plans Arc 1 only and fills every blank Story Seed slot; each later arc is planned and reviewed when it begins, in the Reader. Add Arcs is gone.
- **2026-10-01** — Piece 1: the four pages at `/app/`, on separate storage, with the same chapters as the Workshop and the `check:app` guard.
