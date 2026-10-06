# Library header family

Current behavior checked against `WorkspaceHeader.tsx`, `WorkspaceHeaderUtilities.tsx`,
`WorkspaceShell.tsx` and their Library navigation consumers on 2026-10-06. This is the
Library's presentation layer, not a direction to connect old systems to NovelExpanded.

## Current composition

`WorkspaceHeader` is a Library adapter over the canonical `SEIAppHeader` and `SEIToolbar`.
The Library badge supplies emblem, title and subtitle through the narrative presentation
provider. An optional Back button occupies the branding slot. Home links preserve native
modified-click behavior; the host may intercept an ordinary click for local navigation.

The actions row contains optional page context, the host-provided persistent accessory,
Help and Search. On laptops with the Pathways sidebar showing, optional `center` content
sits between identity and utilities; Home puts Dao Insights there. The centered slot is
absent with the strip setting or without supplied content. On narrower layouts, the
page's existing placement handles that content.

Commands and status supplied by a page appear in the toolbar below the identity row;
there is no empty toolbar when neither is present. Search merges page destinations and
commands by ID, preferring explicitly supplied search items. It filters labels and
descriptions in a modal, keeps disabled/loading commands unavailable and closes before
calling the host action. It is local navigation search, not a remote story-search service.
Help uses the host callback or the existing lazy-loaded Library Help menu, retaining its
written guidance and audio owner. Header utilities own transient overlay state only.

## Owners and inputs

| Owner / input | Responsibility |
| --- | --- |
| `SEIAppHeader`, `SEIAppShell`, `SEIToolbar`, `SEIDialog` | Canonical layout, scrolling frame, toolbar and dialog behavior |
| `WorkspaceHeader` | Library identity and action composition; no routing, story or storage logic |
| `title`, `subtitle`, `emblem`, `home`, `back` | Host-provided identity and navigation callbacks |
| `contextualItem`, `center` | Optional page content, including desktop Dao Insights |
| `WorkspaceHeaderAccessoryProvider` | Host-owned persistent actions shared across headers |
| `searchItems`, page commands, `help`, `status` | Existing page destinations, eligibility, Help and status |
| `landmark` | `banner` alone, `none` when `WorkspaceShell` supplies the banner |
| `WorkspaceShell` | Fixed frame, scrolling main region, desktop rail and remembered sidebar width |
| Feature adapters | Page state, data, eligibility and side effects |

The header uses canonical touch targets, focus behavior and safe areas. Search uses the
shared sheet/dialog's focus containment, Escape restoration and scroll lock. The main
region scrolls inside the shell while its header and desktop rail stay in place. Global
navigation clearance belongs to the main region, not measured sticky offsets.

## Consumers and boundaries

Home, Story Seed and Cultivator Cave reuse the header family. Story Seed has no duplicate
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
actions, Help, filtering and focus. `scripts/verifyLibraryHeader.mjs` provides browser
checks. [Earlier verification evidence](history/library-top-navigation-validation.md)
is historical; use current tests and package-boundary checks for today's graph.
Workshop routing, mocks, manifests and controls stay outside package consumers.

## History

- **2026-09-09:** Home, Story Seed and Cave adopted the shared header family with optional context, Help, Search and existing page actions.
- **2026-09-27:** Story Seed commands moved into its content action row and workspace navigation; browsing screens adopted the fixed shell frame.
- **2026-09-28:** Home gained centered Dao Insights while the laptop Pathways sidebar is showing.
- **2026-10-06:** Rewrote the body from current code and folded dated notes into this history. No behavior changed.
