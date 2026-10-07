# Library navigation architecture

Current behavior checked against `LibraryNavigation.tsx`, `MainLibraryNavigation.tsx`,
`libraryRoutes.ts` and `WorkspaceShell.tsx` on 2026-10-07. This describes the Library
Shell. NovelExpanded (`/app/`) uses it with its own places, Home, Create and Profile
(`src/novel-expanded/appPlaces.ts`): its Home and World Info in `AppShell.tsx`, and the
Library's Cave, which draws its own navigation, as its Profile. Discover is not connected
to it yet.

## Destinations

Main navigation is **Home — Create — Discover — Profile**. My Library is a Home
collection, not a global navigation entry. Re-selecting the current location is a no-op.

| Entry | Host destination | Related existing destinations |
| --- | --- | --- |
| Home | `screen: home`, `collection: featured` | Immortal Hub, My Library, Sects, Tiers |
| Create | `screen: creator-space` | Creator Space, Story Seed (`creator`), Seed Bank (Cave `/stories`) |
| Discover | `screen: home`, `collection: challenges` | Existing Fate Survival collection; no separate Discover screen |
| Profile | `screen: profile`, `cave: /home` | Cave pages, Seed Bank, Settings and public Exit |

A host lists the places it has built (`destinations`, all four when omitted); a place it
has not built is left out rather than shown dead, and Settings, a Profile page, shows
only beside Profile. `LibraryDestinationsProvider` gives that list to every Library
navigation beneath it, including one a Library page draws itself (the Cave's); a
navigation's own `destinations` wins. `MainLibraryNavigation` maps the existing routes and only supplies section actions that
exist. Hosts retain ownership of navigation, story data, account data and persistence.
Header Search and the footer expose existing page destinations; there is no global
Sections drawer. Unknown standard pages receive no falsely selected pathway.

## Responsive main navigation

Phones and tablets use the labelled bottom strip with safe-area spacing and content
clearance. From 1024px, the default is the Pathways sidebar: the host's reader picture,
name and rank, the four destinations, Settings and optional host artwork. The star
minimizes the open sidebar to its 72px icon rail; double click or double tap expands it.
Hover and focus do not change its width. `WorkspaceShell` applies one shared choice:
the host's controlled `sidebarMode` and `onSidebarModeChange`, or the visit's local state.
`LibraryDesktopNavigationProvider value="strip"` keeps the strip at every width.

While a bottom bar is on screen (the strip, or a workspace's task bar), a header's
music note floats just above the bar's right end instead of sitting in the header, as
the Reader's note floats above its Listen bar (`useLibraryBottomBar`,
`useLibrarySoundSlot`); on laptops it stays in the header.

A page's supplied sub-pages nest under its active pathway. The Cave supplies these;
`MainLibraryNavigation` omits Home, Create and Discover section menus in sidebar mode
because the page, Search and footer already expose them. With the strip setting, its
page-specific sections remain available. The fixed shell owns the scrolling main region
and rail; the page never draws a competing global bar.

## Focused workspaces and immersive routes

Story Seed uses workspace mode with a `LibraryWorkspaceDefinition`. The same shell draws
Sections, task tools (Story Bank and Settings) and Back on the task bar, a Sections drawer
on phones/tablets and an always-open Pathways-style rail on desktop. Selection closes the
drawer before its existing callback; reaching the desktop breakpoint closes an open drawer.
Story Seed supplies destinations and commands, not a second navigation system.

Reader and Codex routes use immersive mode and receive no global strip, even if a caller
requests standard mode. Their existing implementations remain untouched. Cave routes
`/home`, `/stories`, `/relics`, `/settings` and child/public routes keep their existing
owners. Public Exit retains its existing callback; Settings is not a fifth global entry.

## Inspection and validation

Use `?preview=library-shell`, Development, or the standalone
`/library-shell.html?variant=development&source=main-library&state=library` fixture.
The fixture state name `library` is retained; it is not today's navigation label.
Cave fixtures use `source=cultivator-cave`; Story Seed uses `source=story-seed`.
These adapters simulate existing routes and browser history, not production integration.

Focused tests cover order, selection, route no-ops, sidebar/strip behavior, workspace
controls and immersive exclusions. `scripts/verifyLibraryNavigation.mjs` exercises the
browser matrix. Historical results are in [the history folder](history/README.md), not
current readiness claims. Current package ownership and import boundaries remain enforced
by `check:ownership`, `check:package-boundaries` and `check:app`.

## History

- **2026-09-09:** Verified global navigation and Search; removed the global Sections control while retaining Story Seed's own Sections.
- **2026-09-26:** Create replaced Library in global navigation; My Library became a Home collection.
- **2026-09-27:** Unified main and workspace navigation; Story Seed supplies its focused task definition to the shell.
- **2026-09-28:** Added the laptop Pathways sidebar, remembered open/minimized choice and optional all-width strip setting.
- **2026-10-06:** Rewrote the body from current code and folded dated notes into this history. No behavior changed.
- **2026-10-07 (Profile):** `LibraryDestinationsProvider` carries a host's places into the Cave's own navigation; NovelExpanded shows Home, Create and Profile, with Settings. `useLibraryBottomClearance()` gives a host the height of the bar and the floating note, so its Familiar stays above them.
- **2026-10-07 (later):** The music note floats just above the bottom bar on phones and tablets.
- **2026-10-07:** Hosts list their places (`destinations`); Settings follows Profile. NovelExpanded shows Home and Create and remembers the sidebar choice on the device.
