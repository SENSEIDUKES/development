# Harness Generation

## Purpose

Harness Generation is an independent, checkpoint-first novel core. It gives an
author a frozen Foundation copied from a saved Story Seed, asks a provider for one complete
chapter, preserves raw output before interpreting it, accepts usable prose
without requiring rich application structures, and carries committed prose and
semantic-event evidence into the next chapter.

It is not a replacement, wrapper, import path, or compatibility layer for the
existing Chapter Generation feature.

## Workshop record

| Field | Value |
| --- | --- |
| Replica creation date | 2026-08-29 |
| Last Workshop update | 2026-08-29 |
| Last source comparison | 2026-08-29 — independent feature; current main Chapter Generation was inspected only as a product-requirements inventory |
| Lifecycle status | Phase 3 deterministic story harness |

### History

- **2026-08-29:** Created the independent Harness Generation tab. It owns a
  premise-first Foundation, revision snapshots, a one-call Gemini adapter,
  tolerant prose acceptance, append-only semantic event evidence, versioned
  IndexedDB persistence, independently durable checkpoints, local export, and
  Chapter 1 → Chapter 2 context.
- **2026-08-29:** Added the in-place Phase 3 database migration, versioned
  deterministic capability registry, provenance-backed canonical views,
  append-only corrections, audited context selection, internal Codex/System
  intents, idempotent replay, and persisted sequential batches. Prose and raw
  semantic evidence remain the authority beneath every derived record.
- **2026-09-03:** Connected the Workshop experience through a one-way Story
  Seed handoff. Selecting a saved seed copies the seed and optional Blueprint
  into a frozen Harness Foundation; manual premise entry remains a secondary
  development fallback.

## Source and transfer boundary

- `reference/` is a locked independent-baseline message. No legacy generator
  component is copied or rendered there.
- `development/` contains the active client workspace.
- `shared/` owns the portable Foundation, response boundary, context compiler,
  controller, and browser repository contracts.
- `src/server/harness-generation/` owns provider configuration, prompt and API
  behavior. It is intentionally outside the published package.
- `src/workshop/previews/harness-generation/` is Workshop-only mounting.

The portable package entry is `@seihouse/sen/harness-generation`. It may use
generic SEN UI primitives and accept a neutral, host-injected Story Seed source,
but it never imports Story Seed internals. The Workshop preview owns the only
Story Seed-to-Foundation adapter. Chapter Generation, Reader, Reader Codex,
cards, System Prompt, and their contracts remain outside the Harness graph.

## Durable generation behavior

1. Persist `request_started` before a provider request.
2. Persist the raw provider response immediately after it returns.
3. Persist accepted prose before optional event preservation.
4. Preserve valid event descriptions independently; malformed optional events
   become diagnostics.
5. Atomically append a chapter, committed events, attempt receipt, and updated
   story head.

Only a committed chapter enters the next context snapshot. If storage fails,
the controller retains the completed local checkpoint, blocks continuation,
and retries persistence without another model call.

## Phase 3 extension boundary

`HarnessEventPreserver` remains the lossless transport boundary. The injected
`HarnessCapabilityRegistry` consumes only committed semantic events and emits
versioned receipts, canonical records, and internal projection intents with
stable replay identities. A handler upgrade changes its version and can
supersede its prior output without regenerating or rewriting prose.

The internal projections are intentionally not Reader Codex, card, Color Code,
or System Prompt payloads. Missing presentation rules remain explicit
unresolved records for a later adapter rather than guessed application data.

## Transfer notes

Copy the `development/` and `shared/` code, its package barrel, and the server
route as one feature. Leave the Workshop preview, manifest registration,
reference pane, and local Development endpoint guard behind unless the target
application explicitly needs them.
