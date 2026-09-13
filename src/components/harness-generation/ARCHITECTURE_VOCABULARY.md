# Harness Generation — Canonical Architecture Vocabulary

This is the single authoritative source for Harness Generation's architecture
terms. Every other Harness Generation document, comment, and future change
must use these definitions and this vocabulary as written. Do not duplicate,
paraphrase, or reinterpret them elsewhere — link back to this file instead.

**Read this file before modifying any Harness Generation code, prompt
assembly, skill/slot system, or context compilation.** If a name used
elsewhere in the codebase does not match a term below, treat the mismatch
as a known naming/structural gap (see "Current mapping and mismatches"),
not as license to invent a new parallel term.

This file defines vocabulary and documents where current code stands
relative to it. It does not itself change generation behavior, add the Arc
system, rename persisted contracts, or introduce new architecture — see
[README.md](./README.md) for the feature's actual behavior and history.

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
- **CAPA Prompt** — The complete prompt produced by assembling the active
  CAPA skills in schema order.
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

## Current mapping and mismatches

This section is a snapshot of how existing repository names line up with
the vocabulary above, as of this writing. It is descriptive, not a
refactor plan — no code changes were made to close these gaps as part of
establishing this vocabulary.

| Vocabulary term | Closest existing name(s) | Status |
| --- | --- | --- |
| HARNESS | `shared/controller.ts`, `shared/repository.ts`, `shared/context.ts`, `src/server/harness-generation/execute.ts` | Aligned — this is the owning code. |
| CAPA Schema | `HARNESS_SKILL_SLOTS` in `shared/skills.ts` | **Partial.** This array does define slot id, order, and responsibility, which is what a CAPA Schema is, but it is not named or documented as the authoritative schema, and it is called a "slot"/"skill" system rather than CAPA. |
| CAPA Skill | `HarnessSkillManifest` in `shared/types.ts` | **Partial.** Structurally a CAPA Skill (versioned, replaceable, one slot), but not named as one. |
| CAPA Prompt | *(no dedicated artifact)* | **Mismatch.** There is no single assembled "CAPA Prompt" value. Skill instructions are interleaved directly into `systemInstruction` alongside Harness response/evidence-contract text in `src/server/harness-generation/prompt.ts` (`buildHarnessGenerationPrompt`), and the same skill instructions are serialized a second time into the `userPrompt` JSON under `"ACTIVE HARNESS SKILLS"`. CAPA skills are not assembled once, in schema order, as an independent value before the Harness combines them with story content. |
| Story Information | `HarnessWorkspaceState` (chapters, events, corrections, canonical records) plus `HarnessStory` plus `StoryFoundationRevision` in `shared/types.ts` | Aligned — this is the durable story state the Harness owns. |
| Story Information Packet | `HarnessContextSnapshot`, produced by `compileHarnessContext` in `shared/context.ts` | **Mismatch.** `HarnessContextSnapshot` carries an optional `skillLoadout: HarnessSkillLoadoutSnapshot`, and `HarnessSkillLoadoutSnapshot.skills` includes each skill's `instructions` string — i.e. CAPA skill instructions currently live inside the same snapshot that is meant to be pure Story Information (rule 4). The rest of `HarnessContextSnapshot` (foundation revision, committed chapters, corrections, canonical context, developments, lookups, mechanical continuity, selection audit) is correctly Story-Information-shaped. |
| Immediate Chapter Request | *(no dedicated type)* | **Mismatch.** There is no distinct "Immediate Chapter Request" value. The nearest equivalent is the last entry of `HarnessStory.steering` / `HarnessContextSnapshot.steering`, folded into the `"AUTHOR DIRECTION FOR THE NEXT CHAPTER"` section of `userPrompt` alongside all other steering history, plus the ambient `chapterNumber` field. It is not modeled or passed as its own concept. |
| Generation Model Call | `HarnessGenerationRequest` (`shared/types.ts`) consumed by `buildHarnessGenerationPrompt` (`src/server/harness-generation/prompt.ts`) and `HarnessGenerationModelAdapter` (`src/server/harness-generation/provider.ts`) | **Mismatch.** `HarnessGenerationRequest` bundles `foundation` and `context` into one object, and `buildHarnessGenerationPrompt` derives both the "authoring instructions" and "generation content" from it inline in a single function, rather than accepting an already-assembled CAPA Prompt and an already-assembled Story Information Packet as the two separate inputs rule 1 requires. |
| Generated Chapter | `HarnessGenerationResponse.rawProviderResponse`, processed by `shared/responseAcceptance.ts` and committed by `shared/controller.ts` / `shared/repository.ts` | Aligned. |
| *(capability handlers, separate concept)* | `HarnessCapabilityRegistry` in `shared/capabilities.ts` | Not a CAPA concern. These are permanent, deterministic post-commit handlers that interpret already-committed semantic events; they are correctly documented in README.md as distinct from installable skills and require no renaming here. |

The clearest concrete gap: **`HarnessContextSnapshot` is not yet a clean
Story Information Packet** because it carries `skillLoadout` (CAPA data,
including live skill instructions) inside it, and there is no separate,
independently assembled CAPA Prompt value — skill instructions are instead
woven directly into prompt-string construction in `prompt.ts`. Any future
change that wants to honor rule 1 and rule 4 will need to address that
before adding new Harness Generation behavior, but doing so is out of scope
for this document.

## Naming going forward

- New code, comments, and docs for this feature should prefer the terms
  above (CAPA, CAPA Schema, CAPA Skill, CAPA Prompt, Story Information,
  Story Information Packet, Immediate Chapter Request, Generation Model
  Call, Generated Chapter) over ad hoc phrasing, even where the current
  implementation hasn't been renamed to match yet.
- Do not introduce a second schema, assembler, or context-selection system
  under a different name for a concept already defined here (rule 7).
- If a change would rename a persisted contract (e.g. `HarnessSkillManifest`,
  `HarnessContextSnapshot`) to close one of the mismatches above, that is a
  deliberate migration decision, not an incidental rename — call it out
  explicitly and confirm scope before doing it.
