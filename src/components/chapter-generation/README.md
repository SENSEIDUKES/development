# Chapter Generation

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Source location:** `src/hooks/chapterPipeline/chapterBatch.ts`, `src/aiRouter.ts`, `src/server/routes/storyRouter.ts`, and the Story Seed, prompt, handoff, formatting, and context dependencies
- **Workshop preview:** `?preview=chapter-generation-flow`
- **Replica created:** 2026-07-31
- **Last Workshop update:** 2026-08-14
- **Last source comparison:** 2026-08-09
- **Replica status:** Chapter Generation 1.0 recovery restores the proven one-chapter Plan → Manifest → Process boundary and opens its accepted result in the current Reader Chamber and Reader Codex

## Purpose

This Workshop entry proves real Chapter Generation 1.0 runs without creating a
second Story Seed contract. Development accepts a saved or uploaded portable Story
Seed v3 artifact with its sibling `WorldBlueprint`, adapts those canonical objects
into the existing four packet contracts, and calls Gemini through a same-origin,
server-only provider boundary. No fixture value is used to fill a missing mapping.

Pass 2's Development implementation is
`src/components/chapter-generation/shared/batch/chapterBatch.ts`. Its exported
`runFiveChapterBatch` preserves strict chapter ordering, clean pre-chapter checkpoints,
and retry-without-advancement invariants while leaving the verified production
`runSequentialChapterBatch` implementation untouched. Five-chapter runs remain
disposable client-held test state. Each chapter crosses the existing server boundary
in its own request, and only the final processed result can create the next chapter's
artifact-bound, server-signed continuation.

The primary Development experience is a small test harness: select or upload the
artifact, enter the separately configured Development access token, choose a
server-configured model, optionally add a temporary instruction,
manifest one chapter or five connected chapters, read any completed result, and
inspect per-call, per-chapter, and batch token usage. The
existing four-stage workspace remains available in a collapsed Diagnostics section.
Reference remains the locked deterministic inspector.

The same temporary session can export the selected chapter as Markdown, every
completed chapter and the stop point as batch Markdown, or the safe structured run
data as JSON. The run data includes the source artifacts, packets, plans, final prose,
processed state, diagnostics, token usage, and timing, but excludes bearer tokens,
server keys, continuation proofs/signatures, provider causes, and stack traces.

After one direct chapter completes, `Read in Reader Chamber` adapts that accepted
result into a disposable one-chapter session using the existing Reader Chamber and
complete Reader Codex. The Codex receives the processed Living Story State snapshot
for that chapter. The existing five-chapter Reader path remains separate: it still
opens only after all five chapters complete, and the Pass 2 sequencer and exact-five
completion guard remain unchanged.

The Reader compatibility adapter carries the permanent power-system definition and
evolving abilities alongside characters, factions, locations, artifacts, and
active/resolved mysteries. Story Seed and baseline Process records receive Reader IDs
and Reader-shaped fields only at this boundary. The generator does not reconcile or
rewrite entity identity. The Codex receives a chapter-scoped arc view, so its timeline
cannot reveal later completed chapters even though Reader navigation still retains
the complete batch.

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

The result is one `ChapterPlan`. Gemini returns the creative decisions plus the exact
requested chapter number and arc position; the parser rejects a mismatch and retains
the model-returned recent rhythm history. Code keeps canonical Fate configuration
authoritative. No unapproved legacy `FatePressureTier` mapping is inferred.

### 3. Manifest Chapter

One writing call receives the complete Chapter Packet, the `ChapterPlan`, and the
consolidated permanent writing and formatting instructions. The restored `9f90f95`
boundary accepts the original NDJSON block contract: Gemini supplies each unique block
ID, paragraph/dialogue type, prose text, and any supported optional presentation
metadata. The parser joins readable blocks into the chapter without introducing a
normalizer, generated IDs, technical status, or a word-count acceptance rule. Manifest
does not generate anchors, mutate story state, or advance the chapter counter.

Card output keeps the existing block structure. Human Portraits, Non-Human
Portraits, Artifacts, and Locations use `metadata.entities` reveal moments so
the Reader can resolve application-owned Codex identity and stored media.
`worldCard` accepts only highlighted creature or Faction moments that do not
belong on a visual Codex Card. System and Fate content continues through the
structured `system` object and System Panels. The model is never asked for a
Codex ID, media ID, storage key, or image URL.

### 4. Process Result

One structured processing call inspects the manifested chapter and proposes:

- new anchors
- character and world-state changes
- current power/ability changes and structured character, faction, location, and artifact updates
- completed, changed, and unresolved threads
- mission completion evidence
- continuity and repetition findings
- the next-chapter handoff
- continuity-supported content changes for the next `LivingStoryState`

Code validates the original structured proposal, merges model-provided positive thread
origins with current unresolved threads, applies the original simple record/value merge,
and constructs the cloned next-state candidate for the next disposable batch checkpoint.
No stable-identity reconciliation or contradiction rejection runs in generation. The
candidate carries structured updates plus an explicit change ledger for anything not
yet owned by a permanent Codex schema. The input state and chapter position remain
unchanged across normal runs and retries. A separate repair call is allowed only when
processing reports a serious finding and recommends repair.

## Sequential five-chapter flow

`Manifest 5 Chapters` coordinates exactly five chapter-sized requests. Chapters never
run concurrently. After each accepted result, the server builds the next Chapter
Mission from the processed handoff, immediate next action, active tension, unresolved
threads, and `WorldBlueprint.firstArcPromise`. The batch instruction is copied into
each mission, while the proposed Living Story State carries chapter context, position,
anchors, fingerprints, rhythm, threads, character state, abilities, Codex-like records,
and the explicit change ledger.

If repair occurs, the repaired chapter is processed again before its state is eligible
for continuation. If the final processing result still has a serious continuity or
repetition finding, or if the request fails, the batch pauses. `Retry Chapter` uses the
unchanged pre-chapter continuation and does not advance or duplicate completed state.

Normal five-chapter completion is 15 model calls. Each repaired chapter adds two calls
(Repair and reprocessing). A retry adds only the calls actually performed during that
attempt; all available usage remains in the batch total.

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
  batch/
    chapterBatch.ts           disposable sequencing, continuation, checkpoint, retry, and totals
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
  SingleChapterReaderSession.tsx   disposable current Reader/Codex composition for one accepted result
  ChapterGenerationWorkspace.tsx   four-stage Diagnostics workspace
  ManifestedChapterView.tsx        prose/dialogue/system-panel/effect-marker rendering
  workspaceUi.tsx                  shared cards, disclosures, chips, copy controls
  chapterGenerationWorkspace.test.tsx
server/chapter-generation/
  config.ts                    environment-only model allow-list
  provider.ts                  server-only Gemini provider and usage capture
  modelCalls.ts                Plan, Manifest, Process, and conditional Repair adapters
  execute.ts                   adapter, code-only packet assembly, and async pipeline
  http.ts                      safe GET/POST chapter-sized HTTP boundary
  vercelHandler.ts             typed Vercel adapter with NDJSON stage progress
api/chapter-generation.js      deployed shim for the generated server bundle
scripts/buildChapterGenerationApi.mjs
                               bundles the server graph without changing shared ESM imports
```

## Preserved and intentionally changed behavior

The ported context preparation, contract, prompt, accessibility, Cultural Prose,
glossary, and effect-formatting owners remain the packet's source of truth. Their
normalized text behavior is preserved when the same inputs reach them.

The old ten-stage normalized behavior hashes are intentionally not a compatibility
target: the stage topology, structured plan, processing result, and call boundaries
changed by design in the earlier four-stage reconstruction. No prompt content was rewritten to simulate the new
architecture.

## Workshop boundaries

- Development makes live Gemini calls only through the server. The Gemini credential
  never enters browser code; a separate `CHAPTER_GENERATION_ACCESS_TOKEN` authorizes
  each POST and is held only in page memory after the tester enters it.
- Calls that complete before a later structured-output failure still return their
  provider-reported or estimated token/time records for diagnosis.
- Five-chapter state, checkpoints, chapters, attempts, and token totals exist only in
  page memory and are discarded on refresh or input replacement.
- Chapter length remains a prompt-only target. The recovery path neither enforces the
  2,000-word minimum nor makes word count part of result acceptance.
- No database, persistence, R2, credit, queue, notification, Story Library, Reader,
  reward, publishing, or production-data write was added.
- No real `LivingStoryState` update or chapter advancement is committed.
- Pass 2 stops after five sequential chapters; it adds no general queue or production batch service.
- No unresolved Story Seed world-rule, glossary, Cultural Prose style, accessibility,
  chapter-title, chapters-per-arc, or legacy Fate vocabulary mapping is inferred.
- Blueprint `status` is optional and free-form, so Pass 1 defines test eligibility
  by strict completeness of the current Blueprint fields rather than a guessed status label.

## Live one-chapter recovery acceptance

On **2026-08-13**, the recovery branch was built and deployed to an isolated,
protected Vercel Preview, then exercised through the actual Development UI with the
portable `seihouse_story_seed_timeless.json` Story Seed v3 + World Blueprint export
and the configured `google/gemini-3.1-flash-lite` provider path.

The first operational attempt completed Plan and then received Gemini HTTP 503
`UNAVAILABLE` before Manifest returned any payload; Vercel's server-only log identified
temporary model demand as the cause. One manual rerun on the same artifact and model
then completed the normal three-call path without repair:

- Plan Chapter: 7.7 seconds
- Manifest Chapter: 11.6 seconds
- Process Result: 4.1 seconds
- final output: 20 readable NDJSON prose blocks
- observational whitespace count: 1,083 words (reporting only; not an acceptance rule)
- proposed state: advanced to `Arc 1 — Chapter 2/100`, retained three positive-origin
  unresolved threads, appended the recent chapter context and handoff, and exposed
  supported character, faction, location, artifact, and ability memory
- Reader/Codex: the live result opened through `Read in Reader Chamber`; the current
  Reader rendered the prose and the complete Reader Codex rendered Chapter 1's seed
  and processed story state with no future-chapter data

Chapter length remains intentionally unresolved. This recovery neither enforces the
2,000-word minimum nor adds a retry, fallback, normalizer, identity pass, or model call.

## Validation

- `npm run test:chapter-generation`
- `npm run test:story-seed`
- `npx vitest run src/components/reader-chamber/shared/batchToReaderAdapter.test.ts src/components/chapter-generation/development/SingleChapterReaderSession.test.tsx src/components/chapter-generation/development/FiveChapterReaderSession.test.tsx src/components/reader-codex/development/ReaderCodex.test.tsx src/components/reader-codex/shared/codexHighlighting.test.ts`
- `npx tsc -b --pretty false`
- `npm run build`
- `npm run validate:chapter-effects`
- `vercel build --yes`

Focused tests cover the canonical adapter and its no-fixture-fallback rule, model
allow-list selection, exact three-call and five-call boundaries, code-only packet
assembly, token aggregation and estimated-usage labels, provider/API failure
handling, immutable input state, and the readable live-output/Diagnostics UI.
Pass 2 adds strict non-concurrency, processed-state handoff, mission/counter advance,
structured character/world carry-forward, repaired-result continuation, serious/failure
pause behavior, clean-checkpoint retry, complete attempt usage totals, and one-request-
per-chapter coverage.

## Workshop history

- **2026-07-31:** Created the Reference replica and Development fork from the inspected production flow.
- **2026-08-08:** Pass 1 introduced Story Constitution, Living Story State, Chapter Mission, and Generation Rules with a complete 65-ID trace and nine explicit unresolved flags.
- **2026-08-08:** Pass 1 centralized shared packet-backed context assembly across both generation adapters.
- **2026-08-08:** Pass 2 replaced both ten-step orchestrators with one real four-stage pipeline and three normal call boundaries plus conditional repair/reprocessing.
- **2026-08-08:** Pass 3 rebuilt the Development pane as a readable Chapter Generation workspace (Permanent Story Rules, four run steps, collapsed Technical Details) consuming the structured `ChapterPipelineRun` directly; the Reference inspector is unchanged.
- **2026-08-08:** Pass 3 usability: the run became a sticky four-stage stepper showing one stage at a time (Manifested Chapter by default, with the main reading space), Permanent Story Rules collapsed to a compact digest closed by default, and copy controls now report clipboard success/failure truthfully.
- **2026-08-09:** Chapter Generation 1.0 Pass 1 connected finalized Story Seed v3 and World Blueprint artifacts to the existing packet contracts, added server-side Gemini Plan/Manifest/Process calls with conditional repair, exposed per-stage token/time usage, and made the one-chapter test harness the primary Development experience while retaining the four-stage workspace as Diagnostics.
- **2026-08-09:** Protected the live Development model boundary with a separate server-configured bearer token, preserved omitted Blueprint threads during Process Result, and retained completed-call usage when a later stage fails.
- **2026-08-09:** Chapter Generation 1.0 Pass 2 added a disposable five-chapter sequence using five separate chapter-sized requests, authoritative processed-state handoffs, explicit change/Codex carry-forward, truthful live stage progress, pause/retry checkpoints, and per-chapter plus complete-batch token totals.
- **2026-08-09:** Bound disposable continuations to their exact Story Seed and Blueprint with a server-only signature, added cancellation and request timeouts for batch calls, and tightened accessibility, carry-forward ordering, and checkpoint coverage during PR review.
- **2026-08-10:** Pass 3 connected completed five-chapter batches to the existing Reader Chamber through the batch adapter, added chapter-scoped cumulative Reader Codex snapshots, chapter/batch/repair/retry token visibility, five-chapter export, and selected-chapter access to the existing four-stage Diagnostics without adding persistence.
- **2026-08-10:** Corrected the live Plan prompt's fixed Chapter 1 schema example so Chapters 2–5 receive their exact chapter number and arc position, added chapter/stage/field-level safe failures with detailed server-only causes, clarified paused-batch retention, added Markdown/JSON review exports, and exposed the seven-part estimated input-token breakdown for every provider stage.
- **2026-08-12:** Aligned Story Seed, World Blueprint, Process Result, and Living Story State with the imported Reader Codex through the existing adapter; preserved aliases and stable entity identity, carried power/ability/mystery state, and prevented later chapter timeline data from entering earlier Codex snapshots without changing prompts, sequencing, retries, checkpoints, diagnostics, or exports.
- **2026-08-12:** Stabilized Plan → Manifest → Process without adding a model call: code now owns chapter/arc facts, block and entity IDs, thread provenance, word counts, state construction, and technical status; Manifest preserves readable prose while warning on recovered formatting or removed optional enrichment; Blueprint descriptions normalize into canonical entity identity; under-length candidates remain reviewable and exportable; sequencing, repair, checkpoints, Reader, Codex, diagnostics, and safe exports remain intact.
- **2026-08-13:** Recovery branch restored the proven `9f90f95` Plan, Manifest, and Process contracts; removed live-path Manifest normalization and generation-time identity reconciliation; restored positive Blueprint thread origins; and added an isolated one-chapter adapter/session that opens the accepted result in the current Reader Chamber and complete Reader Codex without changing five-chapter sequencing.
- **2026-08-13:** Verified the recovery with the real Timeless Story Seed/Blueprint export on Gemini 3.1 Flash Lite: one manual rerun after a logged provider-demand 503 completed Plan → Manifest → Process, rendered 1,083 words, advanced a valid proposed state, and opened the same live result in the current Reader and Reader Codex.
- **2026-08-14:** Applied the first Part Three card contract cleanup without changing Plan → Manifest → Process: visual Codex categories use metadata reveals, World Cards accept only highlighted creatures/Factions, System/Fate stay on System Panels, and model-owned card IDs or image URLs are discarded.

## Transfer notes

Copy or adapt these exact portable files into the source application's generation
service:

- `src/components/chapter-generation/shared/packets/assemblePacketContext.ts`
- `src/components/chapter-generation/shared/packets/assembly.ts`
- `src/components/chapter-generation/shared/packets/chapterMission.ts`
- `src/components/chapter-generation/shared/packets/generationRules.ts`
- `src/components/chapter-generation/shared/packets/index.ts`
- `src/components/chapter-generation/shared/packets/livingStoryEntityIdentity.ts`
- `src/components/chapter-generation/shared/packets/livingStoryState.ts`
- `src/components/chapter-generation/shared/packets/storyConstitution.ts`
- `src/components/chapter-generation/shared/packets/storySeedChapterAdapter.ts`
- `src/components/chapter-generation/shared/packets/types.ts`
- `src/components/chapter-generation/shared/batch/chapterBatch.ts`
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
