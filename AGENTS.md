# Coding Agent Instructions

Read this file before making changes.

Read the relevant feature guide for current ownership and behavior. Dated histories
and audits record earlier states; consult them when the task needs that history,
and verify any open finding against current code before acting on it.

## Purpose

This repository is the **SEN Development space**: a centralized development, reconstruction, and preview environment for SEN and Library components and the NovelExpanded app built here at `/app/`.

### SEN and Library are two products, not one

- **SEN (SEIHouse Expanded Novels)** is an embeddable expanded-narrative engine, like the faceless SEIHouse audio player. Another author or company installs SEN inside their own application and supplies their own writing, branding, storage, authentication, and generation method. SEN provides reusable systems: expanded reading behavior, structured chapter contracts, scoring, Color Codes, Codex behavior, cards, and related narrative surfaces. AI chapter generation is an optional SEN content source, not a requirement.
- **Library** is SEIHouse's first-party host application and branded implementation of SEN. Library-specific visuals, language, cultivation/Qi progression, hub behavior, economy, services, and infrastructure belong to Library.

**Library may depend on SEN. SEN must never depend on Library.** Never describe SEN as a Library feature, and before adding a surface decide which lane owns it — see [`src/package/README.md`](./src/package/README.md). When a surface mixes reusable behavior with Library presentation, separate the behavior into SEN and leave the skin in Library rather than duplicating it.

Use it to isolate, preview, and refine UI components, animations, icons, rewards, and visual effects without needing the production app, authentication, story data, or migration infrastructure.

### Product direction (NovelExpanded)

Before any product work, meaning anything a NovelExpanded.com reader or author will see or feel or anything SEN offers a host that embeds it, read [`NOVEL_EXPANDED.md`](./NOVEL_EXPANDED.md). It is the owner's direction for the product:

- the product family: SEN, the licensable engine; Expanded Novels, SEIHouse's first-party product on it (the Library in code); and the shared SEIHouse infrastructure beneath both;
- the product map, the whole surface the two products cover;
- users and progressive disclosure, from entertainment user to creator-business;
- SEN licensing as the business strategy;
- the core application spine: four pages that are the minimum path through the product, not its scope;
- the read → direct → Next Chapter loop at its heart;
- the HARNESS as invisible infrastructure inside SEN, never a user-facing page;
- where the build is today and what gets built next.

Recent development activity does not redefine the product: never treat the subsystem receiving the most work as the whole of SEN or Expanded Novels. Only what is being built now exists: do not reconnect an old system because it used to be there. When a task and that document disagree, ask the owner.

### The NovelExpanded app

The app itself lives in [`src/novel-expanded/`](./src/novel-expanded/README.md), served from `app/index.html` at **`/app/`** (Home `/app/`, Create `?page=create`, Story View `?story=<id>`, Reader `?story=<id>&read=1`). It is a `host` of the SEN and Library packages, keeps its own browser storage, and has no manifest entry or `?preview=` id; the Workshop home links to it.

`npm run check:app` (`scripts/checkNovelExpandedApp.mjs`) walks the app's import graph and fails, naming the chain, if it reaches Workshop, test or unowned code, an older system's entry (`@seihouse/sen/reader-chamber`, `reader-codex`, `cards`, `translation`, `@seihouse/library/generation`), the HARNESS developer page, the older Reader's code, or, from the app's own files, a package entry outside its list. It runs in `verify`, `npm run build` and CI. Never widen the list or reconnect an old system to make it pass; ask the owner.

### Keep app surfaces and Workshop previews in sync

When changing a surface in the NovelExpanded app, update its equivalent Workshop
Development preview in the same change. The preview must show the current app
presentation and behavior, including the surrounding shell, branding, navigation
and relevant states. Prefer sharing the canonical package surface and host
composition, or loading the app route in the existing preview iframe, over copying
the page into a separate simulation. Home follows this rule at
`?preview=light-novels-home`: Development loads `/app/` directly.

Keep one existing manifest entry, workspace and preview route per feature. Only
the Reader Chamber family (Reader Chamber, Reader Codex, Card Workshop) keeps a
historical `reference/` folder and Original Reference, unchanged, while it is
brought over; use Compare there to inspect old and current versions. The owner
removed every other old production copy on 2026-10-28. Clearly identify previews that use the app's
real browser storage and actions instead of isolated fixtures. Verify the app and
its Workshop preview at mobile and desktop sizes before claiming completion.

### Mobile-first pages

NovelExpanded is a phone app first (SENSEI, 2026-11-02). Design every page for a
390×844 phone, then let larger screens rearrange it; never design for a laptop and
squeeze it down. The Familiar page (`src/components/familiar-training/development/FamiliarStage.tsx`)
is the model to follow.

- Base styles are the phone layout. `sm:`/`md:`/`lg:` (or a `min-width` media query)
  only rearrange it for wider screens.
- Size full-screen pages with `dvh` and keep clear of the floating header and bottom
  navigation (`--workspace-header-height`, `--library-bottom-clearance`) and the safe
  areas (`env(safe-area-inset-*)`). Nothing may sit under the bottom navigation.
- A page's main action is one control next to what it acts on, in the thumb's reach; its
  choices open from it (the Familiar page's Offer button opens its QI amounts) instead of
  a row of buttons.
- Every touch target is at least 44px. Nothing works only on hover.
- Choosing one of many is a swipe (with arrow buttons and keyboard arrows), not a
  wrapping pile of chips or a long column of cards.
- Settings read like a console options list: one row per setting, name on the left,
  control on the right (`◀ value ▶` steppers, `ON | OFF` switches), a help line for the
  row in focus, and Restore defaults · Back at the foot (`FamiliarSettingsMenu`).
- Nothing scrolls the page sideways.
- Before calling a page done, screenshot it at 390×844 and at 1280×800 and look at both.

### Major system reconstruction

For tasks that rebuild a real product system rather than only refining a visual Workshop component, read [`DEVELOPMENT_RECONSTRUCTION.md`](./DEVELOPMENT_RECONSTRUCTION.md) before implementation.

That policy permits real frontend, backend, persistence, schema, and integration work inside development. For those tasks, it overrides the visual-only, mock-only, and no-backend restrictions in this file. All unrelated Workshop organization and quality rules still apply where relevant.

### Harness Generation vocabulary

Before reading, modifying, or discussing anything under
`src/components/harness-generation/` or `src/server/harness-generation/`,
read [`src/components/harness-generation/ARCHITECTURE_VOCABULARY.md`](./src/components/harness-generation/ARCHITECTURE_VOCABULARY.md)
first. It is the single authoritative definition of HARNESS, CAPA, CAPA
Schema, CAPA Skill, CAPA Prompt, Story Information, Story Information
Packet, Immediate Chapter Request, Generation Model Call, and Generated
Chapter, and it documents where current code already matches or diverges
from that vocabulary.
Read [`HARNESS_PRINCIPLES.md`](./src/components/harness-generation/HARNESS_PRINCIPLES.md)
with it: why the HARNESS exists (the problems it solves, the one principle
behind them, and the world record the Codex needs to translate a story into
other media). The staged plan for what comes next is in `NOVEL_EXPANDED.md`. Use those terms as defined there; do not invent
parallel terminology, schemas, assemblers, or context systems for a
concept it already defines.

### The writer's prompt skeleton

The [architecture vocabulary](./src/components/harness-generation/ARCHITECTURE_VOCABULARY.md#core-definitions)
defines the writer's prompt skeleton; `HARNESS_PROMPT_PARTS` in
`src/server/harness-generation/prompt.ts` and `promptSkeleton.test.ts` enforce it.
Every change to text the writer reads must name its part and go through that
part's owner, never insert text between parts. CAPA writing guidance belongs in
How to write, and story data in Story information. Tag teaching belongs to the
separate Chapter Tagger; it left the writer on 2026-10-26.

### Generation features and the Model Router

Every feature that calls a generation model (text, image, or speech) must be
registered in the Model Router in the same change that adds it:

1. Add it to `GENERATION_CONSUMERS` in `src/server/model-router/catalog.ts`
   with its capability, the server file that makes the call, and whether it
   follows the Router's model choice (`router`) or the server default.
   Provider adapter files go in `PROVIDER_ADAPTERS`.
2. Route its model through the catalog (`resolveChapterModelRoute`,
   `requireTextModelKey`, the provider factories) instead of pinning a model
   string or reading a provider key directly.

The Router's "Used by" section is generated from that registry, so it is the
product owner's view of what every model powers. `src/server/model-router/generationConsumers.test.ts`
scans the repository and fails on any unregistered model call.

## Required skills

Before beginning any implementation, download, install or otherwise make available, and read all required skills for this repository.

Current required skills:

- **Sensei Skill** — [`skills/sensei-skill/SKILL.md`](./skills/sensei-skill/SKILL.md), the product-owner communication and consequence-reporting guidance.
- **SEIHouse Codebase Conventions** — [`skills/seihouse-codebase-conventions/SKILL.md`](./skills/seihouse-codebase-conventions/SKILL.md), the required repository-orientation and architectural-consistency layer. Use it to identify the existing SEIHouse system that owns a change, apply the build, deletion and compatibility rules, and avoid duplicate components, stores, services, schemas, persistence paths, or media paths.
- **Workshop Replica Skill** — [`skills/workshop-replica/SKILL.md`](./skills/workshop-replica/SKILL.md), used for pages, screens, components, animations, and flows brought over from the production app, and for approved system reconstruction.
- **SEIHouse Verification Loop** — [`skills/seihouse-verification-loop/SKILL.md`](./skills/seihouse-verification-loop/SKILL.md), the checking passes run after implementing and before reporting: validate broadly, modify narrowly.

These skills are part of the repository workflow and are not optional. Do not silently proceed without them.

At the beginning of every task:

1. Confirm that all required skills were downloaded or are available in the agent environment.
2. Read the Sensei Skill and SEIHouse Codebase Conventions before changing code.
3. Read the Workshop Replica Skill for imported surfaces and approved system reconstruction.
4. Run the Verification Loop after implementing and before reporting.
5. State clearly if any required skill cannot be accessed.
6. Do not invent a replacement version of a missing skill.

The SEIHouse Codebase Conventions skill is mandatory for every implementation task. For both visual refinement and approved reconstruction, agents must locate and reuse the existing Workshop systems, component families, shared primitives, state patterns, and source-boundary conventions instead of creating parallel structures.

When the user asks to bring a real page, screen, component, animation, or flow from another repository into this Workshop, the Workshop Replica Skill is mandatory. It selects faithful replication or approved reconstruction and defines the corresponding source authority, boundaries, verification, and documentation.

## Core rule

Build the new path here: SEN (`@seihouse/sen`), Library (`@seihouse/library`), and
NovelExpanded at `/app/` (`src/novel-expanded/`). `NOVEL_EXPANDED.md` decides what gets built.
Keep portable components separate from the Workshop shell. Approved reconstruction
follows `DEVELOPMENT_RECONSTRUCTION.md` and may include real system infrastructure.

Old systems stay until each is remade on the new path or the owner approves removing
them; when a remake replaces one, delete the old one in the same change. Never delete a
system only because the new path does not use it yet (it may still be waiting for its
remake or for import from production), never reconnect it as it is, and never re-sync
with the old production app. Existing `reference/` folders hold the old production version
as historical material for its remake; they are not edited or refreshed. New features
have no `reference/` folder.

## Organization

- `src/workshop/manifest.ts` lists every workshop entry shown on the home screen — **one entry per feature, never one per version.**
- `src/workshop/FeatureWorkspace.tsx` is the shared shell every feature preview opens into: Development over one shared preview canvas, plus an Original Reference / Compare switch for a feature that still keeps its old production version (only the Reader Chamber family).
- `src/workshop/previews/<feature>/` contains the workspace preview wrapper (built on `FeatureWorkspace`), mock data, and preview-state simulators for that feature.
- `src/App.tsx` resolves `?preview=<id>` through a `previewRegistry` map — add one line per feature, never a new `if` block.
- Reusable component logic lives in `src/components/<feature-name>/`, split into:
  - `reference/` — the old production version, kept as historical reference for its remake. Never edited or refreshed. Only the Reader Chamber family (`reader-chamber`, `reader-codex`, `card-workshop`) still has one.
  - `development/` — the active implementation, built here. Package entries import from this folder; keep its name. Reconstruction may also change the relevant shared, server, and integration owners.
  - `shared/` (when it applies) — logic genuinely shared by implementations or consumers, such as shared utilities.
- `src/package/` holds the entry barrels for the two packages built here —
  `src/package/sen/` for `@seihouse/sen` (the portable engine: surface
  primitives, Color Codes, cards, Reader Chamber, Reader Codex,
  Manifestations, motion picture, audio, Story Seed, HARNESS, Reader Runtime,
  Highlight Engine, arc goals, translation, presentation and contracts) and
  `src/package/library/` for `@seihouse/library` (SEIHouse's own surfaces:
  cultivation and the relic economy). Neither contains components of its own:
  entries re-export `development/` and `shared/` code so the Workshop and the
  packages always render the same source. Workshop shells, preview mocks,
  historical `reference/` material, and host-owned `src/server/` code stay out of
  client entries. The `@seihouse/library/model-router-server` entry is the
  explicit server-only provider exception; no SEN entry may reach a Library
  surface. SEIHouse Front Desk (`@seihouse/front-desk`, the Familiar's
  controller, card and voice engines) is shared infrastructure beneath both,
  built in the private `SENSEIDUKES/seihouse-front-desk` repository and
  installed from `vendor/` like the UI kit; change it there, not here, and
  re-vendor it (`vendor/README.md`).
  `npm run check:package-boundaries` walks the real import graph and fails on
  the file that breaks the rule; `npm run build:package` re-checks the built
  output. Workshop code consumes package surfaces through `@seihouse/sen/*`
  and `@seihouse/library/*`, aliased to `src/package/sen/*` and
  `src/package/library/*`.
- Static visual assets belong in `public/` under a clearly named folder.
- Keep component-specific styles close to the component when practical.
- Portable agent skills have exactly one authoritative editable entrypoint at `skills/<skill-name>/SKILL.md`. `.agents/skills.json` discovers `../skills` relative to `.agents/`; do not mirror skill files under `.agents/skills/`.
- The canonical set is [Sensei](skills/sensei-skill/SKILL.md), [Codebase Conventions](skills/seihouse-codebase-conventions/SKILL.md), [Workshop Replica](skills/workshop-replica/SKILL.md), and [Verification Loop](skills/seihouse-verification-loop/SKILL.md).

### No "V2" folders, cards, or preview IDs

Never create a second homepage card, a second manifest entry, a second preview folder, or a `V2`/`V3`/"Revised"/"New"/"Experimental" component name for the same feature. Git history already preserves prior iterations. A redesign in progress belongs in that feature's existing `development/` folder, opened through its existing `?preview=<id>` route and switched to with the Development button — never a new route.

When adding a new experiment:

1. Give it one focused feature folder under `src/components/` with `development/`, plus `shared/` only when something is genuinely shared. Do not create a `reference/` folder.
2. Add one workspace preview under `src/workshop/previews/<feature>/`, built on `FeatureWorkspace`.
3. Add one entry to `src/workshop/manifest.ts`, with `source.repository` and `source.path` pointing at this repository (for example, `Not applicable — DEV-native primitive`), its Workshop `section` (Pages, Customization, Rewards, Systems, or Components), explicit package `owner` (matching `scripts/ownershipInventory.mjs`), and `status`. No source-comparison date is required. Retire an entry with `status: 'archived'` (and `replacedBy`/`archiveNote`), keeping its implementation and route.
4. Register it in `previewRegistry` in `src/App.tsx` at one stable `?preview=<id>` URL.
5. Add one component README with its purpose, current ownership, preview boundaries, and a short dated history.

### Build and remake lifecycle

1. Read `NOVEL_EXPANDED.md` and locate the existing owner in SEN, Library or the app.
2. Keep the old implementation and historical references while remaking the feature on the new path.
3. Build and verify the active implementation in its existing `development/` folder and the relevant shared, server or host owners.
4. Use the same feature workspace and route. Do not reconnect the old implementation, refresh references, or synchronize with `Light-Novels`.
5. The packages and NovelExpanded app are the destination. Changes to another repository require the owner's explicit request.

## Dating requirement

READMEs keep a short dated history, using real dates. Keep existing history entries.
No replica-creation or source-comparison dates are required.

## Working style

- Keep previews mobile-first and easy to inspect on the deployed Vercel site.
- Make visual changes directly from the user's instructions.
- Avoid unnecessary dashboards, controls, settings, or architecture unless requested.
- Do not add database, authentication, API, persistence, or migration work unless the task is governed by `DEVELOPMENT_RECONSTRUCTION.md`.
- Reuse the existing app stack and keep dependencies minimal.
- Preserve currently approved work while adding new workshop entries.

## Live preview workflow

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Use `npm ci` for initial setup and after pulling dependency or vendored-package
updates, as CI does. It installs the lockfile from a clean `node_modules`.
`npm install` can retain an older same-version UI tarball; `npm run check:ui-artifacts`
detects that mismatch, and `npm ci` fixes it.

Keep the local or forwarded preview available, usually on port `5173`. After changes, confirm the app compiles and the relevant preview still renders on mobile and desktop.

## Verification and CI

`npm run verify` checks types, unit tests, ownership, package boundaries, the app's
import graph, and package builds/consumer smoke tests. It does **not** run browser
checks or the production app build, so passing it alone does not mean all CI checks
passed.

CI also runs `npm run test:browser` against the dev server on port `5173`,
`npm run build`, and `npm run test:browser:app-header` against the built app served
by `npm run preview` on port `4173`. Browser checks require Playwright Chromium and
WebKit (`npx playwright install --with-deps chromium webkit`). Follow the
[local CI check instructions](./README.md#verification-and-ci) for the complete
sequence and server commands. Report which checks actually ran and which were
skipped or blocked; do not describe `verify` alone as full CI verification.

## Final integration

The SEN and Library packages and the NovelExpanded app are the destination now.
Never change another repository unless the owner explicitly asks. Keep Workshop-only
navigation, mocks and preview controls out of package entries and the app.
