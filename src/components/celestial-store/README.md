# Celestial Store

- **Source repository:** SENSEIDUKES/development (born here; no production original)
- **Source location:** `src/components/celestial-store/` (Store configuration, daily rotation,
  account port, and the page), `src/host/familiar/catalogue.ts` (the one Familiar registry it
  reads), `src/library/cultivation/` and `src/components/energy/` (the balance reads)
- **Workshop preview:** `?preview=celestial-store` for every Store state against preview props;
  `?preview=user-profile&cave=/home/store` for the live Cave destination against the
  development QI ledger and Energy account
- **Created:** 2026-09-22
- **Last Workshop update:** 2026-09-22
- **Last source comparison:** 2026-09-22 (the attached reference art is the visual target; the
  Familiar catalogue, Energy pricing, and profile Store stub were inspected in this repository)
- **Status:** approved reconstruction (Workshop Replica Mode B), first rotation live
- **Visual target:** the supplied Celestial Store reference — midnight navy, antique gold and
  blue-purple seals, two framed shelves, a two-column mobile card grid — rendered with the
  real integrated Familiar assets and the existing Library design language, never the
  reference's generated character art

The Celestial Store is the official first-party Store, extracted from the bottom of the
profile into its own dedicated Cave destination (`/home/store`). The profile's Home keeps its
small Store entry button as the door; the page itself no longer lives on the profile. The
creator **User Store** (`/public/creators/<uid>/storefront`) is a different surface and is
untouched.

The first Store sells Familiars only. There are deliberately no placeholder sections for
audio packs, themes, cave items, cosmetics, creator products, or bundles — future categories
arrive as their own shelves when they are real.

## What lives where

| Piece | File | Role |
| --- | --- | --- |
| Offer configuration | `shared/storeConfig.ts` | Store merchandising policy only: the Energy/QI eligible pools, slot counts (2 Energy, 4 QI), rank-based Energy prices (Rare 300 / Epic 600 / Legendary 1,000), **provisional** QI prices, and the optional genuine-discount shape (`price` + `salePrice`). Never a second Familiar registry. |
| Daily rotation | `shared/rotation.ts` | One shared deterministic rotation per local calendar day: a seeded shuffle (xmur3 + mulberry32 on `celestial-store:<day>:<currency>`) of each currency pool, resolved against the host-supplied catalogue projection. Stable all day, reshuffles the next day. No personalization, probabilities, or offer engine. |
| Account port | `shared/storeAccount.ts` | Ownership and purchases as host account state — never inferred from Store configuration. The default Familiar (Quill) is implicitly owned and never merchandised. |
| The page | `development/CelestialStorePanel.tsx` | Live balances (QI ledger read + Energy account read), the two framed shelves, cards with the real animated heroes (hover-gated, lazy, reduced-motion stills — no atlas decode), and the focused detail dialog with Buy / Owned / Equip / Equipped. |
| Styles | `development/celestialStore.css` | Midnight-navy shelves, gold and blue-purple frames, restrained glow. Rarity chips and hero framing reuse `familiar.css`. |

## Boundaries

- **Familiar catalogue** (`src/host/familiar/catalogue.ts`) stays the sole source of Familiar
  ID, name, rank, artwork, description, and default status. The Store references IDs only, so
  no Familiar is permanently Energy-only or QI-only.
- **Account state** owns QI balance (`useQiAccount`), Energy balance (`useEnergyAccount`),
  Familiar ownership (the `celestialStore` services port), and the equipped Familiar
  (`profile.familiarId` via `handleFamiliarChange`).
- **QI prices are provisional.** They live only in `PROVISIONAL_QI_PRICES` inside
  `storeConfig.ts` and are expected to change; components never carry an amount.
- No loot boxes, randomized purchases, fake discounts, false scarcity, countdown pressure,
  or extra currencies. A `salePrice` at or above the normal price never renders as a sale.

## Mock boundaries

The Workshop's `mockUserProfileServices` supplies the `celestialStore` port as an in-memory
grant: a purchase waits the standard save delay, adds the Familiar ID to a preview-session
set, and **deducts no QI or Energy and persists nothing**. Equipping goes through the same
mocked profile save as the Settings Familiar tab. The `?preview=celestial-store` workspace
drives the panel with preview props only.

## Transfer

Production needs `src/components/celestial-store/` plus the `celestialStore` member on the
User Profile services port, a real adapter that persists ownership on the account and
performs the ledger deductions server-side, and a host decision on where the Store's
entry points live (the Cave button today; bottom navigation later, deliberately not yet).

## Workshop history

- **2026-09-22** — Created: extracted the official Store from the profile stub into the
  dedicated `/home/store` destination; first daily rotation (2 Energy + 4 QI), reference-art
  layout with real Familiar heroes, purchase/equip dialog, and the in-memory development
  ownership grant.
