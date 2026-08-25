# Relics Gallery

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/UserProfileInventoryPanel.tsx` (cards), `src/components/ModalsAndToasts.tsx` (the `unlockedArtifactAlert` reveal flow)
- **Workshop preview:** `?preview=relics-gallery`
- **Replica created:** 2026-07-29
- **Last Workshop update:** 2026-08-25
- **Last source comparison:** 2026-07-29
- **Replica status:** under refinement

## Workshop history

- **2026-08-25:** Moved to the Library lane. The relic economy is SEIHouse product, not portable SEN behavior, so these surfaces now publish as `@Seihouse/Library/relics` instead of `@seihouse/sen/relics`. `development/RelicReveal` draws its motes through `@seihouse/sen/ui`, so Library links against the published engine instead of reaching into SEN source. Components, props, and presentation are unchanged.


- **2026-08-21:** Published this feature as `@seihouse/sen/relics`: the relic card, its inspection modal, the `development/` claim reveal, and the relic model. `RelicReveal` now draws its motes from the Library-owned `ParticleEffect` instead of an application-root file. The locked `reference/` replica stays Workshop-only.

- **2026-08-17:** Moved the Compact Cards / Reveal Flow scene selector into the shared responsive Workshop Controls menu. Relic card, modal, reveal, claim, and replay interactions remain inside the previewed components.
- **2026-07-29:** Created faithful Workshop replica, extracted `RelicCard`/`RelicModal` out of `UserProfileInventoryPanel.tsx`, mocked `CosmicArtifact` types and data, separated by rank.
- **2026-07-29:** Added a Reveal button under each relic opening the full-screen Relic Reveal celebration flow, plus a Workshop-only Replay Effects tool.
- **2026-07-30:** Forked the reveal flow into an active UI-work copy: rank-neutral sealed-card lighting, a premium closed-card face replacing the placeholder grid panel, a de-duplicated stats box, and spin sparks during the reveal.
- **2026-07-29:** Reorganized into the standard feature workspace layout. `shared/` holds `RelicCard`/`RelicModal` (identical in both versions — no fork exists for the compact card or detail modal yet); `reference/RelicReveal.tsx` and `development/RelicReveal.tsx` hold the two reveal-flow variants (formerly `relic-reveal`/`relic-reveal-DEV` as separate component folders with a second `relics-dev` preview and homepage card). One Relics Gallery card now opens one workspace with a Scene selector (Compact Cards / Reveal Flow) crossed with the Original Reference / Development / Compare control.

## Folder layout

```text
shared/types.ts       — CosmicArtifact interface
shared/RelicCard.tsx  — compact rarity card (no reference/development split yet)
shared/RelicModal.tsx — detail inspection modal (no reference/development split yet)
reference/RelicReveal.tsx    — untouched full-screen celebration flow
development/RelicReveal.tsx  — active Workshop version of the celebration flow
```

## What was copied

- `RelicCard`/`RelicModal`: the visual treatment for `CosmicArtifact` objects as they appear in the inventory panel.
- `RelicReveal`: the complete artifact celebration experience — mystery card entrance/flip, rarity theme ladder (Common → Transcendent), ornate rotating sigil SVG, celestial particle shower backdrop tinted to rarity, stats box, claim button, reduced-motion handling, and vibration patterns.

## What changed in Development vs Reference (reveal flow)

1. Rank background theme lighting only appears after the reveal — the celestial backdrop stays rank-neutral while the card is sealed.
2. The initial "Claim Relic" card is rebuilt as the closed face of the final premium card (same frame, hairline, sigil in a neutral sealed tone) instead of the placeholder grid panel.
3. The stats box no longer repeats the rank in its second cell — it names the artifact type only; the rank already lives in the header label.
4. Sparks shake loose from the card rim during the reveal spin (disabled under reduced motion).

## What was mocked

- The `useAppStore` reveal queue (`enqueueRelicReveal`, `popPendingRelic`, reader gating) and story-engine wiring.
- `vibrate()` from `src/lib/vibration.ts`, replaced with an inline helper using the same patterns.
- Artifact data comes from `src/workshop/previews/relics/mockData.ts`.
- Cloud sync, Firebase, and real submission logic behind the cards and modal.

### Available preview states

- **Scene:** Compact Cards (the rarity grid + detail modal) or Reveal Flow (the full-screen celebration).
- **Reveal Flow:** mystery (tap to reveal) → revealed, with a Workshop-only Replay Effects tool to jump straight to the revealed state.

### Reusable Workshop dependencies

- `src/components/ParticleEffect.tsx`
- Tailwind theme tokens in `src/styles.css` (`portal`, `gold-accent`)

### Production dependencies intentionally excluded

`useAppStore` / reveal queue, story engine, `react-focus-lock`, Firebase, persistence.

### Files needed for later transfer

- `shared/RelicCard.tsx`, `shared/RelicModal.tsx` → `Light-Novels`, pointing `CosmicArtifact` back at the real `src/types.ts`.
- `development/RelicReveal.tsx` (once approved) → extract into its own component in `ModalsAndToasts.tsx`, feeding it `unlockedArtifactAlert` + `dismissArtifactAlert` from the store instead of the `artifact`/`onClaim` props.
- `src/components/ParticleEffect.tsx` already exists in Light-Novels; do not overwrite without a diff.
- `--color-gold-accent: #D4AF37` theme token, if the target stylesheet lacks it.

### Transfer notes

- The `replayKey` prop on `RelicReveal` is a Workshop fine-tuning tool; it can be dropped or kept when transferring.
