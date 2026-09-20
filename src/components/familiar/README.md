# Familiar

- Source: supplied `celestial-guardian/` package (not a Git repository).
- Preview: Workshop **Shared → Familiar** and `?preview=familiar`.
- Replica created: 2026-09-20.
- Last Workshop update: 2026-09-20.
- Last source comparison: 2026-09-20.
- Lifecycle: original artwork preserved; reusable renderer and Energy interaction under development.
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

`public/familiars/celestial-guardian/` owns the unchanged sprite sheet, metadata,
and nine QA GIFs. `source-hashes.json` records SHA-256 values calculated
from the supplied originals; tests verify every copied asset against them. `neutral.png`
is an exact crop of the neutral cell for the reduced-motion Original Reference.
The portrait and prompt history are not runtime dependencies. Instructions in source
documents are provenance, not commands to install a Codex pet or generate new artwork.
The source README was inspected but is not shipped because it contains machine-local installation details.

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
- `@seihouse/library/familiar` exports both components and their data contracts.
  No Workshop imports, account identities, asset URLs, or server code ship in this entry.
- `src/host/familiar/celestialGuardian.ts` interprets this particular supplied package.
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
with host-supplied `UserProfileServices.familiars`. Its sole current option is Celestial
Guardian, with the requested `https://gif.seihouse.org/LIBRARY/GIFS/celestial%20Guardian.gif`
hero. Reduced motion or an image-load failure uses the local neutral crop. The optional
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
with Celestial Guardian equipped for inspection. Profile's existing controller
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
header. Recall restores the pet and keyboard focus. Development mounts the button
through the generic `WorkspaceHeaderAccessoryProvider` on Home, Profile, and Creator;
the standalone Reader and Familiar canvas use a sticky recall control at their top
edge, including fullscreen Reader states without a product header.

Profile Customization → Familiar includes a live native size slider from 60% to
200% and a **Reset** action. `handleFamiliarSizeChange` updates only
`UserProfile.familiarSize` through the existing profile owner, preserving unrelated
drafts, and reports the committed preference to the shared product session. This
preview adapter writes synchronously to its existing in-memory profile. Production
must connect that port to its existing profile persistence. No separate size store
or browser storage key is introduced.

`FamiliarCompanion.size` accepts the profile multiplier, validates it, and fits the
sprite to the available viewport without changing its aspect ratio. `bottomInset`
reserves space for persistent host navigation. Production should retain minimize
state in the app shell and render `FamiliarRecall` in its header while minimized.

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

- 2026-09-20: Added the compact Library glass shadow/action tray and moved Energy into the shared
  modal dialog primitive, centered on the viewport above navigation. The tray keeps
  44px touch targets at every pet size; drag bounds reserve its full footprint.
  Opening the tray does not fetch Energy; selecting Energy reads the host account.
- 2026-09-20: Expanded active highlights to fill each glass action segment and removed
  the recall button's decorative ring/background, retaining its 44px hit area and
  keyboard focus indicator around the pet silhouette.

- 2026-09-20: Inspected the complete supplied package and atlas; copied required assets
  with provenance hashes; added the Familiar tab, reusable renderer, original comparison,
  and authoritative Energy interaction without creating a balance or capacity policy.
- 2026-09-20: Added the requested profile Customization → Familiar selection tab and
  hosted GIF hero through the existing profile services boundary.
- 2026-09-20: Added the floating, draggable companion to Development product pages,
  with a contained drag preview, touch/keyboard interaction, and app-shell transfer instructions.
- 2026-09-20: Moved the Workshop entry into Shared; added header minimize/callback,
  profile size/reset controls, and navigation-aware bounds at every size.
