# Portable narrative audio

- **Created:** 2026-08-19
- **Last updated:** 2026-10-27
- **Ownership status:** SEN contracts separated from Library catalogs and host playback

## Ownership

`@seihouse/sen/audio` owns source-agnostic narrative media intent and resolution
contracts. It describes what a story asks to play and the accepted resolved
record that may be persisted with a chapter. It does not own a first-party
catalog, entitlement, CDN location, provider credential, account, playback
engine, or business rule.

**2026-10-27:** The space a sound tag writes before its closing part is the tag's, not the sentence's: `[[sound: growl | growled | medium]].` reads back as `growled.`, not `growled .` (`readMarks`). Left in, it only showed where a tag closed on punctuation — the shape the tagger is never shown — and made the chapter no longer the prose it was tagged from, so the first tagged chapter lost every tag it had been given. Numbered marks and the words inside a speaker tag are read the same way.

**2026-10-11:** Recordings can live in a package installed on the device: `spp://<package id>/<version>/assets/…` (`packageMediaUrl`) is playable wherever a public HTTPS file is (`isPlayableMediaUrl`), and saved chapters keep it. The host keeps the package's bytes and gives its reader mixer the device's address for each file (`src/host/media/deviceMediaPacks.ts`).

**2026-10-11:** A story's sound words are its own, apart from its recordings (at most 30; see Sound words). The writer sees the words alone. The Library's "beast growl", "creature screech" and "blade drawn" are now "growl", "screech" and "unsheathe"; their recordings answer the new words with the same files and URLs.

**2026-10-09:** The view uses `InlineAudioView.tsx` so it cannot resolve to the contract `inlineAudio.ts` or emit the same declaration filename on Windows. Public `@seihouse/sen/inline-audio` exports and behavior are unchanged.

The current split is:

| Capability | Owner | Source |
| --- | --- | --- |
| Sound Cue record, Reader playback and split helpers | SEN | `inlineAudio.ts` (`SoundCueAttachment`), `cues.ts` |
| Sound Cues on the page: the glyph on the tagged words and its inline playback | SEN (`@seihouse/sen/inline-audio`) | `InlineAudioView.tsx`, `InlineAudio.css` |
| Placing a writer's Sound Cues on the words its sound tags wrap | SEN | `soundCuePlacement.ts` (`placeSoundCues`) |
| Finished Sound Cue rules (1–8 whole words, at most 10 per chapter) | SEN | `soundCueRules.ts` |
| Sound words (the event a recording answers, with an example) | SEN | `soundWords.ts`, `soundVocabulary` in `media.ts` |
| Studio tags (parent + Tone, Energy, Tension) | SEN | `audioTags.ts` |
| Portable soundscape intent and resolved track shape (a piece may carry its name and measured loudness) | SEN | `soundscapes.ts` |
| The words a chapter's soundtrack is chosen with (music and atmosphere categories) and how the HARNESS chooses recordings from a category and its SEN audio tags | SEN | `soundtrackVocabulary.ts`, `SceneAtmosphere` in `media.ts` |
| Media URL safety and generic media records | SEN | `mediaUrl.ts`, `media.ts` |
| Host-supplied playback port | SEN contract | `playback.tsx` |
| Celestial Library packs and entitlement policy | Library | `src/library/media/mediaPacks.ts` |
| First-party cue and soundscape records: SEN Soundscapes, Volume 1 (43 pieces with measured loudness), the soundscapes every chapter is written with | Host | `src/host/media/libraryCatalog.ts`, `src/host/media/soundscapeCatalog.ts`, `src/host/media/data/sen-soundscapes-v1.json` |
| The reader mixer a host creates: SEN Atmospheres, Volume 1 (50 beds with measured loudness) and the reader's saved mix | Host (the NovelExpanded app and the Workshop) | `src/host/reader/readerMixer.ts`, `src/host/media/atmosphereCatalog.ts`, `src/host/media/data/sen-atmospheres-v1.json` |
| Single-channel browser player for the older Workshop previews | Host (the Workshop only) | `DevAudioPlayback.tsx` |

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
same cue. Soundscapes are chapter-level: the writer chooses one music mood
and one atmosphere at the chapter's start (the soundtrack tag), and the Reader
plays pieces of that mood, one after another, under the whole chapter.

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

Playback is also explicit, and the host supplies it. The SEIHouse audio
player is SEIHouse ecosystem infrastructure that SEN uses directly (a peer of
`@seihouse/sen`): a host that gives the Reader a reader mixer
(`ReaderMixerProvider`) gets the full soundtrack, with Sound Cues played over
the atmosphere and music (`MixerCueControl`: cues may overlap, each at the
reader's Sound Cues level times its Energy, `SOUND_CUE_ENERGY_VOLUME`). A host
that supplies only a single-channel `NarrativeAudioProvider` keeps that route,
one cue at a time. `InlineAudio` needs one or the other.

A cue an author places by hand is the same record with `origin: 'manual'`
(`createManualSoundCue` in the Highlight Engine): the recording must be
one the host's catalog approves and must name a sound word, and the selection
meets the same finished-cue rules. Audio contracts remain independent of that
UI component.

## Sound words and Studio tags

A Sound Cue recording names its **sound word** (`metadata.sound`): the event it
answers, in plain lowercase English ("unsheathe"). A catalog declares the words
its recordings answer (`SoundWord {word, example?, meaning?}`); an example and a
meaning are for the people who curate it and never reach the writer.
`validateSoundWords` holds a catalog's list to its limits (`SOUND_WORD_LIMITS`:
at most 30 words of one to three lowercase words; plain-text examples and
meanings).

A **story keeps its own sound words** (`HarnessStory.soundWords`), apart from
its recordings: a list of at most 30 (`validateSoundWordList`), started from a
`SoundWordsPreset` and edited in Story Settings. Changing the story's Sound Cue
pack never changes them; an empty list plays no Sound Cues; a story from before
the list existed keeps its recordings' words until it is edited. Each attempt
freezes them, the word alone (`withStorySoundWords`), and
`soundVocabulary(media)` gives the writer those a playable recording answers
(`answeredSoundWords`), in the story's order, one per line with nothing else.
A word no recording answers stays the story's, and a tag naming it is set aside.
The word names what happened; it is never a file, asset or catalog row.

The host installs presets from **Sound Words `.spp` packages**
(`src/host/media/soundWordPacks.ts`): a data-only package whose
`seihouse.sound-words` manifest extension names a JSON list of words
(`{ "vocabulary": "assets/words.json" }`). The existing SPP intake checks the
container first; a package that is also a CAPA skill, or a version installed
again with different words, is refused. The Library's own preset is its 30
words. To make a package from a folder with a `words.txt`, see
[`templates/spp/`](../../templates/spp/README.md).

Every recording is also described by SEIHouse **Studio tags** (`audioTags.ts`):
one parent and at most one value on each shared axis, Tone (bright, neutral,
dark), Energy (low, medium, high) and Tension (calm, suspenseful, urgent),
kept as `metadata.studio_tags`. A Sound Cue's parent is its cue category
(artifacts, atmosphere, beasts, factions, locations, system, weapons). A
Soundscape's parent is one of `SOUNDSCAPE_PARENT_TAGS` (ADVENTURE, AMBIENT,
EMOTIONS, FIGHTING, WAR, SPECIAL); SEN Soundscapes, Volume 1 groups its pieces
by the first five, and its pieces adopt the full tags when the pack is graded
with them.

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
