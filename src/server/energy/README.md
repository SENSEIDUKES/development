# Energy ledger

Created: 2026-09-18

The server-owned Energy system. The ledger owns balances; the browser can only
read them and, in Development, ask for a test grant or reset. HARNESS may use
it only through SEN's neutral usage-authorization port and a trusted Library
host adapter. Nothing here selects final production storage or a payment path.

## Ownership

`EnergyRepository` is the portable storage boundary: the service knows only that interface, so
the durable store behind it is a host decision rather than something this system hard-codes.

`PostgresEnergyRepository` plus `database/migrations/20260918_001_energy_ledger.sql` are the
**current durable reference implementation** of that boundary — the worked example of how the
rules hold in a real database. The migration defines:

1. `energy_account` — one row per user: `balance` (settled) and `held` (reserved for work in
   flight). `available = balance − held`. Constraints keep both non-negative and `held ≤ balance`.
2. `energy_reservation` — one row per user intent, unique on `(uid, idempotency_key)`, moving
   `held → settled | released`.
3. `energy_transaction` — the readable history: `grant`, `reserve`, `charge`, `release`, each
   with the balance after it, unique on `(uid, idempotency_key)`.

Every movement runs inside one of the migration's functions (`energy_apply_grant`,
`energy_create_reservation`, `energy_settle_reservation`, `energy_release_reservation`,
`energy_reset_account`). Each locks the account row, applies the movement and its history line
together, and replays instead of repeating when its idempotency key was already applied.

`PostgresEnergyRepository` is the thin adapter over those functions; it accepts any client with
a `query(text, params)` method (`@electric-sql/pglite`, which the tests use to run the migration
verbatim, or a `pg`-style client). `InMemoryEnergyRepository` mirrors the same rules for tests
and DEV's own server. `energyLedgerContract.ts` runs one behaviour suite against both, so any
future adapter has an executable definition of correct to satisfy.

## Prices

Prices live in one place: `src/components/energy/shared/energyContracts.ts`. The current
projected generation schedule is chapter 1, image 3, short cue 3, long cue 15, soundscape 20,
and video 30–50 Energy; video requires a trusted whole-number quote in that range.
`narration.generate` and `translation.generate` exist but are unpriced and cannot be reserved.
The user-facing price never depends on provider cost; `settle` may record provider cost as
internal transaction metadata that no snapshot exposes.

## Identity and authorization

The shared host resolver under `src/server/identity/` turns a request into the
principal the ledger trusts. Energy does not own authentication, and request
bodies never name the user.

| Mode | Accepts | Development access |
| --- | --- | --- |
| `development` (this repository's default) | `Bearer dev:<uid>` from the Workshop, or a verified token when a verifier is supplied | always |
| `production` | only a verified token (`verifyIdToken`, as Light-Novels' routers do); constructing it without a verifier throws | never |

Development access unlocks exactly two things: the initial grant
(`ENERGY_DEVELOPMENT_INITIAL_GRANT`, default 500, applied once per account under the key
`initial-grant:<uid>`) and the HTTP operations `development.grant` / `development.reset`. The
service refuses both for any other principal with `EnergyAuthorizationError` (HTTP 403).

Environment: `LIBRARY_IDENTITY_MODE` (`development` | `production`),
`ENERGY_DEVELOPMENT_INITIAL_GRANT`, `ENERGY_DEVELOPMENT_DEFAULT_GRANT` (100),
`ENERGY_DEVELOPMENT_MAX_GRANT` (10000).

## HTTP boundary

`handleEnergyHttp` is routed through the consolidated
`/api/library-economy?capability=energy` host boundary
(`src/server/developmentApis.ts` in DEV and `api/library-economy.js` for the
reference Vercel bundle):

- `GET` → the caller's `EnergyAccountSnapshot`: balance, held, available, the catalog, recent
  activity, and `developmentControls` (or `null`).
- `POST { operation: 'development.grant', amount?, idempotencyKey }` / `{ operation: 'development.reset' }`.

Reserve, settle and release are **not** routes. They are service methods for server-side
generation code, so a browser can never decide that a charge succeeded.

### How DEV runs it today, and what is still undecided

DEV has no database connection of its own, so it uses the **in-memory implementation for
previewing**. The Vite dev server and the Vercel function each hold one ledger for the life of
the process: balances persist between requests on that instance and **reset whenever the
process or Vercel instance changes**. That is preview behaviour, not durable storage.

**The final durable host adapter will be selected during production-repository reconstruction.**
Which repository that is has not been decided: Light-Novels may be reconstructed, DEV may become
the foundation, or a clean production repository may combine DEV systems with surviving
Light-Novels infrastructure. Until that decision is made, no production wiring for Energy has
been built or verified, and none should be described as ready.

One thing worth stating plainly, because it rules out an easy assumption: Light-Novels today
persists through Firebase Data Connect's generated Admin SDK (`firebase-admin/data-connect`) and
carries no raw PostgreSQL client, so it cannot simply construct
`PostgresEnergyRepository(pool)`. Adopting Energy there would mean either exposing a SQL client
to the same database or writing a Data Connect adapter against `EnergyRepository`. This PR
deliberately builds neither.

The infrastructure that already works — Firebase Auth, Data Connect/Postgres, R2, secrets,
deployment configuration, and the production-data contracts — remains available to reuse, and
the reconstruction should reuse it rather than recreate it.

## Generation integration boundary

`src/server/energy/narrativeUsage.ts` adapts SEN's neutral usage contract to
`EnergyService`. A protected operation follows these steps:

1. **Resolve the price** — `service.getPrice(actionId)`; unpriced actions throw before any work.
2. **Confirm and reserve** — `service.reserve(principal, { actionId, idempotencyKey })`. Throws
   `InsufficientEnergyError` (with `required` / `available` for `EnergyInsufficientState`) when
   `available` is too low. Nothing is charged yet. **This is the only step that reads a price.**
   The amount it resolves is stored on the reservation and stays authoritative, so repricing an
   action — or taking it off the price list entirely — never changes what an in-flight
   reservation charges, and never strands Energy that is already held.
3. **Checkpoint before the provider** — `narrativeOperation.ts` records the
   reservation and operation phase before a potentially billable call.
4. **Store before settlement** — the provider result is durably checkpointed,
   then `service.settle(...)` charges the reservation's stored amount. A retry
   can settle that result without calling the provider again.
5. **Release only known-safe failures** — validation or provider failures known
   not to have completed release the hold. An unknown provider outcome keeps
   the reservation held and fails closed until a trusted recovery process
   resolves it.
6. **Idempotency** — the request carries one `idempotencyKey` per user intent. A system-caused
   retry reuses it: `reserve` replays the original reservation, `settle`/`release` replay their
   result, and nothing charges twice. A user-requested regeneration mints a new key and pays
   again. `service.findReservation(principal, key)` recovers an earlier attempt's reservation.

The generation endpoint does this on the server, next to where it already resolves its
provider; the UI only adds `EnergyActionCost` beside the control and reacts to the two
error/success states. Do not scatter ledger calls through UI components.

## Verification

`npm run test:energy` — ledger contract on both adapters (initial grant once, server-authorized
grant/reset, production users refused, reads reflect stored state, catalog prices, no
over-reservation, release restores availability, one charge per settlement, idempotent settle
and reserve, history consistent with balance), HTTP identity and authorization, migration
constraints, neutral usage-port adaptation, checkpoint-first provider execution,
unknown-outcome recovery, and proof that SEN never imports Energy.
