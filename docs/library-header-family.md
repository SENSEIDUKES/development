# Library header family

Updated 2026-09-09. Status: Development Story Seed and Cultivator Cave now run on the canonical `SEIAppHeader` and `SEIAppShell` from `@seihouse/ui`, with the Library identity supplied by `LibraryHeaderBadge mode="app-header"` from `@seihouse/library-ui`. Nothing is published or transferred to Light-Novels. UI artifacts come from `SENSEIDUKES/UI` commit `42961e48e78ee816f9c2801a37a7f66af8aa2ae2` (UI PR #60); refresh them with `npm ci`, never `npm install`, per [`vendor/README.md`](../vendor/README.md). Locked captures and their source-comparison dates are unchanged; the recorded dependency hashes for the two UI tarballs and the two presentation contract files were re-recorded for this deliberate upgrade.

## Inspect

Open `?preview=library-shell`, select **Development**, then choose Main Library, Story Seed, or Cultivator Cave and Phone (390 × 844), Tablet (768 × 1024), or Desktop (1440 × 900). Compare uses independent iframe documents so themes, viewport rules and overlays remain isolated. Cultivator Cave has no locked capture; its Reference pane explains this rather than presenting a fabricated baseline.

Direct responsive routes:

- `/library-shell.html?variant=development&source=main-library&state=linked`
- `/library-shell.html?variant=development&source=story-seed&state=filled-intake`
- `/library-shell.html?variant=development&source=cultivator-cave&state=developed-cultivator`

Omit `variant=development` to open the original locked Main Library or Story Seed shell. The locked Story Seed reference retains its captured navigation. Development mounts the actual Story Seed and Cultivator Cave consumers, using their existing Workshop scenario adapters. Main Library retains its isolated host fixture.

## Ownership

| Layer | Owns | Must not own |
| --- | --- | --- |
| Canonical `@seihouse/ui`, `@seihouse/library-ui` | Existing buttons, panels, badge, typography, spectral surfaces and tokens | Page or account data |
| Canonical `SEIAppHeader`, `SEIAppShell` | The single header row and its height, stickiness, safe areas, truncation order and landmark strategy; the shell grid, sidebar column and `<main>` landmark | Library branding, route names, account, seed or cultivation semantics |
| `development/WorkspaceHeaderActions.tsx`, `workspace-header.css` | Action presentation, responsive disclosure and focus handling, and the Library surface painted over the canonical header | Any header layout of its own — there is no second header system |
| `development/WorkspaceShell.tsx`, `workspace-shell.css` | The breakpoint the rail appears at, its Library surface, and its sticky full-height behavior | The grid, the landmarks, or a second scaffold |
| `development/main-library/main-library-header.css` | The Main Library homepage header's own surface, unchanged by the workspace migration | Workspace chrome |
| `development/MainLibraryHeader.tsx`, `main-library/` | Library identity, cloud/Profile entry, Command Hub, active-tome commands, DAO presentation | Auth, sync execution, profile loading, story storage, provider or clipboard implementation |
| `development/WorkspaceHeader.tsx` | A thin adapter over `SEIAppHeader`: the Library badge as the visible identity, back/home controls, primary/secondary/overflow hierarchy, status display | Layout, height, stickiness, safe areas, Story Seed schema, cultivation economy, save/generate eligibility, dialogs, page navigation |
| Workspace infrastructure | Responsive rendering of host navigation definitions, canonical modal mechanics and bottom controls | Schema, labels, eligibility, persistence or destinations |
| Feature adapters | Domain labels, eligibility, callbacks, settings content and existing state owners | Reimplementing shared focus and responsive mechanics |
| Preview adapters | Existing scenario state and services, local generation and DAO fixtures | Production network or account effects |

WorkspaceHeader, WorkspaceShell and the navigation infrastructure consume the existing NarrativePresentationProvider contracts and the canonical @seihouse/ui layout and dialog components. There is no custom header foundation any more: the removed `HeaderFoundation.tsx` and `header-family.css` are replaced by `SEIAppHeader` plus a Library skin, and the Main Library homepage header keeps its own unchanged surface in `main-library/main-library-header.css`. LibraryPresentationProvider supplies the approved Library UI skin, including the Story Seed badge. SEN never imports Library UI. Existing public StorySeedHeader, StorySeedMobileNavigation and StorySeedSelector exports remain as compatibility wrappers. No package exports or versions change. This PR integrates Development consumers only; it does not publish packages or modify Light-Novels.

## Component contracts

`MainLibraryHeader({ adapter })` receives `MainLibraryHeaderAdapter`: the existing narrow captured Main Library adapter plus `copyText(text): Promise<void>`. Host callbacks route home/profile/global destinations, clear or select the active story, and open Codex/shortcuts. Account/profile and story summaries are supplied values. `requestDao('status')` returns a typed connection payload; category requests return typed quotes. Clipboard rejection presents retry feedback.

The **cloud remains Profile/Celestial Tools**, including the guest entry, linked tooltip, profile-active color and halo. It does not become a sync button. Sync values remain host-owned; the unchanged collection-strip fixture shows syncing and pending/error state. The Command Hub's source `Online` label is retained, as are disabled future companion realms. The original desktop title hold glow and responsive identity/active-story rules remain in Main Library. No DAO is present in Workspace Header.

`WorkspaceHeaderProps`:

| Input | Contract |
| --- | --- |
| `title`, optional `subtitle` | Identity text; canonical `LibraryHeaderBadge` in `mode="app-header"` preserves the approved plaque, emblem and animation in the single header row. Long text truncates rather than growing the row. |
| optional `emblem: {src, alt}` | Host-supplied asset and accessible description. |
| optional `home: {href, label, onNavigate?}` | Badge emblem link; ordinary clicks can invoke a local host callback. Modified clicks retain native link behavior. Supply an emblem to render this link. |
| optional `back: {label, onNavigate}` | Separately named back control; no history assumptions. |
| optional `primaryAction` | Prominent presentation button; no default page-specific action. |
| `secondaryActions`, `overflowActions` | Ordered actions. Secondary actions are visible at 1280px and above; below that they join overflow. Explicit overflow actions stay there at every width. |
| optional `status: {label, tone?}` | Polite status text. Tone is neutral, success, busy or error; state is never conveyed by color alone. Below 1024px the label is announced but not painted, so the row stays one line; each feature repeats the message in its own content. |
| optional `landmark` | `'banner'` standalone, `'none'` inside `WorkspaceShell`, which already provides the `<header>`. |

Every `HeaderAction` has stable `id`, visible `label`, `onAction`, and optional Lucide `icon`, `disabled`, `loading`, and `pressed`. `onIntent` supports host preloading; `ariaLabel`, `title`, `expanded` and `hasPopup` describe host state. `kind: creation` selects the existing CreationButton, and `loadingIndicator` carries the existing host progress visual. Hosts must supply unique IDs across their secondary and overflow lists and truthful loading/eligibility values. The header never starts async domain work itself, derives progress, or invents successful persistence. Omitted optional content produces a simple identity-only header.

## Interaction and responsiveness

Both compositions use the same foundation and non-modal disclosure behavior. Opening a disclosure focuses its first enabled action. Tab remains ordinary document navigation; moving focus outside or clicking outside dismisses it. Escape closes and returns focus to its trigger. An overflow selection restores the trigger before invoking the host so a host-opened dialog may take focus. Resizing closes the disclosure to avoid leaving focus in a hidden responsive action group.

`SEIAppHeader` is deliberately one row that never reflows, because a growing header would shift the page beneath it. The workspace therefore sheds detail as the row narrows instead of wrapping:

| Width | Header |
| --- | --- |
| `< 640px` | Badge, tone dot, primary action as its icon (its label becomes the accessible name), overflow. |
| `640–1023px` | The primary action's label returns. |
| `1024px+` | The status label is painted; the desktop rail replaces the drawer and the bottom controls. |
| `1280px+` | Secondary actions sit inline beside the primary action. |

The identity column keeps a floor wide enough to read the Library plaque, so the badge is never the part that collapses; action labels ellipsize instead, and every action keeps its accessible name and tooltip. Safe areas are applied by the canonical header at its own edge, and its gutters absorb a landscape notch. Reduced-motion CSS disables decorative transitions/animations in the family; Main Library uses MotionConfig's user preference. DAO adds a named modal, focus lock/return, Escape, body-scroll lock and touch-sized controls to its Development fork.

The DAO and GlobalHeader Development files begin from their captures to preserve Library-specific identity and behavior. They are deliberately separate from the Workspace composition. The compact preview theme retains local baseline fonts and source header color mappings while importing canonical Library UI styles. It excludes the source application's unrelated global rules. A consuming host supplies its canonical stylesheet once; `header-theme.css` is a preview theme, not a new design-system package.

## Responsive workspace infrastructure

`WorkspaceNavigation` takes one `WorkspaceNavigationDefinition`: accessible label, close label, optional profile presentation and canonical section/item definitions. The feature supplies IDs, labels, active/completion indicators, disabled states and callbacks. `WorkspaceSidebar` and the mobile drawer render that same definition. Selection dismisses the drawer and calls the feature callback with its item ID. At 1024px the sidebar replaces the drawer; crossing into desktop dismisses an open drawer.

`WorkspaceBottomControls` takes an accessible label and feature-provided canonical bottom items. It is hidden on desktop. There are no built-in destinations or Manifest rules. Canonical navigation primitives own drawer modal focus, overlay, dismissal, touch controls and safe areas. `WorkspaceSheet` provides a responsive canonical modal for arbitrary host content, with a scrollable body and persistent close/footer controls, Escape, scroll lock and return focus.

`WorkspaceShell` wraps `SEIAppShell` and reconciles the one breakpoint the two systems disagreed on. `SEIAppShell` reveals its sidebar column from `md` (768px), while the drawer and the bottom controls hand over at `lg` (1024px). The shell therefore passes its `sidebar` only once `(min-width: 1024px)` matches, so a tablet never paints an empty column beside a drawer it still needs, and navigation is never offered twice. Server and first paint answer "not desktop", so the mobile arrangement is the default. Both consumers share one 14rem rail: the column stretches the full grid row so its surface and border run the whole height, and the panel inside is sticky under the header at `100dvh` minus the header, scrolling on its own while the page scrolls. The shell sets no `overflow` of its own — a clipped ancestor would become the sticky scrollport and strand both the header and the rail — and it overrides the canonical `<main>` back to `overflow: visible` so the page keeps one scrollbar and the sidebar row grows with the content.

`StorySeedWorkspaceChrome` is the feature adapter. It builds the single section definition from the existing seed helpers and forwards existing CreationModal callbacks for Save Draft, Story Bank, Help and Manifest. The feature owns seed schema, labels, completion, generation eligibility, disabled reasons, saved/error feedback, preload intent and settings content. Header and bottom controls open one Settings sheet. The existing intake forms, Story Bank storage, Help, authentication/generation gate, Blueprint Review and manifestation flows retain their owners. Blueprint Review retains its existing stage-specific actions. The old exported header/mobile components delegate to this adapter for compatibility; active CreationModal mounts it once.

Cultivator Cave uses WorkspaceHeader for its emblem/home and consolidated Settings entry, and WorkspaceShell for its rail, with its backdrop kept behind the shell and its clipping moved onto the backdrop layer so the sticky chrome still works. Its portrait, Qi, Stories, Relics, Dao Pillar, Active Status Effects, role-gated destinations and existing Settings panel remain Cave-owned. It does not mount Story Seed navigation or generic bottom controls because those structures do not fit its existing information architecture.

## Local configurations

- Main Library: linked, guest, syncing, offline, profile, active story, long name, missing profile, local DAO and DAO failure. Its cloud still opens Profile, and DAO remains exclusive to this composition.
- Story Seed: actual existing Workshop scenarios, starting with filled intake, including empty intake, bank, settings, Help, generation, Blueprint and review scenarios. The standalone Development preview supplies the existing DevAudioPlaybackProvider for Help. The Library Shell embedded preview selects local mock Blueprint generation; the ordinary Story Seed preview retains its existing generation adapter. Existing local Story Bank persistence is exercised, with deterministic fixture resets on embedded preview initialization.
- Cultivator Cave: actual existing profile scenarios, starting with developed cultivator. The existing services adapter records production actions locally. Settings and all destinations use the real Development component.

No new storage, schema, backend or authentication implementation is introduced. Locked captures use their original independent mocks. Their source-comparison dates and hashes do not change.

## Validation

`npx vitest run src/components/library-shell/development/WorkspaceHeaderActions.test.tsx` covers enabled-action initial focus, Escape return, callback delivery, host focus preservation, outside-focus dismissal, minimal props (including that the chrome contributes no heading) and host-owned disabled eligibility. `npx vitest run src/components/user-profile` covers the Cave's reconciled breakpoints: one navigation below desktop, and the single 14rem rail above it. Also run `npm run build`, `node scripts/checkLibraryShellCapture.mjs`, `npm run check:ui-artifacts`, and `npm run check:package-boundaries`.

Browser verification and its limits are recorded in [header validation](library-header-validation.md).

## Transfer inventory

An eventual approved transfer includes `development/WorkspaceHeader.tsx`, `WorkspaceHeaderActions.tsx`, `WorkspaceShell.tsx`, `workspaceMedia.ts`, `workspace-header.css`, `workspace-shell.css`, `MainLibraryHeader.tsx`, and the `development/main-library/*` files (including `main-library-header.css`) as appropriate to each host, together with `@seihouse/ui` and `@seihouse/library-ui` at the recorded UI commit. Main Library currently consumes the narrow `shared/MainLibraryAdapter.tsx` contract; promote that contract with its adapter boundary, not a production store import. Keep `header-theme.css`, fixture components, iframe routing, Workshop controls, capture manifest, tests and documentation out of the runtime package. For portable workspaces also include WorkspaceNavigation.tsx, WorkspaceSheet.tsx and workspace-navigation.css through the existing SEN build and presentation provider boundary. StorySeedWorkspaceChrome and its callbacks stay with Story Seed; Cave wiring stays with UserProfile. Navigation definitions, services, stores and settings content remain feature-owned. Do not export MainLibraryHeader through SEN. A future UI package promotion requires a separate ownership/publication task; this work proves the combined system in development.
