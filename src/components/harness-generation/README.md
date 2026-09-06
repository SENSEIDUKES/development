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
| Last Workshop update | 2026-09-06 |
| Last source comparison | 2026-08-29 — independent feature; current main Chapter Generation was inspected only as a product-requirements inventory |
| Lifecycle status | Steered continuation with a derived SEN Reader adapter |

### History

- **2026-09-06:** Added persistent future/history steering, priority context for
  author direction and mechanical continuity, bounded original-evidence lookup,
  partial-event repair, stable character identities, and a derived SEN Reader,
  Codex, and System-card session. Tested deterministic continuation through 50
  chapters and a real Gemini run with corrective checkpoint branches. See
  `CONTINUATION_EVALUATION.md` for the evidence and limitations.

- **2026-09-06:** Protected every author correction and the latest committed
  chapter from context trimming. These mandatory inputs may exceed the soft
  selection target, with the excess explained in the audit; optional history
  is omitted first. A missing head chapter stops generation before a provider
  call. Added a derived current-thread view ordered by chapter/event evidence,
  not replay timestamps: resolved threads leave the open handoff, supported
  reopenings remain possible, and original thread history stays intact.
- **2026-09-05:** Added typed, evidence-backed chapter memory, Foundation identity
  references, and explicit recovery from saved prose. Generation and recovery use
  the same categorized memory contract. Saving prose and interpreting it now have
  separate inspection states; incomplete interpretation remains visible.
- **2026-09-05:** Corrected generation context priorities: newest author changes
  precede chapter prose and derived records; recent prose is selected newest
  first and presented chronologically. Requests distinguish Foundation facts,
  future plans, explicit changes, and frozen source provenance. Arc promises
  remain arc-scale direction. Correction targets and budget omissions remain
  inspectable at the provider boundary.
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
Story Seed-to-Foundation adapter. Legacy Chapter Generation remains independent.
`shared/senAdapter.ts` is the only direct Reader contract edge, and
`development/HarnessReaderSession.tsx` composes the existing packaged Reader and
Codex. Neither component owns a second persistence path. SEN stays provider-neutral.

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

Internal projections remain semantic intents. The SEN adapter translates supported
canonical character, location, faction, artifact and mechanical facts to existing
Reader contracts. Unknown relationships, speakers and unsupported effects remain
unknown. Exact, uniquely anchored speech receives the known speaker's role;
host-supplied cast identity establishes the main character without guessing from
paragraph order. Mechanical rows and status stats use the same preserved value.

## Steering and continuation

`controller.steerStory(id, direction)` appends a durable future direction.
`revise-history` is the explicit alternative when an author changes past canon.
Directions are frozen into each request and retained in exports/reloads. The latest
conflicting direction wins; earlier unrelated directions and past consequences
remain. Foundation/Blueprint future plans are subordinate proposals.

The ordinary cycle remains prepare context → one writing call → commit prose →
preserve/process developments → continue. There is no routine literary review
loop or full-novel planning requirement. Context retains three recent chapters,
compact semantic developments, author corrections and quantified observations.
Later transfers/spending accompany older quantities. Up to three original-prose
excerpts may be looked up using the latest direction or missing event coverage.
The audit records omissions. Author authority and mechanical observations may
exceed an artificially small budget rather than disappearing silently.

`replayStory(id, chapterId)` repairs a selected chapter from its saved raw response,
including partially dropped events. Stable event identities make repeated repair
idempotent; older repairs do not become the latest story state merely because they
ran later. The Reader preview derives chapter-scoped memory. Its reading settings
and edits are session-local; durable story changes belong to Harness steering and
corrections. Fully malformed optional output still requires usable source evidence;
replay does not invent missing facts or call the model again.

## Request context and inspection

The attempt's **Frozen context snapshot** and **Included / Omitted** lists show
the exact selected Foundation revision, source Seed and optional Blueprint,
corrections (with target evidence), retained chapters, and selection reasons.
The provider prompt separately labels author instructions, established
Foundation, future plans, explicit author changes, committed evidence, frozen
source, and coverage/omissions. The coverage section states whether the actual
last committed chapter was included.

Selection protects steering, Foundation, corrections with their target evidence,
quantified observations, and the latest committed chapter. These mandatory inputs
may exceed the soft budget. Recent prose is selected newest first before optional
compact developments, bounded lookup, canonical records, and derived handoff.
Optional items are included whole when they fit or omitted with a reason. The
budget counts estimated selected content, not exact provider tokens or prompt
formatting overhead. A missing latest chapter blocks continuation instead of
substituting older history.

The latest applicable correction overrides earlier conflicting evidence. Active
Foundation edits take precedence over its frozen source snapshot; explicit Seed
values take precedence over generated Blueprint elaboration. Opening setup is
for the story opening, while committed prose anchors continuation. Arc promises,
mysteries, and endings are future direction, not chapter deadlines or already
established events. Existing saved snapshots remain readable without migration.

## Chapter memory and recovery

The provider returns categorized memory alongside prose in the original chapter
call. Typed subjects distinguish a character's progression from a dungeon or
module's state. Deterministic routing covers characters, decisions, relationships,
locations, factions, deadlines, timeline, progression, open threads, mysteries,
clues, revelations, and artifacts. Foundation names and declared aliases establish
stable identity references; repeated chapter evidence retains separate provenance.

Every event preserves a chapter quote and structured fact values. Replay checks
that the quote occurs in committed prose and that literal quantities, ranks, and
deadlines occur in that quote. This verifies provenance, not semantic entailment:
descriptions remain inspectable model interpretations. Missing subjects, unsupported
quotes, ambiguous references, malformed fields, and generic-only summaries leave
interpretation incomplete and prevent unsupported projections becoming ready.

The existing inspection panel separates **prose saved** from **memory interpretation
incomplete**. **Recover memory from saved prose** makes an explicit extraction call
through the configured host adapter. It reads the exact saved chapter and identity
references, checkpoints raw output before interpretation, and appends evidence
without changing prose, the original provider reply, or story order. Failed local
writes retry the received extraction; deterministic **Replay** makes no model call.
Exports include recovery requests, raw responses, usage receipts, and failures.
Existing schema-2 saves remain readable; the recovery history and identity fields
are optional additions. Hosts without extraction support receive an explicit error.

The captured Start Now regression covers Aria's AI identity, the forty-eight-hour
collapse threat, the conditional end-of-week seizure, F-Tier prototype difficulty,
0.04% initial energy, and Xie Jin's risky bypass decision. A live extraction of
the saved chapter produced nine events while preserving all prose and the original
four summaries. A mistyped thread remains visibly unresolved. The deterministic
fixture checks both generation and recovery; the optional live test runs only when
`HARNESS_MEMORY_EXPORT` and `HARNESS_MEMORY_ENV` point to an author export and a
server environment file. `HARNESS_MEMORY_OUTPUT` optionally writes inspection
artifacts. `HARNESS_MEMORY_REPLAY=1` reprocesses saved extraction without a model call.

## Transfer notes

Copy the `development/` and `shared/` code, its package barrel, and the server
route as one feature. Leave the Workshop preview, manifest registration,
reference pane, and local Development endpoint guard behind unless the target
application explicitly needs them.
