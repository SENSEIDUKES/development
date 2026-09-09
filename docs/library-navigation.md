# Library navigation architecture

Updated 2026-09-09. Navigation-only Development change, continuing the shared header in PR #190. No existing page body, card, content, image, field, reward, storage operation, or locked reference was redesigned. Production repositories and vendored UI artifacts are unchanged.

## Ownership and contract

`development/LibraryNavigation.tsx` is the Library Shell owner of the default bottom strip: **Home — Library — Discover — Profile**. It composes the existing `LibraryBottomNavigation`. Pages pass `location` and the existing router callback `onNavigate`. The optional `sectionMenu` configuration remains available for an existing desktop rail. They do not build another global bar.

`libraryRoutes.ts` centralizes global labels, route targets, active matching, navigation modes, and the Section outline. Route state remains host-owned; the shell derives selection without another router or store. `LibraryLocation` carries the existing `screen`, LibraryScreen `collection`, and optional `cave` path. Re-selecting the same location does not add history. Nested Cave routes stay under Profile, `sects`/`pricing` under Home, story `detail` under Library, and `challenge` under Discover. Unknown standard pages have no falsely selected destination.

The main Section control and drawer were removed on 2026-09-09 at user request. Page destinations remain in top Search. Search uses the existing dialog for focus containment and Escape restoration, and dispatches selected actions after the dialog releases focus. Story Seed’s separate Sections control and drawer are unchanged. No hidden global Section trigger or empty-menu experience remains.

The strip remains available on standard pages at mobile and desktop widths. Its stylesheet owns fixed placement, minimum 44px targets, labels, content clearance, and bottom/side safe-area insets. The existing Cave rail remains at its existing breakpoint and receives clearance above the strip. The rail retains its page definition; Cave Search exposes the same destinations.

## Existing destinations

| Global entry | Existing host destination | Existing related destinations |
| --- | --- | --- |
| Home | `screen: home`, `collection: featured` (Immortal Hub) | Immortal Hub; Sects (`sects`); Tiers (`pricing`) |
| Library | `screen: home`, `collection: my-library` | Seed Bank (existing Cave `/stories`, including its Story Seeds listing); My Library |
| Discover | `screen: home`, `collection: challenges` | Fate Survival Challenges |
| Profile | `screen: profile`, `cave: /home` | Cave Home, Stories, Relics; public view also exposes its existing Exit action |

Discover currently lands on the existing Fate Survival collection because this repository has no separate Discover screen. No new discovery page was built. Immortal Hub keeps its existing content and creator access. The seed listing uses the existing services and export behavior in `UserProfileStoriesPanel`; no storage system or seed persistence path was added.

`LIBRARY_SECTION_OUTLINE` and page definitions retain the requested organization for existing rails; they no longer create a global drawer. Only existing host destinations are used. Unfinished pages and media storage are not invented. Support stays with universal Help; no Support or debug entry was added to global navigation. Existing privileged/development tools remain in their current owners.

## Preserved workspaces and Cave migration

- `creator` / `story-seed` uses workspace mode. The existing Story Seed strip, drawer, Story Bank, Help, Settings, Manifest eligibility, and desktop navigation are unchanged.
- `reader` / `codex` uses immersive mode. The shell never adds the global strip to those routes, even if a caller requests standard mode.
- Other specialized workspaces can explicitly supply `mode="workspace"` or `mode="immersive"`; their navigation components are retained.
- The Cave's old bottom bar and its placement/placeholder CSS were removed. `/home`, `/stories`, `/relics`, `/settings` and all existing child/public routes are unchanged. Settings is still the existing button under Daily Dao Pillar, outside the global strip. Public Exit returns to the same previous Cave path as before.
- `UserProfileHome`, Cave page panels, Story Seed components, Reader Chamber components and frozen references received no changes in this bottom-navigation work.

## Preview and transfer

Use the existing `?preview=library-shell` workspace and Development. Main Library now includes Home, Library, Discover, Sects, Tiers, and immersive Reader route states; Cave and Story Seed remain their existing configurations. The direct route is `/library-shell.html?variant=development&source=main-library&state=library` (also `linked`, `discover`, `sects`, `tiers`, `reader`). Cave: `source=cultivator-cave&state=developed-cultivator`; public paths use `&cave=/public/home`. Safe areas use `&safeArea=on` or `landscape`.

The Main Library capture still has a clearly labeled content slot, not the full production LibraryScreen. Global actions within it update existing screen/tab fixture state and browser history; Profile and Story Seed open their existing full Workshop previews. The standalone Cave preview uses the same navigation transport to reach Home, Library and Discover. These are local preview adapters, not production data integration.

Transfer `LibraryNavigation.tsx`, `MainLibraryNavigation.tsx`, `libraryRoutes.ts`, `library-navigation.css`, and their existing shared shell/dialog dependencies together with the changed `UserProfile.tsx` and removal of its old dock CSS. Hosts supply `onNavigateLibrary(location)` to UserProfile and their real LibraryScreen active collection to `MainLibraryNavigation`. Keep `libraryPreviewNavigation.ts`, mocks, preview controls and browser verification scripts in Development. This work adds no published SEN exports or SEN-to-Library dependency.

## Validation

Focused component tests cover four-entry global order/selection, existing route callbacks, current-route no-ops, presence/absence of page configuration, retained rails, Cave navigation through Search and public Exit, and the real Story Seed Sections control. `scripts/verifyLibraryNavigation.mjs` checks four standard destinations at five widths, Search keyboard/focus behavior, Cave routes, global transitions/history, safe areas and specialized exclusions. Existing Cave verification scripts now use Search for page navigation.

Browser evidence is local desktop-browser emulation. It does not establish physical iOS behavior, production authentication/storage, a new discovery backend, or a completed design for unfinished pages.

Original five-entry implementation, verified 2026-09-09 (historical):

- `npx vitest run src/components/library-shell/development src/components/user-profile src/components/story-seed`: 162 tests (before the four-entry follow-up) across 9 files passed.
- `npm run build`, `npm run build:package`, `npm run check:package-boundaries`, `npm run check:ui-artifacts`: passed.
- Locked capture integrity: all 14 captures, 11 dependencies and 18 fonts passed.
- Browser: 20 layout/Section combinations (four standard destinations at 320, 390, 768, 1024 and 1440px) passed. Pointer and keyboard entry, Tab/Shift+Tab wrapping, Escape restoration, destination heading focus, Cave settings/history/public Exit, global Home/Library/Discover/Profile transitions and Back/Forward passed.
- Simulated 34px bottom inset: navigation height 115.25px, content clearance 130px. Landscape with 44px side and 21px bottom insets: navigation height 102.24px, clearance 117px; Section remained inside the viewport. Both used reduced motion.
- Real Story Seed preview: original Sections, Story Bank, Help, Settings and eligible Manifest controls retained; original section drawer opens. Immersive Reader route fixture excludes the global strip. Reader implementation files are unchanged.

The browser matrix and interaction groups were run separately after correcting verification timing around dialog focus guards and Story Seed's initial fixture hydration. The older Cave scripts were updated for the new entry path; their broader reward/account scenarios were not re-run as part of this navigation change.

Four-entry follow-up, 2026-09-09: removed the global Section trigger, drawer and obsolete styling. The 159 focused tests across 9 files pass, including the real Story Seed Sections drawer and Cave Search destination focus. The production build and package-boundary check pass. The 20 standard-page/viewport combinations pass with four controls, unchanged clearance and minimum touch targets. Story Seed's original navigation and immersive exclusions also pass in the browser. Search dispatch now waits for dialog focus restoration before calling a host action.

The follow-up interaction run also passes Search initial focus, forward/reverse Tab containment, Escape restoration, Cave routes/public Exit, global transitions and Back/Forward, and 34px bottom/44px side safe-area simulations. Navigation heights and clearances remain those listed above. Browser checks wait for Search initial focus and the global navigation landmark after full-page transitions before asserting geometry.
