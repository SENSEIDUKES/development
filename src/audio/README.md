# Audio domain

- **Created:** 2026-08-19
- **Last updated:** 2026-08-20
- **Replica status:** Worldcue Phase 3 active; Character voice belongs solely to the Reader Codex signature quote

## What lives here

- `DevAudioPlayback.tsx` — the existing single playback boundary. It wraps
  `@seihouse/audio-player`'s `AudioSessionProvider` with a
  `DevAudioPlaybackContext`. This is the only runtime audio element; callers
  keep their existing sources and controls through the hook.
- `libraryCues.ts` + `data/library-cues.v1.json` — the curated SEN library
  cues, with typed lookups (`getByUrl`, `getByCategory`, `getByVariation`,
  `getByTag`, `getByAnyTag`, `getCategories`).
- `inlineAudio.ts` — the model-safe audible-event intent, validated resolved
  annotation contract, exact-placement utilities, and deterministic
  catalog-backed Worldcue resolver. It carries no voice path: chapter prose is
  never annotated with Character speech.
- `index.ts` — the client-safe barrel for the audio surface.

The voice catalog data and provider-aware logic live in
`src/server/audio/voiceCatalog.ts` (see "Server boundary" below).
`src/server/audio/codexVoiceQuote.ts` is the server-only ElevenLabs adapter
for one Character signature quote, and
`src/server/audio/codexVoiceQuoteHttp.ts` is its dedicated endpoint
(`POST /api/codex-voice-quote`). Nothing is stored: each tap calls
ElevenLabs again and the response carries the audio bytes for immediate
playback.

## Ownership

The voice catalog and the library cues are the canonical sources for
curated SEN audio metadata. Both are static data + typed lookup helpers
in this domain — they are not a parallel audio system, not a playback
engine, and not a persistence layer.

Chapter Generation resolves valid audible-event intents into chapter-owned
annotations. The Development Reader Chamber consumes those persisted
annotations in both generated sessions and controlled Workshop examples. The
retired standalone world presentation and its parallel audio adapter remain
removed.

## Server boundary

Provider IDs (ElevenLabs `voice_id`) and any provider-facing lookups
(e.g. `resolveProviderId(voiceKey)`) are server-only. They live in
`src/server/audio/voiceCatalog.ts` and must not be imported by client
or shared code. To reference the provider-neutral voice shape from
shared code, use `import type { PublicVoiceMeta } from
'<relative-path>/server/audio/voiceCatalog'` — the type is erased at
compile time and does not drag the provider data into the client bundle.

The only server code that calls ElevenLabs' text-to-speech endpoint is
`codexVoiceQuote.ts`, reached exclusively through `POST /api/codex-voice-quote`
when a reader taps a Character's signature quote. It reads `ELEVENLABS_API_KEY`
only from server environment values; a missing key disables the control
instead of half-working. Every call synthesizes the exact stored quote fresh
— nothing is cached, hashed into an object key, or persisted anywhere.
Neither the provider voice ID nor the credential enters any Reader or Codex
payload. Chapter generation has no reference to this module at all.

## Category ownership (library cues)

`LIBRARY_CUE_CATEGORIES` is the closed enum applied to the catalog.
Each category belongs to exactly one subsystem:

| Category      | Owner                                                       | Current consumption |
| ------------- | ----------------------------------------------------------- | ------------------- |
| `beasts`      | Inline audible-event annotations                            | Phase 3 Reader      |
| `weapons`     | Inline audible-event annotations                            | Phase 3 Reader      |
| `artifacts`   | Inline audible-event annotations                            | Phase 3 Reader      |
| `locations`   | Inline audible-event annotations                            | Phase 3 Reader      |
| `factions`    | Inline audible-event annotations                            | Phase 3 Reader      |
| `atmosphere`  | Scene audio — `StoryCuePayload.atmosphereCategory`, `trackLibrary.ts` | Not consumed here   |
| `system`      | System Panels — `SystemBlock.tsx`                            | Not consumed here   |

The loader preserves every input row in `LibraryCuesLoadResult.rawEntries`
(in order, untrusted) and exposes a uniform lookup surface for all seven
categories. Invalid and unknown-category entries stay in `rawEntries` and
surface in `issues`, but are excluded from `cues`, `byUrl`, `byCategory`,
and `byVariation` so the lookup views only contain validated rows.

Worldcues never consume the two reserved-by-other-systems categories.
Atmosphere loops and System Panel sounds retain their existing owners.

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

## Inline Worldcue contract (Phase 3)

The model can propose only an audible narrative intent. It cannot choose a
catalog row or playback source:

```ts
interface WorldCueIntent {
  blockId: string;
  triggerPhrase: string;
  occurrenceIndex?: number;
  sourceCategory: 'beasts' | 'weapons' | 'artifacts' | 'locations' | 'factions';
  variation: string;
  semanticTags: string[];
  relatedEntity?: { name: string; type: StoryEntityType };
}
```

Application logic validates the exact action phrase against its final block,
normalizes the zero-based occurrence, rejects noun-only entity mentions and
overlaps, and deterministically chooses an approved Library Cue by category,
variation, semantic-tag overlap, confidence, and a stable tie-break. Only a
successful resolution becomes `ChapterContent.audioMoments`; that resolved
shape adds an application-owned ID and a minimal `{ publicUrl }` playback
source. URLs, filenames, asset IDs, catalog entries, provider identifiers, and
voice keys are not accepted from model output.

Character speech is a separate system that chapter generation never touches.
Generated dialogue triggers no synthesis, creates no prose annotation, and
produces no stored Codex voice clip. The only entry point is a deliberate
reader tap on the `signatureQuote` of a named, intelligent Character Portrait
card in Reader Codex.

On every tap the dedicated server endpoint resolves the canonical Character,
assigns and persists a stable provider-neutral `voiceKey` when the Character
has none, requires explicit intelligence metadata for a non-human Character,
and refuses Bestiary species and unnamed entities. It then calls ElevenLabs
for that exact stored quote and returns the synthesized audio bytes directly
for immediate playback. Nothing is stored or reused between taps: each tap
calls ElevenLabs again. The browser sends a Character identity and nothing
else: it cannot choose text, a provider voice, or a model, and no provider
credential exists outside the server.

Worldcue playback uses `DevAudioPlaybackProvider`, which delegates to the
existing `@seihouse/audio-player` session. Its `replace` operation replaces the
shared queue with one cue, so rapid actions cannot create overlapping media
elements. Each playback track is scoped to the annotation ID even when two
moments resolve to the same catalog clip.

The Reader primitive is a native inline `<button>` containing the custom
`LibrarySoundGlyph`. Activation is the only path that starts or replaces a Cue;
cleanup stops only the control's own active Cue. Its visible mark is a
circle-free, `0.76em` typographic annotation while an invisible pseudo-element
expands the pointer target without changing line height. The final word, mark,
and immediately adjacent punctuation are joined so the mark cannot begin a
line by itself while longer entity names remain free to wrap. Rendering,
scrolling, intersection, and viewport entry never load or play a Cue. The glyph
is neutral at rest, gains a soft Library aura while playing, and exposes idle,
loading, playing, and error states. Because the glyph is a separate accessible
tap target, the adjacent phrase can keep its native prose styling or its
independent Codex action.

Resolved annotations survive the accepted Manifest/Process/Repair result, the
five-chapter batch, and the Reader adapter. They are scoped to an application-
owned block ID and occurrence, so one event cannot propagate to other mentions,
chapters, legacy prose, or translations. Block-local model proposals are removed
from the accepted output after resolution; only successful resolved Worldcue
annotations persist. Character voice audio is never persisted anywhere and
never touches chapter prose.
