# User Profile

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/UserProfile.tsx` (default export `UserProfile`), with
  `src/components/UserProfileAdminPanel.tsx`, `src/components/UserProfileInventoryPanel.tsx`,
  `src/components/UserProfilePortraitModal.tsx`, `src/components/UserProfileSettingsPanel.tsx`,
  `src/components/UserProfileStoriesPanel.tsx`, and the page's controller hook
  `src/hooks/useUserProfile.ts`
- **Workshop preview:** `?preview=user-profile`
- **Replica created:** 2026-09-08
- **Last Workshop update:** 2026-09-10
- **Last source comparison:** 2026-09-10
- **Replica status:** under refinement

The page is reached in production from `src/App.tsx`, which renders `<UserProfile currentUser
stories onLogout onNavigateHome />` (around `App.tsx:697`). Verified against `Light-Novels`
`main` at commit `4a3dd02`.

## Workshop history

- **2026-09-10 subscription badge:** Restyled the tier badge beneath the rank as the
  **LibraryTierBadge** capsule — a cool translucent glass pane with dark lettering under a layered
  gold / portal / violet rim, a soft halo, and an occasional restrained sheen; reduced-motion users
  keep the same lit surface with the sheen removed. The pane is tinted glass rather than a milky
  fill: the plaque behind it is blurred and shows through, a specular crest and refraction step
  give it thickness, and the rim is a masked ring so its gradient stays an edge instead of washing
  across the surface. The stop alphas are chosen so the lettering holds AAA contrast even over pure
  black. The label still comes from `premiumTier` through the existing tier map, sits in the same
  rank-row slot, and remains non-interactive; the name, rank treatment, progress bar, and the rest
  of Home are unchanged. The component is self-contained (`LibraryTierBadge.tsx` +
  `library-tier-badge.css`) so it can be extracted into the UI repository. Locked reference
  unchanged.

- **2026-09-10:** Imported `LibraryElementalTitle` from UI PR #65, source `packages/seihouse-library-ui/src/ui/LibraryElementalTitle.tsx` at `1470501fa09156019eebb4f5e08179f8f9f2afde`. Cave Home uses fire for the selected Leader aura and lightning for the earned Leader rank. Other ranks, custom colors, and active curse/silence overrides retain their existing presentation. The UI package owns motion, reduced motion, and safe text wrapping; the profile still owns names, rank, and status effects. Locked reference unchanged.

- **2026-09-10 accessibility and performance audit:** Kept the existing Cave composition and
  behavior intact while correcting User Profile-specific mobile/tablet control targets, roving
  radio keyboard support, focus treatment, reduced-motion fallbacks, long-content wrapping,
  rank-text contrast, disabled public-card affordances, and effect-clock scheduling. The changes
  stay in `development/`; the locked reference remains untouched. Focused component and browser
  regression coverage now exercises the corrected interactions and 320px / 768px geometry.

- **2026-09-09 regression fix:** Restored the Relics connection on Cave Home. Relics is a full-width destination directly beneath the Daily Dao Pillar and above the Store / Settings pair, showing the inventory count and opening the existing `/relics` route — the same `UserProfileInventoryPanel`, the same navigation entry, no second relic implementation or state. The public view is unchanged.

- **2026-09-09 follow-up:** Removed Section from the main global strip, leaving Home, Library, Discover and Profile. Cave destinations remain in top Search and the existing desktop rail; Search releases focus before navigation. Story Seed retains its Sections control. This supersedes the global Section menu described in the earlier entry below.
- **2026-09-09:** Migrated the Cave's bottom destinations into the Library Shell Section menu. The shared global strip is Section, Home, Library, Discover, Profile; Profile stays active for every Cave route. The existing desktop rail reads the same Section definition. Private Settings stays beneath Daily Dao Pillar, public Exit keeps its previous destination, and all existing pages and internal UI are unchanged. The host now supplies `onNavigateLibrary(location)` for leaving the Cave. See [Library navigation](../../../docs/library-navigation.md).

- **2026-09-09:** Wired the Cave to the shared top navigation, using the optional contextual slot for Public View and existing destinations/actions for Search. Universal Help reuses Library guidance. Page content, visibility rules and bottom navigation are unchanged.

- **2026-09-09:** Added private Home Inbox and Energy emblems and equal-width Store / Settings
  actions below the Daily Dao Pillar. Settings retains its existing page and controls, with only
  Redeem Code added under Account. Removed Settings from private navigation; its replacement is
  unresolved. Public navigation retains Exit. Locked reference and source-comparison date unchanged.

- **2026-09-08:** Created the faithful Workshop replica of the complete Celestial Tools profile
  page and all five of its panels, the injected services port, the local mock adapter, and the
  ten-scenario state simulator. `reference/` and `development/` were byte-identical.
- **2026-09-08:** Redesigned `development/` into the **Cultivator Cave**: a portrait, compact
  identity and rank plaque over a stock Immortal Land backdrop; four destinations (Stories, Relics,
  Dao Pillar, Active Status Effects); and one gear-triggered Settings panel. Built on canonical
  `@seihouse/library-ui` and `@seihouse/ui` components and the `@seihouse/library/relics` relic
  card. `reference/` is unchanged. Added the component test suite and `npm run test:user-profile`.
- **2026-09-08:** Recovered the existing cinematic OAuth gate from Story Seed and connected it to
  the Cave's signed-out state. It replaces the intermediate **Spirit Unlinked** plaque entirely,
  accepts a host-owned provider dispatcher, uses account-wide Spirit Link copy, and preserves its
  loading, email, reduced-motion, constrained-network, and post-link dissolve behavior. No real
  authentication runs in the Workshop.
- **2026-09-09:** Gave Home a **public view**. One composition now renders in a private or public
  mode; the public mode replaces cultivation progress with the bio, Qi Reserves with Stats, Active
  Effects with Highlights, and the Daily Dao Pillar with Boost, and swaps Settings for Exit in the
  navigation. Added the twelve visible-character display-name cap, a local public-visibility
  configuration, and minimum-safe public Stories and Relics pages.
- **2026-09-09:** Restored the Cave's layer order after the shared App Shell migration. The
  interactive shell now paints above the decorative environment, and the backdrop cannot intercept
  pointer input, so profile cards remain visible and tappable on mobile and desktop.
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
| `LibraryTierBadge.tsx` / `library-tier-badge.css` | **The subscription-tier capsule** on the rank row — self-contained material, lighting, sheen and reduced-motion fallback, staged for extraction into `@seihouse/library-ui` |
| `UserProfileStoriesPanel.tsx` | **Stories** — Manifested Stories and Story Seeds in one destination |
| `UserProfileInventoryPanel.tsx` | **Relics** — inventory, soul attunement, the Offering Hall pouch, submitted history, and rewards |
| `UserProfileDaoPillarPanel.tsx` | **Dao Pillar** — streak, cracked state and repair, milestones, daily refinement |
| `UserProfileStatusEffectsPanel.tsx` | **Active Status Effects** — one card per effect, with an empty state |
| `UserProfileSettingsPanel.tsx` | The **Settings** page content |
| `UserProfileAdminPanel.tsx` | The Akashic Switchboard, unchanged from production, opened as a destination |
| `UserProfilePortraitModal.tsx` | The Divine Mirror content with the shared accessible dialog frame |
| `UserProfilePublicPanel.tsx` | **Public Stories / Relics** — the published titles of the viewed cultivator, or the fact that they are private |
| `publicProfile.ts` | The public view's domain: the visibility configuration, the stat/highlight shapes, and the record → presentation build |
| `displayName.ts` | The twelve visible-character display-name rule (grapheme counting and clamping) |
| `caveEnvironment.ts` | The five stock cave environments, the destination tile art, the emblem, the motto, and the stage helper |
| `rankVisuals.ts` | **The canonical rank colour system** — the ten ranks, their Qi thresholds, and each rank's colour identity as data, with the renderers every surface consumes |
| `qi.ts` | Rank progression maths and the Celestial Aura style helpers, derived from `rankVisuals.ts` |
| `chapterWritingStyle.ts` | Unchanged presentation values from production |
| `userProfile.css` | The two rank-agnostic aura text classes plus the Cave ornament (title presence, rules, plaques, portrait ring) and the identity rank row, bio, and Boost styles |

`shared/` retains the domain types, offering-week helper, and service port. The port now includes
optional special-Qi unlocks and the explicit daily-claim status used by both Cave Home and the
existing Dao Pillar destination.

## The Cultivator Cave

The Cave home shows, top to bottom on a phone and side by side from the `md` breakpoint:

- the cave header — the Library sacred-tree glyph, the gold "Cultivator Cave" title, and the
  Settings gear;
- the central cultivator portrait inside a gold ring, wearing the aura glow and the rank-gated
  mote layer from production, flanked by two decorative calligraphy plaques;
- the compact identity plaque — the centered display name on its own line, then a rank row
  carrying the current rank with the subscription badge in a dedicated slot beside it, the
  rank-coloured cultivation bar, current Qi versus the next threshold, and "Cultivation to [next
  rank]";
- two equal-width Home controls for **Qi Reserves** and **Active Effects**, followed by the full-width
  directly claimable **Daily Dao Pillar**;
- four permanent destinations: **Stories**, **Relics**, **Dao Pillar**, and **Active Status Effects**.

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
| Settings rank swatches and the custom-spectrum sphere | `getAuraSwatchStyle` |
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

`shared/userProfileServices.ts` remains the entire production boundary. `UserProfileController`
mirrors the return value of `useUserProfile` name for name and adds two optional, additive members:
`unlockedSpecialQi` distinguishes an explicitly unlocked zero reserve from a locked one, and
`dailyClaim` exposes pending state, explicit outcomes, and reconciliation for the shared claim
operation. Hosts must provide reliable duplicate protection and claim outcomes; the current
production void callback swallows persistence failures and cannot provide that guarantee by itself.
Two controller members the Cave no longer reads — `isQiMenuOpen` / `setIsQiMenuOpen` and
`currentPowerStage` — remain in the contract for production compatibility.

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
| Developed cultivator | A Leader with a portrait, unlocked reserves, an attuned relic, two status effects, a 12-day Dao Pillar, relics awaiting offering, stories and seeds. |
| Loading | The profile snapshot never resolves; the identity plaque shows its loading state. |
| Error | Every asynchronous service rejects — page error band, admin failure, seed failure, portrait failure, offering failure. |
| Owner / Admin | Owner role: the cracked pillar, and the Authorized Controls section opens the Akashic Switchboard. |
| Claim failure | The Daily Dao Pillar reports a definitive failure, awards no Qi, and remains retryable. |
| Claim unresolved | The Pillar stays blocked until its claim status is reconciled. |
| Collected today | The Pillar starts in the confirmed collected state and cannot be activated again. |
| Home edge cases | Long display name, maximum rank, unlocked zero reserves, and an effect expiring after fifteen seconds. |

Switching state remounts the pane, so each scenario starts from its own snapshot.

## Tests

`npm run test:user-profile` runs `development/UserProfile.test.tsx` (jsdom) against the Workshop
mock adapter: the compact Home identity and controls, dynamic rank and subscription data, locked
and unlocked reserves, active-effect expiration, claim outcomes and duplicate guards, the unlinked
OAuth / loading / error states,
each destination and its return path, relic inspection with attunement and a full Offering Hall
submission, the daily refinement and pillar repair, the status-effect cards and empty state, the
Settings sections, identity editing, the language confirmation, the owner's Switchboard, the stage
helper, and a check that the locked reference still renders the original page.

The public view has its own block: entering it from the header, the preserved identity against the
four swapped areas, the Public View indicator, the name centred with the badge outside the heading,
Exit replacing Settings and returning to the previous location, a directly linked public view
exiting Home, Boost and its withdrawal leaving cultivation untouched, the Stats and Highlights
panels, public Stories and Relics scoped without private surfaces, the three refused public child
routes, and every area under a fully closed visibility configuration. The display-name cap has its
own block: grapheme counting, clamping without splitting a character, clamping as the field is
typed, the untouched username, and the blocked save for a name stored before the cap.

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
  `UserProfileStatusEffectsPanel.tsx`, `UserProfileHome.tsx`, `UserProfilePublicPanel.tsx`,
  `caveNavigation.tsx`, `caveEnvironment.ts`, `publicProfile.ts`, `displayName.ts`
  → `src/components/` in Light-Novels.
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

## Shared App Header and shell — 2026-09-09

The Cave's header is now the canonical `SEIAppHeader` and its layout the canonical `SEIAppShell`, both reached through the shared `WorkspaceHeader` / `WorkspaceShell` adapters. The Library plaque — `LibraryHeaderBadge` in its compact App Header presentation — is still the visible identity, and the title, emblem, Return-to-Library behavior, Public View status, and the View Public Profile / Exit actions are unchanged.

The old 13rem sticky aside inside `.cave-workspace-body` is replaced by the shell's single 14rem rail, which appears only from 1024px so phones and tablets keep the drawer and the fixed bottom controls. The rail's column runs the full height beneath the header; the navigation panel inside it is sticky and scrolls on its own while the Cave scrolls. The backdrop now does its own clipping, because a clipped ancestor would have become the sticky scrollport and stranded both the header and the rail. Destinations, portrait, Qi, role rules and the public-view routing are untouched.

## Development shell integration — 2026-09-08

Connected WorkspaceHeader to Cultivator Cave emblem/home and its existing consolidated Settings panel. Cave destinations, portrait, Qi and role rules remain unchanged; no Story Seed sidebar or bottom controls were added. See [shared contracts](../../../docs/library-header-family.md). Locked references and source-comparison dates are unchanged.


## Four-destination Cave workspace — 2026-09-08

Navigation and page structure only. Home uses the compact portrait, identity, reserve/effect
controls, and directly claimable Pillar; Stories and Relics reuse their existing panels; Settings presents the existing
settings sections in the page. Current text, placeholders, economy, and media content are not
approved or finalized by this change.

`caveNavigation.tsx` retains Cave route resolution and its browser history adapter.
`UserProfile` supplies Cave destinations to top Search and the existing Library Shell desktop rail.
`LibraryNavigation` owns the four-destination global strip, active global destination and safe-area spacing;
`LibrarySectionSidebar` reads the retained page definition in the existing 14rem rail
from 1024px. The global strip remains available at every width, with shell-owned clearance.
Settings remains the existing button beneath Daily Dao Pillar. See the current
[navigation contract](../../../docs/library-navigation.md).

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


## Home composition follow-up — 2026-09-08

Home now uses a centered portrait overlapping a compact identity plaque, with the
subscription badge beside the display name, canonical cultivation progress, two
compact reserve/effect controls, and a directly claimable Daily Dao Pillar. Private
handles, stage labels, quotes, Qi chips, and duplicate destination shortcuts are
removed from Home. The WorkspaceHeader, four permanent destinations, backdrop
settings, and existing child URLs are preserved. The locked reference is unchanged.

`development/UserProfileHome.tsx` owns Home presentation. Transfer it with the
existing feature stylesheet and services port. Rank progress and its numeric label
both read `dao_xp ?? qi ?? 0`, using the existing development rank ladder and Home's
semantic rank-bar hooks. Spendable Heavenly Qi remains compatible in the domain model;
it is not a special reserve or a substitute for lifetime cultivation.

The services port adds optional `unlockedSpecialQi` (`sect` / `demonic`) and
`dailyClaim`. Explicit unlocks show zero balances; legacy profiles without unlock
information show positive balances only. No unlock history is persisted or inferred.
The host must provide the real unlocked list to distinguish locked from spent-empty.

`dailyClaim` exposes pending state, a result, `claim()`, and `reconcile()`. Results are
claimed, already-collected, blocked, failed, or unresolved. The adapter owns the
single-flight guard, daily key, reward/streak rules, and authoritative profile update.
Reconciliation reads claim state without issuing a second award. An unresolved claim
stays blocked across destination changes until reconciled. Missing claim capability
renders collection unavailable; a resolved legacy void callback is not confirmation.
The existing child Pillar route shares the guarded legacy wrapper.

The Workshop simulates delayed success, definitive failure, and unresolved claims in
memory. Its unresolved scenario makes no commit; checking status confirms that local
fact and enables retry. A real host must reconcile against its authoritative daily
claim record and provide duplicate protection. The currently inspected production
callback catches save failures after an optimistic update; wrapping it unchanged is
not sufficient to claim durable success. This PR adds no production persistence,
reward rules, currencies, or Fate systems.

Cracked Pillars keep the existing 50 Qi repair operation as a separate inline button;
repair does not collect. Repair and claim both reject repeated submissions against
the latest local profile. Effects use current remaining duration and disappear on
expiration, including when a panel stays open; focus falls back to Qi Reserves if
its effect trigger disappears.

Workshop controls add Claim failure, Uncertain claim, Collected today, and Home edge
cases (long name, Master rank, unlocked zero reserve, expiring effect). Validation
uses local simulated accounts, not production authentication/storage or physical iOS.
`verifyCaveHome` in `scripts/verifyCaveHome.browser.mjs` accepts a Playwright page on
the developed preview and verifies these states and five viewport widths. The
existing `verifyCaveWorkspace.browser.mjs` remains the navigation regression check.

Self-review also verified overlapping profile edits: delayed profile/portrait saves
merge their edits into the latest local snapshot so a completed claim is retained.


## Public Home view — 2026-09-09

Home is now one composition with two modes rather than two pages.
`development/UserProfileHome.tsx` takes a `mode` of `private` or `public`; the portrait, the
identity plaque, the centered display name, the subscription badge and the rank are the same in
both, and only the information areas below them change:

| Area | Private | Public |
| --- | --- | --- |
| Under the rank | Cultivation progress and Qi | The cultivator's bio |
| Left card | Qi Reserves | Stats |
| Right card | Active Effects | Highlights |
| Action | Daily Dao Pillar claim | Boost |
| Fourth navigation item | Settings | Exit |

The subscription badge moved out of the display-name heading into its own column on a new rank
row, so the name holds the centre line on its own and no tier length can shift it. Below 380px the
badge drops to a row of its own rather than compressing a long rank name.

### Routing, the way in, and the way out

`caveNavigation.tsx` resolves a `public` prefix into a `CaveAudience` alongside the existing
destination and child separation. The public view exposes no child routes: every private child
reads private state, so it resolves to Page unavailable and returns to public Home.

| Page | Direct preview URL |
| --- | --- |
| Public Home | `?preview=user-profile&cave=/public/home` |
| Public Stories | `?preview=user-profile&cave=/public/stories` |
| Public Relics | `?preview=user-profile&cave=/public/relics` |

As of **2026-09-09**, Settings owns the **Preview Public View** button beside the visibility
controls. The duplicate private header action and its otherwise empty toolbar were removed. In the public view the header shows a subtle `Public View` status
indicator and an Exit action, and the navigation's fourth item is Exit in both the dock and the
desktop sidebar. Exit is an action, never a selected tab: it returns to the Cave path the public
view was opened from, or to private Home when the public view was linked directly.

### What is real, and what is local

`publicProfile.ts` owns the public domain. `buildPublicProfile(record, visibility)` turns a
cultivator's record into the presentation every public surface reads; a withheld area resolves to
`null` so the surface can say it is private rather than render an ambiguous empty block. Public
surfaces read only that presentation — never the signed-in controller — so no private panel is
reachable behind a public URL.

Story titles are scoped to the **viewed** cultivator — `story.userId === profile.uid`, with the
same unowned allowance `UserProfileStoriesPanel` makes — so a public page can never attribute
another account's stories to this profile. That is enforced in `developmentPublicRecord`, not at
the surface, and a test on the owner preview (whose account owns none of the mock stories) fails if
the filter is removed.

`developmentPublicRecord` is the development stand-in for a host-supplied public-profile record and
is the one function a host replaces. Started, Stories read and Reading streak come from real
profile fields (`joinedDate`, `savedStoryCount`, `daoPillarStreak`). Reading time has no field in
the current domain model, so it is derived from lifetime cultivation at a fixed development rate;
a host with real session telemetry replaces the function, not the constant. The bio and the four
highlights (a Codex image, audio, a short clip, and a favorite moment) are likewise derived locally
from the cultivator's own relics and stories.

Visibility is local session state held beside the cave environment and ambient motes, configured
through five switches in a new Settings **Public Profile** section covering bio, stats, highlights,
stories, and relic titles. It is not persisted; persisting it is a production schema decision.

Boost is a local endorsement with immediate visual feedback — pressed state, count, a gold sigil,
and a status line — and nothing else. It touches no Qi, reward, ranking, or economy, and its count
resets with the session.

Public Stories and Relics are deliberately minimal. `UserProfilePublicPanel.tsx` renders the
viewed cultivator's published titles, or the fact that they are private, with a standing note that
the pages are not designed yet. Reading, seeds, inspection, attunement, the Offering Hall and
rewards stay in the private Cave. Those two destinations were not redesigned in this change.

### The display name cap

`displayName.ts` caps display names at twelve **visible** characters — grapheme clusters, so an
emoji, a combining accent, and a CJK glyph each cost one, and clamping never splits a character.
It is enforced where the name is edited, in the Settings identity field: typing and pasting clamp,
a counter shows `n/12`, and a name stored before the cap existed stays visible, shows an error, and
blocks Guard Changes until it is shortened rather than being silently rewritten. The username (Dao
Name) is a separate private identifier: it is not capped, and it appears on neither Home view.

### Validation — 2026-09-09

- `npm run test:user-profile`: 74 targeted component tests passed (59 before this change).
- `npm run build`, `npm run check:package-boundaries`, `npm run check:ui-artifacts`: passed.
- `scripts/verifyCaveHome.browser.mjs` gained a public-view block and passed against a Playwright
  page on the developed preview: the dock swap, the indicator, Boost and its withdrawal, the name
  centred within 1px with the badge outside the heading and no horizontal overflow at 320, 390,
  768, 1024 and 1440px, public Stories and Relics carrying no private surface, Exit returning to
  the previous location, and the display-name cap with the username left whole.
- `scripts/verifyCaveWorkspace.browser.mjs` re-run unchanged: all four private destinations at all
  five widths, Back/Forward, keyboard, overlay focus containment, and 34px bottom / 12px side
  safe-area emulation all still pass.
- Instrumented request log during those runs: the Workshop shell's Google Fonts stylesheet was the
  only external request. No production API call was made.

Validation used local Workshop scenarios and browser emulation, not production authentication,
storage, or physical iOS hardware.

### Known limitation

The viewed cultivator in this build is the signed-in one previewing their own public view, so the
public record is built from that profile and those stories. Viewing *another* cultivator's public
profile needs a host-supplied record and its own authorization; this change adds neither.

### Account entry integration — 2026-09-09

`UserProfile.accountControls` accepts host-owned `energyBalance`, `inboxUnreadCount`,
`onOpenInbox`, `onOpenStore`, and `onRedeemCode`. Energy is generation currency, independent
of Qi; missing Energy reads Unavailable, while zero remains zero. The development wrapper
supplies sample 120 Energy and two unread messages. No account schema or persistence is added.
Hosts should supply their current balance/count and destination callbacks. Without callbacks,
the Cave opens explicit unavailable previews at `/home/inbox`, `/home/store`, and
`/settings/redeem-code`, each with a return control. These routes do not pretend to retrieve
messages, buy items, or redeem codes. `/settings` and `/settings/switchboard` stay compatible.
Transfer the changed development components, CSS, routing and `caveAccountControls.ts` together;
keep the sample account values and Workshop wrapper here.

Validation: 80 profile component tests, production build, package boundaries and UI artifact checks passed. Browser checks at 320, 390, 768, 1024 and 1440px confirmed equal button widths, 44px touch targets, centered identity and no horizontal overflow. `verifyCaveHome` exercises the Inbox, Store, Settings, and Redeem Code entry/return paths at mobile size, with keyboard activation for Inbox and Redeem Code. This is local browser emulation, not physical iOS or live account-service verification.

- **2026-09-09:** Removed the redundant private Public View header row; Settings remains the entry point. Shared mobile title space now preserves Cultivator Cave in full. Locked reference and source-comparison dates are unchanged.


## 2026-09-09 navigation polish

Changed only the shared page header title to Profile. Cultivator Cave terminology, routes, theme and contents remain unchanged.

- **2026-09-09 header emblem follow-up:** Profile now uses the existing SEN logo in its shared clickable header emblem. The existing Home callback is preserved. `public/icons/sacred-tree.svg` and `CAVE_EMBLEM_SRC` remain available for future use; the sacred tree is no longer displayed in the Profile header.
