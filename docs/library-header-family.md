# Library header family

Updated 2026-09-09. Development Home, Story Seed and Cultivator Cave use one `WorkspaceHeader` over the existing `SEIAppHeader`. The existing `LibraryHeaderBadge mode="app-header"` supplies the logo and custom plaque through `LibraryPresentationProvider`. UI packages and their pinned artifacts are unchanged.

## Top navigation contract

The top row is **Logo — Library Header Badge — optional page context — Help — Search**. `contextualItem` is an optional page-supplied React node: Home passes Dao Insights; the public Cave passes Public View. A missing item consumes no slot or placeholder. The identity yields width before the fixed Help and Search controls. Long badge text truncates; the row height and trailing controls remain stable. Pages should supply a compact contextual emblem with its full accessible name on phones.

Search is the far-right control at every width. Below 640px it is an emblem; desktop also displays its label. It opens the existing `WorkspaceSheet` / canonical `SEIDialog` with a labeled search field and a filtered list of host-provided destinations and actions. Filtering uses labels and descriptions, ignores case and surrounding whitespace, announces the result count or no results, and resets on reopening. Disabled/loading commands stay unavailable. Selection closes the modal before invoking the existing host callback, allowing the host to open a dialog or navigate without competing focus traps. This is navigation search; no Library story index or remote search service is introduced.

Help is the small `?` emblem. It opens the existing `LibraryHelpMenu`, including the original topic data, written guidance, filtering, and optional spoken lines. The default menu is loaded on demand and portaled out of the header so the header's blur cannot constrain its overlay. Hosts provide the existing `DevAudioPlaybackProvider` / narrative audio provider, just as for Story Seed Help. Story Seed passes its existing Help callback and preload/expanded state so its header and unchanged bottom Help entry still open the same experience. No help text or audio mapping was rewritten.

Page commands remain available in the existing shared button/overflow controls, composed in `SEIToolbar` immediately below the top row. Save, Manifest, Settings, Story Bank and Cave actions keep their original callbacks, disabled/loading states and responsive overflow behavior. Home's previous Command Hub destinations and descriptions are retained in Search, including profile/Celestial Tools, Shortcut Spells, conditional active-story commands, and disabled companion realms. Dao Insights keeps its existing modal and provider/clipboard adapters.

Bottom navigation, page content, existing Help content, reference replicas, data contracts and production repositories are outside this change.

## Ownership and inputs

| Owner / input | Responsibility |
| --- | --- |
| `SEIAppHeader`, `SEIAppShell`, `SEIToolbar`, `SEIDialog` | Canonical layout and dialog primitives |
| `WorkspaceHeader` | Composes badge, optional context, Help, Search and the existing page commands |
| `title`, `subtitle`, `emblem`, `home`, `back` | Existing badge identity and navigation contracts; modified home clicks retain native link behavior |
| `contextualItem` | Optional page-supplied node; no domain behavior in the slot |
| `searchItems: readonly HeaderSearchItem[]` | Existing host destinations with stable IDs, labels, optional descriptions and callbacks |
| `help?: HeaderAction` | Optional existing page Help owner; otherwise the Library Help menu is reused |
| `primaryAction`, `secondaryActions`, `overflowActions`, `status` | Existing host commands/status, in the page toolbar; commands also participate in Search |
| `landmark` | `banner` when standalone, `none` inside `WorkspaceShell` to avoid nested banners |
| `WorkspaceHeaderUtilities` | Transient overlay/query state and presentation; no store, routing or remote data access |
| `WorkspaceShell` | Uses `SEIAppShell`, retains the 1024px rail breakpoint, measures the complete header for the rail's sticky offset |
| Feature adapters | Continue to own eligibility, page state, content, navigation and side effects |

`HeaderSearchItem` extends the existing `HeaderAction` with an optional description. IDs must be unique. Header commands are merged into search items by ID; an explicitly supplied search item takes precedence. SEN continues to use the narrative presentation contract and never imports Library UI. Home's `MainLibraryHeader` stays in the Library composition and is not exported through SEN.

The header supplies 44px touch targets and visible focus rings. Search uses the canonical modal's initial focus, Tab containment, Escape, scroll lock and final focus; the reused Help menu retains its own focus handling. Safe areas come from the canonical header and shared sheet. `WorkspaceShell` observes the actual header height so a page toolbar, text sizing or safe-area change cannot leave the desktop rail under the header. Reduced motion retains the existing behavior.

## Previews and validation

Use `?preview=library-shell`, choose **Development**, and select Main Library, Story Seed, Cultivator Cave or **Header slot states**. The latter has present, absent and long-context fixtures. Preview controls include 320px, 390px, tablet, desktop and landscape sizes, simulated notches, reduced motion, and a public Cave toggle. Help and Search are opened with their real controls in every configuration.

Direct routes:

- `/library-shell.html?variant=development&source=header-states&state=context-present`
- `/library-shell.html?variant=development&source=header-states&state=context-absent`
- `/library-shell.html?variant=development&source=header-states&state=long-context`
- `/library-shell.html?variant=development&source=main-library&state=linked`
- `/library-shell.html?variant=development&source=story-seed&state=filled-intake`
- `/library-shell.html?variant=development&source=cultivator-cave&state=developed-cultivator&cave=/public/home`

`WorkspaceHeader.test.tsx` and `WorkspaceHeaderActions.test.tsx` cover composition, optional content, Help reuse, filtering, disabled commands, callback dispatch and focus. `scripts/verifyLibraryHeader.mjs` is the browser verification function; run it with the Browser skill's established `tab`, `viewport` and local `baseUrl` handles. It launches no second browser. It asserts responsive geometry across 15 fixtures, keyboard order, modal Tab containment, Escape return, guidance preservation and landscape safe areas. See [current verification evidence](library-top-navigation-validation.md).

The capture guard still hashes every locked capture, dependency and font. Its live Story Seed import prohibition is scoped to frozen captures and their shared adapters; active Development code intentionally reuses the existing Library Help implementation. Package-boundary checks cover the active graph.

## Transfer inventory

For an approved future transfer, include `WorkspaceHeader.tsx`, `WorkspaceHeaderUtilities.tsx`, `WorkspaceHeaderActions.tsx`, `WorkspaceShell.tsx`, `WorkspaceSheet.tsx`, `workspaceMedia.ts`, their adjacent styles, and the existing narrative presentation/audio providers and `LibraryHelpMenu` dependency. Home additionally uses `MainLibraryHeader.tsx`, `main-library/GlobalHeader.tsx`, the unchanged Dao content with its compact trigger styles, and `shared/MainLibraryAdapter.tsx`. Story Seed and Cave retain their own adapters. The current UI/Library UI packages already provide the required primitives.

Keep iframe routing, preview fixtures, `header-theme.css`, Workshop controls, tests, capture manifests and documentation out of runtime transfers. No production integration or package publication is part of this change.
