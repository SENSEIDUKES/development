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
- **Replica status:** faithful replica

The page is reached in production from `src/App.tsx`, which renders `<UserProfile currentUser
stories onLogout onNavigateHome />` (around `App.tsx:697`). Verified against `Light-Novels`
`main` at commit `32f9e74`.

## Workshop history

- **2026-09-08:** Created the faithful Workshop replica of the complete Celestial Tools profile
  page and all five of its panels, the injected services port, the local mock adapter, and the
  six-scenario state simulator. `reference/` and `development/` are byte-identical.

## Folder layout

```
reference/    — untouched replica of production, locked
development/  — the active Workshop version, started as a copy of reference/
shared/       — the services port, domain types, and the unforked offering-week helper
```

Both forks contain the same ten files:

| File | Origin |
| --- | --- |
| `UserProfile.tsx` | `src/components/UserProfile.tsx` |
| `UserProfileAdminPanel.tsx` | `src/components/UserProfileAdminPanel.tsx` |
| `UserProfileInventoryPanel.tsx` | `src/components/UserProfileInventoryPanel.tsx` |
| `UserProfilePortraitModal.tsx` | `src/components/UserProfilePortraitModal.tsx` |
| `UserProfileSettingsPanel.tsx` | `src/components/UserProfileSettingsPanel.tsx` |
| `UserProfileStoriesPanel.tsx` | `src/components/UserProfileStoriesPanel.tsx` |
| `qi.ts` | presentation exports of `src/lib/qi.ts` |
| `chapterWritingStyle.ts` | option exports of `src/lib/chapterWritingStyle.ts` |
| `userProfile.css` | the two Celestial Aura classes from `src/index.css` |

`shared/` holds `types.ts` (domain types trimmed from `src/types.ts`),
`userProfileServices.ts` (the port), and `offeringWeek.ts` (`getCurrentOfferingWeekId`,
copied verbatim from `src/lib/artifacts.ts`).

## What was copied

Every JSX body, class string, icon, animation, and conditional branch of the six components was
copied verbatim from production. The only edits are import paths and the five lines noted under
*What was changed* below. Nothing was simplified, restyled, or reorganised.

That covers the whole user-facing experience:

- the Celestial Tools shell, Sever Link, and the owner/admin tab strip;
- the "Spirit Unlinked" cloud-linking screen;
- the avatar ring with its rank-gated particle layer and aura glow;
- the Celestial Portrait button and the Advanced Tools popover (Aether Router, Shortcuts, Import
  Scroll, Backup All);
- the Dao rank badge, the Qi Cores menu with all three cores and their tooltips, the Soul Attuned
  banner, and the cultivation progress bar;
- identity editing, the full Celestial Aura tier picker with locked-tier progress, and the
  Transcendent Custom Spectrum colour input gated at 25k Qi;
- Ascent Commenced, Scrolls Accumulated, and the Daily Dao Pillar with its cracked state, repair
  button, milestone pills, and check-in;
- Active Status Effects, including challenge progress, completion, counterplay, and reward hooks;
- the Cosmic Inventory / Celestial Library Offering Hall with rarity styling, the weekly offering
  pouch, submitted history, and relic inspection;
- Manifested Realms (Active Flows) and the account Story Seeds index with per-seed and bulk export;
- Environment & Sync settings — Harmony, both language selectors, and the default chapter writing
  style;
- the Divine Mirror portrait modal (upload, drag-and-drop, description, stepped generation,
  regenerate, seal);
- the Akashic Switchboard with account and story registries, search, role and tier edits, and
  story deletion;
- the 30-second language-change confirmation modal.

## What was changed

Five deliberate edits, all of them import wiring:

1. `UserProfile.tsx` reads `useController` and `localOnlyMode` from the injected services instead
   of importing `useUserProfile` and `LOCAL_ONLY_MODE` directly.
2. `UserProfileSettingsPanel.tsx` reads `localOnlyMode`, `setLocalOnlyMode`, and
   `requestLibrarySync` from the services instead of `lib/firebase` and `lib/storage`.
3. `UserProfileInventoryPanel.tsx` reads `submitCurrentWeekOfferings` from the services and
   `getCurrentOfferingWeekId` from `shared/offeringWeek`.
4. `UserProfileStoriesPanel.tsx` reads `listStorySeeds`, `downloadStorySeed`, and
   `downloadStorySeedCollection` from the services.
5. `UserProfileAdminPanel.tsx` types `allStories` as `AdminStoryRow[]` instead of `any[]`, listing
   the fields the panel already reads. No rendering change.

`reference/` and `development/` are byte-identical, so the Development pane is currently a true
baseline for the next redesign.

## The services port

`shared/userProfileServices.ts` is the entire production boundary. `UserProfileController` mirrors
the return value of `useUserProfile` name for name, so transferring back is a provider swap rather
than a rewrite. The remaining members cover the four production modules the panels import on their
own.

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
| `lib/artifacts.submitCurrentWeekOfferings` | a local reward total |
| `lib/storySeedStorage` / `lib/storySeedFormat` | the fixed seed list; export is logged, never downloaded |
| `lib/storage.performSync`, `lib/firebase` local-only mode | logged as excluded actions |
| `useAppStore` (Aether Router, Shortcuts, library import/export) | logged as excluded actions |

Everything else runs for real against local state, reproduced from `useUserProfile.ts`: the streak
and milestone maths, the 30-second language-confirmation countdown, the attunement and
status-effect replacement rules, and the optimistic writing-style save with its rollback.

Actions the Workshop deliberately does not perform are recorded in a preview-only
"excluded production actions" panel rendered by the workspace, so the boundary stays visible while
inspecting. That panel is Workshop tooling and is never transferred.

### Available preview states

| State | What it shows |
| --- | --- |
| Spirit Unlinked | No account, cloud mode on — the linking screen. Linking signs the mock account in. |
| New cultivator | A freshly linked Mortal Reader: every empty state, no relics, no streak, no portrait. |
| Developed cultivator | Sage of Branching Paths with a portrait, three Qi cores, an attuned relic, two status effects, a 12-day Dao Pillar, relics awaiting offering, stories and seeds. |
| Loading | The profile snapshot never resolves. |
| Error | Every asynchronous service rejects — page error band, admin failure, seed failure, portrait failure. |
| Owner / Admin | Owner role with the Akashic Switchboard and working role/tier edits. |

Switching state remounts the pane, so each scenario starts from its own snapshot.

## Reusable Workshop dependencies

- `src/workshop/FeatureWorkspace.tsx` — the shared Original Reference / Development / Compare shell
  and the Workshop Controls menu.
- `src/workshop/manifest.ts` and the `previewRegistry` in `src/App.tsx`.
- The Workshop theme tokens in `src/styles.css` (`void`, `signal`, `portal`, `human`,
  `font-display`, `font-sc`).

The relics feature already replicates `UserProfileInventoryPanel` for its own Relic Reveal work
(`?preview=relics-gallery`). That replica is a rarity-card gallery with a reveal flow, not the
profile's Offering Hall, so this feature keeps its own copy rather than importing across feature
folders. If the two are ever reconciled, the Offering Hall is the surface to consolidate.

## Production dependencies intentionally excluded

Firebase Auth and Firestore, PostgreSQL through `lib/persistence`, Cloudflare R2 and the
profile-picture asset contracts, the Gemini image-generation route, the admin overview and
mutation routes, the Zustand app store, `lib/storage` sync, `lib/storySeedStorage`, real story
persistence, and every secret or environment variable. Verified by instrumenting the preview: it
issues no external network request beyond the Workshop shell's own Google Fonts stylesheet.

## Known differences from the source

1. **Neutral text tokens.** The Workshop's `styles.css` sets `--color-neutral-500: #737373`;
   Light-Novels sets `#a3a3a3`. Secondary label text reads slightly darker here than in
   production. Judge fine contrast decisions against production, not the Workshop.
2. **Portrait modal containment.** The Divine Mirror overlay is `fixed inset-0`, but its ancestor
   card carries `backdrop-blur-sm`, which makes that card the containing block. The overlay
   therefore scrolls with the profile instead of pinning to the viewport. This is production's own
   markup and behaviour, reproduced exactly — not a Workshop artifact. The language-confirmation
   modal is rendered outside that ancestor and does pin correctly.
3. **Generation step labels.** `useUserProfile` advances `generationStep` through six messages,
   but the modal only labels four (`Features`, `Aura`, `Soul`, `Completing`), so a real generation
   long enough to reach step 4 renders "Manifesting undefined…". The mock's 9 s generation lands on
   step 3, so the replica does not show it — the defect is production's and is recorded here.
4. **`currentPowerStage`.** Production reads it from the active story's narrative memory. No story
   graph exists in the Workshop, so the portrait modal receives a fixed stage string.
5. **Toasts.** Production dispatches a `seihouse-toast` event after a pillar repair. There is no
   toast host in the Workshop, so that confirmation is not shown.

## Exact files needed for transfer

Once a redesign is approved, copy back from `development/`:

- `UserProfile.tsx`, `UserProfileAdminPanel.tsx`, `UserProfileInventoryPanel.tsx`,
  `UserProfilePortraitModal.tsx`, `UserProfileSettingsPanel.tsx`, `UserProfileStoriesPanel.tsx`
  → `src/components/` in Light-Novels.
- Any visual change made to `qi.ts` → the matching exports in `src/lib/qi.ts`.
- Any change to `userProfile.css` → the aura block in `src/index.css`.

Then restore the production wiring. Either revert the five import edits listed above, or — the
smaller diff — keep the port and mount one real adapter in `App.tsx`:

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
- **Do not transfer** anything under `src/workshop/previews/user-profile/`.
- Persisted values and API compatibility strings were kept exactly as production has them —
  `defaultChapterWritingStyle` option strings, the language option values including their native
  script suffixes, `premiumTier` and `role` unions, `offeringWeekId` / `status` on artifacts, the
  `seihouse-local-user-profile` and `seihouse-local-cosmic-inventory` storage keys (referenced by
  the production hook, not by these components), and the `profilePicture` naming. Do not rename any
  of them without a deliberate migration task.
- `AdminStoryRow` narrows what production types `any[]`. If the admin overview grows a field the
  panel renders, add it to the interface rather than widening it back to `any`.

## Lifecycle

1. **Import** — copy production's current implementation into `reference/`. *(done 2026-09-08)*
2. **Fork once** — `development/` starts as a copy of `reference/`. *(done 2026-09-08)*
3. **Refine** — every Workshop task modifies `development/` only. *(next)*
4. **Approve** — transfer `development/` back to Light-Novels in a separate task.
5. **Resynchronize** — refresh `reference/` from the integrated production code, update
   `source.lastCompared`, and reset `development/` for the next cycle.
