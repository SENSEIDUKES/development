---
name: seihouse-codebase-conventions
description: Locate existing SEIHouse owners before implementation or review, and apply package boundaries, reconstruction authority, and persistence compatibility rules.
---

# SEIHouse Codebase Conventions

Use current repository evidence to locate the owner of a requested change. Reuse that
owner instead of creating parallel components, stores, adapters, persistence paths,
media paths, schemas, or packages. Read the [system map](references/system_map.md)
for product responsibilities; it is a guide to inspection, not a fixed API catalog.

## Establish authority before editing

Read [AGENTS.md](../../AGENTS.md), relevant feature guidance, and current
[package documentation](../../src/package/README.md), including the
[SEN](../../src/package/sen/README.md) and [Library](../../src/package/library/README.md)
entries when those packages are involved.

SEN is the portable expanded-narrative engine. Library is SEIHouse's first-party host
application. Library may depend on SEN; SEN must never depend on Library.

| Package | Owner and responsibility |
| --- | --- |
| `@seihouse/ui` | UI repository: universal primitives and experience tokens |
| `@seihouse/library-ui` | UI repository: branded Library presentation |
| `@seihouse/sen` | DEV: reusable narrative behavior and surfaces, independent of Library |
| `@seihouse/library` | DEV: first-party Library surfaces and behavior built on SEN |

Package entry barrels re-export canonical feature implementations from `development/`
and `shared/`; do not duplicate implementations inside package entries. Keep Workshop
shells, mocks, locked references, and server code out of published entries. Trace imports
to verify that SEN does not reach Library or Library UI.

Before reading, changing, or discussing HARNESS implementation, read its authoritative
[architecture vocabulary](../../src/components/harness-generation/ARCHITECTURE_VOCABULARY.md).
Use that document's terms and current feature contracts instead of copying their
volatile details into this skill or inventing parallel definitions.

## Select the lifecycle and compatibility boundary

DEV supports both visual refinement and real product reconstruction. For a major
rebuild, read [DEVELOPMENT_RECONSTRUCTION.md](../../DEVELOPMENT_RECONSTRUCTION.md)
and select the appropriate mode in [Workshop Replica](../workshop-replica/SKILL.md).
Approved reconstruction may include real frontend, backend, APIs, persistence, schemas,
generation, and integration. Preserve or correctly adapt working authentication,
Postgres, R2, media retrieval, environment configuration, secrets, and service connections.
Discover this wiring yourself; the product owner supplies behavior, not a backend file map.

Production remains authoritative for existing integrated production concepts, contracts,
and persisted compatibility values. DEV is authoritative for an approved reconstructed
system until transfer. Do not force a reconstruction to mirror obsolete production
architecture or naming merely because it was previously shipped.

Development-only state does not require artificial backward compatibility unless a
current feature-specific contract requires it. When an approved reconstruction replaces
that state, update its schema/storage boundary and consumers coherently. Do not add
aliases, dual reads, or migrations merely to preserve obsolete DEV shapes.
Production-persisted identifiers and externally addressed contracts require compatibility,
migration, or deliberate replacement within the authorized scope. A cosmetic rename
never authorizes changing database values, routes, storage keys, object paths, environment
bindings, or historical records.

Inspect paths, branches, and exports independently in every relevant repository before
writing source metadata, imports, or transfer notes. A successful DEV build cannot prove
a production path exists. Production changes and transfer require a separate authorized task.

## Trace the existing owner

1. Search current guidance, behavior, visible copy, types, callers, tests, and imports.
2. Trace the shortest representative flow from entry point through state/domain operation
   to persistence or media and back to rendering, including reload when relevant.
3. Identify the owner, inputs, outputs, consumers, invariants, and focused validation.
4. Read [engineering conventions](references/conventions.md) for implementation rules.
   Prefer one authoritative state owner, established lifecycle/error/retry paths, and
   shared primitives. Keep generated content traceable to its canonical source.
5. For a visible data defect, find the first incorrect upstream contract instead of
   patching each downstream symptom independently.

Stop discovery when ownership and affected contracts are clear. Avoid broad archaeology,
new synonyms, speculative cross-media systems, or unrelated cleanup. Prefer ownership,
correctness, reuse, simplicity, maintainability, and then performance and visual polish.

## Resolve contradictions deliberately

Compare the system map and guidance with inspected code and the approved task. Report
contradictions with the affected rule, repository evidence, and chosen authority. Apply
the current approved architecture; do not silently preserve stale guidance or let code
drift redefine the product. If the intended contract remains unclear, explain the blocker
instead of guessing. Update guidance only when the task includes that maintenance.

## Verify and report

Use the relevant checks in [change protocol](references/change_protocol.md). Verify
behavior and its nearest regression, not only types. For renames, search stale terms and
update affected imports, exports, tests, docs, manifests, and verified transfer notes;
explain intentionally retained compatibility strings. Do not edit locked references
except during an authorized source synchronization.

Report the owner changed, requested outcome, preserved or deliberately replaced contracts,
checks actually run, and remaining limitations or guidance conflicts. Do not claim source
linkage, persistence, runtime behavior, or architectural compliance without evidence.
