# Rewards — Achievements, Mystery Scrolls and the reward reveal

- **Source repository:** SENSEIDUKES/development (born here; no production original)
- **Source location:** `src/components/rewards/` (panels and the shared reward reveal),
  `src/library/rewards/` (contracts and the client), `src/server/achievements/`,
  `src/server/rewards/` and `src/server/dao-xp/` (the server side, see
  [`src/server/rewards/README.md`](../../server/rewards/README.md))
- **Workshop previews:** `?preview=achievements` (goals, scrolls and the scroll reveal lab),
  `?preview=reward-loop` (the whole reward system on one account),
  `?preview=user-profile&cave=/rewards` (the Cave's Rewards destination)
- **Created:** 2026-09-23
- **Last Workshop update:** 2026-09-23
- **Last source comparison:** 2026-09-23 (this repository; the reveal art descends from the Relic
  Reveal replica of Light-Novels, last compared 2026-07-29)
- **Status:** approved reconstruction (Workshop Replica Mode B), development skeleton
- **Package:** `@seihouse/library/rewards` (Library-owned; SEN never depends on it)

## What it is

Achievements are Library-defined goals that recognize natural activity — reading, creation and
exploration today, other media later. Earning one mints exactly one **Mystery Scroll** for that
account. Most scrolls are **concealed**: nothing about the reward shows until the scroll is opened.
Selected major milestones are **curated**: their rarity and reward show upfront. Only the server
decides what a scroll holds; the browser can ask to open a scroll it owns and nothing else.

A scroll's reward is DAO XP and QI. DAO XP is permanent and alone decides the Cultivator Rank; QI
is spendable (the Celestial Store, Familiar training). Creating a story or chapter also credits a
small amount of DAO XP directly, outside any scroll.

## What lives where

| Piece | File | Role |
| --- | --- | --- |
| Vocabulary | `src/library/rewards/contracts.ts` | Rarities (Common → Transcendent), reward grants (`dao-xp`, `qi`, `energy`), activity kinds, `describeRewardGrants`. Shared by every reward source. |
| Achievement contracts | `src/library/rewards/achievements.ts` | Achievement and scroll views, the snapshot, the open response, `ACHIEVEMENTS_API_PATH`. |
| Client | `src/library/rewards/achievementsClient.tsx` | `createHttpAchievementsClient`, `AchievementsClientProvider`, `useAchievements` (loading / ready / error / unavailable, `open()` with a tap lock). |
| Achievements panel | `development/AchievementsPanel.tsx` | Sealed scrolls first, then goals by category with progress, hidden goals as hints, planned media goals as "Coming later". Opening a scroll plays the reveal. |
| Scroll reveal | `development/MysteryScrollReveal.tsx` | Sealed → unsealing → revealed. The unseal plays SEN's `ManifestationReveal` over Library UI's `CelestialScrollVessel` for at least 1.4 s while the server answers; the answer lands in the rarity card. A failed open stays sealed with the reason, so it can be retried. |
| Reveal parts | `development/RewardRevealOverlay.tsx`, `RewardSealedCard.tsx`, `RewardRevealCard.tsx`, `RewardGrants.tsx`, `RewardSigil.tsx`, `rewardTheme.ts`, `rewards.css` | The Relic Reveal's rarity ladder, sigils, particles, sealed face and haptics, lifted out of the old relic flow so Mystery Scrolls and Fate Survival Relics share one reveal. |

## How it connects

1. Activity reaches `AchievementService.recordActivity` (a host server in production; the Workshop's
   activity simulator in development). Progress is counted from the recorded activity, never
   stored separately.
2. When a goal's condition is met, the server mints one sealed scroll, keeping a snapshot of the
   goal and its reward. A unique constraint guarantees one scroll per goal per account.
3. Opening calls `open-scroll`. The server delivers the reward through the DAO XP and QI ledgers
   with keys `mystery-scroll:<scroll id>:<currency>`, so a retried or doubled open credits once.
4. The Cave re-reads DAO XP and QI when a scroll opens, so the rank colours and QI balance move
   with the reveal.

## What the Workshop simulates

The Achievements scene and the Reward Loop run real server code — the development economy
(`createDevelopmentEconomy`) — in the browser tab. Only these inputs are stand-ins, and each is
labelled **Simulated** on screen:

- **Activity** — "Read a chapter", "Create a story", "Open a Codex entry" and the rest post
  `development.record-activity`, which the server refuses for production accounts.
- **Opening balances** — scenario seeds give an account DAO XP or QI to start from.
- The scroll reveal lab plays sample contents and credits nothing.

## Decisions still open

Each has a working development default, is configurable or isolated in one place, and is not a
product decision:

| Decision | Current default | Where to change it |
| --- | --- | --- |
| When a scroll's reward lands | On open (`on-earn` also works) | `ACHIEVEMENTS_SCROLL_DELIVERY`; the Achievements workspace's Advanced controls |
| Which balances scrolls may grant | DAO XP and QI, no Energy | `REWARD_SOURCE_POLICY` in `src/server/rewards/policy.ts` |
| Goal names, targets, rarities and amounts | Placeholder set of nine | `src/server/achievements/catalog.ts` |
| Which milestones are curated | "Keeper of the Long Arc", "First Manifestation" | `presentation` in the catalogue |
| Creation DAO XP and its daily cap | 50 per story, 10 per chapter, no cap | `DEFAULT_ACHIEVEMENTS_CONFIG`; `CREATION_DAO_XP_DAILY_CAP` |
| Reward odds and drop tables | None: each goal's reward is fixed | Not built |
| Six reward rarities vs the store's four ranks | Kept separate | `REWARD_RARITIES` |

## Production integration still needed

- A trusted activity intake: a production server must call `recordActivity` from real reading,
  creation and exploration events. The browser can never report its own activity.
- Durable adapters. `database/migrations/20260923_004_achievements_mystery_scrolls.sql` and
  `20260923_003_dao_xp_ledger.sql` define the tables and functions, and the schema test proves
  them; the TypeScript Postgres adapter for achievements is not written yet (DAO XP has one).
- Light-Novels still stores `qi`, special reserves and the relic inventory on the profile; retiring
  or backfilling those fields is a separate production task.

## Transfer

Copy `src/components/rewards/`, `src/library/rewards/`, `src/server/achievements/`,
`src/server/rewards/`, `src/server/dao-xp/`, and the migrations above. Mount
`AchievementsClientProvider` with `createHttpAchievementsClient({ token })` next to the other
economy providers and serve `/api/library-economy?capability=achievements` from the host. Leave
`src/workshop/previews/achievements/` and `src/workshop/previews/rewards/` behind.

## The Reward Loop workspace

`?preview=reward-loop` is Workshop-owned (`src/workshop/previews/rewards/`), so it has no component
folder of its own. It shows every reward relationship on one account — Earn, Rewards, Familiar,
Store — beside a live cultivator card and a ledger feed. `workshopEconomy.ts` runs the development
economy in the tab, `rewardScenarios.ts` seeds the named accounts, and `WorkshopEconomyProvider`
mounts the same client providers a host mounts, so the Cave preview reuses it too.

## Verification

`npx vitest run src/server/achievements src/server/rewards src/server/dao-xp
src/server/economy src/components/user-profile` and `npm run check:ownership`.

## Workshop history

- **2026-09-23:** Created. Achievements replace the story-scoped Relic achievements; Mystery Scrolls
  become the achievement reward, with concealed and curated scrolls. The Relic Reveal's animated
  reveal was lifted into shared reward-reveal parts and joined to the celestial scroll unseal.
  New Workshop entries: Achievements & Mystery Scrolls and the Reward Loop, both in the Rewards
  section.
