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
| `UserProfile.tsx` | The Cave shell: backdrop, header and gear, portrait and identity plaque, destination cards, destination routing, the portrait modal, and the language-confirmation dialog |
| `UserProfileCaveDestination.tsx` | The frame every destination opens into (back control, title, heading focus) |
| `UserProfileStoriesPanel.tsx` | **Stories** — Manifested Stories and Story Seeds in one destination |
| `UserProfileInventoryPanel.tsx` | **Relics** — inventory, soul attunement, the Offering Hall pouch, submitted history, and rewards |
| `UserProfileDaoPillarPanel.tsx` | **Dao Pillar** — streak, cracked state and repair, milestones, daily refinement |
| `UserProfileStatusEffectsPanel.tsx` | **Active Status Effects** — one card per effect, with an empty state |
| `UserProfileSettingsPanel.tsx` | The gear-triggered **Settings** drawer |
| `UserProfileAdminPanel.tsx` | The Akashic Switchboard, unchanged from production, opened as a destination |
| `UserProfilePortraitModal.tsx` | The Divine Mirror, unchanged from production |
| `caveEnvironment.ts` | The five stock cave environments, the destination tile art, the emblem, the motto, and the stage helper |
| `qi.ts`, `chapterWritingStyle.ts` | Unchanged presentation values from production |
| `userProfile.css` | The two Celestial Aura animations plus the Cave ornament (title presence, rules, plaques, portrait ring) |

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
sections: Identity & Celestial Aura (Dao name, display name, the tier picker, the Transcendent
Custom Spectrum, Guard Changes / Discard), Cultivator Portrait (opens the Divine Mirror), Cave
Environment (five stock backdrops and the ambient motes toggle), Language (both selectors with
the 30-second confirmation), Writing Preferences (default chapter writing style), Harmony & Sync,
Backup, Import & Export (Import Scroll, Backup All), Advanced Tools (Aether Router, Shortcuts),
Authorized Controls (owner/admin only), and Account (Sever Link).

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
| Firebase Auth (`signInWithPopup`, `auth.currentUser`) | "Link Spirit Realm" links a mock account locally |
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
| Spirit Unlinked | No account, cloud mode on — the linking plaque in the cave. Linking signs the mock account in. |
| New cultivator | A freshly linked Mortal Reader: no portrait, no relics, no streak, no effects — every empty state. |
| Developed cultivator | Sage of Branching Paths with a portrait, three Qi cores, an attuned relic, two status effects, a 12-day Dao Pillar, relics awaiting offering, stories and seeds. |
| Loading | The profile snapshot never resolves; the identity plaque shows its loading state. |
| Error | Every asynchronous service rejects — page error band, admin failure, seed failure, portrait failure, offering failure. |
| Owner / Admin | Owner role: the cracked pillar, and the Authorized Controls section opens the Akashic Switchboard. |

Switching state remounts the pane, so each scenario starts from its own snapshot.

## Tests

`npm run test:user-profile` runs `development/UserProfile.test.tsx` (jsdom) against the Workshop
mock adapter: the home plaque and cards, the Qi core chips, the unlinked / loading / error states,
each destination and its return path, relic inspection with attunement and a full Offering Hall
submission, the daily refinement and pillar repair, the status-effect cards and empty state, the
Settings sections, identity editing, the language confirmation, the owner's Switchboard, the stage
helper, and a check that the locked reference still renders the original page.

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
- Any visual change made to `qi.ts` → the matching exports in `src/lib/qi.ts`.
- `userProfile.css` → the aura block in `src/index.css` plus the Cave ornament rules.
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
