# Portable narrative audio

- **Created:** 2026-08-19
- **Last updated:** 2026-09-19
- **Ownership status:** SEN contracts separated from Library catalogs and host playback

## Ownership

`@seihouse/sen/audio` owns source-agnostic narrative media intent and resolution
contracts. It describes what a story asks to play and the accepted resolved
record that may be persisted with a chapter. It does not own a first-party
catalog, entitlement, CDN location, provider credential, account, playback
engine, or business rule.

The current split is:

| Capability | Owner | Source |
| --- | --- | --- |
| Cue intent, validation, exact prose placement, resolved cue shape | SEN | `cues.ts`, `inlineAudio.ts` |
| Portable soundscape intent and resolved track shape | SEN | `soundscapes.ts` |
| Media URL safety and generic media records | SEN | `mediaUrl.ts`, `media.ts` |
| Host-supplied playback port | SEN contract | `playback.tsx` |
| Celestial Library packs and entitlement policy | Library | `src/library/media/mediaPacks.ts` |
| First-party cue and soundscape records | Host | `src/host/media/libraryCatalog.ts`, `src/host/media/soundscapeCatalog.ts` |
| Concrete browser audio-player adapter | Host/Workshop | `DevAudioPlayback.tsx` |
| Provider voice catalog and synthesis | Host/server | `src/server/audio/` |

The historical JSON cue inventory remains under `data/` as a first-party host
record and is deliberately absent from the SEN barrel. The ownership inventory
classifies it as host data. Published SEN has no path to it.

## Portable contract

Generation may propose semantic intent only. It cannot choose a URL, filename,
catalog row, provider, credential, entitlement, or billing record. A host
resolver validates the exact action phrase against the accepted story block and
returns an immutable resolved record. Only that accepted record may travel with
the chapter.

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

Playback is also explicit. Reader surfaces consume the `NarrativePlaybackPort`
provided by their host. A package consumer may supply any player or omit audio
entirely; SEN does not install the SEIHouse audio player.

## Library and host boundary

Library registers first-party catalog candidates and determines whether a user
may equip a Media Pack. The host/backend remains authoritative for catalog
records, public asset locations, account entitlement truth, and provider
access. HARNESS receives a frozen, semantic media snapshot only; provider model
requests receive no catalog URLs or entitlement payloads.

The Reader consumes the chapter's already-resolved records. Later catalog,
unlock, expiry, or equipment changes cannot rewrite accepted story state.

Character speech is separate from chapter cue intent. Reader Codex asks a
host-owned voice port to synthesize an eligible character's canonical signature
quote. Provider IDs and secrets never enter SEN contracts or browser payloads.

## Workshop boundary

`DevAudioPlayback.tsx`, local fixture catalogs, and preview controls exist only
to exercise these ports in Development. They must not be imported by a package
entry or used as a published default. The source-wide ownership validator
enforces that restriction.
