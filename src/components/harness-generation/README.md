# Harness Generation

> **Before changing Harness Generation behavior:** read
> [ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md) first. It is
> the single authoritative source for HARNESS, CAPA, CAPA Schema, CAPA
> Skill, CAPA Prompt, Story Information, Story Information Packet,
> Immediate Chapter Request, Generation Model Call, and Generated Chapter.
> Use those terms and definitions; do not redefine or reinterpret them in
> this file or elsewhere.

## Purpose

Harness Generation is an independent, checkpoint-first novel core. It gives an
author a frozen Foundation copied from a saved Story Seed, asks a provider for one complete
chapter, preserves raw output before interpreting it, accepts usable prose
through canonical SEN chapter blocks, and carries committed prose, optional
accepted media metadata, and semantic-event evidence into the next chapter.

It is not a replacement, wrapper, import path, or compatibility layer for the
existing Chapter Generation feature.

## Workshop record

| Field | Value |
| --- | --- |
| Replica creation date | 2026-08-29 |
| Last Workshop update | 2026-09-20 |
| Last source comparison | 2026-09-12 — verified the creative author direction in `Light-Novels/src/server/prompts.ts` on `main` before extracting the Author skill |
| Lifecycle status | Steered continuation with a derived SEN Reader adapter |

### History

- **2026-09-20:** Built the story-direction sources the later packet-assembly
  change will draw on, without changing the Generation Model Call inputs.
  `src/narrative/storyDirection.ts` is the shared domain contract: at most
  three user-created Hard Pins with no weighting field, the canonical Fate
  Pressure tiers (`mortal`, `immortal`, `heaven`), the three chapter
  functions, and the recap shape. Hard Pins live on the story and are written
  only through `setHardPins`; the chapter writer and the Arc planner cannot
  create or change them (`ignored_model_story_direction`). Fate Pressure is
  copied from the Story Seed domain value into `StoryFoundationInput` at the
  handoff and is never read from a label. The existing chapter reply gained
  five shallow strings (`recap`, `chapterFunction`, `nextProgression`,
  `nextWorldBuilding`, `nextConflict`); acceptance validates each on its own,
  warns (`optional_recap_omitted`, `optional_rhythm_metadata_omitted`) and
  never rejects prose, and the commit saves them once with their chapter.
  Recaps are author-editable (`editChapterRecap`) and survive reload, replay,
  retry, and export. `shared/rhythm.ts` holds the one Fate Pressure
  configuration (Development defaults, ported from the Workshop Scene Rhythm
  Tracker) and the deterministic recommendation persisted on the story at
  every commit and Foundation revision. `shared/missionReminder.ts` builds the
  short Mission Reminder from the Author portion of the frozen CAPA Prompt and
  freezes it on each attempt for inspection. The Library workspace shows the
  permanent Active Arc Goal (from the existing Arc Plan authority), the
  Destined Ending, the Hard Pins editor, Fate Pressure with recent rhythm,
  suggestions and recommendation, the Mission Reminder, and per-chapter
  recaps. Schema version 15 resets stale Development data.
- **2026-09-19:** Registered the six supplied CAPA SPP archives as validated,
  stable Development inventory and connected new Story Seed stories to the
  official Author, Pacing, Continuity, and exact Chinese/Japanese/Korean Style
  packages. Accessibility and Translation remain empty because no approved
  packages were supplied. Package/path/file/archive provenance is frozen with
  generation attempts; ordinary reloads preserve each story's saved equipment.
- **2026-09-17:** Repaired the Generation Model Call response contract. A real
  Gemini chapter request was failing with `400 INVALID_ARGUMENT` while the
  provider compiled the previous response schema (nested SEN blocks with
  conditional System Panel variants plus the full thirteen-category memory
  contract), before any prose was generated. The provider now returns required
  prose, optional title and continuation plan, arc completion, and six shallow
  semantic signal families (`dialogue`, `manifestations`, `systemPanels`,
  `soundscapes`, `soundCues`, `creatureEvents`), each item keyed by an exact
  prose `anchorText`. `shared/chapterSignals.ts` owns that contract; the HARNESS
  splits prose into canonical SEN blocks, matches anchors, validates each signal
  on its own, builds the detailed System Panel, dialogue, manifestation, creature,
  and media structures, resolves soundscapes and Sound Cues through the frozen
  Media Loadout, and assigns every ID and persistence field. An anchor must name
  one place in the chapter: a phrase found in more than one block, or more than
  once inside its block where the signal lands at an offset, is dropped rather
  than attached to the wrong sentence. Chapter memory left
  the chapter-writing call entirely: after a chapter commits, the existing
  separate extraction runs automatically through the host adapter, and its
  outcome never changes the committed chapter. Persisted shapes did not change,
  so the schema version stays at 11.
- **2026-09-16:** Accepted Word (`.docx`) SPP instruction files, installing only
  their extracted document text, and added a direct SPP upload to every CAPA skill
  slot that locks the destination, validates the package against it, and equips
  the installed skill for the open story in one flow. See
  [SPP_IMPORT.md](./SPP_IMPORT.md).
- **2026-09-16:** Added the separate Media Loadout and runtime catalog path.
  Registered Media Packs, host-account reward entitlements, and two independent
  story equipment slots remain distinct from CAPA and from each other. HARNESS
  consumes current entitlement snapshots without granting or persisting them,
  and rechecks optional expiration before equipment and resolution. Attempt snapshots freeze
  exact pack/version/source/digest catalogs outside every provider request;
  the existing Cue resolver and the canonical soundscape track contract resolve
  only authorized entries after generation. Chapters persist resolved media and
  provenance through reload, replay, later reward/equipment changes, Reader
  adaptation, and user-controlled shared-player playback. Semantic music region
  participates in deterministic matching without exposing catalogs. Schema version 11
  resets stale Development data. See [MEDIA_LOADOUT.md](./MEDIA_LOADOUT.md).
- **2026-09-16:** Removed Media from CAPA. The schema now has exactly six
  ordered writing slots: Author, Pacing, Continuity, Style, Accessibility, and
  Translation. Media skills can no longer be installed, equipped, assembled,
  or frozen; stale Development workspace and SPP inventory data reset through
  schema version 10 and the v3 inventory key. The permanent HARNESS response
  contract now owns the compact semantic handoff for System Panels,
  manifestations, dialogue/narration, soundscape and cue intent, and creature
  events. Existing normalization, catalog resolution, persistence, recovery,
  and Reader playback remained unchanged in that Phase 0 change; the later
  runtime implementation is documented separately above.
- **2026-09-16:** Made Translation glossary normalization deterministic, rejected canonical/alias collisions, matched only story-facing text and chapter directions, froze selected resource provenance, and separated imported Translation selections by language and glossary identity. Schema version 9 intentionally resets stale Development data.
- **2026-09-15:** Restored HARNESS Generated Chapters to the canonical SEN
  `StoryBlock` and media pathway. Response acceptance now normalizes optional
  dialogue, manifestation, music, atmosphere, beast-event, System Panel, and
  World Cue structures through the existing Chapter Generation and Library Cue
  validators; derives the one readable prose result from accepted block text;
  persists accepted blocks and application-resolved cues at every chapter
  checkpoint; and passes them intact into Reader Chamber. Schema version 6
  intentionally resets stale Development data. Author Skill V1 is unchanged;
  the structured pathway is independent of CAPA loadout slots.
- **2026-09-15:** Integrated the neutral SEN Arc Goals authority with the
  current CAPA Prompt / Story Information Packet generation boundary. Arc
  requirements remain Harness mechanics and do not modify Author Skill V1.
- **2026-09-15:** Corrected Arc Goals deadline enforcement, revision-based
  editing, schema reset behavior, and the normal generation response contract.
  Alter Fate routing remains outside this implementation. See
  [ownership and integration boundaries](../arc-goals/README.md).
- **2026-09-14:** Removed the compatibility leftovers from the CAPA / Story
  Information separation. The frozen Story Information Packet now lives on
  `HarnessGenerationAttempt.storyInformation` (was `contextSnapshot`) and
  `HarnessChapter.storyInformationPacketId` (was `contextSnapshotId`), with
  no alias. `HARNESS_GENERATION_SCHEMA_VERSION` moved to 4; saved local
  storage at any other version is reset to an empty workspace, never
  migrated (`readHarnessWorkspaceState` replaces `migrateHarnessWorkspaceState`,
  which used to carry Phase 2 data forward). This repository does not
  preserve backward compatibility for persisted shapes.
- **2026-09-13:** Implemented the canonical CAPA / Story Information separation.
  `CAPA_SCHEMA` is the single ordered slot registry; `assembleCapaPrompt` builds
  every active generation skill, Author included, into one CAPA Prompt in schema
  order; `compileStoryInformationPacket` produces a packet with no skill
  instructions; `buildImmediateChapterRequest` separates the current chapter's
  instruction from persistent steering. The Generation Model Call now receives
  the CAPA Prompt as its authoring instruction and the packet plus immediate
  request as its generation content, with the Harness response contract kept as
  a distinct block. One Gemini call, context selection, checkpoints, memory
  processing, and commits are unchanged.
- **2026-09-15:** Added permanent HARNESS Official Output Requirements after the
  replaceable CAPA Skills. They make equipped Translation and Accessibility
  instructions mandatory for reader-facing content while keeping machine-facing
  media and effect payloads in canonical English. Development displays the fixed
  section as a locked slot-shaped card after the six CAPA slots so it can be inspected without
  pretending it is an installable or replaceable CAPA Skill.
- **2026-09-13:** Established the canonical architecture vocabulary in
  [ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md) (HARNESS, CAPA,
  CAPA Schema, CAPA Skill, CAPA Prompt, Story Information, Story Information
  Packet, Immediate Chapter Request, Generation Model Call, Generated
  Chapter) and mapped existing names onto it, including the mismatches
  between it and `HarnessContextSnapshot`, the installable-skill system,
  and `buildHarnessGenerationPrompt`. No generation behavior, persisted
  contracts, or the Arc system changed.
- **2026-09-13:** Connected official SPP intake in the Development host to the existing
  installed-skill inventory, story slots, audited context and generation prompt.
  Added validated file inspection, explicit text selection, local installation and
  package provenance. Reduced repeated nested provider schema variants after a live
  baseline request exposed Gemini schema rejection; story acceptance stays unchanged.

- **2026-09-13:** Replaced the inherited placeholder author wording with the
  founder-approved **Author Skill V1**: a focused Mission, Boundaries,
  Philosophy, Reference shelf, and Remember statement. Style, pacing,
  continuity, structured-output behavior, and Harness mechanics remain outside the skill.
- **2026-09-12:** Promoted the source SEN light-novel author direction from a
  hidden generic server prompt into the bundled, visible, replaceable **Author**
  skill. Existing and new local Harness stories equip its exact version, the
  provider receives it first, and the skill card exposes its actual instructions.
- **2026-09-12:** Added the missing installable-skill layer: six visible per-story
  slots, host-injected versioned manifests, durable loadout references, frozen
  request snapshots, generation-instruction delivery, missing-install protection,
  and Workshop-only sample manifests. These skills are explicitly separate from
  the always-on deterministic capability registry.
- **2026-09-11:** Applied the supplied SEN Manifesting mark to the Harness's
  active creation controls. Checkpoint, provider, generation, and persistence
  behavior remain unchanged.
- **2026-09-06:** Addressed PR #175 review: scoped unsaved steering to the selected
  story, blocked steering at pending checkpoints, retained semantic details in
  protected chapter context, verified SEN quantity history, and isolated historical
  speaker resolution from later identities and corrections. Added focused regressions.
- **2026-09-06:** Added persistent future/history steering, priority context for
  author direction and mechanical continuity, bounded original-evidence lookup,
  partial-event repair, stable character identities, and a derived SEN Reader,
  Codex, and System-card session. Tested deterministic continuation through 50
  chapters and a real Gemini run with corrective checkpoint branches. See
  `CONTINUATION_EVALUATION.md` for the evidence and limitations.

- **2026-09-06:** Protected every author correction and the latest committed
  chapter from context trimming. These mandatory inputs may exceed the soft
  selection target, with the excess explained in the audit; optional history
  is omitted first. A missing head chapter stops generation before a provider
  call. Added a derived current-thread view ordered by chapter/event evidence,
  not replay timestamps: resolved threads leave the open handoff, supported
  reopenings remain possible, and original thread history stays intact.
- **2026-09-05:** Added typed, evidence-backed chapter memory, Foundation identity
  references, and explicit recovery from saved prose. Generation and recovery use
  the same categorized memory contract. Saving prose and interpreting it now have
  separate inspection states; incomplete interpretation remains visible.
- **2026-09-05:** Corrected generation context priorities: newest author changes
  precede chapter prose and derived records; recent prose is selected newest
  first and presented chronologically. Requests distinguish Foundation facts,
  future plans, explicit changes, and frozen source provenance. Arc promises
  remain arc-scale direction. Correction targets and budget omissions remain
  inspectable at the provider boundary.
- **2026-08-29:** Created the independent Harness Generation tab. It owns a
  premise-first Foundation, revision snapshots, a one-call Gemini adapter,
  tolerant prose acceptance, append-only semantic event evidence, versioned
  IndexedDB persistence, independently durable checkpoints, local export, and
  Chapter 1 → Chapter 2 context.
- **2026-08-29:** Added the in-place Phase 3 database migration, versioned
  deterministic capability registry, provenance-backed canonical views,
  append-only corrections, audited context selection, internal Codex/System
  intents, idempotent replay, and persisted sequential batches. Prose and raw
  semantic evidence remain the authority beneath every derived record.
- **2026-09-03:** Connected the Workshop experience through a one-way Story
  Seed handoff. Selecting a saved seed copies the seed and optional Blueprint
  into a frozen Harness Foundation; manual premise entry remains a secondary
  development fallback.

## Source and transfer boundary

- `reference/` is a locked independent-baseline message. No legacy generator
  component is copied or rendered there.
- `development/` contains the active client workspace.
- `shared/` owns the portable Foundation, response boundary, context compiler,
  controller, and browser repository contracts.
- `src/server/harness-generation/` owns provider configuration, prompt and API
  behavior. It is intentionally outside the published package.
- `src/workshop/previews/harness-generation/` is Workshop-only mounting.

The portable package entry is `@seihouse/sen/harness-generation`. It may use
generic SEN UI primitives and accept a neutral, host-injected Story Seed source,
  but it never imports Story Seed internals. The Workshop preview owns the only
Story Seed-to-Foundation adapter. HARNESS reuses Chapter Generation's public
SEN block normalization and accepted-media contracts, but not its legacy
generation cycle, prompts, planning, processing, or persistence.
`shared/senAdapter.ts` remains the direct Reader contract edge, and
`development/HarnessReaderSession.tsx` composes the existing packaged Reader and
Codex. Neither component owns a second persistence path. SEN stays provider-neutral.

## Durable generation behavior

1. Persist `request_started` before a provider request.
2. Persist the raw provider response immediately after it returns.
3. Accept the prose as the authoritative chapter, split it into canonical SEN
   blocks, match every semantic signal to its exact prose anchor, validate each
   signal independently, build the detailed SEN structures, resolve approved
   media through the frozen Media Loadout, and persist that accepted chapter
   draft. A malformed or unanchored signal becomes a warning, never lost prose.
4. Persist the (now always empty) writer-lane event checkpoint so the existing
   retry and replay stages remain unchanged.
5. Atomically append a chapter with its accepted blocks and resolved media,
   attempt receipt, and updated story head.
6. Run the separate memory extraction on the committed prose when the host
   adapter supports it; its failure leaves the chapter committed and retryable
   from the inspection panel.

Only a committed chapter enters the next context snapshot. If storage fails,
the controller retains the completed local checkpoint, blocks continuation,
and retries persistence without another model call.

## Phase 3 extension boundary

`HarnessEventPreserver` remains the lossless transport boundary. The injected
`HarnessCapabilityRegistry` consumes only committed semantic events and emits
versioned receipts, canonical records, and internal projection intents with
stable replay identities. A handler upgrade changes its version and can
supersede its prior output without regenerating or rewriting prose.

Internal projections remain semantic intents. The SEN adapter translates supported
canonical character, location, faction, artifact and mechanical facts to existing
Reader contracts as story memory, world rules and character abilities. It never
turns extracted memory into a reader-visible System Panel: a panel exists only
where the chapter itself established one through a System Panel signal. Unknown relationships, speakers and unsupported effects remain
unknown. Exact, uniquely anchored speech receives the known speaker's role;
host-supplied cast identity establishes the main character without guessing from
paragraph order. Mechanical rows and status stats use the same preserved value.

## CAPA boundary

Development's complete SPP import flow and validation evidence are documented in
[SPP_IMPORT.md](./SPP_IMPORT.md). Terms are defined in
[ARCHITECTURE_VOCABULARY.md](./ARCHITECTURE_VOCABULARY.md).

CAPA Skills are not the deterministic capability handlers above. Capability handlers
are permanent internal machinery that interprets committed evidence. CAPA Skills are
versioned packages equipped into one of the six CAPA Schema slots (`CAPA_SCHEMA` in
`shared/skills.ts`): Author, Pacing, Continuity, Style, Accessibility, or Translation.
Media is not a CAPA Skill or slot. The bundled SEN Novel Author is a normal, replaceable generation skill, not
hidden creative Harness behavior. It is equipped for new and previously saved local
stories.

The host supplies validated `HarnessSkillManifest` records. The Harness persists an
exact `id` and `version` reference in the story and refuses to generate if a
referenced version is unavailable. For each attempt it freezes the equipped manifests
in schema order and assembles every generation skill, Author first, once, into one
CAPA Prompt (`assembleCapaPrompt`). The permanent HARNESS Official Output Requirements
follow the skills and are shown as a locked inspection card in Development; they are
not a seventh CAPA Skill and cannot be equipped, removed, or reordered. That CAPA Prompt is frozen on the attempt and is
the model's complete authoring instruction; it never enters the Story Information
Packet. Only manifests declaring the `generation` application contribute text.
Reader and post-commit applications may be recorded in the frozen CAPA Prompt's
skill inventory for their owning host runtime and send nothing to the writing model.

The separate permanent `HARNESS_RESPONSE_CONTRACT` describes supported semantic
chapter signals and the application-owned handoff for System Panels,
manifestation triggers, dialogue/narration metadata, soundscape intent, World
Cue and Sound Cue intent, and creature events. It is fixed HARNESS
infrastructure, never an installable skill or loadout slot. It contains no
asset catalog, R2 path, filename, track list, unlocked-resource list, or pack
contents. HARNESS retains validation, generated IDs, ordering, persistence,
resolution handoff, and checkpoint recovery; machine-facing fields remain
canonical English.

The Workshop's sample skill manifests remain preview data only. Media Packs use
the separate inventory and runtime boundary documented in
[MEDIA_LOADOUT.md](./MEDIA_LOADOUT.md). Development includes only two tiny test
catalog fixtures and a Workshop-owned temporary test reward adapter; it does not define product
packs, marketplace behavior, currency, scheduling, or a reward economy.

## Steering and continuation

`controller.steerStory(id, direction)` appends a durable future direction.
`revise-history` is the explicit alternative when an author changes past canon.
Directions are frozen into each request and retained in exports/reloads. The latest
conflicting direction wins; earlier unrelated directions and past consequences
remain. Foundation/Blueprint future plans are subordinate proposals.

The ordinary cycle remains prepare context → one writing call → commit prose →
preserve/process developments → continue. There is no routine literary review
loop or full-novel planning requirement. Context retains three recent chapters,
compact semantic developments, author corrections and quantified observations.
Later transfers/spending accompany older quantities. Up to three original-prose
excerpts may be looked up using the latest direction or missing event coverage.
The audit records omissions. Author authority and mechanical observations may
exceed an artificially small budget rather than disappearing silently.

`replayStory(id, chapterId)` reprocesses a selected chapter's committed events
through the deterministic capabilities without a model call. Stable event
identities make repeated repair idempotent; older repairs do not become the latest
story state merely because they ran later. Dropped or incomplete memory is repaired
by re-running the separate extraction, which reuses a saved raw extraction before
requesting a new one. The Reader preview derives chapter-scoped memory. Its reading settings
and edits are session-local; durable story changes belong to Harness steering and
corrections. Fully malformed optional output still requires usable source evidence;
replay does not invent missing facts or call the model again.

## Generation Model Call and inspection

Each attempt freezes the three HARNESS-prepared inputs and shows them separately:
the **Frozen CAPA Prompt**, the **Frozen Story Information Packet** (with its
**Included / Omitted** lists), and the **Immediate Chapter Request**. The packet
shows the exact selected Foundation revision, source Seed and optional Blueprint,
corrections (with target evidence), retained chapters, persistent steering, and
selection reasons; it contains no skill instructions.

`buildHarnessGenerationPrompt` combines them into one provider call: the system
instruction is the CAPA Prompt followed by the distinct Harness response and
evidence contract; the generation content is the packet (Foundation, explicit
author changes, committed evidence, frozen source, coverage/omissions, persistent
author direction, mechanical continuity) followed by the Immediate Chapter Request
(chapter number, opening or continuation, and the assignment to act on now). The
coverage section states whether the actual last committed chapter was included.

Selection protects steering, Foundation, corrections with their target evidence,
quantified observations, and the latest committed chapter. These mandatory inputs
may exceed the soft budget. Recent prose is selected newest first before optional
compact developments, bounded lookup, canonical records, and derived handoff.
Optional items are included whole when they fit or omitted with a reason. The
budget counts estimated selected content, not exact provider tokens or prompt
formatting overhead. A missing latest chapter blocks continuation instead of
substituting older history.

The latest applicable correction overrides earlier conflicting evidence. Active
Foundation edits take precedence over its frozen source snapshot; explicit Seed
values take precedence over generated Blueprint elaboration. Opening setup is
for the story opening, while committed prose anchors continuation. Arc promises,
mysteries, and endings are future direction, not chapter deadlines or already
established events. Existing saved snapshots remain readable without migration.

## Chapter memory and recovery

The chapter-writing call returns no memory. After a chapter commits, the
separate extraction call reads the exact saved prose and returns the categorized
memory contract; the HARNESS runs it automatically when the host adapter
supports extraction and leaves the explicit recovery control for retries. Typed
subjects distinguish a character's progression from a dungeon or module's state. Deterministic routing covers characters, decisions, relationships,
locations, factions, deadlines, timeline, progression, open threads, mysteries,
clues, revelations, and artifacts. Foundation names and declared aliases establish
stable identity references; repeated chapter evidence retains separate provenance.

Every event preserves a chapter quote and structured fact values. Replay checks
that the quote occurs in committed prose and that literal quantities, ranks, and
deadlines occur in that quote. This verifies provenance, not semantic entailment:
descriptions remain inspectable model interpretations. Missing subjects, unsupported
quotes, ambiguous references, malformed fields, and generic-only summaries leave
interpretation incomplete and prevent unsupported projections becoming ready.

The existing inspection panel separates **prose saved** from **memory interpretation
incomplete**. **Recover memory from saved prose** makes an explicit extraction call
through the configured host adapter, the same call the HARNESS makes automatically
after a commit. It reads the exact saved chapter and identity
references, checkpoints raw output before interpretation, and appends evidence
without changing prose, the original provider reply, or story order. Failed local
writes retry the received extraction; deterministic **Replay** makes no model call.
Exports include recovery requests, raw responses, usage receipts, and failures.
Existing schema-2 saves remain readable; the recovery history and identity fields
are optional additions. Hosts without extraction support receive an explicit error.

The captured Start Now regression covers Aria's AI identity, the forty-eight-hour
collapse threat, the conditional end-of-week seizure, F-Tier prototype difficulty,
0.04% initial energy, and Xie Jin's risky bypass decision. A live extraction of
the saved chapter produced nine events while preserving all prose and the original
four summaries. A mistyped thread remains visibly unresolved. The deterministic
fixture checks both the automatic post-commit extraction and an explicit recovery; the optional live test runs only when
`HARNESS_MEMORY_EXPORT` and `HARNESS_MEMORY_ENV` point to an author export and a
server environment file. `HARNESS_MEMORY_OUTPUT` optionally writes inspection
artifacts. `HARNESS_MEMORY_REPLAY=1` reprocesses saved extraction without a model call.

## Transfer notes

Copy the `development/` and `shared/` code, its package barrel, and the server
route as one feature. Leave the Workshop preview, manifest registration,
reference pane, and local Development endpoint guard behind unless the target
application explicitly needs them.

### 2026-09-06 — Library UI ownership migration

Reusable presentation now comes from the canonical Library UI package. Portable SEN surfaces resolve presentation through the host provider; the first-party Workshop supplies LibraryPresentationProvider. Domain, generation, persistence, media, and locked reference sources are unchanged.
