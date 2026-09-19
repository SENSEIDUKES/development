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

Validation rejects malformed or mixed entries, duplicate catalog identities,
non-audio and non-JSON files, signed or credential-bearing URLs, credentials,
provider secrets, executable/script/instruction fields, unsupported Cue
categories, and conflicts with built-in catalog identities. The base
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
catalog entries and pack ID, version, type, source path, and digest. This
snapshot lives on `HarnessGenerationAttempt.mediaLoadout`; it is absent from
`HarnessGenerationRequest`, `CapaPrompt`, `StoryInformationPacket`, and the
provider prompt. It consumes no CAPA budget. Explicit model retry reuses the
original snapshot, and deterministic replay reads the committed chapter.

After the HARNESS has split the prose into SEN blocks and matched the accepted
signals to their anchors, `acceptChapterMedia` receives one authorized catalog
built from the base catalogs plus the matching equipped pack in each slot. The existing World Cue resolver receives that Cue catalog as input.
Soundscape selection uses the existing `SceneAudioTrack` contract, exact mood
gating, semantic cultural-region compatibility, tag ranking, and stable
identity tie-breaking. An exact regional track outranks a neutral base track;
an explicitly mismatched or unrequested regional track is excluded. The model
never supplies or selects a pack, URL, filename, catalog row, or R2 object.

Committed chapters persist only normalized blocks and resolved application
media. Pack-resolved Cue records and resolved Soundscapes retain public playback
data plus pack/version/source digest provenance; the chapter also records the
frozen loadout provenance. No credential or private storage location persists.
Reader adaptation copies these records unchanged. Inline Cues and the Audio
Menu use `DevAudioPlaybackProvider`, require a user action, add no autoplay or
second media element, and leave prose readable when playback is unavailable.

## Development fixtures

`mediaPackFixtures.ts` contains one tiny Soundscape Pack and one tiny Sound Cue
Pack for Development verification only. The **Grant test reward** action is a
Workshop-owned adapter that supplies a temporary one-hour entitlement to
HARNESS; it is not persisted by HARNESS and is not a reward economy, schedule,
currency, marketplace, or product pack.

Changing the persisted attempt, chapter, and story shapes bumped
`HARNESS_GENERATION_SCHEMA_VERSION` to 11. Stale local Development data resets;
there is no compatibility migration.
