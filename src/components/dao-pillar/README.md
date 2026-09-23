# Daily Dao Pillar

- **Source repository:** SENSEIDUKES/development (born here; no production original)
- **Source location:** `src/components/dao-pillar/` (client contracts, calendar hook, and the view),
  `src/server/dao-pillar/` (the server-owned calendar, see its README) and `src/server/qi/`
  (the Qi deposit ledger the calendar delivers through)
- **Workshop preview:** `?preview=dao-pillar` (in the Workshop's Rewards section) for every
  calendar state against an in-process service; `?preview=user-profile&cave=/home/dao-pillar` and
  `?preview=reward-loop` for the live calendar on the development economy
  (`/api/library-economy?capability=dao-pillar`)
- **Created:** 2026-09-18
- **Last Workshop update:** 2026-09-23
- **Last source comparison:** 2026-09-18 (Light-Novels inspected for the profile's daily
  check-in, `awardDirectQi`, and the cultivation profile schema; it has no calendar to compare)
- **Status:** approved reconstruction (Workshop Replica Mode B), first theme live
- **Visual target:** the approved "BETA TEST" reference; `public/dao-pillar/beta-test-banner.jpg`
  is the text-free centre of that art, with every word rendered from theme configuration

The Daily Dao Pillar replaces the profile's daily refinement check-in with a 30-day reward
calendar. One Library-controlled theme is active at a time; it schedules thirty days, and a
cultivator collects each scheduled day once, on that day. The server decides which day is open,
what it awards, and deposits the Qi.

## What lives where

| Piece | File | Role |
| --- | --- | --- |
| Contracts | `shared/daoPillarContracts.ts` | The generic reward entry (`{ type: 'qi', amount: 100 }` today; Energy and Media Packs typed for later — Relics come only from Fate Survival and reward Titles are retired, so neither is a calendar reward), the calendar snapshot, the claim response. Server and UI both read it. |
| Client port | `shared/daoPillarClient.ts` | `DaoPillarClient`, the HTTP implementation, `DaoPillarClientProvider`. A browser reads and claims only through this. |
| Calendar hook | `shared/useDaoPillarCalendar.ts` | Loading / ready / error / unavailable over the server snapshot; `claim()` with a tap lock, replaces the snapshot with the server's answer, re-reads on a lost answer, and reports each *newly* delivered deposit to the host. |
| Theme banner | `development/DaoPillarThemeBanner.tsx` | Art, name, tagline, active dates, pillars, seal, motto, description — all from the theme. No user selector. |
| Calendar | `development/DaoPillarCalendar.tsx` + `DaoPillarTile.tsx` | Five-by-six grid; every tile shows day, flame and reward; collected (cyan check, tap for reward and exact time), available today (cyan/gold glow, Collect), locked (dimmed, lock), missed (dimmed, struck amount). Milestones carry the gold ring. |
| View | `development/DaoPillarView.tsx` | Banner over Daily Rewards, the today line, streak, live region, and the loading / error / unavailable states. |
| Styles | `development/daoPillar.css` | Navy, antique gold, ivory, cyan; reduced-motion safe. |

There is no `reference/` folder: nothing was imported from production.

## Profile integration

The Cave's **Daily Dao Pillar card is a link** to `/home/dao-pillar`. It shows the server streak,
whether today is open or collected, and the amount collected today — all read from the same
snapshot the destination renders (`daoPillarCardLabels`). Collecting happens on the open tile.

After a delivered claim the hook calls `onRewardDelivered` as a refresh signal.
The server has already deposited the idempotent reward through the Qi ledger;
Profile re-reads that ledger projection and never adds a parallel local
balance. Without a `DaoPillarClientProvider` the card says the Dao Pillar is
not connected and the destination explains the same. Public views never mount it.

The legacy controller members (`dailyClaim`, `handleCheckIn`, `handleRepairPillar`, `isCracked`,
`daysTo3`, `daysTo10`) stay on the services contract because the locked reference page still
reads them; the Cave no longer does.

## Transfer

Copy `src/components/dao-pillar/`, `src/server/dao-pillar/`, `src/server/qi/`, the two migrations
under `database/migrations/`, `public/dao-pillar/`, and mount `DaoPillarClientProvider` with
`createHttpDaoPillarClient({ token })` where `EnergyClientProvider` is mounted. Serve
`/api/library-economy?capability=dao-pillar` from the host with a durable `DaoPillarRepository` and `QiLedger` and the
host's own token verifier (`production` identity mode). Leave `src/workshop/previews/dao-pillar/`
behind.

## Verification

`npm run test:dao-pillar`. Screenshots at 390px: `output/playwright/dao-pillar-calendar-390.png`,
`dao-pillar-tile-detail-390.png`, `dao-pillar-profile-card-390.png`,
`dao-pillar-destination-390.png` (the last two against the live dev-server route).

## Workshop history

- **2026-09-23:** Stays the calendar reward feature in the reward rework. Its reward entry no
  longer types Relics or Titles (Relics come only from Fate Survival; standalone reward Titles
  are retired), leaving QI today with Energy and Media Packs typed for later. The Workshop entry
  moved into the new Rewards section, and the Reward Loop runs the calendar beside the other
  reward sources. Corrected the route to `/api/library-economy?capability=dao-pillar`.
- **2026-09-18:** Created the 30-day calendar, the server-owned claim, and the Cave card and
  destination.
