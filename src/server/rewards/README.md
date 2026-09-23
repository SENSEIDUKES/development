# Library reward core (server)

Created: 2026-09-23

The server side of the reward rework. Every balance a reward touches is moved here, once per
idempotency key, by a ledger the browser cannot write to. The Workshop runs this same code in
the browser tab (see `src/workshop/previews/rewards/workshopEconomy.ts`); production hosts run it
behind their own identity and storage.

## The rules it enforces

- **DAO XP** is permanent and credit-only. It is the only input to Cultivator Rank, and rank only
  chooses the cultivator's colours. Only achievements (through Mystery Scrolls), creation, Fate
  Survival Relics and a one-time opening balance may credit it; the ledger refuses anything else,
  and so does its SQL `CHECK`.
- **QI** is spendable. It arrives from the Daily Dao Pillar and Mystery Scrolls, and is spent on
  Familiar training and QI-priced Celestial Store offers. Spending QI never moves DAO XP or rank.
- **Energy** powers generation. Fate Survival Relics may grant it, and Energy-priced Store offers
  spend it. Generation keeps its own reserve-then-charge path.
- **No reward grants an advantage.** Familiar tiers unlock forms and cosmetic effects only; the
  training ladder is validated at load and refuses any unlock carrying more than presentation.

## What lives where

| Piece | Location | Role |
| --- | --- | --- |
| Reward policy | `rewards/policy.ts` | Which balances each reward source may credit: Mystery Scroll → DAO XP + QI, Fate Survival Relic → DAO XP + Energy, creation → DAO XP. |
| Deliverer | `rewards/deliverer.ts` | Validates grants against the policy, then credits each ledger with a key `<source>:<id>:<currency>`, so a retried delivery credits once. |
| DAO XP ledger | `dao-xp/` | Credit-only ledger, in-memory and Postgres adapters, HTTP read. |
| QI ledger | `qi/` | Deposits and (new) spends with replay-mismatch guards, in-memory and Postgres adapters. |
| Energy ledger | `energy/` | Grants, generation reservations and (new) direct spends. |
| Achievements | `achievements/` | Catalogue, versioned evaluators, activity intake, one scroll per goal per account, opening and delivery, creation DAO XP. |
| Fate Survival Relics | `relics/` | Relic catalogue, outcome → rarity mapping, one Relic per challenge per account, delivery. |
| Familiars | `familiars/` | Ownership, QI training, cosmetic selection, Store purchases at today's server-resolved price. One purchase key buys one Familiar, and each payment's ledger key names the Familiar it bought. |
| Daily Dao Pillar | `dao-pillar/` | Unchanged calendar; deposits QI only. |
| Development economy | `economy/developmentRuntime.ts` | One runtime wiring all of the above, served at `/api/library-economy?capability=<name>` for `energy`, `dao-pillar`, `cultivation`, `dao-xp`, `achievements`, `relics`, `familiars`. |

## Durable storage

| Migration | Adds | TypeScript adapter |
| --- | --- | --- |
| `20260923_001_qi_spend.sql` | `qi_apply_spend`; both QI functions refuse a replayed key describing a different movement | `PostgresQiLedger` |
| `20260923_002_energy_spend.sql` | `energy_apply_spend` | `PostgresEnergyRepository` |
| `20260923_003_dao_xp_ledger.sql` | DAO XP account and transactions, source `CHECK` | `PostgresDaoXpLedger` |
| `20260923_004_achievements_mystery_scrolls.sql` | Activity, earned achievements, scrolls; drops the retired Relic v3 tables | Not written yet (in-memory only) |
| `20260923_005_fate_survival_relics.sql` | One Relic per challenge, DAO XP and Energy only | Not written yet (in-memory only) |
| `20260923_006_familiar_training.sql` | Ownership, training, offers, purchases | Not written yet (in-memory only) |

`rewardSchema.test.ts` applies every migration in order with PGlite and proves the new
constraints. None of these migrations is applied to a production database by this repository.

## Development-only operations

Each is refused for a principal without development access, so production users can never reach
them: `development.grant` (QI), `development.opening-balance` (DAO XP),
`development.record-activity` (achievements), `development.fate-survival-outcome` (Relics) and
`development.grant-familiar` (Familiars). They stand in for systems that do not exist yet — a
trusted activity intake, the Fate Survival judge — and for a checkout.

## Still needed for production

- A trusted server-side activity intake calling `AchievementService.recordActivity`. The service
  applies one account's activities one at a time within a server process; a host running several
  processes must hold the same per-account lock (for example a row lock on the account) so the
  optional creation cap cannot be raced.
- The Fate Survival judge calling `RelicService.recordFateSurvivalOutcome` with a verified outcome.
- Postgres adapters for achievements, Relics and Familiars (the SQL already exists).
- A Light-Novels plan for retiring the profile's `qi`, special reserves and relic inventory, and
  for carrying each profile's DAO XP into the ledger as its opening balance.

## Verification

`npx vitest run src/server/rewards src/server/dao-xp src/server/qi src/server/energy
src/server/achievements src/server/relics src/server/familiars src/server/economy`.
