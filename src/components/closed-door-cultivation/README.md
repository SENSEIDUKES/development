# Closed-Door Cultivation

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/ClosedDoorCultivationModal.tsx`
- **Workshop preview:** `?preview=idle-cultivation`
- **Replica created:** 2026-07-29
- **Last Workshop update:** 2026-08-25
- **Last source comparison:** 2026-07-30
- **Replica status:** development focus & accessibility enhancements

- **2026-08-25:** Moved to the Library lane. Cultivation and Qi progression are Library product behavior, so this surface now publishes as `@seihouse/library/cultivation` instead of `@seihouse/sen/closed-door-cultivation`. The modal stays props-driven — the host still owns reward calculation and persistence — and its behavior and styling are unchanged.
- **2026-08-21:** Published the Development modal and its props through
  `@seihouse/sen/closed-door-cultivation`; the Workshop Development pane now
  imports that package entry while the locked Reference pane stays relative.
- **2026-08-18:** Keyboard / focus behavior pass (SEIHouse Gemini Verification Loop K1–K2):
  - **K1 (Escape Dismissal):** Added a `keydown` listener on `document` while `qiEarned !== null && !isClaiming` that dismisses the vignette by calling `onClose()`. The listener is detached during claim animation (`isClaiming === true`) and on unmount so Escape cannot fire mid-animation.
  - **K2 (Predictable Tab Order & Trap):** Added active focus trapping within the dialog container (`dialogRef.current`) on `Tab`/`Shift+Tab` when expanded, `tabIndex={-1}` on decorative vignette wrapper and progression containers, and strict `tabIndex={-1}` / `aria-hidden="true"` handling on the collapsed button and expanded claim button during exit/transition states to guarantee Tab order never leaks out into background library cards.
- **2026-08-18:** UX pass (SEIHouse Gemini Verification Loop U2–U3):
  - **U2 (Auto-Collapse Timing & Agency):** `COLLAPSE_AFTER_MS` drops from 7s to 5s, and a capture-phase `pointerdown` listener on `document` now collapses the vignette on the first interaction with the page behind the (pointer-events-none) scrim. Taps landing inside the dialog itself are ignored, so claiming never collapses the modal by accident.
  - **U3 (Visible Retry Affordance):** A failed claim now renders an inline status line under the cloud — "Couldn't reach the Library. Tap the cloud to try again." — styled to match the progression quote so it doesn't visually pop. It clears on the next claim attempt and on reward-cycle reset; the sr-only `aria-live` announcement from A4 remains the screen-reader channel.
- **2026-08-18:** Performance pass (SEIHouse Gemini Verification Loop P1–P4):
  - **P1 (Deterministic Low-Power Gate):** Replaced the per-render `isLowPowerDevice()` calls with a single module-load `LOW_POWER_DEVICE` constant. The hardware heuristic gates the scrim backdrop blur and the 30→14 / 26→12 particle trims — the two largest perf levers in the file — so it is now computed once and cannot drift across render passes.
  - **P2 (Per-Instance Gradient Id Intent):** Documented that `CultivatorSvg`'s `useId` gradient id is deliberately per-instance (collapsed orb + expanded vignette, or Compare view) and must not be hoisted to the parent.
  - **P3 (Cheaper Aura Tier):** The two large blur auras — the collapsed orb's ink aura (`blur(6px)`) and the vignette's ink aura (`blur(10px)`) — now skip their composited blur layer on low-power devices, falling back to the flat radial gradient (visually similar at these opacities, substantially cheaper on mid-range hardware). This extends the existing low-power scrim gate to the modal's real steady-state cost.
  - **P4 (SMIL → framer-motion):** Converted the cloud shimmer sweep from a SMIL `<animate>` (its own DOM timer) to a `motion.rect` on the shared framer-motion RAF loop, so the file is pure framer-motion and reduced-motion handling is uniform. The `skewX(-18)` now lives in the motion transform so the CSS transform doesn't clobber it.
- **2026-08-18:** Accessibility follow-up pass (SEIHouse Gemini Verification Loop A6–A8):
  - **A6 (Per-Instance Title Id):** Replaced the static `id="idle-cultivation-title"` with a per-instance `cdc-title-${useId()}` referenced by `aria-labelledby`, so the Reference and Development copies no longer collide when Compare renders both in one DOM tree. This re-applies the `useId` variant set aside during the PR #35 merge.
  - **A7 (Label Contrast on Tall Viewports):** The "Closed-Door Cultivation" label now carries its own dim local aura plus a dark text-shadow, so it keeps WCAG 1.4.3 contrast even where the capped-height main ink aura no longer reaches it.
  - **A8 (Collapsed Badge Legibility):** The collapsed orb's `+{qiEarned}` badge grew from `text-[8px] sm:text-[9px]` to `text-[10px] sm:text-xs` with slightly wider padding.
- **2026-08-18:** Focus management & accessibility pass (SEIHouse Gemini Verification Loop A1–A5):
  - **A1 (Focus & Modal):** Added `aria-modal="true"` to the dialog container, automatic focus placement onto the claim button on transition into the visible state, focus restoration to the previously focused element upon close, a keyboard focus trap for `Tab`/`Shift+Tab` within the dialog, Escape key handling to collapse the dialog to the orb, and focus management when collapsing/expanding.
  - **A2 (Parametric Labels):** Added parametric `aria-label` attributes on both the claim button (`Claim ${qiEarned} Qi & Awaken` / `${qiEarned} Qi, absorbing…`) and collapsed orb (`Open closed-door cultivation reward of ${qiEarned} Qi`) so screen readers announce the exact reward amount.
  - **A3 (Progression Descriptions):** Removed `aria-hidden="true"` from the progression text container and linked the day count (`daysId`) and milestone quote (`quoteId`) to both the dialog and claim button via `aria-describedby`, while keeping purely decorative ornaments `aria-hidden="true"`.
  - **A4 (Status Announcements):** Added a polite `aria-live="polite"` status region that announces absorption in progress (`Absorbing ${qiEarned} Qi…`), successful claim (`Claimed ${qiEarned} Qi.`), and network/claim errors (`Could not claim reward. Tap to retry.`).
  - **A5 (Collapsed Focus Ring):** Added `focus:outline-none focus-visible:ring-2 focus-visible:ring-portal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05080f]` to the collapsed orb button for crisp keyboard visibility against background cards.
- **2026-08-17:** Moved the Workshop-only reward-state selector into the shared responsive Workshop Controls menu and gave Reference, Development, and Compare one authoritative simulated reward state. Closed-Door Cultivation navigation and modal behavior were not changed.
- **2026-07-29:** Created faithful Workshop replica and local state simulator.
- **2026-07-29:** Duplicated into a second variant to redesign the idle Qi reward's protected visual space, safe-area anchoring, swipe pass-through, collect cues, and ascending claim particles.
- **2026-07-29:** Redrew the cultivator silhouette as a seated meditator with distinct neck, shoulders, and folded hands, and added a full-viewport dim + blur scrim behind the expanded vignette.
- **2026-07-29:** Reorganized into the standard feature workspace layout — `reference/` (untouched replica) and `development/` (the redesigned variant, formerly a separate "V2" duplicate) under one `?preview=idle-cultivation` route, switched with the Original Reference / Development / Compare control instead of a second homepage card.
- **2026-07-30:** Layout optimization pass (SEIHouse Layout Optimization): tablet now anchors bottom-right while keeping the 6rem bottom-nav clearance (desktop's 1.5rem corner offset moves to `lg:`), and the cloud, cultivator figure, ink aura, QI text, label, and collapsed orb scale up fluidly across `sm`/`lg` instead of staying at mobile pixel sizes.
- **2026-07-30:** Restored the upward emblem flight as the claim's final phase: after the qi lands in the dantian and the cultivator charges, the figure now disperses upward and its qi spirals into the target emblem (`targetElementId` is in use again). `CLAIM_CLOSE_MS` moves to 2.5s to cover all three phases (absorb → charge → ascend) before the veil lifts.
- **2026-07-30:** Claim is now an absorption event: the cloud disperses into ~30 particles that stream down into the cultivator's dantian (figure height × 0.62), answered by a dantian flare and one expanding pulse ring plus a single brightness pulse from the cultivator (no more dissolve or upward emblem flight; `targetElementId` is deprecated). The close timer now fires 1.5s after claim start (`CLAIM_CLOSE_MS`, latency-independent) so the whole sequence lands in ~1–1.5s. The full composition (cultivator, cloud, QI text, progression block, ink aura) was scaled up ~15–20%, and the quote now breathes with a slow 3.6s opacity pulse.
- **2026-07-30:** Added a progression block above the Qi cloud in Development — "DAYS CULTIVATING", the day count, and a quote that escalates through 20 tenure milestones (under 1 day → 180 days) via the new optional `daysCultivating` prop, with five timeless quotes mixed in at a 25% roll per reward cycle. The block fades out with the claim animation. Preview mocks `daysCultivating={7}`.
- **2026-07-30:** Shortened the post-claim hold from 2.4s to 1.9s (`CLAIM_CLOSE_MS`) so the scrim and vignette release about half a second sooner once the qi flight and emblem glow have finished.
- **2026-07-30:** Performance pass (SEIHouse Components Performance): added a low-power heuristic (reduced motion or ≤4 CPU cores) that skips the full-viewport backdrop blur and trims the claim particle burst from 26 to 12; a failed `onClaim` now restores the vignette for retry instead of closing and silently losing the reward; pending close timers are cleared when a reward cycle resets or a new claim starts.
- **2026-07-30:** Final production pass on main (`c5e2187`): qi motes and the SMIL shimmer sweep skipped on low-power devices, per-instance dialog label ID via `useId`, and 85% column compression under 480px viewport height. (The merged PR #35 version keeps its own static title id; the `useId` variant can be re-applied next cycle if wanted.)
- **2026-07-30:** **Merged as PR #35 and transferred back to Light-Novels production** — `development/ClosedDoorCultivationModal.tsx` was integrated byte-for-byte (animations unchanged: three-phase absorb → charge → ascend, 2.5s latency-independent close) as the production `src/components/ClosedDoorCultivationModal.tsx`. Production wires the props (`qiEarned`, `onClose`, `onClaim`, `daysCultivating`) to the real Qi/profile systems via `useClosedDoorCultivation` + `claimIdleQiReward`: exactly the displayed amount is deposited, the server write is awaited, single claims are capped at 350 Qi, and the reward is claimable exactly once across refresh/tabs/devices.
- **2026-07-30:** **Resynchronized** — `reference/` refreshed from the integrated production code; `reference/` and `development/` are now identical and ready for the next redesign cycle.

## Folder layout

```
reference/ClosedDoorCultivationModal.tsx    — untouched replica of production, locked
development/ClosedDoorCultivationModal.tsx  — active Workshop version, starts as a copy of reference
```

Both are rendered inside `src/workshop/previews/closed-door-cultivation/ClosedDoorCultivationWorkspace.tsx`, which shares one mock library backdrop, emblem target, and preview-state control panel between them via `FeatureWorkspace`.

## What was copied

The entire SVG cultivator, particle flight animation (`motion/react`), claim/collapse state machine, and styling from `ClosedDoorCultivationModal.tsx` in Light-Novels.

## What changed in Development vs Reference

Development adds `aria-modal="true"` to the dialog container, automatic focus movement to the claim button on entrance, focus restoration on close, Escape-to-dismiss support (detached during claim animation), focus trapping for Tab navigation within the modal, focus coordination with the collapsed orb button, parametric reward amount announcements, live status announcements via `aria-live="polite"`, progression description accessibility linking, visible focus rings on the collapsed orb button, a per-instance `useId` dialog title id (Compare-safe), a local contrast aura and text-shadow behind the "Closed-Door Cultivation" label, a larger collapsed orb badge, a module-load `LOW_POWER_DEVICE` constant in place of per-render hardware checks, a low-power tier that drops the two large ink-aura blur layers, a framer-motion shimmer sweep in place of SMIL, a shorter 5s auto-collapse timer plus collapse-on-first-page-interaction, and a visible retry message after a failed claim. Reference remains the locked pre-audit replica.

## What was mocked

Nothing in the component itself: the production component is props-driven (`qiEarned`, `onClose`, `onClaim`, `daysCultivating`, optional `targetElementId` for the emblem flight). The preview supplies mock props — an 800ms delayed `onClaim`, a flight-target emblem, and preview-state buttons for the reward amount — plus a workshop-only mock library grid purely so collisions with realistic content can be judged. Production wires the same props to Firebase Auth, the Zustand store, and the claim-safe `claimIdleQiReward` path via `useClosedDoorCultivation`.

### Available Preview States

- No Qi (hidden)
- +11 Qi / +350 Qi / +9999 Qi (auto-collapses to a floating orb after 5s, or on the first tap outside the vignette)
- Claiming animation (tap the cloud)

### Production dependencies excluded

- Firebase Auth
- Zustand Global Store (`useAppStore`)
- Data fetching logic

### Exact files needed for transfer

- `development/ClosedDoorCultivationModal.tsx` (once approved) → `ClosedDoorCultivationModal.tsx` in Light-Novels.
- The mock library grid in the preview is workshop-only — do not transfer.

## Lifecycle

1. **Import** — copy production's current implementation into `reference/`.
2. **Fork once** — `development/` starts as a copy of `reference/`.
3. **Refine** — every Workshop task modifies `development/` only.
4. **Approve** — once approved, transfer `development/` back to Light-Novels.
5. **Resynchronize** — refresh `reference/` from the newly integrated production code, record the new comparison date, and reset `development/` for the next redesign cycle. There is no V2/V3 — only "what production currently is" vs "what we are currently trying to make it become."
