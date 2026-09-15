# SEN Arc Goals

- **Created:** 2026-09-13
- **Last Workshop update:** 2026-09-15
- **Status:** neutral SEN contract integrated with the DEV HARNESS host
- **Preview:** existing Story Seed ARC workspace and HARNESS Reader Codex chapter recaps
- **Source comparison:** DEV implementation audited 2026-09-13; no production replica imported

`shared/arcGoals.ts` is the single authority for arc length, position, goal structure,
validation, sequential segments, completion predicates, active goal selection,
remaining-plan edit validation, and evidence-gated Alter Fate reconciliation.
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
| Historical conflict review and alternate-world commit | HARNESS host/controller; neutral reconciliation predicate |
| World-slot authorization | Host callback shared with separate-world creation; never an arc quota |

The Blueprint carries a generated initial proposal. An explicit seed arcPlan takes
precedence. HARNESS copies that initial plan once; subsequent seed changes do not
silently overwrite generated-story state. Plan edits append effective-chapter revisions.
Frozen chapter requests and committed prose remain historical evidence.

Completion requires a positive model assessment of the generated prose plus
a continuous exact evidence quotation from that prose. A matching quotation proves
provenance; semantic assessment remains the model's responsibility. Completion is
scoped to arc, goal identity, and wording. Early completion does not start the next
goal before its allocated segment. Missing completion never advances a goal.
An overdue goal retains its original deadline: no extension, regeneration, reward,
penalty, or other deadline-failure policy is supplied.

Alter Fate rewrites the selected chapter in a separate world and copies only earlier
canon. The review uses that chapter's frozen historical goal context. A conflicting
instruction is advisory; only an evidenced canonical impossibility can redirect the
active goal, keeping its allocation. Missing/invalid reconciliation evidence preserves
the route with a diagnostic warning rather than claiming a successful reroute.

## Compatibility and integration boundaries

Old seeds and Blueprints remain readable, and existing current-schema HARNESS stories
receive compatible optional arc defaults. No old loose Story Seed fields are removed. Legacy Chapter Generation
re-exports the neutral arc calculator and position type; it does not own HARNESS
goal progression. The DEV Story Seed start callback now creates the HARNESS world
and opens it through the existing preview route.

The shipped HTTP adapter supports automatic planning and historical conflict review.
Older injected model adapters without arcOperation remain compatible with legacy
unplanned stories; hosts adopting structured goals must supply that operation.
HARNESS persistence remains the existing local IndexedDB boundary; this work does
not add account/cloud story synchronization.

No callable product world-capacity service was found in the audited DEV or inspected
Light-Novels source. The reusable host exposes authorizeWorld for the product owner
to supply the existing policy for both independent stories and branches. DEV's local
Workshop has no account quota. No numeric quota or second capacity store was invented.
The Story Seed Workshop host likewise creates local worlds without a product quota.

## Transfer and verification

Transfer the neutral arc module and package entry alongside the modified Story Seed,
HARNESS, Reader/Codex adapters, and server prompt/transport changes. Supply the host's
world-capacity authorization at integration. Keep Workshop fixtures and navigation out
of consumers. No locked reference, Author Skill manifest, production repository,
authentication, Postgres, or R2 configuration was changed.

Focused tests cover allocation invariants, old-data reads, seed export round trips,
frozen requests, canonical completion, atomic retry, automatic boundary planning,
historical edits/branching, canonical and noncanonical divergence, branch replay,
and the empty alternate-world Reader state.
