# `@seihouse/sen`

The package surface DEV publishes from. `src/package/` holds only entry
barrels — the components themselves stay in `src/components/<feature>/`, so
the Workshop and the package always render the exact same code.

## Entries

| Import | Surface |
| --- | --- |
| `@seihouse/sen` | The Celestial Library primitives (re-exported from `./library`) plus `SEN_PACKAGE_VERSION` |
| `@seihouse/sen/library` | The Celestial Library design system: panels, cards, buttons, the Manifest action, inputs, navigation, glyphs |
| `@seihouse/sen/reader-chamber` | The Reader Chamber shell, viewport, header, controls, settings, fate surfaces, reading model |
| `@seihouse/sen/reader-codex` | The Reader Codex shell, sheet overlay, bestiary, section views, Codex context, Codex hooks |
| `@seihouse/sen/codex-cards` | The Codex card family: Codex card, hovercard, character/location cards and profiles, entity accents |
| `@seihouse/sen/manifestations` | The Manifestation chamber, zones, loading system and veils, journey scrubber, omen scenes, manifestation model |
| `@seihouse/sen/relics` | The relic card, inspection modal, and claim reveal |
| `@seihouse/sen/audio` | The client-safe audio surface: Library cues and the inline audio model |
| `@seihouse/sen/closed-door-cultivation` | The props-driven idle-Qi reward presentation and claim animation |
| `@seihouse/sen/story-seed` | The Story Seed creation workspace, Story Bank, Blueprint review, import/help surfaces, and canonical portable contracts |
| `@seihouse/sen/chapter-generation` | The DEV live generation flow, Diagnostics, Reader handoffs, batch state, packet adapter, and four-stage pipeline contracts |
| `@seihouse/sen/styles.css` | The bundled stylesheet, for consumers that prefer to load CSS explicitly |

Each entry that needs styling imports its own CSS as a side effect, so a
consumer never hand-imports a component stylesheet.

## What is deliberately not published

- **Workshop shell and previews** — `src/workshop/` and its preview mocks and
  preview-state simulators.
- **Server code** — everything under `src/server/`, including the voice
  catalog with provider IDs.
- **Locked reference replicas** — `reference/` folders are the untouched
  production snapshots the Workshop compares against, never the shipped code.
  Every entry publishes `development/` (and `shared/`).
The build fails if a Workshop, preview, or server module is ever reachable
from an entry — see `scripts/finalizeSenPackage.mjs`.

## Known DEV integration dependencies

`@seihouse/sen/reader-chamber` is **not yet fully decoupled from the
Workshop's mock application state.** `ReaderChamber`, `ReaderViewport`, and
`ReaderControls/AudioMenu` import `reader-chamber/shared/stubs`,
`shared/trackLibrary`, and `MOCK_VOICES` directly, so those mocks are bundled
into the published entry today, not excluded from it. They are temporary DEV
runtime dependencies carried over by this restructure, not the real store or
audio catalog a production integration needs. Replacing them with a
host-supplied application store and audio catalog is follow-up work, tracked
separately from this package surface — `scripts/finalizeSenPackage.mjs` does
not check for this boundary the way it checks for Workshop/server leakage.

`@seihouse/sen/story-seed` currently carries the same DEV mock application
store and defaults to the replaceable local Story Seed repository. A host can
provide its repository through `setStorySeedRepository`, while Blueprint and
story generation remain callbacks supplied to `CreationModal`.

`@seihouse/sen/chapter-generation` publishes the Development test flow, which
reads that Story Seed repository and calls the same-origin
`/api/chapter-generation` contract. The package deliberately does not include
the Gemini provider, server handler, Vercel shim, deterministic Workshop
adapters, or preview fixtures. A host that renders the full test flow must
provide the endpoint; consumers can also use the exported packet, pipeline,
batch, Diagnostics, and Reader-handoff surfaces independently.

## Static assets

Only runtime assets used by published components are copied into `dist/`:
the celestial icons, manifestation backdrops, Story Seed auth backdrop, and
Library emblem. Workshop screenshot fixtures are excluded. The current DEV
components address these assets from root paths such as `/icons/...` and
`/story-seed/...`, so an application integrating the package must serve the
matching folders from the package's `dist/` directory at those public paths.

## Building

```bash
npm run build:package
npm run test:package
```

`tsc -p tsconfig.package.json` emits declarations, `vite build --config
vite.package.config.ts` bundles the entries with React, Motion, Lucide,
react-focus-lock, and `@seihouse/audio-player` left external, and the finalize
script copies this manifest into `dist/sen/` and verifies the result.
The same verification confirms that every JavaScript entry reconnects the
extracted `sen.css` stylesheet.
`test:package` then packs that finished directory, installs the tarball into a
fresh local Vite consumer, type-checks the new public contracts, bundles every
JavaScript entry, and verifies that Workshop-only public assets did not enter
the artifact.

## Using it from DEV

DEV consumes the same entries it publishes. `@seihouse/sen/*` is aliased to
`src/package/*` in `tsconfig.json` and `vite.config.ts`, so a Workshop preview
imports exactly what a consuming application will:

```ts
import { LibraryPanel } from '@seihouse/sen/library';
import { ReaderChamber } from '@seihouse/sen/reader-chamber';
import { CreationModal } from '@seihouse/sen/story-seed';
```

Workshop-only code — mocks, preview controls, the locked `reference/`
replicas — keeps importing through relative paths, which is what keeps the
package boundary visible in review.

## History

- **2026-08-21:** Completed the DEV package surface with Closed-Door
  Cultivation, Story Seed, and Chapter Generation entries; moved all three
  Workshop previews onto those entries; bumped the package to `0.2.0`; added
  packed-consumer smoke verification; and restricted packaged public assets
  to the runtime allow-list. Every JavaScript entry now reconnects the
  extracted shared stylesheet so imported components retain their SEN skin.
- **2026-08-21:** Created the package surface: entry barrels for the Library,
  Reader Chamber, Reader Codex, Codex cards, Manifestations, Relics, and
  audio; the package manifest with subpath exports; the package build and its
  boundary verification; and the `@seihouse/sen/*` alias DEV now imports
  through.
