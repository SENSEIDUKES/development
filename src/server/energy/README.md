# Energy ledger

Created: 2026-09-18

The server-owned Energy system. The database owns balances; the browser can only read them
and, in development, ask for a test grant or a reset. This is the first skeleton: no
generation flow uses it yet, and nothing here is the final Energy economy or a payment path.

## Ownership

Postgres is the durable owner. `database/migrations/20260918_001_energy_ledger.sql` defines:

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
a `query(text, params)` method (`pg`, or `@electric-sql/pglite`, which the tests use to run the
migration verbatim). `InMemoryEnergyRepository` mirrors the same rules for tests and the
Workshop dev server. `energyLedgerContract.ts` runs one behaviour suite against both.

## Prices

Prices live in one place: `src/components/energy/shared/energyContracts.ts`. Current test
prices are `chapter.generate` 1 and `image.generate` 3; `soundscape.generate`,
`narration.generate` and `translation.generate` exist but are unpriced and cannot be reserved.
The user-facing price never depends on provider cost; `settle` may record provider cost as
internal transaction metadata that no snapshot exposes.

## Identity and authorization

`createEnergyPrincipalResolver` turns a request into the principal the ledger trusts. Bodies
never name the user.

| Mode | Accepts | Development access |
| --- | --- | --- |
| `development` (this repository's default) | `Bearer dev:<uid>` from the Workshop, or a verified token when a verifier is supplied | always |
| `production` | only a verified token (`verifyIdToken`, as Light-Novels' routers do); constructing it without a verifier throws | never |

Development access unlocks exactly two things: the initial grant
(`ENERGY_DEVELOPMENT_INITIAL_GRANT`, default 500, applied once per account under the key
`initial-grant:<uid>`) and the HTTP operations `development.grant` / `development.reset`. The
service refuses both for any other principal with `EnergyAuthorizationError` (HTTP 403).

Environment: `ENERGY_IDENTITY_MODE` (`development` | `production`),
`ENERGY_DEVELOPMENT_INITIAL_GRANT`, `ENERGY_DEVELOPMENT_DEFAULT_GRANT` (100),
`ENERGY_DEVELOPMENT_MAX_GRANT` (10000).

## HTTP boundary

`handleEnergyHttp` serves `/api/energy` (`vite.config.ts` in the dev server, `api/energy.js`
on Vercel via `scripts/buildEnergyApi.mjs`):

- `GET` → the caller's `EnergyAccountSnapshot`: balance, held, available, the catalog, recent
  activity, and `developmentControls` (or `null`).
- `POST { operation: 'development.grant', amount?, idempotencyKey }` / `{ operation: 'development.reset' }`.

Reserve, settle and release are **not** routes. They are service methods for server-side
generation code, so a browser can never decide that a charge succeeded.

### Deployment note

This repository has no database connection. The Vite dev server and the Vercel function each
hold one in-memory ledger for the life of the process: balances persist between requests on
that instance and start over when it is recycled. Light-Novels wires
`new PostgresEnergyRepository(pool)` over its Data Connect Postgres instance, applies the
migration, and passes `production` with its Firebase verifier.

## Generation integration boundary (future phases)

Every generation feature will follow the same six steps through `EnergyService`:

1. **Resolve the price** — `service.getPrice(actionId)`; unpriced actions throw before any work.
2. **Confirm and reserve** — `service.reserve(principal, { actionId, idempotencyKey })`. Throws
   `InsufficientEnergyError` (with `required` / `available` for `EnergyInsufficientState`) when
   `available` is too low. Nothing is charged yet.
3. **Run the generation flow** — provider calls, validation, as today.
4. **Settle after success and storage** — `service.settle(principal, { reservationId, providerCost? })`
   only once the chapter/image is durably stored. Returns the charge for `EnergyDeductionNotice`.
5. **Release on any failure** — `service.release(principal, { reservationId, reason })` in the
   error path, so held Energy returns.
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
constraints, and the boundary test that no generation path imports Energy.
