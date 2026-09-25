# Chapter Generation (retired)

> **Retired 2026-09-25.** The legacy Chapter Generation pipeline, its Workshop
> route (`?preview=chapter-generation-flow`), and its deployed
> `/api/chapter-generation` endpoint were removed with the old Fate Survival
> generation rules they carried (Doom/Fate Deadline prompts, Survival
> visibility and pressure wording, Blueprint mystery seeding, and the Relaxed /
> Balanced / Hardcore / Dao Master rhythm tiers). HARNESS
> (`src/components/harness-generation/`) is the only chapter generator. The
> Workshop manifest keeps the entry as an archived record with no route; the
> full implementation and its history remain in git.

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Replica created:** 2026-07-31
- **Last Workshop update:** 2026-09-25 (retired)
- **Last source comparison:** 2026-08-09

## What remains here, and why

Two files are still imported by live code, so they stay until their owner moves them:

| File | Live consumer |
| --- | --- |
| `shared/packets/livingStoryEntityIdentity.ts` (+ test) | `src/server/audio/codexVoiceQuote.ts`, `codexVoiceQuoteHttp.ts`, `characterVoiceAssignments.ts` (the Codex voice-quote endpoint): the `LivingStoryRecord` shape and stable entity identity helpers |
| `shared/packets/creatureCodex.ts` (+ test) | `src/server/audio/characterVoiceAssignments.ts`: `scrubProviderVoiceFields` |

Nothing else in this folder exists any more. Moving these two files to the audio
owner is a separate change; do not add new code here.
