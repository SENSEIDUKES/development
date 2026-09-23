# Familiar

- Source: supplied `Familiars/Packages/` collection (not a Git repository), containing eleven validated Familiar packages.
- Preview: Workshop **Customization → Familiar** and `?preview=familiar`.
- Replica created: 2026-09-20.
- Last Workshop update: 2026-09-23.
- Last source comparison: 2026-09-22.
- Lifecycle: original artwork preserved; reusable renderer, host catalogue, and Energy interaction under development.
- Owner: Library. This first-party companion is not a SEN narrative capability.

## Source interpretation

`pet.json` identifies Celestial Guardian and `spriteVersionNumber: 2`. The supplied
`pet-request.json` describes its 1536 × 2288 WebP atlas: eight columns and eleven rows
of 192 × 208 transparent cells. Rows 0–8 contain idle (6 frames), moving right (8),
moving left (8), waving (4), jumping (5), disappointed (8), waiting (6), working (6),
and review (6). Row 0, column 6 is the visible neutral pose; unused cells are never
played. Rows 9–10 hold sixteen static look directions, clockwise from up in 22.5° steps.

The JSON has no frame durations. `animation-timing.json` records durations extracted
from the supplied `qa/previews/*.gif` files, including their longer end-frame holds.
The renderer plays the original atlas cells with those durations, without interpolating,
mirroring, recoloring, or regenerating the artwork. Motion stays inside one fixed cell;
running does not move the Familiar across the page. Each animation loops for inspection.

`public/familiars/celestial-guardian/` owns the unchanged sprite sheet, neutral crop,
and nine QA GIFs. `src/host/familiar/package-metadata/celestial-guardian/` owns the
catalogue metadata, timing data, and intake hashes. Tests verify every unchanged media
and timing asset against those SHA-256 records. The host-owned `pet-request.json` retains
only the atlas and row contract needed by the renderer, so intake-only prompts and
machine-local provenance are never served with the app. `neutral.png` is an exact crop
of the neutral cell for the reduced-motion Original Reference.
The portrait and prompt history are not runtime dependencies. Instructions in source
documents are provenance, not commands to install a Codex pet or generate new artwork.
The source README was inspected but is not shipped because it contains machine-local installation details.

### Catalogue intake — 2026-09-22

The source collection contains eleven `spriteVersionNumber: 2` packages: Celestial
Guardian, Celestial Moon Moth, Galaxy Octopus, Judgmental Jiangshi, Lady Bug, Little
Monkey King, Living Grimoire, Lucky Bake-danuki, Nine-tailed Fox, Phoenix, and Quill.
Each uses the same 8 × 11, 192 × 208-cell atlas contract. The host catalogue interprets
the package metadata and timing data at `src/host/familiar/catalogue.ts`; the renderer
does not carry character-specific frames, artwork paths, ranks, ownership, or pricing.

Every package's atlas, neutral crop, and nine direct-crop QA previews live under
`public/familiars/<id>/`; that is the complete public payload used by the renderer.
`src/host/familiar/package-metadata/<id>/` holds the renderer manifest, supplied
identity/timing metadata, and source hashes. The renderer manifest is a minimal projection
of the supplied `pet-request.json`: it preserves the actual 8 × 11 atlas and row contract
while excluding source prompts, generation logs, and local path provenance. Source-integrity
tests verify each unchanged media and timing hash and verify that the host manifest contains
only renderer data. Existing Celestial Guardian provenance predates neutral/timing entries in
its hash manifest, so its recorded source assets remain verified while the local runtime
additions are only checked for presence.

Quill was completed from its already validated v2 atlas. Its atlas and supplied
presentation exports remain unchanged. `animation-timing.json` carries standard v2 row
timings, with its supplied waving export confirming `[140, 140, 140, 280]`; nine
transparent QA GIFs are deterministic crops of the validated atlas rather than newly
generated art. `renderer-validation.json` and `IMPORT-HANDOFF.md` remain with Quill's
source package as intake evidence and are intentionally not runtime dependencies.
The supplied waving row starts and ends with lowered-paw transition cells, so Development
playback loops only raised-paw columns 1 and 2. Both the floating companion and the active
profile-card preview use that same local two-pose loop; the supplied atlas and presentation
exports are preserved.

## Modular integration

- `shared/familiar.ts` describes a host-provided atlas and animation clips.
- `development/FamiliarSprite.tsx` crops/scales the sheet and owns only playback.
  It pauses for reduced motion, hidden documents, the explicit pause control, loading,
  and failed images. Clip changes reset to frame zero; unmount clears the timer.
- `development/Familiar.tsx` pairs the renderer with the existing `SEIDialog` primitive.
  Hover, tap, or keyboard activation reveals a shadow-shaped action tray. Choosing
  Energy opens a viewport-centered dialog; Close, Escape, or an outside press
  dismisses it. The UI primitive owns focus trapping, scroll locking, and focus return;
  viewport units center the dialog and bound its scrolling body above navigation.
- `development/FamiliarCompanion.tsx` selects the supplied rightward or leftward
  running loop while the user drags predominantly in that direction, and for a brief
  keyboard arrow movement. It returns to the host-selected resting clip at release.
  Vertical motion retains that resting clip because the source has no vertical movement
  loop; task-status rows remain reserved for their documented task states.
- The `activity` prop mirrors the desktop Codex status priority: `running` uses
  `running`, `needs-input` uses `waiting`, `ready` uses `review`, and `blocked`
  uses `failed`. A direct drag temporarily takes priority so the companion visibly
  moves with the user; an explicit `animation` remains an inspection override.
- `@seihouse/library/familiar` exports both components and their data contracts.
  No Workshop imports, account identities, asset URLs, or server code ship in this entry.
- `src/host/familiar/catalogue.ts` is the single Library-owned catalogue. It combines
  immutable supplied package metadata with host presentation URLs, declarative rarity,
  and one `isDefault` flag. `celestialGuardian.ts` is a backwards-compatible alias for
  existing consumers.
- `familiarOptions()` projects catalogue data to selection UI while accepting a host
  availability resolver. Rarity never grants ownership, availability, acquisition, or
  Store pricing.
- `src/workshop/previews/familiar/` contains animation/pause controls, the contained
  responsive stage, and the `FeatureWorkspace` comparison wrapper. The locked
  `reference/FamiliarReference.tsx` displays the supplied waving GIF.

## Energy authority and limitation

The user explicitly requested authoritative Energy data; that instruction overrides
Mode A's usual mock-only preview rule. The preview derives its identity from the same
default profile scenario (`Workshop Cultivator`) used by the existing Profile workspace,
then mounts `createHttpEnergyClient` through `EnergyClientProvider`. Each panel opening
reads `/api/library-economy?capability=energy` through `useEnergyAccount`. There is no
Familiar ledger, balance fixture, browser-persisted balance, grant, deduction, or reset.
The Workshop has scenario identities rather than a shared authenticated session;
this preview is explicitly labelled with the default profile identity.

The panel displays the server's settled `balance`, and `available` when reservations
are held. The existing Energy contract has **no account maximum**. It therefore says
**Maximum: Not configured**. `developmentControls.maxGrant` limits one grant operation;
it is not a capacity. Establishing an account cap would require a separate Energy
policy change. Loading, missing client, and request failures never fabricate a balance.
Retry uses the same client, and reopening fetches a fresh server snapshot.

## Transfer

Profile Settings → Customization → Familiar uses the reusable `FamiliarSelection`
with host-supplied `UserProfileServices.familiars`. Development passes all eleven
catalogue entries for inspection, including their host-supplied rarity and Quill's
`isDefault` status. Reduced motion or an image-load failure uses the local neutral crop.
Hosted GIF URLs belong in the host catalogue and can be replaced without changing the
renderer or selection component. The optional
`handleFamiliarChange` controller port saves only `UserProfile.familiarId`; the Workshop
adapter retains this in the existing profile state for the session, as with its other
profile edits. There is no new store or claim that this is production persistence.
An unavailable option is disabled, and the host save path must validate entitlement.
No purchase, earning rule, or unlock backend is introduced by this selector.

Consume `Familiar` or `FamiliarSprite` from `@seihouse/library/familiar` with Library
styles and existing UI peer dependencies. Supply a `FamiliarDefinition` with the host's
asset URL. For this character, transfer the host definition, metadata, timing data, and
sprite sheet and adapt the URL to the destination's asset host. Mount the destination's
existing `EnergyClientProvider` with its verified current-user token. Keep the Workshop
identity adapter, selectors, stage, reference GIFs, and navigation in Development.
No Light-Novels files were changed.

### Floating companion and product-page integration — 2026-09-20

`FamiliarCompanion` is the reusable app-shell mount exported by
`@seihouse/library/familiar`. It portals a sprite (104px at the default size) above page content;
pointer capture supports mouse, pen, and touch dragging. A six-pixel threshold
separates dragging from tapping, and cancelled gestures cannot open Energy.
Arrow keys move the focused pet. Resize, scrolling, and the mobile visual viewport
clamp it to the visible page. The existing sprite renderer preserves package
animation timing and reduced-motion behavior. `Familiar` also accepts host-owned
panel children for future actions; no support-ticket backend is introduced.

The Development Library document mounts one companion around Home, Library,
Discover, and Profile, so navigation retains its position. Creator also mounts
it in its existing document. Standalone Profile, Reader Chamber, and the Familiar
test stage constrain it to their visible Development canvas. Hidden Compare
panes, Original Reference, signed-out accounts, and the Workshop catalog do not
produce a floating companion. No global mount was added to the Workshop App.

`ProductFamiliarPreview` is Workshop-only composition: product fixtures start
with the catalogue default, currently Quill, equipped for inspection. Profile's existing controller
reports loaded/committed selection and account changes into that session; nested
pages reuse the same mount. Energy still comes from the real
`/api/library-economy?capability=energy` ledger for that account. Selection and drag position are session state, not new
production persistence. A document reload resets the preview position.

For production transfer, mount **one** `FamiliarCompanion` under the existing
authenticated Energy provider and above the router's product-page outlet, with
the definition selected by the current account's persisted `familiarId`. Keep it
mounted across route changes, key it by account identity, and remove it on
sign-out or no selection. Omit `boundaryRef` to use the app viewport. Do not
transfer `ProductFamiliarPreview`, Development identity tokens, or fixture defaults.
The Library companion remains outside the portable SEN Reader implementation.

### Size, minimize, and callback — 2026-09-20

Familiar is now one card inside Workshop **Shared**, preserving `?preview=familiar`
and its existing comparison workspace. It remains a Library-owned capability.

The action tray exposes **Energy** and **Minimize Familiar**. The host controls `minimized` and
`onMinimize`; the mounted companion keeps its drag position while hidden and stops
sprite playback. `FamiliarRecall` provides a 44px accessible button for the host
header. Tapping the silhouette opens a glass menu with Energy and Expand. Energy
uses the same centered dialog while the pet stays docked; only Expand invokes
`onRecall` and restores the floating pet and keyboard focus. Development mounts the button
through the generic `WorkspaceHeaderAccessoryProvider` on Home, Profile, and Creator;
the standalone Reader and Familiar canvas use a sticky recall control at their top
edge, including fullscreen Reader states without a product header.

Profile Customization → Familiar includes a live native size slider and **Reset**.
Desktop retains 60–200% with a 100% default. Mobile shows 10–100%, mapping linearly
to the existing 0.6–1.5 multiplier: 10% = old 60%, 50% = old 100%, 100% = old 150%.
The mobile default and Reset are **50%**. Narrow layouts (up to 767px) and touch-only
devices use this policy, including landscape phones. Larger saved desktop sizes are
capped for mobile display without a profile write; returning to desktop restores the
saved size. `handleFamiliarSizeChange` updates only
`UserProfile.familiarSize` through the existing profile owner, preserving unrelated
drafts, and reports the committed preference to the shared product session. This
preview adapter writes synchronously to its existing in-memory profile. Production
must connect that port to its existing profile persistence. No separate size store
or browser storage key is introduced.

`FamiliarCompanion.size` accepts the profile multiplier, validates it, and fits the
sprite to the available viewport without changing its aspect ratio. `bottomInset`
reserves space for persistent host navigation. Production should retain minimize
state in the app shell and render `FamiliarRecall` in its header while minimized.
Both surfaces must sit under the same authenticated `EnergyClientProvider`;
Development supplies that provider at the product session boundary.

## Verification

Focused tests cover source hashes, all 26 states, geometry, variable frame timing,
looping, pause/reset/cleanup, reduced motion, missing artwork, live-client reads,
held Energy, missing maximum, loading/error/retry, reopening, and dismissal.
Workshop navigation tests cover the Shared listing and existing keyboard navigation.
Package ownership and packed-consumer checks include the new public Library entry.
The repository has no lint command/configuration; TypeScript, ownership checks,
tests, production build, and `git diff --check` are its applicable checks.

2026-09-20 verification: 257 focused tests passed across Familiar, Profile, Workshop
navigation, and Energy. Production build and both packed-consumer smoke tests passed.
Real Chromium inspection covered all 26 states, the 1536 × 2288 decoded source atlas,
all nine complete frame sequences, 320/390/768/1440px layouts without page overflow,
live Energy HTTP 200 responses, Escape/outside dismissal, keyboard focus return, reduced
motion, direct comparison access, profile selection, and the hosted GIF's successful
192 × 208 decode. A broad suite attempt encountered unrelated browser/database timeouts;
all 41 tests in those three affected files passed in a serial recheck with a 20-second
timeout. The broad suite was not completed. Local visual artifacts are in
`output/playwright/` (not shipped).

Floating companion follow-up: 271 focused tests passed across 16 files, including
pointer/touch threshold and cancellation, bounds/resize, keyboard movement,
hidden comparison panes, nested mounts, account removal, and navigation position.
TypeScript, production build, package ownership, and both packed-consumer smoke
checks passed. Chromium inspection covered Home → Profile, normal/fullscreen
Reader, desktop mouse dragging, native touch input at 390px, and Energy panel
containment at 320px. The pre-existing Home backdrop URL was unavailable during
local QA; the Familiar atlas and Energy endpoint loaded successfully.

Review follow-up: added a live artwork-status region referenced by the trigger,
removed local-machine paths from published provenance, and omitted the source's
installation-only README. The 19 directly affected tests (including the new
accessibility regression) and production build passed after those corrections.

Size and recall follow-up: 222 focused tests passed across 10 files. TypeScript,
production build, package ownership, and both packed-consumer checks passed.
Desktop and mobile Chromium verification covered the Shared listing, live size
changes and Reset, header minimize/recall, and normal/fullscreen Reader recall.
The deployed preview requires Vercel login, so visual verification was local.

Action-tray follow-up: 22 focused tests passed across Familiar, source integrity,
and product integration. TypeScript, production build, package boundaries, and
both packed-consumer checks passed. Chromium verified native touch activation,
desktop hover, 320/390px viewport centering, desktop centering, tray alignment at
60% size, navigation clearance, minimize/recall, keyboard focus trapping and return,
Escape/outside dismissal, and reduced-motion handling.

## Workshop history

- 2026-09-23: Familiars now own the Library's active cosmetic effects. Ownership, QI training
  tiers, alternate forms and elemental titles live in the Familiar account
  (`src/server/familiars/`, `src/library/familiars/`) with its training panel in
  [`../familiar-training/README.md`](../familiar-training/README.md) and the Workshop's Rewards
  section. This renderer, the catalogue and the companion are unchanged; the Celestial Store
  now buys through the same Familiar account. The Workshop home lists this entry under
  Customization.
- 2026-09-22: Corrected Quill's waving clip to loop only its raised-paw atlas cells and
  aligned the floating companion and active profile-card preview with the local QA loop.
- 2026-09-22: Imported ten supplied v2 Familiar packages into the Library-owned
  catalogue, retaining every local runtime asset and package metadata. Added declarative
  common/rare/epic ranks and Quill's separate default status, all-eleven Development
  selection, and profile/catalogue/registry coverage. Normalized Judgmental Jiangshi's
  supplied display name and completed Quill's transparent atlas-derived QA preview set.
- 2026-09-21: Made drag animation direction follow the latest pointer sample instead
  of total distance from the drag origin. Left/right reversals now switch immediately,
  unchanged direction avoids repeated state updates, and position remains frame-batched.
- 2026-09-21: Kept one decoded atlas mounted across animation changes so activity,
  drag, keyboard, and interaction clips no longer flash the loading state. Initial
  atlas decode now uses the host-supplied lightweight still; loading remains available
  to assistive technology and visible copy is reserved for a real artwork failure.
- 2026-09-21: Mirrored the current Codex companion behavior: active, needs-input,
  ready, and blocked activity select the supplied running, waiting, review, and failed
  rows; horizontal pointer/keyboard motion selects the supplied left/right loops; and
  direct interaction keeps the supplied wave. The Familiar preview now exercises all
  four Codex activity states rather than relying on an atlas-only dropdown.
- 2026-09-20: Added the mobile 10–100% display range and 50% default/Reset while
  retaining the canonical profile multiplier and desktop range. Audited and reduced
  sprite, scrolling, dragging, hidden playback, and touch glass rendering work;
  see [performance audit and validation](PERFORMANCE.md).
- 2026-09-20: Floating and header interactions select the supplied waving clip on
  hover, tap, or keyboard focus, returning to the resting clip when disengaged.
  Familiars without a waving clip retain their normal animation. Existing pause
  and reduced-motion behavior is preserved. Verified real frame playback in Chromium.
- 2026-09-20: Added the compact Library glass shadow/action tray and moved Energy into the shared
  modal dialog primitive, centered on the viewport above navigation. The tray keeps
  44px touch targets at every pet size; drag bounds reserve its full footprint.
  Opening the tray does not fetch Energy; selecting Energy reads the host account.
- 2026-09-20: Expanded active highlights to fill each glass action segment and removed
  the recall button's decorative ring/background, retaining its 44px hit area and
  keyboard focus indicator around the pet silhouette.
- 2026-09-20: Header activation now opens Energy/Expand actions without restoring the
  pet. Both modes share `FamiliarEnergyAction`; only explicit Expand recalls it.
  Verified 23 focused tests, TypeScript/build, mobile/desktop menu use, live Energy
  while docked, explicit expansion, and keyboard dismissal/focus return.

- 2026-09-20: Inspected the complete supplied package and atlas; copied required assets
  with provenance hashes; added the Familiar tab, reusable renderer, original comparison,
  and authoritative Energy interaction without creating a balance or capacity policy.
- 2026-09-20: Added the requested profile Customization → Familiar selection tab and
  hosted GIF hero through the existing profile services boundary.
- 2026-09-20: Added the floating, draggable companion to Development product pages,
  with a contained drag preview, touch/keyboard interaction, and app-shell transfer instructions.
- 2026-09-20: Moved the Workshop entry into Shared; added header minimize/callback,
  profile size/reset controls, and navigation-aware bounds at every size.

## Future familiar intake rule

Every familiar brought into Development from Codex must carry over its complete supplied
animation contract, not just its resting art. Before integration, inspect the Codex pet
metadata/atlas and record its state names and durations in the host definition. Wire the
Codex activity bridge (`running`, `needs-input`, `ready`, `blocked`) to the familiar's
supplied active, waiting, completed, and blocked clips; wire the supplied left/right
movement loops to horizontal pointer and keyboard movement; and preserve the supplied
interaction clip for direct engagement. Add focused tests for each state and motion
direction. Never invent a task/status mapping for an unmatched row: retain it for an
explicit host event only after its Codex meaning is verified. Static look-direction cells
remain available for a host that has a verified directional-look event, but are not
substituted for movement loops. Supply a lightweight still through `placeholderUrl` so
the Familiar remains visible during its first atlas decode; animation changes must reuse
the loaded atlas rather than remounting it.
