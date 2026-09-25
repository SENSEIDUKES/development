# SEN Arc Goals

- **Created:** 2026-09-13
- **Last Workshop update:** 2026-09-25
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
| Destined Ending, arc count, and one goal plan per arc (the arc roadmap) | Existing Story Seed Blueprint provider, generated whole in one call |
| Creator review and edits before generation | Blueprint review Arc Roadmap (`BlueprintArcRoadmapSection`, reusing `ArcPlanView`); Arc 1's first goal is the Seed's Active Arc Goal |
| Roadmap validation (`validateArcRoadmap`, `validateBlueprintArcRoadmap`) | Neutral SEN arc contract and the Story Seed Manifest gate |
| Lengthening a roadmap before the story begins (`insertArcsBeforeFinal`, `arcsCanBeAddedBeforeFinal`) | Neutral SEN arc contract; the Blueprint review's Add arcs asks the Blueprint provider for only the new arcs |
| Seed/Blueprint precedence and one-way transfer of the roadmap and arc count | Library `createHarnessFoundationFromStorySeed` (`src/library/story-seed/harnessFoundation.ts`) |
| Durable per-arc revisions, frozen context, confirmed completion | Existing HARNESS story record, controller, and IndexedDB repository |
| Mode edit rules (`arcGoalEditState`): Regular Reader edits active/upcoming arcs while private; Fate Survival sets each arc once before it begins and locks it at generation; completed and missed goals are history in both | HARNESS `shared/arcState.ts`, enforced by the controller |
| Deadline rule: in both modes an unachieved deadline chapter commits and records the goal as missed; the mode decides what a miss means (Regular Reader: off track, continuing past a missed final goal; Fate Survival: a broken route and closing stretch) | HARNESS `commitHarnessArc` / `harnessArcContext` in `shared/arcState.ts` |
| Novel-page editing | Library novel page Blueprint tab (`src/library/generation/NovelBlueprintTab.tsx`) |
| Later-arc planning at a boundary | Only for stories without a roadmap (premise-only starts and Blueprints saved before roadmaps); a roadmap story never invents an arc |
| Chapter grouping, plan inspection and editing | HARNESS SEN adapter (`harnessChapterArc` keeps closing and past-final-goal chapters in the arc they continue), Reader session, and Codex chapter-recap area |
| Active Arc Goal display (arc, goal n of total, text, allocated range, next chapter, deadline/status by mode, the arc's goals) | SEN `FateArcGoalCard` (HARNESS `development/FatePanel.tsx`), shown on the Reader's Fate page and in the Library workspace, reading `harnessArcContext`; `ArcPlanView` marks completed and missed goals |

The Blueprint generates the whole roadmap when it establishes the Destined Ending and
arc count: one plan per arc, a coherent route whose final arc reaches the ending. The
creator reviews and edits every arc before generation. An authored Seed Active Arc
Goal is Arc 1's first goal. HARNESS copies every arc's plan once, at creation, each
effective from its arc's first chapter; subsequent seed changes do not silently
overwrite generated-story state. Plan edits append effective-chapter revisions per
arc. Frozen chapter requests and committed prose remain historical evidence. Each
chapter request carries only the active goal of its own arc, its deadline, and the
arc's position on the planned route. Once all planned arcs are written the story's
route is complete and HARNESS stops rather than inventing another arc.

The roadmap is generated in one Blueprint call. The configured output budget bounds
how many arcs it may plan (`blueprintRoadmapArcLimit`: 14 arcs at the default 8,192
output tokens, up to 100 at 32,768); a response cut off at the limit, or one planning
fewer arcs than it counts, fails the generation loudly instead of being shortened.

Before the story begins, the author may change the arc count in the Blueprint review.
Add arcs generates only the new arcs; `insertArcsBeforeFinal` puts them before the final
arc, which keeps its goals and remains the arc that reaches the Destined Ending, and
gives any reused goal identity a unique one. Because only the new plans are generated,
one call can add up to 30 arcs at the default budget, so a roadmap can grow past the
single-generation limit in steps. Fewer arcs, or a one-arc roadmap, is reached by
regenerating the whole Blueprint at the chosen count.

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

Story Seed Blueprints saved before roadmaps are read as a one-arc roadmap and must be
regenerated (one click in the review) before the Manifest gate accepts them. HARNESS schema 20 upgrades saved
schema 18 and 19 workspaces in place (after keeping an untouched copy) instead of resetting them; completion records saved
before outcomes existed read as completed.
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
