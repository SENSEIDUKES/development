# `@seihouse/sen`

SEN is the portable expanded-narrative engine. A publisher supplies content,
branding, accounts, storage, media, and—if desired—a generation method. AI is
optional. SEN has no dependency on Celestial Library, Library UI, Library
accounts, Energy, QI, first-party catalogs, Workshop state, or concrete APIs.

## Public entries

| Import | Owner responsibility |
| --- | --- |
| `./text-highlight-engine` | Single-block selection, nested actions, local editing, host-approved manual cue placement, and the manuscript page (permanent paragraph/sentence IDs, paragraph/sentence/span anchors, one edit rule, draft/sealed); no chapter dependency |
| `@seihouse/sen` | Neutral presentation contracts/defaults and version |
| `./contracts` | Story, chapter, block, identity, voice, usage and language contracts |
| `./presentation` | Product-neutral presentation provider and slots |
| `./reader-runtime` | Required host ports for Reader/Codex state and services, and Read Aloud: spoken lines and speaker records, the three-voice script, voice choice, device preferences through `ReaderPreferenceStorage`, and the `useReadAloud` player over the browser's speech |
| `./reader-chamber` | Portable Reader behavior and UI, including the anchored Mind Palace |
| `./reader-codex` | Portable Codex behavior and UI |
| `./inline-audio` | Sound Cues on the page: the glyph on the words a cue marks and its inline playback (needs a host `NarrativeAudioProvider`) |
| `./color-codes` | Single narrative Color Code authority |
| `./cards` | Narrative and System card families |
| `./manifestations` | Neutral manifestation capability and reveal UI |
| `./motion-picture` | Item-neutral still-to-motion picture for any pictured entity |
| `./audio` | Media intent, resolution, provenance and playback contracts |
| `./story-seed` | Foundation schema, validation, import/export, repository port and neutral editor |
| `./generation` | Provider-neutral chapter/block/media acceptance contracts |
| `./harness-generation` | Canonical state, continuity, CAPA, generation ports, recovery and export; the Fate page and its panels |
| `./translation` | Translation/accessibility contracts and controller |
| `./arc-goals` | Arc planning contracts and operations |
| `./styles.css` | SEN feature styles |

There is no `chapter-generation` or `codex-cards` compatibility entry. Legacy
Chapter Generation was retired; HARNESS is the one canonical generated-story
owner.

**0.13.0 (breaking):** holdings, the tag system's first information tags.

- `./generation`: `readMarks` reads word tags (`[[gained: MC | Thing]]`) and
  `TAG_WORDS` lists the tag words with the spellings each accepts.
- `./harness-generation`:
  - `CodexEntry`, `HoldingChangeAttachment` and `HoldingsSection`: the records.
  - `placeHoldingChanges`, `resolveHoldingChanges`, `deriveHoldings` and
    `holdingsSection`: tags to records, records to Codex entries, and what
    every character holds now, worked out and checked by plain rules.
  - `SEN_HOLDINGS_SKILL` in a new always-managed `holdings` CAPA slot
    (`ALWAYS_LOADED_SKILLS`), and `HoldingsPage` in the Reader.
  - Breaking: `HarnessSkillSlotId` and `PacketSectionId` widen with
    `holdings`, `HarnessWorkspaceState` requires `codexEntries`, and the
    workspace schema is 26.

**0.12.0 (breaking):** Read Aloud and dialogue speakers.

- `./reader-runtime`: Read Aloud, the Reader's three-voice narration on the
  browser's own speech.
  - `findSpokenLines`, `SpeakerAttachment` and `SPEAKER_KIND`: spoken lines and
    the speaker records on them.
  - `buildReadAloudScript`: a chapter as short lines inside its sentences, each
    for the Narrator, Protagonist or Side voice.
  - `chooseDefaultVoices` and `resolveReadAloudVoices`: voices for the story's
    language, from a host's `ReadAloudVoicePicks`.
  - The preferences codec, through the existing `ReaderPreferenceStorage` port.
  - `useReadAloud`, with `createWebSpeechEngine`.
- `./harness-generation`:
  - `HarnessReaderSession` takes `readerPreferences` and `readAloudVoices`, and
    shows Listen and Reader Settings (Narration) when the browser can speak.
  - Speaker tags (`[[@MC]]` for the main character, `[[@Name]]` for anyone
    else, read by `readMarks`) become `HarnessChapter.speakers` (schema 25).
  - `SEN_SPEAKERS_SKILL` fills the new always-managed `speakers` slot.
  - `HarnessSkillSlotId` and `CapaSlotManager` widen, which is the breaking part.
- `./contracts`: `senSpeechLanguageTags`.
- `./inline-audio`: a cue's screen-reader status no longer shifts passage offsets.

**0.11.0 (breaking):** a World Blueprint plans only Arc 1; every later arc is
planned when the reader begins it.

- `./story-seed`:
  - `WorldBlueprint.arcPlans` holds exactly Arc 1, and a new hidden
    `arcLookahead` holds at most two one-line directions for the next arcs.
  - `validateBlueprintArcPlan`, `describeBlueprintArcPlanProblem`,
    `alignArcOneWithSeed` and `fitArcLookahead` replace the whole-roadmap
    functions.
  - `buildArcRoadmapExtensionPayload`, `ARC_ROADMAP_EXTENSION_OPERATION` and
    `ArcRoadmapExtensionPayload` are removed, and so are `CreationModal`'s
    `onExtendArcRoadmap` and `BlueprintReview`'s `onAddArcs`.
  - New: `fillBlankSeedSlots`, `readGeneratedSeedSlots`, `GeneratedSeedSlots`,
    `GeneratedWorldBlueprint`, and the `SEED_*` slot lists and card limits.
  - The Seed holds the creator's Story Length (`story.optional.arcCount`, 1 to
    100 arcs). The Blueprint is generated for it and its `estimatedArcs`
    follows it; `WorldBlueprint.arcOneScope` records what Arc 1 was planned as.
    `BlueprintGenerationPayload.arcCount` is removed, and
    `buildBlueprintGenerationPayload` takes only the Seed.
- `./arc-goals`:
  - `insertArcsBeforeFinal`, `arcsCanBeAddedBeforeFinal`, `validateArcRoadmap`
    and `arcRoadmapSchema` are removed.
  - New look-ahead and planning helpers: `ArcLookaheadEntry`,
    `normalizeArcLookahead`, `arcLookaheadFromPlans`, `ARC_PLAN_DRAFT_SCHEMA`,
    `arcPlanFromDraft`, and `ARC_LOOKAHEAD_SCHEMA`.
- `./harness-generation`:
  - The Foundation takes `initialArcPlan`, `plannedArcCount` and
    `initialArcLookahead` in place of `arcRoadmap`.
  - `planNextArc`, `nextArcStep`, `arcPlanGap`, `arcReviewGap` and
    `routeCompleteGap` are new, together with `BlueprintArcPage`, the World
    Blueprint's goal section that reappears in the Reader when a new arc
    begins.
  - `HarnessReaderSession` takes `onPlanArc`.
  - Storage moves to schema 24.

**0.10.0 (breaking):** `InlineAudio`, `InlineAudioControl` and `InlineAudioText`
moved from `./reader-chamber` to their own entry, `./inline-audio`, and their
source from `components/reader-chamber/development/` to `src/audio/`. The
HARNESS Reader now renders Sound Cues without reaching the older Reader
Chamber, its Codex cards or their styles.

**0.9.0 (breaking):** `HarnessReaderSession` is just reading. Each chapter's
paragraphs sit on the read-only Text Highlight Engine with their Sound Cues
(`InlineAudioText`); Previous, Next, Next at the newest chapter and the Fate
page (its header's Fate button) stay. The `installedSkills` prop is removed, and
with it the packaged Reader Chamber, Codex sheet, Mind Palace, reading
settings, reader translation, read-aloud and read marks in this Reader. New:
`renderWriting(writing: HarnessReaderWriting)`, the host's screen while a
chapter is written (rendered on every pass so it can animate out);
`startOnOpen`, which begins Chapter 1 as the Reader opens for a story with no
chapters; `NextChapterWriter.writingChapter`; and the controller option
`chapterMemory: 'after-commit' | 'on-request'` (default `after-commit`), which
lets a host read story memory only on request.

**0.8.0 (breaking):** chapters speak the tiny SEN language, starting with
narration and Sound Cues. The writer wraps the one to five words where a sound
happens (`[[n|words]]`) and names it from the story's sound words
(`soundCues: [{mark, sound, energy?}]`); the HARNESS strips every mark, places
the cue on those exact words (`placeSoundCues`), picks the recording and stores
it as a manuscript span attachment (`SoundCueAttachment`, kind `sound-cue`). A
new managed CAPA slot, Sound Cues (`media-loadout`), carries SEN's bundled
`SEN_SOUND_CUES_SKILL` and the story's sound words as its example list.
`HarnessChapter` and the accepted draft keep `paragraphs`, `prose` and
`metrics`, gain `soundCues`, and lose `blocks`, `audioMoments` and
`soundscapes`; `ChapterContent.audioMoments`, `ChapterProse.audioMoments` and
`ReaderChapter.audioMoments` became `soundCues` (a production transfer note:
Light-Novels reads `audioMoments` today). Removed: the World Cue intent,
validation and resolution system (`resolveWorldCueIntent`,
`resolveChapterAudioMoments`, `ResolvedAudioMoment`, `WorldCueIntent`,
`INLINE_AUDIO_CUE_CATEGORIES`), `acceptChapterMedia`, the HARNESS signal
families and their enums (`readHarnessChapterSignals`,
`applyHarnessChapterSignals`, `HARNESS_SIGNAL_LIMITS` and the rest), and
`createManualCueMoment` (now `createManualSoundCue`). `InlineAudio`,
`InlineAudioControl` and `InlineAudioText` take `cue`/`cues`. Dialogue,
Manifestations, System Panels, Soundscapes and Creature Events are rebuilt
later, one at a time. Saved HARNESS workspaces are not upgraded (schema 22):
by the product owner's decision the earlier workspace is kept untouched and
the page starts fresh.

**0.7.0 (breaking):** Translation and Accessibility are managed CAPA slots, like
Fate. The HARNESS resolves Translation from the story's Story Language (its
Original Language) and Accessibility from its Reading Mode
(`HarnessStory.chapterWritingStyle`, production's values, from
`./contracts`), with SEN bundling one Accessibility skill per non-Standard mode
(`SEN_READING_MODE_SKILLS`). Neither slot can be equipped by hand. The
always-sent `HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS` constant became
`buildHarnessOfficialOutputRequirements`, sent only when a chapter needs it;
`isTranslationSkillCompatible` and `translationCompatibilityError` gave way to
`resolveStoryLanguagePackage` and the shared `resolveTranslationPackage`.
`CapaSlotDefinition` gains `installable`. Saved HARNESS workspaces upgrade in
place (schema 21).

**0.6.0 (breaking):** removed `AlterFatePanel`, `ReaderFateAlerts`,
`FateSurvivalExplanation` and the `alterFateLock` helpers from `./reader-chamber`
(the Reader's `handleAlterFate` prop became `onOpenFate`, and its unused
`currentPowerStage` prop is gone); removed `HarnessSteering`,
`controller.steerStory` and the Fate Survival mystery/visibility fields from
`./harness-generation` in favor of `chooseChapterDirection`, the one-chapter
`HarnessChapterDirection`, and the Fate page (`FatePage`, `FatePathChooser`,
`FateArcGoalCard`, `FateDestinedEnding`, `FateConclusion`). Saved HARNESS
workspaces upgrade in place (schema 20).

## Required host composition

Reader and Codex require `ReaderRuntimeProvider`; Story Seed persistence is a
`StorySeedRepository`; generation is a `HarnessGenerationModelAdapter`; media
is supplied through portable media ports. Missing providers fail clearly. No
package surface installs browser storage, a mock store, a same-origin endpoint,
a provider, a catalog, authentication, or payment policy by default.

The packed-consumer smoke installs SEN without Library UI or the SEIHouse audio
player, supplies an independent presentation component, custom account and
repository types, and bundles every export with no AI adapter.

## Enforcement and build

`npm run check:ownership` classifies every production source file, checks every
public closure, rejects cross-owner source imports, undeclared dependencies,
host/Workshop defaults, package cycles and invalid dependency direction. It
does not begin from exports alone, so an unexported production capability fails.

```bash
npm run check:ownership
npm run build:package:sen
npm run test:package
```

Locked references, Workshop previews and fixtures, `src/host`, `src/server`,
concrete asset locations, and cross-product provenance are deliberately absent.
