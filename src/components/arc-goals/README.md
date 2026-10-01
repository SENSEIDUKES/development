# SEN Arc Goals

- **Created:** 2026-09-13
- **Last Workshop update:** 2026-10-01
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
| The story length the creator chooses | Story Seed ARC page, Story Length (`story.optional.arcCount`); left blank, the Blueprint suggests one |
| Destined Ending, story length, Arc 1's goals and the hidden look-ahead | Existing Story Seed Blueprint provider; the Blueprint plans only Arc 1, for the Seed's Story Length when set |
| Creator review and edits before generation | Blueprint review Arc Goals (`BlueprintArcGoalsSection`, reusing `ArcPlanView`): Arc 1 and the story length; Arc 1's first goal is the Seed's Active Arc Goal |
| Arc 1 validation (`validateArcPlan`, `validateBlueprintArcPlan`) | Neutral SEN arc contract and the Story Seed Manifest gate |
| The hidden look-ahead (`ArcLookaheadEntry`, `normalizeArcLookahead`, `arcLookaheadFromPlans`) | Neutral SEN arc contract; only the arc planner reads it, and no reader surface shows it |
| Seed/Blueprint precedence and one-way transfer of Arc 1, the length and the look-ahead | Library `createHarnessFoundationFromStorySeed` (`src/library/story-seed/harnessFoundation.ts`) |
| Durable per-arc revisions, frozen context, confirmed completion | Existing HARNESS story record, controller, and IndexedDB repository |
| Planning each later arc when the reader begins it (`planNextArc`; `ARC_PLAN_DRAFT_SCHEMA`, `arcPlanFromDraft` give it the HARNESS's arc number and goal identities) | HARNESS controller and `shared/arcState.ts` (`arcPlanningContext`, `nextArcStep`) |
| The review before each arc's first chapter (accept or edit), in both modes | HARNESS `arcReviewGap` / `arcGoalEditState`, shown in the Reader's `BlueprintArcPage` (the World Blueprint's goal section) and the Workshop's Blueprint tab |
| Mode edit rules (`arcGoalEditState`): Regular Reader edits active/upcoming arcs while private; Fate Survival sets each arc once before it begins and locks it at generation; completed and missed goals are history in both | HARNESS `shared/arcState.ts`, enforced by the controller |
| Deadline rule: in both modes an unachieved deadline chapter commits and records the goal as missed; the mode decides what a miss means (Regular Reader: off track, continuing past a missed final goal; Fate Survival: a broken route, after which the next chapter must end the story) | HARNESS `commitHarnessArc` / `harnessArcContext` in `shared/arcState.ts` |
| Chapter grouping, plan inspection and editing | HARNESS SEN adapter (`harnessChapterArc` keeps the chapter ending a broken route, and past-final-goal chapters, in the arc they continue), Reader session, and Codex chapter-recap area |
| Active Arc Goal display (arc, goal n of total, text, allocated range, next chapter, deadline/status by mode, the arc's goals) | SEN `FateArcGoalCard` (HARNESS `development/FatePanel.tsx`), shown on the Reader's Fate page and in the Library workspace, reading `harnessArcContext`; `ArcPlanView` marks completed and missed goals |

The Blueprint establishes the Destined Ending and the story's length, plans Arc 1, and
writes a hidden look-ahead: one line each for at most the next two arcs. The reader sees
only Arc 1. Readers change the story as they go, so later arcs are not planned ahead of
time. An authored Seed Active Arc Goal is Arc 1's first goal. HARNESS copies Arc 1 and
the look-ahead once, at creation; subsequent seed changes do not silently overwrite
generated-story state.

When the reader begins a later arc, its goals are planned from where the story is: the
planner receives the earlier arcs' goals with their outcomes, the look-ahead, and
whether this is the final arc, whose last goal is reaching the Destined Ending. It
returns a fresh look-ahead. The World Blueprint's goal section then reappears for the
reader to accept or edit the goals before the arc's first chapter. Plan edits append
effective-chapter revisions per arc. Frozen chapter requests and committed prose remain
historical evidence. Each chapter request carries only the active goal of its own arc,
its deadline, and the arc's position on the planned route, never the look-ahead. Once
every arc of the story's length is written the route is complete and HARNESS stops
rather than inventing another arc.

The creator may set the length up front, as the Story Seed's Story Length on its ARC
page; the Blueprint is then generated for exactly that length and follows it. It may be
changed there or in the Blueprint review before the story begins without a model call;
only a change to or from a one-arc story (whose Arc 1 ends at the Destined Ending) needs
the Blueprint regenerated, and until then the Blueprint records what Arc 1 was planned
as (`WorldBlueprint.arcOneScope`) and the Manifest gate says so.

Completion requires a positive model assessment of the generated prose plus
a continuous exact evidence quotation from that prose. A matching quotation proves
provenance; semantic assessment remains the model's responsibility. Completion is
scoped to arc, goal identity, and wording. Early completion does not start the next
goal before its allocated segment.

Goals are recorded honestly in both Fate modes. A deadline chapter always commits; a
goal it did not achieve is recorded as missed (`ArcGoalCompletion.outcome: 'missed'`,
with no evidence), and the next goal begins at the segment boundary
(`arcGoalResolved`; `arcGoalCompleted` stays true only for a completed goal).
`arcMissedGoals` lists an arc's missed goals. The final arc's last goal is the
Destined Ending itself (`ArcGenerationContext.finalGoal`): completing it, in either
mode, records the story's conclusion. What a miss means belongs to the HARNESS Fate
mode (see the HARNESS README, "Fate modes"): off track in Regular Reader mode, where a
missed final goal lets the story continue past its roadmap toward the same ending; a
count toward a broken route in Fate Survival. No extension, regeneration, reward,
penalty, or automatic retry policy is supplied.

## Integration boundaries

Story Seed Blueprints saved when every arc was planned keep their Arc 1, and their next
two arcs become the look-ahead; nothing is wiped. HARNESS schema 24 drops stored whole-route
roadmaps from Foundations (saved arcs stay on their stories). Only schemas 22 and 23
upgrade in place, after an untouched copy is kept; an older workspace is kept as that
untouched copy and opens empty, without an upgrade. Completion records saved before outcomes existed
read as completed.
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
