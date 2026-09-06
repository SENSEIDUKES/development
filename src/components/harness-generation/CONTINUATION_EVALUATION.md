# Steered continuation evaluation — 2026-09-06

The ordinary Harness cycle still uses one writing call per chapter. This work adds
persistent author direction, compact evidence and mechanical continuity, bounded
lookup, and repair from saved responses. It does not add a literary-review loop.

## Contract verification

The deterministic continuation test runs the real controller, repository port,
response parser, capabilities, prompt builder and SEN adapter through Chapter 50.
It covers four directions, an enemy becoming an ally, an explicit history
revision, a three-chapter prose window, reload, an injected Chapter 7 enhancement
failure, and repair after Chapter 12. Repair preserves chapter IDs and prose and
does not call the writer. Replaying an older event does not replace later values.
The test checks exact System rows/status values, Codex quantities, speaker roles,
stable character identity and chapter-scoped relationships. Additional cases cover
zero, negative/decimal values, spelled-out zero, partially omitted events and
repeated descriptions with different quantities.

## Real provider run

- Provider: Gemini, `google/gemini-3.1-flash-lite`, using the existing local
  connection through the normal server execution adapter.
- Test story: **The Bridge of Cinders**, compact chapters requested at 400–600
  words. The final 50-chapter sequence contains **19,969 words**. This is a compact
  continuation stress test, not a 50-chapter full-length manuscript benchmark.
- Steering at Chapters 2, 11, 23 and 36: ally instead of final enemy; mercy and
  rescue; explicitly revise the bridge fire to lightning; keep the bell and
  return to evacuation with Iven as an ally.
- Chapter 7 processing was deliberately failed and repaired after Chapter 12;
  accepted prose remained available. All final processing receipts are complete
  after deterministic replay. Raw responses and warnings remain inspectable.
- An interrupted provider call during development was explicitly retried. The
  test did not silently retry an unknown provider outcome.

The live evaluation was iterative. An early pilot exposed event-envelope
variation. The initial long sequence reached Chapter 50, but repetitive departure
memories overpowered the Chapter 36 rescue direction. A separate continuation
from the preserved Chapter 35 checkpoint tested putting author direction at the
end of the request. That restored the rescue but exposed a reset to the original
spark balance. A further preserved-checkpoint continuation tested mechanical
observation history alongside later transfer/spending evidence. Original runs
remain available; no accepted original chapters were overwritten. The final
sequence preserves the first 35 chapters byte-for-byte and continues through 50.
The latest parser was then replayed over that sequence without any writer calls,
recovering quantities such as prose “zero” into the structured value `0`.

## Findings

- Chapter 2 establishes the alliance while still addressing Iven's destruction
  of the bridge. Chapter 23 explicitly applies the lightning revision.
- The corrected Chapter 36 returns Mara to the rescue, with Iven leading the ship
  and Sel treating survivors. Later chapters retain the successful evacuation and
  the alliance; the original final-enemy outline does not return.
- The final SEN export contains exactly Mara, Iven and Sel, identifies Mara as
  the main character, retains Iven's Captain role and ally relationship, and
  presents Mara's latest quantified balance as **0 sparks** in both Codex and
  memory. Original chapter System cards retain their historical values.
- Chapter 50's context audit contains about **23,468 estimated tokens** and the
  story has **94 preserved events**. The compact memory is useful beyond the
  three-chapter prose window, but repetitive developments still consume space.
- Prose quality remains a limitation of this run: the model repeatedly returns
  to reflective passages about leaving the past. Even with quantity history it
  can describe a resource-consuming action without adequately establishing its
  available supply. The adapter withholds unsupported exact quantities or marks
  old observations with later evidence; it does not certify narrative arithmetic
  or silently rewrite prose. This evaluation supports the storage, steering and
  repair contracts, not a claim of error-free long-form generation.

## Browser and package verification

The real Harness UI saved a direction to IndexedDB and retained it after reload.
Reader navigation from Chapter 1 to Chapter 2 changed Iven from Enemy to ally in
Codex while keeping Captain as his role. The existing System card rendered the
chapter's exact `16 sparks`. Codex used Mara's name, and characters without a
power level no longer acquired an invented score. Reader/Codex were inspected at
390px and 1440px, with no horizontal overflow or console errors observed.

Harness tests, the affected CharacterCard tests, TypeScript, the application
build and package boundary/build/packed-consumer checks passed. Live generation
used a file repository implementing the same persistence port; browser IndexedDB
was separately verified. Production data and production source were not changed.

Local evidence is under `seiv-0/harness-continuation-mechanics/` (ignored by Git):
`state.json`, `state-sen.json`, and `state-metrics.json`. Earlier comparison runs
are in adjacent continuation folders. The explicit, resumable runner is
`scripts/evaluateHarnessContinuation.ts`; it takes an output path and optional
environment file. `--repair` replays committed evidence; `--retry-unknown` is an
explicit operator choice for an interrupted provider request. Neither is enabled
automatically in tests.
