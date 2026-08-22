# Card Workshop

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Verified source locations:** `src/components/ReaderViewport.tsx`, `src/components/SystemBlock.tsx`, `src/components/FateResultCard.tsx`
- **Workshop preview:** `?preview=card-workshop`
- **Replica created:** 2026-08-14
- **Last Workshop update:** 2026-08-22
- **Last source comparison:** 2026-08-22
- **Replica status:** under refinement

## Purpose

The development-only Card Workshop makes the active Reader presentations inspectable without generating a chapter. Card Type Tabs keeps an isolated preset gallery, while Contextual View routes the selected preset through the real Development `ReaderViewport` inside a deterministic local chapter.

The current presentation set is deliberately limited to:

- `CodexCard` for Human Portraits, Non-Human Portraits, Artifacts, and Locations resolved from application-owned Codex entries;
- `SystemBlock` and its nested `FateResultCard` presentation as independent System Panels;
- inline World Cue examples showing both a Codex-linked term with an independent sound mark and a sound-only term whose prose remains visually native.

Chapter Visual Memories are not part of the Reader or Card Workshop. Manga Studio is outside this feature and is unchanged.

## Workshop history

- **2026-08-22:** Finished the compact System Prompt refinement without changing its narration owner. Named characters in the TTS prose now reuse the existing Reader Codex highlighter and hovercard only when a character entry resolves, preserving the entry's assigned novel color; Artifacts, Locations, Factions, and unnamed mentions remain outside this System-prose pass. Added an optional structured `badge` such as `THREAT ASSESSMENT · MODERATE`; the full original `content` stays intact for TTS while the matching badge phrase moves out of the visible serif sentence. Replaced consequence scrolling with measured priority selection: mobile shows three only when all three fit with breathing room, otherwise the first two, while roomy layouts may still show four. Every visible item remains untruncated on one line. The target-scan mock proves the red hostile character link, badge, and three-item row; the breakthrough mock proves the two-item mobile fallback. The locked Reference and existing TTS playback path remain unchanged.
- **2026-08-22:** Rebuilt the compact System Prompt around three parts: the fixed SYSTEM kicker with the temporary orb emblem resting small beside it, a dramatic per-event headline from `system.title`, the concise serif sentence from `content` (still the only text narration reads), and one horizontal bottom row of up to four prioritized signed consequences from `system.changes`. The single-column stack fixes the portrait layout — the large side orb no longer squeezes the text column at 390px. The component stays fully data-driven; the Workshop example switch now offers three mocked Wuxia events — cultivation breakthrough (gold), broken promise (orange), and target scan (red) — beside the unchanged structured mechanical example. The shared `SystemPromptChange` contract now documents the four-consequence cap in priority order; generation is still not wired to emit it.
- **2026-08-22:** Rebuilt the compact regular System Prompt (Development `SystemBlock`, events without mechanical rows) to the approved reference: the fixed SYSTEM label, one concise event sentence in reader serif, and one small signed metadata row beneath it carrying no more than two structured changes. Supporting that row, the shared `BaseSystemEvent` contract gains an optional `changes: { direction: "gain" | "loss"; label }[]` field, so the row never relies on arbitrary text. The existing Codex orb (radial glow, glass sphere, dashed/dotted orbit rings, ✦ core) sits at the right edge as the temporary System emblem. The card keeps the semantic System color system — label, changes row, border, and orb all inherit the event's `promptType` accent, with the approved reference's blue as the default new-info voice — over blue-black depth; death-flag and iron-fate events keep their menacing border pulses. Fate System Prompts, the structured mechanical rows panel, the legacy string fallback, and the locked Reference are unchanged. The literary example becomes the bond notice "Aster now considers you someone she can trust." with `+ Karma Bond`. The expanded view, Codex overhaul, broader terminology system, and chapter-generation wiring remain out of scope.
- **2026-08-21:** Consolidated System Prompt categories across the Workshop, types, normalizer, model parsers, and prompt directives into strictly two top-level options: universal System Prompt (`system_prompt`), which supports concise literary notices and optional structured mechanical rows with a development example switch, and Fate System Prompt (`fate_system_prompt`), which strictly requires a valid Fate Survival payload. Removed obsolete legacy kinds cleanly across all contracts and test suites without altering visual rendering or layout.
- **2026-08-19:** Removed the retired standalone world presentation and every Card Workshop preset, adapter, override, and Reference rendering branch that existed only for it. Contextual View now demonstrates the replacement circle-free, footnote-scale annotations on audible actions: `the Rain Court bell tolled` contains the independently linked Codex name while its separate mark starts playback, and `a Vermilion Debt Fox growled once` remains ordinary prose with only the small sound mark identifying the event. Each final word, mark, and punctuation stays together while longer phrases can wrap normally.
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
- a Codex-linked audible action with an independently operable inline Worldcue;
- a sound-only audible action that remains ordinary Reader prose;
- every current `SystemBlock` kind and all existing Fate outcomes;
- mobile, tablet, and desktop widths.

Card Type Tabs exposes every remaining preset in a horizontally scrollable tab list and mounts exactly one presentation at a time. Arrow keys plus Home and End move between tabs. Card Type Tabs and Contextual View share one selected preset and one override state.

## Mock and production boundaries

- Fixtures are static local objects and real Library test images under `/public/card-workshop/test-images`.
- Development Codex reveals use the Manifest backdrop pool under `/public/manifest-backdrops`; the locked Reference keeps its existing placeholder.
- The Workshop makes no model, generation, API, database, story-write, persistence, or production-media calls.
- The contextual Worldcue starts from a block-scoped resolved annotation only;
  the model-safe fixture chooses category, variation, and semantic tags while
  application logic selects the approved public Library Cue.
- Reference mode uses locked production presentation replicas and has no Development controls.
- Bestiary and Faction records remain informational and expose no Codex image-generation action.
- Fate panels, the structured mechanical System example, and System routing retain their existing presentation; the compact System Prompt follows the approved 2026-08-22 reference with a small orb emblem, dramatic headline, character-linked TTS prose, optional event badge, and one non-scrolling priority consequence row while keeping the semantic System color system.

## Transfer notes

The active Development presentation owners are:

- `src/components/reader-chamber/development/CodexCard.tsx`
- `src/components/reader-chamber/development/InlineAudio.tsx`
- `src/components/reader-chamber/development/ReaderViewport.tsx`
- `src/components/reader-chamber/development/SystemBlock.tsx`
- `src/components/library/LibrarySoundGlyph.tsx`

`Light-Novels` `main` was inspected at commit `f89cb41` on 2026-08-22. Its current Reader, System, and Fate source paths remain the comparison baseline; this Workshop change does not modify that repository.

Do not transfer Workshop controls, fixtures, contextual Reader harness, or preview overrides into production.
