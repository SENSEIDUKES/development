# Skill system audit — 2026-09-17

## Scope and baseline

Only repository skills and necessary guidance changed. Product code, packages, components,
APIs, schemas, application behavior, and production repositories are excluded.
The baseline contained 12 tracked SKILL.md files across `skills/` and `.agents/skills/`,
a packaged creative skill, nested conventions and verification folders, and three
redundant conventions installation READMEs. No repository-local skill validator or
consumer requiring mirrored copies was found in the inspected guidance and scripts.

`.agents/skills.json` already contained `entries: [{ path: "../skills" }]`. It is retained
unchanged: resolving that path relative to `.agents/` reaches the canonical `skills/`
directory directly. Discovery no longer competes with tracked mirrored copies.

## Canonical entrypoints

- `skills/sensei-skill/SKILL.md`
- `skills/creative-ui-translator/SKILL.md`
- `skills/seihouse-components-performance/SKILL.md`
- `skills/seihouse-layout-optimization/SKILL.md`
- `skills/seihouse-verification-loop/SKILL.md`
- `skills/seihouse-codebase-conventions/SKILL.md`
- `skills/workshop-replica/SKILL.md`

## Conflicts deliberately resolved

| Baseline guidance | Resolution |
| --- | --- |
| DEV described as visual/mock-only, including README | Faithful replicas remain isolated; approved reconstruction follows DEVELOPMENT_RECONSTRUCTION.md. |
| Production naming unconditionally authoritative | Production governs integrated contracts and persisted compatibility; approved reconstructed DEV design governs until transfer. |
| Persisted data always implied migration/compatibility | Production contracts require compatibility, migration, or deliberate replacement; DEV-only state follows its current feature contract. |
| Reader Chamber equated with the entire SEN engine; SAP named as universal audio architecture | SEN is the portable engine, Reader Chamber a surface; inspect current audio owners. |
| Package ownership incomplete | Distinguish UI, Library UI, SEN, and Library; barrels re-export canonical features; SEN cannot depend on Library. |
| Gemini/Kimi-specific workflow instructions | Rename verification to seihouse-verification-loop and address capable coding agents. |
| Repeated authoritative skill copies and unsupported metadata | Exactly seven canonical entrypoints, valid names/frontmatter, linked conditional references. |

## Instruction preservation

Compared every duplicate before deletion. The nested conventions copy contained formatting
changes and fewer conflict-reporting instructions; the retained reference preserves the
stronger reporting rule. The creative archive matched the discovered skill after normalizing
its damaged dash characters. Its full rendering-tier guidance now lives in a linked reference.
The full faithful-replica procedure remains in a Mode A reference, with reconstruction in
the entrypoint. Performance, layout, communication, verification passes, scope guards,
state/persistence guidance, accessibility, source verification, dating, and transfer safeguards
are retained. Volatile symbol lists were replaced by instructions to inspect authoritative
feature documents. No speculative skill, production-transfer skill, or SPP-specific skill
was created.

## Validation

- Current skill-creator `quick_validate.py`: all seven pass.
- Exactly seven unique canonical frontmatter names, matching folder names; no mirrored SKILL.md remains.
- Discovery configuration resolves directly to `skills/`.
- All 37 local links in skills and skill links in repository guidance resolve.
- No named-model dependency, unsupported version/date frontmatter, or unfinished scaffold found.
- Scope allowlist confirms no product-code change.
- Final staged `git diff --check`: passes.
- Reviewed original-to-final instructions, including extracted references, for accidental loss.

The Python validator required PyYAML; the dependency was installed only under ignored
`.git/skill-audit-python`, with no product dependency or lockfile change. Application builds
and browser checks are excluded because this change only affects agent instructions.
Installed external plugin caches are outside this repository task and remain untouched.
No remaining repository skill issue is intentionally deferred.

## Complete file inventory

Status uses Git's no-renames view so every removed and created path is explicit.
`.agents/skills.json` is inspected and unchanged. This audit record itself is added.

| Status | Path |
| --- | --- |
| D | `.agents/skills/SEIHouse-Optimization-Skills/seihouse-components-performance/SKILL.md` |
| D | `.agents/skills/SEIHouse-Optimization-Skills/seihouse-layout-optimization/SKILL.md` |
| D | `.agents/skills/creative-ui-translator/SKILL.md` |
| D | `.agents/skills/seihouse-codebase-conventions/README.md` |
| D | `.agents/skills/seihouse-codebase-conventions/SKILL.md` |
| D | `.agents/skills/seihouse-codebase-conventions/references/change_protocol.md` |
| D | `.agents/skills/seihouse-codebase-conventions/references/conventions.md` |
| D | `.agents/skills/seihouse-codebase-conventions/references/system_map.md` |
| D | `.agents/skills/seihouse-gemini-verification-loop/SKILL.md` |
| D | `.agents/skills/sensei-skill/SKILL.md` |
| M | `AGENTS.md` |
| M | `README.md` |
| D | `skills/SEIHouse-Optimization-Skills/seihouse-components-performance/SKILL.md` |
| D | `skills/SEIHouse-Optimization-Skills/seihouse-layout-optimization/SKILL.md` |
| D | `skills/creative-ui-translator.skill` |
| A | `skills/creative-ui-translator/SKILL.md` |
| A | `skills/creative-ui-translator/references/rendering-tiers.md` |
| D | `skills/seihouse-codebase-conventions/README.md` |
| M | `skills/seihouse-codebase-conventions/SKILL.md` |
| M | `skills/seihouse-codebase-conventions/references/change_protocol.md` |
| M | `skills/seihouse-codebase-conventions/references/conventions.md` |
| M | `skills/seihouse-codebase-conventions/references/system_map.md` |
| D | `skills/seihouse-codebase-conventions/seihouse-codebase-conventions/README.md` |
| D | `skills/seihouse-codebase-conventions/seihouse-codebase-conventions/SKILL.md` |
| D | `skills/seihouse-codebase-conventions/seihouse-codebase-conventions/references/change_protocol.md` |
| D | `skills/seihouse-codebase-conventions/seihouse-codebase-conventions/references/conventions.md` |
| D | `skills/seihouse-codebase-conventions/seihouse-codebase-conventions/references/system_map.md` |
| A | `skills/seihouse-components-performance/SKILL.md` |
| D | `skills/seihouse-gemini-verification-loop/seihouse-gemini-verification-loop/SKILL.md` |
| A | `skills/seihouse-layout-optimization/SKILL.md` |
| A | `skills/seihouse-verification-loop/SKILL.md` |
| A | `skills/sensei-skill/SKILL.md` |
| M | `skills/workshop-replica/SKILL.md` |
| A | `skills/workshop-replica/references/faithful-replica.md` |
| A | `docs/skill-system-audit.md` |
