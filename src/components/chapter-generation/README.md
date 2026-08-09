# Chapter Generation

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Source location:** `src/aiRouter.ts`, `src/server/routes/storyRouter.ts`, and the Story Seed, prompt, handoff, formatting, and context dependencies
- **Workshop preview:** `?preview=chapter-generation-flow`
- **Replica created:** 2026-07-31
- **Last Workshop update:** 2026-08-09
- **Last source comparison:** 2026-08-09
- **Replica status:** Chapter Generation 1.0 Pass 1 manifests one real chapter from a finalized Story Seed and World Blueprint through server-side Gemini calls

## Purpose

This Workshop entry proves one real Chapter Generation 1.0 run without creating a
second Story Seed contract. Development accepts a saved or uploaded portable Story
Seed v3 artifact with its sibling `WorldBlueprint`, adapts those canonical objects
into the existing four packet contracts, and calls Gemini through a same-origin,
server-only provider boundary. No fixture value is used to fill a missing mapping.

The primary Development experience is a small test harness: select or upload the
artifact, choose a server-configured model, optionally add a temporary instruction,
manifest one chapter, read it, and inspect per-call and total token usage. The
existing four-stage workspace remains available in a collapsed Diagnostics section.
Reference remains the locked deterministic inspector.

## Four actual stages

### 1. Assemble Chapter Packet

`assembleChapterPacket()` is pure code assembly and makes no model call. It builds
one model-visible packet containing:

- Story Constitution, retaining the exact normalized Story Seed and World Blueprint
- starting Living Story State built only from canonical Story Seed/Blueprint data
- Chapter 1 Mission and contract, sourced first from `WorldBlueprint.firstArcPromise`
- Generation Rules and consolidated permanent writing/formatting instructions
- existing anchors and budgeted relevant context
- Cultural Prose, accessibility, glossary, world, narration, and effect rules
- the explicit starting arc/chapter position, `Arc 1 — Chapter 1/100`

Permanent Story Seed choices and story rules belong here automatically. They are
not independent generation stages or calls.

### 2. Plan Chapter

One structured planning call receives the complete Chapter Packet and decides all
chapter-specific direction together:

- response to recent scene rhythm
- interpretation and selection of an existing ending anchor
- Fate Survival application for this chapter
- appropriate chapter effects
- scene progression and pacing
- intended ending and next-chapter handoff target

The result is one `ChapterPlan`. The canonical Fate Survival configuration reaches
planning directly. No unapproved legacy `FatePressureTier` mapping is inferred.

### 3. Manifest Chapter

One writing call receives the complete Chapter Packet, the `ChapterPlan`, and the
consolidated permanent writing and formatting instructions. It returns only the
manifested `ChapterContent`. It does not generate anchors, mutate story state, or
advance the chapter counter.

### 4. Process Result

One structured processing call inspects the manifested chapter and returns:

- new anchors
- character and world-state changes
- completed, changed, and unresolved threads
- mission completion evidence
- continuity and repetition findings
- the next-chapter handoff
- a proposed next `LivingStoryState`

The proposed state is a cloned candidate for later approval. The input state and
chapter position remain unchanged across normal runs and retries. A separate repair
call is allowed only when processing reports a serious finding and recommends repair.

## Model-call boundaries

Normal path:

1. `planChapter`
2. `manifestChapter`
3. `processResult`

Conditional path:

1. `repairChapter`, only after a serious processing finding
2. `processResult` again for the repaired chapter, so anchors and proposed state match the repaired text

Stage 1 and all permanent story rules make no model call. Development uses the
asynchronous pipeline and server-side Gemini provider for the three normal calls.
Reference continues to use deterministic local adapters. Neither path saves a
chapter or commits the proposed Living Story State.

## What the former steps became

| Former responsibility | Four-stage owner |
| --- | --- |
| Premise | Stage 1 relevant context and Chapter Mission |
| Story Seed and World Blueprint | Stage 1 Story Constitution |
| Genre rules | Stage 1 permanent Generation Rules; consumed directly by Stage 3 |
| Current arc | Stage 1 Living Story State and model-visible arc/chapter position |
| Recent chapter/history | Stage 1 budgeted relevant context |
| Character and Codex state | Stage 1 Living Story State |
| Chapter instructions | Permanent rules in Stage 1; chapter-specific pacing, Fate, effects, and direction in Stage 2 |
| System prompt | Stage 1 consolidated permanent instructions; consumed directly by Stage 3 |
| Final generation request | Stage 3 manifest call input |
| Generated chapter output | Stage 3 manifested chapter, then Stage 4 structured inspection/proposal |
| Development Cultural Prose | Stage 1 packet setting |
| Development rhythm and available anchors | Stage 1 state, interpreted in Stage 2 |
| Development selected path and effect direction | Stage 2 `ChapterPlan` |
| Development new anchors and next-scene behavior | Stage 4 processing result |

The former ten-step arrays no longer execute beneath these names. The generic
`GenerationStage[]` adapter exists only to display the four results in the existing
inspector.

## Layout

```text
shared/
  assembleGeneration.ts       Reference adapter
  assembleGenerationDev.ts    Development adapter and preview-only controls
  liveChapterGeneration.ts    shared HTTP request/response contracts
  packets/
    storySeedChapterAdapter.ts canonical Story Seed/Blueprint bridge
  pipeline/
    assembleChapterPacket.ts   pure Stage 1 assembly
    chapterEffectRules.ts      permanent seven-category effect rules
    index.ts                   portable pipeline exports
    runChapterPipeline.ts      shared four-stage orchestration
    runChapterPipelineAsync.ts live asynchronous orchestration
    types.ts                   packet, plan, processing, and Workshop call contracts
    usage.ts                   per-call token/time records and aggregation
    workshopModelCalls.ts      deterministic preview planning/processing adapters
  lib/                         ported context, prompt, handoff, and formatting helpers
reference/
  ChapterGenerationInspector.tsx   unchanged raw-JSON inspector (technical comparison)
development/
  ChapterGenerationTestFlow.tsx    primary select/upload/model/manifest/read flow
  ChapterGenerationWorkspace.tsx   four-stage Diagnostics workspace
  ManifestedChapterView.tsx        prose/dialogue/system-panel/effect-marker rendering
  workspaceUi.tsx                  shared cards, disclosures, chips, copy controls
  chapterGenerationWorkspace.test.tsx
server/chapter-generation/
  config.ts                    environment-only model allow-list
  provider.ts                  server-only Gemini provider and usage capture
  modelCalls.ts                Plan, Manifest, Process, and conditional Repair adapters
  execute.ts                   adapter, code-only packet assembly, and async pipeline
  http.ts                      safe GET/POST HTTP boundary
api/chapter-generation.ts      deployed serverless entry point
```

## Preserved and intentionally changed behavior

The ported context preparation, contract, prompt, accessibility, Cultural Prose,
glossary, and effect-formatting owners remain the packet's source of truth. Their
normalized text behavior is preserved when the same inputs reach them.

The old ten-stage normalized behavior hashes are intentionally not a compatibility
target: the stage topology, structured plan, processing result, and call boundaries
changed by design in Pass 2. No prompt content was rewritten to simulate the new
architecture.

## Workshop boundaries

- Development makes live Gemini calls only through the server; credentials and the
  configured model allow-list never enter browser code.
- No database, persistence, R2, credit, queue, notification, Story Library, Reader,
  reward, publishing, or production-data write was added.
- No real `LivingStoryState` update or chapter advancement is committed.
- One chapter is the complete scope. There is no sequential handoff or multi-chapter run.
- No unresolved Story Seed world-rule, glossary, Cultural Prose style, accessibility,
  chapter-title, chapters-per-arc, or legacy Fate vocabulary mapping is inferred.
- Blueprint `status` is optional and free-form, so Pass 1 defines test eligibility
  by strict completeness of the current Blueprint fields rather than a guessed status label.

## Validation

- `npm run test:chapter-generation`
- `npm run test:story-seed`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run validate:chapter-effects`

Focused tests cover the canonical adapter and its no-fixture-fallback rule, model
allow-list selection, exact three-call and five-call boundaries, code-only packet
assembly, token aggregation and estimated-usage labels, provider/API failure
handling, immutable input state, and the readable live-output/Diagnostics UI.

## Workshop history

- **2026-07-31:** Created the Reference replica and Development fork from the inspected production flow.
- **2026-08-08:** Pass 1 introduced Story Constitution, Living Story State, Chapter Mission, and Generation Rules with a complete 65-ID trace and nine explicit unresolved flags.
- **2026-08-08:** Pass 1 centralized shared packet-backed context assembly across both generation adapters.
- **2026-08-08:** Pass 2 replaced both ten-step orchestrators with one real four-stage pipeline and three normal call boundaries plus conditional repair/reprocessing.
- **2026-08-08:** Pass 3 rebuilt the Development pane as a readable Chapter Generation workspace (Permanent Story Rules, four run steps, collapsed Technical Details) consuming the structured `ChapterPipelineRun` directly; the Reference inspector is unchanged.
- **2026-08-08:** Pass 3 usability: the run became a sticky four-stage stepper showing one stage at a time (Manifested Chapter by default, with the main reading space), Permanent Story Rules collapsed to a compact digest closed by default, and copy controls now report clipboard success/failure truthfully.
- **2026-08-09:** Chapter Generation 1.0 Pass 1 connected finalized Story Seed v3 and World Blueprint artifacts to the existing packet contracts, added server-side Gemini Plan/Manifest/Process calls with conditional repair, exposed per-stage token/time usage, and made the one-chapter test harness the primary Development experience while retaining the four-stage workspace as Diagnostics.

## Transfer notes

Copy or adapt these exact portable files into the source application's generation
service:

- `src/components/chapter-generation/shared/packets/assemblePacketContext.ts`
- `src/components/chapter-generation/shared/packets/assembly.ts`
- `src/components/chapter-generation/shared/packets/chapterMission.ts`
- `src/components/chapter-generation/shared/packets/generationRules.ts`
- `src/components/chapter-generation/shared/packets/index.ts`
- `src/components/chapter-generation/shared/packets/livingStoryState.ts`
- `src/components/chapter-generation/shared/packets/storyConstitution.ts`
- `src/components/chapter-generation/shared/packets/storySeedChapterAdapter.ts`
- `src/components/chapter-generation/shared/packets/types.ts`
- `src/components/chapter-generation/shared/pipeline/assembleChapterPacket.ts`
- `src/components/chapter-generation/shared/pipeline/chapterEffectRules.ts`
- `src/components/chapter-generation/shared/pipeline/index.ts`
- `src/components/chapter-generation/shared/pipeline/runChapterPipeline.ts`
- `src/components/chapter-generation/shared/pipeline/runChapterPipelineAsync.ts`
- `src/components/chapter-generation/shared/pipeline/usage.ts`
- `src/components/chapter-generation/shared/pipeline/types.ts`

Reuse the source application's existing context, prompt, handoff, Story Seed, and
chapter types for the imported `shared/lib/*` and `shared/types.ts` dependencies.
Reuse the source application's authenticated provider router when transferring the
three model calls and optional repair; keep this Workshop's API handler and UI out
of production until the production generation service explicitly adopts the flow.

Do not copy
`src/components/chapter-generation/shared/pipeline/workshopModelCalls.ts`,
`src/components/chapter-generation/shared/assembleGeneration.ts`,
`src/components/chapter-generation/shared/assembleGenerationDev.ts`,
`src/components/chapter-generation/shared/stageTypes.ts`, fixtures, inspectors,
Development workspace views, preview controls, or `GenerationStage` serialization;
those are Workshop-only.
