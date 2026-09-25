# Familiar Bonds

- **Source repository:** SENSEIDUKES/development (born here; no production original)
- **Source location:** `src/components/familiar-training/` (bond panel, name-effect panel, name
  renderer, signature registry), `src/library/familiars/` (contracts, client, `activeNameEffect`),
  `src/server/familiars/` (ownership, Bond Rank ladder, mastery, signatures, purchases)
- **Workshop previews:** `?preview=familiar-training` (in the Workshop's Rewards section);
  `?preview=reward-loop` (Familiar tab); `?preview=user-profile&cave=/home/familiar`
- **Created:** 2026-09-23
- **Last Workshop update:** 2026-09-25
- **Last source comparison:** 2026-09-23 (this repository; there is no production original)
- **Status:** approved reconstruction (Workshop Replica Mode B), development skeleton
- **Package:** `@seihouse/library/familiar`

## The model

### Two scales that never stand in for each other

| Scale | Says | Owned by | Changes? |
| --- | --- | --- | --- |
| **Familiar rarity** | How rare the Familiar is | Host catalogue (`src/host/familiar/catalogue.ts`, `FamiliarRarity`) | Never, per cultivator |
| **Bond Rank** | How far this cultivator has cultivated this Familiar | Familiar account (`FamiliarBondRank`, derived from QI offered) | Rises as QI is offered |

Both use Common, Rare, Epic and Legendary, so every label names its scale — "Epic familiar",
"Legendary bond" — through `familiarRarityLabel` and `bondRankLabel`. An Epic familiar can reach a
Legendary bond; a Common one can too.

### Bond progression

| Bond Rank | Total QI offered | Unlocks |
| --- | --- | --- |
| Common bond | 0 | Elemental title · Whisper on your name, while this Familiar is active |
| Rare bond | 1,000 | Elemental title · Blaze, while active |
| Epic bond | 4,000 | Elemental title · Ascendant, while active; Radiant form (placeholder glow) |
| Legendary bond | 10,000 | **Mastery** of the element: `<Element> Mastery` joins your permanent collection |

1. Through Common, Rare and Epic bond, the Familiar's elemental name effect grows stronger, and it
   shows only while that Familiar is the Active Familiar.
2. At Legendary bond the cultivator fully masters that element.
3. The mastered effect enters the permanent cosmetic collection. Mastery is never taken back, and
   each element is mastered once: a second Familiar of the same element reaching Legendary bond
   does not master it again.
4. A mastered effect can be worn independently: with this Familiar, after switching to another,
   or (later) with a custom Familiar.

The ladder lives in `src/server/familiars/training.ts` and is validated at load: the ranks must
run Common → Rare → Epic → Legendary with rising QI, each rank below Legendary lends exactly one
elemental title, only Legendary masters the element, and nothing carries more than presentation.

### Two selections

| Selection | Chooses | Lives in |
| --- | --- | --- |
| **Active Familiar** | Which companion follows you | Host profile state (the profile's equipped Familiar) |
| **Active Elemental Effect** | What letters your DAO name | Familiar account (`ActiveElementalEffectSelection`) |

The Active Elemental Effect is one of: follow the Active Familiar's **bond** effect (the default),
the Active Familiar's **signature**, a **mastered** element, or **none** (rank colours).
`activeNameEffect(snapshot, activeFamiliarId)` resolves it. Before an element is mastered the only
real choices follow the Active Familiar, so the two selections are coupled; once one is mastered
it can be worn whichever Familiar is active, so they separate. Rank still sets the cultivator's
colours everywhere else (portrait ring, progress bar, rank row).

### Elements and signatures

- **Elements** (fire, lightning, frost, water, wind, earth, nature, poison, metal, space,
  celestial and void) are shared instruments. Every Familiar
  channels one, several Familiars share each, and any cultivator can master any of them.
- A **signature** is custom animation SEIHouse writes for one specific Familiar. No setting —
  element, intensity, shadow, motion — produces one. A signature unlocks with that Familiar's
  bond (`requiredBondRank`), shows only while that Familiar is active, and never enters the
  mastery collection. Cultivators get the instruments; SEIHouse writes the signature pieces.

None are written yet. To add one, register its identity in `src/server/familiars/signatures.ts`
(`signature:<familiar id>`, label, required bond) and its animation component under the same id in
`development/signaturePieces.tsx`. The server refuses a signature that carries settings, names an
unknown Familiar, or gives one Familiar two.

## What lives where

| Piece | File | Role |
| --- | --- | --- |
| Contracts | `src/library/familiars/contracts.ts` | Bond ranks and labels, effect kinds (elemental title, signature), unlocks, views, snapshot with `masteredElements` and `activeEffect`, `activeNameEffect`. |
| Client | `src/library/familiars/familiarsClient.tsx` | `useFamiliars` (`offerQi`, `selectForm`, `selectElementalEffect`), `FamiliarsClientProvider`, the Celestial Store account. |
| Rarity label | `src/components/familiar/shared/familiar.ts` | `FamiliarRarity`, `familiarRarityLabel`. |
| Bond panel | `development/FamiliarTrainingPanel.tsx` | Owned Familiars with rarity and Bond Rank, the bond ladder, QI offerings, the companion's form. |
| Name-effect panel | `development/ElementalEffectPanel.tsx` | The Active Elemental Effect choice, a live name preview, and the mastered-elements collection. |
| Name renderer | `development/FamiliarNameEffect.tsx` | Letters a name with any resolved effect: `LibraryElementalTitle` for elements (mastered outlined), the registered piece for a signature. Used by the Cave, Reward Loop and panels. |
| Signature pieces | `development/signaturePieces.tsx` | Client registry of hand-built signature animations. Empty. |
| Server | `src/server/familiars/` | `FamiliarService`: per-account serialized writes; offers spend only what the bond still needs; Legendary bond records mastery in the same write; form and effect choices validated; Store purchases at today's server-resolved price. |
| Storage | `database/migrations/20260923_006_familiar_training.sql`, `20260923_007_familiar_bond_mastery.sql` | Ownership, QI per Familiar, offers, purchases, element mastery, the Active Elemental Effect. No TypeScript Postgres adapter yet. |

The existing Familiar workspace (`?preview=familiar`, in Customization) keeps the sprite renderer,
companion behaviour and profile selection; this feature adds the account on top of it. The
Celestial Store buys Familiars through the same `FamiliarService`, so ownership and bonds share
one source.

## What the Workshop simulates

Bonds, mastery, choices and every QI spend run on the development economy in the tab. Only these
are stand-ins, each labelled on screen: the **Grant 1,000 QI** faucet (the real faucets are the
Dao Pillar and Mystery Scrolls), **Bring Phoenix / Galaxy Octopus home** (ownership as if bought),
and which Familiar is the Active Familiar. The **Lightning mastered** state shows the separation:
Phoenix is active while the name wears Lightning Mastery.

## Decisions still open

- QI thresholds per bond rank, element affinities, and form artwork (the radiant form is a
  placeholder glow).
- How mastery looks beyond the Epic title (today: the same Ascendant intensity, outlined).
- Which bond rank unlocks each signature, and the first signature pieces themselves.
- Custom Familiars: how a cultivator makes one and which mastered elements it may channel.
- Whether a public profile shows the name effect (it does not today).

## Transfer

Copy `development/`, `src/library/familiars/`, `src/server/familiars/` and both migrations. Serve
`/api/library-economy?capability=familiars`, mount `FamiliarsClientProvider`, pass the profile's
equipped Familiar as `activeFamiliarId`, and leave `src/workshop/previews/familiar-training/`
behind.

## Workshop history

- **2026-09-23:** Created. Active effects moved from Relic attunement and timed status effects to
  Familiars: QI training unlocks forms and elemental titles, the equipped Familiar's chosen
  effect letters the cultivator's name, and nothing grants an advantage.
- **2026-09-23:** Tiers renamed Common, Rare, Epic and Legendary, labelled "bond" beside the
  Familiar's own rarity.
- **2026-09-23:** Bond model put in properly. Familiar rarity and Bond Rank are separate scales;
  Common through Epic bond lend a growing elemental title tied to the Active Familiar; Legendary
  bond masters the element into a permanent collection wearable with any Familiar. The Active
  Familiar and the Active Elemental Effect are separate selections, coupled until mastery.
  Signatures added as SEIHouse-written, one-Familiar pieces (none written yet). Per-Familiar effect
  choices retired; the name-effect panel and name renderer split out of the bond panel.
- **2026-09-25:** Expanded the Familiar domain contract from five elements to the complete twelve.
  Existing Familiar affinities and the five already-authored title treatments are unchanged; the
  remaining visual treatments can be supplied independently without another domain-contract change.
