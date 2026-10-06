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
presentation before refinement. Use one active `development/` folder and optional genuinely shared code. Existing
`reference/` folders are historical old production versions, never edited or refreshed;
new features do not get one. Keep local preview state,
mocks, and Workshop controls separate from portable UI; no production dependencies,
credentials, or real API calls belong in this simulation.

Use one workspace preview, registry route, manifest entry, and homepage card per feature.
Do not create versioned folders or routes. Record source metadata, mock boundaries,
known differences and a short dated history using real dates. New manifest source
metadata points at this repository; no replica-creation or source-comparison dates
are required.
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
- Reuse the existing feature workspace and route when applicable. Keep an existing historical
  reference intact; reconstruction does not require copying the obsolete system into new
  reference folders or limiting real changes to a visual `development/` component folder.
- Identify retained infrastructure, replaced responsibilities, downstream consumers, and
  deferred work. Verify the protected connections actually work where authorized and
  available; distinguish local, mocked, and real-provider evidence.

## Build authority and repository boundary

The new path is built here in SEN, Library and NovelExpanded at `/app/`;
`NOVEL_EXPANDED.md` decides what gets built. Keep old systems until each is remade;
never delete one for being unused by the new path, reconnect one as it is, or re-sync
with the old production app. The packages and the app are the destination now.

Preserve existing persisted and external contracts under Codebase Conventions.
When importing a surface, verify the source repository, path and symbol; do not infer
cross-repository paths. Keep source facts and mock boundaries in the feature README,
with a short dated history. Never edit or refresh historical reference folders.
Never change another repository unless the owner explicitly asks.

Report the selected mode, outcome, verified source linkage, changed files, validation,
intentional mock or infrastructure boundaries, and any remaining differences or blockers.
