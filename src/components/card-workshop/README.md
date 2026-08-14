# Card Workshop

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Source locations:** `src/components/WorldEntityCard.tsx`, `src/components/SystemBlock.tsx`, `src/components/FateResultCard.tsx`, `src/components/ReaderViewport.tsx`, `src/components/ManifestationImage.tsx`
- **Workshop preview:** `?preview=card-workshop`
- **Replica created:** 2026-08-14
- **Last Workshop update:** 2026-08-14
- **Last source comparison:** 2026-08-14
- **Replica status:** under refinement

## Purpose

The development-only Card Workshop makes current Reader card and system-panel presentations immediately inspectable without generating a chapter. It uses the real Reader components and their real payload types rather than visual copies.

## Workshop history

- **2026-08-14:** Created the Card Workshop, extracted the production-inline Codex Reveal presentation for shared Reader/Workshop rendering, and added deterministic local state simulation.
- **2026-08-14:** Rebased Part Two onto merged Part One, restored a locked Reference pane, isolated sound simulation, and completed missing image, Codex, reveal, audio, and responsive states.

## Presentations

- `WorldEntityCard`: human, important non-human individual, artifact/relic, location, faction, and the existing `system` and `fate_event` routes labeled as under review.
- `SystemBlock`: status, skill acquisition, breakthrough, quest, and appraisal.
- `FateResultCard`: rendered only through its real nested `SystemBlock` path.
- Inline Codex Reveal: Bestiary species and Non-Human Portrait examples. These are examples of one reveal path, not extra card families.
- `ManifestationImage`: isolated and labeled as a chapter-level visual memory.

## Development states

Inspection mode supports:

- every entity/event preset;
- existing image, Manifest/Awaken action, and missing-image states;
- Codex entry present or missing;
- first reveal or existing-entity reference;
- Human or Non-Human Portrait;
- important creature individual or Bestiary species;
- sound available, unavailable, loading after tap, playing after tap, and muted;
- every current `SystemBlock` kind and all Fate outcomes;
- mobile (375px), tablet (768px), and desktop widths.

## Mock and production boundaries

- Fixtures are static local objects and `/public/card-workshop` SVG assets.
- The Card Workshop makes no model, generation, API, database, story-write, persistence, or production-media calls.
- Card sound state is supplied through an optional Development-component adapter. Normal Reader callers omit it and retain the existing resolver/player lifecycle.
- Reference mode uses locked production component replicas and has no Development controls.
- No generation prompt, card-routing rule, Bestiary/Portrait normalization, Reader Codex architecture, or production integration is changed here.

## Transfer notes

For the Codex Reveal extraction only:

1. Copy `src/components/reader-chamber/development/CodexRevealCard.tsx` to a new `Light-Novels/src/components/CodexRevealCard.tsx`.
2. Update `Light-Novels/src/components/ReaderViewport.tsx` to import and render it in place of the current inline JSX.
3. Do not copy `src/components/card-workshop`, `src/workshop/previews/card-workshop`, its local fixtures, or its sound adapter into production.

The new production destination does not exist yet; `ReaderViewport.tsx` remains the verified source location for the inline presentation.
