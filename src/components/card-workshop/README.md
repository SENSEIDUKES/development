# Card Workshop

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Verified source locations:** `src/components/ReaderViewport.tsx`, `src/components/WorldEntityCard.tsx`, `src/components/SystemBlock.tsx`, `src/components/FateResultCard.tsx`
- **Workshop preview:** `?preview=card-workshop`
- **Replica created:** 2026-08-14
- **Last Workshop update:** 2026-08-15
- **Last source comparison:** 2026-08-15
- **Replica status:** under refinement

## Purpose

The development-only Card Workshop makes the active Reader presentations inspectable without generating a chapter. Card Type Tabs keeps the isolated preset gallery, while Contextual View routes the same selected preset through the real Development `ReaderViewport` inside a deterministic local chapter.

The current structure is deliberately limited to:

- `CodexCard` for visually presented Human Portraits, Non-Human Portraits, Artifacts, and Locations resolved from application-owned Codex entries;
- `WorldCard` for highlighted Bestiary species, highlighted Factions, and encounter-only beasts that do not belong on a visual Codex Card;
- `SystemBlock` and its existing nested `FateResultCard` presentation as independent System Panels.

Chapter Visual Memories are not part of the Reader or Card Workshop. Manga Studio is outside this feature and is unchanged.

## Workshop history

- **2026-08-15:** Replaced the standalone Inspection Mode with Contextual View. The selected Codex Card, World Card, or System Panel now enters the real ReaderViewport structured-block path between fixed prose and a highlighted entity mention; technical routing, capability, and override controls live beneath the preview in a collapsible Technical Details section.
- **2026-08-14:** Created the Card Workshop, extracted the production-inline Codex presentation for shared Reader/Workshop rendering, and added deterministic local state simulation.
- **2026-08-14:** Rebased Part Two onto merged Part One, restored a locked Reference pane, isolated sound simulation, and completed missing-image, Codex, reveal, audio, and responsive states.
- **2026-08-14:** Replaced the all-at-once Overview with one accessible tab per card preset so only the selected card renders.
- **2026-08-14:** Routed Development World Card audio through the shared `@seihouse/audio-player` session.
- **2026-08-14:** Completed the first Part Three cleanup: renamed the active card components, restricted Codex Cards to the four visual Codex categories, moved Bestiary/Faction highlights to World Cards, removed System/Fate World Card fixtures, and removed Chapter Visual Memories. Existing Portrait, Artifact, and Location audio direction remains in the chapter payload; this Workshop does not decide future Codex Card audio interaction.

## Development states

Contextual View supports:

- Human and Non-Human Portrait Codex Cards;
- Artifact and Location Codex Cards;
- existing Codex artwork, eligible Manifest/Awaken state, and missing-without-action state;
- Codex entry present or missing;
- first reveal or existing-entity reference;
- highlighted Bestiary species, highlighted Factions, and random encounter beasts as World Cards;
- sound available, unavailable, loading after tap, playing after tap, and muted for World Cards;
- every current `SystemBlock` kind and all existing Fate outcomes;
- mobile (375px), tablet (768px), and desktop widths.

Card Type Tabs exposes every preset in a horizontally scrollable tab list and mounts exactly one presentation at a time. Arrow keys plus Home and End move between tabs. Card Type Tabs and Contextual View share one selected preset and one override state.

## Mock and production boundaries

- Fixtures are static local objects and `/public/card-workshop` SVG assets.
- The Card Workshop makes no model, generation, API, database, story-write, persistence, or production-media calls.
- Contextual View preassigns its fixed local reveal backdrop, so ReaderViewport never enters its normal backdrop-assignment update path.
- The Development sound adapter routes World Card taps through the shared audio session. The local fixture resolves to one published Library Help sample because this preview tests the existing audio lifecycle, not catalog selection.
- Reference mode uses locked production presentation replicas and has no Development controls.
- Bestiary and Faction records remain informational and expose no Codex image-generation action.
- System Panels retain their existing information, size, layout, colors, Fate presentation, and routing.

## Transfer notes

The active Development exports are:

- `src/components/reader-chamber/development/CodexCard.tsx`
- `src/components/reader-chamber/development/WorldCard.tsx`
- the existing routing point in `src/components/reader-chamber/development/ReaderViewport.tsx`

The verified `Light-Novels` `main` source still uses `src/components/WorldEntityCard.tsx` and keeps the Codex presentation inline in `ReaderViewport.tsx` as of commit `66643f6`. Those upstream paths are recorded only as the inspected source baseline; the active Development names are `WorldCard` and `CodexCard`.

Do not transfer Workshop controls, fixtures, contextual Reader harness, local sound adapter, or the optional Development ReaderViewport audio seam into production.
