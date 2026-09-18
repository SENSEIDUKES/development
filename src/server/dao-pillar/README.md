# Daily Dao Pillar calendar

Created: 2026-09-18

The server-owned reward calendar behind the Cultivator Cave's Daily Dao Pillar. One theme is
active at a time, it schedules thirty days, and a cultivator may claim each scheduled day once,
on that day. The server decides which day is open, what it awards, and deposits the Qi; the
browser only renders the snapshot it is given and asks to claim "today".

## Ownership

Four concerns, kept apart so a theme can change without touching the calendar or history:

| Concern | Where | Notes |
| --- | --- | --- |
| Theme configuration | `themes.ts` (`DAO_PILLAR_THEMES`, `BETA_TEST_THEME`) | Banner, copy, active dates, time zone, visual accents, reward rules. Library-controlled; no user selector. |
| Reward schedule | `themes.ts` (`buildRewardSchedule`) | Derived from the theme: `everyDay`, `milestoneDays` + `milestone`, optional per-day `overrides`. Entries are generic (`{ type: 'qi', amount: 100 }`). |
| Claim history | `DaoPillarRepository` (`repository.ts`) | One row per (uid, cycle, day) with the reward payload snapshot, scheduled date, claimed time, status and what landed. |
| Reward delivery | `src/server/qi` (`QiLedger`) | Qi deposits, one per idempotency key. The only reward kind delivered today; `DELIVERABLE_REWARD_TYPES` lists what can be activated. |

`DaoPillarService` composes them: `getSnapshot` builds the calendar (tile states, today,
streak) and `claimToday` is the one write.

## Calendar boundary

`calendar.ts` answers every date question from the server clock in the theme's IANA time zone
(`America/New_York` for Beta Test). Day *n* is `startsOn + (n − 1)` days; a cycle is
`<themeId>:<startsOn>`, so re-running a theme later is a new cycle with fresh tiles while the
old claims stay on record. Tile states are derived, never stored: `collected` when a claim
exists, `available` on the scheduled date, `missed` before it, `locked` after it.

The streak counts consecutive claimed **dates** across every theme and cycle, ending today or,
when today is still open, yesterday. A theme change never resets it.

## Claim rules

- `claimToday` refuses outside the cycle (`DaoPillarNotAvailableError`, HTTP 409) and otherwise
  claims exactly the scheduled day for the server's date. Bodies name no day, date or amount.
- `claimDay` on the repository is atomic and idempotent. Postgres: `dao_pillar_claim_day` locks
  the cultivator's Qi account row, inserts the claim (unique on `uid, cycle_id, day_number`) and
  deposits each `qi` entry through `qi_apply_deposit` in one transaction; a repeated call returns
  the original claim with `replayed = true`. In memory: the same steps run synchronously.
- A reward entry the delivery cannot handle aborts the whole claim (`dao_pillar_unsupported_reward`),
  and a theme containing one cannot be activated at all (`validateDaoPillarTheme`).

## Identity and configuration

Identity is the Energy resolver (`createEnergyPrincipalResolver`): `Bearer dev:<uid>` in
development, a verified token in production, mode shared through `ENERGY_IDENTITY_MODE`.

Environment: `DAO_PILLAR_ACTIVE_THEME` (default `beta-test`), `DAO_PILLAR_TIME_ZONE` and
`DAO_PILLAR_STARTS_ON` (override the active theme's calendar without a code change).

## HTTP boundary

`handleDaoPillarHttp` serves `/api/dao-pillar` (`vite.config.ts` in the dev server,
`api/dao-pillar.js` on Vercel via `scripts/buildDaoPillarApi.mjs`):

- `GET` → `DaoPillarCalendarSnapshot` (theme, cycle, today, thirty tiles, streak).
- `POST { operation: 'claim' }` → `DaoPillarClaimResponse` (`claimed` | `already-collected`,
  the claim, and the refreshed snapshot so no second request is needed).

## Persistence today

As with Energy, DEV runs the **in-memory adapters** for previewing: claims and Qi live for the
life of the dev server or Vercel instance and reset with it. `PostgresDaoPillarRepository` +
`PostgresQiLedger` over `database/migrations/20260918_002_qi_ledger.sql` and
`20260918_003_dao_pillar_calendar.sql` are the durable reference implementation, proven by
running both migrations verbatim on PGlite. Production's Qi balance lives on the Light-Novels
profile (`daoXp` / `heavenlyQi`, moved by `awardDirectQi`); a host adopting this system either
applies the ledger migration beside that profile or implements `QiLedger` and
`DaoPillarRepository` against its own store. The Cave mirrors each delivered deposit onto the
profile it holds (`applyQiDeposit`), so rank and balance update without a reload.

## Verification

`npm run test:dao-pillar` — the calendar contract on both adapters (thirty tiles and states,
one claim per day under rapid concurrent taps and reloads, refusals before/after the cycle and
for any day but today, milestone awards on 7/14/21/28, streak across skipped days, history kept
across theme changes and re-runs with no duplicate award, per-cultivator isolation, ledger lines
consistent with balance), migration guards, the HTTP boundary, the calendar/time-zone maths,
theme validation, and the client hook and view.
