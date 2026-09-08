# User Profile

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/UserProfile.tsx` (default export `UserProfile`), with
  `src/components/UserProfileAdminPanel.tsx`, `src/components/UserProfileInventoryPanel.tsx`,
  `src/components/UserProfilePortraitModal.tsx`, `src/components/UserProfileSettingsPanel.tsx`,
  `src/components/UserProfileStoriesPanel.tsx`, and the page's controller hook
  `src/hooks/useUserProfile.ts`
- **Workshop preview:** `?preview=user-profile`
- **Replica created:** 2026-09-08
- **Last Workshop update:** 2026-09-08
- **Last source comparison:** 2026-09-08
- **Replica status:** under refinement

The page is reached in production from `src/App.tsx`, which renders `<UserProfile currentUser
stories onLogout onNavigateHome />` (around `App.tsx:697`). Verified against `Light-Novels`
`main` at commit `32f9e74`.

## Workshop history

- **2026-09-08:** Created the faithful Workshop replica of the complete Celestial Tools profile
  page and all five of its panels, the injected services port, the local mock adapter, and the
  six-scenario state simulator. `reference/` and `development/` were byte-identical.
- **2026-09-08:** Redesigned `development/` into the **Cultivator Cave**: a portrait, identity,
  rank and Qi plaque over a stock Immortal Land backdrop; four destinations (Stories, Relics, Dao
  Pillar, Active Status Effects); and one gear-triggered Settings panel. Built on canonical
  `@seihouse/library-ui` and `@seihouse/ui` components and the `@seihouse/library/relics` relic
  card. `reference/` is unchanged. Added the component test suite and `npm run test:user-profile`.
- **2026-09-08:** Recovered the existing cinematic OAuth gate from Story Seed and connected it to
  the Cave's signed-out state. It replaces the intermediate **Spirit Unlinked** plaque entirely,
  accepts a host-owned provider dispatcher, uses account-wide Spirit Link copy, and preserves its
  loading, email, reduced-motion, constrained-network, and post-link dissolve behavior. No real
  authentication runs in the Workshop.
- **2026-09-08:** Replaced the Celestial Aura tier list with the canonical **rank colour system** in
  `rankVisuals.ts`: the ten-rank ladder (Reader → Master) with its Qi thresholds, and each rank's
  solid colour or multi-stop gradient as first-class data. The display name, the rank orb, the
  portrait glow, the portrait motes, and the Settings rank list all render from it. Settings now
  shows only name, swatch and Qi per rank. Master remains the user-controlled spectrum, at
  50,000 Qi. Qi earning mechanics are untouched.

## Folder layout

```text
reference/    — untouched replica of production, locked
development/  — the Cultivator Cave redesign
shared/       — the services port, domain types, and the unforked offering-week helper
```

`reference/` still contains the ten production files listed under *The locked reference*.
`development/` now contains:

| File | Role in the Cave |
| --- | --- |
| `UserProfile.tsx` | The Cave workspace: shared header and navigation, persistent controller, four page destinations, portrait and language dialogs |
| `UserProfileCaveDestination.tsx` | The frame every destination opens into (back control, title, heading focus) |
| `UserProfileStoriesPanel.tsx` | **Stories** — Manifested Stories and Story Seeds in one destination |
| `UserProfileInventoryPanel.tsx` | **Relics** — inventory, soul attunement, the Offering Hall pouch, submitted history, and rewards |
| `UserProfileDaoPillarPanel.tsx` | **Dao Pillar** — streak, cracked state and repair, milestones, daily refinement |
| `UserProfileStatusEffectsPanel.tsx` | **Active Status Effects** — one card per effect, with an empty state |
| `UserProfileSettingsPanel.tsx` | The **Settings** page content |
| `UserProfileAdminPanel.tsx` | The Akashic Switchboard, unchanged from production, opened as a destination |
| `UserProfilePortraitModal.tsx` | The Divine Mirror content with the shared accessible dialog frame |
| `caveEnvironment.ts` | The five stock cave environments, the destination tile art, the emblem, the motto, and the stage helper |
| `rankVisuals.ts` | **The canonical rank colour system** — the ten ranks, their Qi thresholds, and each rank's colour identity as data, with the renderers every surface consumes |
| `qi.ts` | Rank progression maths and the Celestial Aura style helpers, derived from `rankVisuals.ts` |
| `chapterWritingStyle.ts` | Unchanged presentation values from production |
| `userProfile.css` | The two rank-agnostic aura text classes plus the Cave ornament (title presence, rules, plaques, portrait ring) |

`shared/` is unchanged: `types.ts`, `userProfileServices.ts` (the port), and `offeringWeek.ts`.

## The Cultivator Cave

The Cave home shows, top to bottom on a phone and side by side from the `md` breakpoint:

- the cave header — the Library sacred-tree glyph, the gold "Cultivator Cave" title, and the
  Settings gear;
- the central cultivator portrait inside a gold ring, wearing the aura glow and the rank-gated
  mote layer from production, flanked by two decorative calligraphy plaques;
- the identity plaque — display name in its Celestial Aura style, the attuned-relic mark, Dao name,
  `rank · stage`, the Heavenly Qi bar toward the next rank, the three Qi cores (tap a chip to read
  its description), and the cave motto;
- four destination cards: **Stories**, **Relics**, **Dao Pillar**, **Active Status Effects**.

Every destination opens in place, over the same backdrop, with a "Return to cave" control and
focus moved to its heading. The Akashic Switchboard is a fifth destination reachable only from
Settings, and only for owner and admin accounts.

The **Settings** drawer opens from the gear and holds every remaining control in collapsible
sections: Identity & Celestial Aura (Dao name, display name, the rank picker, the Custom
Spectrum, Guard Changes / Discard), Cultivator Portrait (opens the Divine Mirror), Cave
Environment (five stock backdrops and the ambient motes toggle), Language (both selectors with
the 30-second confirmation), Writing Preferences (default chapter writing style), Harmony & Sync,
Backup, Import & Export (Import Scroll, Backup All), Advanced Tools (Aether Router, Shortcuts),
Authorized Controls (owner/admin only), and Account (Sever Link).

### The rank colour system

`rankVisuals.ts` is the single source for the rank ladder and for every colour the profile paints.
`DAO_RANKS` in `qi.ts` is derived from it, so a rank cannot carry one threshold in the ladder and a
different one in its colour data.

| # | Rank | Qi | Colour identity |
| --- | --- | --- | --- |
| 1 | Reader | 0 | solid white `#E5E7EB` |
| 2 | Disciple | 100 | solid green `#22C55E` |
| 3 | Scribe | 300 | solid blue `#2563EB` |
| 4 | Scholar | 750 | blue → light blue |
| 5 | Author | 1,500 | light blue → yellow |
| 6 | Adept | 3,000 | yellow → pink |
| 7 | Elder | 6,000 | pink → red |
| 8 | Leader | 12,000 | red → gold |
| 9 | Sage | 25,000 | gold → violet |
| 10 | Master | 50,000 | the user-controlled spectrum |

Adjacent swatches in the rank reference sheet are **one gradient identity**, not two alternatives:
both are dominant stops, and the value between them is a restrained support stop that keeps the
blend from going muddy (Leader's orange between red and gold, Author's pale seafoam between light
blue and yellow). `positions` weights those support stops so the dominant colours keep the majority
of the ramp.

The reference's colours are named once at the top of `rankVisuals.ts` and composed from there.
🟡 `YELLOW` (Author, Adept) and 🏆 `TROPHY_GOLD` (Leader, Sage) are deliberately kept apart: yellow
is the brighter and more luminous, gold the deeper and richer. They sit close in hue — every
convincing yellow does — so what really separates them is what each is paired with.

`PINK` carries the warm middle of the ladder in place of the reference sheet's orange. Running
Adept and Elder through orange left Adept, Elder and Leader reading as three near-identical
orange-red discs at swatch size. Every rank now hands its end colour to the next — light blue →
yellow → pink → red → gold → violet — so each orb stays legible on its own.

A `RankVisual` is `kind` (`solid` / `gradient` / `spectrum`), its `stops`, an `angle`, optional
`positions`, and a `glow`. Solid colours and multi-stop gradients are the same data shape, so every
renderer takes one path:

| Surface | Renderer |
| --- | --- |
| Display name, in the Cave and in the Settings preview | `getAuraTextStyle` — a flat `color` for a solid rank, an inline `backgroundImage` clipped through `.aura-gradient-text` for the rest |
| Rank orb beside `rank · stage`, Settings rank swatches, the custom-spectrum sphere | `getAuraSwatchStyle` |
| Portrait ring glow | `getAuraGlowStyle` |
| Portrait motes | `rank.motes` and `rank.visual.stops`, rather than a hardcoded list of colour values |

The only CSS the system still needs is the two rank-agnostic classes in `userProfile.css`: text
clipping, and the spectrum drift. No rank has a class, a magic gradient name, or a branch of its own.

**Settings** lists each rank as its name, its colour or gradient swatch, and the Qi it unlocks at —
nothing else. The per-tier aura names and lore lines ("Prism Branching Gradient", "You master
branches") are gone.

**Master** stays the endgame: reaching 50,000 Qi unlocks the colour picker, and the chosen colour is
stored on `displayNameColor` as a raw hex.

#### `displayNameColor` compatibility

The field now stores a `rank:<id>` token, or a raw hex for a Master custom spectrum.
`resolveRankVisual` still reads every value production has ever written. The nine legacy values map
by the Qi threshold they were unlocked at, so nobody is promoted or demoted by the ladder change:
`#8B5CF6` (Dao Adept, 1,500) resolves to Author, `gradient-violet-gold` (12,000) to Leader, and
`animated-custom` (25,000) to Sage. A stored raw hex is honoured whenever it is present — the
50,000 Qi gate is on *setting* one, not on painting one that was already earned.

### Stage label

`rank · stage` derives the stage from progress toward the next rank (Early below 34%, Middle below
67%, Late otherwise, Peak at the final rank). It is presentation only; the rank still comes from
`getDaoRankData` and nothing new is persisted.

### Backdrops and portrait

The five cave environments are the production "IMMORTAL LAND" images already in
`public/manifest-backdrops/`; the two destination tiles reuse two of them. No new background art
was added. The chosen environment and the motes toggle are transient component state — persisting
them needs a profile field in Light-Novels and is out of scope here. The portrait is whatever
`avatarUrl` the profile carries; the Workshop's developed scenario supplies a locally drawn static
SVG bust, and the Divine Mirror flow still seals a new one.

### Canonical components used

`LibraryPanel`, `LibraryCard` (+ title/description slots), `LibraryButton`, `LibraryTextBox`, and
`ParticleEffect` from `@seihouse/library-ui`; `SEIDrawer`, `SEIDialog`, `SEIDisclosureGroup`,
`SEITabs`, `SEIProgressBar`, `SEIInlineAlert`, `SEIEmptyState`, `SEILoadingState`, `SEIField`,
`SEISelect`, and `SEISwitch` from `@seihouse/ui`; `RelicCard` and `renderArtifactIcon` from
`@seihouse/library/relics`. The Workshop's `--color-neutral-500` is darker than production's, so
judge fine contrast against production.

## The services port

Unchanged. `shared/userProfileServices.ts` is the entire production boundary. `UserProfileController`
mirrors the return value of `useUserProfile` name for name, and the Cave consumes it without adding
a member, so transferring back is still a provider swap. Two controller members the Cave no longer
reads — `isQiMenuOpen` / `setIsQiMenuOpen` (the cores are always visible; `activeQiTooltip` still
drives the descriptions) and `currentPowerStage` — remain in the contract for production.

Nothing in `reference/`, `development/`, or `shared/` imports Firebase, PostgreSQL, R2, an API
route, a secret, or an environment variable.

## What was mocked

All mock logic lives in `src/workshop/previews/user-profile/mockUserProfileServices.ts` — outside
the portable components.

| Production dependency | Workshop stand-in |
| --- | --- |
| Firebase Auth (Google, Apple, or email) | the recovered OAuth gate links a mock account locally |
| `lib/persistence` (`getUserProfile`, `saveUserProfile`) | a local snapshot resolved on a 450 ms timer |
| `lib/persistence` admin routes | the fixed registries in `previewData.ts`, 700 ms |
| `services/profilePicture` (Gemini image generation) | a stepped 9 s timer resolving a locally drawn SVG |
| `services/profilePicturePersistence` (R2 upload + commit) | an 800 ms delay, then a local `avatarUrl` write |
| Portrait upload | a real `FileReader` read; the base64 never leaves the browser |
| `lib/artifacts.submitCurrentWeekOfferings` | marks this week's pouch submitted and pays its Qi and Sect Merit into the local profile |
| `lib/storySeedStorage` / `lib/storySeedFormat` | the fixed seed list; export is logged, never downloaded |
| `lib/storage.performSync`, `lib/firebase` local-only mode | logged as excluded actions |
| `useAppStore` (Aether Router, Shortcuts, library import/export) | logged as excluded actions |

Everything else runs for real against local state, reproduced from `useUserProfile.ts`: the streak
and milestone maths, the 30-second language-confirmation countdown, the attunement and
status-effect replacement rules, and the optimistic writing-style save with its rollback.

Actions the Workshop deliberately does not perform are recorded in a preview-only
"excluded production actions" panel rendered by the workspace. That panel is Workshop tooling and
is never transferred.

### Available preview states

| State | What it shows |
| --- | --- |
| Spirit Unlinked | No account, cloud mode on — lands directly on the cinematic OAuth page. Linking reveals the Cave. |
| New cultivator | A freshly linked Reader: no portrait, no relics, no streak, no effects — every empty state. |
| Developed cultivator | A Leader with a portrait, three Qi cores, an attuned relic, two status effects, a 12-day Dao Pillar, relics awaiting offering, stories and seeds. |
| Loading | The profile snapshot never resolves; the identity plaque shows its loading state. |
| Error | Every asynchronous service rejects — page error band, admin failure, seed failure, portrait failure, offering failure. |
| Owner / Admin | Owner role: the cracked pillar, and the Authorized Controls section opens the Akashic Switchboard. |

Switching state remounts the pane, so each scenario starts from its own snapshot.

## Tests

`npm run test:user-profile` runs `development/UserProfile.test.tsx` (jsdom) against the Workshop
mock adapter: the home plaque and cards, the Qi core chips, the unlinked OAuth / loading / error states,
each destination and its return path, relic inspection with attunement and a full Offering Hall
submission, the daily refinement and pillar repair, the status-effect cards and empty state, the
Settings sections, identity editing, the language confirmation, the owner's Switchboard, the stage
helper, and a check that the locked reference still renders the original page.

The rank colour system has its own block: the ten thresholds, `rankBackground` over both a solid and
a weighted multi-stop gradient, the earned-rank fallback, `resolveRankVisual` over rank tokens /
legacy aura values / a custom hex, the solid-versus-gradient text treatments, the simplified
Settings rank list, and the 50,000 Qi gate on the custom spectrum.

## Reusable Workshop dependencies

- `src/workshop/FeatureWorkspace.tsx` — the shared Original Reference / Development / Compare shell
  and the Workshop Controls menu.
- `src/workshop/manifest.ts` and the `previewRegistry` in `src/App.tsx`.
- `public/manifest-backdrops/` (the Immortal Land pool) and `public/icons/sacred-tree.svg`.
- The Workshop theme tokens in `src/styles.css`.

## Production dependencies intentionally excluded

Firebase Auth and Firestore, PostgreSQL through `lib/persistence`, Cloudflare R2 and the
profile-picture asset contracts, the Gemini image-generation route, the admin overview and
mutation routes, the Zustand app store, `lib/storage` sync, `lib/storySeedStorage`, real story
persistence, and every secret or environment variable. Verified by instrumenting the preview: it
issues no external network request beyond the Workshop shell's own Google Fonts stylesheet.

## Known differences from the source

1. **Neutral text tokens.** The Workshop's `styles.css` sets `--color-neutral-500: #737373`;
   Light-Novels sets `#a3a3a3`. Judge fine contrast decisions against production.
2. **Generation step labels.** `useUserProfile` advances `generationStep` through six messages,
   but the Divine Mirror only labels four, so a real generation long enough to reach step 4 renders
   "Manifesting undefined…". The mock's 9 s generation lands on step 3. Production's defect,
   recorded here; the modal is unchanged.
3. **`currentPowerStage`.** Production reads it from the active story's narrative memory. The
   Workshop controller returns a fixed string, and the Cave does not display it.
4. **Toasts.** Production dispatches a `seihouse-toast` event after a pillar repair. There is no
   toast host in the Workshop, so that confirmation is not shown.
5. **Offering submission.** Production refreshes the inventory through the app store listener. The
   Workshop mock now performs the equivalent local mutation so the pouch empties into History.
6. **Overlay layering.** The Settings drawer and the two dialogs carry `z-[300]`/`z-[310]` so they
   sit above the Workshop Controls panel (`z-[200]`). Production has no such panel; the classes are
   harmless there.

## The locked reference

`reference/` is the production page exactly as imported on 2026-09-08 and must not be edited during
Workshop work. It contains `UserProfile.tsx`, `UserProfileAdminPanel.tsx`,
`UserProfileInventoryPanel.tsx`, `UserProfilePortraitModal.tsx`, `UserProfileSettingsPanel.tsx`,
`UserProfileStoriesPanel.tsx`, `qi.ts`, `chapterWritingStyle.ts`, and `userProfile.css`, with the
five import-wiring edits described in the first history entry.

## Exact files needed for transfer

Once the Cave is approved, copy back from `development/`:

- `UserProfile.tsx`, `UserProfileAdminPanel.tsx`, `UserProfileInventoryPanel.tsx`,
  `UserProfilePortraitModal.tsx`, `UserProfileSettingsPanel.tsx`, `UserProfileStoriesPanel.tsx`,
  `UserProfileCaveDestination.tsx`, `UserProfileDaoPillarPanel.tsx`,
  `UserProfileStatusEffectsPanel.tsx`, `caveEnvironment.ts` → `src/components/` in Light-Novels.
- Transfer `StoryAuthGate.tsx` and `public/story-seed/library-auth-backdrop.jpg` with the Cave, or
  consume the gate from the SEN package once that package version is installed in Light-Novels.
- `rankVisuals.ts` → a new `src/lib/rankVisuals.ts`, plus the changes to `qi.ts` → the matching
  exports in `src/lib/qi.ts`. Production's `AURA_TIERS`, `getAuraColorForXp`, and the two magic
  `colorHex` strings are gone; see *The rank colour system* for what replaces them and for the
  `displayNameColor` compatibility rules.
- `userProfile.css` → the aura block in `src/index.css` plus the Cave ornament rules. The per-tier
  `.aura-gradient-violet-gold` / `.aura-animated-custom` classes are replaced by the rank-agnostic
  `.aura-gradient-text` / `.aura-spectrum-text` pair.
- The host must serve the five `manifest-backdrops/immortal-land-*.jpg` files and
  `icons/sacred-tree.svg` at the same paths, or `caveEnvironment.ts` must be pointed at the
  production image URLs.
- The host must provide `@seihouse/library-ui`, `@seihouse/ui`, and `@seihouse/library/relics`
  (Light-Novels already consumes the UI packages).

Then restore the production wiring. Either revert the port, or — the smaller diff — keep the port
and mount one real adapter in `App.tsx`:

```tsx
const services: UserProfileServices = {
  useController: useUserProfile,
  authenticate: dispatchFirebaseAuthentication,
  localOnlyMode: LOCAL_ONLY_MODE,
  setLocalOnlyMode,
  requestLibrarySync: () => { void storyStorage.performSync({ deep: true }); },
  submitCurrentWeekOfferings,
  listStorySeeds,
  downloadStorySeed,
  downloadStorySeedCollection,
};
```

### Transfer cautions

- **Do not transfer** `shared/types.ts` or `shared/offeringWeek.ts`. Light-Novels owns `src/types.ts`
  and `src/lib/artifacts.ts`; the Workshop copies are trimmed and would regress those files.
- **Do not transfer** anything under `src/workshop/previews/user-profile/` or the test file's mock
  imports.
- Persisted values and API compatibility strings were kept exactly as production has them —
  `defaultChapterWritingStyle` option strings, the language option values including their native
  script suffixes, `premiumTier` and `role` unions, `offeringWeekId` / `status` on artifacts, the
  `seihouse-local-user-profile` and `seihouse-local-cosmic-inventory` storage keys (referenced by
  the production hook, not by these components), and the `profilePicture` naming. Do not rename any
  of them without a deliberate migration task.
- **`displayNameColor` is the one exception.** Its vocabulary changed with the rank colour system:
  it now stores a `rank:<id>` token, or a raw hex for a Master custom spectrum. No migration is
  required — `resolveRankVisual` reads every legacy value production wrote, mapped by the Qi
  threshold it was unlocked at (see *The rank colour system*). Keep that legacy map when
  transferring, or existing cultivators lose their aura.
- The cave environment choice is not persisted. Adding a profile field for it is a production
  schema decision, not a Workshop one.
- `AdminStoryRow` narrows what production types `any[]`. If the admin overview grows a field the
  panel renders, add it to the interface rather than widening it back to `any`.

## Lifecycle

1. **Import** — copy production's current implementation into `reference/`. *(done 2026-09-08)*
2. **Fork once** — `development/` starts as a copy of `reference/`. *(done 2026-09-08)*
3. **Refine** — every Workshop task modifies `development/` only. *(in progress: Cultivator Cave)*
4. **Approve** — transfer `development/` back to Light-Novels in a separate task.
5. **Resynchronize** — refresh `reference/` from the integrated production code, update
   `source.lastCompared`, and reset `development/` for the next cycle.

## Development shell integration — 2026-09-08

Connected WorkspaceHeader to Cultivator Cave emblem/home and its existing consolidated Settings panel. Cave destinations, portrait, Qi and role rules remain unchanged; no Story Seed sidebar or bottom controls were added. See [shared contracts](../../../docs/library-header-family.md). Locked references and source-comparison dates are unchanged.


## Four-destination Cave workspace — 2026-09-08

Navigation and page structure only. Home retains the portrait, identity, Qi, and existing
shortcut cards; Stories and Relics reuse their existing panels; Settings presents the existing
settings sections in the page. Current text, placeholders, economy, and media content are not
approved or finalized by this change.

`caveNavigation.tsx` owns the Cave labels, icons, route resolution, and browser history adapter.
It supplies the existing `WorkspaceNavigation`, `WorkspaceSidebar`, and `WorkspaceBottomControls`.
The reusable shell contains no Cave destinations or domain rules. `WorkspaceHeader` has no
redundant Settings action. Below 1024px the dock is fixed with content clearance and safe-area
insets; tablet widths constrain the dock to 40rem. At 1024px the sidebar replaces the dock.

Routes coexist with the existing preview query and preserve unrelated URL parameters, hash,
and host history state:

| Page | Direct preview URL |
| --- | --- |
| Home | `?preview=user-profile&cave=/home` (also the default) |
| Stories | `?preview=user-profile&cave=/stories` |
| Relics | `?preview=user-profile&cave=/relics` |
| Settings | `?preview=user-profile&cave=/settings` |
| Existing Dao Pillar | `?preview=user-profile&cave=/home/dao-pillar` |
| Existing status effects | `?preview=user-profile&cave=/home/status-effects` |
| Existing authorized Switchboard | `?preview=user-profile&cave=/settings/switchboard` |

The route resolver separates the primary destination from its remaining path. Unimplemented
nested paths display Page unavailable and a return-to-parent control while keeping their parent
selected. Future story pages can connect a canonical novel with other manifestations; future relic
pages can include collected items, titles, rewards, details, and the Library Offering Hall. This
PR implements none of those future schemas, interfaces, reward rules, or multimedia layouts.

Page headings receive focus when the route changes, including Back/Forward. The portrait frame
uses the shared dialog for focus containment, Escape, focus restoration, and layering above the
dock; portrait controls and service calls are preserved. Navigating through browser history closes
the portrait overlay and reverts any unanswered language change. Ordinary portrait closing returns
focus to its opener in Settings. Settings drafts remain owned by the existing controller.

Validation: `npm run test:user-profile` includes destination selection, direct links, parent
selection, host URL preservation, popstate handling, authorized-page gating, and existing Cave
functionality. `scripts/verifyCaveWorkspace.browser.mjs` exports a repeatable browser matrix for
the Codex Browser API. Open the developed user-profile preview, then pass the tab, the browser's
`viewport` capability, and the tab's `cdp` capability to `verifyCaveWorkspace`. It checks all four
pages at 320, 390, 768, 1024, and 1440px, Back/Forward, Enter/Space/Tab, portrait and language
focus containment, history during an overlay, and 34px bottom / 12px side safe-area emulation.
Temporary emulation is reset even if a check fails. Tests use local Workshop services, not live
account persistence or providers.

Transfer also requires `caveNavigation.tsx`, the shared Library workspace shell/header modules and
their styles, and the existing presentation provider. A host can replace the query transport in
`useCaveRoute` with its router; retain the destination/child separation. Locked references and the
last source comparison date are unchanged. Production integration remains a separate task.

Verified on 2026-09-08: 88 targeted component tests passed; production build and package-boundary
checks passed; all five browser widths passed destination/history/geometry checks, and the keyboard,
overlay, safe-area, and persistent-dock checks passed. Safe-area values are browser emulation, not
a claim of testing physical iOS hardware.
