# Fate Survival Relics (server)

Created: 2026-08-04 (as the Relic v3 foundation) · Rebuilt: 2026-09-23

Relics are lightweight rewards with one source: **Fate Survival**, the Library's challenge system.
Surviving a challenge may earn one Relic, which grants DAO XP and Energy — more at higher
rarities — and nothing else. There is no attunement, weekly offering, status effect, title or QI
payout; the profile-embedded relic inventory those belonged to is retired in development.

## How a Relic is earned

`RelicService.recordFateSurvivalOutcome(uid, { challengeId, outcome, storyId? })` is the only
write. It is meant to be called by the Fate Survival judge with a trusted outcome; the judge is
not built yet, so the Workshop calls it through the development-only
`development.fate-survival-outcome` operation, which production principals are refused.

1. The outcome picks a rarity from `FATE_SURVIVAL_OUTCOME_RARITY` (`FATE AVERTED` → Legendary,
   `FATE SCARRED` → Rare, `DOOM MANIFESTED` → no Relic).
2. `relicForChallenge` picks a Relic of that rarity deterministically from the challenge id, so
   a repeated call for the same challenge always names the same Relic.
3. The repository stores at most one Relic per challenge per account, with a snapshot of the
   Relic definition and the outcome it came from.
4. The reward deliverer credits DAO XP (`fate-survival-relic` source) and Energy with keys
   `fate-survival-relic:<id>:<currency>`, so a retry credits once.

The browser reads Relics through `GET /api/library-economy?capability=relics` and cannot create
one.

## Files

| File | Role |
| --- | --- |
| `catalog.ts` | The six development Relics (Common → Transcendent), the outcome → rarity map, validation against the Relic reward policy. |
| `service.ts` | `RelicService`: snapshot and outcome recording. |
| `repository.ts`, `inMemoryRelicRepository.ts` | Storage boundary and the in-memory adapter used by tests and the Workshop. |
| `http.ts` | The browser-facing handler. |
| `database/migrations/20260923_005_fate_survival_relics.sql` | Durable reference schema: one Relic per challenge, DAO XP and Energy only. No TypeScript Postgres adapter yet. |

## Open decisions

The Relic names, the outcome → rarity mapping (challenge difficulty might decide rarity instead),
and every DAO XP and Energy amount are placeholder development values.

## History

- **2026-09-23:** Rebuilt as Fate Survival Relics. The Relic v3 foundation — story-scoped
  achievement templates, assignments and earned relics with QI, title and cosmetic rewards —
  was retired. Its proven pieces (versioned evaluators stored as data, immutable definition
  snapshots, completion evidence, a unique constraint as the final guard) carried over to
  Achievements (`src/server/achievements/`), and migration `20260923_004` drops its tables.
- **2026-08-04:** Relic v3 backend foundation created.
