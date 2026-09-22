# Library Shell

- **Source repositories:** `SENSEIDUKES/Light-Novels`, `SENSEIDUKES/development`; UI dependencies from `SENSEIDUKES/UI`.
- **Source locations:** Light-Novels `src/components/GlobalHeader.tsx` (`GlobalHeader`), `src/components/DaoInsights.tsx` (`DaoInsights`), and the collection navigation in `src/components/LibraryScreen.tsx` (`LibraryScreen`). Development `src/components/story-seed/development/CreationModal.tsx` (`CreationModal`), `StorySeedHeader.tsx`, `StorySeedSelector.tsx`, `StorySeedMobileNavigation.tsx`, and `StorySeedSettings.tsx`.
- **Workshop preview:** `?preview=library-shell`
- **Replica created:** 2026-09-08
- **Last Workshop update:** 2026-09-22
- **Last source comparison:** 2026-09-08
- **Replica status:** under refinement; locked captures plus Development workspaces on the canonical `SEIAppHeader` and `SEIAppShell`.

## Top navigation update

Development now uses Logo — existing Library Header Badge — optional contextual item — Help — Search. The public Cave supplies Public View; Dao Insights is Home content rather than a header item. Help reuses the original Library Help menu and Search finds host destinations/actions. Help and Search are two separate controls at every width, each keeping its own 44px target; neither is ever folded into a "…" menu. Pages that still supply header commands keep the shared toolbar below the top row; Story Seed no longer does — it owns its Save Draft, Manifest and status row inside its own content. See [the header contract](../../../docs/library-header-family.md) and its focused Header slot states preview.

## Bottom navigation update — 2026-09-11

`LibraryNavigation` now owns Home — Library — Discover — Profile, active-route matching, content clearance and safe-area spacing. Its active Development scrubber uses the supplied official SEN Home, Book, Discovery, and Profile icons. The shared navigation/header layer also supplies the official Settings and Exit marks to active consumer controls. The global Section control and drawer were removed on 2026-09-09 at user request; page destinations remain in top Search. Page definitions still supply the Cave’s existing desktop rail. `MainLibraryNavigation` adapts the existing LibraryScreen collections and routes. Story Seed keeps its current navigation, including Sections; Reader/Reader Codex are immersive exclusions. No page content, cards or internal controls were redesigned. [Contracts, route mappings and transfer details](../../../docs/library-navigation.md).

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

## Capture boundary

The locked reference area records two existing systems for comparison. Its captures remain unchanged. The separate Development area now proves the shared header family and responsive navigation in the active Story Seed and Cultivator Cave; see [component contracts](../../../docs/library-header-family.md). Main Library was read at `4a3dd02b6640b2ec50d8d1d136e37fb808249ed2` and Story Seed at development `7e1302bd2d5c3205706ddb1362607abed6a850e6`; neither was re-read on 2026-09-09, so their source-comparison dates are unchanged. The vendored UI artifacts now come from UI commit `42961e48e78ee816f9c2801a37a7f66af8aa2ae2` (UI PR #60), which adds `SEIAppHeader`, `SEIAppShell` and the compact `LibraryHeaderBadge` presentation.

`reference/main-library/` freezes the global header, DAO presentation and animation logic, production theme stylesheet, and the exact collection-tab fragment that displays sync state. It localizes the source font payloads so external network and CSP changes cannot alter the captured layout. `reference/story-seed/` freezes the current shell components, section model, settings body, supporting pure helpers, and CSS. `StorySeedShell.tsx` copies the shell JSX from `CreationModal`; its domain editor, Story Bank, and Help children are explicit host slots. This capture is distinct from the older locked reference inside the existing Story Seed Workshop.

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
| Presentation packages | UI owns `@seihouse/ui@0.4.0` and stateless `@seihouse/library-ui@0.5.0`; development's `LibraryPresentationProvider` supplies branded implementations and host asset slots to SEN contracts | `@seihouse/library/shell` owns navigation behavior. Library may depend on SEN; SEN must not depend on Library or Library UI. |

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

Nothing in this PR is transferred back automatically. Light-Novels and locked references are unchanged; active Development Story Seed and Cultivator Cave now consume the header family. The source components named above remain their production owners.

For an eventual approved change, identify the owning lane first. The footer would transfer `LibraryFooter.tsx`, `LibraryFooterSocialIcons.tsx`, `library-footer.css` and `MainLibraryFooter.tsx` to replace the footer block in Light-Novels `src/App.tsx`, with the host supplying its router callback, Help opener, social URLs and legal pages. Main header/DAO changes would target Light-Novels `src/components/GlobalHeader.tsx`, `src/components/DaoInsights.tsx`, relevant `src/index.css` rules, and only if needed the collection fragment in `src/components/LibraryScreen.tsx`. Story Seed changes would target its existing development header, selector, mobile navigation, settings, `CreationModal` integration, and `story-seed.css`, then ship through the established SEN package and Library host presentation adapter. Shared visual primitives would be changed in UI, published/packed first, then consumed by the hosts. Do not copy the frame HTML, Workshop wrappers, mock context, fixture data, content slots, or capture manifest into a production application.

## Workshop history

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
