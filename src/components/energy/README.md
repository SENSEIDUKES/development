# Energy

- **Source repository:** SENSEIDUKES/development (born here; no production original)
- **Source location:** `src/components/energy/` (client contracts and reusable UI) and
  `src/server/energy/` (the server-owned ledger, see its README)
- **Workshop preview:** `?preview=energy` for the reusable pieces; `?preview=user-profile`
  for the live profile emblem and panel against `/api/energy`
- **Created:** 2026-09-18
- **Last Workshop update:** 2026-09-18
- **Last source comparison:** 2026-09-18 (Light-Novels inspected for authentication,
  idempotency and Postgres conventions; it has no Energy system to compare against)
- **Status:** approved reconstruction (Workshop Replica Mode B), packaged Library capability

Energy is a Library economy capability. `@seihouse/library/energy` publishes its
client-safe contracts, provider, hooks, and screens. SEN sees only its neutral
usage-authorization port; it never imports balances, prices, account types, or
transaction models.

## What lives where

| Piece | File | Role |
| --- | --- | --- |
| Action ids + price catalog | `shared/energyContracts.ts` | The permanent identifiers and the **one editable catalog**. Server and UI both read it. |
| Client port | `shared/energyClient.ts` | `EnergyClient`, the HTTP implementation, and `EnergyClientProvider`. A browser reads Energy only through this. |
| Account hook | `shared/useEnergyAccount.ts` | Loading / ready / error / unavailable state over the server snapshot, with refresh and the development actions. |
| Balance indicator | `development/EnergyBalanceIndicator.tsx` | ⚡ 500 — the available balance, dash while loading, nothing when Energy is not connected. |
| Action cost | `development/EnergyActionCost.tsx` | ⚡ 1 next to a control. Reads the catalog; renders nothing for an unpriced action. |
| Deduction notice | `development/EnergyDeductionNotice.tsx` | In-place confirmation plus `energyDeductionToast` for `SEIToastProvider` hosts. |
| Insufficient state | `development/EnergyInsufficientState.tsx` | "This needs ⚡ 3 and you have ⚡ 1." with an Open Energy action. |
| Energy panel | `development/EnergyPanel.tsx` | Balance, what Energy is for, example costs, recent activity, development controls when the server exposed them. |

There is no `reference/` folder: nothing was imported from production. The pieces are exported
from `@seihouse/library/energy`. Portable generation uses `@seihouse/sen/generation` usage
contracts and a host adapter; it does not adopt Library Energy UI or domain types.

## Profile integration

The Cultivator Cave keeps its Energy emblem. It is now a button that shows the live available
balance and opens `/home/energy`, a Cave destination holding `EnergyPanel`. The page reads the
account through `useEnergyAccount()`; without an `EnergyClientProvider` the emblem stays a
plain label and no request is made. The public view never mounts it. The former
`accountControls.energyBalance` prop was removed: a host no longer hands the Cave a number.

## Rules the UI keeps

- The browser never computes or edits a balance. Every number rendered came from the server's
  last response; mutations replace the snapshot with the server's reply.
- Development controls render only when the snapshot carries `developmentControls`, which the
  server sets only for principals it granted development access. Production users never see
  them and the server refuses the calls anyway.
- Double-clicks cannot double-grant: each grant click mints an idempotency key that the server
  honours once.

## Generation authorization

`src/server/energy/narrativeUsage.ts` implements SEN's neutral authorization
port for the Library host. Reservations, settlement, release, and recovery are
server-owned and idempotent. `narrativeOperation.ts` checkpoints before a
provider call and durably records the provider result before settlement. An
unknown provider outcome keeps the hold and fails closed on retry instead of
calling the provider twice. There is no client-authorized refund. Any future
settled-charge refund must be an append-only server adjustment that preserves
the original charge.

## Transfer

These surfaces are portable: copy `src/components/energy/` whole, mount `EnergyClientProvider`
with a client built from the host's own token (`createHttpEnergyClient({ token: … })`) at the app
shell, and serve `/api/energy` from `src/server/energy`. The Workshop-only
`src/workshop/previews/energy/` stays behind.

What the host serves that route over is **not settled**. `EnergyRepository` is the storage
boundary; `PostgresEnergyRepository` and the SQL migration are the current durable reference
implementation; DEV itself runs the in-memory implementation for previewing, so balances reset
when the process or Vercel instance changes. The durable adapter and the host repository will be
chosen during production-repository reconstruction — see
[the server README](../../server/energy/README.md). Nothing here has been wired to or verified
against a production deployment.
