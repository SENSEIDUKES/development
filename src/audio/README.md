# Audio domain

- **Created:** 2026-08-19
- **Last updated:** 2026-08-19
- **Replica status:** Phase 2 inline-audio contract and Workshop playback active

## What lives here

- `DevAudioPlayback.tsx` — the existing single playback boundary. It wraps
  `@seihouse/audio-player`'s `AudioSessionProvider` with a
  `DevAudioPlaybackContext`. This is the only runtime audio element; callers
  keep their existing sources and controls through the hook.
- `libraryCues.ts` + `data/library-cues.v1.json` — the curated SEN library
  cues, with typed lookups (`getByUrl`, `getByCategory`, `getByVariation`,
  `getByTag`, `getByAnyTag`, `getCategories`).
- `inlineAudio.ts` — the client-safe `sound` / `voice` action contract,
  literal-prose annotation shape, and catalog-gated sound resolver.
- `index.ts` — the client-safe barrel for the audio surface.

The voice catalog data and provider-aware logic live in
`src/server/audio/voiceCatalog.ts` (see "Server boundary" below).

## Ownership

The voice catalog and the library cues are the canonical sources for
curated SEN audio metadata. Both are static data + typed lookup helpers
in this domain — they are not a parallel audio system, not a playback
engine, and not a persistence layer.

The Development Reader Chamber consumes this domain for controlled inline
World Cue examples. It does not write actions into chapter data; the retired
standalone world presentation and its parallel audio adapter have been removed.

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

| Category      | Owner                                                       | Current consumption |
| ------------- | ----------------------------------------------------------- | ------------------- |
| `beasts`      | Inline-audio highlights                                     | Phase 2 Workshop    |
| `weapons`     | Inline-audio highlights                                     | Phase 2 Workshop    |
| `artifacts`   | Inline-audio highlights                                     | Phase 2 Workshop    |
| `locations`   | Inline-audio highlights                                     | Phase 2 Workshop    |
| `factions`    | Inline-audio highlights                                     | Phase 2 Workshop    |
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

## Inline World Cue contract (Phase 2)

Inline annotations remain separate from `StoryBlock` and use one of two exact
actions:

```ts
type InlineAudioAction =
  | { type: 'sound'; cueUrl: string }
  | { type: 'voice'; voiceKey: string; quoteText: string };
```

`sound` URLs must resolve through `library-cues.v1.json`; arbitrary URLs and
the separately owned `atmosphere` / `system` categories are rejected. Playback
uses `DevAudioPlaybackProvider`, which delegates to the existing
`@seihouse/audio-player` session. Its `replace` operation replaces the shared
queue with one Cue, so rapid actions cannot create overlapping media elements.

`voiceKey` is the provider-neutral `PublicVoiceMeta.internalKey`. No provider
ID is allowed in this client shape. Phase 2 has no synthesis endpoint, no
ElevenLabs call, and no browser `speechSynthesis` fallback; activating a voice
action reports an explicit unavailable state.

The Reader primitive is a native inline `<button>` containing the custom
`LibrarySoundGlyph` and only calls playback from its activation handler.
Rendering, scrolling, intersection, and viewport entry never load or play a
Cue. The glyph is neutral at rest, gains a soft Library aura while playing,
exposes idle, loading, playing, and error states, and stops only its own active
Cue during cleanup. Because the glyph is a separate accessible tap target, the
adjacent phrase can keep its native prose styling or its independent Codex
action.

Chapter generation, persistence, and production cue payload integration remain
outside Phase 2 and are deferred to Phase 3.
