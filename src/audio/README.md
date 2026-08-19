# Audio domain

- **Created:** 2026-08-19
- **Replica status:** foundation for the future inline-audio system (Phase 1)

## What lives here

- `DevAudioPlayback.tsx` — the existing single playback boundary. It wraps
  `@seihouse/audio-player`'s `AudioSessionProvider` with a
  `DevAudioPlaybackContext`. This is the only runtime audio element; callers
  keep their existing sources and controls through the hook.
- `libraryCues.ts` + `data/library-cues.v1.json` — the curated SEN library
  cues, with typed lookups (`getByUrl`, `getByCategory`, `getByVariation`,
  `getByTag`, `getByAnyTag`, `getCategories`).
- `index.ts` — the client-safe barrel for the audio surface.

The voice catalog data and provider-aware logic live in
`src/server/audio/voiceCatalog.ts` (see "Server boundary" below).

## Ownership

The voice catalog and the library cues are the canonical sources for
curated SEN audio metadata. Both are static data + typed lookup helpers
in this domain — they are not a parallel audio system, not a playback
engine, and not a persistence layer.

Future consumer wiring (Reader Chamber, Codex, World Card replacement)
will read from this domain, but no such wiring exists in Phase 1.

## Server boundary

Provider IDs (ElevenLabs `voice_id`) and any provider-facing lookups
(e.g. `resolveProviderId(internalKey)`) are server-only. They live in
`src/server/audio/voiceCatalog.ts` and must not be imported by client
or shared code. To reference the provider-neutral voice shape from
shared code, use `import type { PublicVoiceMeta } from
'<relative-path>/server/audio/voiceCatalog'` — the type is erased at
compile time and does not drag the provider data into the client bundle.

This directory holds no provider SDK and no credentials. Any future
synthesis endpoint must live under `api/` and read its key from a
server-side env var (e.g. `ELEVENLABS_API_KEY`) without ever prefixing
it with `VITE_`.

## Category ownership (library cues)

`LIBRARY_CUE_CATEGORIES` is the closed enum applied to the catalog.
Each category belongs to exactly one subsystem:

| Category      | Owner                                                       | Phase 1 consumption |
| ------------- | ----------------------------------------------------------- | ------------------- |
| `beasts`      | Future inline-audio highlights                              | Lookup only         |
| `weapons`     | Future inline-audio highlights                              | Lookup only         |
| `artifacts`   | Future inline-audio highlights                              | Lookup only         |
| `locations`   | Future inline-audio highlights                              | Lookup only         |
| `factions`    | Future inline-audio highlights                              | Lookup only         |
| `atmosphere`  | Scene audio — `StoryCuePayload.atmosphereCategory`, `trackLibrary.ts` | Not consumed here   |
| `system`      | System Panels — `SystemBlock.tsx`                            | Not consumed here   |

The loader preserves every input row in `LibraryCuesLoadResult.rawEntries`
(in order, untrusted) and exposes a uniform lookup surface for all seven
categories. Invalid and unknown-category entries stay in `rawEntries` and
surface in `issues`, but are excluded from `cues`, `byUrl`, `byCategory`,
and `byVariation` so the lookup views only contain validated rows.

Phase 1 introduces no new consumer for the two reserved-by-other-systems
categories. Adding one is a separate, explicit task.

## Data files

- `data/library-cues.v1.json` — the v1 library cue catalog, renamed
  from `SEN/production/Library Cues v1.json`. The file content is
  byte-identical to the previous location; only the filename and path
  changed to remove the space and to keep the version label explicit.
- The voice catalog data file lives at
  `src/server/audio/data/voice-catalog.json` (server-only) and is also
  a pure rename of the prior `SEN/production/voice_catalog.json`.

## Lookup contracts (provider-neutral)

```ts
import {
  loadLibraryCues,
  getByCategory,
  getByTag,
  type LibraryCue,
} from './libraryCues';

const cues = loadLibraryCues();
const beasts = getByCategory(cues, 'beasts');
const fireWeapons = getByTag(cues, 'weapons', 'fire');
```

```ts
// Server side only — never import this from client/shared code.
import type { PublicVoiceMeta } from '../server/audio/voiceCatalog';
```

## Future consumer contract (Phase 2+)

When the Reader / World Card replacement starts consuming audio
metadata, it will receive:

- A `PublicVoiceMeta` (internal key + provider-neutral metadata,
  `ttsAvailable` flag) — never a provider ID.
- A `LibraryCue[]` (already-loaded) filtered by category, variation, or
  tag — ready to hand to the existing playback layer with its
  `public_url`.

This Phase 1 PR establishes the data, types, validation, and lookup
surface. It does not change the Reader, the World Card, chapter
generation, the playback layer, or any persistence path.
