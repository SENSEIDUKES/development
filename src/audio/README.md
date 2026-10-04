# Portable narrative audio

- **Created:** 2026-08-19
- **Last updated:** 2026-10-04
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
| Sound Cue record, Reader playback and split helpers | SEN | `inlineAudio.ts` (`SoundCueAttachment`), `cues.ts` |
| Sound Cues on the page: the glyph on the tagged words and its inline playback | SEN (`@seihouse/sen/inline-audio`) | `InlineAudio.tsx`, `InlineAudio.css` |
| Placing a writer's Sound Cues on the words its sound tags wrap | SEN | `soundCuePlacement.ts` (`placeSoundCues`) |
| Finished Sound Cue rules (1–8 whole words, at most 10 per chapter) | SEN | `soundCueRules.ts` |
| Sound words (the event a recording answers, with an example) | SEN | `soundWords.ts`, `soundVocabulary` in `media.ts` |
| Studio tags (parent + Tone, Energy, Tension) | SEN | `audioTags.ts` |
| Portable soundscape intent and resolved track shape | SEN | `soundscapes.ts` |
| Media URL safety and generic media records | SEN | `mediaUrl.ts`, `media.ts` |
| Host-supplied playback port | SEN contract | `playback.tsx` |
| Celestial Library packs and entitlement policy | Library | `src/library/media/mediaPacks.ts` |
| First-party cue and soundscape records | Host | `src/host/media/libraryCatalog.ts`, `src/host/media/soundscapeCatalog.ts` |
| Concrete browser audio-player adapter | Host (the Workshop and the NovelExpanded app) | `DevAudioPlayback.tsx` |

A Sound Cue's screen-reader status ("Loading beast roar for …") is marked as an
inline decoration (`data-sen-selection-ignore`): screen readers still hear it,
and passage offsets and Read Aloud's sentence light stay true while a cue
loads, plays or fails.
| Provider voice catalog and synthesis | Host/server | `src/server/audio/` |

The historical JSON cue inventory remains under `data/` as a first-party host
record and is deliberately absent from the SEN barrel. The ownership inventory
classifies it as host data. Published SEN has no path to it.

## Portable contract

A writer says **where** and **what**, never which file: it puts a sound tag on
the few words where a sound happens in its own paragraph and names the sound
with one of the story's sound words, with an Energy:
`[[sound: blade drawn | drew his sword | high]]`, read by `readMarks` in
`src/narrative/marks.ts` into a `SoundTag {sound, energy?, start, end}`. It
cannot choose a URL, filename, catalog row, provider, credential, entitlement,
or billing record. (The numbered marks and separate `soundCues` list that came
before are retired: they are still removed from the prose, and place nothing.)

`placeSoundCues({paragraphs, vocabulary, recordings, chapterNumber, locale})`,
each paragraph with its `sounds`, turns those tags into finished cues,
deterministically. A tag is set aside (with a reason `describeSetAsideSoundCue`
puts into words), never forced, when its word is not one of the story's, the
paragraph is a system line or not shown as prose, or the words break the
finished-cue rules: a placed Sound Cue is 1–8 whole words, never starting or
ending inside a word, never overlapping another, and a chapter holds at most
ten, first in reading order (`SOUND_CUE_RULES`, `soundCueWordIssue`). A tag
that starts or ends inside a word widens to the whole word, in the story's
language. The
recording is one of that word's, preferring the Energy asked for, chosen by a
stable rotation so repeated sounds vary and the same input always gives the
same cue. Soundscapes, when rebuilt, are passage-level only and at most two
per chapter.

A finished cue is a manuscript span attachment:

```ts
interface SoundCueAttachment {
  id: string;                    // sound-cue:{paragraph}:{start}-{end}
  kind: 'sound-cue';
  anchor: { level: 'span'; blockId: string; startOffset: number; endOffset: number; selectedText: string };
  payload: {
    origin: 'harness' | 'manual';
    sound: string;               // the sound word
    energy?: 'low' | 'medium' | 'high';
    cue: { publicUrl: string; provenance: MediaResourceProvenance; category: AudioCueCategory; tags?: AudioTags };
  };
}
```

Only that record travels with the chapter. The Reader plays it only when its
recording is public HTTPS with provenance (`resolvePlayableSoundCue`, in any
language) and marks exactly the words its offsets cover (`splitBySoundCues`);
a cue whose words no longer match is left as plain prose. Translated text shows
no cues, because offsets do not survive translation.

Playback is also explicit. Reader surfaces consume the `NarrativePlaybackPort`
provided by their host. A package consumer may supply any player or omit audio
entirely; SEN does not install the SEIHouse audio player.

A cue an author places by hand is the same record with `origin: 'manual'`
(`createManualSoundCue` in the Text Highlight Engine): the recording must be
one the host's catalog approves and must name a sound word, and the selection
meets the same finished-cue rules. Audio contracts remain independent of that
UI component.

## Sound words and Studio tags

A Sound Cue recording names its **sound word** (`metadata.sound`): the event it
answers, in plain lowercase English ("blade drawn"). A catalog declares its
words once (`SoundWord {word, example, meaning?}`), each with a 1–5 word
example of the words a writer tags for it ("drew his sword") and an optional
one-line meaning. The writer sees each as one line, `blade drawn: drew his
sword`, after one example tag made from the first word. `validateSoundWords` holds a list to its limits
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

The Reader consumes the chapter's already-placed records. Later catalog,
unlock, expiry, or equipment changes cannot rewrite accepted story state.

Character speech is separate from chapter Sound Cues. Reader Codex asks a
host-owned voice port to synthesize an eligible character's canonical signature
quote. Provider IDs and secrets never enter SEN contracts or browser payloads.

## Workshop boundary

`DevAudioPlayback.tsx`, local fixture catalogs, and preview controls exist only
to exercise these ports in Development. They must not be imported by a package
entry or used as a published default. The source-wide ownership validator
enforces that restriction.
