# Media Loadout and runtime catalog boundary

Media Packs are runtime catalog resources, not CAPA Skills. The canonical
HARNESS vocabulary remains defined in
[ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md).

## Ownership

The implementation keeps five independent owners:

1. CAPA Loadout stores writing-skill references and assembles the CAPA Prompt.
2. Generated chapter blocks carry semantic soundscape and Sound Cue intent only.
3. The host registers validated `SoundscapePack` and `SoundCuePack` data in a
   Media Pack inventory that is never merged with the skill inventory.
4. `mediaPackEntitlements` records reward-granted user availability.
5. Each `HarnessStory.mediaLoadout` independently equips an optional Soundscape
   Pack and optional Sound Cue Pack.

The host-owned pack inventory enters `HarnessGenerationController` separately
from `installedSkills`. A reward grant makes a registered pack available and
does not equip it. Equipment requires the exact registered and entitled pack
ID/version, enforces the slot's pack type, and is checked again when the
attempt snapshot is frozen.

## Pack validation

`src/audio/mediaPacks.ts` extends the existing `SceneAudioTrack` and
`LibraryCue` contracts. Packs require a stable ID and semantic version, one
declared pack type, display metadata, an explicitly selected relative JSON
source path, its lowercase SHA-256 digest, and validated entries with public
HTTPS audio URLs.

Validation rejects malformed or mixed entries, duplicate catalog identities,
non-audio and non-JSON files, signed or credential-bearing URLs, credentials,
provider secrets, executable/script/instruction fields, unsupported Cue
categories, and conflicts with built-in catalog identities. The base
`TRACK_LIBRARY` and Library Cue catalog remain the base experience; they were
not repackaged.

The optional SPP host adapter in
`src/workshop/previews/harness-generation/sppMediaPacks.ts` accepts only an
explicitly selected JSON asset from validated `intakePack` content. No filename
is special. The selected manifest record supplies the source path and digest.
Its `seihouse.harness.media-packs.v1` storage key is separate from the v3 SPP
skill inventory.

## Freeze, resolution, persistence, and playback

Every attempt freezes the exact authorized Media Loadout with its validated
catalog entries and pack ID, version, type, source path, and digest. This
snapshot lives on `HarnessGenerationAttempt.mediaLoadout`; it is absent from
`HarnessGenerationRequest`, `CapaPrompt`, `StoryInformationPacket`, and the
provider prompt. It consumes no CAPA budget. Explicit model retry reuses the
original snapshot, and deterministic replay reads the committed chapter.

After response normalization, `acceptChapterMedia` receives one authorized
catalog built from the base catalogs plus the matching equipped pack in each
slot. The existing World Cue resolver receives that Cue catalog as input.
Soundscape selection uses the existing `SceneAudioTrack` contract, exact mood
gating, tag ranking, and stable identity tie-breaking. The model never supplies
or selects a pack, URL, filename, catalog row, or R2 object.

Committed chapters persist only normalized blocks and resolved application
media. Pack-resolved Cue records and resolved Soundscapes retain public playback
data plus pack/version/source digest provenance; the chapter also records the
frozen loadout provenance. No credential or private storage location persists.
Reader adaptation copies these records unchanged. Inline Cues and the Audio
Menu use `DevAudioPlaybackProvider`, require a user action, add no autoplay or
second media element, and leave prose readable when playback is unavailable.

## Development fixtures

`mediaPackFixtures.ts` contains one tiny Soundscape Pack and one tiny Sound Cue
Pack for Development verification only. The **Grant test reward** action is an
adapter over the entitlement boundary; it is not a reward economy, schedule,
currency, marketplace, or product pack.

Changing the persisted attempt, chapter, story, or workspace shapes bumped
`HARNESS_GENERATION_SCHEMA_VERSION` to 11. Stale local Development data resets;
there is no compatibility migration.
