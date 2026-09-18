---
name: workshop-replica
description: Bring production surfaces into DEV as faithful visual replicas or rebuild approved product systems there, selecting the correct lifecycle and source authority.
---

# Workshop Replica

Select the mode from the requested outcome before implementation. Read
[Codebase Conventions](../seihouse-codebase-conventions/SKILL.md) for ownership,
package boundaries, and compatibility. Discover source files and wiring yourself;
ask the product owner only for intended behavior that repository inspection cannot resolve.

## Mode A: Faithful replica

Use for isolated visual refinement of an imported production page, component,
animation, or flow. Follow the detailed [faithful replica procedure](references/faithful-replica.md).

Verify the exact source repository, branch or commit, path, and exported symbol. Preserve
presentation before refinement. Maintain a locked `reference/`, active `development/`,
and optional genuinely shared code in one feature folder. Keep local preview state,
mocks, and Workshop controls separate from portable UI; no production dependencies,
credentials, or real API calls belong in this simulation.

Use one workspace preview, registry route, manifest entry, and homepage card per feature.
Do not create versioned folders or routes. Record source metadata, mock boundaries,
known differences, verified transfer files, creation/update/comparison dates, and dated
history. Change the source-comparison date only after inspecting the source again.
Verify responsive layouts, meaningful states, keyboard/focus behavior, accessibility,
reduced motion, direct preview access, and the absence of production calls.

## Mode B: Reconstruction

Use when rebuilding a real product system in DEV. Read
[DEVELOPMENT_RECONSTRUCTION.md](../../DEVELOPMENT_RECONSTRUCTION.md) before implementation.
Its reconstruction policy governs over Mode A's mock-only restrictions.

- Follow newly approved product behavior. Real frontend, backend, API, persistence,
  schema, generation, and integration work is permitted within the approved scope.
- Inspect production for difficult working infrastructure worth reusing. Do not bulk-copy
  obsolete production architecture or make the owner identify backend files or connection wiring.
- Preserve or correctly adapt authentication, Postgres, R2 uploads, media retrieval after
  reload, durable application content, secrets, environment configuration, and established
  service connections. Reuse bindings without exposing secrets in docs or logs.
- Temporary DEV breakage is permitted during major approved reconstruction. Restore and
  verify the requested end-to-end behavior before claiming completion; record blockers honestly.
- Retain canonical ownership, portable package boundaries, and the SEN/Library dependency
  direction. Keep server infrastructure and Workshop controls outside portable entries.
- Reuse the existing feature workspace and route when applicable. Keep an existing locked
  reference intact; reconstruction does not require copying the obsolete system into new
  reference folders or limiting real changes to a visual `development/` component folder.
- Identify retained infrastructure, replaced responsibilities, downstream consumers, and
  deferred work. Verify the protected connections actually work where authorized and
  available; distinguish local, mocked, and real-provider evidence.

## Source authority and transfer

Production governs existing integrated concepts and persisted compatibility contracts.
DEV governs the approved reconstructed design until production integration. Apply the
compatibility rules in Codebase Conventions; development-only state does not automatically
require migration or dual reads. Report and deliberately resolve contradictory guidance.

Never infer file paths or exports across repositories. Verify each source path in its
own repository and branch before recording it. Production renames require synchronized
replica metadata only where the same integrated concept still applies.

Production transfer remains a separate, explicitly authorized task. Provide exact verified
component, style, asset, dependency, and integration notes for that task; exclude Workshop
navigation, controls, mocks, and simulators. After authorized integration, resynchronize
references from the inspected source and update comparison metadata.

Report the selected mode, outcome, verified source linkage, changed files, validation,
intentional mock or infrastructure boundaries, and any remaining differences or blockers.
