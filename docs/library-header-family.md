# Library header family

Current behavior checked against `WorkspaceHeader.tsx`, `WorkspaceHeaderUtilities.tsx`,
`WorkspaceHeaderProfile.tsx`, `WorkspaceShell.tsx` and their Library navigation consumers on
2026-10-30. This is the Library's presentation layer, not a direction to connect old systems
to NovelExpanded.

## Current composition

`WorkspaceHeader` is a Library adapter over the canonical `SEIAppHeader` and `SEIToolbar`.
The identity slot renders the canonical `NovelExpandedLogo` wordmark directly without a
page-specific header badge (or renders host-supplied `identity` when passed). Page titles
and subtitles live on the page itself below the header. An optional Back button occupies
the branding slot. Home links preserve native modified-click behavior; the host may
intercept an ordinary click for local navigation.

The row reads `Logo | Search | Familiar | Sound | Profile Portrait` at every width. The
logo and the Portrait keep their width; the actions take the rest of the row:

- **Search** (`WorkspaceHeaderSearch`) is a wide field-style trigger right after the logo,
  "Search for stories" with a thin glowing underline, that grows to fill whatever the
  other controls leave. Below 6rem of room its words step aside for the glass and the
  magnifier. It opens the Search sheet on a tap, click, Enter or Space, never on focus.
- Optional page context (`contextualItem`, the public Cave's Public View) follows Search.
- The host-provided persistent accessory (the Familiar's recall) follows.
- The host's sound control (the music note) sits here on laptops; while a Library bottom
  bar is on screen (phones and tablets) it floats just above the bar's right end instead.
- The **Profile Portrait** (`WorkspaceHeaderProfileMenu`, in `SEIAppHeader`'s profile
  slot) is a 44px avatar: the reader's picture, or their initial, from the host's
  `WorkspaceHeaderProfileProvider`; a profile glyph without one. It opens one menu (a
  disclosure, not a link): the reader's name and rank, **Sign in**, Your profile and
  Settings when the host supplies them, then Preferred Language (which updates both
  interface and reading language immediately), Menu music when the host supplies it,
  and Help, which opens the host callback or the lazy-loaded Library Help menu. The menu
  is drawn inside the page's Library look, beside whatever opened it.

The header has no center slot. Sparks (formerly Dao Insights) lives where writers create:
the Creator Space and Story Seed's Origin.

Commands and status supplied by a page appear in the toolbar below the identity row;
there is no empty toolbar when neither is present. Search merges page destinations and
commands by ID, preferring explicitly supplied search items. It filters labels and
descriptions in a modal, keeps disabled/loading commands unavailable and closes before
calling the host action. It is local navigation search, not a remote story-search service.
Header utilities own transient overlay state only.

## Owners and inputs

| Owner / input | Responsibility |
| --- | --- |
| `SEIAppHeader`, `SEIAppShell`, `SEIToolbar`, `SEIDialog`, `SEIAvatar` | Canonical layout, scrolling frame, toolbar, dialog and avatar behavior |
| `WorkspaceHeader` | Library identity and action composition (`Logo \| Search \| Familiar \| Sound \| Profile Portrait`); no routing, story or storage logic |
| `title`, `identity`, `emblem`, `home`, `back` | Host-provided accessible header label, logo identity and navigation callbacks (`subtitle` and `emblem.src` are deprecated) |
| `contextualItem` | Optional page context after Search |
| `WorkspaceHeaderAccessoryProvider` | Host-owned persistent actions (Familiar) shared across headers |
| `WorkspaceHeaderProfileProvider`, `useWorkspaceHeaderProfileMenu` | The host's reader (name, rank, picture), Sign in, profile and Settings destinations, and one menu state shared by every header and the sidebar's profile card |
| `preferences`, `WorkspaceHeaderPreferencesProvider` | Preferred Language and Menu music state with immediate update callbacks for the Portrait's menu; explicit `preferences` prop wins over the provider |
| `sound`, `WorkspaceHeaderSoundProvider` | The host's sound control (the music note) after the Familiar on laptops; while a Library bottom bar is on screen (phones and tablets) it floats just above the bar's right end instead. The provider gives it to every header beneath it, Story Seed's included |
| `searchItems`, page commands, `help`, `status` | Existing page destinations, eligibility, Help action (rendered inside the Portrait's menu) and status |
| `landmark` | `banner` alone, `none` when `WorkspaceShell` supplies the banner |
| `WorkspaceShell` | Fixed frame, scrolling main region, desktop rail and remembered sidebar width |
| Feature adapters | Page state, data, eligibility and side effects |

The header uses canonical touch targets, focus behavior and safe areas. Search uses the
shared sheet/dialog's focus containment, Escape restoration and scroll lock. The Portrait's
menu takes focus on open, closes on Escape (returning focus to whatever opened it), on
focus or a press outside it, and on a width change. The main region scrolls inside the
shell while its header and desktop rail stay in place. Global navigation clearance belongs
to the main region, not measured sticky offsets.

## Consumers and boundaries

Home, Story Seed and Cultivator Cave reuse the header family, and so do NovelExpanded's
Home, World Info and Create, with the music note, the reader behind the Profile Portrait
and Preferences state supplied once by the app. The laptop sidebar's reader card (the app's
and the Cave's) opens the Portrait's menu when a host supplies the profile. Story Seed has no duplicate
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

`WorkspaceHeader.test.tsx` and `WorkspaceHeaderActions.test.tsx` check the order, optional
content, actions, the Portrait's menu (with and without a host profile, from the sidebar
card), Help, filtering and focus. `scripts/verifyAppHeader.browser.mjs` checks the built
app's header geometry from 320px to 1440px, the Portrait's menu, Sign in and Sparks. `scripts/verifyLibraryHeader.mjs` provides browser
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
- **2026-10-30:** Redesigned the row as `Logo | Search | Familiar | Sound | Profile Portrait` (SENSEI). Search became a wide field after the logo; the Preferences gear became the Profile Portrait, whose menu holds the reader, Sign in (the sign-in screen, not connected yet), Your profile, Settings, the Preferences and Help; the sidebar's reader card opens the same menu. Removed the center slot and `WorkspaceHeaderCenterProvider`: Dao Insights, renamed Sparks, moved to the Creator Space and Story Seed's Origin.
