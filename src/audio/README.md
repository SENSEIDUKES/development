# Portable narrative audio

- **Created:** 2026-08-19
- **Last updated:** 2026-09-29
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
| Finished Sound Cue rules (1–5 whole words, at most 10 per chapter) | SEN | `soundCueRules.ts` |
| Sound words (the event a recording answers, with an example) | SEN | `soundWords.ts`, `soundVocabulary` in `media.ts` |
| Studio tags (parent + Tone, Energy, Tension) | SEN | `audioTags.ts` |
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

A placed Sound Cue is 1–5 whole words, never starting or ending inside a word,
and a chapter holds at most ten (`SOUND_CUE_RULES`, `soundCueWordIssue`). These
describe the finished attachment, not what a model writes: manual placement
meets them as a person selects, and `resolveWorldCueIntent` refuses a resolved
range that breaks them (`partial-word`, `too-many-words`) while
`MAX_WORLD_CUE_MOMENTS_PER_CHAPTER` follows the same cap. Intent validation
(`validateWorldCueIntent`) adds no word limit, and saved chapters are never
re-checked. On today's generation path this is short-term safety; the model's
semantic-intent contract on the manuscript's coordinates comes next.
Soundscapes, when their placement is built, are passage-level only and at most
two per chapter.

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

Author-selected manual moments use `origin: 'manual'` on the same resolved
record. They require an approved cue and provenance supplied by the host, but
may anchor text that does not describe an audible action. Generated intent
keeps its existing audible-action validation and resolver behavior. The
Text Highlight Engine supplies the separate adapter that maps an exact
`PassageSelection` to this resolved record; audio contracts remain independent
of that UI component.

## Sound words and Studio tags

A Sound Cue recording names its **sound word** (`metadata.sound`): the event it
answers, in plain lowercase English ("blade drawn"). A catalog declares its
words once (`SoundWord {word, example, meaning?}`), each with a 1–5 word
example of the words a writer wraps for it ("drew his sword") and an optional
one-line meaning. `validateSoundWords` holds a list to its limits
(`SOUND_WORD_LIMITS`: at most 32 words; words of one to three lowercase words;
plain-text examples and meanings). `soundVocabulary(media)` gives a story's
words: the declared words that a playable recording answers, in declared order.
The word names what happened; it is never a file, asset or catalog row.

Every recording is also described by SEIHouse **Studio tags** (`audioTags.ts`):
one parent and at most one value on each shared axis, Tone (bright, neutral,
dark), Energy (low, medium, high) and Tension (calm, suspenseful, urgent),
kept as `metadata.studio_tags`. A Sound Cue's parent is its cue category
(artifacts, atmosphere, beasts, factions, locations, system, weapons). A
Soundscape's parent is one of `SOUNDSCAPE_PARENT_TAGS` (ADVENTURE, AMBIENT,
EMOTIONS, FIGHTING, WAR, SPECIAL); soundscape tracks adopt the tags when
Soundscapes are rebuilt.

The default library tags its 92 Sound Cue recordings with 30 starter words
(`data/library-sounds.v1.json`) and reads Energy from the size a recording's
name states (Small, Medium, Large/Giant/Heavy/Epic). Its Tone and Tension are
left for the Studio remake of the official sets. An equipped Sound Cue Pack
replaces the default words and recordings; see
`src/components/harness-generation/MEDIA_LOADOUT.md`.

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
