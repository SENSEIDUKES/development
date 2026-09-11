# Light Novels Home

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Source location:** `src/components/LibraryScreen.tsx`, export `LibraryScreen`; `src/components/StoryDetailScreen.tsx`, export `StoryDetailScreen`
- **Inspected source commit:** `4a3dd02b6640b2ec50d8d1d136e37fb808249ed2` (clean local source checkout)
- **Workshop preview:** `?preview=light-novels-home`
- **Responsive Home:** `/library-shell.html?variant=development&source=main-library&screen=home&collection=featured`
- **Replica created:** 2026-09-09
- **Last Workshop update:** 2026-09-11
- **Last source comparison:** 2026-09-09
- **Replica status:** under refinement — multimedia presentation skeleton in the existing Home/detail flow

## Boundary and ownership

Home is a Library-owned screen. `development/LightNovelsHome.tsx` renders independently with display data and callbacks; it imports no Library Shell, Workshop, app store, authentication, or backend. The existing shell document is the shared responsive preview host, not a prerequisite for rendering the component. The Workshop directory remains the intentional root landing page.

Development did not contain the homepage body before this task: MainLibraryPreview had an explicit placeholder. The hero and featured collection were therefore extracted from the verified Light-Novels source. Library and Discover keep their pre-existing Development content slots and collection behavior. This task does not import or redesign their full production bodies.

The extraction retains the source hero JSX, video sequence, six-second backdrop rotation, particles, typography, colors, text, genre/sort controls, empty state, and world-card presentation. The source published catalog inspected for the initial extraction was empty. The multimedia trial now supplies one explicitly requested mock novel from `src/workshop/previews/light-novels-home/previewData.ts`, using existing local artwork. The source video and backdrop URLs remain public media dependencies, with the original video-failure fallback. There are no production data or generation requests.

`reference/LightNovelsHome.tsx` freezes the extracted presentation with host callbacks in place of production store/auth writes. `development/LightNovelsHome.tsx` starts from it and pauses media and particles when inactive while retaining filter/video state. `shared/homeContracts.ts` describes display data only. `shared/home.css` scopes the existing source gradient and gold color. Existing Dao Insights and collection controls are supplied through the content slot, preserving their Development placement between the hero and filters.

## Navigation and preview behavior

- Home: `screen=home&collection=featured`, the standalone homepage.
- Library: `screen=home&collection=my-library`, the existing Library Shell destination.
- Discover: `screen=home&collection=challenges`, the existing Fate Survival destination.
- Profile: the existing Cultivator Cave, including its own nested routes and shared chrome.
- Novel detail: `screen=detail`, the existing destination, now populated for the sole featured mock novel. Direct loading and reloading select that fixture. Back/Forward and Back to novels preserve Home filters; returning from the detail restores card focus.

These compatibility values are retained. Home and Profile remain mounted while inactive so navigation does not discard unrelated local edits or Home filters. Only the active screen's header and global strip are visible. Back/Forward updates the current destination. Story Seed keeps its existing separate document and specialized navigation. The Home hero's Carve New Destiny opens that existing local Story Seed preview.

The Home Workshop entry provides Original Reference / Development / Compare. The existing Library Shell Workshop entry defaults to its Library fixture. Its other fixture controls and locked shell references remain available. The original Library Shell source-comparison date was not advanced.

## Multimedia visual trial

Home still contains one ordinary novel card. Development adds two small, noninteractive text-and-icon seals below its existing metadata. The whole card retains its original click target and accessible name; its accessible description explains the available manga/game mock expansions. No adaptation appears as a separate homepage result or filter category.

The existing `screen=detail` path was a content placeholder in Development. `reference/StoryDetailScreen.tsx` captures the source's static novel overview: cover, title/byline, genre/tags, chapter/arc/realm/status metrics, synopsis, and main story actions. `development/StoryDetailScreen.tsx` starts from that capture and receives the new section through a content slot. This is a bounded presentation extraction, not a replica of source account tools, generated-cover history, exports, or persistence. Reading, Codex, and timeline actions are disabled for this mock and explained onscreen. The reference Home and detail use the same novel fixture for comparison without seals or the connected-media section. Existing locked files are unchanged.

`development/WorldExpressions.tsx` shows the original novel first, followed by a manga adaptation and a reusable duel battle game shell. The game mock is populated conceptually from the SEN World's characters, abilities, artifacts, and locations; it does not continue the novel's narrative. Repeated origin text and related names make the shared world relationship explicit. Manga/game actions are disabled and labeled Preview only. Mobile/tablet use a native, keyboard-focusable horizontal scroll lane with a visible next-card edge and scrollbar; desktop shows all three media cards together. There is no added animation. Existing portrait/pavilion/landscape assets supply the mock art, with a grayscale treatment for manga.

This is a Library-owned presentation of the SEN multimedia concept. No SEN export, backend model, permanent expression schema, storage, purchasing, QR, reader, game launcher, or Portal infrastructure is introduced. The small display props and mock relationship map are local to the trial; fixtures stay in Workshop. Components also accept no expansions, in which case no seals or overview section render.

## Transfer guidance

An approved future production extraction needs `development/LightNovelsHome.tsx`, `shared/homeContracts.ts`, and `shared/home.css`, the existing `@seihouse/library-ui`, `@seihouse/ui`, `motion`, and `lucide-react` dependencies, and a host adapter that supplies published-world display fields and the existing production navigation/acquisition callbacks. Preserve the source public media assets or supply approved local equivalents. Do not transfer Workshop wrappers, fixtures, in-memory navigation transport, or the reference copy.

For the multimedia presentation, also transfer `development/WorldExpressions.tsx` and `development/world-expressions.css`. Integrate its content section into the verified production `src/components/StoryDetailScreen.tsx`; preserve that page's account/story logic. The Development detail extraction and `shared/storyDetailContracts.ts` are a preview adapter for that integration, not a replacement for the complete production page. Supply real display data and approved art only in a separately authorized phase.

## Verification

The multimedia trial passes `npm run build`, the 40 existing Library Shell/Workshop tests, `check:package-boundaries`, and `checkLibraryShellCapture.mjs`. Local browser checks cover 320/390/768/1024/1440px, loaded artwork, a single homepage novel, labeled seals, three connected-media cards, disabled adaptation actions, horizontal keyboard scrolling, direct detail reload, Back/Forward, genre/sort retention, return focus, reduced motion, and 34px bottom safe-area spacing. The original comparison has no seals or connected-media section. Measurements are in `output/playwright/multimedia-world/verification.json`; the build log is beside it. Browser interaction generated no Fetch/XHR requests. This is local preview verification, not a hosted deployment or live account test.

See `artifacts/standalone-home/` for local production browser evidence and the two mobile screenshots. The screenshot browser renders the 390 by 844 CSS viewport at the host display scale; the supplied images capture that rendered area without the tool's black padding.

The build, focused navigation/header/profile/Workshop tests, package boundary checks, and existing locked-capture guard pass. No full production Library/Discover body or production account/backend behavior is claimed as covered.

## Workshop history

- **2026-09-11:** Replaced the generic sparkle on the existing Carve New
  Destiny creation action with the supplied SEN Manifesting mark. Its route,
  media behavior, responsive layout, and locked reference remain unchanged.

- **2026-09-09:** Inspected Development and Light-Novels; extracted the existing homepage presentation into its own component and Workshop entry, connected the existing four global destinations, preserved local state across Profile navigation, and verified responsive shared chrome. No source application, backend, Alter Fate, or future media system changes.

- **2026-09-09:** PR review: gated the Development collection fade-in class with `motion-safe:`. The locked Original Reference retains the source class under the repository reference-preservation rule.

- **2026-09-09:** After homepage PR #195 and navigation PR #194 were confirmed merged, added one mock featured novel, two subtle expansion seals, and the original/manga/game overview. Inspected the source `StoryDetailScreen` at `4a3dd02` and captured its static overview into the existing Home feature, replacing the mock novel's detail placeholder. Reused shared chrome, normal card navigation, and local assets; added no production systems or permanent data architecture.

- **2026-09-09:** Corrected the overview vocabulary to “SEN World · Connected Media” and reframed the game mock as a reusable duel battle shell populated from the world's characters, abilities, artifacts, and locations, separate from the novel's narrative.
