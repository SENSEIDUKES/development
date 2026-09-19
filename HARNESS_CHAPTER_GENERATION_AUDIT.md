# HARNESS Chapter Generation Audit

**Date:** 2026-09-19
**Scope:** Investigation only. No code, prompt, schema, skill, or data was changed.
**Repository state:** `SENSEIDUKES/development` at `1507225` (merge of #229, "Install official CAPA SPP defaults").

## How to read this report

- **Verified** means I read the exact file and line that produces the behavior, or an
  archived instruction/commit that states the intention. Citations are `path:line`.
- **Inference** means the mechanism is verified but the causal link to the reported
  symptom is reconstructed rather than observed. Every inference is labeled.
- Old Chapter Generation (`src/components/chapter-generation/`,
  `src/server/chapter-generation/`) is treated as **evidence of intention**, not as a
  target to restore. Several of its systems never worked either, and this report says
  so where that is true.
- The case study is the two-chapter *Shatter All Immortals!* HARNESS export. That export
  is not committed to this repository, so its numbers are taken as reported and traced
  to the code that produces them.

---

## 1. Executive summary

Five findings account for essentially all of the reported symptoms, and they are
**causally ordered**. Four of the five are downstream of the first.

1. **HARNESS has no chapter-scale instruction and no chapter-scale measurement.**
   The words "word", "length", "paragraph count" appear nowhere in the HARNESS
   authoring contract, the Immediate Chapter Request, the official CAPA Author skill,
   or the official CAPA Pacing skill. The 2,000-word floor that exists in shared code
   is *explicitly skipped* by HARNESS acceptance
   (`src/components/harness-generation/shared/responseAcceptance.ts:193`). HARNESS also
   never records a word count anywhere. A 304-word chapter is, to the current system,
   indistinguishable from a 2,500-word one.

2. **Paragraph structure is requested but never verified, and a chapter that arrives
   as one paragraph becomes exactly one SEN block.**
   `splitHarnessProseParagraphs` splits only on blank lines
   (`shared/chapterSignals.ts:238-242`). There is no fallback, no repair, and no
   warning for a one-block chapter. Everything downstream treats "block" as the unit
   of meaning.

3. **The block is the ownership unit for dialogue, so one block means one speaker for
   the whole chapter.** `applyHarnessChapterSignals` sets `block.type = 'dialogue'` and
   `metadata.speakerName` on the *entire* block containing a dialogue anchor
   (`shared/chapterSignals.ts:383-397`). With one block, the first dialogue signal
   converts the whole mixed chapter into Iron-Hand Chen's dialogue block, and every
   later dialogue signal in that block is silently discarded (the `if (!block.type)`
   guard). This is the single most damaging structural defect in the system.

4. **Anchor uniqueness is evaluated per block and per chapter, so a single giant block
   maximizes false "ambiguous" rejections, while manifestations and media pile onto
   that one block.** `resolveAnchor` (`shared/chapterSignals.ts:267-282`) drops a signal
   whose anchor appears in more than one block, or more than once inside its block for
   positional families. Manifestations accumulate on `blocks[anchor.index].metadata.entities`
   (`:399-405`), and a block carries at most one soundscape (`:422-434`) and one creature
   event (`:407-420`). Soundscape resolution is per block
   (`src/narrative/acceptedChapterMedia.ts:28-45`), so one block yields at most one
   soundscape per chapter.

5. **Context is duplicated four times over by construction, and the selection audit is
   itself sent to the model.** The same extracted memory reaches the prompt as chapter
   events, as `committedDevelopments`, as `canonicalEvidence` records, and again as the
   `deterministicHandoff` — each carrying the same verbatim `evidence` passage. On top of
   that, `selectionAudit.included` / `omitted` (one entry per item, each with a long
   `reason` sentence) is serialized into the user prompt
   (`src/server/harness-generation/prompt.ts:229-237`). Nothing deduplicates, nothing
   caps a section, and canonical records are never merged per entity.

Separately: **the narrative rhythm system exists, is complete, and is disconnected.**
`src/components/chapter-generation/shared/lib/sceneRhythm.ts` implements a full
deterministic chapter-function sequencer. Its own header says "no production code path
reads from this file yet" (`:11`). The live server planner never calls
`selectNextScenePath` (0 references in `src/server/chapter-generation/modelCalls.ts`),
and the canonical Story Seed adapter deliberately leaves `fatePressureTier: undefined`
(`shared/packets/storyConstitution.ts:122`), so Fate pressure cannot weight rhythm for
any real story. HARNESS has no rhythm concept at all.

**The ordering that matters:** fix scale and paragraph structure first. Precise dialogue,
precise manifestations, precise System Panels, and precise media are all *impossible* to
land correctly while the chapter is one block, because the block is the addressing unit
for all of them.

---

## 2. Symptom-to-source trace (case study)

| Reported symptom | Traced source | Confidence |
| --- | --- | --- |
| Chapter 1 = 426 words, Chapter 2 = 304 words | No length target anywhere in the CAPA Prompt, `HARNESS_RESPONSE_CONTRACT`, or Immediate Chapter Request; `under-minimum-word-count` explicitly skipped at `responseAcceptance.ts:193`; no word count persisted | Verified |
| One block per chapter | Gemini returned prose with no blank lines; `splitHarnessProseParagraphs` (`chapterSignals.ts:238`) returns a single element; no validation or repair | Verified (mechanism); Inference (that Gemini specifically omitted `\n\n`, since the export is not in-repo) |
| Chapter 2 became an Iron-Hand Chen dialogue block | `applyHarnessChapterSignals` dialogue loop stamps the whole containing block (`chapterSignals.ts:389-396`); with one block the first dialogue signal owns the chapter | Verified |
| Valid-looking signals rejected | `resolveAnchor` "ambiguous" rule (`chapterSignals.ts:275-280`) — an anchor repeated anywhere in a one-block chapter is positionally ambiguous; a phrase in two blocks is also ambiguous | Verified |
| Chapter 2 referenced an anchor from Chapter 1 | The contract says anchors are "copied verbatim from prose" (`prompt.ts:164`) but never says *from the prose you are writing in this reply*; Chapter 1's full prose is in the packet as `priorChapters[].prose` (`prompt.ts:193-196`). HARNESS correctly drops it as `missing` | Verified (contract gap + drop path); Inference (that this is why the model reached back) |
| Manifestations accumulated on one giant block | `chapterSignals.ts:399-405` appends every manifestation to `blocks[anchor.index].metadata.entities` | Verified |
| Dialogue/media "applied to an entire mixed block" | Same block-as-unit ownership; media resolution is per block (`acceptedChapterMedia.ts:28-45`) | Verified |
| ~7,483 context tokens after one 426-word chapter | Fourfold evidence duplication + Seed/Blueprint snapshot + serialized selection audit; see §6 | Verified (each duplication path); Inference (the exact arithmetic) |
| Chinese Style SPP and chapter-to-chapter continuity worked | Style skill is a single instruction block assembled into the CAPA Prompt (`shared/skills.ts:177-185`); continuity comes from the protected latest-chapter rule (`shared/context.ts:148-157`) | Verified |
| Memory extraction worked but produced repetitive/fragmented records | One canonical record per event per handler (`shared/capabilities.ts:108`), never merged or superseded by a later record for the same `entityId` (`shared/canonicalState.ts:4-11`) | Verified |

---

## 3. Area: Chapter scale

| Field | Finding |
| --- | --- |
| **Original intention** | A serialized web-novel chapter is a substantial unit: **2,500-word default target, 2,000-word absolute minimum, 60–100 paragraphs**, explicitly anti-summary ("Do NOT write a short 400-word summary"). Verified at `src/components/chapter-generation/shared/lib/chapterPrompts.ts:135-143`. The floor was also a **code constant**, not just prose: `MINIMUM_CHAPTER_WORD_COUNT = 2_000` (`src/narrative/manifestNormalizer.ts:8`). |
| **Old implementation** | The directive was embedded in `CHAPTER_PROMPTS.userPrompt`, which became `baseUserPrompt` (`shared/packets/assemblePacketContext.ts:91-104`), folded into `modelVisibleContext` (`pipeline/assembleChapterPacket.ts:61-66`), and delivered to the Manifest Chapter call (`src/server/chapter-generation/modelCalls.ts:1333-1338`). `normalizeManifestResponse` counted words and emitted an `under-minimum-word-count` warning plus a `needs-review` status (`manifestNormalizer.ts:886-905`). **It was never enforced.** The old README says so twice: "Chapter length remains a prompt-only target. The recovery path neither enforces the 2,000-word minimum nor makes word count part of result acceptance" (`chapter-generation/README.md:304-305`) and "Chapter length remains intentionally unresolved" (`:339`). |
| **Did it vary by setting/model/genre/mode?** | **No.** There is exactly one length directive in the repository and it is unconditional. Genre, Story Style, Cultural Prose, accessibility, and Fate Survival all flow into the packet as *qualitative* instructions. `maxOutputTokens` is identical in both systems (16,384 default; `src/server/chapter-generation/config.ts:70-73`, `src/server/harness-generation/config.ts:55-58`) and both default to the same model, `google/gemini-3.1-flash-lite`. Verified. |
| **Old actual result** | The one recorded live run produced **1,083 words across 20 NDJSON blocks** against the 2,500-word target (`chapter-generation/README.md:329-340`). The old system missed its own target by more than half, with the same model. Verified. |
| **Current HARNESS state** | No length instruction exists. `HARNESS_RESPONSE_CONTRACT` (`src/server/harness-generation/prompt.ts:151-174`) describes the JSON envelope, arc completion, signal families, and author authority — never chapter size. `presentImmediateChapterRequest` (`:249-257`) says only "Write Chapter N" plus the steering assignment. The official CAPA Author SPP says "complete, highly descriptive and immersive chapters" with no number; the official CAPA Pacing SPP is entirely qualitative. Verified by extracting `src/workshop/previews/harness-generation/official-capa/CAPA-AUTHOR.spp` and `CAPA-Pacing.spp`. |
| **Provider output limits** | Not the constraint. `maxOutputTokens` defaults to 16,384 (`harness-generation/config.ts:55-58`), roughly 12,000 words. A 426-word chapter uses about 4% of it. Verified. |
| **Verified problem** | (a) No target is communicated. (b) The one existing floor is *deliberately suppressed* for HARNESS: `responseAcceptance.ts:193` reads `if (warning.code === 'under-minimum-word-count') continue;`. (c) HARNESS never computes or stores a word count — `grep wordCount` across `src/narrative/generation.ts` and all of `harness-generation/` returns nothing. The system is blind to the symptom. (d) The only documented HARNESS-era norm is *small*: the 50-chapter continuation evaluation used "compact chapters requested at 400–600 words" and produced 19,969 words over 50 chapters (`CONTINUATION_EVALUATION.md:28-30`). The current 304–426 output is the system behaving exactly as its evidence base was tuned. |
| **Inference** | The JSON response mode contributes. HARNESS requests `responseMimeType: 'application/json'` with a `responseJsonSchema` (`provider.ts:55-56`); the old Manifest call used `responseFormat: "text"` with NDJSON (`modelCalls.ts:1333-1342`). Constrained JSON decoding on a *-flash-lite* model tends to compress free-text fields and to under-emit literal `\n\n` inside a string. This is consistent with both the shortness and the single-paragraph shape, but I did not run a controlled comparison. |
| **Recommendation** | **Adapt.** Preserve the *intention* (a substantial serialized chapter with an enforced floor and an inspectable count). Do not restore the literal 2,500/2,000/60–100 numbers as a hard contract — the old system never hit them, and a rigid global number fights the Pacing Skill's job. Give HARNESS: (1) a declared target range that lives in Story Information, not in a CAPA skill, so Pacing can shape *within* it; (2) a computed, persisted `wordCount` and `paragraphCount` on every committed chapter; (3) stop suppressing the existing floor warning — surface it as an inspectable diagnostic, not a hard rejection, so prose is never lost. |

---

## 4. Area: Paragraph and dialogue structure

### 4.1 The full pipeline trace

```
Gemini reply (JSON, prose: "…")
  └─ acceptHarnessModelResponse            responseAcceptance.ts:233
       ├─ parseJsonObject                   :60    (or recoverPlainProse :84)
       ├─ prose = parsed.prose               :244   ← authoritative, never rewritten
       ├─ readHarnessChapterSignals          chapterSignals.ts:209  (per-family validation)
       ├─ splitHarnessProseParagraphs        chapterSignals.ts:238  ← THE BREAK POINT
       ├─ applyHarnessChapterSignals         chapterSignals.ts:359  (anchor → block metadata)
       ├─ normalizeManifestResponse          manifestNormalizer.ts   (SEN block IDs, validation)
       └─ acceptChapterMedia                 acceptedChapterMedia.ts:18 (per-block resolution)
  └─ controller.acceptRawResponse           controller.ts:710  → checkpoint 'prose_accepted'
  └─ commit + persist                       controller.ts (atomic chapter append)
  └─ reload                                 repository.ts (schema-version gated)
  └─ Reader adaptation                      senAdapter.ts:136-169 (blocks copied as-is)
```

### 4.2 Findings

| Question | Finding |
| --- | --- |
| **Why did Gemini return one uninterrupted paragraph?** | The requirement is stated twice — schema field description "Paragraphs are separated by blank lines" (`prompt.ts:67`) and contract line "readable paragraphs separated by blank lines" (`prompt.ts:163`) — and **verified zero times**. The Chinese Style SPP even supplies correctly paragraphed exemplar prose. *Inference:* JSON-string output on a lite model plus no verification is the likely combination; a text-mode or NDJSON output contract would make paragraph boundaries structural rather than a character the model must remember to emit. |
| **Why did each chapter become one block?** | `splitHarnessProseParagraphs` splits on `/\n[ \t]*\n+/` only (`chapterSignals.ts:239-242`). Single-newline prose, or prose with no newlines, yields `[wholeChapter]`. There is no single-newline fallback, no sentence-group fallback, and — critically — **no warning**. A one-block chapter is accepted as healthy. Verified. |
| **How are dialogue signals matched?** | Two-step. `readDialogue` (`chapterSignals.ts:111-116`) validates `speaker` and optional `delivery`. Then `resolveAnchor(blocks, anchorText, positional=false)` (`:384`) finds the *block* containing the anchor. The signal then annotates **the whole block** (`:388-396`): `block.type = 'dialogue'`, `metadata.mode = 'dialogue'`, `metadata.speakerName = signal.speaker`, plus a cast-resolved `speakerRole` (`:297-301`). The anchor's *offset inside the block is never used*. Verified. |
| **Why did Chapter 2 become a dialogue block attributed to Iron-Hand Chen?** | Because the chapter was one block and the first accepted dialogue signal named Iron-Hand Chen. The `if (!block.type)` guard at `:389` means the first signal wins and **every subsequent dialogue signal in that block is dropped with no warning at all** — unlike the anchor failures, which at least emit `optional_chapter_structure_omitted`. Verified. |
| **Old implementation** | Structurally better. Old Chapter Generation asked the model for **one NDJSON object per paragraph**, each with `"type": "paragraph" \| "dialogue"` and its own `metadata.speakerName` / `speakerRole` (`chapterPrompts.ts:43-44`, enforced at `modelCalls.ts:1327`). Paragraph boundaries were transport-level, not a character inside a string, and a dialogue block *was* a paragraph by construction. This is the single most valuable idea in the old system. |
| **Old implementation's limits** | It also had no sub-paragraph dialogue granularity — a paragraph mixing narration and speech still carried one `speakerName`. And it never enforced the paragraph count either (see §3). So it is a better *contract*, not a solved problem. |
| **Ownership boundary** | Stated correctly in `ARCHITECTURE_VOCABULARY.md:77`: the model supplies prose and shallow anchored signals; HARNESS owns block construction, IDs, ordering, validation, and SEN structures. **The boundary is right; the transport is wrong.** Asking a model to encode paragraph boundaries as `\n\n` inside a JSON string hands HARNESS an un-recoverable input, then makes HARNESS responsible for structure it cannot derive. |
| **An existing better mechanism is already in HARNESS** | `senAdapter.ts:171-197` (the fallback used when `chapter.blocks` is absent) splits prose at **exact speech spans** and emits `narration` / `dialogue` blocks per span, refusing any quote that occurs more than once (`:177`). This is precisely the sub-block dialogue precision the acceptance path lacks. It is already written, already tested, and currently unreachable for normal chapters (`senAdapter.ts:136` takes the `blocks` branch). |
| **Verified problem** | The block is simultaneously (a) the paragraph unit, (b) the dialogue-attribution unit, (c) the System Panel unit, (d) the manifestation container, (e) the soundscape unit, and (f) the Sound Cue anchor unit. When (a) collapses to one, (b)–(f) all collapse with it. |
| **Recommendation** | **Rebuild** the prose→block boundary; **Reconnect** the span logic that already exists. Concretely: (1) make paragraph boundaries structural in the response contract (array of paragraph strings, or NDJSON like the old system) so `\n\n` cannot be lost; (2) reject or repair a chapter that yields one block for prose above a small threshold, with an explicit warning rather than silent acceptance; (3) attach dialogue metadata to the **exact anchored span**, using the `senAdapter.ts:171-197` span algorithm, splitting the block at the span exactly as System Panels already do (`chapterSignals.ts:375-380`) — never stamping a mixed block; (4) warn when a dialogue signal is dropped because its block is already typed. |

---

## 5. Area: Effects and media handoff

| Effect type | Current HARNESS handling | Verified problem |
| --- | --- | --- |
| **Manifestations** | `readManifestation` (`chapterSignals.ts:117-122`) requires `name`/`type`/`mention`; applied at `:399-405` by appending to the containing block's `metadata.entities`, deduplicated by `name+type`. | Accumulate on whichever block contains the anchor. With one block, the entire cast/world of the chapter lands on one block, destroying reveal positioning in the Reader. Verified. |
| **Dialogue metadata** | See §4. | Whole-block stamping; first-signal-wins; silent drops. Verified. |
| **Soundscapes** | `readSoundscape` (`:150-161`) → `metadata.music` + derived `atmosphereCategory`/`atmosphereTags` (`:422-434`). **One per block** — a second is dropped with a warning (`:426-429`). Resolved per block in `acceptedChapterMedia.ts:28-45`. | One block ⇒ at most one soundscape per chapter, and the chapter's scene changes are inaudible. Verified. |
| **Sound Cues** | `readSoundCue` (`:162-174`) → `metadata.audioMoments` with `triggerPhrase` and hardcoded `occurrenceIndex: 0` (`:442-446`). Uses `positional=true` anchoring. | `occurrenceIndex: 0` is only correct because ambiguous anchors were already rejected — so the correctness is bought by *discarding* cues. In a one-block chapter, any repeated phrase is positionally ambiguous, so legitimate cues are rejected. The old system let the model supply a real `occurrenceIndex` (`chapterPrompts.ts:48`), which is strictly more expressive. Verified. |
| **System Panels** | `readSystemPanel` (`:123-149`) with per-presentation requirements (fate needs `outcome`; mechanical needs `entries`; world_notice needs `body` or `entries`). `buildHarnessSystemPanel` (`:312-345`) constructs the complete SEN `SystemEvent`. Applied at `:367-381`, **splitting the block at the anchor** into before/panel/after. | This is the one family that already does the right thing: it splits the block at the exact anchor instead of stamping it. It is the working template for dialogue. One panel per block (`:371-374`). Verified as sound. |
| **Creature events** | `readCreatureEvent` (`:175-188`) → `metadata.beastEvent`, one per block (`:407-420`). | Same block-collapse issue. Verified. |
| **Exact vs ambiguous anchors** | `resolveAnchor` (`:267-282`): zero matches ⇒ `missing`; matches in >1 block ⇒ `ambiguous`; for positional families, >1 occurrence inside the single matching block ⇒ `ambiguous`. All three drop the signal with a warning and never touch prose. | The **rule is correct and was a deliberate fix** — commit `69fd7db` ("Keep memory out of Reader panels and reject ambiguous signal anchors") documents rejecting a manifestation anchored on the bare name "Lin" that appeared throughout the prose. The rule's *granularity* is the problem: it is evaluated against blocks, so one block maximizes false ambiguity, and there is no path for the model to disambiguate (no occurrence index, no surrounding context). Verified. |
| **Resolver selection** | `acceptChapterMedia` (`acceptedChapterMedia.ts:18-57`) resolves Sound Cues through `resolveChapterAudioMoments` and soundscapes through `resolveAuthorizedSoundscape` against the frozen Media Loadout catalog, then **strips the model's `audioMoments` proposal** from persisted metadata (`:47-53`). | Sound. The freeze/resolve/strip boundary is correct and well documented (`MEDIA_LOADOUT.md:50-74`). Verified as sound. |
| **Reader delivery** | `senAdapter.ts:136-169` copies HARNESS blocks, `audioMoments`, and `soundscapes` into the Reader chapter unchanged, adding a speaker only where the writer left one out and the quote is uniquely anchored (`:140-153`). | Faithful. It inherits every upstream defect and adds none. Verified as sound. |

**Why valid-looking signals were rejected — the three distinct causes, all verified:**

1. *Anchor mismatch from JSON round-tripping.* `resolveAnchor` uses `block.text.includes(anchorText)`
   with no normalization. Prose and anchor are both JSON strings; any difference in curly vs
   straight quotation marks, non-breaking space, or trailing punctuation causes `missing`. The
   contract asks for "the same characters, punctuation, and quotation marks" (`prompt.ts:164`) —
   an exactness requirement with no tolerance and no repair.
2. *False ambiguity from block collapse.* One block ⇒ every positional signal whose phrase
   repeats anywhere in the chapter is dropped.
3. *Strict per-family validation.* A `mechanical` System Panel with no `entries` is rejected
   outright (`chapterSignals.ts:142`), as is any `fate` panel with no `outcome` (`:141`), and any
   signal with an unrecognized enum value (`:127-131`). These rejections are individually
   defensible; collectively they make partial signals worthless rather than degraded.

**Recommendations for this area:**

- **Preserve:** the freeze → anchor-match → validate-independently → build-SEN-structures →
  resolve-media ordering; the "a dropped signal never removes prose" rule; the Media Loadout
  freeze and catalog-resolution boundary; the System Panel block-split technique.
- **Reconnect:** the old system's explicit `occurrenceIndex` (`chapterPrompts.ts:48`), which lets a
  model disambiguate a repeated phrase instead of losing the cue.
- **Adapt:** anchor matching should normalize whitespace and Unicode quotation marks before
  comparison, and should report *why* each signal was dropped in a form the Development
  inspector can show per signal (it currently emits a prose-excerpt warning string).
- **Discard:** nothing from old Chapter Generation's effect machinery. Its cards, nested
  schemas, and NDJSON metadata envelope caused the `400 INVALID_ARGUMENT` schema-complexity
  failure that the 2026-09-17 rewrite fixed (`harness-generation/README.md:39-58`). The compact
  anchored-signal contract is the right shape; it needs precise *addressing*, not a richer schema.
- **Recover as intent only:** the old system's `atmosphereCategory` vocabulary
  (`wind|crowd|waves|rain|combat|noise`) survives in HARNESS as a tag-derived field
  (`chapterSignals.ts:431-432`) rather than a first-class signal field — a minor loss of fidelity
  worth reconsidering later, not now.

---

## 6. Area: Context and memory

### 6.1 What actually entered Chapter 2's Story Information Packet

Built by `compileStoryInformationPacket` (`shared/context.ts:67-268`) and serialized by
`presentStoryInformationPacket` (`src/server/harness-generation/prompt.ts:177-246`). The
packet for Chapter 2 of a story with one committed chapter contains:

| Section | Source | Prompt location |
| --- | --- | --- |
| Original language | `story.originalLanguage` | `prompt.ts:179-180` |
| Arc goal requirement | `harnessArcContext` → full `ArcPlan` + active goal + deadline | `prompt.ts:181-182` |
| Author Story Foundation | `presentFoundation` — premise, canon, characters, cast, world facts, identities, opening setup, intended direction | `prompt.ts:183-184` |
| Explicit author changes | `canonicalContext.corrections` with target evidence | `prompt.ts:185-186` |
| **Prior chapters** | Chapter 1 **full prose** + **every event** with `description`, `category`, `subjects`, `subjectKinds`, `significance`, **`evidence`**, `facts`, `details` | `prompt.ts:193-209` |
| **Canonical evidence** | One record per event per routed handler, each with `evidence`, `label`, `facts` (which itself contains `description` — `capabilities.ts:119`) | `prompt.ts:210-222` |
| **Deterministic handoff** | `facts.description ?? evidence` for open threads, mysteries, narrative events | `prompt.ts:223` |
| **Committed developments** | The **same events again**: `description`, **`evidence`**, `evidenceVerified`, `details` | `prompt.ts:224` |
| Original evidence lookups | Excerpts from chapters outside the recent window — **empty at Chapter 2** | `prompt.ts:225` |
| Frozen Story Seed + Blueprint | `foundationRevision.input.sourceSnapshot` in full | `prompt.ts:227-228` |
| **Context coverage and omissions** | `selectionPolicy` + **the entire `selectionAudit`** (`included[]` and `omitted[]`, each entry carrying `id`, `sourceKind`, `sourceRecordIds`, `label`, a full-sentence `reason`, `estimatedTokens`) | `prompt.ts:229-237` |
| Persistent author direction | `steering[]` | `prompt.ts:238-242` |
| Mechanical continuity | `buildHarnessMechanicalContinuity` observations + up to 6 subsequent developments each | `prompt.ts:243-245` |

### 6.2 The five duplication paths (all verified)

1. **Evidence quadruplication.** A single extracted memory event's verbatim `evidence`
   passage is emitted in `priorChapters[].semanticEvents[].evidence`, in
   `committedDevelopments[].evidence`, in `canonicalEvidence[].evidence`
   (`capabilities.ts:115` sets `evidence: event.evidence ?? event.description`), and again
   in `deterministicHandoff[]` when the record qualifies (`context.ts:230-235`). Four copies
   of the same sentence, plus the *original sentence itself* in Chapter 1's full prose —
   five in total.
2. **Description duplication inside records.** `canonicalRecord` sets
   `facts: { ...event.facts, description: event.description, ... }` (`capabilities.ts:119`),
   so each record repeats its source event's description inside its own facts object,
   alongside the record's `evidence`.
3. **Fan-out per handler.** `HarnessCapabilityRegistry.processEvent` (`capabilities.ts:305-335`)
   routes one event to **multiple** handlers — a relationship event also routes to `characters`
   (`:331-334`), a deadline also routes to `plot-threads` (`:318-321`), a `details.mechanics`
   event also routes to `progression` (`:314-317`). Each handler emits its own record carrying
   the same evidence. `subjectsAsRecords` then emits **one record per subject** (`:241-253`).
   One event can easily become 3–5 records.
4. **Foundation ↔ Seed snapshot overlap.** `presentFoundation` (`prompt.ts:123-144`) emits
   premise, canon, characters, cast, world facts, and identities; the frozen
   `sourceSnapshot` (`prompt.ts:227-228`) is the Story Seed and generated Blueprint, which
   restate the same premise, characters, and world in their own words. *Inference* — the
   overlap is semantic rather than byte-identical, so its cost depends on the Seed.
5. **The audit is in the prompt.** `selectionAudit` is metadata *about* selection, one entry
   per included and omitted item, each with a full-sentence `reason` such as
   `"Selected newest first within the recent-chapter window (3), before derived records."`
   It is serialized verbatim into the user prompt (`prompt.ts:229-237`). Its cost grows
   linearly with record count and is **not counted** by `totalEstimatedTokens`, which sums only
   `included[].estimatedTokens` — each measuring its own *value*, not the audit entry
   (`context.ts:266`).

### 6.3 Why one 426-word chapter produced ~7,483 tokens

The prose itself is roughly 570 tokens. *Inference (modeled breakdown, not measured — the
export is not in-repo):* a 13-bucket extraction over a 426-word chapter typically yields
10–15 events; with fan-out that is 25–45 canonical records. At ~100–130 tokens per event
(description + a full-paragraph `evidence` + `facts` + typed subjects):

| Section | Modeled tokens |
| --- | --- |
| Foundation + frozen Seed/Blueprint snapshot | ~1,200 |
| Arc plan + goal + position | ~250 |
| Chapter 1 prose | ~570 |
| Chapter 1 events (copy 1) | ~1,400 |
| `committedDevelopments` (copy 2) | ~1,300 |
| `canonicalEvidence` records (copy 3, with fan-out) | ~1,800 |
| `deterministicHandoff` (copy 4) | ~200 |
| Selection audit (`included` + `omitted`) | ~800–1,200 |
| Mechanical continuity, steering, section headers, JSON punctuation | ~300 |
| **Total** | **~7,800** |

That lands on the reported ~7,483 without any single section being unreasonable. **The
packet is not too big because any one thing is too big — it is too big because the same
small thing is present four to five times.**

### 6.4 Does memory update entities, or create differently named duplicates?

| Mechanism | Finding |
| --- | --- |
| **Entity identity is stable for an exact label.** | `entityId = stableHarnessId('hentity', storyId, kind, label.trim().toLowerCase())` (`capabilities.ts:252`), and Foundation identities seed the same scheme (`foundation.ts:10`). So "Iron-Hand Chen" in Chapter 7 gets the same `entityId` as in Chapter 1. **This part works.** Verified. |
| **Records are appended, never merged.** | Each record's ID is per-event: `stableHarnessId('hcan', event.id, capabilityId, capabilityVersion, kind, index)` (`capabilities.ts:108`). `activeRecordsForStory` returns every non-superseded record (`canonicalState.ts:4-11`), and `supersededAt` is only ever set by an explicit **author correction** (`canonicalState.ts:149-154`) or a Foundation revision (`foundation.ts:154`). **A later chapter never supersedes an earlier record for the same entity.** After 50 chapters, a recurring character has ~50 separate "character" records, all live, all candidates for the packet. Verified — this is the "repetitive or fragmented records" symptom. |
| **Only plot threads are collapsed.** | `currentThreadRecords` (`canonicalState.ts:13-51`) keeps the latest record per `entityId` for `plot-thread` records in story order. Characters, locations, factions, artifacts, progression, mysteries, and timeline events get **no equivalent**. Verified. |
| **Name variation creates a true duplicate.** | `resolveHarnessEntity` (`capabilities.ts:64-88`) matches only by exact lowercase label, declared alias, or an explicit author `resolve-entity` correction. "Iron-Hand Chen" vs "Chen" vs "Iron Hand Chen" produce three distinct `entityId`s with no warning. The Foundation `identities[].aliases` mechanism exists to prevent this, but it requires the author to declare every variant up front. Verified. |
| **Deduplication exists only inside the packet, and only for `developments`.** | `context.ts:169-178` dedupes by `mechanics:subject:name` or `category:subjects` for a "current" pass, then **appends every non-current event after it** (`:178`). So the dedupe reorders rather than removes. Verified. |

### 6.5 Can the current selection system survive Chapters 50 and 100?

**No, and there is direct evidence.** `CONTINUATION_EVALUATION.md:63-65` records that at
Chapter 50 with *400–600-word* chapters, the context audit reached **~23,468 estimated tokens**
against a 24,000 budget, with 94 preserved events, and notes "repetitive developments still
consume space." That run saturated the budget at Chapter 50 with chapters roughly one fifth
the intended length.

Three structural reasons it gets worse, all verified:

1. **`developments` iterates every event ever committed** (`context.ts:168-188`), bounded only
   by `memoryBudget = remaining / 2` (`:166`). Growth is linear in chapter count.
2. **`canonicalRecords` iterates every live record ever created** (`context.ts:213-228`), sorted
   by `recordPriority` (open threads → unrevealed mysteries → character/relationship/location →
   faction/artifact/progression → rest), with chapter recency only as a *secondary* sort
   (`:213-214`). Once the budget saturates, selection becomes "walk the priority list until
   full" — a Chapter 3 open thread outranks a Chapter 99 character development permanently.
3. **There are no section caps.** `HarnessContextSelectionPolicy` is
   `{ recentChapterCount, maxEstimatedTokens, includeMinorEvents }` (`context.ts:9-13`) — one
   flat number. Sections compete first-come-first-served against a shared `remaining`.

**Old Chapter Generation was materially better here.** `CONTEXT_BUDGET_DEFAULTS`
(`chapter-generation/shared/lib/contextBudgeter.ts:12-26`) uses the **same 24,000 total** but
splits it into ten capped sections — `premiseAndMcState: 1500`, `chapterContract: 500`,
`anchor: 2000`, `recentFull: 6000`, `pinnedEntities: 2000`, `scoredEntities: 3000`,
`threads: 1500`, `olderRecent: 3000`, `rag: 2000`, `arcSummaries: 1000` — and supports a
**`brief` demotion tier** per entity card (`BudgetableEntityCard.briefText`,
`contextBudgeter.ts:43-52`; truncation at `entityCards.ts:200-215`) plus a relevance-scored
entity ranking. That is an entirely different class of design: a section can degrade instead
of disappearing, and no section can starve another.

**Recommendations for this area (explicitly not "raise the budget"):**

| Change | Class | Why |
| --- | --- | --- |
| Emit each piece of evidence **once**, and have the other three sections reference it by `sourceId` instead of restating it | **Rebuild** | This alone should cut the packet by roughly half; it is the single highest-value context change and requires no new subsystem. |
| Remove `selectionAudit` from the provider prompt; keep it in the Development inspector and the frozen attempt | **Reconnect** (it already lives on the attempt) | It is selection metadata; the model is explicitly told its labels "are an inventory, not additional canonical evidence" (`prompt.ts:161`), which is an admission that it does not belong there. |
| Collapse canonical records per `entityId` + `kind` to the latest supported state, exactly as `currentThreadRecords` already does for threads | **Adapt** | The algorithm exists at `canonicalState.ts:13-51`; generalize it. Keeps history in storage, sends current state. |
| Adopt per-section caps with a `brief` demotion tier | **Adapt** from `contextBudgeter.ts` | Recover the old design's *shape*, not its code — HARNESS's section set is different. |
| Make `totalEstimatedTokens` count the **serialized prompt**, not the sum of selected values | **Adapt** | The current figure is a selection estimate that omits duplication, section headers, and the audit; the contract already warns the model about this (`prompt.ts:161`), which means the number is known to be wrong. |
| Add label normalization (case, hyphenation, honorific/title prefixes) before minting a new `entityId`, with the ambiguous case surfaced as an unresolved reference rather than a silent duplicate | **Adapt** | `resolveHarnessEntity` already has an `unresolved` / `conflicted` vocabulary (`capabilities.ts:64-88`) — it is simply never reached for a near-miss name. |

---

## 7. Area: Narrative rhythm

### 7.1 Does it exist, and where?

**Yes — it exists, it is complete, and it is disconnected.**

`src/components/chapter-generation/shared/lib/sceneRhythm.ts` (149 lines) is a finished
deterministic chapter-function sequencer. Its own file header states the status plainly
(`:1-12`):

> "Workshop provider-adapter logic for now — both preview panes use it through the shared
> Stage 2 planner, while **no production code path reads from this file yet**."

| Question | Finding |
| --- | --- |
| **Complete, partial, disconnected, or unused?** | **Complete and disconnected.** All of selection, blocking, tie-breaking, explanation, anchor derivation, and history append are implemented and unit-tested. It is reachable only from the Workshop-simulated planner. Verified. |
| **What chapter types does it track?** | Exactly three: `worldBuilding`, `conflict`, `progression` (`sceneRhythm.ts:15-17`). Verified. |
| **How does recent chapter history affect the recommendation?** | A trailing window of 4 (`SCENE_RHYTHM_CONFIG.windowSize`). A type is blocked at 3 consecutive uses or 3 occurrences within the window (`:43-45`, applied `:84-91`). Ties at the top weight are broken by **longest-unused first**, then a fixed order `progression > worldBuilding > conflict` (`:99-114`) — an explicit anti-starvation guard, documented in the code comment at `:99-104`. Every selection returns a human-readable `reason` string (`:116-120`). History is appended and capped at 12 by `appendSceneType` (`:146-148`). Verified. |
| **How do Fate and survival pressure influence it?** | *By design:* `baseWeights` per `FatePressureTier` — Relaxed `{wB:3, conflict:1, progression:3}`, Balanced `{2,2,2}`, Hardcore and Dao Master `{1,3,1}` (`:37-42`). **In practice: they do not.** `storyConstitutionFromSeed` sets `fatePressureTier: undefined` with the comment "Existing generation tier. Kept separate until an approved bridge exists" (`storyConstitution.ts:55-56`, `:122`). The canonical Story Seed carries `fateSurvival: { enabled, visibility, pressure }` (`story-seed/shared/storySeedSchema.ts:73-91`) — a *different* vocabulary (`immortal`/`heaven`/…) with no mapping to the four legacy tiers. The Workshop planner therefore defaults to `"Balanced"` for every real story (`workshopModelCalls.ts:67-68`), i.e. all weights equal, i.e. **Fate pressure has zero effect on rhythm**, and the live server planner is explicitly told "Do not invent a legacy FatePressureTier when planningSignals does not provide one" (`modelCalls.ts:1222`). Verified. |
| **Where Fate *does* still act** | `fateApplies = fateSettings?.enabled && selectedScenePath?.type === 'conflict'` (`workshopModelCalls.ts:78-81`) — a gate on whether a Fate event may occur, not a rhythm weight. Verified. |
| **Does the result reach the writing prompt?** | **In old Chapter Generation, partially.** `recentSceneTypes` and the carried anchors are in the Chapter Packet; Stage 2 (Plan Chapter) returns `rhythmResponse`, `resolvedSceneType`, `sceneProgression`, and `pacing` (`modelCalls.ts:1218-1226`); the resulting `ChapterPlan` is passed to Stage 3 Manifest as `CHAPTER PLAN` in the user prompt (`modelCalls.ts:1336`). But in the **live** path the deterministic selector is never called — `grep -c selectNextScenePath src/server/chapter-generation/modelCalls.ts` returns **0**. The model chooses `resolvedSceneType` freely and the code only *validates the enum and records it*. So the live system tracks rhythm history and lets the model self-report, but never applies the anti-repetition rules. Verified. |
| **In HARNESS?** | **It does not reach anything.** There is no `SceneType`, no `recentSceneTypes`, no chapter-function concept in `harness-generation/`. `buildImmediateChapterRequest` (`shared/immediateChapterRequest.ts`) produces exactly `{ chapterNumber, continuation, assignment }`, where `assignment` is the latest steering direction. `HarnessStory` has no rhythm field. Verified. |
| **Does its state survive generation, commit, reload, retry, and replay?** | **Old system:** `recentSceneTypes` is advanced in the Living Story State by `appendSceneType` at `modelCalls.ts:974-977`, so it survives *within a run*. It does **not** survive reload — the old README states "Five-chapter state, checkpoints, chapters … exist only in page memory and are discarded on refresh" (`chapter-generation/README.md:300-303`) and "this Workshop has no durable story repository" (`:303`). `chapterBatch.ts:188` validates `state.scene?.recentSceneTypes` on resume, so batch continuation within a session preserves it. **HARNESS:** nothing to survive. Verified. |

### 7.2 The four responsibilities, as currently owned

The task statement defines four distinct responsibilities. Here is where each one lives today:

| Responsibility | Intended owner | Current HARNESS reality |
| --- | --- | --- |
| **Pacing Skill** — how the current chapter unfolds | CAPA `pacing` slot | Present. Official CAPA Pacing SPP is equipped. **But it asks for inputs HARNESS never sends:** its first line is "Interpret the supplied pacing qualities according to their natural creative meaning" — and there is no pacing-qualities field in the Story Information Packet, the Immediate Chapter Request, or the Generation Model Call. Verified by reading the SPP text and `grep -n pacing src/narrative/generation.ts` (one hit: the slot-ID union at `:109`). |
| **Rhythm** — the sequence of chapter functions across the serial | *Unowned* | Absent from HARNESS entirely. Implemented but disconnected in old Chapter Generation. |
| **Arc goals** — long-range direction and deadlines | `src/components/arc-goals/shared/arcGoals.ts` | **Working and wired.** `arcGenerationContext` supplies `activeGoal`, `completionDeadline`, `positionInSegment`, `completionConfirmed`, and the `destinedEnding` (`arcGoals.ts:63-68`); frozen into the packet at `context.ts:258` and presented first in the prompt (`prompt.ts:181-182`) as an "authoritative frozen pacing instruction". Verified as sound. |
| **Fate and survival pressure** — acceptable escalation and recovery | Story Seed `fateSurvival` | **Not in HARNESS at all.** `grep -rn "fateSurvival\|fatePressure" src/components/harness-generation` returns nothing. The Story Seed → Foundation handoff does not carry it. A `fate` System Panel presentation exists (`chapterSignals.ts:29`, `:315-325`) but only as an output format the model may choose — there is no pressure setting that influences whether escalation is acceptable. Verified. |

Note that the CAPA Schema conflates two of these: the `pacing` slot is described as
"Controls event spacing, arc pressure, and payoff timing" (`shared/skills.ts:19`) —
"event spacing" and "payoff timing" are within-chapter Pacing, but "arc pressure" belongs
to Arc Goals, and cross-chapter function sequencing (Rhythm) has no home at all.

### 7.3 Recommendation

**Reconnect and Adapt — do not rebuild, and do not redesign during this audit.**

- **Preserve** the deterministic, explainable selection design. `selectNextScenePath` returning
  `{ type, anchor, weights, blocked, reason }` with a plain-English `reason` is exactly right for
  a system SENSEI needs to inspect and trust. The anti-starvation tie-break (`sceneRhythm.ts:99-114`)
  is a genuine, well-reasoned piece of work.
- **Reconnect** the Fate bridge. The single blocking gap is that no approved mapping exists from
  canonical `fateSurvival.pressure` to `FatePressureTier`. Until SENSEI approves that mapping,
  Fate cannot influence rhythm anywhere, in either system. This is a **product decision**, not an
  engineering one, and it is the cheapest unblock in this report.
- **Adapt** the three scene types. `worldBuilding | conflict | progression` was written for the
  old Workshop; the chapter-function vocabulary a serial actually needs (setup, escalation,
  reversal, revelation, recovery, payoff…) is SENSEI's call, not a code question.
- **Adapt** the output path for HARNESS: rhythm's result belongs in the **Immediate Chapter
  Request** (it is "the assignment to act on now"), not in the Story Information Packet (which is
  defined as "story data, not skill instructions", `ARCHITECTURE_VOCABULARY.md:36-37`). Its
  *state* (`recentChapterFunctions`) belongs on `HarnessStory` so it survives commit, reload,
  retry, and replay — and any change there must bump `HARNESS_GENERATION_SCHEMA_VERSION`
  (`ARCHITECTURE_VOCABULARY.md:108-113`).
- **Discard** the old Stage 2 planning *call*. HARNESS is deliberately one-call
  (`harness-generation/README.md:223-241`); rhythm selection is fully deterministic
  (`sceneRhythm.ts` needs no model) and does not justify reintroducing a planning round trip.

---

## 8. Consolidated findings table

| Area | Original intention | Old implementation | Current HARNESS state | Verified problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| **Chapter scale — target** | 2,500-word default, 2,000 minimum, 60–100 paragraphs, explicitly anti-summary (`chapterPrompts.ts:135-143`) | Prompt-only directive delivered to the writer via `baseUserPrompt`; never enforced; one live run produced 1,083 words / 20 blocks (`chapter-generation/README.md:329-340`) | No length instruction anywhere in the CAPA Prompt, response contract, or Immediate Chapter Request | Model has no scale target; 304–426-word chapters are the unconstrained default | **Adapt** — declared target range in Story Information; keep it out of CAPA skills so Pacing shapes within it |
| **Chapter scale — measurement** | `MINIMUM_CHAPTER_WORD_COUNT = 2_000` with an `under-minimum-word-count` warning and a `needs-review` status (`manifestNormalizer.ts:8`, `:886-905`) | Computed and reported; explicitly not an acceptance rule (`README.md:304-305`) | The warning is **explicitly skipped** (`responseAcceptance.ts:193`); no word count persisted anywhere | HARNESS is blind to chapter size | **Reconnect** — stop suppressing the warning; persist `wordCount` / `paragraphCount` on the committed chapter |
| **Provider limits** | — | 16,384 `maxOutputTokens`, gemini-3.1-flash-lite | Identical: 16,384, same model (`harness-generation/config.ts:5`, `:55-58`) | Not a constraint — a 426-word chapter uses ~4% | **Preserve** |
| **Paragraph transport** | Paragraph = transport unit: one NDJSON object per paragraph (`chapterPrompts.ts:43`) | Worked structurally; 20 blocks in the live run | Paragraphs are `\n\n` inside one JSON string; `splitHarnessProseParagraphs` (`chapterSignals.ts:238`) is the only recovery; **no warning on a one-block chapter** | One chapter = one SEN block; every downstream effect collapses with it | **Rebuild** — make paragraph boundaries structural in the response contract; warn/repair on a one-block chapter |
| **Dialogue attribution** | Dialogue metadata attaches to the exact spoken passage | Per-paragraph `speakerName` / `speakerRole` — better, but still paragraph-granular | Whole containing block is stamped `type: 'dialogue'` + `speakerName`; first signal wins; later signals in that block dropped **silently** (`chapterSignals.ts:383-397`) | A mixed 304-word chapter became Iron-Hand Chen's dialogue block | **Rebuild** — split the block at the anchored span (the System Panel technique, `chapterSignals.ts:375-380`); **Reconnect** the span algorithm already in `senAdapter.ts:171-197` |
| **Anchor resolution** | An anchor must name one place in the chapter | Model supplied an explicit `occurrenceIndex` to disambiguate (`chapterPrompts.ts:48`) | Block-scoped uniqueness; ambiguous ⇒ drop (`chapterSignals.ts:267-282`), deliberately introduced in `69fd7db` | Rule is right; **granularity is wrong** — one block maximizes false ambiguity; no normalization of quotes/whitespace; no way for the model to disambiguate | **Adapt** — normalize before matching; **Reconnect** `occurrenceIndex`; re-evaluate ambiguity against real paragraph blocks |
| **Manifestations** | Reveal/reference positioned where the reader meets the entity | Per-block `entities` array | Appended to the containing block (`chapterSignals.ts:399-405`) | All manifestations pile onto one block; reveal positioning destroyed | **Preserve** the contract; fixed by the paragraph rebuild |
| **System Panels** | Visible UI treatment at the earning moment, in every genre | Rich nested `system` object; caused Gemini schema rejection (`README.md:39-45`) | Compact signal → `buildHarnessSystemPanel` (`chapterSignals.ts:312-345`); **splits its block at the anchor** | None — this is the correct pattern and the template for dialogue | **Preserve**; **Discard** the old nested schema |
| **Soundscapes** | Per-scene backing mood | Per-block `music` object | One per block (`chapterSignals.ts:422-434`); resolved per block (`acceptedChapterMedia.ts:28-45`) | One block ⇒ one soundscape per chapter; scene changes inaudible | **Preserve** the contract; fixed by the paragraph rebuild |
| **Sound Cues** | Cue fires at the exact audible action phrase | `triggerPhrase` + author-supplied `occurrenceIndex` | Hardcoded `occurrenceIndex: 0`, correctness bought by dropping ambiguous anchors (`chapterSignals.ts:436-447`) | Legitimate repeated-phrase cues are lost | **Reconnect** `occurrenceIndex` |
| **Media resolver / Reader delivery** | Model expresses intent; application resolves approved assets | Cue resolver + catalog | Frozen Media Loadout, `acceptChapterMedia` resolves and strips model proposals (`acceptedChapterMedia.ts:47-53`); Reader copies verbatim (`senAdapter.ts:136-169`) | None — sound boundary, well documented (`MEDIA_LOADOUT.md:50-74`) | **Preserve** |
| **Context — evidence duplication** | Relevant, authoritative, non-repetitive context | Section-capped budget with `brief` demotion (`contextBudgeter.ts:12-26`, `:43-52`) | Same evidence in 4 sections + prose (`prompt.ts:193-224`); descriptions repeated inside record `facts` (`capabilities.ts:119`); handler fan-out multiplies records (`capabilities.ts:305-335`) | ~7,483 tokens from a 426-word chapter | **Rebuild** — emit evidence once, reference by `sourceId` |
| **Context — audit in prompt** | Audit is an inspection artifact | Context manifest was a separate inspection object | `selectionAudit` serialized into the user prompt (`prompt.ts:229-237`); the contract has to tell the model to ignore it (`prompt.ts:161`) | Pure overhead, grows linearly with record count, uncounted by `totalEstimatedTokens` | **Reconnect** — keep it on the frozen attempt and in Development only |
| **Context — budget shape** | Sections degrade rather than disappear | Ten capped sections + `brief` tier + relevance ranking, same 24,000 total | One flat `maxEstimatedTokens: 24_000` (`context.ts:9-13`); first-come-first-served | At Chapter 50 with 400–600-word chapters the audit already hit **~23,468 tokens** (`CONTINUATION_EVALUATION.md:63-65`); saturation, then permanent priority-order starvation | **Adapt** the old design's *shape*, not its code |
| **Memory — entity identity** | Stable identity across chapters | Codex identity with author aliases | `entityId` stable for exact lowercase label (`capabilities.ts:252`; `foundation.ts:10`) | Works for exact labels; near-miss names ("Chen" vs "Iron-Hand Chen") silently create distinct entities | **Adapt** — normalize labels; surface near-misses as `unresolved` instead of minting a duplicate |
| **Memory — record lifecycle** | Records reflect current state | — | One record per event per handler (`capabilities.ts:108`); superseded **only** by an author correction or Foundation revision (`canonicalState.ts:149-154`) | Recurring entities accumulate one live record per chapter forever; only plot threads are collapsed (`canonicalState.ts:13-51`) | **Adapt** — generalize `currentThreadRecords` to every kind; keep full history in storage |
| **Memory — extraction contract** | Typed, evidence-backed, 13 categories | Process Result stage | Separate post-commit call (`prompt.ts:288-302`), never part of the chapter reply; failure leaves the chapter committed | None — this separation is correct and was a deliberate 2026-09-17 fix | **Preserve** |
| **Rhythm — engine** | Deterministic, explainable chapter-function sequencing with anti-stagnation | `sceneRhythm.ts` — complete, tested, 3 types, window 4, repetition caps, staleness tie-break | **Absent from HARNESS** | Header says "no production code path reads from this file yet" (`:11`); `selectNextScenePath` has 0 references in `src/server/` | **Adapt** — bring the design into HARNESS; **Preserve** determinism and the `reason` string |
| **Rhythm — Fate influence** | Pressure tier weights scene-type selection (`sceneRhythm.ts:37-42`) | Weights defined but unreachable | No Fate concept in HARNESS at all | `storyConstitutionFromSeed` sets `fatePressureTier: undefined` (`storyConstitution.ts:122`) — no approved bridge from `fateSurvival.pressure`; Workshop defaults to `"Balanced"` (all weights equal) | **Reconnect** — the missing piece is a **product decision** (approve the pressure→tier mapping), not code |
| **Rhythm — state durability** | Recent chapter history must persist | Advanced in Living Story State (`modelCalls.ts:974`); lost on refresh (`README.md:300-303`) | Nothing to persist | No durable rhythm state anywhere | **Adapt** — put `recentChapterFunctions` on `HarnessStory`; bump the schema version |
| **Rhythm — delivery** | Rhythm result is an instruction for *this* chapter | Reached Stage 3 inside `ChapterPlan` (`modelCalls.ts:1336`), but deterministic selection never ran live | Immediate Chapter Request carries only `{chapterNumber, continuation, assignment}` | No chapter-function assignment reaches the model | **Adapt** — deliver via the Immediate Chapter Request, never the Story Information Packet |
| **Pacing Skill wiring** | Pacing interprets supplied pacing qualities | — | Official CAPA Pacing SPP equipped and assembled (`skills.ts:177-185`) | The skill's own first instruction references "the supplied pacing qualities" — **HARNESS supplies none** | **Reconnect** — either supply the qualities or revise the official SPP; currently the slot's first line is a no-op |
| **Arc Goals** | Long-range direction and deadlines | `firstArcPromise` / arc summaries | `arcGenerationContext` frozen into the packet (`context.ts:258`), presented first (`prompt.ts:181-182`), deadline enforced at commit (`arcState.ts:16-24`) | None | **Preserve** |
| **CAPA / Story Information separation** | Two separate inputs, one call | Single blended prompt | Correctly separated and frozen per attempt (`controller.ts:609-639`) | None — the architecture is right; the *contents* are the problem | **Preserve** |

---

## 9. Practical implementation sequence

The dependencies here are real, not stylistic. Each group unblocks the next.

### Group 1 — Chapter formatting and scale *(must be first)*

**Why first:** the SEN block is the addressing unit for dialogue, manifestations, System
Panels, soundscapes, and Sound Cues. While a chapter is one block, *every* precision fix in
Group 2 is untestable — a correct implementation and a broken one produce the same output.
Scale belongs in the same group because a 300-word chapter has too few paragraphs to exercise
the addressing at all.

1. Make paragraph boundaries **structural** in the Generation Model Call response contract —
   a `paragraphs: string[]`, or a return to a line-delimited body — so a lost `\n\n` cannot
   destroy the chapter. Keep prose authoritative and keep block construction in HARNESS
   (`ARCHITECTURE_VOCABULARY.md:77` is unchanged by this).
2. Add a **structure check** in acceptance: a chapter that yields one block above a small
   word threshold produces an explicit warning and an inspectable diagnostic. Never reject
   prose (`README.md:228-230` rule stands).
3. Introduce a **declared chapter-scale target** in Story Information (not in a CAPA skill,
   so the Pacing slot shapes *within* it), delivered through the Immediate Chapter Request.
4. Compute and persist `wordCount` and `paragraphCount` on the committed chapter; stop
   suppressing `under-minimum-word-count` (`responseAcceptance.ts:193`).
5. Bump `HARNESS_GENERATION_SCHEMA_VERSION` — persisted chapter shape changes
   (`ARCHITECTURE_VOCABULARY.md:108-113`).

*Validation gate:* a real Gemini run produces a chapter of the declared scale with a
paragraph count in double digits, and the export shows one SEN block per paragraph.

### Group 2 — Precise effect addressing *(depends on Group 1)*

6. Move **dialogue attribution to the anchored span**, splitting the block exactly as System
   Panels already do (`chapterSignals.ts:375-380`), reusing the span algorithm that already
   exists at `senAdapter.ts:171-197`. Warn when a dialogue signal is dropped.
7. Normalize whitespace and Unicode quotation marks before anchor comparison
   (`chapterSignals.ts:273`), so a curly-quote round trip stops looking like a missing anchor.
8. Restore an explicit **`occurrenceIndex`** on positional signals so a repeated phrase can be
   disambiguated instead of discarded.
9. Add to the response contract that anchors must come from **this reply's prose**, not from
   prior chapters in the packet (`prompt.ts:164` currently says only "copied verbatim from prose").
10. Re-evaluate the one-panel / one-soundscape / one-creature-event per-block limits now that
    blocks are paragraphs — they are correct at paragraph granularity and wrong at chapter
    granularity.

*Validation gate:* a chapter with three speakers produces three dialogue spans with three
speakers; manifestations land on the paragraphs where the entity appears; more than one
soundscape survives.

### Group 3 — Context relevance *(independent of 1–2; can run in parallel)*

11. Emit each evidence passage **once**, with the other sections referencing it by `sourceId`
    (`prompt.ts:193-224`). Highest value-per-effort item in this report.
12. Remove `selectionAudit` from the user prompt; keep it on the frozen attempt and in the
    Development inspector (`prompt.ts:229-237`).
13. Generalize `currentThreadRecords` (`canonicalState.ts:13-51`) to collapse **every** record
    kind per `entityId` to its latest supported state for packet selection. History stays in
    storage.
14. Replace the flat `maxEstimatedTokens` with **per-section caps and a `brief` demotion tier**,
    adapting the shape of `contextBudgeter.ts:12-26` to HARNESS's own section set.
15. Make `totalEstimatedTokens` measure the **serialized prompt**, so the audit stops
    under-reporting.
16. Add entity-label normalization with an `unresolved` outcome for near-misses
    (`capabilities.ts:64-88`).

*Validation gate:* re-run the same two-chapter story; Chapter 2's packet should land well
under 3,000 tokens with no loss of authoritative content. Then re-run the 50-chapter
continuation evaluation and confirm the audit no longer approaches the budget ceiling.

### Group 4 — Rhythm *(depends on Group 1 for a meaningful chapter, and on one product decision)*

**Blocking product decision, and it is SENSEI's, not engineering's:** approve a mapping from
canonical Story Seed `fateSurvival.pressure` to a rhythm pressure vocabulary. Until that
exists, Fate cannot influence rhythm in *either* system — this is the documented reason
`fatePressureTier` is `undefined` for every real story (`storyConstitution.ts:55-56`).

17. Decide the HARNESS chapter-function vocabulary. The old three
    (`worldBuilding | conflict | progression`) are a starting point, not a conclusion.
18. Bring the deterministic selector into HARNESS, preserving the explainable
    `{ type, weights, blocked, reason }` result and the anti-starvation tie-break
    (`sceneRhythm.ts:99-114`).
19. Persist `recentChapterFunctions` on `HarnessStory` so it survives generation, commit,
    reload, retry, and replay. Bump the schema version.
20. Deliver the recommendation through the **Immediate Chapter Request**, keeping the four
    responsibilities separate: Pacing (within-chapter) stays a CAPA skill; Rhythm
    (cross-chapter function sequence) is HARNESS mechanics; Arc Goals (long-range direction
    and deadlines) stays where it already works; Fate (acceptable escalation) modulates
    rhythm weights once the mapping is approved.
21. Resolve the Pacing SPP's dangling reference: either supply "pacing qualities" as a real
    input or revise the official package. Today its first instruction has nothing to act on.

### Group 5 — Verification

22. Re-run the two-chapter *Shatter All Immortals!* case with the same Foundation, Story Seed,
    and Chinese Style SPP, and compare: word count, block count, dialogue spans and speakers,
    manifestation placement, accepted-vs-dropped signal counts with reasons, and Chapter 2's
    packet token total.
23. Re-run the 50-chapter continuation evaluation at the new chapter scale and record the
    Chapter 50 packet size — the honest stress test, since larger chapters make the context
    problem arrive sooner, not later.

---

## 10. What the current system gets right

Worth stating plainly, because the fixes above must not damage any of it:

- **The CAPA / Story Information / Immediate Chapter Request separation is correct** and
  correctly frozen per attempt (`controller.ts:609-639`). The architecture is not the problem.
- **Prose-first acceptance is correct.** "A dropped signal never removes prose" is enforced
  everywhere I looked, including the outer `try/catch` at `responseAcceptance.ts:212-218`.
- **Checkpoint durability is correct** — `request_started` → `raw_received` → `prose_accepted`
  → commit, with reload recovery to `provider_outcome_unknown` (`controller.ts:202-214`).
- **Memory extraction is correctly separated from chapter writing.** Its failure leaves the
  chapter committed and retryable (`controller.ts:692-708`). This was a deliberate 2026-09-17
  fix and it works.
- **The Media Loadout boundary is correct** — frozen provenance, no catalog in the prompt,
  post-generation resolution, model proposals stripped before persistence.
- **Arc Goals works end to end** — plan, active goal, deadline, positional weight, commit-time
  confirmation with verbatim evidence.
- **System Panel construction is the right pattern** for every effect family: compact anchored
  signal in, complete SEN structure built by HARNESS, block split at the exact anchor.
- **The Chinese Style SPP and chapter-to-chapter continuity work**, which is the evidence that
  the CAPA assembly and the protected-latest-chapter rule are sound. The failures are in
  scale, structure, addressing, and context volume — not in the skill system.
