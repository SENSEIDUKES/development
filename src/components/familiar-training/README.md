# Familiar Training

- **Source repository:** SENSEIDUKES/development (born here; no production original)
- **Source location:** `src/components/familiar-training/` (the training panel),
  `src/library/familiars/` (contracts, client, `activeFamiliarEffect`), `src/server/familiars/`
  (ownership, training ladder, purchases)
- **Workshop previews:** `?preview=familiar-training` (in the Workshop's Rewards section);
  `?preview=reward-loop` (Familiar tab); `?preview=user-profile&cave=/home/familiar`
- **Created:** 2026-09-23
- **Last Workshop update:** 2026-09-23
- **Last source comparison:** 2026-09-23 (this repository; there is no production original)
- **Status:** approved reconstruction (Workshop Replica Mode B), development skeleton
- **Package:** `@seihouse/library/familiar`

## What it is

Familiars own the Library's active cosmetic effects. Offering QI to one Familiar trains it through
tiers, and each tier unlocks looks — an alternate form, elemental titles — for that Familiar only.
The equipped Familiar's chosen effect is the one active effect: an elemental title letters the
cultivator's name through `LibraryElementalTitle`. No effect grants a boost, multiplier, discount
or any other advantage; the server validates the training ladder at load and refuses an unlock
carrying anything beyond presentation.

Rank still sets the cultivator's colours. When the equipped Familiar has an elemental title
chosen, that title letters the name in the Cave instead of the rank colour.

## Training ladder (development values)

| Tier | Total QI offered | Unlocks |
| --- | --- | --- |
| Bonded | 0 | — |
| Awakened | 1,000 | Elemental title · Whisper |
| Ascended | 4,000 | Radiant form (placeholder glow), elemental title · Blaze |
| Transcendent | 10,000 | Elemental title · Ascendant |

Each Familiar has an element (Quill and the Little Monkey King lightning, Phoenix fire, and so on);
unlisted Familiars fall back to celestial. The ladder lives in `src/server/familiars/training.ts`.

## What lives where

| Piece | File | Role |
| --- | --- | --- |
| Contracts and client | `src/library/familiars/contracts.ts`, `familiarsClient.tsx` | Training views, offer/select/purchase requests, `useFamiliars`, `FamiliarsClientProvider`, `activeFamiliarEffect`. |
| Training panel | `development/FamiliarTrainingPanel.tsx` | Owned Familiars, the tier ladder with progress, QI offering buttons, form and effect choices, and a live preview of the name. |
| Server | `src/server/familiars/` | `FamiliarService`: per-account serialized writes, offers spend only what the remaining tiers need, one record per idempotency key, Store purchases at today's server-resolved price. |
| Storage | `database/migrations/20260923_006_familiar_training.sql` | Ownership, training, offers and purchases; no TypeScript Postgres adapter yet. |

The existing Familiar workspace (`?preview=familiar`, in Customization) keeps the sprite renderer
and companion behaviour; this feature adds the account on top of it. The Celestial Store buys
Familiars through the same `FamiliarService`, so ownership and training share one source.

## What the Workshop simulates

Training, unlocks, choices and every QI spend run on the development economy in the tab. Only
these are stand-ins, each labelled on screen: the **Grant 1,000 QI** faucet (the real faucets are
the Dao Pillar and Mystery Scrolls), **Bring Phoenix / Galaxy Octopus home** (ownership as if
bought), and which Familiar the profile has equipped.

## Decisions still open

Tier names and QI thresholds, element affinities, form artwork (the radiant form is a placeholder
glow), whether elemental titles should replace or sit beside rank colours, whether a public
profile shows the effect (it does not today), and animated rank gradients at the top rank.

## Transfer

Copy `development/`, `src/library/familiars/`, `src/server/familiars/` and its migration. Serve
`/api/library-economy?capability=familiars`, mount `FamiliarsClientProvider`, and leave
`src/workshop/previews/familiar-training/` behind.

## Workshop history

- **2026-09-23:** Created. Active effects moved from Relic attunement and timed status effects to
  Familiars: QI training unlocks forms and elemental titles, the equipped Familiar's chosen
  effect letters the cultivator's name, and nothing grants an advantage.
