# Celestial Store

Repository lifecycle and reference rules: [AGENTS.md](../../../AGENTS.md#core-rule).

- **Source repository:** SENSEIDUKES/development (born here; no production original)
- **Source location:** `src/components/celestial-store/` (Store configuration, daily rotation,
  account port, and the page), `src/host/familiar/catalogue.ts` (the one Familiar registry it
  reads), `src/library/cultivation/` and `src/components/energy/` (the balance reads)
- **Workshop preview:** `?preview=celestial-store` for every Store state against preview props;
  `?preview=user-profile&cave=/home/store` and `/app/?page=profile&cave=%2Fhome%2Fstore` for the
  live Cave stage against the development QI ledger and Energy account
- **Created:** 2026-09-22
- **Last recorded Workshop update:** 2026-11-10
- **Historical source inspection:** 2026-09-22 (the Familiar catalogue, Energy pricing, and
  profile Store stub were inspected in this repository)
- **Status:** approved reconstruction (Workshop Replica Mode B), Genshin-inspired two-tab stage live
- **Visual target:** Genshin Impact's shop simplicity adapted to the Celestial Library — a
  viewport-locked (`100dvh`, `overflow: clip`) full-bleed stage with no scrolling card stacks and
  no boxed character wells. Segmented top parchment tabs on phones shift to a left-side vertical
  Shop rail on wider containers (`>= 42rem`), pairing a vertical showcase on tablet portrait with a
  side-by-side showcase on landscape and desktop. `Home` spotlights today's lead unowned or
  discounted offer above a sleek, compact purchase plinth with plain daily shop availability;
  `Familiar` presents one companion large on the open celestial astrolabe stage with flanking
  swipe/arrow controls, a 6-slot priced shop shelf (bright currency price tags on unowned items vs
  recessed dimmed `Owned` / `Active` cards on purchased items), and weighted Buy vs compact Equip
  actions.

The Celestial Store is the official first-party Store on its own dedicated Cave stage
(`/home/store`). The profile's Home keeps its small Store entry button as the door; the page
itself fills the viewport between the floating header and bottom navigation dock. The creator
**User Store** (`/public/creators/<uid>/storefront`) is a different surface and is untouched.

The Store currently sells Familiars only, organized into two tabs (`Home` and `Familiar`). There
are deliberately no placeholder tabs or shelves for audio packs, themes, cave items, cosmetics,
creator products, or bundles — future categories arrive as their own tabs when they are real.

## What lives where

| Piece | File | Role |
| --- | --- | --- |
| Offer configuration | `shared/storeConfig.ts` | Store merchandising policy only: the Energy/QI eligible pools, slot counts (2 Energy, 4 QI), and aliases to the shared current rarity prices (Energy Rare 300 / Epic 600 / Legendary 1,000; QI Common 500 / Rare 2,000 / Epic 8,000 / Legendary 25,000). Never a second Familiar registry. |
| Daily rotation | `shared/rotation.ts` | One shared deterministic rotation per local calendar day: a seeded shuffle (xmur3 + mulberry32 on `celestial-store:<day>:<currency>`) of each currency pool, resolved against the host-supplied catalogue projection. Stable all day, reshuffles the next day. No personalization, probabilities, or offer engine. |
| Account port | `shared/storeAccount.ts` | Ownership and purchases as host account state — never inferred from Store configuration. The default Familiar (Quill) is implicitly owned and never merchandised. |
| The stage | `development/CelestialStorePanel.tsx` | Viewport-locked two-tab stage (`Home` daily overview + `Familiar` showcase), live `BalancePills` (QI ledger read + Energy account read), unboxed portrait/hero stage artwork, 6-offer medallion quick picker, compact key-value rows, and in-place Buy / Owned / Equip / Equipped actions. |
| Styles | `development/celestialStore.css` | Phone-first `dvh` stage shell (`overflow: clip`), safe-area clearances, translucent blurred HUD, container-queried Genshin left Shop rail on wider screens, and short-height viewport adaptations. |

## Boundaries

- **Familiar catalogue** (`src/host/familiar/catalogue.ts`) stays the sole source of Familiar
  ID, name, rank, artwork, description, and default status. The Store references IDs only, so
  no Familiar is permanently Energy-only or QI-only.
- **Account state** owns QI balance (`useQiAccount`), Energy balance (`useEnergyAccount`),
  Familiar ownership (the `celestialStore` services port), and the equipped Familiar
  (`profile.familiarId` via `handleFamiliarChange`).
- **The current price schedule is shared.** `src/library/cultivation/economyStandards.ts` owns the Energy
  and spendable-QI pack/item values. `storeConfig.ts` exposes only Store-facing aliases, so the
  Store and the Energy, QI & DAO XP page cannot silently disagree. The schedule does not itself
  add checkout or authorize a ledger deduction.
- No loot boxes, randomized purchases, fake discounts, false scarcity, countdown pressure,
  or extra currencies. A `salePrice` at or above the normal price never renders as a sale.

## Mock boundaries

The Workshop's `mockUserProfileServices` supplies the `celestialStore` port as an in-memory
grant: a purchase waits the standard save delay, adds the Familiar ID to a preview-session
set, and **deducts no QI or Energy and persists nothing**. Equipping goes through the same
mocked profile save as the Settings Familiar tab. The `?preview=celestial-store` workspace
drives the panel with preview props only.

## Implementation inventory

The packages and NovelExpanded app built here are the destination. Keep Workshop
controls, fixtures and adapters outside reusable package entries; another repository
changes only when the owner asks. Historical references stay untouched.

The existing local files named by this inventory are:

- `src/components/celestial-store/`

## Host boundary

The `celestialStore` member of the User Profile services port is the account boundary.
A durable host adapter must persist account ownership and perform ledger deductions
server-side. The Cave button is the current entry point; future bottom-navigation
placement remains undecided.

## Workshop history

- **2026-11-10 Genshin-inspired viewport-locked stage** — Reimagined the Celestial Store as a
  non-scrolling (`100dvh`, `overflow: clip`) native mobile stage with two tabs (`Home` and
  `Familiar`), replacing the boxed two-column card grid (`ShopCard` retired) and popup purchase
  dialog. `Home` spotlights today's featured companion with a compact daily summary; `Familiar`
  displays one companion large on the open stage with swipe/arrow controls, a 6-medallion quick
  picker strip, compact key-value rows, and in-place Buy/Equip actions. Segmented top pill tabs
  on phones become Genshin's vertical left-side Shop rail on wider containers, and the Cave mounts
  `/home/store` directly as a full-bleed stage between the header and bottom navigation dock.

- **2026-09-22 current price schedule** — Confirmed the shared Energy and QI values as the
  authoritative current catalogue values. The Store still uses its existing
  in-memory preview
  purchase behavior; production checkout, ownership persistence, and server-side deductions
  remain host work.

- **2026-09-22 shared economy standards** — Replaced the per-Familiar provisional QI table with
  the shared spendable-QI rarity table. The Store still uses its existing in-memory preview
  purchase behavior; production checkout, ownership persistence, and server-side deductions
  remain host work.

- **2026-09-22 one shelf, reusable card** — The split Energy/QI shelves became one Familiars
  shelf: the rotation still draws two Energy and four QI offers, Energy first, but they share
  a single frame and grid because each card's price already carries its currency emblem. The
  card itself moved out to `development/ShopCard.tsx` as a kind-agnostic component with its
  own styles, tests, and package export, ready to be developed on its own as the Store grows
  past Familiars.

- **2026-09-22 review hardening** — Serialized purchases behind an in-flight guard the host
  cannot omit; the rotation now follows the local day and closes a stale offer at midnight;
  sale prices must be positive safe integers like every other price; the store-account hook
  is pinned for the mount so the hook sequence cannot change under a provider swap.

- **2026-09-22** — Created: extracted the official Store from the profile stub into the
  dedicated `/home/store` destination; first daily rotation (2 Energy + 4 QI), reference-art
  layout with real Familiar heroes, purchase/equip dialog, and the in-memory development
  ownership grant.
