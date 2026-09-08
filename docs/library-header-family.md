# Library header family

Updated 2026-09-08. Status: Development candidate, not integrated or published. Baseline: merged development PR #182 (`71c9a1c9f4f6994225f06b56c6c759f45f79f4ed`). Locked files and source-comparison metadata are unchanged.

## Inspect

Open `?preview=library-shell`, select **Development**, then choose Main Library, Story Seed, or Cultivator Cave and Phone (390 × 844), Tablet (768 × 1024), or Desktop (1440 × 900). Compare uses independent iframe documents so themes, viewport rules and overlays remain isolated. Cultivator Cave has no locked capture; its Reference pane explains this rather than presenting a fabricated baseline.

Direct responsive routes:

- `/library-shell.html?variant=development&source=main-library&state=linked`
- `/library-shell.html?variant=development&source=story-seed&state=filled`
- `/library-shell.html?variant=development&source=cultivator-cave&state=ready`

Omit `variant=development` to open the original locked Main Library or Story Seed shell. The full Story Seed reference retains its navigation; the candidate previews intentionally show the header and neutral host content only. This is not a navigation redesign.

## Ownership

| Layer | Owns | Must not own |
| --- | --- | --- |
| Canonical `@seihouse/ui`, `@seihouse/library-ui` | Existing buttons, panels, badge, typography, spectral surfaces and tokens | Page or account data |
| `development/HeaderFoundation.tsx`, `header-family.css` | Header surface, bounded width, spacing, safe areas, 44px controls, focus-visible treatment, action presentation, responsive disclosure and focus handling | Route names, DAO, account, seed or cultivation semantics |
| `development/MainLibraryHeader.tsx`, `main-library/` | Library identity, cloud/Profile entry, Command Hub, active-tome commands, DAO presentation | Auth, sync execution, profile loading, story storage, provider or clipboard implementation |
| `development/WorkspaceHeader.tsx` | Canonical badge and configurable identity, back/home controls, primary/secondary/overflow hierarchy, status display | Story Seed schema, cultivation economy, save/generate eligibility, dialogs, page navigation |
| Preview adapters | Local fixture state, simulated operations, destination feedback, settings content, fake clipboard | Production effects or persistence |

These are first-party Library presentation candidates. No SEN or Library package exports change. The portable SEN engine must never import Library UI. After approval, the foundation/compositions can be promoted through the UI-owned package process; host wiring remains in Library or the workspace owner. This PR does not publish packages or integrate the active Story Seed or Light-Novels.

## Component contracts

`MainLibraryHeader({ adapter })` receives `MainLibraryHeaderAdapter`: the existing narrow captured Main Library adapter plus `copyText(text): Promise<void>`. Host callbacks route home/profile/global destinations, clear or select the active story, and open Codex/shortcuts. Account/profile and story summaries are supplied values. `requestDao('status')` returns a typed connection payload; category requests return typed quotes. Clipboard rejection presents retry feedback.

The **cloud remains Profile/Celestial Tools**, including the guest entry, linked tooltip, profile-active color and halo. It does not become a sync button. Sync values remain host-owned; the unchanged collection-strip fixture shows syncing and pending/error state. The Command Hub's source `Online` label is retained, as are disabled future companion realms. The original desktop title hold glow and responsive identity/active-story rules remain in Main Library. No DAO is present in Workspace Header.

`WorkspaceHeaderProps`:

| Input | Contract |
| --- | --- |
| `title`, optional `subtitle` | Identity text; canonical `LibraryHeaderBadge` preserves Story Seed's approved plaque, emblem and animation. Long text wraps. |
| optional `emblem: {src, alt}` | Host-supplied asset and accessible description. |
| optional `home: {href, label, onNavigate?}` | Badge emblem link; ordinary clicks can invoke a local host callback. Modified clicks retain native link behavior. Supply an emblem to render this link. |
| optional `back: {label, onNavigate}` | Separately named back control; no history assumptions. |
| optional `primaryAction` | Prominent LibraryButton; no default page-specific action. |
| `secondaryActions`, `overflowActions` | Ordered actions. Secondary actions are visible at 768px and above; below that they join overflow. Explicit overflow actions stay there at every width. |
| optional `status: {label, tone?}` | Polite status text. Tone is neutral, success, busy or error; state is never conveyed by color alone. |

Every `HeaderAction` has stable `id`, visible `label`, `onAction`, and optional Lucide `icon`, `disabled`, `loading`, and `pressed`. Hosts must supply unique IDs across their secondary and overflow lists and truthful loading/eligibility values. The header never starts async domain work itself, derives progress, or invents successful persistence. Omitted optional content produces a simple identity-only header.

## Interaction and responsiveness

Both compositions use the same foundation and non-modal disclosure behavior. Opening a disclosure focuses its first enabled action. Tab remains ordinary document navigation; moving focus outside or clicking outside dismisses it. Escape closes and returns focus to its trigger. An overflow selection restores the trigger before invoking the host so a host-opened dialog may take focus. Resizing closes the disclosure to avoid leaving focus in a hidden responsive action group.

The workspace primary action expands across the phone action row. Status sits above it, secondary actions move to overflow, and the badge stays the identity anchor. Tablet may use two rows; desktop fits identity and action area side by side when space allows. Long content wraps instead of hiding labels. Safe areas are applied at the shared header edge. Reduced-motion CSS disables decorative transitions/animations in the family; Main Library uses MotionConfig's user preference. DAO adds a named modal, focus lock/return, Escape, body-scroll lock and touch-sized controls to its Development fork.

The DAO and GlobalHeader Development files begin from their captures to preserve Library-specific identity and behavior. They are deliberately separate from the Workspace composition. The compact preview theme retains local baseline fonts and source header color mappings while importing canonical Library UI styles. It excludes the source application's unrelated global rules. A consuming host supplies its canonical stylesheet once; `header-theme.css` is a preview theme, not a new design-system package.

## Local configurations

- Main Library: linked, guest, syncing, offline, profile, active story, long name, missing profile, local DAO and DAO failure. Global destinations report into the local content slot. Clipboard writes report local feedback.
- Story Seed: filled, empty/disabled, saved, generating, error/retry, long title and minimal. Save, Settings, Story Bank, Help and export callbacks run locally. Settings renders an explicit host fixture below the header, not a replacement settings sheet.
- Cultivator Cave: ready, cultivating, error/retry, long title and minimal. Begin/cancel cultivation, back to Profile, home, Settings, Relics, Help and export callbacks run locally. There is no Qi calculation or real cultivation service.

All fixtures reset on refresh. Header actions that normally open page content are demonstrated through local host content and feedback. They do not implement the destination application. No sidebar, drawer, section selector, bottom navigation, active Story Seed or Light-Novels file changes are included.

## Validation

`npx vitest run src/components/library-shell/development/HeaderFoundation.test.tsx` covers enabled-action initial focus, Escape return, callback delivery, host focus preservation, outside-focus dismissal, minimal props and host-owned disabled eligibility. Also run `npm run build`, `node scripts/checkLibraryShellCapture.mjs`, `npm run check:ui-artifacts`, and `npm run check:package-boundaries`.

Browser verification and its limits are recorded in [header validation](library-header-validation.md).

## Transfer inventory

An eventual approved transfer includes `development/HeaderFoundation.tsx`, `WorkspaceHeader.tsx`, `MainLibraryHeader.tsx`, `header-family.css`, and the two `development/main-library/*.tsx` files as appropriate to each host. Main Library currently consumes the narrow `shared/MainLibraryAdapter.tsx` contract; promote that contract with its adapter boundary, not a production store import. Keep `header-theme.css`, fixture components, iframe routing, Workshop controls, capture manifest, tests and documentation out of the runtime package. Keep navigation extraction and active-workspace integration as separate tasks.
