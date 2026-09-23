# Fate Survival Relics (formerly Relics Gallery)

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/UserProfileInventoryPanel.tsx` (cards), `src/components/ModalsAndToasts.tsx` (the `unlockedArtifactAlert` reveal flow)
- **Workshop preview:** `?preview=relics-gallery` (in the Workshop's Rewards section)
- **Replica created:** 2026-07-29
- **Last Workshop update:** 2026-09-23
- **Last source comparison:** 2026-07-29
- **Replica status:** approved reconstruction — development rebuilds Relics as Fate Survival rewards; `reference/` keeps production's retired inventory Relic reveal

## What a Relic is now

Relics are lightweight rewards that come only from **Fate Survival** challenges: one per survived
challenge, granting DAO XP and Energy by rarity. They are not earned from story milestones, not
equipped, attuned or offered, and carry no title, status effect or QI. Achievements and their
Mystery Scrolls took over the milestone role (see [`../rewards/README.md`](../rewards/README.md)).
The server rules live in [`src/server/relics/README.md`](../../server/relics/README.md).

## Folder layout

```text
reference/RelicReveal.tsx               — locked replica of production's inventory Relic reveal
shared/types.ts                         — CosmicArtifact types kept only for the locked references
development/RelicReveal.tsx             — the Relic Reveal for a Fate Survival Relic
development/FateSurvivalRelicsPanel.tsx — the cultivator's Relics, each opening its reveal
development/index.ts                    — package entry (`@seihouse/library/relics`)
```

`development/RelicReveal.tsx` now composes the shared reward-reveal parts in
`src/components/rewards/development/` — the same rarity ladder, sigils, particles, sealed face and
haptics that the Mystery Scroll reveal uses — so both rewards reveal the same way.

## What the Workshop shows

- **Relics scene:** a new account with no Relics, outcome buttons that stand in for the Fate
  Survival judge ("Fate averted → Legendary", "Fate scarred → Rare", "Doom manifested → no
  Relic"), the sealed Relic, its reveal, the credited DAO XP and Energy on the balance strip, and
  the ledger feed. Everything but the outcome runs on the development economy.
- **Reveal lab:** the Relic Reveal at any rarity with a sample Relic, and Replay effects.
- **Original Reference:** production's locked reveal with the old inventory mock data.

## Decisions still open

The Fate Survival judge, the outcome → rarity mapping, Relic names and amounts, and whether a
public profile shows Relic names (it does today, under the "Relic names" visibility switch).

## Transfer

Copy `development/` with `src/components/rewards/development/`, `src/library/relics/`, and
`src/server/relics/` with its migration. Serve `/api/library-economy?capability=relics` and mount
`RelicsClientProvider`. Leave `reference/`, `shared/types.ts` and the Workshop preview behind.

## Workshop history

- **2026-09-23:** Rebuilt as Fate Survival Relics. Retired the relic card and inspection modal
  (`shared/RelicCard.tsx`, `shared/RelicModal.tsx`), the weekly offering, attunement and status
  effects, and the story-milestone Relic achievements. The reveal's rarity ladder and effects
  moved into shared reward-reveal parts used by Mystery Scrolls too. Added
  `FateSurvivalRelicsPanel` and the Fate Survival outcome simulator; the entry moved into the
  Workshop's Rewards section as "Fate Survival Relics".
- **2026-09-19:** Made Relics a deliberate `@seihouse/library/relics` capability. The client read one domain projection backed by the v3 server foundation; reveal acknowledgement was presentation state, not an award. Stateless celestial visuals come from `@seihouse/library-ui@0.5.0`.
- **2026-09-06:** Library UI ownership migration: reusable presentation comes from the canonical Library UI package.
- **2026-08-25:** Moved to the Library lane. The relic economy is SEIHouse product, not portable SEN behavior, so these surfaces publish as `@seihouse/library/relics` instead of `@seihouse/sen/relics`.
- **2026-08-21:** Published as `@seihouse/sen/relics`: the relic card, its inspection modal, the `development/` claim reveal, and the relic model. `RelicReveal` drew its motes from the Library-owned `ParticleEffect`.
- **2026-08-17:** Moved the Compact Cards / Reveal Flow scene selector into the shared responsive Workshop Controls menu.
- **2026-07-30:** Forked the reveal flow: rank-neutral sealed-card lighting, a premium closed-card face, a de-duplicated stats box, and spin sparks during the reveal.
- **2026-07-29:** Created the faithful Workshop replica, extracted `RelicCard`/`RelicModal` out of `UserProfileInventoryPanel.tsx`, mocked `CosmicArtifact` types and data, added the full-screen Relic Reveal and a Replay Effects tool, and reorganized into one feature workspace.
