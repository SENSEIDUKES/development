# SEN Visual Development

The central development and preview space for SEN components and experiences. This repository isolates UI refinement from the main `SENSEIDUKES/Light-Novels` production environment.

## Production application boundary

Files inside `SENSEIDUKES/Light-Novels` and every other production Light Novel application are **off-limits during Development repository work**. Agents may inspect those repositories only to understand or faithfully replicate an existing component.

Do not edit, create, delete, commit, push, or open a pull request that changes any Light Novel application from a Development task. Moving approved Development work back into a production application must be treated as a separate integration task and requires the user's explicit authorization.

## Coding agents: required setup

Before making any changes, every coding agent is required to:

1. Read [`AGENTS.md`](./AGENTS.md).
2. Download, install or otherwise make available the **Sensei Skill**.
3. Download and read the **Workshop Replica Skill** at [`skills/workshop-replica/SKILL.md`](./skills/workshop-replica/SKILL.md).
4. Follow both skills throughout the task.
5. State clearly before implementation if either required skill cannot be accessed.

These skills are part of the Workshop development workflow and are not optional. Do not silently ignore them, substitute ad-hoc instructions for them, or begin implementation before reading them.

The Sensei Skill provides the governing SEN/SEIHouse product and design guidance. The Workshop Replica Skill defines how real pages and components are copied into this repository, stripped of production dependencies, documented, dated, previewed, and later transferred back safely.

## What belongs here

Examples include:

- backgrounds and ambient effects
- loading and generation animations
- Closed-Door Cultivation UI and motion
- relic cards and reward reveals
- Library icon sets
- Reader and Codex components
- Versa experiences
- Manifestation screens and animations
- small mobile-first interface experiments

This is not a second version of the full app. It is a clean visual development space with mock content only.

## Run locally

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open the local or forwarded Vite preview, usually on port `5173`.

## Current workshop entries

The home screen is driven by [`src/workshop/manifest.ts`](./src/workshop/manifest.ts). Each approved experiment should have its own preview and a clear entry in that manifest.

Current entries:

- **Celestial Particle Backdrop** — `?preview=celestial-backdrop`
- **Chapter Generation Manifestation** — `?preview=chapter-generation-manifestation`
- **Closed-Door Cultivation** — `?preview=idle-cultivation`
- **Relics Gallery** — `?preview=relics-gallery`

The approved Library glyph set remains in [`public/icons`](./public/icons).

## Workshop controls

Every feature preview is wrapped by `FeatureWorkspace`, which owns the responsive
**Workshop Controls** menu. Preview wrappers supply only the sections they need
from the canonical Pages, States, Scenes, Effects, and Advanced structure. The
menu may reuse Library surface primitives, but it is Workshop tooling: product
navigation stays inside the Reference and Development components being tested.

## Moving work into another application

Workshop components should stay portable: minimal dependencies, no auth, no database, and no production persistence. Once approved, transfer into a corresponding application may happen only as a separate, explicitly authorized integration task. Transfer the actual component, styles, and required assets; do not import the Workshop shell, mock controls, or preview-only state.
