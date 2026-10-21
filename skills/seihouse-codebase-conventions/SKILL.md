---
name: seihouse-codebase-conventions
description: Locate existing SEIHouse owners before implementation or review, and apply package boundaries, build authority, deletion and compatibility rules.
---

# SEIHouse Codebase Conventions

Use current repository evidence to locate the owner of a requested change. Reuse that
owner instead of creating parallel components, stores, adapters, persistence paths,
media paths, schemas, or packages. Read the [system map](references/system_map.md)
for product responsibilities; it is a guide to inspection, not a fixed API catalog.

## Authority, in order

1. **The owner's request** for this task.
2. **[NOVEL_EXPANDED.md](../../NOVEL_EXPANDED.md)** decides what gets built and how:
   its [How we build](../../NOVEL_EXPANDED.md#how-we-build) rules and its
   [Names](../../NOVEL_EXPANDED.md#names) table govern over this skill. Read
   "Where we are" only for the part of the product the task touches.
3. **Feature design documents** the task touches, such as
   [the chapter loop](../../docs/chapter-loop.md) for anything about what a chapter
   knows, plans or records, and the HARNESS
   [architecture vocabulary](../../src/components/harness-generation/ARCHITECTURE_VOCABULARY.md)
   before reading, changing, or discussing HARNESS code. Use their terms; do not
   copy their volatile details into this skill or invent parallel definitions.
4. **This skill** and its references.

When these disagree, follow the higher one and report the conflict. Do not let the
subsystem receiving the most work redefine the product.

## Packages and boundaries

SEN is the portable expanded-narrative engine. The Library is SEIHouse's first-party
host (Expanded Novels; the NovelExpanded app at `/app/`, in `src/novel-expanded/`).
**The Library may depend on SEN. SEN must never depend on the Library.**
[`src/package/README.md`](../../src/package/README.md) decides which lane code
belongs to, and `npm run check:package-boundaries` enforces it.

| Package | Where it lives | What it owns |
| --- | --- | --- |
| `@seihouse/sen` | this repository, `src/package/sen/` | Reusable narrative behavior and surfaces, independent of the Library |
| `@seihouse/library` | this repository, `src/package/library/` | First-party Library surfaces and behavior built on SEN |
| `@seihouse/ui`, `@seihouse/library-ui` | UI repository | Universal primitives and tokens; branded Library presentation |
| `@seihouse/audio-player`, `@seihouse/seireader`, `@seihouse/living-titles`, SPP (`seihouse-productions-package`) | their own repositories | Shared SEIHouse infrastructure consumed here |

Consume external SEIHouse packages; do not copy or fork them into this repository.
Shared SEIHouse infrastructure (SPP and CAPA, the Model Router, provenance, asset and
version systems, media and provider boundaries) belongs to neither product. Do not put
something in `@seihouse/sen` merely because SEN uses it first.

Package entry barrels re-export the canonical `development/` and `shared/`
implementations; they hold no components of their own. Keep Workshop shells, mocks,
historical `reference/` material, and server code out of client entries.

## Build only what we are building

Follow NOVEL_EXPANDED.md's How we build: the old architecture is not preserved,
reconnected, or kept compatible for its own sake.

- **No backward compatibility by default.** Do not add aliases, dual reads, shims,
  fallbacks to old shapes, or migrations unless the owner asks or a current feature
  contract requires them. When a rebuilt system replaces development state, change the
  schema or storage boundary and its consumers together.
- **Protect the working connections.** Preserve or correctly reuse authentication,
  Postgres, R2 uploads, media retrieval after reload, persisted application content,
  environment configuration, secrets, and service bindings
  ([DEVELOPMENT_RECONSTRUCTION.md](../../DEVELOPMENT_RECONSTRUCTION.md)). Discover that
  wiring yourself; the owner supplies behavior, not a backend file map.
- **Production is off-limits.** Never modify production data, production
  infrastructure, or another repository unless the owner explicitly asks. A cosmetic
  rename never authorizes changing database values, routes, storage keys, object
  paths, or environment bindings that production or real user data depend on.
- **Do not reconnect an old system** as it is, or re-sync with the old production app.

## Deleting old code

Remove what the task replaces. When a remake on the new path replaces an old system,
component, preview, or file, delete the old one in the same change, along with its
now-dead imports, previews, manifest entry and tests, unless the owner asks to keep it.
In an owner-approved cleanup, delete what the owner lists.

Do not delete a system only because the new path does not use it yet: it may still be
waiting for its remake or for import from production. Never edit or refresh a
`reference/` folder; it goes when its feature's remake is done or the owner says so.

## Trace the existing owner

1. Search current guidance, behavior, visible copy, types, callers, tests, and imports.
2. Trace the shortest representative flow from entry point through state/domain operation
   to persistence or media and back to rendering, including reload when relevant.
3. Identify the owner, inputs, outputs, consumers, invariants, and focused validation.
4. Read [engineering conventions](references/conventions.md) for implementation rules.
5. For a visible data defect, find the first incorrect upstream contract instead of
   patching each downstream symptom independently.

Stop discovery when ownership and affected contracts are clear. Avoid broad archaeology,
new synonyms, speculative cross-media systems, or unrelated cleanup. Inspect paths and
exports in every relevant repository yourself; a successful build here cannot prove a
production path exists.

## Verify and report

Use the relevant checks in [change protocol](references/change_protocol.md). Verify
behavior and its nearest regression, not only types. For renames, search stale terms and
update affected imports, exports, tests, docs and manifests.

Report the owner changed, the outcome, what was deliberately replaced or deleted, checks
actually run, and remaining limitations or guidance conflicts. Do not claim source
linkage, persistence, runtime behavior, or architectural compliance without evidence.
