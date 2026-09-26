# Create (Creator Space)

- **Source repository:** `SENSEIDUKES/development` (born here; no production original)
- **Source location:** `src/components/creator-space/` (page and display contracts);
  host adapter `src/workshop/previews/creator-space/CreatorSpaceHost.tsx`
- **Visual direction:** the supplied Create reference image (Creator Space → Creator
  Toolkit → Your worlds, CELESTIAL LIBRARY header, Home — Create — Discover — Profile strip)
- **Workshop preview:** `?preview=creator-space` (Pages → Create), with Sample worlds or
  this browser's stories, at Mobile, Tablet and Laptop sizes
- **In-app route:** the Library strip's **Create** tab, `{ screen: 'creator-space' }`;
  direct: `/library-shell.html?variant=development&source=main-library&screen=creator-space`
  (add `&worlds=sample` for the sample set)
- **Created:** 2026-09-26
- **Last Workshop update:** 2026-09-26
- **Last source comparison:** 2026-09-26 (Library shell navigation, Home cards, Energy,
  and the chapter workspace were inspected in this repository)
- **Status:** approved reconstruction (Workshop Replica Mode B), first usable pass

## What it is

The Library's Create tab. It replaces the bottom-strip **Library** tab, which only reopened
Home with its My Library collection selected. My Library itself is unchanged and still
reachable from header Search and the footer.

The page has three parts, in this order, sized so the worlds row is inside the first phone
screen:

1. **Creator Space** — the page title beside the existing **Carve New Destiny** action
   (opens Story Seed), and two readings: **Energy** (the live available balance; opens the
   Cave's Energy page) and **In progress** (worlds that have not reached their ending; a
   plain reading with no destination). "Ready to share" is deliberately absent until
   publishing exists.
2. **Creator Toolkit** — a small, labelled **Preview** of Style Packs (the official Chinese,
   Korean and Japanese writing styles) and Soundscapes (the first-party ambient catalog).
   There is no pack browser yet, so **Browse plugins** and the cards say so in one status
   line instead of pretending a marketplace works. A host that builds one passes
   `onBrowseToolkit` and the Preview tag and message disappear.
3. **Your worlds** — the main focus. A native, swipeable scroll-snap row of Home-style
   `LibraryCard` covers with title and "Ch. N · Draft/Shared/Public/Complete", the most
   recently changed world first and selected. Tapping a card selects it; beneath the row
   sit its title and exactly two actions:
   - **Continue** — keep writing: the world's chapter workspace, landed on its Generate
     Chapter panel. Disabled, with a note, for a world that reached its ending.
   - **Studio** — the same world's full workspace from the top (story direction, CAPA
     skills, media, Blueprint).

   The count reads "N worlds". Loading, empty ("No worlds yet") and failed-read states are
   distinct. A world without cover art shows the Library's own celestial art, dimmed; an
   unreachable image leaves the card's own blue-gold wash rather than a broken image.

## Ownership and contracts

Library-owned (`@seihouse/library/creator-space`). SEN is untouched and never imports it.
`CreatorSpace` renders display data and reports intent; the host owns every truth and
destination:

| Prop | Host responsibility |
| --- | --- |
| `worlds` | The creator's worlds with a request lifecycle (`loading` / `ready` / `error`) |
| `energy` | The `useEnergyAccount` read; the page never computes a balance |
| `toolkit` | Preview items (title, description, kind, art) |
| `onCarveNewDestiny`, `onOpenEnergy`, `onContinueWorld`, `onOpenStudio` | Existing destinations |
| `onBrowseToolkit`, `onRetryWorlds` | Optional; omitted means "not built" / no retry |

The selected world is local UI state. The shell keeps the page mounted after its first visit,
like Home, so the selection survives tab switches.

### The DEV host adapter

`CreatorSpaceHost` (Workshop-owned) reads worlds from the chapter workspace's own
browser-local store, `IndexedDbHarnessGenerationRepository` — **read only**, never `save`.
Each `HarnessStory` becomes a world: distinct committed chapter numbers are its chapter
count, `conclusion` makes it Complete, and `visibility` public/shared are shown as such
(private is Draft). Stories carry no cover art or genre yet. Energy comes from the Energy
client the shell already mounts. Continue opens
`/?preview=harness-generation&story=<id>&focus=next-chapter` and Studio
`/?preview=harness-generation&story=<id>`, in the top window so a Workshop frame is left.

`worlds=sample` swaps in six Workshop sample worlds (`previewData.ts`, existing local art,
one finished, one without a cover). Sample worlds are not in the chapter workspace, so
Continue/Studio report where they would go instead of navigating. The Workshop entry
defaults to samples; the in-app tab defaults to this browser's stories.

To support Continue and Studio, the Library chapter workspace gained two additive props,
`initialStoryId` and `initialFocus: 'next-chapter'`, read from the `story`/`focus` URL
parameters by its Workshop wrapper. Story Seed's existing "start story" handoff already
sent `story=<id>`; it now opens that story instead of the list's first.

## Transfer notes

For an approved production move: `development/CreatorSpace.tsx`,
`development/creator-space.css`, `shared/creatorSpaceContracts.ts`, and the package entry,
together with the Library shell route/navigation changes (`libraryRoutes.ts`,
`LibraryNavigation.tsx`, `MainLibraryNavigation.tsx`, `MainLibraryFooter.tsx`,
`main-library/GlobalHeader.tsx`). Dependencies: `@seihouse/library-ui`, `@seihouse/ui`,
`lucide-react`, the Library Energy entry and `useLibraryAssets`. The production host writes
its own adapter: its story list and cover art, its Energy client, and its routes for Story
Seed, Energy and the chapter workspace. Do not transfer `CreatorSpaceHost`, the sample data,
the Workshop entry or `worlds=sample`.

## Known limits

- Worlds are the chapter workspace's local stories in this browser; there is no account-wide
  story list in DEV yet, and a Vercel preview URL starts with an empty store.
- The Toolkit is a preview of real systems; there is no pack or plugin marketplace.
- On phones the Carve New Destiny pill sets its capitals slightly tighter (scoped to this
  page, 44px height kept) so it shares the title's row at 390px; at 320px they stack. A
  compact Manifest size in Library UI would remove this local rule.

## Verification

`CreatorSpace.test.tsx`, `CreatorSpaceHost.test.ts`, the chapter workspace's
`initialStory.test.tsx`, and the updated Library navigation, app-preview, Profile and
Workshop Home tests. Browser: `output/playwright/creator-space/verify.mjs` against the dev
server seeds two real stories through the chapter workspace controller and checks the
phone layout, selection, both actions landing on the right story, Energy and Story Seed
destinations, tab switches and history, empty and local states, 320/768/1440 widths and
reduced motion. Evidence: `output/playwright/creator-space/`.

## Workshop history

- **2026-09-26:** Created the Create page from the supplied reference and replaced the
  bottom-strip Library tab with **Create**. Creator Space (Carve New Destiny, Energy, In
  progress), an honest Creator Toolkit preview, and the Your worlds row with Continue and
  Studio wired to the chapter workspace, which can now open a requested story.
