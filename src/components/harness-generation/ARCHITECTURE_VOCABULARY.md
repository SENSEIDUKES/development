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
  authoring instructions and the Story Information Packet plus Immediate
  Chapter Request as its generation content.
- **Generated Chapter** — The model's output, returned to the HARNESS for
  validation, checkpointing, memory processing, and commit.

## Structural rules

1. HARNESS prepares two separate inputs: the CAPA Prompt and Story
   Information Packet.
2. CAPA controls how the model authors; Story Information determines what
   story it is authoring.
3. CAPA skills must never store or redefine live story state.
4. The Story Information Packet must never contain CAPA skill instructions.
5. The generation model does not own context weighting, canon storage,
   chapter numbering, persistence, or commits.
6. The HARNESS combines both inputs in one provider call and receives the
   resulting chapter.
7. Each concept has one authoritative definition (this file) and one
   implementation owner. Do not create parallel terminology, schemas,
   assemblers, or context systems for a concept already defined here.

## Implementation owners

Each concept has exactly one implementation owner. New code must go through
the owner listed here, never a parallel structure.

| Vocabulary term | Implementation owner | Notes |
| --- | --- | --- |
| HARNESS | `shared/controller.ts` (`HarnessGenerationController`), with `shared/repository.ts`, `shared/context.ts`, `shared/responseAcceptance.ts`, `shared/capabilities.ts`, neutral contracts in `src/narrative/generation.ts`, and the host implementation in `src/server/harness-generation/execute.ts` | `generateNextChapter` prepares the CAPA Prompt, the Story Information Packet, and the Immediate Chapter Request separately, freezes all three on the attempt, makes one provider call, and owns checkpoints and commits. Reader/Codex author edits append identity-addressed deltas to the same correction journal; no Reader story snapshot is a second owner. |
| CAPA Schema | `CAPA_SCHEMA` in `shared/skills.ts` | The single ordered slot registry (Author, Pacing, Continuity, Style, Accessibility, Translation) with each slot's responsibility. Loadout freezing and CAPA assembly both iterate it, so its order is the assembled order. Media is not a CAPA slot. |
| CAPA Skill | `HarnessSkillManifest` in `src/narrative/generation.ts` | A versioned, replaceable manifest occupying one CAPA Schema slot. Only manifests declaring the `generation` application contribute authoring text. |
| CAPA Prompt | `assembleCapaPrompt` in `shared/skills.ts`, producing `CapaPrompt` (`shared/types.ts`) | Every active generation skill, Author first, once each, in schema order, followed by the permanent `HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS`, assembled into one `text`. The official requirements are visible in Development but are not a replaceable CAPA Skill and never enter the skill inventory. Non-generation skills are listed in that inventory (`authoring: false`) but contribute no text. Frozen on `HarnessGenerationAttempt.capaPrompt`. Has its own soft budget (`CAPA_PROMPT_TOKEN_LIMIT`); never spends the packet's. |
| Story Information | `HarnessWorkspaceState` plus `HarnessStory` and `StoryFoundationRevision` (`src/narrative/generation.ts`), persisted through `shared/repository.ts` | The complete durable story and world state, including persistent steering and Reader-edit correction history. |
| Story Information Packet | `compileStoryInformationPacket` in `shared/context.ts`, producing `StoryInformationPacket` (`shared/types.ts`) | Story data only: Foundation revision, story head, committed chapters, corrections, canonical records, developments, lookups, mechanical continuity, persistent steering, and the selection audit. It has no skill field and carries no skill instructions. Frozen on `HarnessGenerationAttempt.storyInformation`. |
| Immediate Chapter Request | `buildImmediateChapterRequest` in `shared/immediateChapterRequest.ts`, producing `ImmediateChapterRequest` (`shared/types.ts`) | Chapter number, opening/continuation, and the assignment to act on now (the latest persistent direction). Distinct from the packet's full steering history. Frozen on `HarnessGenerationAttempt.immediateChapterRequest`. |
| Generation Model Call | `HarnessGenerationRequest` (`src/narrative/generation.ts`) → `buildHarnessGenerationPrompt` (`src/server/harness-generation/prompt.ts`) → `HarnessTextModelProvider` (`src/server/harness-generation/provider.ts`) | The request carries `capaPrompt`, `storyInformation`, and `immediateChapterRequest` as separate fields. The provider is a host adapter; Gemini is only DEV's concrete implementation. Reader presentation fields, media locations, account/economy data and catalog selections never enter the call. The fixed response contract is infrastructure, not a skill or loadout. |
| Generated Chapter | `HarnessGenerationResponse.rawProviderResponse`, processed by `shared/responseAcceptance.ts` with `shared/chapterSignals.ts`, and committed by `shared/controller.ts` / `shared/repository.ts` | Checkpointed raw, then accepted prose-first: the HARNESS splits prose into canonical SEN blocks, matches each signal to its exact `anchorText`, validates every signal independently, drops malformed signals without losing prose, builds the detailed SEN/Reader structures (dialogue metadata with cast-assigned roles, manifestations, complete System Panels, creature events), resolves soundscapes and Sound Cues through the frozen Media Loadout, and assigns all IDs, ordering, and persistence fields. Chapter memory is never part of this reply: after commit the separate memory extraction (`recoverChapterMemory`) reads the saved prose through the host adapter. |
| *(capability handlers, separate concept)* | `HarnessCapabilityRegistry` in `shared/capabilities.ts` | Not a CAPA concern: permanent, deterministic post-commit handlers that interpret already-committed semantic events. |
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
- This is a development system: persisted field names are not storage
  contracts to preserve. Any change to `HarnessWorkspaceState` or its nested
  attempt/chapter shapes must bump `HARNESS_GENERATION_SCHEMA_VERSION`
  (`shared/types.ts`) so stale local data is reset rather than silently
  accepted or migrated — see `readHarnessWorkspaceState` in
  `shared/repository.ts`. Never add a compatibility alias, dual read, or
  migration path for a renamed field.
