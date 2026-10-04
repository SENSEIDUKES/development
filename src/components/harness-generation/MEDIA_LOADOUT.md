# Media Loadout and runtime catalog boundary

Media Packs are runtime catalog resources, not CAPA Skills. The canonical
HARNESS vocabulary remains defined in
[ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md).

## Ownership

The implementation keeps five independent owners:

1. CAPA Loadout stores writing-skill references and assembles the CAPA Prompt.
2. The Generated Chapter carries semantic `soundscapes` and `soundCues` signals only, each anchored to exact prose; HARNESS places them on its own SEN blocks.
3. The host registers validated `SoundscapePack` and `SoundCuePack` data in a
   Media Pack inventory that is never merged with the skill inventory.
4. The host account/reward system supplies current user entitlements, including
   optional expiration; HARNESS never grants or persists them.
5. Each `HarnessStory.mediaLoadout` independently equips an optional Soundscape
   Pack and optional Sound Cue Pack.

The host-owned pack inventory and current entitlement snapshot enter
`HarnessGenerationController` separately from `installedSkills`. A host reward
grant makes a registered pack available and does not equip it. Equipment
requires the exact registered and currently active pack ID/version, enforces
the slot's pack type, and is checked again—including expiration—when the
attempt snapshot is frozen. No account identity, reward grant, or entitlement
ledger is stored in the HARNESS workspace.

## Pack validation

`src/library/media/mediaPacks.ts` applies Library catalog and entitlement
policy over SEN's portable `SceneAudioTrack` and cue contracts. Packs require a stable ID and semantic version, one
declared pack type, display metadata, an explicitly selected relative JSON
source path, its lowercase SHA-256 digest, and validated entries with public
HTTPS audio URLs.

A Sound Cue Pack also declares its **sound words**:
`sounds: [{ word, example, meaning? }]`, the events its recordings answer, each
with a 1–5 word example of what a writer tags ("drew his sword") and an
optional one-line meaning (SEN `validateSoundWords`). Every recording names one
declared word in `metadata.sound`, and every declared word has at least one
recording. A recording's cue category (artifacts, atmosphere, beasts, factions,
locations, system, weapons) is its Studio parent tag; `metadata.studio_tags`
may add at most one Tone, Energy and Tension (SEN `audioTags.ts`). Until
placement is word-based, packs hold only the categories a Sound Cue can be
placed from (beasts, weapons, artifacts, locations, factions). Soundscape Packs
take no sound words.

Validation rejects malformed or mixed entries, duplicate catalog identities,
non-audio and non-JSON files, signed or credential-bearing URLs, credentials,
provider secrets, executable/script/instruction fields, undeclared or unused
sound words, unknown Studio tags, and conflicts with built-in catalog
identities. It names the entry and the problem. The base
The first-party soundscape and cue catalogs live under `src/host/media/` and
remain host records; they are not part of SEN or repackaged as portable data.

The optional SPP host adapter in
`src/workshop/previews/harness-generation/sppMediaPacks.ts` accepts only an
explicitly selected JSON asset from validated `intakePack` content. No filename
is special. The selected manifest record supplies the source path and digest.
Its `seihouse.harness.media-packs.v1` storage key is separate from the v3 SPP
skill inventory.

## Freeze, resolution, persistence, and playback

Every attempt freezes the exact authorized Media Loadout with its validated
catalog entries and pack ID, version, type, source path, and digest, before
its CAPA Prompt is assembled. This snapshot lives on
`HarnessGenerationAttempt.mediaLoadout`. Explicit model retry reuses the
original snapshot, and deterministic replay reads the committed chapter.

An equipped **Sound Cue Pack is the story's whole Sound Cue set**: its words
and recordings replace the default library's (base recordings that answer no
sound word stay). A Soundscape Pack still adds to the base soundscapes, which
new chapters do not use until Soundscapes are rebuilt. The frozen snapshot
carries the attempt's sound words (`FrozenNarrativeMedia.sounds`), and
`describeSoundVocabulary(storyId)` shows them for inspection; the Media
Loadout panel lists them.

**Only the sound words reach the writer.** They fill the managed CAPA Sound
Cues slot as its list, one line per word with its example and meaning, after
one example tag made from the first word (`CapaPrompt.soundVocabulary`,
counted against the CAPA budget, which a pack at its largest word list fits).
The writer names one of them in each sound tag; the reply carries no list.
Recordings, URLs, filenames,
catalog rows, packs and entitlements never enter `HarnessGenerationRequest`,
the Story Information Packet or the provider prompt. The model never supplies
or selects a pack, URL, filename, catalog row, or R2 object.

After acceptance has read the tags out of the paragraphs, `placeSoundCues`
(`src/audio/soundCuePlacement.ts`) places each cue on the words its sound tag wraps
and picks the recording from the frozen snapshot: that sound word's
recordings, sorted by URL, preferring the Energy asked for, rotated by chapter
number and how often the word has been used, so the same input always places
the same recording and repeated sounds vary.

Committed chapters persist paragraphs and their Sound Cues
(`SoundCueAttachment`: the paragraph id, exact offsets and words, the sound
word, Energy, and the recording's public URL, category, Studio tags and
pack/version/source provenance); the chapter also records the frozen loadout
provenance. No credential or private storage location persists. Reader
adaptation copies these records unchanged. Inline Cues use
`DevAudioPlaybackProvider`, require a user action, add no autoplay or second
media element, and leave prose readable when playback is unavailable.

## Development fixtures

`mediaPackFixtures.ts` contains one tiny Soundscape Pack and one tiny Sound Cue
Pack (one word, "clockwork roar") for Development verification only. The **Grant test reward** action is a
Workshop-owned adapter that supplies a temporary one-hour entitlement to
HARNESS; it is not persisted by HARNESS and is not a reward economy, schedule,
currency, marketplace, or product pack.

Sound Cues in the tiny SEN language bumped `HARNESS_GENERATION_SCHEMA_VERSION`
to 22 with no upgrade step: earlier workspaces are kept untouched and the page
starts fresh.
