# Light Novels Home

Where `reference/` exists, it holds the old production version, kept as reference
material for the remake; it is not edited or refreshed. New features do not get a
reference folder. Old systems stay until each is remade on the new path; never
reconnect them as they are or re-sync with the old production app. The destination
is SEN, Library and NovelExpanded built here, guided by `NOVEL_EXPANDED.md`.

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Source location:** `src/components/LibraryScreen.tsx`, export `LibraryScreen`; `src/components/StoryDetailScreen.tsx`, export `StoryDetailScreen`
- **Inspected source commit:** `4a3dd02b6640b2ec50d8d1d136e37fb808249ed2` (clean local source checkout)
- **Workshop preview:** `?preview=light-novels-home`
- **Responsive Home (Development):** `/app/` — the actual Expanded Novels app
- **First Workshop record:** 2026-09-09
- **Last recorded Workshop update:** 2026-10-10
- **Historical source inspection:** 2026-09-09
- **Implementation status:** under refinement — multimedia presentation skeleton in the existing Home/detail flow

## Boundary and ownership

Home includes the expandable Events notice above Featured. `HomeEvents` and its
display contract live in this Home owner; NovelExpanded supplies the Coming soon
sample announcements from `homeEvents.ts`. Discover no longer owns or displays
Events. The Home Workshop's app iframe shows this same placement.

The Home workspace's **Development** pane loads the actual NovelExpanded `/app/`
document at the selected mobile, tablet or laptop viewport. This reuses
`src/novel-expanded/HomePage.tsx` and `AppShell.tsx`, so the wordmark, footer,
navigation, featured selection and empty state stay in sync automatically. It
uses the same browser storage as opening the app directly: creating or editing a
story is a real app action, not an isolated fixture operation. No preview seeding
or reset is performed. The app remains a host; Workshop does not enter its import
graph or package entries.

The standalone Library Shell simulation remains available through its own
workspace; the older preview behavior described below belongs to that simulation.

Home is a Library-owned screen. `development/LightNovelsHome.tsx` renders independently with display data and callbacks; it imports no Library Shell, Workshop, app store, authentication, or backend. The existing shell document is the shared responsive preview host, not a prerequisite for rendering the component. The Workshop directory remains the intentional root landing page.

Development did not contain the homepage body before this task: MainLibraryPreview had an explicit placeholder. The hero and featured collection were therefore extracted from the verified Light-Novels source. Library and Discover keep their pre-existing Development content slots and collection behavior. This task does not import or redesign their full production bodies.

The extraction retains the source hero JSX, video sequence, six-second backdrop rotation, particles, typography, colors, text, genre/sort controls, empty state, and world-card presentation. The source published catalog inspected for the initial extraction was empty. The multimedia trial now supplies one explicitly requested mock novel from `src/workshop/previews/light-novels-home/previewData.ts`, using existing local artwork. The source video and backdrop URLs remain public media dependencies, with the original video-failure fallback. There are no production data or generation requests.

`development/LightNovelsHome.tsx` holds the extracted presentation with host callbacks in place of production store/auth writes, and pauses media and particles when inactive while retaining filter/video state. `shared/homeContracts.ts` describes display data only. `shared/home.css` scopes the existing source gradient and gold color. Existing collection controls are supplied through the content slot, preserving their Development placement between the hero and filters. (Dao Insights, now Sparks, moved to Create on 2026-10-30.)

## Navigation and preview behavior

- Home: `screen=home&collection=featured`, the standalone homepage.
- Create (the strip's former Library slot, since 2026-09-26): `screen=creator-space`, the separate [Create](../creator-space/README.md) page. My Library remains `screen=home&collection=my-library`, reached from header Search and the footer, and keeps Home selected.
- Discover: `screen=home&collection=challenges`, the existing Fate Survival destination.
- Profile: the existing Cultivator Cave, including its own nested routes and shared chrome.
- Novel detail: `screen=detail`, the existing destination, now populated for the sole featured mock novel. Direct loading and reloading select that fixture. Back/Forward and Back to novels preserve Home filters; returning from the detail restores card focus.

These compatibility values are retained. Home and Profile remain mounted while inactive so navigation does not discard unrelated local edits or Home filters. Only the active screen's header and global strip are visible. Back/Forward updates the current destination. Story Seed keeps its existing separate document and specialized navigation. The Home hero's Carve New Destiny opens that existing local Story Seed preview.



## Multimedia visual trial

Home still contains one ordinary novel card. Development adds two small, noninteractive text-and-icon seals below its existing metadata. The whole card retains its original click target and accessible name; its accessible description explains the available manga/game mock expansions. No adaptation appears as a separate homepage result or filter category.

The existing `screen=detail` path was a content placeholder in Development. `development/StoryDetailScreen.tsx` holds the source's static novel overview (cover, title/byline, genre/tags, chapter/arc/realm/status metrics, synopsis, and main story actions) and receives the new section through a content slot. This is a bounded presentation extraction, not a replica of source account tools, generated-cover history, exports, or persistence. Reading, Codex, and timeline actions are disabled for this mock and explained onscreen.

`development/WorldExpressions.tsx` shows the original novel first, followed by a manga adaptation and a reusable duel battle game shell. The game mock is populated conceptually from the SEN World's characters, abilities, artifacts, and locations; it does not continue the novel's narrative. Repeated origin text and related names make the shared world relationship explicit. Manga/game actions are disabled and labeled Preview only. Mobile/tablet use a native, keyboard-focusable horizontal scroll lane with a visible next-card edge and scrollbar; desktop shows all three media cards together. There is no added animation. Existing portrait/pavilion/landscape assets supply the mock art, with a grayscale treatment for manga.

This is a Library-owned presentation of the SEN multimedia concept. No SEN export, backend model, permanent expression schema, storage, purchasing, QR, reader, game launcher, or Portal infrastructure is introduced. The small display props and mock relationship map are local to the trial; fixtures stay in Workshop. Components also accept no expansions, in which case no seals or overview section render.

**2026-10-09:** `WorldExpressions` is now World Info's **Portal**: the world card's Portal card opens it below Open Codex and Information.

## Implementation inventory

The packages and NovelExpanded app built here are the destination. Keep Workshop
controls, fixtures and adapters outside reusable package entries; another repository
changes only when the owner asks.

The existing local files named by this inventory are:

- `development/LightNovelsHome.tsx`
- `shared/homeContracts.ts`
- `shared/home.css`
- `development/WorldExpressions.tsx`
- `development/world-expressions.css`
- `shared/storyDetailContracts.ts`

## Host boundary

The display uses `@seihouse/library-ui`, `@seihouse/ui`, `motion` and `lucide-react`.
The host supplies published-world display fields, navigation/acquisition callbacks
and approved public media. Workshop wrappers, fixtures and in-memory navigation
transport are preview-only. `WorldExpressions` is the multimedia presentation;
`shared/storyDetailContracts.ts` and the Development detail extraction are a preview
adapter, not a complete account/story page.

## Verification

The multimedia trial passes `npm run build`, the 40 existing Library Shell/Workshop tests, `check:package-boundaries`, and the then-used capture check (now retired). Local browser checks cover 320/390/768/1024/1440px, loaded artwork, a single homepage novel, labeled seals, three connected-media cards, disabled adaptation actions, horizontal keyboard scrolling, direct detail reload, Back/Forward, genre/sort retention, return focus, reduced motion, and 34px bottom safe-area spacing. The original comparison has no seals or connected-media section. Measurements are in `output/playwright/multimedia-world/verification.json`; the build log is beside it. Browser interaction generated no Fetch/XHR requests. This is local preview verification, not a hosted deployment or live account test.

See `docs/history/standalone-home/` for local production browser evidence and the two mobile screenshots. The screenshot browser renders the 390 by 844 CSS viewport at the host display scale; the supplied images capture that rendered area without the tool's black padding.

The build, focused navigation/header/profile/Workshop tests, package boundary checks, and existing locked-capture guard pass. No full production Library/Discover body or production account/backend behavior is claimed as covered.

## Workshop history

- **2026-10-28, Original Reference removed:** With the owner's approval, the old
  production copy (`reference/LightNovelsHome.tsx`, `reference/StoryDetailScreen.tsx`),
  its Original Reference and Compare panes, and the `homeReference=1` URL were
  removed. The Home workspace now shows Development alone.

- **2026-10-28, footer clearance:** Home moves the bottom dock's existing clearance
  inside the footer, so the purple-blue fill reaches the bottom without artwork
  showing underneath. Legal controls remain above the dock, including safe-area
  insets; desktop keeps its existing spacing.

- **2026-10-28, background follow-up:** Home's plain footer now shares the header's
  Story Seed blue-violet finish. The artwork backdrop behind Home content remains.
  Buttons retain black fills; media remains clear. Reader tests now locate their
  subject content through the accent scope rather than assuming the provider
  adds no DOM wrapper.

- **2026-10-28, chrome trial:** Home's header, sidebar and mobile dock use the
  shared Story Seed blue-violet panel recipe, with a denser 95% base for chrome;
  Story Seed keeps its existing 46% base. Navigation controls keep black fills,
  their native label colors, border/glow effects and hover transitions. White
  icons, clear image/video cards, the Reader rim and rainbow action buttons remain.
  A profile accent choice updates interface highlights; unset restores native
  colors. Home's existing Workshop iframe shows the same trial. The browser
  regressions cover 320/390/1440px, saved/reset accents, unfinished identity edits,
  isolated Profile preview preferences, and unchanged Story Seed material.

- **2026-10-28, media/navigation correction:** All image/video cards remain clear,
  including Events, covered World Cards and Featured still-image backdrops. The
  event text overlay uses its original contrast gradient, with no backdrop blur.
  Home preserves the navigation package's selected gradients, glow, hover/press
  transitions, icon rings and label colors; only navigation glyphs are white.
  Original Home/Dao/footer text colors are retained rather than globally remapping
  accents. The V1 glass frames, empty panels and Reader rim remain in place.
  `node scripts/verifyHomePalette.browser.mjs` checks 320/390/1440px in the real app
  and Home Workshop, including saved-cover cards, clear media, actual hero playback,
  original navigation states compared with the palette disabled, white icons and
  the unchanged animated rainbow. Seven focused Home/header tests and the build,
  ownership, package/app boundary and UI artifact checks passed.

- **2026-10-28:** Applied the owner's latest `v1.json` V1 look to the real Home
  through the Home-only `library-home-palette` shell. Navigation uses black at
  95% / 20px blur; outer panels use Create's `#00374a` at 12% / 24px;
  nested cards use Home's **black** at 35% / 25px with saturation; controls use
  Familiar's black at 95% / 20px. Text is white and accents `#fecb3e`.
  The existing Reader rim is shared, including its rounded mask, while Manifest
  buttons keep their canonical spectrum ring and animated rainbow halo.
  Existing Home artwork supplies a stationary, darkened backdrop for the glass.
  The same app iframe shows this in Workshop; other routes and historical
  references retain their presentation. Reduced transparency uses opaque fills.
  Validation: 68 focused Home/app/palette tests, typecheck, app/ownership/package
  boundaries, UI artifact verification, production build and both package smoke
  checks passed. Chromium and WebKit walks covered 320/390/1440px, Home and its
  Workshop iframe, events, filters, sorting, keyboard focus, route cleanup and
  unchanged button rainbow CSS. Chromium also covered saved covers and Featured;
  this Linux WebKit environment could not persist cover Blobs, so its story-card
  walk used coverless stories. Built-page checks covered both engines, with solid
  reduced-transparency fills and forced-color border removal checked in Chromium.
  WebKit's headless renderer did not paint blur even in an isolated CSS sample;
  physical iPhone blur appearance remains unverified. Local evidence is in
  `output/playwright/home-v1-palette/`.

- **2026-10-26:** Moved Events from Discover to Home above Featured, retaining
  the compact expandable notice and Coming soon announcements. The Home app
  and existing Workshop iframe share the same Home-owned component.
- **2026-10-10:** Home Development now opens `/app/` directly, eliminating the separate simulated shell that had drifted from Expanded Novels. Renamed the existing Workshop card to Home, retained its stable route and Original Reference, and documented the same-change app/Workshop synchronization rule in `AGENTS.md`.

- **2026-10-09:** Featured, refined: one fixed gold **Featured** name with its slide dots in the top-left (the slides no longer carry their own label; "Featured Ascension" is gone), small ghost-glass arrows on the slide's edges for pointers, and a sideways swipe on touch (a swipe never opens the card). Carve New Destiny wears the NovelExpanded app's dark night glass with its spectral rim and halo, so a bright backdrop cannot wash it gold.
- **2026-10-09:** Featured now cycles. Featured Ascension stays first and stays mounted (its video pauses while another slide shows); after it come the host's `featuredWorlds`, each as a World Card Feature card of the same size. Arrows and one dot per slide sit beneath; slides advance every 8 seconds unless the reader is pointing at or focused in them, or prefers reduced motion. Without `featuredWorlds`, Featured Ascension stands alone. The NovelExpanded app features its newest five stories that have a cover; the Workshop features the sample novel.

- **2026-09-11:** Reused the source-owned SEN Discovery mark for the empty Worlds collection state. Collection behavior, responsive layout, and the locked reference remain unchanged.

- **2026-09-11:** Replaced the generic sparkle on the existing Carve New
  Destiny creation action with the supplied SEN Manifesting mark. Its route,
  media behavior, responsive layout, and locked reference remain unchanged.

- **2026-09-09:** Inspected Development and Light-Novels; extracted the existing homepage presentation into its own component and Workshop entry, connected the existing four global destinations, preserved local state across Profile navigation, and verified responsive shared chrome. No source application, backend, Alter Fate, or future media system changes.

- **2026-09-09:** PR review: gated the Development collection fade-in class with `motion-safe:`. The locked Original Reference retains the source class under the repository reference-preservation rule.

- **2026-09-09:** After homepage PR #195 and navigation PR #194 were confirmed merged, added one mock featured novel, two subtle expansion seals, and the original/manga/game overview. Inspected the source `StoryDetailScreen` at `4a3dd02` and captured its static overview into the existing Home feature, replacing the mock novel's detail placeholder. Reused shared chrome, normal card navigation, and local assets; added no production systems or permanent data architecture.

- **2026-09-09:** Corrected the overview vocabulary to “SEN World · Connected Media” and reframed the game mock as a reusable duel battle shell populated from the world's characters, abilities, artifacts, and locations, separate from the novel's narrative.


- **2026-10-28, shared foundation:** Material values and accessibility variants now
  belong to Library presentation `materials.css`. Home retains component role mapping,
  artwork, media exceptions and footer clearance. Its rendered surfaces are compared
  against the active Palette & Materials samples in the browser regression.


- **2026-10-28, background customization:** Home's existing shell role consumes the
  profile's shared background tint and strength. Header, sidebar/mobile frame and
  plain footer adopt it, including opaque accessibility fills. The artwork,
  image/video cards, other glass panels, black buttons and spectrum effects remain
  intact. Reset restores the original violet gradients; the Home Workshop iframe
  shows the same saved app preference.


- **2026-10-28, unified purple:** Header, navigation frame, Events container,
  filters, empty panels, plain nested cards and footer now share the same violet
  fill, and the background picker/strength slider controls them together. Each
  role keeps its blur/shadow geometry. Image/video surfaces retain their earlier
  clear backings; black controls, rainbow effects and the artwork remain intact.
  App colors is the default preset in Profile and the material Workshop.


- **2026-10-28, color-only correction:** Purple is applied to RGB channels only.
  Outer panels retain their original 12% opacity and gradient layers; nested cards
  retain 35% opacity and their original gradients. The header retains its own 95%
  recipe. Blur (24px panels, 25px with saturation for cards), borders and shadows
  are unchanged. Custom tint/strength supplies RGB channels to each recipe, rather
  than replacing it with the header fill. Browser verification compares all
  non-color properties and gradient alpha/stops against the archived originals.


- **2026-10-29, the look leaves Home:** Home's palette stylesheet is now the
  Library's `look.css` (`src/components/library-presentation/`), class
  `.library-look`, worn by every page in the shell through `LibraryLook`. Home's
  own rules (clear media, navigation states, footer clearance) are unchanged there.
