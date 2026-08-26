# `@seihouse/sen`

**SEIHouse Expanded Novels — an embeddable expanded-narrative engine.**

SEN is not a Library feature. It is the portable engine, in the same sense as
the faceless SEIHouse audio player: another author or company installs SEN
inside their own application and supplies their own writing, branding,
storage, authentication, and generation method. SEN supplies the reusable
narrative systems — expanded reading behavior, structured chapter contracts,
scoring, Color Codes, Codex behavior, cards, and the surfaces built on them.

AI chapter generation is an **optional** SEN content source, not a
requirement. A host can feed SEN hand-written chapters, imported chapters, or
its own generator and still get the full expanded reading experience.

SEIHouse's own application — cultivation and Qi progression, the relic
economy, hub behavior, services, and branding — ships separately as
[`@seihouse/library`](../library/README.md). **Library may depend on SEN. SEN
never depends on Library**, and `npm run check:package-boundaries` fails the
build if that reverses.

`src/package/sen/` holds only entry barrels — the components themselves stay
in `src/components/<feature>/`, so the Workshop and the package always render
the exact same code.

## Entries

| Import | Surface |
| --- | --- |
| `@seihouse/sen` | The SEN surface primitives (re-exported from `./ui`) plus `SEN_PACKAGE_VERSION` |
| `@seihouse/sen/ui` | The portable surface primitives: panels, cards, buttons, the primary creation action, inputs, navigation, particles, glyphs |
| `@seihouse/sen/color-codes` | **The single Color Code authority**: the registry, the accessibility palettes, and every semantic resolver |
| `@seihouse/sen/cards` | **The complete shared card system**: the composable primitive, Codex/entity cards, and every System Prompt family (`SystemBlock`, `WorldNotice`, `FateResultCard`) with its presentation contracts and routes |
| `@seihouse/sen/reader-chamber` | The Reader Chamber shell, viewport, header, controls, settings, fate surfaces, reading model |
| `@seihouse/sen/reader-codex` | The Reader Codex shell, sheet overlay, bestiary, section views, Codex context, Codex hooks |
| `@seihouse/sen/manifestations` | The Manifestation chamber, zones, loading system and veils, journey scrubber, omen scenes, manifestation model |
| `@seihouse/sen/audio` | The client-safe audio surface: world cues and the inline audio model |
| `@seihouse/sen/story-seed` | The Story Seed creation workspace, Story Bank, Blueprint review, import/help surfaces, and canonical portable contracts |
| `@seihouse/sen/chapter-generation` | The live generation flow, Diagnostics, Reader handoffs, batch state, packet adapter, and four-stage pipeline contracts |
| `@seihouse/sen/styles.css` | The bundled stylesheet, for consumers that prefer to load CSS explicitly |

Each entry that needs styling imports its own CSS as a side effect, so a
consumer never hand-imports a component stylesheet.

### Compatibility aliases (one version only)

| Import | Replacement |
| --- | --- |
| `@seihouse/sen/library` | `@seihouse/sen/ui` — the primitives are SEN's own surface kit, not the Library application |
| `@seihouse/sen/codex-cards` | `@seihouse/sen/cards` — the Codex cards are the narrative cards of the one shared card system |

### Color Codes and cards are published once

There is exactly one Color Code registry, and every surface resolves through
it: cards, inline Codex links, relation maps, badges, and Reader system
prompts. `@seihouse/sen/reader-chamber` deliberately no longer re-exports the
registry — a second export path is how two surfaces start disagreeing about
what an enemy, a legendary item, or a special location looks like.

The same holds for cards. `@seihouse/sen/cards` publishes the card primitive,
Codex/entity cards, and every System Prompt family together. It also publishes
the System Prompt presentation routes, guards, and payload contracts that
those cards require, so chapter generation can connect through one public
contract instead of reaching into component paths. `@seihouse/sen/reader-chamber`
keeps its existing System Prompt exports for compatibility.

## What is deliberately not published

- **Library surfaces** — cultivation, Qi progression, and the relic economy
  live in `@seihouse/library`.
- **Workshop shell and previews** — `src/workshop/` and its preview mocks and
  preview-state simulators.
- **Server code** — everything under `src/server/`, including the voice
  catalog with provider IDs.
- **Locked reference replicas** — `reference/` folders are the untouched
  production snapshots the Workshop compares against, never the shipped code.
  Every entry publishes `development/` (and `shared/`).

Two checks enforce this. `npm run check:package-boundaries` walks the real
import graph from every published entry and fails on the file that introduces
a violation; the finalize step then greps the built output as a backstop.

## Known DEV integration dependencies

`@seihouse/sen/reader-chamber`, `@seihouse/sen/reader-codex`, and
`@seihouse/sen/story-seed` are **not yet fully decoupled from DEV's mock
application state.** `ReaderChamber`, `ReaderViewport`,
`ReaderControls/AudioMenu`, the Codex compatibility layer, and the Story Seed
creation surfaces import `reader-chamber/shared/stubs`,
`shared/trackLibrary`, `MOCK_VOICES`, `reader-codex/shared/appStore`, and
`reader-codex/shared/vibration` directly, so those mocks are bundled into the
published entries today. They are temporary DEV runtime dependencies, not the
real store, audio catalog, or haptics a host integration needs.

That set is now recorded and frozen: `MOCK_APPLICATION_WAIVERS` in
`scripts/checkPackageBoundaries.mjs` lists every published module allowed to
reach a mock, and the check fails both when a **new** importer appears and
when a listed one becomes unnecessary. The ledger can only shrink. Replacing
these with a host-supplied application runtime is the follow-up that finishes
SEN's embeddability.

`@seihouse/sen/story-seed` also defaults to the replaceable local Story Seed
repository. A host can provide its repository through
`setStorySeedRepository`, while Blueprint and story generation remain
callbacks supplied to `CreationModal`.

`@seihouse/sen/chapter-generation` publishes the Development test flow, which
reads that Story Seed repository and calls the same-origin
`/api/chapter-generation` contract. The package deliberately does not include
the Gemini provider, server handler, Vercel shim, deterministic Workshop
adapters, or preview fixtures. A host that renders the full test flow must
provide the endpoint; consumers can also use the exported packet, pipeline,
batch, Diagnostics, and Reader-handoff surfaces independently — chapter
generation is one optional content source for SEN, never a requirement.

## Static assets

Only runtime assets used by published components are copied into `dist/`:
the celestial icons, manifestation backdrops, Story Seed auth backdrop, and
the emblem. Workshop screenshot fixtures are excluded. The current DEV
components address these assets from root paths such as `/icons/...` and
`/story-seed/...`, so an application integrating the package must serve the
matching folders from the package's `dist/` directory at those public paths.

## Building

```bash
npm run build:package            # both packages
npm run build:package:sen        # this one
npm run test:package             # boundary check, both builds, both packed-consumer smokes
npm run check:package-boundaries # the source-graph boundary check on its own
```

`tsc -p tsconfig.package.json` emits declarations, `vite build --config
vite.package.config.ts` bundles the entries with React, Motion, Lucide,
react-focus-lock, and `@seihouse/audio-player` left external, and
`scripts/finalizePackage.mjs sen` copies this manifest into `dist/sen/` and
verifies the result — including that every **styled** JavaScript entry
reconnects the extracted `sen.css` stylesheet. `./audio` is the one entry
deliberately exempt: it carries no styling, so it is listed in that target's
`unstyledEntries` and must *not* import the stylesheet.

`scripts/smokePackage.mjs sen` then packs that finished directory, installs
the tarball into a fresh local Vite consumer, type-checks the public
contracts, bundles every JavaScript entry, and verifies that Workshop-only
public assets did not enter the artifact.

Both packages share one build: `vite.package.shared.ts` reads the entry list
straight from each package manifest, and `scripts/packageTargets.mjs` holds
the descriptors the build, boundary, finalize, and smoke steps all read.

## Using it from DEV

DEV consumes the same entries it publishes. `@seihouse/sen/*` is aliased to
`src/package/sen/*` in `tsconfig.json` and `vite.config.ts`, so a Workshop
preview imports exactly what a consuming application will:

```ts
import { LibraryPanel } from '@seihouse/sen/ui';
import { COLOR_CODES } from '@seihouse/sen/color-codes';
import {
  CodexCard,
  FateResultCard,
  SystemBlock,
  WorldNotice,
  resolveSystemPromptRoute,
} from '@seihouse/sen/cards';
import { ReaderChamber } from '@seihouse/sen/reader-chamber';
import { CreationModal } from '@seihouse/sen/story-seed';
```

Workshop-only code keeps importing through relative paths where there is no
published entry to import from — the mock application state, preview controls,
preview fixtures, and the locked `reference/` replicas — which is what keeps
the package boundary visible in review. Where a surface *is* published,
Workshop code imports the public entry like any other consumer: the Card
Workshop takes its Codex and System Prompt cards from `@seihouse/sen/cards`,
and the Story Seed previews take their schema and repository types from
`@seihouse/sen/story-seed`.

## History

- **2026-08-25:** Split SEN and Library into separate packages. The Library
  package is `@seihouse/library` (lowercase, per npm's package-name rule). SEN is now
  documented as the portable engine rather than a Library feature; the entries
  moved to `src/package/sen/`; Closed-Door Cultivation and the relic surfaces
  left for `@seihouse/library`; `./library` became `./ui` and `./codex-cards`
  became `./cards` (both aliased for one version); `./color-codes` publishes
  the single Color Code authority and `./cards` the shared card system, ready
  for chapter generation to be connected through them; the Development loading
  veil stopped importing its props contract from a locked `reference/`
  replica; and `scripts/checkPackageBoundaries.mjs` began enforcing the whole
  boundary — Library, Workshop, preview, mock, reference, test, and server —
  from source. Bumped to `0.3.0`.
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
