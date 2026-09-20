# SEN Arc Goals

- **Created:** 2026-09-13
- **Last Workshop update:** 2026-09-20
- **Status:** neutral SEN contract integrated with the DEV HARNESS host
- **Preview:** existing Story Seed ARC workspace and HARNESS Reader Codex chapter recaps
- **Source comparison:** DEV implementation audited 2026-09-13; no production replica imported

`shared/arcGoals.ts` is the single authority for arc length, position, goal structure,
validation, sequential segments, completion predicates, active goal selection,
and revision-based plan editing.
`development/ArcPlanView.tsx` is its shared quiet inspector and editor.
The package exposes these through `@seihouse/sen/arc-goals`.

## Ownership and flow

| Behavior | Owner |
| --- | --- |
| Exactly 100 chapters; one to five weighted sequential goals | Neutral SEN arc contract |
| Arc 1 AI plan and novel-wide Destined Ending | Existing Story Seed Blueprint provider |
| Creator edits before generation | Story Seed optional.arcPlan; existing seed repository and export |
| Seed/Blueprint precedence and one-way transfer | Workshop storySeedHandoff adapter |
| Durable revisions, frozen context, confirmed completion | Existing HARNESS story record, controller, and IndexedDB repository |
| Later-arc planning at a successful boundary | HARNESS controller using the existing generation HTTP/provider boundary |
| Chapter grouping, plan inspection and editing | HARNESS SEN adapter, Reader session, and Codex chapter-recap area |
| Permanent Active Arc Goal display (arc, goal n of total, text, allocated range, current position, deadline/status, complete-plan opener) | HARNESS Library workspace, reading `harnessArcContext`; `ArcPlanView` gained only a `defaultOpen` prop |

The Blueprint carries a generated initial proposal. An explicit seed arcPlan takes
precedence. HARNESS copies that initial plan once; subsequent seed changes do not
silently overwrite generated-story state. Plan edits append effective-chapter revisions.
Frozen chapter requests and committed prose remain historical evidence.

Completion requires a positive model assessment of the generated prose plus
a continuous exact evidence quotation from that prose. A matching quotation proves
provenance; semantic assessment remains the model's responsibility. Completion is
scoped to arc, goal identity, and wording. Early completion does not start the next
goal before its allocated segment. Missing completion never advances a goal.
At the final chapter of an active segment, missing or invalid completion evidence
fails the attempt before commit. The story head stays unchanged for the existing
explicit retry flow; no extension, regeneration, reward, penalty, or automatic retry
policy is supplied.

## Integration boundaries

Story Seed and HARNESS each reset Development storage when their schema version differs;
there is no migration or unplanned-arc fallback. Legacy Chapter Generation re-exports
the neutral arc calculator and position type; it does not own HARNESS goal progression.
The shipped HTTP adapter supports automatic planning, and every chapter-generation
adapter must support that plan operation before its first model call. HARNESS persistence
remains the existing local IndexedDB boundary; this work does not add account/cloud story
synchronization.

## Transfer and verification

Transfer the neutral arc module and package entry alongside the modified Story Seed,
HARNESS, Reader/Codex adapters, and server prompt/transport changes. Keep Workshop
fixtures and navigation out of consumers. No locked reference, Author Skill manifest,
production repository, authentication, Postgres, or R2 configuration was changed.

Focused tests cover allocation invariants, schema resets, seed export round trips,
frozen requests, deadline enforcement, evidence-backed completion, unrestricted
revision-based editing, and automatic boundary planning.
