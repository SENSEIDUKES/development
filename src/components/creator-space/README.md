# Create (Creator Space)

Repository lifecycle and reference rules: [AGENTS.md](../../../AGENTS.md#core-rule).

- **Source repository:** `SENSEIDUKES/development` (born here; no production original)
- **Source location:** `src/components/creator-space/` (page, plugins view and display contracts);
  host adapter `src/workshop/previews/creator-space/CreatorSpaceHost.tsx`
- **Visual direction:** the supplied Create reference image (Creator Space → Creator
  Toolkit → Your worlds, CELESTIAL LIBRARY header, Home — Create — Discover — Profile strip)
- **Workshop preview:** `?preview=creator-space` (Pages → Create), with Sample worlds or
  this browser's stories, at Mobile, Tablet and Laptop sizes
- **In-app route:** the NovelExpanded app's Create tab, `/app/?page=create` (and
  `/app/?page=create&plugins=all|style|soundscape|cue|atmosphere` for Creator Plugins);
  in the Library shell preview, `{ screen: 'creator-space' }`:
  `/library-shell.html?variant=development&source=main-library&screen=creator-space`
  (add `&worlds=sample` for the sample set)
- **Created:** 2026-09-26
- **Last recorded Workshop update:** 2026-11-17
- **Historical source inspection:** 2026-09-26 (Library shell navigation, Home cards, Energy,
  and the chapter workspace were inspected in this repository)
- **Status:** approved reconstruction (Workshop Replica Mode B), first usable pass

## What it is

The Library's Create tab. It replaces the bottom-strip **Library** tab, which only reopened
Home with its My Library collection selected. My Library itself is unchanged and still
reachable from header Search and the footer.

The page leads with a normal-sized **Create** button beside the title and Sparks,
followed by Energy and In progress. Create opens the existing Story Seed flow.

**Your worlds** comes next: the most recently changed world is selected first,
with **Continue | Edit** beneath the swipeable covers. Continue opens the creator's
Reader; Edit opens the world's existing in-house editing destination (World Info
in the app). Completed worlds keep Edit available and disable Continue.
Loading, empty and failed-read states remain distinct.

**Creator Toolkit** groups two destinations below the worlds. One large **Browse
plugins** card opens Creator Plugins, which retains the style, soundscape, cue and
atmosphere catalogs and existing audio/skill `.spp` import controls. The **Studios**
card links to `https://studio.novelexpanded.com` in a new tab and offers **Import
plugins** back into that same plugin browser. Studio always refers to the external
creation app, never the in-house world editor. Without a host plugin browser, the
preview shows an honest availability notice and omits Import plugins.

## Ownership and contracts

Library-owned (`@seihouse/library/creator-space`). SEN is untouched and never imports it.
`CreatorSpace` and `CreatorPlugins` render display data and report intent; the host owns every truth and
destination:

| Prop | Host responsibility |
| --- | --- |
| `worlds` | The creator's worlds with a request lifecycle (`loading` / `ready` / `error`) |
| `energy` | The `useEnergyAccount` read; the page never computes a balance |
| `toolkit` | Preview items (title, description, kind, art) |
| `onCreate`, `onOpenEnergy`, `onContinueWorld`, `onEditWorld` | Existing destinations |
| `onBrowseToolkit`, `onRetryWorlds` | Optional; `onBrowseToolkit(kind?)` opens `CreatorPlugins`, omitted means "not built" |

The selected world is local UI state. The shell keeps the page mounted after its first visit,
like Home, so the selection survives tab switches.

### The DEV host adapter

`CreatorSpaceHost` (Workshop-owned) reads worlds from the chapter workspace's own
browser-local store through `IndexedDbHarnessGenerationRepository.peek()` — **read only**: it
never saves, and an older-format store is upgraded in memory only, leaving the upgrade (and
its preserved copy) to the chapter workspace.
Each `HarnessStory` becomes a world: distinct committed chapter numbers are its chapter
count, `conclusion` makes it Complete, and `visibility` public/shared are shown as such
(private is Draft). Stories carry no cover art or genre yet. Energy comes from the Energy
client the shell already mounts. Continue opens
`/?preview=harness-generation&story=<id>&focus=next-chapter` and Edit
`/?preview=harness-generation&story=<id>`, in the top window so a Workshop frame is left.

`worlds=sample` swaps in six Workshop sample worlds (`previewData.ts`, existing local art,
one finished, one without a cover). Sample worlds are not in the chapter workspace, so
Continue/Edit report where they would go instead of navigating. The Workshop entry
defaults to the app's own Create (`/app/?page=create`, this browser's stories); the
sample composition is a layout aid behind the Worlds control.

To support Continue and Edit, the Library chapter workspace gained two additive props,
`initialStoryId` and `initialFocus: 'next-chapter'`, read from the `story`/`focus` URL
parameters by its Workshop wrapper. Story Seed's existing "start story" handoff already
sent `story=<id>`; it now opens that story instead of the list's first.

## Implementation inventory

The packages and NovelExpanded app built here are the destination. Keep Workshop
controls, fixtures and adapters outside reusable package entries; another repository
changes only when the owner asks. Historical references stay untouched.

The existing local files named by this inventory are:

- `development/CreatorSpace.tsx`
- `development/CreatorPlugins.tsx`
- `development/creator-space.css`
- `shared/creatorSpaceContracts.ts`

## Host boundary

The page depends on `@seihouse/library-ui`, `@seihouse/ui`, `lucide-react`, the Library
Energy entry and `useLibraryAssets`. The host supplies its story list and cover art,
Energy client, and destinations for Story Seed, Energy and the chapter workspace.
`CreatorSpaceHost`, sample data, the Workshop entry and `worlds=sample` are preview-only.

## Known limits

- Worlds are the chapter workspace's local stories in this browser; there is no account-wide
  story list in DEV yet, and a Vercel preview URL starts with an empty store.
- Creator Plugins shows the built-in first-party catalogs and local `.spp` pack import; there is
  no public third-party marketplace yet.

## Verification

`CreatorSpace.test.tsx`, `CreatorSpaceHost.test.ts`, the chapter workspace's
`initialStory.test.tsx`, and the updated Library navigation, app-preview, Profile and
Workshop Home tests. Browser: `output/playwright/creator-space/verify.mjs` against the dev
server seeds two real stories through the chapter workspace controller and checks the
phone layout, selection, both actions landing on the right story, Energy and Story Seed
destinations, tab switches and history, empty and local states, 320/768/1440 widths and
reduced motion. Evidence: `output/playwright/creator-space/`.

## Workshop history

- **2026-11-17 (Create layout):** Moved Create to a compact top action, brought
  Your worlds ahead of the toolkit, and renamed the story action to Edit. Replaced
  four plugin preview cards with one Browse plugins card and added a dedicated
  Studios card with the external Studio link and a return path to package import.
  The app and existing Workshop preview share this Library surface.

- **2026-11-01 (Toolkit plugins & Creator Plugins view):** Added **Cues** and **Atmospheres**
  beside Style Packs and Soundscapes in the Creator Toolkit, switched the Toolkit from a
  horizontal strip to a container-responsive grid with zero horizontal overflow, styled
  **Browse plugins** as a rounded pill control inside the Library look, and wired both
  **Browse plugins** and the cards to open **Creator Plugins** (`CreatorPlugins`). Creator
  Plugins presents parent `.spp` packages first (with group count breakdowns such as
  `NovelExpanded Soundscapes Vol. 1` → `Adventure (3)`, `Ambient (2)`, etc.) and opens a
  clicked `.spp` package to inspect its groups and individual files alongside `.spp` import.

- **2026-10-30 (Sparks):** From SENSEI's header redesign, Sparks (formerly Dao
  Insights) moves here from the header: `CreatorSpace` takes `sparks`, shown beside the
  title. The app passes `DaoSparksButton` with its spark host (a spark begun opens as a
  new Story Seed, or is kept in the Story Bank); the Workshop host does the same with
  the Dao's own hand-written sparks.

- **2026-09-26 (review):** At SENSEI's direction the creation action moved from beside the
  title to its own closing band at the end of the page, after Your worlds and its actions,
  and is labelled simply **Create** (full width on phones; still opens Story Seed). The
  phone-only tightened lettering that squeezed it beside the title is gone, and the host
  prop is now `onCreate`. Home's hero keeps its own Carve New Destiny button.

- **2026-09-26:** Created the Create page from the supplied reference and replaced the
  bottom-strip Library tab with **Create**. Creator Space (Carve New Destiny, Energy, In
  progress), an honest Creator Toolkit preview, and the Your worlds row with Continue and
  Studio wired to the chapter workspace, which can now open a requested story.

- **2026-10-29 (in the app):** From SENSEI, Create in NovelExpanded is this page,
  not Story Seed directly. `CreateHubPage` (`src/novel-expanded/`) hosts it in the
  app's shell with the reader's stories (`creatorWorldsOf`: Home's cards with each
  story's status), the app's Energy account, its own Toolkit previews and the app's
  destinations: Create → a new Story Seed (`?page=create&seed=new`), Continue → the
  story's Reader, Studio and the card → World Info, Energy → the Cave's Energy page.
  The Workshop's "This browser's stories" loads that app route; the sample set stays
  on the Library shell capture. Inside the Library's look the stat tiles are nested
  cards and Browse plugins a black control.
