# Familiar

Where `reference/` exists, it holds the old production version, kept as reference
material for the remake; it is not edited or refreshed. New features do not get a
reference folder. Old systems stay until each is remade on the new path; never
reconnect them as they are or re-sync with the old production app. The destination
is SEN, Library and NovelExpanded built here, guided by `NOVEL_EXPANDED.md`.

- Source: supplied `Familiars/Packages/` collection (not a Git repository), containing twelve validated Familiar packages.
- Preview: Workshop **Customization → Familiar** and `?preview=familiar`.
- First Workshop record: 2026-09-20.
- Last recorded Workshop update: 2026-10-30.
- Historical source inspection: 2026-10-06.
- Lifecycle: supplied source packages retained; the reusable renderer, host catalogue, and Energy interaction remain in Development.
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

### Companion playback — 2026-10-30

The floating companion uses `FamiliarSprite`'s `playback="companion"` mode:
idle holds each supplied frame six times longer, and an engagement/activity reaction
plays three cycles before returning to idle. An unchanged open tray or parent render
does not restart a finished reaction. The existing engagement wave remains the Library's
interaction clip. Movement and explicit Workshop atlas inspection retain raw looping;
standalone sprites default to raw looping and `playOnce` retains its single-play contract
for generation overlays. Header recall behavior is unchanged.

These cadence rules were checked against the locally installed Codex 26.1027.3384.0:
`p7i`/`b7i` in `app-initial-4267e52fe5b0.js` apply the sixfold idle holds and three
reaction cycles; `k7i` maps a target to sixteen clockwise look directions. This is
behavioral reference evidence, not a dependency on Codex's private bundled symbols.
The source atlas and GIF timing metadata remain unchanged.

`FamiliarCompanion` supplies an optional `lookAnimation` from mouse position inside
the page or bounded Workshop canvas. It takes effect only at rest; movement, explicit
inspection and reactions take priority. Leaving the page/canvas, blurring, scrolling,
resizing or touching clears the target. Reduced motion disables gaze and animation;
hidden/offscreen companions stop playback and never queue missed reactions. Looks hold
one supplied cell without a timer; frame playback updates the loaded image directly.
The app and its Workshop previews share this same Library-owned companion.

`public/familiars/celestial-guardian/` owns the unchanged sprite sheet, neutral crop,
and nine QA GIFs. `src/host/familiar/package-metadata/celestial-guardian/` owns the
catalogue metadata, timing data, and intake hashes. Tests verify every unchanged media
and timing asset against those SHA-256 records. The host-owned `pet-request.json` retains
only the atlas and row contract needed by the renderer, so intake-only prompts and
machine-local provenance are never served with the app. `neutral.png` is an exact crop
of the neutral cell, used as the catalogue's placeholder still.
The portrait and prompt history are not runtime dependencies. Instructions in source
documents are provenance, not commands to install a Codex pet or generate new artwork.
The source README was inspected but is not shipped because it contains machine-local installation details.

### Current catalogue intake

The source collection contains twelve `spriteVersionNumber: 2` packages: Celestial
Guardian, Celestial Moon Moth, Frostforged Golem, Galaxy Octopus, Judgmental Jiangshi,
Lady Bug, Little Monkey King, Living Grimoire, Lucky Bake-danuki, Nine-tailed Fox,
Phoenix, and Quill.
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

Quill keeps the same `quill` catalogue ID, common rarity, default status, and Lightning
training affinity. Its Development presentation has been replaced with a generated v2
atlas grounded in the supplied `Quill-v2.png` artwork. The new cobalt-and-cream fox-cat
has natural fur texture, gold-edged cyan Lightning markings, and a compass-star pendant.
It preserves the shared 8 × 11, 192 × 208 atlas contract and includes all sixteen look
directions. The nine transparent QA GIFs are deterministic crops of the accepted atlas.
Quill's four-frame wave raises his anatomical front-right paw (viewer-left) while the
other three paws remain planted, using durations `[140, 140, 140, 280]`. The left-running
row mirrors the right-running row at the same scale, with matching per-frame bounds.
`renderer-validation.json` and
`IMPORT-HANDOFF.md` remain with Quill's source package as intake evidence and are
intentionally not runtime dependencies.

## Modular integration

- `GenerationOverlay` reads the equipped definition through Library's
  `LoadingFamiliarProvider` (or `LibraryPresentationProvider.loadingFamiliar`).
  It reuses `FamiliarSprite`: one wave on touch or mouse hover, then a neutral pose.
  Holding hover never loops; keyboard activation also greets. Arrival holds the
  review pose. The overlay underline uses the regular shadow styling with its
  elemental colors and no interaction. `playOnce` is an opt-in request counter;
  regular playback is unchanged. Element
  affinities and form/veil colors now share `src/library/familiars/appearance.ts`;
  the account's mastered name effect does not change the Familiar's own palette.
  The provider is a projection of the existing host profile, with no storage or
  selection writes. NovelExpanded visitors use Quill until the host supplies a
  profile choice; the app still has no account/equipment page.

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
  availability resolver. Rarity supplies the Store's default price and labels the
  catalogue tier; it does not grant ownership, availability, or acquisition.
- `src/workshop/previews/familiar/` contains animation/pause controls, the contained
  responsive stage, and the `FeatureWorkspace` wrapper, which shows Development alone.

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

## Implementation inventory

The packages and NovelExpanded app built here are the destination. Keep Workshop
controls, fixtures and adapters outside reusable package entries; another repository
changes only when the owner asks.

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

### Contextual helper — 2026-10-16

The Familiar is the Library's future app-wide guide for explanation, control,
accessibility and translation. This first pass supplies a small shared foundation,
with only Fate implemented. It does not introduce conversation history, generated
replies, a second story store or a new generation endpoint.

- `FamiliarHelperProvider` owns one short interaction across the app. The header
  and floating trays gain the same **Talk to Familiar** action when this provider
  is present; existing consumers without it keep their original tray.
- A mounted screen registers `FamiliarHelperContext` through
  `useFamiliarHelperContext`. It supplies action labels, exact command phrases,
  review text, execution callbacks and an optional playback interruption. The
  screen changes its context key when the target or choices change. Unmounting
  or changing that key cancels capture and invalidates pending confirmation.
- `ReaderFamiliar` is the first adapter. It saves World Building, Progression,
  Conflict or `Custom: <direction>` through `chooseChapterDirection`, preserving
  the writer's suggestion and custom text. A separate Confirm is required. This
  selects the next chapter's path; it neither generates nor rewrites a chapter.
- SEN exposes only `HarnessReaderSession.renderHostTools` and `ReaderHostTools`
  (chapter, busy state and a temporary narration interruption). SEN has no
  Familiar import. The app and existing Workshop Reader share `AppFamiliar` and
  `StoryPages`, so both use the same helper and Reader adapter.
- The host supplies `FamiliarVoice`; the shipped browser adapter is under
  `src/host/familiar/voice.ts`. A later speech service or conversational input
  can replace this adapter while keeping screen actions and their validation.
  The current parser recognizes explicit English commands only. It does not
  interpret general questions or translate text. Speech language is an explicit
  provider setting; localized phrases and UI remain future work.

### Explain and Action — 2026-10-29

The Familiar has two modes everywhere: **Explain** (never changes anything) and
**Action** (confirmed before it applies). Each place fills them in: the Reader's
Action is Fate; Create mode's Action is its Highlight Engine commands, only while
Create mode is open (Sound Cues: "Add wind on whistling drafts", or "Add wind right
there" while listening, with Hear it before Confirm). Explain is empty until each
place's explanations are written. Say "Explain" or "Action" to switch.

Tap the microphone once to begin. Recognition stops before the fixed readback,
then listens once for Confirm or Cancel. Touch and typing follow the same review
step without speaking. Unsupported speech, denied permission, silence and lost
speech events leave those alternatives available. Browser recognition may use
the browser vendor's network service; this app adds no recording storage or
provider keys. It works only while the page is active, with no wake word or
locked-phone activation.

Narration and the scene yield while interacting. Cancel or success restores only
playback this interaction paused, at the existing sentence boundary. Manual
pause/stop/skip, a different chapter, leaving the Reader or backgrounding the page
prevents automatic resumption. The panel is nonmodal, has no backdrop, supports
Escape and focus return, and appears only on request.

Physical iPhone listening checks are still required: permit/deny microphone;
say each preset and a custom direction; verify readback, spoken Confirm/Cancel
and the Fate panel's saved value; repeat during narration with headphones;
switch apps or lock the phone mid-capture; confirm capture stops and a later
return does not restart an old command. Automated checks use speech stand-ins
and do not establish Safari microphone or Bluetooth behavior.

### Size, minimize, and callback — 2026-09-20

Familiar is now one card inside Workshop **Shared**, preserving `?preview=familiar`
and its existing comparison workspace. It remains a Library-owned capability.

The action tray exposes **Energy** and **Minimize Familiar**. The host controls `minimized` and
`onMinimize`; the mounted companion keeps its drag position while hidden and stops
sprite playback. `FamiliarRecall` provides a 44px accessible button for the host
header. Tapping the silhouette opens a glass menu with Energy and Expand. Energy
uses the same centered dialog while the pet stays docked; only Expand invokes
`onRecall` and restores the floating pet and keyboard focus. Development mounts the button
through the generic `WorkspaceHeaderAccessoryProvider` on Home, Profile, and Creator.
The Development Reader uses its neutral SEN header accessory slot to reserve a
44px control position; fullscreen Reader and the standalone Familiar canvas use
the sticky recall when no Reader header is present.

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

## Host boundary

Profile Settings → Customization → Familiar uses the reusable `FamiliarSelection`
with host-supplied `UserProfileServices.familiars`. Development passes all twelve
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
styles and existing UI peer dependencies. The host supplies `FamiliarDefinition`,
asset URLs and `EnergyClientProvider` with its verified current-user token. Definition,
metadata, timing data and sprite sheet belong together. Workshop identity adapters,
selectors, stage and navigation are preview-only.

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

- 2026-11-01: On iPhone, live talk and the device voice asked for the microphone while music had Safari in playback-only mode, and the phone refused it ("AudioSession category is not compatible with audio capture"). Listening now switches to play-and-record at the tap and puts the earlier mode back when it ends (`src/host/familiar/audioSession.ts`).
- 2026-11-01: Live talk on OpenAI GPT-Live, which the Router serves first when
  its key is set: the phone connects over WebRTC (it captures the microphone
  and plays the voice itself), GPT-Live speaks as the Familiar from its facts,
  and a delegated Responses model runs its functions; the screen still confirms
  every change. Typing goes to that model, and the Familiar says the answer.
  Gemini Live remains the other provider.
- 2026-10-30: Matched the verified Codex companion cadence: sixfold idle holds,
  three-cycle reactions and mouse-directed still poses, with raw inspection and
  generation one-shots preserved. Checked all twelve atlases, 30-second idle samples
  for Galaxy Octopus, Celestial Guardian and Quill, and the app/Workshop at 390px
  and desktop widths. Focused Familiar, host, preview and generation-overlay checks:
  148 tests passed. Type/build and boundary validation uses a case-sensitive Linux
  checkout because the existing ChapterTagging/chapterTagging import collision
  prevents those repository-wide checks on Windows.

- 2026-10-29: Live talk is a setting, off by default: Settings → Familiar →
  Live talk (beta); off, the microphone listens with the device voice. On, the
  microphone is asked for during the tap, typing opens a conversation without
  the microphone (its microphone then starts listening), a conversation is
  noted only once it connects, and a failure notes exactly why, in the phone's,
  the server's or Gemini's words.
- 2026-10-29: Live talk fixes: the server locks the whole setup (Gemini refused
  the SDK's field list), any failure before a conversation opens hands over to
  the device voice with story playback still paused, and the microphone lights
  only while it hears the reader, with a ring that ripples outward.
- 2026-10-29: The conversation, behind its own button (in place of the keyboard
  when live talk is offered), like info: what was said this visit and what the
  Familiar did on screen, with a box to type to it. The panel itself shows no
  chat. Kept in memory for the visit, never saved.
- 2026-10-29: Live talk on Gemini Live: where the server has a Gemini key, the
  microphone starts a conversation with the equipped Familiar until tapped
  again (ten minutes at most). It answers from the page's help topics and the
  NovelExpanded Docs, can show a topic or propose an action, and the screen
  still confirms every change. The server mints a single-use token for each
  conversation (`/api/familiar-live`); the device voice remains the fallback.
- 2026-10-29: Explain and Action modes. Sound Cues by voice in Create mode, with
  Hear it before Confirm; voice sessions also hear problems and the success.
- 2026-10-29: Compact panel: icons for Explain and Action, tiles with an icon, a
  name and one short line, an icon row (info, microphone, typing); how to talk
  moved behind info. Explain shows each page's help topics, read in the System
  voice where recorded (the device voice otherwise), with a clip only when one
  exists (`helpVideos`). The Familiar floats by default; Settings → Familiar →
  Keep in the header puts it back in the header.
- 2026-10-29: Tap the microphone to start talking and tap again when done; a
  pause no longer ends listening. It stops by itself after 30 seconds.
- 2026-10-28: With the owner's approval, removed the old supplied-GIF copy
  (`reference/FamiliarReference.tsx`) and its Original Reference and Compare panes;
  the workspace now shows Development alone.

- 2026-10-16: Added the optional global helper foundation and its first Reader
  action: review and save one of the four existing Fate choices using voice,
  touch or typing. App and Workshop Reader share the same composition.

- 2026-10-12: Removed the header recall's blue focus box. Keyboard focus uses
  a gold glow around the sprite; forced colors keeps the system focus outline.
  Recall, expansion, dismissal and focus return keep their existing behavior.

- 2026-10-07: The Familiar comes to the NovelExpanded app (`src/novel-expanded/AppFamiliar.tsx`):
  one companion for the app, the profile's equipped Familiar and size, minimized to its
  recall in every Library header at first, kept out of the immersive Reader, and summoned
  above the bottom bar and the floating music note (`bottomInset` from the Library's
  `useLibraryBottomClearance`). The app's practice account owns every Familiar, so each
  can be equipped from Settings or the Celestial Store. The Workshop's Familiar surfaces
  keep above the bar and the note the same way.
- 2026-10-07: Generation greetings now play once on touch or hover, then rest
  in the neutral pose. Holding hover never repeats; keyboard activation also
  greets. The sprite accepts an opt-in `playOnce` request counter, replacing
  the unreleased automatic cadence. Visibility, pause and reduced motion
  suppress requests without replaying them later. Default playback is unchanged.

- 2026-10-06: Added opt-in one-shot sprite cadence for generation: a complete
  wave every 3.5 seconds, neutral between waves, pausing for hidden documents,
  offscreen sprites and reduced motion. The overlay uses a quieter aura and a
  static accent-colored underline. Default Familiar playback is unchanged.

- 2026-10-06: Generation veils use the equipped Familiar's supplied working and
  review clips. The existing profile session supplies the choice; elemental
  affinity and color definitions are shared with Familiar forms, without
  changing ownership, training, acquisition or name-effect choices.

- 2026-10-06: Added the supplied Frostforged Golem v2 package as the twelfth Familiar.
  Preserved its atlas, neutral crop, animation timing and nine previews with source hashes,
  projected intake metadata to the renderer-safe host contract, and registered the package
  in the Library catalogue as Rare with Frost affinity. Existing Familiar selection,
  preview, movement, activity playback and bond effects consume the new entry through
  the shared catalogue.
- 2026-09-25: Composed the minimized Familiar into the Development Reader's
  dedicated header slot. The floating companion and fullscreen recall still use
  the Library host preview; SEN receives only a neutral accessory element.
- 2026-09-23: Corrected Quill's wave to raise the anatomical front-right paw, with the
  other three paws grounded. Restored left-running to the exact horizontal mirror of
  right-running so both directions have identical frame bounds and scale.
- 2026-09-23: Clarified Quill's wave silhouette so the raised forepaw reads clearly
  above three grounded paws throughout the four-frame loop. Reduced the left-running
  row uniformly to add room around the left-facing face while keeping the foot baseline.
- 2026-09-23: Replaced Quill's Development presentation with the Lightning-themed v2
  atlas grounded in the supplied `Quill-v2.png`. Preserved the `quill` ID, common/default
  catalogue settings, and Lightning training affinity; retained the full four-frame wave
  loop and regenerated the nine deterministic previews from the new atlas.
- 2026-09-23: Familiar rarity (this catalogue's `rarity`) is now documented and labelled as its
  own scale, "Epic familiar", separate from the cultivator's Bond Rank with a Familiar
  ("Legendary bond"); `familiarRarityLabel` lives beside `FamiliarRarity`. The profile's equipped
  Familiar is the Active Familiar the bond system resolves name effects against. See
  [`../familiar-training/README.md`](../familiar-training/README.md).
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
