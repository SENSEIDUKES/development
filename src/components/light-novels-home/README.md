# Light Novels Home

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Source location:** `src/components/LibraryScreen.tsx`, export `LibraryScreen`
- **Inspected source commit:** `4a3dd02b6640b2ec50d8d1d136e37fb808249ed2` (clean local source checkout)
- **Workshop preview:** `?preview=light-novels-home`
- **Responsive Home:** `/library-shell.html?variant=development&source=main-library&screen=home&collection=featured`
- **Replica created:** 2026-09-09
- **Last Workshop update:** 2026-09-09
- **Last source comparison:** 2026-09-09
- **Replica status:** faithful presentation extraction with Development navigation integration

## Boundary and ownership

Home is a Library-owned screen. `development/LightNovelsHome.tsx` renders independently with display data and callbacks; it imports no Library Shell, Workshop, app store, authentication, or backend. The existing shell document is the shared responsive preview host, not a prerequisite for rendering the component. The Workshop directory remains the intentional root landing page.

Development did not contain the homepage body before this task: MainLibraryPreview had an explicit placeholder. The hero and featured collection were therefore extracted from the verified Light-Novels source. Library and Discover keep their pre-existing Development content slots and collection behavior. This task does not import or redesign their full production bodies.

The extraction retains the source hero JSX, video sequence, six-second backdrop rotation, particles, typography, colors, text, genre/sort controls, empty state, and world-card presentation. The current source published catalog is empty; the preview passes the same empty catalog. No replacement worlds were invented. The source video and backdrop URLs remain public media dependencies, with the original video-failure fallback. There are no production data or generation requests.

`reference/LightNovelsHome.tsx` freezes the extracted presentation with host callbacks in place of production store/auth writes. `development/LightNovelsHome.tsx` starts from it and pauses media and particles when inactive while retaining filter/video state. `shared/homeContracts.ts` describes display data only. `shared/home.css` scopes the existing source gradient and gold color. Existing Dao Insights and collection controls are supplied through the content slot, preserving their Development placement between the hero and filters.

## Navigation and preview behavior

- Home: `screen=home&collection=featured`, the standalone homepage.
- Library: `screen=home&collection=my-library`, the existing Library Shell destination.
- Discover: `screen=home&collection=challenges`, the existing Fate Survival destination.
- Profile: the existing Cultivator Cave, including its own nested routes and shared chrome.

These compatibility values are retained. Home and Profile remain mounted while inactive so navigation does not discard unrelated local edits or Home filters. Only the active screen's header and global strip are visible. Back/Forward updates the current destination. Story Seed keeps its existing separate document and specialized navigation. The Home hero's Carve New Destiny opens that existing local Story Seed preview.

The Home Workshop entry provides Original Reference / Development / Compare. The existing Library Shell Workshop entry defaults to its Library fixture. Its other fixture controls and locked shell references remain available. The original Library Shell source-comparison date was not advanced.

## Transfer guidance

An approved future production extraction needs `development/LightNovelsHome.tsx`, `shared/homeContracts.ts`, and `shared/home.css`, the existing `@seihouse/library-ui`, `@seihouse/ui`, `motion`, and `lucide-react` dependencies, and a host adapter that supplies published-world display fields and the existing production navigation/acquisition callbacks. Preserve the source public media assets or supply approved local equivalents. Do not transfer Workshop wrappers, fixtures, in-memory navigation transport, or the reference copy.

## Verification

See `artifacts/standalone-home/` for local production browser evidence and the two mobile screenshots. The screenshot browser renders the 390 by 844 CSS viewport at the host display scale; the supplied images capture that rendered area without the tool's black padding.

The build, focused navigation/header/profile/Workshop tests, package boundary checks, and existing locked-capture guard pass. No full production Library/Discover body or production account/backend behavior is claimed as covered.

## Workshop history

- **2026-09-09:** Inspected Development and Light-Novels; extracted the existing homepage presentation into its own component and Workshop entry, connected the existing four global destinations, preserved local state across Profile navigation, and verified responsive shared chrome. No source application, backend, Alter Fate, or future media system changes.

- **2026-09-09:** PR review: gated the Development collection fade-in class with `motion-safe:`. The locked Original Reference retains the source class under the repository reference-preservation rule.
