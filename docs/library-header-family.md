# Library header family

Current behavior checked against `WorkspaceHeader.tsx`, `WorkspaceHeaderUtilities.tsx`,
`WorkspaceShell.tsx` and their Library navigation consumers on 2026-10-26. This is the
Library's presentation layer, not a direction to connect old systems to NovelExpanded.

## Current composition

`WorkspaceHeader` is a Library adapter over the canonical `SEIAppHeader` and `SEIToolbar`.
The identity slot renders the canonical `NovelExpandedLogo` wordmark directly without a
page-specific header badge (or renders host-supplied `identity` when passed). Page titles
and subtitles live on the page itself below the header. An optional Back button occupies
the branding slot. Home links preserve native modified-click behavior; the host may
intercept an ordinary click for local navigation.

The actions row follows the order `Logo | Insights | Familiar | Preferences | Search`,
containing optional page context, the host-provided persistent accessory (Familiar),
Preferences and Search. Centered header content (`center` or `WorkspaceHeaderCenterProvider`,
such as Dao Insights) sits between the logo and the right-hand actions at every width when
`centerBreakpoint="always"` (the provider's default) or when the laptop Pathways sidebar is
active.

Commands and status supplied by a page appear in the toolbar below the identity row;
there is no empty toolbar when neither is present. Search merges page destinations and
commands by ID, preferring explicitly supplied search items. It filters labels and
descriptions in a modal, keeps disabled/loading commands unavailable and closes before
calling the host action. It is local navigation search, not a remote story-search service.
Preferences opens a compact popover card containing the Preferred Language selector (which
updates both interface and reading language immediately) and a compact Help button at the
bottom of the card that opens the host callback or the lazy-loaded Library Help menu,
retaining its written guidance and audio owner. Header utilities own transient overlay
state only.

## Owners and inputs

| Owner / input | Responsibility |
| --- | --- |
| `SEIAppHeader`, `SEIAppShell`, `SEIToolbar`, `SEIDialog` | Canonical layout, scrolling frame, toolbar and dialog behavior |
| `WorkspaceHeader` | Library identity and action composition (`Logo \| Insights \| Familiar \| Preferences \| Search`); no routing, story or storage logic |
| `title`, `identity`, `emblem`, `home`, `back` | Host-provided accessible header label, logo identity and navigation callbacks (`subtitle` and `emblem.src` are deprecated) |
| `contextualItem`, `center`, `WorkspaceHeaderCenterProvider` | Optional page context and centered header content (such as Dao Insights at every width across tabs) |
| `WorkspaceHeaderAccessoryProvider` | Host-owned persistent actions (Familiar) shared across headers |
| `preferences`, `WorkspaceHeaderPreferencesProvider` | Preferred Language state and immediate update callback for the compact Preferences card; explicit `preferences` prop wins over the provider |
| `sound`, `WorkspaceHeaderSoundProvider` | The host's sound control (the music note) before Preferences and Search on laptops; while a Library bottom bar is on screen (phones and tablets) it floats just above the bar's right end instead. The provider gives it to every header beneath it, Story Seed's included |
| `searchItems`, page commands, `help`, `status` | Existing page destinations, eligibility, Help action (rendered inside the Preferences card) and status |
| `landmark` | `banner` alone, `none` when `WorkspaceShell` supplies the banner |
| `WorkspaceShell` | Fixed frame, scrolling main region, desktop rail and remembered sidebar width |
| Feature adapters | Page state, data, eligibility and side effects |

The header uses canonical touch targets, focus behavior and safe areas. Search uses the
shared sheet/dialog's focus containment, Escape restoration and scroll lock. The main
region scrolls inside the shell while its header and desktop rail stay in place. Global
navigation clearance belongs to the main region, not measured sticky offsets.

## Consumers and boundaries

Home, Story Seed and Cultivator Cave reuse the header family, and so do NovelExpanded's
Home, World Info and Create, with the music note, centered Dao Insights and Preferences state supplied once by the app. Story Seed has no duplicate
header command row: Save Draft, Manifest and status live in its content action row;
Story Bank and Settings use workspace navigation and Search. Its logo returns to Home.
The Cave retains Settings and its existing public Exit; the redundant private toolbar
is gone. Hosts keep all existing callbacks, loading states and disabled reasons.

SEN remains independent of Library and Library UI. `MainLibraryHeader` and first-party
shell adapters are Library owners. Older Reader and Codex implementations remain outside
this shell and are kept for their remakes. Historical references and capture provenance
are retained, never refreshed. The retired capture-check script is not a current check.

## Inspection and validation

Use `?preview=library-shell`, Development, and Main Library, Story Seed, Cultivator Cave
or Header slot states. Direct fixtures include
`/library-shell.html?variant=development&source=header-states&state=context-present`
and `state=context-absent` or `state=long-context`; the existing source routes remain.

`WorkspaceHeader.test.tsx` and `WorkspaceHeaderActions.test.tsx` check optional content,
actions, Preferences, Help, filtering and focus. `scripts/verifyLibraryHeader.mjs` provides browser
checks. [Earlier verification evidence](history/library-top-navigation-validation.md)
is historical; use current tests and package-boundary checks for today's graph.
Workshop routing, mocks, manifests and controls stay outside package consumers.

## History

- **2026-09-09:** Home, Story Seed and Cave adopted the shared header family with optional context, Help, Search and existing page actions.
- **2026-09-27:** Story Seed commands moved into its content action row and workspace navigation; browsing screens adopted the fixed shell frame.
- **2026-09-28:** Home gained centered Dao Insights while the laptop Pathways sidebar is showing.
- **2026-10-06:** Rewrote the body from current code and folded dated notes into this history. No behavior changed.
- **2026-10-07 (later):** On phones and tablets a header's music note floats just above the bottom bar's right end, as the Reader's note does above its Listen bar; on laptops it stays in the header.
- **2026-10-07:** `WorkspaceHeaderSoundProvider` lets a host put its music note in every header once; NovelExpanded's Home, World Info and Create use it.
- **2026-10-26:** Simplified and stabilized the Library header across pages (`Logo | Insights | Familiar | Preferences | Search`). Removed header badges (`LibraryHeaderBadge`) from the header row and moved page titles (`Story Seed`, `Profile`) to the top of their pages below the header. Replaced the header `Help` button with `Preferences`, which opens a compact card with an immediate `Preferred Language` selector (updating both interface and reading language) and a `Help` link at the bottom. Added `WorkspaceHeaderCenterProvider` and `WorkspaceHeaderPreferencesProvider` so the header stays unchanged across bottom navigation tabs.
