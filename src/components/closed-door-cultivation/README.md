# Closed-Door Cultivation

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/ClosedDoorCultivationModal.tsx`
- **Workshop preview:** `?preview=idle-cultivation`
- **Replica created:** 2026-07-29
- **Last Workshop update:** 2026-08-17
- **Last source comparison:** 2026-07-30
- **Replica status:** synced with production

## Workshop history

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

Nothing — PR #35 was transferred to production and both folders now hold the same file. The next redesign cycle starts from this parity.

## What was mocked

Nothing in the component itself: the production component is props-driven (`qiEarned`, `onClose`, `onClaim`, `daysCultivating`, optional `targetElementId` for the emblem flight). The preview supplies mock props — an 800ms delayed `onClaim`, a flight-target emblem, and preview-state buttons for the reward amount — plus a workshop-only mock library grid purely so collisions with realistic content can be judged. Production wires the same props to Firebase Auth, the Zustand store, and the claim-safe `claimIdleQiReward` path via `useClosedDoorCultivation`.

### Available Preview States

- No Qi (hidden)
- +11 Qi / +350 Qi / +9999 Qi (auto-collapses to a floating orb after 7s)
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
