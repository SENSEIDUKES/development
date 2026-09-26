# Harness Generation — Canonical Architecture Vocabulary

This is the single authoritative source for Harness Generation's architecture
terms. Every other Harness Generation document, comment, and future change
must use these definitions and this vocabulary as written. Do not duplicate,
paraphrase, or reinterpret them elsewhere — link back to this file instead.

**Read this file before modifying any Harness Generation code, prompt
assembly, skill/slot system, or context compilation.** Every concept below
has one implementation owner (see "Implementation owners"); route changes
through that owner rather than inventing a parallel term or structure.

This file defines the vocabulary and names the single implementation owner
of each concept. See [README.md](./README.md) for the feature's behavior and
history.

## Core definitions

- **HARNESS** — Owns durable story state, context selection and weighting,
  CAPA assembly, provider calls, generation checkpoints, and chapter
  commits.
- **CAPA (Composable Author Prompt Architecture)** — The ordered system of
  replaceable skills that defines *how* the generation model authors a
  chapter. CAPA does not own story state, retrieval, persistence, canon, or
  arc progress.
- **CAPA Schema** — The single authoritative definition of CAPA's skill
  slots, their order, and each slot's responsibility.
- **CAPA Skill** — A versioned, replaceable instruction module occupying one
  CAPA slot.
- **CAPA Prompt** — The complete authoring prompt produced by assembling the
  active CAPA skills in schema order, followed by the permanent HARNESS
  Official Output Requirements.
- **Story Information** — The complete story and world information owned by
  the HARNESS.
- **Story Information Packet** — The story information selected, weighted,
  organized, and frozen by the HARNESS for one generation attempt. It
  contains story data, not skill instructions.
- **Immediate Chapter Request** — The specific instruction for the chapter
  currently being generated.
- **Generation Model Call** — One call receiving the CAPA Prompt as its
  authoring instructions and the Story Information Packet, the Mission
  Reminder, and the Immediate Chapter Request as its generation content.
- **Generated Chapter** — The model's output, returned to the HARNESS for
  validation, checkpointing, memory processing, and commit.

## Structural rules

1. HARNESS prepares its inputs separately: the CAPA Prompt, the Story
   Information Packet (as distinct sections), the Mission Reminder, and the
   Immediate Chapter Request. They are joined only at the provider boundary.
2. CAPA controls how the model authors; Story Information determines what
   story it is authoring.
3. CAPA skills must never store or redefine live story state.
4. The Story Information Packet must never contain CAPA skill instructions.
5. The generation model does not own context weighting, canon storage,
   chapter numbering, persistence, or commits.
6. The HARNESS combines all four inputs in one provider call and receives
   the resulting chapter.
7. Each concept has one authoritative definition (this file) and one
   implementation owner. Do not create parallel terminology, schemas,
   assemblers, or context systems for a concept already defined here.

## Implementation owners

Each concept has exactly one implementation owner. New code must go through
the owner listed here, never a parallel structure.

| Vocabulary term | Implementation owner | Notes |
| --- | --- | --- |
| HARNESS | `shared/controller.ts` (`HarnessGenerationController`), with `shared/repository.ts`, `shared/context.ts`, `shared/responseAcceptance.ts`, `shared/capabilities.ts`, neutral contracts in `src/narrative/generation.ts`, and the host implementation in `src/server/harness-generation/execute.ts` | `generateNextChapter` prepares the CAPA Prompt, the Story Information Packet, and the Immediate Chapter Request separately, freezes all three on the attempt, makes one provider call, and owns checkpoints and commits. Reader/Codex author edits append identity-addressed deltas to the same correction journal; no Reader story snapshot is a second owner. |
| CAPA Schema | `CAPA_SCHEMA` in `shared/skills.ts` | The single ordered slot registry (Author, Pacing, Fate, Continuity, Style, Accessibility, Translation) with each slot's responsibility. Loadout freezing and CAPA assembly both iterate it, so its order is the assembled order. Three slots are managed (`managedBy`): loadout freezing fills each from story state, the result is frozen on the attempt, and none is ever equipped by hand. Fate (`fate-mode`) follows the chapter's frozen Fate mode: SEN's Fate Survival skill (`shared/fateSurvivalSkill.ts`) on every Fate Survival call, nothing in Regular Reader mode. Accessibility (`reading-mode`) follows the story's Reading Mode (`HarnessStory.chapterWritingStyle`): SEN's bundled skill for Clear Reading, Easy Read or Literal Reading (`shared/readingModeSkills.ts`), nothing for Standard. Translation (`story-language`) follows the story's Original Language: nothing for English; otherwise the one installed package declaring `generation` for that language (`resolveStoryLanguagePackage`, through the rule Reader translation shares), written without one when none is installed, and refused when several compete. `installable` is separate: Translation packages are installed but never equipped; Fate and Accessibility take no packages. Media is not a CAPA slot. |
| CAPA Skill | `HarnessSkillManifest` in `src/narrative/generation.ts` | A versioned, replaceable manifest occupying one CAPA Schema slot. Only manifests declaring the `generation` application contribute authoring text. |
| CAPA Prompt | `assembleCapaPrompt` in `shared/skills.ts`, producing `CapaPrompt` (`shared/types.ts`) | Every active generation skill, Author first, once each, in schema order, followed by the permanent HARNESS Official Output Requirements (`buildHarnessOfficialOutputRequirements`) only when the chapter needs them: when an Accessibility or Translation skill is loaded, or when the story's Original Language is not English (then a one-line Story Language requirement travels even with no Translation skill), all assembled into one `text`. An English, Standard chapter carries none. The official requirements are visible in Development but are not a replaceable CAPA Skill and never enter the skill inventory. Non-generation skills are listed in that inventory (`authoring: false`) but contribute no text. Frozen on `HarnessGenerationAttempt.capaPrompt`; a provider retry resends it unchanged only while the managed skills the story resolves still match it. Has its own soft budget (`CAPA_PROMPT_TOKEN_LIMIT`); never spends the packet's. |
| Story Information | `HarnessWorkspaceState` plus `HarnessStory` and `StoryFoundationRevision` (`src/narrative/generation.ts`), persisted through `shared/repository.ts` | The complete durable story and world state, including the reader's pending one-chapter direction (`HarnessStory.nextChapterDirection`), the path each committed chapter took (`HarnessChapter.path`), the story's Fate mode and conclusion, its Story Settings (the permanent Original Language and the owner's Reading Mode, which reach the writer only as the managed skills they resolve), and Reader-edit correction history. Persistent steering saved before one-chapter directions is kept read-only as `earlierSteering` and never travels. |
| Story Information Packet | `compileStoryInformationPacket` in `shared/context.ts` (with `projectCurrentStory`, `shared/canonicalProjection.ts`, and the one budget in `shared/packetBudget.ts`), producing `StoryInformationPacket` (`src/narrative/generation.ts`) | Story data only, held as distinct compact sections until the provider boundary: Current Story Information (the active Foundation's stable domain fields and compacted corrections), Destined Ending and Hard Pins with the story's Fate mode (`fateMode`: `regular` makes the ending the story's guaranteed standing direction, never a forced deadline; `survival` does not guarantee it), the Active Arc Goal from the existing Arc Plan authority (the saved plan for the chapter's own arc; the provider sees only its active goal, deadline, and position on the planned route — never a later goal or arc — with `route`: on or off track with the arc's missed goals, past a missed final goal in Regular Reader mode, or broken in Fate Survival, when the one chapter that must end the story keeps the arc the route broke in), the persisted Fate Pressure rhythm direction with its matching suggestion (only when the chapter's path is automatic: Regular Reader mode with no reader choice), the latest five saved Previously On recaps, and the current canonical state (latest applicable state per resolved entity; deterministic aliases merged, near-duplicates flagged, relevance-ranked under its allocation). It carries no Story Seed snapshot, chapter prose, evidence passage, memory extraction, ordinary thread/mystery record, or timeline. Its `diagnostics` (section measurements, omissions, identity ambiguities, storage totals) are HARNESS-only and never presented. It has no skill field. Frozen on `HarnessGenerationAttempt.storyInformation`; a provider retry resends the frozen packet unchanged unless the reader changed that chapter's direction since, in which case it is rebuilt. |
| Immediate Chapter Request | `buildImmediateChapterRequest` in `shared/immediateChapterRequest.ts`, producing `ImmediateChapterRequest` (`shared/types.ts`) | Chapter number, opening/continuation, the HARNESS-owned chapter-scale target (`chapterScale`), and the reader's direction for this one chapter (`direction`: one of Rhythm's three chapter functions with the idea they chose, or their own words), when they chose one on the Fate page. It is the only place the reader's choice travels, and it is consumed when that chapter commits. The chapter-scale target is HARNESS mechanics, not a CAPA skill and not canonical Story Information: the Pacing skill decides how the chapter uses the space it allows. Frozen on `HarnessGenerationAttempt.immediateChapterRequest`. |
| Generation Model Call | `HarnessGenerationRequest` (`src/narrative/generation.ts`) → `buildHarnessGenerationPrompt` (`src/server/harness-generation/prompt.ts`) → `HarnessTextModelProvider` (`src/server/harness-generation/provider.ts`) | The request carries `capaPrompt`, `storyInformation`, `missionReminder`, and `immediateChapterRequest` as separate fields. The provider boundary presents its sections once, in order: CAPA Prompt, Current Story Information, Destined Ending and Hard Pins, Active Arc Goal, Fate Pressure Rhythm Direction (automatic paths only), Previously On, Current Canonical State, Mission Reminder, Immediate Chapter Request. It measures the exact serialized request (`HarnessRequestMeasurement`, returned with the response and persisted on the attempt). The provider is a host adapter; Gemini is only DEV's concrete implementation. Reader presentation fields, media locations, account/economy data, catalog selections, and packet diagnostics never enter the call. The fixed response contract is infrastructure, not a skill or loadout. |
| Generated Chapter | `HarnessGenerationResponse.rawProviderResponse`, processed by `shared/responseAcceptance.ts` with `shared/chapterSignals.ts`, and committed by `shared/controller.ts` / `shared/repository.ts` | Checkpointed raw, then accepted body-first: the model returns one authoritative `paragraphs` array (`shared/chapterBody.ts`), from which the HARNESS derives the readable prose, measures `wordCount`/`paragraphCount` against its own chapter-scale target, and builds one ordered canonical SEN block per paragraph. It then matches each signal to its exact `anchorText` — normalizing whitespace and equivalent quotation marks for matching only, and using the signal's optional `occurrenceIndex` when a phrase repeats — splits a block at the exact anchored span for System Panels and dialogue so a span never stamps the narration around it, validates every signal independently, drops malformed or unplaceable signals without losing prose, builds the detailed SEN/Reader structures (dialogue metadata with cast-assigned roles, manifestations, complete System Panels, creature events), resolves soundscapes and Sound Cues through the frozen Media Loadout, and assigns all IDs, ordering, and persistence fields. Short or single-paragraph output is preserved and flagged, never rejected. Chapter memory is never part of this reply: after commit the separate memory extraction (`recoverChapterMemory`) reads the saved prose through the host adapter. |
| *(capability handlers, separate concept)* | `HarnessCapabilityRegistry` in `shared/capabilities.ts` | Not a CAPA concern: permanent, deterministic post-commit handlers that interpret already-committed semantic events. |
| *(Story-direction sources, separate durable concept)* | Shared domain contract in `src/narrative/storyDirection.ts` (Hard Pins, Fate Pressure tiers, chapter functions, recaps); Hard Pins and the rhythm recommendation on `HarnessStory`, recaps and rhythm metadata on `HarnessChapter`, `fatePressure` on `StoryFoundationInput`; tuning in `FATE_PRESSURE_RHYTHM_CONFIG` (`shared/rhythm.ts`); `buildMissionReminder` (`shared/missionReminder.ts`) frozen on `HarnessGenerationAttempt.missionReminder`; written only through `shared/controller.ts` | Durable Story Information the HARNESS displays, persists, and now projects into the compact Story Information Packet (sections 3 through 6) and, for the Mission Reminder, section 8 of the Generation Model Call. The writer returns the recap, chapter function, and three one-line suggestions as shallow fields of its existing chapter reply; it never writes Hard Pins, Fate Pressure, or the Destined Ending, and the rhythm recommendation is computed deterministically from saved chapter functions and the one configuration. The Mission Reminder is a bounded excerpt of the Author skill's CAPA text and performs no story analysis. |
| *(Media Loadout, separate runtime concept)* | SEN contracts in `src/audio/media.ts` and `acceptedChapterMedia.ts`; Library selection/entitlement policy in `src/library/media/mediaPacks.ts`; host records in `src/host/media/`; frozen through `shared/controller.ts` | SEN owns portable intent, references and deterministic resolution. Library owns first-party selection/entitlement policy; the host owns catalog records and truth. HARNESS freezes only opaque provenance and never grants entitlements. Media never enters CAPA, Story Information, the Immediate Chapter Request, or the Generation Model Call. |

## Former structure (corrected record)

Before the separation was implemented, the repository did not have one
independent CAPA Prompt. CAPA instructions were **split across prompt
locations**: the Author skill's instructions were written into the system
instruction, while every other generation skill's instructions were
serialized into a JSON block inside the user prompt alongside story
evidence. No skill's instructions were sent twice — an earlier draft of this
document said so, and that statement was inaccurate. The real problems were
that the same authoring instruction set was assembled in two places, and
that the frozen skill loadout (including live instruction text) was **stored
inside the context snapshot** — the object meant to be pure Story
Information — instead of existing as its own frozen CAPA Prompt. The current
chapter's assignment was also derived inline from steering history rather
than represented as an Immediate Chapter Request. Those structures have been
replaced directly; there are no compatibility aliases for them.

## Naming going forward

- New code, comments, and docs for this feature should prefer the terms
  above (CAPA, CAPA Schema, CAPA Skill, CAPA Prompt, Story Information,
  Story Information Packet, Immediate Chapter Request, Generation Model
  Call, Generated Chapter) over ad hoc phrasing, even where the current
  implementation hasn't been renamed to match yet.
- Do not introduce a second schema, assembler, or context-selection system
  under a different name for a concept already defined here (rule 7).
- Persisted field names are not storage contracts to preserve, but saved
  stories are. Any change to `HarnessWorkspaceState` or its nested
  attempt/chapter shapes must bump `HARNESS_GENERATION_SCHEMA_VERSION`
  (`src/narrative/generation.ts`) and add one explicit upgrade step to
  `HARNESS_WORKSPACE_MIGRATIONS` in `shared/repository.ts`, so existing
  stories carry over; the host keeps an untouched copy before upgrading.
  Storage with no upgrade path is preserved untouched and replaced with an
  empty workspace. Never add a compatibility alias or dual read for a
  renamed field: the upgrade step rewrites the stored shape once.
