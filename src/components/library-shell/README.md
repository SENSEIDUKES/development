# Library Shell

- **Source repositories:** `SENSEIDUKES/Light-Novels`, `SENSEIDUKES/development`; UI dependencies from `SENSEIDUKES/UI`.
- **Source locations:** Light-Novels `src/components/GlobalHeader.tsx` (`GlobalHeader`), `src/components/DaoInsights.tsx` (`DaoInsights`), and the collection navigation in `src/components/LibraryScreen.tsx` (`LibraryScreen`). Development `src/components/story-seed/development/CreationModal.tsx` (`CreationModal`), `StorySeedHeader.tsx`, `StorySeedSelector.tsx`, `StorySeedMobileNavigation.tsx`, and `StorySeedSettings.tsx`.
- **Workshop preview:** `?preview=library-shell`
- **Replica created:** 2026-09-08
- **Last Workshop update:** 2026-09-08
- **Last source comparison:** 2026-09-08
- **Replica status:** faithful shell capture; locked baseline, no refinement candidate.

## Capture boundary

This area records two existing systems for comparison. It does not define a new product shell, redesign either source, extract shared components, or modify the active Story Seed. Main Library was read at `4a3dd02b6640b2ec50d8d1d136e37fb808249ed2`, Story Seed at development `7e1302bd2d5c3205706ddb1362607abed6a850e6`, and UI at `6856594171546fee1a243e1dc3422fcb952c5022`, after updating all three repositories from their remotes.

`reference/main-library/` freezes the global header, DAO presentation and animation logic, production theme stylesheet, and the exact collection-tab fragment that displays sync state. It localizes the source font payloads so external network and CSP changes cannot alter the captured layout. `reference/story-seed/` freezes the current shell components, section model, settings body, supporting pure helpers, and CSS. `StorySeedShell.tsx` copies the shell JSX from `CreationModal`; its domain editor, Story Bank, and Help children are explicit host slots. This capture is distinct from the older locked reference inside the existing Story Seed Workshop.

`development/LibraryShell.ts` points at these baselines. Original Reference, Development, and Compare therefore show the same captured implementations. No future design has been implied by the Development label. A later authorized refinement can fork its files there; the locked capture must remain unchanged.

## Inspect the references

Use Workshop Controls → Pages to select Main Library or Story Seed, Phone (390 × 844) or Desktop (1440 × 900), and a mock state. Desktop frames retain their actual viewport width and can be scrolled horizontally on smaller hosts. The **Open responsive capture at browser width** link is the appropriate route for inspecting 320px phones, tablets, landscape, or native browser resizing.

| Reference | Phone preview | Desktop preview |
| --- | --- | --- |
| Main Library | `?preview=library-shell&source=main-library&device=phone` | `?preview=library-shell&source=main-library&device=desktop` |
| Story Seed | `?preview=library-shell&source=story-seed&device=phone` | `?preview=library-shell&source=story-seed&device=desktop` |

The internal frame route is `/library-shell.html?source=main-library&state=linked` or `/library-shell.html?source=story-seed&state=filled`. It is a second Vite HTML entry, not a second Workshop feature or homepage card. Separate documents preserve source theme differences, viewport media queries, body portals, scroll locking, safe-area CSS, and overlay stacking in Compare mode.

| Source | Available mock states |
| --- | --- |
| Main Library | Linked account, guest, syncing, offline/pending sync, profile active, active story, long account name, missing profile record, local DAO, failed DAO response |
| Story Seed | Empty required fields, filled requirements, long equipped title, saved feedback, generating, VERSA drafting, error |

Additional states are exercised through the original controls: open/close Command Hub and DAO overlay, choose DAO categories, seek and copy wisdom, open Profile, select global destinations, open the mobile section drawer, choose all seven sections, toggle Story Bank/Help, open desktop/mobile Settings, change Rated 18+ and Fate Survival, select visibility/pressure, save, and manifest. Saving lasts 2.5 seconds as in the source; simulated manifesting lasts 1.5 seconds and reports the Blueprint destination. Refresh resets all fixture state.

## Ownership and dependencies

| Responsibility | Current owner and dependencies | Future sharing assessment |
| --- | --- | --- |
| Main Library identity and home entry | Light-Novels `GlobalHeader`; emblem, typography, press-and-hold Celestial glow, responsive title visibility | Branding and home routing remain Library-owned. A common identity container could eventually use existing Library UI primitives. |
| Profile/cloud entry | `GlobalHeader` reads authentication and profile state from `useAppStore`; click routes to `profile` for linked users and guests | Account identity, tiers, and authentication belong to the host. Workspaces should receive host callbacks and display data rather than importing its store. |
| Global Command Hub | `GlobalHeader`; local disclosure state, outside pointer/Escape dismissal, global screen navigation, optional active-tome commands | Global destinations, companion realms, tiers, and account summaries remain Main Library-specific. Do not turn these into workspace section navigation. |
| DAO Insights | `DaoInsights`; static quotes, 14-second rotation, category filtering, portal, clipboard, configuration check and `/api/dao-insight` in production | Library service and first-party content. A generic popover/dialog primitive may be shared; the DAO service does not belong to SEN. |
| Library sync | `LibraryScreen` collection strip reads `syncStatus`, collection count, and tab selection | Sync truth belongs to the host's storage/synchronization systems. A presentational status slot is a candidate; no second sync store. |
| Story Seed identity and desktop utilities | `StorySeedHeader`; badge, Save Draft, Settings, Story Bank, Help | Existing badge/button/panel primitives already belong to Library UI. Workspace action arrangement can be considered later, without making account/global navigation mandatory. |
| Desktop section navigation and mobile drawer | `StorySeedSelector` plus `seedSections`; required/completed state from `StorySeedInput`; equipped relic title supplied by the host | Drawer and panel primitives are already shared. Story/World families, seven sections, required inputs, and completion rules remain Story Seed-specific. |
| Mobile bottom controls and settings sheet | `StorySeedMobileNavigation`; local drawer/sheet state, focus restoration, Escape, body scroll lock, ResizeObserver, safe-area padding; Settings body shared with desktop | Overlay mechanics, bottom-navigation layout, and accessibility may be common workspace infrastructure. Action labels, Manifest eligibility, and settings fields remain domain-owned. |
| Settings and Manifest footer | `StorySeedSettings`, `seedState`, and `CreationModal`; maturity metadata, Fate Survival, granular Style/Genre/Premise gate, generation state | Workspace/domain semantics remain Story Seed-owned. Footer and button presentation already use common primitives. |
| Presentation packages | UI owns `@seihouse/ui@0.4.0` and `@seihouse/library-ui@0.4.0`; development's `LibraryPresentationProvider` supplies the branded implementations to SEN's presentation contracts | Continue this ownership. Library may depend on SEN; SEN must not depend on Library or Library UI. No exports were added to either package. |

### Overlaps that are not equivalent

Both shells show an emblem, navigation, actions, and status, but their lifecycles differ. Main Library is a global, sticky host header (`sm` identity expansion; `md` active-story/system commands). Story Seed is a page workspace with desktop actions and sidebar at `lg` (1024px), and a drawer/bottom-navigation combination below that breakpoint. Its settings sheet is bottom-anchored and capped at `100dvh - 3rem`; its Manifest footer is sticky on desktop and in flow on smaller screens. The host frame must not substitute container-width styling for these viewport rules.

The **cloud is not the sync spinner**. In current `GlobalHeader`, it is an animated Profile/Celestial Tools entry. `syncStatus` and `lastSavedTime` are read but do not render there. Syncing and pending/error dots render beside My Library in `LibraryScreen`. Likewise, Command Hub's **Online** label is current literal source copy and does not track connectivity; the offline fixture deliberately leaves it unchanged. `StorySeedSelector` has an old comment referring to a bottom Profile tab, but the current navigation has no such tab. The captured code preserves the source; this documentation records the actual behavior.

## Workshop adapters and excluded production dependencies

`shared/MainLibraryAdapter.tsx` defines the narrow context consumed by the copied header/DAO. `MainLibraryPreview.tsx` provides account/profile fixtures, a mock active story, sync values, screen callbacks, overlay destinations, and local DAO responses. Firebase imports, the production app store, storage, unused login routine, and unused audio import are omitted. Haptics stop at a documented no-op. DAO presentation still handles loading, rotation, filtering, copy feedback, and fallback; its two network calls use `requestDao` instead. No keys or provider configuration are copied.

`StorySeedPreview.tsx` owns only transient React fixture state. It passes the canonical type shape and updater contract into the captured shell without mounting `CreationModal`, the live Story Seed store, auth gate, repositories, generation pipelines, or persistence. Selecting a section exits the Story Bank fixture as in the original mobile integration. The emblem link retains its source markup and is intercepted at the preview boundary to report the local home destination.

Account linking, full Profile, collection contents, Story Bank, Help content, editor forms, Blueprint review, reader, and Codex destinations are clearly labeled mock content slots. Their domain implementations are not captured. This preserves the shell's dimensions, classes, breakpoints and interaction structure; **full-page pixel parity and content-dependent footer positions are not claimed**. The neutral fixture's height differs from a complete editor or library hero. The requested work ends at these shell boundaries.

The Library emblem, VERSA mark, and the source-requested Alegreya, Alegreya SC, Noto Serif, and Rubik font payloads are local copies under `public/library-shell/`. Story Seed retains `/favicon.jpg`. No production data, auth, generation, storage, sync, or media-service calls occur. No backend, API, schema, database, routing store, or auth system was added.

## Lock and provenance

`capture-manifest.json` records source commits, verified source paths, SHA-256 hashes of source text and each adapted capture, and dependency/asset hashes. Text hashes normalize CRLF to LF for Windows checkout compatibility. `node scripts/checkLibraryShellCapture.mjs` detects changes to the locked captures or their reused presentation dependencies and rejects accidental production data access or live Story Seed implementation imports. Run it alongside `npm run check:ui-artifacts` and `npm run check:package-boundaries`.

The capture reuses canonical presentation packages and type contracts rather than cloning shared UI or defining another schema. A dependency hash change requires an explicit source comparison and recapture decision; it must not silently change the baseline. The dependency list is a drift guard, not a new package or distribution mechanism.

## Validation

See [validation evidence](../../../docs/library-shell-validation.md) for the checked viewports, interactions, source comparisons, and exact limits of verification.

## Transfer guidance

Nothing in this PR is intended to be transferred back automatically. Light-Novels and the active Story Seed are unchanged. The source components named above remain their production owners.

For an eventual approved change, identify the owning lane first. Main header/DAO changes would target Light-Novels `src/components/GlobalHeader.tsx`, `src/components/DaoInsights.tsx`, relevant `src/index.css` rules, and only if needed the collection fragment in `src/components/LibraryScreen.tsx`. Story Seed changes would target its existing development header, selector, mobile navigation, settings, `CreationModal` integration, and `story-seed.css`, then ship through the established SEN package and Library host presentation adapter. Shared visual primitives would be changed in UI, published/packed first, then consumed by the hosts. Do not copy the frame HTML, Workshop wrappers, mock context, fixture data, content slots, or capture manifest into a production application.

## Workshop history

- **2026-09-08:** Updated source repositories; captured current Main Library and Story Seed shells with separate responsive documents, local adapters and assets, explicit content boundaries, source provenance, dependency guards, and ownership/overlap documentation. No redesign or shared extraction.
- **2026-09-08:** Applied capture-only accessibility and sticky-action corrections, narrowed the DAO adapter contract, localized the exact source-requested font payloads, and retained the production sources unchanged.
