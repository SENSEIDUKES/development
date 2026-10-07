# Library Shell

Where `reference/` exists, it holds the old production version, kept as reference
material for the remake; it is not edited or refreshed. New features do not get a
reference folder. Old systems stay until each is remade on the new path; never
reconnect them as they are or re-sync with the old production app. The destination
is SEN, Library and NovelExpanded built here, guided by `NOVEL_EXPANDED.md`.

- **Source repositories:** `SENSEIDUKES/Light-Novels`, `SENSEIDUKES/development`; UI dependencies from `SENSEIDUKES/UI`.
- **Source locations:** Light-Novels `src/components/GlobalHeader.tsx` (`GlobalHeader`), `src/components/DaoInsights.tsx` (`DaoInsights`), and the collection navigation in `src/components/LibraryScreen.tsx` (`LibraryScreen`). Development `src/components/story-seed/development/CreationModal.tsx` (`CreationModal`), `StorySeedHeader.tsx`, `StorySeedSelector.tsx`, `StorySeedMobileNavigation.tsx`, and `StorySeedSettings.tsx`.
- **Workshop preview:** `?preview=library-shell`
- **First Workshop record:** 2026-09-08
- **Last recorded Workshop update:** 2026-10-07
- **Historical source inspection:** 2026-09-08
- **Implementation status:** under refinement; locked captures plus Development workspaces on the canonical `SEIAppHeader` and `SEIAppShell`.

## Top navigation update

Development now uses Logo — existing Library Header Badge — optional contextual item — Help — Search. The public Cave supplies Public View; Dao Insights is Home content rather than a header item. Help reuses the original Library Help menu and Search finds host destinations/actions. Help and Search are two separate controls at every width, each keeping its own 44px target; neither is ever folded into a "…" menu. Pages that still supply header commands keep the shared toolbar below the top row; Story Seed no longer does — it owns its Save Draft, Manifest and status row inside its own content. See [the header contract](../../../docs/library-header-family.md) and its focused Header slot states preview.

## Bottom navigation update — 2026-09-11

`LibraryNavigation` now owns Home — Library — Discover — Profile, active-route matching, content clearance and safe-area spacing. Its active Development scrubber uses the supplied official SEN Home, Book, Discovery, and Profile icons. The shared navigation/header layer also supplies the official Settings and Exit marks to active consumer controls. The global Section control and drawer were removed on 2026-09-09 at user request; page destinations remain in top Search. Page definitions still supply the Cave’s existing desktop rail. `MainLibraryNavigation` adapts the existing LibraryScreen collections and routes. Story Seed keeps its Sections, Story Bank, Settings and Back controls, now drawn by the shell's workspace mode (2026-09-27, below); Reader/Reader Codex are immersive exclusions. No page content, cards or internal controls were redesigned. [Contracts, route mappings and transfer details](../../../docs/library-navigation.md).

## Platform footer — 2026-09-17

`LibraryFooter` is the Library Shell's platform footer, owned like the global header and bottom strip. It replaces the production two-line footer (statement plus the small ⓈSEN mark under a tall empty band) with a compact composition modelled on the supplied reference: the existing Celestial Library emblem between gold hairlines, the SEN wordmark in cream display serif, the statement as production then carried it, "SEIHOUSE: A BETTER TIME CAPSULE AND TRANSLATOR OF ARTISTIC EXPRESSION" (the identity was reworked on 2026-09-22 — see below), a glass social row (Discord, TikTok, Instagram, YouTube, X), three closed accordions (Explore, SEIHouse, Support), the account's language entry, and the legal row (© 2026 SEIHouse Productions LLC · Terms · Privacy · Cookies). No portal or domain button. Surfaces are `LibraryPanel` glass; the accordions are `SEIDisclosureGroup` in single mode, so every menu starts collapsed and only one opens at a time; the social glyphs follow `currentColor` and are decorative beside their named controls.

The footer holds no routes or URLs. `MainLibraryFooter` adapts the existing Main Library destinations — the same ones header Search and the global strip use (Immortal Hub, My Library, Fate Survival, Sects, Tiers, Story Seed, Cultivator Cave, Seed Bank, Relics, Library Help, Shortcut Spells, Settings) — through the shared `onNavigate` callback, and returns nothing on immersive routes, matching the navigation exclusions. Social channels and legal pages are host configuration passed in by the shell; neither repository publishes those URLs yet, so the Workshop fixture reports the destination locally instead of inventing links, and an item with no destination is not rendered. The language pill shows the account's Interface Language from the SEN language registry and opens the Cave's existing Language setting, which owns the confirm/revert safeguard; it adds no second selector or save path. Page clearance above the global strip is unchanged (`library-navigation.css`). Verification: `output/playwright/library-footer/verify.mjs` against `npm run preview -- --port 4173` records 320/390/1280/1440 layouts, 44px targets, the menu layout each width produced — one stacked column below 1024px, three tab columns at and above it — keyboard single-open, focus rings and strip clearance; the sandbox answers the Google Fonts `@import` with an empty sheet because it has no outbound network.

## Footer wide layout and the SEN expansion — 2026-09-21

The footer's old two-column split began at 768px and centred a short identity beside a tall stack of closed accordions, which left laptops with a half-empty left side and every destination hidden behind a click. The wide layout moved to 1024px and, at and above it, stood the three menus as open columns beside an identity rail. **Superseded on 2026-09-22 — see the wide layout entry below.** That arrangement traded one imbalance for another: a tall open card set against the identity, still side by side. The breakpoint and the narrow behaviour it left alone both survive the rework.

The identity now states what the wordmark means: the `SEN` mark keeps its production text, and a new line beneath it reads `SEIHouse Expanded Novels`. The company statement still sat beneath it unchanged on this date; the entry below records how it reads now.

## Footer identity and control order — 2026-09-22

Refinements at the product owner's direction. The social pill moved below the menus card and above the language control, so the footer reads identity, menus, channels, language at every width. The disclosure chevrons and the language chevron dropped their gold for a muted cream at half opacity — they were pulling more attention than the identity above them.

The identity now reads as three ranks. The `SEN` wordmark carries `LibraryElementalTitle` (`element="celestial"`, subtle intensity, no shadow): it holds one colour at a time and travels the Celestial Library spectrum from `library-spectrum.css` — portal blue, violet, gold — on that sheet's 18s cadence. The lettering's vertical gradient and sweeping sheen would leave neighbouring letters different colours, so the footer points the text and its aura at the animated colour and stands the sheen down; reduced motion holds the spectrum's blue. The decorative layers the component adds are `aria-hidden`, so the mark is still announced once, and `LIBRARY_FOOTER_MARK` is its single source. Beneath it, `SEIHouse Expanded Novels` states the expansion plainly in cream, carrying no lettering of its own.

The company statement dropped its `SEIHOUSE:` prefix — the wordmark and expansion directly above it already name the company — and now reads as a motto rather than a label: the display serif's true italic at book weight with eased tracking, replacing the bold Alegreya SC label. Alegreya SC ships no italic face, so keeping it there would have meant a synthetic slant. `LIBRARY_FOOTER_STATEMENT` is DEV's statement from here; production's older two-line footer string is not the authority for this surface.

## Footer wide layout — one column, menus as tabs — 2026-09-22

The wide footer no longer sets the identity against a menu card side by side: at that scale one half always ended up carrying the other, whichever way the space was divided. Above 1024px the footer now keeps the same single centred column the phone reads — identity, menus, channels, language, then the legal bar — capped at 52rem. The extra width goes to the menus, which lay their three groups out as a row of tabs: closed, the card is barely taller than its headings; opening one drops that group's links beneath its own heading, in its own column, and the card grows only for it.

This removed a branch rather than adding one. The wide columns markup, `WIDE_FOOTER_QUERY` and `useWideFooter()` are gone — every width now renders the same `SEIDisclosureGroup`, and only `library-footer.css` differs, so there is no media-query hook, no first-paint swap, and single-open behaviour, `inert` collapsed content, keyboard activation and focus rings are the component's at every size rather than the narrow branch's alone. `workspaceMedia.ts` is back to the header and navigation breakpoints it owned before. The verification harness follows: it records the layout each width produced — one stacked column or three tab columns — and runs the same keyboard single-open check everywhere, which the old wide branch had no accordions to answer.

## Footer surfaces and the global strip's width — 2026-09-22

The footer's menus and channels dropped their `LibraryPanel` glass, and the language control traded its lit lozenge for a plain outline. Stacked a few rows above the global bottom strip, those surfaces read as the same material as the strip itself, so the footer now carries its identity as type and marks on the page's own ink and the strip stays the one glass object on screen. The hairlines between the menu groups — and under each tab in the wide row — carry the structure the card used to. `LibraryFooter` renders plain containers; the class names, targets and behaviour are unchanged.

`MainLibraryFooter`'s middle menu is labelled **About Us** rather than SEIHouse; its group id and destinations are untouched.

The global bottom strip hugs its content above 768px (`library-navigation.css`). A phone's strip spans the screen and its four destinations share that width from a zero flex basis; past 42rem the bar stopped growing but the buttons kept the shared basis, so every destination sat in a box nearly twice the width its icon and label needed — 154px against the phone's 83px. Off that basis they size to their own label, and the bar is 325px at 1280px wide instead of 672px. The floor stays 44px, and clearance above the strip is unchanged at 14px.

## Production-readiness audit fixes — 2026-09-25

An audit of the shell before further building found ten issues; all are fixed.

- **Help no longer takes down the host page.** `LibraryHelpMenu` reads narration through `useOptionalNarrativeAudio()`: without a host `NarrativeAudioProvider` every topic still opens as text and only Listen is withheld. `WorkspaceHeaderUtilities` wraps the on-demand Help in its own error boundary — a failed download shows a "Help could not load" sheet, and the next press retries with a fresh loader.
- **Dao Insights shows the quote it settles on.** The carousel keyed every 100ms frame into `AnimatePresence mode="wait"`, which could strand an intermediate quote on screen while the divined one sat in state (reader saw one quote, copied another; 2 in 20 trials). The spin now updates one element in place and the settled quote and author animate once. The carousel interval, copy timer and status check are all stopped on unmount, an empty divination keeps the fallback, and the undefined `neutral-850`/`amber-450` steps are now `neutral-800`/`amber-400`.
- **The emblem ships with the shell.** `LIBRARY_EMBLEM` (`libraryBrand.ts`) points the header and footer at SEIHouse media, `https://media.seihouse.org/SEN/IMAGE/ICON/Header/CELESTIAL%20LIBRARY%20ICON.jpg`, instead of a Workshop-only `public/` path the package never carried.
- **The header overflow survives phone scrolling.** It closes on a real width change only, not on the resize events an address bar or keyboard fires.
- **Seed Bank is highlighted on the Cave Stories screen.** The Profile section outline lists Seed Bank beside Cultivator Cave.
- **Footer:** a disabled destination is always a disabled button (a disabled link still navigated), and `libraryFooterCopyright()` dates the legal line from the current year; the load-time `LIBRARY_FOOTER_COPYRIGHT` constant is gone.
- **Placeholder legal documents.** SEIHouse has not published Terms, Privacy or Cookies yet. `libraryLegal.ts` holds an outline for each, and when a host passes no `legal` destinations `MainLibraryFooter` opens them in `LibraryLegalSheet` under a "Draft placeholder" notice. Replace a document's sections with approved text and mark it `published`, or pass hosted URLs through `legal`. Social channels remain host configuration.
- **Workshop only:** the capture's Back to Workshop control sits in its own strip above the app instead of floating over the Library logo.

Regression coverage: `LibraryShellResilience.test.tsx`.

## Footer identity trimmed to the statement — 2026-09-25

At the product owner's direction the footer read as busy, so everything above the company statement came out: the emblem seal and its gold hairlines, the `SEN` elemental wordmark and the `SEIHouse Expanded Novels` line. The footer now opens on a single `NovelExpanded` title (`LIBRARY_FOOTER_TITLE`, cream display serif) above "A better time capsule and translator of artistic expression", then the menus, channels, language and legal row. `LibraryFooter` no longer takes an `emblem`, and `LIBRARY_FOOTER_MARK` and `LIBRARY_FOOTER_EXPANSION` are gone; the header keeps the emblem through `LIBRARY_EMBLEM`. The 2026-09-22 identity entries above describe the superseded arrangement.

## Browsing screens on the fixed-frame App Shell — 2026-09-27

Development now vendors `@seihouse/ui@0.6.0` and `@seihouse/library-ui` from UI PR [#81](https://github.com/SENSEIDUKES/UI/pull/81) (`bce4c74`), and the Library's browsing screens use the App Shell's own scrolling model. `WorkspaceShell` is back to a pure adapter: the canonical shell is a screen-height frame whose `<main>` scrolls, the header stays put without sticky positioning, and the desktop rail appears from `lg` through the new `sidebarBreakpoint` and scrolls on its own. The workarounds that kept the older shell scrolling the whole page are gone — the `<main>` overflow override, the sticky rail and its measured header height, and the JavaScript hook that withheld the rail below 1024px. `mainRef` reaches the scrolling region for hosts that reset or restore scroll. Clearance above the fixed global strip is now the main region's bottom padding, so the frame never grows past the screen.

The Main Library Home preview moved onto the same frame, so Home, Create, the Cave and Story Seed share one browsing shell; the locked reference keeps its original page-scrolling markup. `MainLibraryHeader` and `GlobalHeader` take `landmark="none"` inside it. Library UI kept its version number while `LibraryElementalTitle` moved to `@seihouse/ui` as `ElementalTitle`; the familiar name effect now uses the universal component.

**The Reader Chamber stays outside the shell.** It is immersive, and its cinematic scrolling saves and restores the reading position against the document scroller (`reader-chamber/shared/cinematicScroll`). Mounting it inside the shell's `<main>` would silently move that scroll surface. `ReaderScrollBoundary.test.ts` fails if Reader code imports the Library Shell or `SEIAppShell`, if reader or codex stop being immersive routes, or if the reading position leaves the document scroller. The Reader's overlay gate, which listened for scroll on the prose container that never scrolls, now listens on the Reader's real scroll surface.

The capture's Back to Workshop strip takes a fixed height and the frame gives it up (`preview-environment.css`), so opening a capture at browser width adds no second scrollbar.

## One navigation system, two modes — 2026-09-27

`LibraryNavigation` is now the Library's only navigation system, with two official modes:

- **Main mode** — the global strip (Home — Create — Discover — Profile) with an optional page rail. Home, Create, My Library and the Cultivator Cave use it; nothing about it changed.
- **Workspace mode** — `<LibraryNavigation mode="workspace" workspace={definition}>`. A focused task describes itself in a `LibraryWorkspaceDefinition` (label, sections, profile, tools, Back) and the shell draws the rest: the bottom task bar in the global strip's place and style (Sections, the task's tools, Back), the Sections drawer on phones and tablets, and the desktop rail through the same `LibrarySectionSidebar` main mode uses. From 1024px the rail and header take over, so the task bar and its clearance step aside. `useLibraryWorkspace()` exposes the drawer state to a page that needs it.

Story Seed is the first workspace. It no longer runs a navigation system of its own: `WorkspaceNavigation`, `WorkspaceSidebar`, `WorkspaceBottomControls` and `useWorkspaceNavigation` are removed, and `StorySeedWorkspaceChrome` supplies its sections, Story Bank and Settings tools, and Back to the shell. Users see the same bar (Sections, Story Bank, Settings, Back), drawer and rail. Its header now matches every Library page — the Celestial Library emblem (`LIBRARY_EMBLEM`), Help and Search — and the logo returns to Library Home through the host's `onNavigateHome` instead of reloading the Workshop root. The Cultivator Cave's header took the same emblem, so Home, Create, the Cave and Story Seed all carry one identity. Story Seed's section heading wrapper was renamed `SeedSectionFrame` (and its style scope `seed-field-scope`) so nothing in Story Seed is mistaken for a shell.

The Library Shell tab groups its pages by mode — Main mode (Home, Create & My Library; Cultivator Cave), Workspace mode (Story Seed) and Header only — shows the selected page's mode, opens on Home, and its checklist covers both modes and the immersive Reader.

## Pathways sidebar on laptops — 2026-09-28

Development now vendors `@seihouse/ui@0.11.0` and `@seihouse/library-ui@0.10.0`; the exact UI source commit, PR and checksums are recorded in [artifact provenance](../../../vendor/ui-artifacts.json). UI owns the two-way double-tap interaction, the shared overlay scrollbar and the Library navigation's gold-and-cyan bevel. Development supplies the host-owned navigation and remembered width preference.

- **Main mode on laptops (1024px and wider)** now uses the **Pathways sidebar** instead of the bottom strip: the reader's picture, name and cultivation rank at the top (`profile` on `LibraryNavigation` / `MainLibraryNavigation`; selecting it opens the Cave; signed-out readers see Guest reader · Sign in to cultivate), Home — Create — Discover — Profile, Settings in the footer slot, and the host's navigation artwork (`LibraryAssets.navigationArtwork`, `immortal-land-4.jpg` in the Workshop). Phones and tablets keep the bottom strip.
- **The sidebar is open by default and changes width only on purpose** (`sidebarBehavior="double-tap"`). Double tap or double click anywhere in it switches between the expanded sidebar and the 72px icon rail; a single tap on an icon still navigates immediately. The UI package rejects scrolling, dragging and canceled gestures. There is no star; a minimize/expand control appears on keyboard focus. Hover and focus never change its width, and compact icons retain their tooltips. The page stays beside the sidebar at both widths. `WorkspaceShell` applies one choice to every main-mode page, so minimizing on Home keeps the Cave minimized. The host remembers it through `LibraryDesktopNavigationProvider`'s `sidebarMode` / `onSidebarModeChange`; without them it lasts for the visit (`librarySidebarMode.ts`). The Workshop host (`StoredLibraryDesktopNavigation`) stores it under `seihouse.library.sidebarMode`. `pinned` remains the stored expanded value, with no pin mechanic. No width forces the rail.
- **Scrollbars are the shared overlay scrollbar.** Library navigation's thin gold thumb appears only during scrolling or active thumb dragging and fades about one second after scrolling stops, even while hovered. Hovering, clicking or focusing navigation does not reveal it. Other scrollable surfaces retain their existing hover behavior. Scrolling stays native, and forced colors restores the native scrollbar. `WorkspaceShell` carries `library-scrollbars` for Library gold; hosts can add it to `<body>` for portaled surfaces. The gold seam, cyan halo and dark shadow belong to the stationary sidebar frame, outside its scrolling items.
- **Nested pages** are grey until active; the active one glows white beneath its parent's blue pill.
- **Only real sub-pages nest.** The Cultivator Cave's pages (Home, Stories, Rewards…) sit under Profile and replace the Cave's separate short rail. Home, Create and Discover pass no nested list in sidebar mode: their sections are already on the page, in the header menu and in the footer, and repeating them pushed the four pathways off a laptop screen.
- **Dao Insights moves into the header center** whenever the Pathways sidebar is showing (`WorkspaceHeader` `center` → `SEIAppHeader` `center`, used by `GlobalHeader`), while the Celestial Library logo and badge stay on the left; the Home content copy steps aside, and on phones and tablets it stays in Home content as before. The Cave supplies no center and keeps its PROFILE badge.
- **Workspace mode (Story Seed) uses the Pathways styling too**, in its rail and its phone Sections drawer. Long labels and section guidance now wrap. Its rail stays open: the sidebar modes apply to main mode only.
- **Hosts can keep the strip.** `LibraryDesktopNavigationProvider value="strip"` keeps the bottom strip at every width; `useLibraryPathways()` tells a surface whether the sidebar is showing.

The Library Shell tab's **Laptop navigation** control switches the Development frame between the Pathways sidebar, the bottom strip (before), and **Compare both**, which stacks the two at the chosen viewport. Captures accept `&laptopNav=strip`.

## Capture boundary



`reference/main-library/` freezes the global header, DAO presentation and animation logic, production theme stylesheet, and the exact collection-tab fragment that displays sync state. It localizes the source font payloads so external network and CSP changes cannot alter the captured layout. `reference/story-seed/` freezes the current shell components, section model, settings body, supporting pure helpers, and CSS. `StorySeedShell.tsx` copies the shell JSX from `CreationModal`; its domain editor, Story Bank, and Help children are explicit host slots. This capture is distinct from the older historical reference inside the existing Story Seed Workshop.

`development/LibraryShell.ts` exports the workspace system: `WorkspaceHeader` as a thin adapter over the canonical `SEIAppHeader`, `WorkspaceShell` as a thin adapter over `SEIAppShell`, and the shared header-action presentation. The custom `HeaderFoundation` and the old `WorkspaceHeader` visual implementation are gone; only one header system remains. `MainLibraryHeader` now supplies Home context and commands to the same shared top header; the locked homepage capture stays unchanged. See [header contract and ownership](../../../docs/library-header-family.md).

## Inspect the references

Use Workshop Controls → Pages to select Main Library or Story Seed, Phone (390 × 844), Tablet (768 × 1024), or Desktop (1440 × 900), and a mock state. Desktop frames retain their actual viewport width and can be scrolled horizontally on smaller hosts. The **Open responsive capture at browser width** link is the appropriate route for inspecting 320px phones, tablets, landscape, or native browser resizing.

| Reference | Phone preview | Desktop preview |
| --- | --- | --- |
| Main Library | `?preview=library-shell&source=main-library&device=phone` | `?preview=library-shell&source=main-library&device=desktop` |
| Story Seed | `?preview=library-shell&source=story-seed&device=phone` | `?preview=library-shell&source=story-seed&device=desktop` |

The internal frame route is `/library-shell.html?source=main-library&state=linked` or `/library-shell.html?source=story-seed&state=filled`. It is a second Vite HTML entry, not a second Workshop feature or homepage card. Separate documents preserve source theme differences, viewport media queries, body portals, scroll locking, safe-area CSS, and overlay stacking in Compare mode.

Workshop Controls also carries a **Safe area** selector (notch, landscape) and a **Reduced motion** toggle. Both are preview-only environment simulations applied inside the Development frame, and a per-viewport verification checklist appears beside them.

| Source | Available mock states |
| --- | --- |
| Main Library | Linked account, guest, syncing, offline/pending sync, profile active, active story, long account name, missing profile record, local DAO, failed DAO response |
| Story Seed | Empty required fields, filled requirements, long equipped title, saved feedback, generating, VERSA drafting, error |

Additional states are exercised through the original controls: open/close Command Hub and DAO overlay, choose DAO categories, seek and copy wisdom, open Profile, select global destinations, open the mobile section drawer, choose all seven sections, toggle Story Bank/Help, open desktop/mobile Settings, change Rated 18+ and Fate Survival, select visibility/pressure, save, and manifest. Saving lasts 2.5 seconds as in the source; simulated manifesting lasts 1.5 seconds and reports the Blueprint destination. Refresh resets all fixture state.

## Ownership and dependencies

| Responsibility | Current owner and dependencies | Future sharing assessment |
| --- | --- | --- |
| Platform footer | `LibraryFooter` presentation and `MainLibraryFooter` destination adapter; identity, social row, closed menus, language entry, legal row | Library-owned chrome. Hosts supply social/legal configuration and the router callback; SEN never depends on it. |
| Main Library identity and home entry | Light-Novels `GlobalHeader`; emblem, typography, press-and-hold Celestial glow, responsive title visibility | Branding and home routing remain Library-owned. A common identity container could eventually use existing Library UI primitives. |
| Profile/cloud entry | `GlobalHeader` reads authentication and profile state from `useAppStore`; click routes to `profile` for linked users and guests | Account identity, tiers, and authentication belong to the host. Workspaces should receive host callbacks and display data rather than importing its store. |
| Global Command Hub | `GlobalHeader`; local disclosure state, outside pointer/Escape dismissal, global screen navigation, optional active-tome commands | Global destinations, companion realms, tiers, and account summaries remain Main Library-specific. Do not turn these into workspace section navigation. |
| DAO Insights | `DaoInsights`; static quotes, 14-second rotation, category filtering, portal, clipboard, configuration check and `/api/dao-insight` in production | Library service and first-party content. A generic popover/dialog primitive may be shared; the DAO service does not belong to SEN. |
| Library sync | `LibraryScreen` collection strip reads `syncStatus`, collection count, and tab selection | Sync truth belongs to the host's storage/synchronization systems. A presentational status slot is a candidate; no second sync store. |
| Story Seed identity and desktop utilities | `StorySeedHeader`; badge, Save Draft, Settings, Story Bank, Help | Existing badge/button/panel primitives already belong to Library UI. Workspace action arrangement can be considered later, without making account/global navigation mandatory. |
| Desktop section navigation and mobile drawer | `StorySeedSelector` plus `seedSections`; required/completed state from `StorySeedInput`; equipped relic title supplied by the host | Drawer and panel primitives are already shared. Story/World families, seven sections, required inputs, and completion rules remain Story Seed-specific. |
| Mobile bottom controls and settings sheet | `StorySeedMobileNavigation`; local drawer/sheet state, focus restoration, Escape, body scroll lock, ResizeObserver, safe-area padding; Settings body shared with desktop | Overlay mechanics, bottom-navigation layout, and accessibility may be common workspace infrastructure. Action labels, Manifest eligibility, and settings fields remain domain-owned. |
| Settings and Manifest footer | `StorySeedSettings`, `seedState`, and `CreationModal`; maturity metadata, Fate Survival, granular Style/Genre/Premise gate, generation state | Workspace/domain semantics remain Story Seed-owned. Footer and button presentation already use common primitives. |
| Presentation packages | UI owns `@seihouse/ui@0.11.0` and stateless `@seihouse/library-ui@0.10.0`; development's `LibraryPresentationProvider` supplies branded implementations and host asset slots to SEN contracts | `@seihouse/library/shell` owns host navigation and preferences; UI owns drawer gestures and presentation. Library may depend on SEN; SEN must not depend on Library or Library UI. |

### Overlaps that are not equivalent

Both shells show an emblem, navigation, actions, and status, but their lifecycles differ. Main Library is a global, sticky host header (`sm` identity expansion; `md` active-story/system commands). Story Seed is a page workspace with desktop actions and sidebar at `lg` (1024px), and a drawer/bottom-navigation combination below that breakpoint. Its settings sheet is bottom-anchored and capped at `100dvh - 3rem`; its Manifest footer is sticky on desktop and in flow on smaller screens. The host frame must not substitute container-width styling for these viewport rules.

The **cloud is not the sync spinner**. In current `GlobalHeader`, it is an animated Profile/Celestial Tools entry. `syncStatus` and `lastSavedTime` are read but do not render there. Syncing and pending/error dots render beside My Library in `LibraryScreen`. Likewise, Command Hub's **Online** label is current literal source copy and does not track connectivity; the offline fixture deliberately leaves it unchanged. `StorySeedSelector` has an old comment referring to a bottom Profile tab, but the current navigation has no such tab. The captured code preserves the source; this documentation records the actual behavior.

## Workshop adapters and excluded production dependencies

`shared/MainLibraryAdapter.tsx` defines the narrow context consumed by the copied header/DAO. `MainLibraryPreview.tsx` provides account/profile fixtures, a mock active story, sync values, screen callbacks, overlay destinations, and local DAO responses. Firebase imports, the production app store, storage, unused login routine, and unused audio import are omitted. Haptics stop at a documented no-op. DAO presentation still handles loading, rotation, filtering, copy feedback, and fallback; its two network calls use `requestDao` instead. No keys or provider configuration are copied.

`StorySeedPreview.tsx` owns only transient React fixture state. It passes the canonical type shape and updater contract into the captured shell without mounting `CreationModal`, the live Story Seed store, auth gate, repositories, generation pipelines, or persistence. Selecting a section exits the Story Bank fixture as in the original mobile integration. The emblem link retains its source markup and is intercepted at the preview boundary to report the local home destination.

Account linking, full Profile, collection contents, Story Bank, Help content, editor forms, Blueprint review, reader, and Codex destinations are clearly labeled mock content slots. Their domain implementations are not captured. This preserves the shell's dimensions, classes, breakpoints and interaction structure; **full-page pixel parity and content-dependent footer positions are not claimed**. The neutral fixture's height differs from a complete editor or library hero. The requested work ends at these shell boundaries.

The Library emblem, VERSA mark, and the source-requested Alegreya, Alegreya SC, Noto Serif, and Rubik font payloads are local copies under `public/library-shell/`. Story Seed retains `/favicon.jpg`. No production data, auth, generation, storage, sync, or media-service calls occur. No backend, API, schema, database, routing store, or auth system was added.

## Lock and provenance

`capture-manifest.json` records source commits, verified source paths, SHA-256 hashes of source text and each adapted capture, and dependency/asset hashes. Text hashes normalize CRLF to LF for Windows checkout compatibility. The unused capture-check script was retired on 2026-10-06 because it pins removed vendor archives. The provenance manifest is kept. Use `npm run check:ui-artifacts` and `npm run check:package-boundaries` for the current source graph.

The capture reuses canonical presentation packages and type contracts rather than cloning shared UI or defining another schema. Historical captures and their provenance remain unchanged; they are not re-compared or recaptured. The dependency list is a drift guard, not a new package or distribution mechanism.

## Validation

See [validation evidence](../../../docs/history/library-shell-validation.md) for the checked viewports, interactions, source comparisons, and exact limits of verification.

## Implementation inventory

The packages and NovelExpanded app built here are the destination. Keep Workshop
controls, fixtures and adapters outside reusable package entries; another repository
changes only when the owner asks. Historical references stay untouched.

The existing local files named by this inventory are:

- `src/App.tsx`

## Workshop history

- **2026-10-07 (Profile):** `LibraryDestinationsProvider` gives every Library navigation beneath it the host's places, including the Cave's own (a navigation's `destinations` still wins), and `useLibraryBottomClearance()` says how much of the screen's bottom the bar and the floating music note cover, so a host's own floating pieces (the Familiar) stay above them. NovelExpanded's places are now Home, Create and Profile, with Settings beside Profile. The Workshop's Familiar surfaces keep above the bar and the note the same way (see "The app's places and the Familiar above the bar" below).
- **2026-10-07 (later):** While a bottom bar is on screen (phones and tablets), a header's music note now floats just above the bar's right end, as the Reader's note floats above its Listen bar, instead of sitting in the header; on laptops it stays in the header (`useLibraryBottomBar`, `useLibrarySoundSlot`; see "The music note floats above the bar" below). The Workshop's Profile note follows the same rule.

- **2026-10-07:** NovelExpanded's Home and World Info moved onto the shell with its own two places (Home, Create); added `destinations`, `WorkspaceHeaderSoundProvider`, `useStoredLibrarySidebarMode` and `useLibraryLegalDocuments` (see "NovelExpanded on the shell" below). The Workshop's Library preview and locked captures are unchanged.

- **2026-10-06:** Adopted UI 0.11.0 / Library UI 0.10.0. The package owns two-way double tap/click, with no star and a keyboard-focus-only width control. Library navigation scrollbars appear only during scrolling/dragging; a gold-and-cyan bevel frames the stationary edge. Removed Development's local expansion handler and hidden-star CSS, preserving the host's stored width choice.

- **2026-09-28 (second follow-up):** Adopted UI 0.10.0 / Library UI 0.9.0 (UI PR #84). The sidebar is open by default: the star minimizes it to the icon rail, and a double tap or double click on the rail (which shows no star) expands it; hover and focus never open it. Every scrolling surface in the shell uses the shared overlay scrollbar in Library gold. Locked captures and source-comparison dates are unchanged.
- **2026-09-28 (follow-up):** Adopted UI 0.9.0 / Library UI 0.8.0 (UI PR #83). The sidebar top shows the reader's picture, name and rank instead of the emblem; the logo and badge returned to the header beside a centered Dao Insights; the sidebar rests as an icon rail, opens on approach and pins with the star, remembered per device, replacing the forced rail below 1280px; nested pages are grey until active and glow white; Story Seed moved onto the Pathways styling.
- **2026-09-28:** Adopted UI 0.7.0 / Library UI 0.6.0 (UI PR #82). Laptop main mode moved from the bottom strip to the Pathways sidebar with the Cave's pages nested under Profile, Settings in the footer and the host's artwork; Dao Insights moved into the laptop header center. Story Seed keeps its default sidebar. Added the Laptop navigation compare control. Locked captures and source-comparison dates are unchanged.

- **2026-09-26:** The bottom strip's Library tab, which reopened Home with My Library selected, became **Create**, opening the new Create page (`{ screen: 'creator-space' }`, [Create](../creator-space/README.md)). `LibraryDestination` `library` → `create` (same book mark); My Library and story detail now select Home; the outline's `library` group became `create`. Header Search and the footer Explore menu gained Creator Space; My Library stays in both. The Development capture mounts Create through `CreatorSpaceHost` and keeps it mounted like Home. Locked captures and source-comparison dates are unchanged.

- **2026-09-17:** Added the compact platform footer (`LibraryFooter`, `MainLibraryFooter`, `library-footer.css`) beneath Home content in the Development shell, keeping the SEN identity and statement, adding the visible social row, three closed single-open accordions over existing destinations, the account language entry that opens the Cave's Language setting, and the legal row. No portal button. Locked captures, header, bottom navigation and Home sections are unchanged.

- **2026-09-11:** Consolidated every supplied SEN SVG and its `currentColor` renderer under `src/components/sen-icons`, replacing public-path masks with source imports. Shared Help and Search now consume the same named adapters as navigation, profile, creation, and Qi surfaces; compatibility exports keep established Development imports stable.

- **2026-09-11:** Extended the shared active Development icon adapter with
  the supplied official SEN Profile, Settings, Exit, Manifesting, Qi, and Qi
  Yin-Yang marks. Global Profile, Cave account controls and reserve hierarchy,
  Reader Settings, and active creation controls now share those local assets
  without changing routes, actions, or locked captures. The supplied female
  Profile mark is available to an explicit future presentation choice; no
  gender was inferred from current profile data.

- **2026-09-11:** Added locally served official SEN navigation artwork to the
  active Development shell. Home, Library, and Discover now use the supplied
  SEN Home, Book, and Discovery marks in the global scrubber; the shared icon
  adapter preserves each consumer's foreground color. Locked captures and
  source-comparison dates are unchanged.

- **2026-09-09:** Regression fixes across four connected surfaces. Restored the Cultivator Cave's Relics destination as a full-width card between the Daily Dao Pillar and Store/Settings, opening the existing `/relics` route and its one inventory panel. Removed Story Seed's second header/action toolbar: Save Draft, Manifest and the small save/generation status are a compact page-owned action row above the form, while Settings, Story Bank and Help stay in Story Seed's own navigation. Restored Help and Search as separate, individually visible top-header controls at every width, keeping the recent badge-legibility fix and the badge's shape, glow, border, colors and height. Moved Dao Insights out of the header into Home content, beneath the featured area and above the collection tabs, with its quotes, rotation, filtering, modal, clipboard, provider check and fallback unchanged. Full titles stay readable at 320, 375, 390, 430 and desktop widths. Locked captures and source-comparison dates are unchanged.

- **2026-09-09:** Unified the top row across Home, Story Seed and Cultivator Cave; reused the custom badge and existing Library Help, added optional page context and responsive Search, retained page commands below the row, and added focused slot/mobile/keyboard previews and tests. Bottom navigation, locked captures and source-comparison dates are unchanged.

- **2026-09-08:** Updated source repositories; captured current Main Library and Story Seed shells with separate responsive documents, local adapters and assets, explicit content boundaries, source provenance, dependency guards, and ownership/overlap documentation. No redesign or shared extraction.
- **2026-09-08:** Applied capture-only accessibility and sticky-action corrections, narrowed the DAO adapter contract, localized the exact source-requested font payloads, and retained the production sources unchanged.

- **2026-09-08:** Built the Development header family from merged PR #182: shared foundation, separate Main Library and Workspace compositions, three local configurations, tablet previews, header accessibility, and explicit host contracts. Both references and active product/navigation implementations remain unchanged.

- **2026-09-08:** Integrated active Development Story Seed and Cultivator Cave in PR #184, extracted feature-configured workspace navigation and settings-sheet mechanics, and replaced header-only fixtures with real Development consumers. Main Library remains a host-adapted preview. No recapture or source comparison was performed.

- **2026-09-09:** Device review fixes: the header's action group no longer shrinks, so the primary action's button can never be squeezed below its 44px touch target and paint on top of the overflow trigger on a narrow phone; the identity floor is sized per breakpoint to keep a 320px row fitting. The overflow menu paints on an opaque bordered surface instead of glass, so page text no longer reads through the menu items.

- **2026-09-09:** Migrated Story Seed and the Cultivator Cave onto the canonical `SEIAppHeader` and `SEIAppShell` from UI commit `42961e48e78ee816f9c2801a37a7f66af8aa2ae2`, with the compact `LibraryHeaderBadge` keeping the Library identity. Removed the custom `HeaderFoundation` and the old `WorkspaceHeader` visual implementation; the Main Library homepage header is unchanged on its own scoped surface. Reconciled the sidebar breakpoint so phones and tablets keep the drawer and bottom controls, gave both workspaces one narrow full-height rail, and added safe-area, reduced-motion and per-viewport verification controls to the preview. Locked captures and their source-comparison dates are unchanged; the recorded dependency hashes for the UI tarballs and the two presentation contract files were re-recorded for this deliberate upgrade.

- **2026-09-09:** Preserved full page titles with responsive width allocation, modest phone typography and a Help/Search overflow below 480px. Current page badges retain their height and artwork; unusually long host titles wrap instead of clipping. Removed the private Cave duplicate Public View toolbar; Settings remains its owner. Verified current names at 320, 375, 390, 430 and desktop widths; locked references and source-comparison dates are unchanged.

- **2026-09-09:** Reconciled the capture manifest global stylesheet hash with already-merged Workshop navigation commit `926d2d6`. Its diff only changes Workshop home navigation selectors; captured product styles and all locked files remain unchanged.


## 2026-09-09 production sheet viewport fix

Fixed the shared Settings/Search sheet shifting half its width off-screen in production builds. CSS optimization lowered the mobile `translate: none` reset to `transform`, leaving the canonical dialog centering translation active. WorkspaceSheet now resets the original translation through responsive utilities, while desktop centering, dialog focus/scroll behavior and Settings state remain unchanged. Verify the production output with `node scripts/verifyWorkspaceSheet.browser.mjs` after `npm run build` and `npm run preview -- --port 4173`; dev-server-only testing does not catch this regression.

## Standalone Home foundation — 2026-09-09

The Library Shell Workshop entry now starts at Library (`state=library`). The new `?preview=light-novels-home` entry opens the existing Light-Novels homepage presentation, extracted from the verified source because this shell previously contained only a hero/content placeholder. Both use the existing responsive document and four-item navigation. Library and Discover retain the existing content-slot boundaries; Profile retains the real Cave preview. Home and Profile local state survive global navigation in the shared document. Header Search now distinguishes Home from Library. Programmatic content focus preserves the header's scroll position. See [Home ownership and transfer notes](../light-novels-home/README.md). Existing locked captures and their comparison dates are unchanged.

## 2026-09-20 — Active Story Seed capture host

The Development capture now mounts the existing `StoryCreationPreviewRuntime`,
so Story Seed receives its required repository and runtime provider. The
canonical full-flow browser verification remains `?preview=story-seed`. Locked
historical captures were not edited.

## 2026-09-20 — Floating Familiar on product pages

The Development document owns one Library Familiar across Home, Library, Discover,
and Profile, retaining drag position during in-document navigation. Creator mounts
the same companion in its document. Guest and original-home fixtures omit it.
Profile supplies committed selection/account changes; Energy uses the existing
server account client. The Workshop catalog and locked references have no global
pet. See [Familiar transfer notes](../familiar/README.md) for the single production
app-shell mount and preview-only fixture boundaries.

Minimized Familiars use the shared header's generic
`WorkspaceHeaderAccessoryProvider` slot for a callback button. The slot is
host-provided content and owns no Familiar or account state. Size and visibility
remain with the profile/app owners.

## The music note in the header — 2026-10-07

`HeaderSoundControl` puts the reader mixer's music note in the shell header, through `WorkspaceHeader`'s new `sound` slot just before Help and Search (a host can supply it once for every header with `WorkspaceHeaderSoundProvider`, below). On phones and tablets it floats above the bottom bar instead (see "The music note floats above the bar"). It reuses the audio player's own `ReaderMixerNote`: a tap mutes or unmutes all sound (the mixer's master switch, the same as the Reader's note). Hovering it with a mouse, holding it about half a second with a finger, or ArrowUp/ArrowDown from the keyboard opens a **Music volume** slider bound to the Soundscapes level; it closes when the mouse leaves (after a short grace), on a tap outside, or on Escape. Both are the reader's saved mix, shared with Reader Settings › Audio. Without a reader mixer it renders nothing. The host shows it only while the reader's **Menu music** setting (`useMenuMusic`, `src/library/sound/menuMusic.ts`, kept in the host's reader preferences under `menu-music`, on by default) is on; Profile Settings › Sound changes that setting. Every header in NovelExpanded (Home, World Info and Story Seed) and the Workshop's Profile header carry it. The Library package now names `@seihouse/audio-player` as a peer, as SEN already does.

## The music note floats above the bar — 2026-10-07

On phones and tablets the Library's music note leaves the header. Wherever a
Library bottom bar is on screen (main mode's strip below 1024px, or at every width
with the `strip` setting; a workspace's task bar below 1024px), `WorkspaceHeader`
places its `sound` (its own, or the host's from `WorkspaceHeaderSoundProvider`) in a
spot `LibraryNavigation` keeps just above the bar's right end: 8px above the bar,
16px from the screen's edge (more with a safe area), following the bar's measured
height. That is the Reader's technique: its ghost note floats above the right end
of its Listen bar. Floating, the note is the same ghost note, faint while the page
scrolls and clear when it is still, touched or focused; a soft shadow keeps it
readable over pictures, and its Music volume opens upward, above it. On laptops the
sidebar or the rail replaces the bar and the note sits in the header, before Help
and Search, as before. One note shows at a time. A header outside Library
navigation keeps its note in the header. `useLibraryBottomBar()` tells a surface
whether a bottom bar is on screen; `useLibrarySoundSlot()` is the header's placement.

## NovelExpanded on the shell — 2026-10-07

NovelExpanded (`/app/`) is the shell's first host outside the Workshop
(`src/novel-expanded/AppShell.tsx`). Its Home and each story's World Info sit in
`WorkspaceShell` with the Library header (NovelExpanded, the music note, Help and Search),
main-mode `LibraryNavigation` and `LibraryFooter`; Create is Story Seed in workspace mode;
the Reader stays outside. Four host-facing pieces made that possible without a second
navigation, header or footer:

- **`destinations` on `LibraryNavigation`.** A host lists the places it has built, in the
  Library's order; the strip and the Pathways sidebar show only those, and Settings, a
  Profile page, shows only beside Profile. NovelExpanded lists Home and Create, so Discover
  and Profile join when their pages do. Omitted, all four show, as in the Workshop.
- **`WorkspaceHeaderSoundProvider`.** The host's sound control for every Library header
  beneath it, including headers a Library page draws itself (Story Seed's). A header's
  own `sound` wins; `sound={null}` leaves it out. It floats above the bottom bar on
  phones and tablets like any header's note (above).
- **`useStoredLibrarySidebarMode(storage)`.** The Pathways sidebar's open or minimized
  choice in the host's device preferences (`library-sidebar-mode`), for
  `LibraryDesktopNavigationProvider`; open when nothing readable is saved.
- **`useLibraryLegalDocuments()`.** Terms, Privacy and Cookies for a host without hosted
  pages: each opens the Library's draft document in `LibraryLegalSheet`. `MainLibraryFooter`
  now uses the same helper; its behavior is unchanged.

Library's `StoryPages` takes a `frame` for World Info, so a host can put World Info inside
its shell while the Reader, rendered by the same mounted `StoryPages`, stays outside it.
The Workshop's Library preview is unchanged and keeps all four places.


## The app's places and the Familiar above the bar — 2026-10-07

NovelExpanded brought the Profile in, and with it the Cave, which draws its own
`LibraryNavigation`. So the host's places now reach every Library navigation in a host
through `LibraryDestinationsProvider`, a page's own included; a navigation's
`destinations` still wins, and with neither all four places show. NovelExpanded lists
Home, Create and Profile, so Settings shows beside Profile (the Pathways sidebar's
foot on laptops); Discover joins when its page does.

The floating Familiar and the floating music note share the bottom-right corner of a
phone. `useLibraryBottomClearance()` is how far up from the screen's bottom the Library's
own bottom chrome reaches: the bar on screen (its safe area included) and, while the
note floats, the note above it. It is 0 when no bar is on screen, as on laptops.
`LibraryNavigation` measures it from the bar and the note's spot as they change. A host
passes it, plus a small gap, as the Familiar's `bottomInset`: the Familiar then starts
just above the note and can be dragged anywhere above that line. NovelExpanded and the
Workshop's Familiar surfaces both do.
