# Coding Agent Instructions

Read this file before making changes.

## Purpose

This repository is the **SEN Development space**: a centralized visual development and preview environment for SEN components and the main `SENSEIDUKES/Light-Novels` application.

Use it to isolate, preview, and refine UI components, animations, icons, rewards, and visual effects without needing the production app, authentication, story data, or migration infrastructure.

### Major system reconstruction

For tasks that rebuild a real product system rather than only refining a visual Workshop component, read [`DEVELOPMENT_RECONSTRUCTION.md`](./DEVELOPMENT_RECONSTRUCTION.md) before implementation.

That policy permits real frontend, backend, persistence, schema, and integration work inside development. For those tasks, it overrides the visual-only, mock-only, and no-backend restrictions in this file. All unrelated Workshop organization and quality rules still apply where relevant.

## Required skills

Before beginning any implementation, download, install or otherwise make available, and read all required skills for this repository.

Current required skills:

- **Sensei Skill** — the governing SEN/SEIHouse product, design, restraint, and implementation guidance.
- **SEIHouse Codebase Conventions** — [`skills/seihouse-codebase-conventions/SKILL.md`](./skills/seihouse-codebase-conventions/SKILL.md), the required repository-orientation and architectural-consistency layer. Use it to identify the existing SEIHouse system that owns a change, preserve current state and data contracts, and avoid duplicate components, stores, services, schemas, persistence paths, or media paths.
- **Workshop Replica Skill** — [`skills/workshop-replica/SKILL.md`](./skills/workshop-replica/SKILL.md), used whenever a real page, screen, component, animation, or flow is brought into the Workshop.

These skills are part of the repository workflow and are not optional. Do not silently proceed without them.

At the beginning of every task:

1. Confirm that all required skills were downloaded or are available in the agent environment.
2. Read the Sensei Skill and SEIHouse Codebase Conventions before changing code.
3. Read the Workshop Replica Skill whenever the task brings a real page, screen, component, animation, or flow into this Workshop.
4. State clearly if any required skill cannot be accessed.
5. Do not invent a replacement version of a missing skill.

The SEIHouse Codebase Conventions skill is mandatory for every implementation task. Even though this repository is a visual Workshop, agents must still locate and reuse the existing Workshop systems, component families, shared primitives, state patterns, and source-boundary conventions instead of creating parallel structures.

When the user asks to bring a real page, screen, component, animation, or flow from another repository into this Workshop, the Workshop Replica Skill is mandatory. It covers faithful visual replication, local state simulation, production-boundary rules, portability, verification, and dated component history.

## Core rule

Build workshop pieces so the finished component can be moved cleanly into `Light-Novels` or another SEN application.

Do not turn this repository into a second full application. Use mock data and preview-only wrappers where necessary, but keep the actual component portable and separate from the workshop shell.

## Organization

- `src/workshop/manifest.ts` lists every workshop entry shown on the home screen — **one entry per feature, never one per version.**
- `src/workshop/FeatureWorkspace.tsx` is the shared shell every feature preview opens into: an Original Reference / Development / Compare switch over one shared preview canvas.
- `src/workshop/previews/<feature>/` contains the workspace preview wrapper (built on `FeatureWorkspace`), mock data, and preview-state simulators for that feature.
- `src/App.tsx` resolves `?preview=<id>` through a `previewRegistry` map — add one line per feature, never a new `if` block.
- Reusable component logic lives in `src/components/<feature-name>/`, split into:
  - `reference/` — an untouched, locked replica of what exists in production. Never modified during normal Workshop tweaking.
  - `development/` — the active Workshop version. Starts as a copy of `reference/`. This is the only folder agents change.
  - `shared/` (when it applies) — logic genuinely identical between the two, such as shared utilities or components that have no fork yet.
- `src/package/` holds the entry barrels for the `@seihouse/sen` package —
  one file per published surface (Library, Reader Chamber, Reader Codex,
  Codex cards, Manifestations, Relics, audio, Closed-Door Cultivation, Story
  Seed, Chapter Generation). It contains no components of its own: entries
  re-export `development/` and `shared/` code so the
  Workshop and the package always render the same source. Workshop shells,
  preview mocks, locked `reference/` replicas, and `src/server/` code stay
  out of every entry, and `npm run build:package` fails if one is ever
  reachable. Workshop code consumes package surfaces through
  `@seihouse/sen/*`, which is aliased to `src/package/*`.
- Static visual assets belong in `public/` under a clearly named folder.
- Keep component-specific styles close to the component when practical.
- Portable agent skills live under `skills/`.

### No "V2" folders, cards, or preview IDs

Never create a second homepage card, a second manifest entry, a second preview folder, or a `V2`/`V3`/"Revised"/"New"/"Experimental" component name for the same feature. Git history already preserves prior iterations. A redesign in progress belongs in that feature's existing `development/` folder, opened through its existing `?preview=<id>` route and switched to with the Development button — never a new route.

When adding a new experiment:

1. Give it a focused feature folder under `src/components/` with `reference/` and `development/` subfolders (`shared/` only if something is genuinely unforked).
2. Add a workspace preview wrapper under `src/workshop/previews/<feature>/`, built on `FeatureWorkspace`.
3. Add one entry to `src/workshop/manifest.ts`, including `source.repository`, `source.path`, and `source.lastCompared`.
4. Register it in the `previewRegistry` in `src/App.tsx`. Make it reachable through a simple `?preview=<id>` URL.
5. Add one component README (at the feature folder root) containing source information, current dates, Workshop history, mock boundaries, and transfer instructions.
6. Document any files that must be copied into the source application.

### Lifecycle for an approved change

1. **Import** — copy production's current implementation into `reference/`.
2. **Fork once** — `development/` starts as a copy of `reference/`.
3. **Refine** — every Workshop task modifies `development/` only.
4. **Approve** — once approved, transfer `development/` back to the production repository through a separate task.
5. **Resynchronize** — after production integration, refresh `reference/` from the newly synchronized production code, update `source.lastCompared`, and reset `development/` for the next redesign cycle.

## Dating requirement

Every replicated page or component must record:

- replica creation date
- last Workshop update date
- last source comparison date
- current lifecycle status
- a concise dated Workshop history

Use the real current calendar date. Update the history whenever the replica receives a material visual or structural change. Do not update the source-comparison date unless the source was actually inspected again.

## Working style

- Keep previews mobile-first and easy to inspect on the deployed Vercel site.
- Make visual changes directly from the user's instructions.
- Avoid unnecessary dashboards, controls, settings, or architecture unless requested.
- Do not add database, authentication, API, persistence, or migration work unless the task is governed by `DEVELOPMENT_RECONSTRUCTION.md`.
- Reuse the existing app stack and keep dependencies minimal.
- Preserve currently approved work while adding new workshop entries.

## Live preview workflow

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Keep the local or forwarded preview available, usually on port `5173`. After changes, confirm the app compiles and the relevant preview still renders on mobile and desktop.

## Final integration

Do not automatically change a source application unless the user explicitly asks. When a Workshop piece is approved, identify the exact component, styles, assets, and dependencies needed for transfer, and leave Workshop-only navigation, mocks, and preview controls behind.
