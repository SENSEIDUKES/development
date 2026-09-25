# SEN Development

The central development and preview space for SEN and Library components and experiences. This repository isolates UI refinement from the main `SENSEIDUKES/Light-Novels` production environment.

## SEN and Library are two different products

**SEN (SEIHouse Expanded Novels) is an embeddable expanded-narrative engine** — the same kind of product as the faceless SEIHouse audio player. Another author or company can install SEN inside their own application and supply their own writing, branding, storage, authentication, and generation method. SEN provides the reusable systems: expanded reading behavior, structured chapter contracts, scoring, Color Codes, Codex behavior, cards, and the narrative surfaces built on them. AI chapter generation is an **optional** SEN content source, not a requirement.

**Library is SEIHouse's first-party host application** — our own branded implementation of SEN. Library-specific visuals, language, cultivation/Qi progression, hub behavior, economy, services, and infrastructure belong to Library, not to the portable engine.

SEN is therefore never "a Library feature". The two ship as separate packages from this repository:

| Package | Entries | What it is |
| --- | --- | --- |
| `@seihouse/sen` | [`src/package/sen/`](./src/package/sen/README.md) | The portable expanded-narrative engine |
| `@seihouse/library` | [`src/package/library/`](./src/package/library/README.md) | SEIHouse's first-party surfaces built on it |

**Library may depend on SEN. SEN must never depend on Library.** [`src/package/README.md`](./src/package/README.md) explains how a surface is assigned to a lane, and `npm run check:package-boundaries` enforces it.

## Production application boundary

Files inside `SENSEIDUKES/Light-Novels` and every other production Light Novel application are **off-limits during Development repository work**. Agents may inspect those repositories to understand existing contracts, faithfully replicate a component, or reuse working infrastructure during approved reconstruction.

Do not edit, create, delete, commit, push, or open a pull request that changes any Light Novel application from a Development task. Moving approved Development work back into a production application must be treated as a separate integration task and requires the user's explicit authorization.

## Coding agents: required setup

Before making any changes, every coding agent is required to:

1. Read [AGENTS.md](./AGENTS.md).
2. Read [Sensei Skill](./skills/sensei-skill/SKILL.md) and [SEIHouse Codebase Conventions](./skills/seihouse-codebase-conventions/SKILL.md).
3. For imported surfaces or reconstructed systems, read [Workshop Replica](./skills/workshop-replica/SKILL.md) and select its faithful-replica or reconstruction mode.
4. State clearly if a required skill cannot be accessed; do not invent a replacement.

The seven canonical skills are maintained directly in `skills/`, discovered through
`.agents/skills.json`, and listed in [AGENTS.md](./AGENTS.md#required-skills).
There are no mirrored installation copies. Sensei guides product-owner communication;
Codebase Conventions governs ownership and compatibility; Workshop Replica defines the
selected lifecycle, source authority, verification, and transfer boundaries.

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

Faithful visual replicas use mock content and isolated previews. Approved major system
reconstruction may include real frontend, backend, APIs, persistence, schemas, and
integration under [DEVELOPMENT_RECONSTRUCTION.md](./DEVELOPMENT_RECONSTRUCTION.md).

## Run locally

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open the local or forwarded Vite preview, usually on port `5173`.

## Current workshop entries

The home screen is driven by [`src/workshop/manifest.ts`](./src/workshop/manifest.ts). Each approved experiment should have its own preview and a clear entry in that manifest.

As of 2026-09-25, the header has five preview sections and a NovelExpanded Docs tab — navigation, not package ownership:

- **Pages** — subsections Home (Light Novels Home, Library Shell), Create (Story Seed), Read (Reader Chamber, Reader Codex), Account (User Profile / Cultivator Cave), and Commerce (Celestial Store).
- **Rewards** — Reward Loop, Achievements, Fate Survival Relics, Familiar Training, Daily Dao Pillar, and Closed-Door Cultivation.
- **Customization** — Familiar.
- **Systems** — Harness Generation, Chapter Generation Manifestation, Character Voice, Provenance, and Energy.
- **Components** — Motion Picture, Celestial Particle Backdrop, Card Workshop, and the live Library Components and Icons inventories.
- **Docs** — [the shared product-term reference](./src/workshop/docs/README.md) at `?tab=docs`: grouped topic navigation, search, and one current explanation per filled term. Unfilled topics retain placeholders until their wording is approved.

Each manifest entry declares:

- `section` (and optional `group`) — Workshop navigation only.
- `owner` — the package lane that actually owns it (`sen`, `library`, `library-ui`, `workshop`, or `deferred`), shown as a badge on every card and inline panel. It is written explicitly, never inferred from file paths, and must agree with `scripts/ownershipInventory.mjs`; changing a badge never moves code between packages.
- `status` — `active`, `legacy`, or `archived`. Archived entries leave the preview sections and appear only under the **Archive** control below them, but keep their implementation and direct `?preview=<id>` URL. Optional `replacedBy` and `archiveNote` explain why. The old Chapter Generation (`chapter-generation-flow`) and Model Router page are archived. The Archive is not shown in Docs.

The inline Library Components and Icons inventories are listed in `workshopPanels` with the same `section` and `owner` metadata. Canonical implementations and direct `?preview=<id>` URLs stay in place. The header scrolls horizontally on phones and supports Left/Right arrows, Home/End, and Tab into the labelled active panel; the Archive control is a standard disclosure button. Docs is Workshop tooling, not a feature preview or a published package entry.

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

## Packages

```bash
npm run check:package-boundaries   # SEN/Library boundary, checked from source
npm run build:package              # build and verify both packages
npm run test:package               # pack both, install into fresh consumers, type-check, bundle
```

Workshop previews import through the same public package entries a consumer
receives — `@seihouse/sen/*` and `@seihouse/library/*`, aliased to
`src/package/sen/*` and `src/package/library/*` — so a preview never renders
something a consumer could not.

## Moving work into another application

Workshop components should stay portable: minimal dependencies, no auth, no database, and no production persistence. Once approved, transfer into a corresponding application may happen only as a separate, explicitly authorized integration task. Transfer the actual component, styles, and required assets; do not import the Workshop shell, mock controls, or preview-only state.
