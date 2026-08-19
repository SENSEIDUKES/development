# Card Workshop

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Verified source locations:** `src/components/ReaderViewport.tsx`, `src/components/SystemBlock.tsx`, `src/components/FateResultCard.tsx`
- **Workshop preview:** `?preview=card-workshop`
- **Replica created:** 2026-08-14
- **Last Workshop update:** 2026-08-19
- **Last source comparison:** 2026-08-19
- **Replica status:** under refinement

## Purpose

The development-only Card Workshop makes the active Reader presentations inspectable without generating a chapter. Card Type Tabs keeps an isolated preset gallery, while Contextual View routes the selected preset through the real Development `ReaderViewport` inside a deterministic local chapter.

The current presentation set is deliberately limited to:

- `CodexCard` for Human Portraits, Non-Human Portraits, Artifacts, and Locations resolved from application-owned Codex entries;
- `SystemBlock` and its nested `FateResultCard` presentation as independent System Panels;
- inline World Cue examples showing both a Codex-linked term with an independent sound mark and a sound-only term whose prose remains visually native.

Chapter Visual Memories are not part of the Reader or Card Workshop. Manga Studio is outside this feature and is unchanged.

## Workshop history

- **2026-08-19:** Removed the retired standalone world presentation and every Card Workshop preset, adapter, override, and Reference rendering branch that existed only for it. Contextual View now demonstrates the replacement circle-free, footnote-scale annotations: `Rain Court` opens its Codex entry while its separate mark starts playback, and `Vermilion Debt Fox` remains ordinary prose with only the small sound mark identifying its cue. Each final word, mark, and punctuation stays together while longer names can wrap normally.
- **2026-08-18:** Development fixtures adopted the real Manifest backdrop pool and published Library test images for Codex media.
- **2026-08-18:** Refined the shared Codex Manifest seal, awakening state, spectral glass, and entity accent treatment without changing its content or routing.
- **2026-08-17:** Adopted the shared responsive `FeatureWorkspace` Workshop Controls shell.
- **2026-08-15:** Added Contextual View so selected Codex or System presentations enter the real Reader structured-block path between fixed prose.
- **2026-08-14:** Created the Card Workshop, extracted the production-inline Codex presentation for shared Reader/Workshop rendering, and added deterministic local state simulation.

## Development states

Contextual View supports:

- Human and Non-Human Portrait Codex Cards;
- Artifact and Location Codex Cards;
- existing Codex artwork, eligible Manifest/Awaken state, and missing-without-action state;
- Codex entry present or missing;
- first reveal or existing-entity reference;
- a Codex-linked phrase with an independently operable inline World Cue;
- a sound-only phrase that remains ordinary Reader prose;
- every current `SystemBlock` kind and all existing Fate outcomes;
- mobile, tablet, and desktop widths.

Card Type Tabs exposes every remaining preset in a horizontally scrollable tab list and mounts exactly one presentation at a time. Arrow keys plus Home and End move between tabs. Card Type Tabs and Contextual View share one selected preset and one override state.

## Mock and production boundaries

- Fixtures are static local objects and real Library test images under `/public/card-workshop/test-images`.
- Development Codex reveals use the Manifest backdrop pool under `/public/manifest-backdrops`; the locked Reference keeps its existing placeholder.
- The Workshop makes no model, generation, API, database, story-write, persistence, or production-media calls.
- The contextual World Cue resolves an existing public Library catalog URL and starts only from its own tap target through the shared Development audio owner.
- Reference mode uses locked production presentation replicas and has no Development controls.
- Bestiary and Faction records remain informational and expose no Codex image-generation action.
- System Panels retain their existing information, layout, colors, Fate presentation, and routing.

## Transfer notes

The active Development presentation owners are:

- `src/components/reader-chamber/development/CodexCard.tsx`
- `src/components/reader-chamber/development/InlineAudio.tsx`
- `src/components/reader-chamber/development/ReaderViewport.tsx`
- `src/components/reader-chamber/development/SystemBlock.tsx`
- `src/components/library/LibrarySoundGlyph.tsx`

`Light-Novels` `main` was inspected at commit `66643f609067fea9bc6da6a779673f1681d2c70e` on 2026-08-19. Its current Reader, System, and Fate source paths remain the comparison baseline; this Workshop change does not modify that repository.

Do not transfer Workshop controls, fixtures, contextual Reader harness, or preview overrides into production.
