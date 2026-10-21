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
  active CAPA skills in schema order, in two halves: the writing skills,
  followed by the permanent HARNESS Official Output Requirements when the
  chapter needs them; then the HARNESS tag rules and the skills that teach a
  tag. Apart from both, its planning text: the skills the Chapter planner
  reads (2026-10-20).
- **Story Information** — The complete story and world information owned by
  the HARNESS.
- **Story Information Packet** — The story information selected, weighted,
  organized, and frozen by the HARNESS for one generation attempt. It
  contains story data, not skill instructions.
- **Immediate Chapter Request** — The specific instruction for the chapter
  currently being generated.
- **Generation Model Call** — One call receiving the CAPA Prompt as its
  authoring instructions and the Story Information Packet, the Chapter Plan,
  the Mission Reminder, and the Immediate Chapter Request as its generation
  content.
- **Generated Chapter** — The model's output, returned to the HARNESS for
  validation, checkpointing, tag processing, and commit.
- **Chapter planner (Fate)** (SENSEI, 2026-10-20) — The one call before each
  chapter's Generation Model Call that decides what happens in the chapter. It
  receives the CAPA Prompt's planning text, the Story Information Packet's
  planner sections (with the Codex) and the Immediate Chapter Request, and
  returns a Chapter Plan. It writes no chapter, so it is not a Generation Model
  Call. [The chapter loop](../../../docs/chapter-loop.md) is its design.
- **Chapter Plan** — A chapter's cast and its events, each with the facts it
  changes, chosen from menus by the Chapter planner, checked against the
  record by code before the writer sees it, narrated by the writer, and the
  only source of the record: the Codex is worked out from the committed
  chapters' plans, never from the prose.
- **Prompt skeleton** (SENSEI, 2026-10-16) — The fixed order and headings the
  Generation Model Call is laid out in, modelled on how AI companies lay out a
  system prompt. The system instruction: `# ROLE AND MISSION`, `# HOW TO WRITE`
  (the CAPA Prompt's writing skills, then the HARNESS writing rules),
  `# HOW TO TAG` (the HARNESS tag rules, then the CAPA skills that teach a
  tag), `# HOW TO READ THE STORY INFORMATION`, `# HOW TO RETURN THE CHAPTER`,
  `# HARD RULES`. The next message: `# STORY INFORMATION` (the Story
  Information Packet), `# THIS CHAPTER` (the Immediate Chapter Request), and
  `# MISSION REMINDER` last. It is not a new system beside the HARNESS: it is
  how the HARNESS joins its inputs, and the CAPA Schema's own `writesTags`
  mark splits the CAPA Prompt between How to write and How to tag. Every
  piece of text the writer reads belongs to exactly one part; a new feature
  names its part when it is added, and a test fails on anything placed
  outside the skeleton. The Chapter planner's call has its own skeleton
  (2026-10-20): `# ROLE AND MISSION`, `# HOW TO READ THE STORY INFORMATION`,
  `# HOW TO PLAN THE CHAPTER` (the planner's skills, then the HARNESS planning
  rules) and `# HARD RULES`; then `# STORY INFORMATION` and `# THIS CHAPTER`.

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
6. The HARNESS combines all its inputs in one provider call and receives
   the resulting chapter. The Chapter planner's call before it is the only
   other call a chapter makes, and it returns only the plan.
7. Each concept has one authoritative definition (this file) and one
   implementation owner. Do not create parallel terminology, schemas,
   assemblers, or context systems for a concept already defined here.

## Implementation owners

Each concept has exactly one implementation owner. New code must go through
the owner listed here, never a parallel structure.

| Vocabulary term | Implementation owner | Notes |
| --- | --- | --- |
| HARNESS | `shared/controller.ts` (`HarnessGenerationController`), with `shared/repository.ts`, `shared/context.ts`, `shared/responseAcceptance.ts`, `shared/capabilities.ts`, neutral contracts in `src/narrative/generation.ts`, and the host implementation in `src/server/harness-generation/execute.ts` | `generateNextChapter` prepares the CAPA Prompt, the Story Information Packet, and the Immediate Chapter Request separately, freezes all three on the attempt, makes one provider call, and owns checkpoints and commits. Reader/Codex author edits append identity-addressed deltas to the same correction journal; no Reader story snapshot is a second owner. |
| CAPA Schema | `CAPA_SCHEMA` in `shared/skills.ts` | The single ordered slot registry (Author, Pacing, Fate, Continuity, Style, Accessibility, Translation, Sound Cues, Soundtrack, Speakers) with each slot's responsibility and who reads it (`readBy`, 2026-10-20): Pacing is the Chapter planner's (`planner`), Fate and Continuity are read by both calls (`both`), every other slot is the writer's. Loadout freezing and CAPA assembly both iterate it, so its order is the assembled order. Six slots are managed (`managedBy`): loadout freezing fills each from story state, the result is frozen on the attempt, and none is ever equipped by hand. Fate (`fate-mode`) follows the chapter's frozen Fate mode: SEN's Fate Survival skill (`shared/fateSurvivalSkill.ts`) on every Fate Survival call, its planning rules (`SEN_FATE_SURVIVAL_PLANNING`) for the planner and its writing rules for the writer, nothing in Regular Reader mode. Accessibility (`reading-mode`) follows the story's Reading Mode (`HarnessStory.chapterWritingStyle`): SEN's bundled skill for Clear Reading, Easy Read or Literal Reading (`shared/readingModeSkills.ts`), nothing for Standard. Translation (`story-language`) follows the story's Original Language: nothing for English; otherwise the one installed package declaring `generation` for that language (`resolveStoryLanguagePackage`, through the rule Reader translation shares), written without one when none is installed, and refused when several compete. Sound Cues (`media-loadout`) follows the story's Media Loadout: SEN's Sound Cues skill (`shared/soundCuesSkill.ts`) whenever the story has sound words (an equipped Sound Cue Pack's, which replace the default library's), nothing when it has none; the frozen words travel with it as its list. Soundtrack (`media-loadout` too) follows the same Media Loadout: SEN's Soundtrack skill (`shared/soundtrackSkill.ts`) whenever the story's frozen media has music moods or atmospheres (`soundtrackVocabulary`), which travel with it as its lists; a host without the skill leaves the slot empty and the chapter is written without a soundtrack, never refused. Speakers (`always`) loads SEN's own skill (`ALWAYS_LOADED_SKILLS`: `shared/speakersSkill.ts`) on every chapter in both Fate modes; a host without it leaves the slot empty. The Holdings and Appearance slots and their skills retired on 2026-10-20 with the chapter loop. `installable` is separate: Translation packages are installed but never equipped; Fate, Accessibility, Sound Cues, Soundtrack and Speakers take no packages. The Media Loadout itself is not a CAPA slot: only its sound words, music moods and atmosphere words reach the writer, through the Sound Cues and Soundtrack slots. |
| CAPA Skill | `HarnessSkillManifest` in `src/narrative/generation.ts` | A versioned, replaceable manifest occupying one CAPA Schema slot. Only manifests declaring the `generation` application contribute authoring text. |
| Prompt skeleton | `HARNESS_PROMPT_PARTS` and `HARNESS_PROMPT_HEADINGS` in `src/server/harness-generation/prompt.ts`, laid out by `composeHarnessSystemInstruction` and `composeHarnessUserPrompt`; `capaPromptParts` in `shared/skills.ts` | The order is the parts list; the HARNESS's own parts are `HARNESS_ROLE`, `HARNESS_WRITING_RULES`, `HARNESS_READING_GUIDE`, `HARNESS_RETURN_FORMAT` and `HARNESS_HARD_RULES` (the former response and evidence contract, split by job on 2026-10-16). `promptSkeleton.test.ts` fails on a heading out of place, a writing skill under How to tag or a tag skill under How to write. The Workshop's Writer Instructions page shows every block under its part. |
| CAPA Prompt | `assembleCapaPrompt` in `shared/skills.ts`, producing `CapaPrompt` (`src/narrative/generation.ts`) | The Chapter planner's skills (slots read by the planner or both: Pacing, the planning half of Fate Survival, Continuity) are assembled apart, as `CapaPrompt.planning`, and budget-checked like the writer's (2026-10-20). The writer's text is in two halves (2026-10-16), marked by `CapaPrompt.taggingStart`: every active generation skill that writes, Author first, once each, in schema order, with the official requirements; then the HARNESS tag rules (`HARNESS_TAG_RULES`, `shared/tagRules.ts`: what every tag kind shares) once and the skills that teach a tag (slots marked `writesTags`). The prompt skeleton puts each half under its own heading. Before: every active generation skill, Author first, once each, in schema order, with the HARNESS tag rules said once just before the first skill that teaches a tag, and the story's frozen sound words closing the Sound Cues section (`presentSoundVocabulary`: one example tag made from the first word, then one line per word, stored as `CapaPrompt.soundVocabulary`), and its music moods and atmosphere words closing the Soundtrack section (`presentSoundtrackVocabulary`, stored as `CapaPrompt.soundtrackVocabulary`), followed by the permanent HARNESS Official Output Requirements (`buildHarnessOfficialOutputRequirements`) only when the chapter needs them: when an Accessibility or Translation skill is loaded, or when the story's Original Language is not English (then a one-line Story Language requirement travels even with no Translation skill), all assembled into one `text`. An English, Standard chapter carries none. The official requirements are visible in Development but are not a replaceable CAPA Skill and never enter the skill inventory. Non-generation skills are listed in that inventory (`authoring: false`) but contribute no text. Frozen on `HarnessGenerationAttempt.capaPrompt`; a provider retry resends it unchanged only while the managed skills the story resolves still match it. Has its own soft budget (`CAPA_PROMPT_TOKEN_LIMIT`); never spends the packet's. |
| Story Information | `HarnessWorkspaceState` plus `HarnessStory` and `StoryFoundationRevision` (`src/narrative/generation.ts`), persisted through `shared/repository.ts` | The complete durable story and world state, including the reader's pending one-chapter direction (`HarnessStory.nextChapterDirection`), the path each committed chapter took (`HarnessChapter.path`), the story's Fate mode and conclusion, its Story Settings (the permanent Original Language and the owner's Reading Mode, which reach the writer only as the managed skills they resolve), Reader-edit correction history, every chapter's plan and what its checks dropped (`HarnessChapter.plan`, `planChecks`), each attempt's planner call and checked plan (`HarnessGenerationAttempt.plannerCall`, `chapterPlan`), and the Codex entries the plans name (`HarnessWorkspaceState.codexEntries`, see The record below). Schema 33 (2026-10-20) has no upgrade step: stories from before the chapter loop start fresh, preserved untouched. Persistent steering saved before one-chapter directions is kept read-only as `earlierSteering` and never travels. |
| Story Information Packet | `compileStoryInformationPacket` in `shared/context.ts` (with `projectCurrentStory`, `shared/canonicalProjection.ts`, and the one budget in `shared/packetBudget.ts`), producing `StoryInformationPacket` (`src/narrative/generation.ts`) | Story data only, held as distinct compact sections until the provider boundary: Current Story Information (the active Foundation's stable domain fields and compacted corrections, and `pointOfView`: the point of view the story opened in, read by `storyPointOfView` (`shared/pointOfView.ts`) from the earliest committed chapter that shows one clearly, worked out each time and never stored; the Style skill chooses it in the opening chapter, and the response contract tells every later chapter to keep it), Destined Ending and Hard Pins with the story's Fate mode (`fateMode`: `regular` makes the ending the story's guaranteed standing direction, never a forced deadline; `survival` does not guarantee it), the Active Arc Goal from the existing Arc Plan authority (the saved plan for the chapter's own arc; the provider sees only its active goal, deadline, and position on the planned route — never a later goal or arc — with `route`: on or off track with the arc's missed goals, past a missed final goal in Regular Reader mode, or broken in Fate Survival, when the one chapter that must end the story keeps the arc the route broke in), the persisted Fate Pressure rhythm direction with its matching suggestion (only when the chapter's path is automatic: Regular Reader mode with no reader choice), the latest five saved Previously On recaps, the current canonical state (latest applicable state per resolved entity; deterministic aliases merged, near-duplicates flagged, relevance-ranked under its allocation), and the Codex (section 8, `codex`, the Chapter planner's, protected and never trimmed: everyone and everything the story knows as the last chapter left them, worked out by `buildCodexSection` (`shared/codexSection.ts`) from the committed chapters' plans: the main character first, always; then everyone and everything on the page, the most recent first; then what the record names without having had it on the page; then the Story Seed's characters still to come, with the author's notes). Each call reads its own sections (`PLANNER_SECTION_ORDER` and `WRITER_SECTION_ORDER` in `shared/packetBudget.ts`): the planner reads the direction sections and the Codex; the writer never does, and reads the attempt's Chapter Plan instead. The record is owned by the Codex entries and the chapters' plans; the canonical state's artifact, ability and resource groups come from the old memory extraction, which is retired; these readers remain for existing records and receive nothing new from that call. It carries no Story Seed snapshot, chapter prose, evidence passage, memory extraction, ordinary thread/mystery record, or timeline. Its `diagnostics` (section measurements, omissions, identity ambiguities, storage totals) are HARNESS-only and never presented. It has no skill field. Frozen on `HarnessGenerationAttempt.storyInformation`; a provider retry resends the frozen packet unchanged unless the reader changed that chapter's direction since, in which case it is rebuilt. |
| Immediate Chapter Request | `buildImmediateChapterRequest` in `shared/immediateChapterRequest.ts`, producing `ImmediateChapterRequest` (`src/narrative/generation.ts`) | Chapter number, opening/continuation, the HARNESS-owned chapter-scale target (`chapterScale`: the word range and this chapter's exact paragraph count, rolled from `HARNESS_CHAPTER_PARAGRAPH_RANGE` by `harnessChapterParagraphTarget`, seeded by story and chapter so a retry keeps it; the response schema requires exactly that many paragraphs, and a miss is kept and flagged), and the reader's direction for this one chapter (`direction`: one of Rhythm's three chapter functions with the idea they chose, or their own words), when they chose one on the Fate page. It is the only place the reader's choice travels, and it is consumed when that chapter commits. A rewrite of the latest chapter adds `rewrite`: the chapter it replaces, the reader's optional note, and the replaced version's title and recap. The chapter-scale target is HARNESS mechanics, not a CAPA skill and not canonical Story Information: the writer spends it on the plan's events. The Chapter planner carries the reader's direction out; the writer reads it as context (2026-10-20). Frozen on `HarnessGenerationAttempt.immediateChapterRequest`. Its presentation (`presentImmediateChapterRequest`) also says where the chapter sits in its arc (`presentArcPosition`: worked out from the chapter number, never stored), so the first chapter of the story or of an arc grounds the reader and any other picks up from the latest recap. |
| Generation Model Call | `HarnessGenerationRequest` (`src/narrative/generation.ts`) → `buildHarnessGenerationPrompt` (`src/server/harness-generation/prompt.ts`) → `HarnessTextModelProvider` (`src/server/harness-generation/provider.ts`) | The request carries `capaPrompt`, `storyInformation`, `missionReminder`, and `immediateChapterRequest` as separate fields. The provider boundary presents its sections once, in the prompt skeleton's order: the system instruction (the HARNESS role, the CAPA Prompt's two halves and the HARNESS's own parts), then Current Story Information, Previously On, Current Canonical State, The Chapter Plan (`presentChapterPlan`: its cast as the record had them, then its events with their facts), Immediate Chapter Request, and the Mission Reminder last (before 2026-10-16 the Mission Reminder came before the request; before 2026-10-20 the writer also read the Destined Ending, the arc, Rhythm, Holdings and Appeared, which are the planner's now). It measures the exact serialized request (`HarnessRequestMeasurement`, returned with the response and persisted on the attempt). The provider is a host adapter; Gemini is only DEV's concrete implementation. Reader presentation fields, media locations, recordings, URLs, account/economy data, catalog selections, and packet diagnostics never enter the call; of the Media Loadout, only the story's sound words do, in the CAPA Prompt; every signal travels as a tag inside `paragraphs`, so the response schema (`buildHarnessChapterResponseSchema`) has no list of signals. Each paragraph's speaker is a menu (`MC`, each character of the plan's cast, `someone else`, `none`); the reply has no plan, chapter function, arc completion, story ending or holdings list (2026-10-20). The fixed response contract is infrastructure, not a skill or loadout, and carries no tag wording. Every block of the system instruction is shown, from the live code, on the Workshop's Writer Instructions page, with a dated history no change can skip. |
| Generated Chapter | `HarnessGenerationResponse.rawProviderResponse`, processed by `shared/responseAcceptance.ts` with `shared/chapterSignals.ts`, and committed by `shared/controller.ts` / `shared/repository.ts` | Checkpointed raw, then read through its tags, in the tiny SEN language: the model returns one authoritative `paragraphs` array in which it puts a sound tag on the words where a sound happens (`[[sound: Sound Word | Words | Energy]]`, read by `readMarks` in `src/narrative/marks.ts` with the story's sound words), with no separate list. The numbered marks (`[[n|words]]`) and `soundCues` list that came before are retired: still removed, placing nothing, with a warning. The HARNESS strips every tag from every reply string (paragraphs, title, recap and suggestions), derives the readable prose from the clean paragraphs (`shared/chapterBody.ts`), and measures `wordCount`/`paragraphCount` against its own chapter-scale target. It then places each Sound Cue deterministically (`placeSoundCues`, `src/audio/soundCuePlacement.ts`): the word must be one of the story's frozen sound words, the cue snaps to the whole words its tag wraps (one to eight, never in a system line, no overlap, at most ten in reading order), and the recording is that word's, preferring the Energy asked for, in a stable rotation. Each cue is stored as a manuscript span attachment (`SoundCueAttachment`) on the paragraph id `c{n}-p{i}` (`harnessParagraphBlockId`); anything set aside becomes a plain warning and never costs prose. Speakers are the third kind: each paragraph of the reply is `{speaker, text}` (SENSEI, 2026-10-19), the speaker `MC` for the main character, a name from the plan's cast for anyone else (2026-10-20), `someone else` for anyone unnamed (`UNNAMED_SPEAKER`, read in the Side voice and never given a card) or `none`, and `normalizeHarnessParagraphs` turns it into a speaker tag before the paragraph's speech, the main character's own `[[@MC]]` (`MAIN_CHARACTER_SPEAKER_TAG`, whatever name or pronoun the prose uses) or `[[@Name]]` for anyone else (read by `readMarks` before any other tag, so a speaker tag is never mistaken for one); a tag the writer still writes wins. The HARNESS finds each paragraph's quoted lines (`findSpokenLines`, `src/narrative/speech.ts`), gives each the nearest tag before it (`placeSpeakers`, `shared/speakers.ts`), saves an `[[@MC]]` line under the name the attempt's frozen Story Information gives the main character, checks a name tag against that same Story Information (the cast's main character with its aliases, `protagonistNames`; a part of their name that no other declared name shares also counts), and stores one manuscript span attachment per line (`SpeakerAttachment`, payload `{speaker, protagonist}`); untagged speech and unused tags become one plain warning, never a refusal. Read Aloud gives those lines the Protagonist or Side voice, and voices speech left untagged from its narration (`narratedSpeaker`, `src/narrative/speech.ts`): the Side voice when the sentence beside it names someone else first, otherwise the Protagonist voice, production's own default. Since 2026-10-20 no tag records information: what happens is the chapter's plan's, and a word tag the language does not have (a retired holdings or appearance tag) is removed with its prose kept and one warning (`prose_marks_removed`), recording nothing. Narration, Sound Cues, the soundtrack and speakers are the kinds the language carries today; the next media kinds (System Panels, Manifestations, Creature Events) come one at a time. Short or single-paragraph output is preserved and flagged, never rejected, down to a quarter of the chapter's minimum words: below that a reply is a failed write (`harnessFailedWrite`, `HARNESS_FAILED_WRITE_SHARE`), never saved, its raw reply kept on the attempt for a retry. A chapter label the writer put before its title ("Chapter 3: …") is dropped at acceptance (`chapterTitleText`, `src/narrative/chapterTitle.ts`), since the HARNESS numbers chapters. The separate memory extraction and on-request control are retired. Historical extraction receipts remain stored and ignored; deterministic readers of existing canonical state remain. |
| *(Arc planning call, separate operation)* | `planNextArc` / `prepareArcPlan` in `shared/controller.ts`, with `arcPlanningContext`, `nextArcStep`, `arcPlanGap` and `arcReviewGap` in `shared/arcState.ts`; `buildHarnessArcPrompt` in `src/server/harness-generation/prompt.ts` | Not a Generation Model Call. It plans the goals of the arc the next chapter begins. A story with a planned length (`plannedArcCount`, every story made from a World Blueprint) starts with Arc 1 only and plans each later arc when the reader begins it, never inside a chapter write; the reader then reviews the plan (accepts it or edits it) before the arc's first chapter, in both Fate modes. Beside the compact Story Information Packet, only this call receives the planning context (`HarnessArcRequest.planning`): the arc's place in the story's length and whether it is the final arc, the earlier arcs' goals with their outcomes, and the hidden look-ahead (`HarnessStory.arcLookahead`, at most two one-line directions for the next arcs, first written by the Blueprint and replaced by each planning). The reply is a goal draft, a fresh look-ahead and the Destined Ending; the HARNESS assigns the arc number and every goal identity. The look-ahead never enters the Story Information Packet or the Generation Model Call, and no reader surface shows it. Every arc is 30 chapters (`ARC_LENGTH`). A goal's chapters are a budget, not a quota: a goal reached early hands over to the next in the following chapter, which keeps its own deadline (`activeArcGoal`), and the response contract tells the writer that `completionDeadline` is the latest chapter, never a length to fill, and that every chapter changes the story's situation. |
| *(Rewrite this chapter, a second request for the latest chapter)* | `rewriteLatestChapter` in `shared/controller.ts`, with `chapterRewriteGap`, `latestStoryChapter` and `withoutLatestChapter` in `shared/chapterRewrite.ts`; `ImmediateChapterRequest.rewrite` (`HarnessChapterRewrite`), presented by `presentImmediateChapterRequest` | A Generation Model Call like any other, for the story's latest chapter while nothing is built on it. Its inputs are prepared from the story as it stood before that chapter (`withoutLatestChapter`: the chapter, the Codex entries it brought in, its goal outcomes, broken route and ending, and a direction chosen after it, all gone) with the chapter's own direction back in place; the request adds the reader's optional note and the replaced version's title and recap, never its prose. Without a note it keeps the replaced attempt's plan and makes no planner call; with one, the Chapter planner plans the chapter again from the note (SENSEI, 2026-10-20). The new version replaces the old one only when it commits, in the same write; the replaced attempt keeps its reply and gains `replacedByChapterId`. A failed rewrite changes nothing, and never holds the story. |
| *(Chapter planner, the call before each chapter)* | `planAttempt` in `shared/controller.ts`; `HarnessChapterPlanRequest` (`src/narrative/generation.ts`) → `buildChapterPlannerPrompt` and `buildChapterPlanResponseSchema` (`src/server/harness-generation/chapterPlanner.ts`); `readChapterPlan`, `checkChapterPlan`, `writerChapterPlan` and `resolveChapterPlan` in `shared/chapterPlan.ts`; the record from `derivePlanRecord` (`shared/planRecord.ts`) and `deriveHoldings` (`shared/holdings.ts`) | One call before each chapter, on the chapter's model, registered in the Model Router as Chapter Planner. It reads the planner's packet sections and `CapaPrompt.planning`, and returns the plan from menus. `readChapterPlan` reads it leniently, setting aside each piece it cannot read; only a reply with no plan fails the chapter, before the writer's call. `checkChapterPlan` runs it against the record in event order and drops each fact that cannot be true (losing what is not held, gaining what is already held, a change to someone dead or destroyed, a name in neither the cast nor the Codex), keeping it in `checks`; the chapter is never refused for it, and a broken Fate Survival route whose plan does not end the story fails it. In Fate Survival, a plan that leaves the main character dead ends the story at that event, as the planner's rules say, even when it forgets to say so, and every event after the one that ends the story is set aside. The writer gets `writerChapterPlan`. The call and the plan are frozen on the attempt (`plannerCall`, `chapterPlan`); a retry, a reload or a rewrite without a note reuses the plan (`reusedFrom`) with no new call. When the chapter commits, every name resolves to a Codex entry (`resolveChapterPlan`) and the plan is saved on the chapter. Its instructions are on the Writer Instructions page. |
| *(Holdings fixer, retired 2026-10-20)* | — | Retired with the holdings tags: the plan's checks drop what cannot be true before the chapter is written. |
| *(Look writer, retired 2026-10-20)* | — | Retired with the appearance tags: the plan gives a whole look when it first casts someone or something, and Manifest draws the look the card holds. |
| *(capability handlers, separate concept)* | `HarnessCapabilityRegistry` in `shared/capabilities.ts` | Not a CAPA concern: permanent, deterministic post-commit handlers that interpret already-committed semantic events. |
| *(Story-direction sources, separate durable concept)* | Shared domain contract in `src/narrative/storyDirection.ts` (Hard Pins, Fate Pressure tiers, chapter functions, recaps); Hard Pins and the rhythm recommendation on `HarnessStory`, recaps and rhythm metadata on `HarnessChapter`, `fatePressure` on `StoryFoundationInput`; tuning in `FATE_PRESSURE_RHYTHM_CONFIG` (`shared/rhythm.ts`); `buildMissionReminder` (`shared/missionReminder.ts`) frozen on `HarnessGenerationAttempt.missionReminder`; written only through `shared/controller.ts` | Durable Story Information the HARNESS displays, persists, and now projects into the compact Story Information Packet (sections 3 through 6) and, for the Mission Reminder, section 8 of the Generation Model Call. The writer returns the recap and three one-line suggestions as shallow fields of its chapter reply, and the Chapter planner the chapter function (2026-10-20); neither writes Hard Pins, Fate Pressure, or the Destined Ending, and the rhythm recommendation is computed deterministically from saved chapter functions and the one configuration. The direction sections reach the planner only. The Mission Reminder is a bounded excerpt of the Author skill's CAPA text and performs no story analysis. |
| *(Media Loadout, separate runtime concept)* | SEN contracts in `src/audio/media.ts`, `src/audio/soundWords.ts`, `src/audio/soundtrackVocabulary.ts` and `src/audio/soundCuePlacement.ts`; Library selection/entitlement policy in `src/library/media/mediaPacks.ts`; host records in `src/host/media/`; frozen through `shared/controller.ts` | SEN owns portable intent, references and deterministic resolution. Library owns first-party selection/entitlement policy; the host owns catalog records and truth (SEN Soundscapes and SEN Atmospheres, Volume 1, and the words a writer chooses an atmosphere by, `FrozenNarrativeMedia.atmospheres`). HARNESS freezes only opaque provenance and never grants entitlements, and freezes the media before CAPA so the Sound Cues and Soundtrack slots and acceptance read the same words. Only those words (sound words with their examples and meanings; music moods and atmosphere words) reach the Generation Model Call, through the CAPA Sound Cues and Soundtrack slots; recordings, URLs, catalogs and entitlements never enter CAPA, Story Information, the Immediate Chapter Request, or the call. |

## The tag system (the tiny SEN language)

**Media only (SENSEI, 2026-10-20).** Tags are media (Sound Cues, soundscape,
atmosphere) and who speaks. Information is never a prose tag: since step 2 of
[the chapter loop](../../../docs/chapter-loop.md) the record comes from each
chapter's plan (The record, below), and the holdings, appears and look tags,
their skills, their readers, the Holdings fixer and the look writer are gone.
A word tag with parts the language does not have (`[[gained: MC | Sword]]`)
is removed with its prose kept, and one warning says so; it records nothing.

The writer has one job in its Generation Model Call: narrate the chapter the
plan decides, and tag its media where they happen. No second call writes the
chapter or its tags.

- **Sound tag** — `[[sound: Sound Word | Words | Energy]]`: wraps the words where
  a sound plays and names it; the words stay in the prose. (The numbered mark
  `[[n|words]]` it replaced is retired: still removed, placing nothing.)
- **Speaker tag** — `[[@MC]]`, `[[@Name]]`: names who speaks the speech after
  it; made by the HARNESS from each paragraph's speaker field (`MC`, a name
  from the plan's cast, `someone else` for anyone unnamed, or `none`).
- **Soundscape tag and atmosphere tag** — `[[soundscape: Music Mood]]` and
  `[[atmosphere: Atmosphere]]` (SEN Soundtrack 2.0.0, 2026-10-12), each once,
  together at the very start of the chapter: the music and the place's sound
  are separate sounds, apart from Sound Cues, so each has its own tag. The
  earlier combined tag, `[[soundtrack: Music Mood | Atmosphere]]`, is still
  read (`SoundtrackTag.kind` says which). A change partway through a chapter is
  the reader's, in Create mode (`HarnessChapter.openingSound`,
  `soundtrackChanges`). Before 2026-10-12: one tag, once, at the
  very start of the chapter: the mood of the chapter's music and its
  atmosphere, from the story's own lists (`soundtrackVocabulary`: the moods at
  least three playable pieces share, and the atmosphere words). Only the first
  counts; its words are read for what they are, in either order
  (`chapterSoundtrack`), and saved as the chapter's scene
  (`HarnessChapter.scene`: the mood, and the atmosphere's bed, the beds that
  share a word taking turns by chapter). The Reader plays it; a chapter without
  one goes on with the scene before it.

Every kind is built from the same five parts: the **tag** the writer types;
the **teaching**, a CAPA skill in a managed slot under How to tag, always
short: what the tag marks, its format, one example and its few rules (SENSEI,
2026-10-17; before, every skill wore one FORMAT / REQUIRED / FORBIDDEN / CHECK
shape), with what every kind shares said once by the HARNESS tag rules; the
**reading**, where the HARNESS removes the tag and keeps where it sat; the
**rules**, plain checks with no model; the **home**, where the result lands.
A wrong tag is dropped and flagged, never a reason to refuse a chapter. Each
kind is taught only to the stories that use it, and kinds are added one at a
time. New kinds do not change the shape of the writer's reply; each still
costs engine work, an instruction, and the writer's attention.

### The record, from the plans

**Codex entry** (`CodexEntry`, `src/narrative/holdings.ts`): one character,
thing or ability with one permanent ID the app assigns, never a model. Names
resolve to it exactly (letter case, accents and punctuation aside), by its
name or an alias, when a chapter commits (`createCodexEntryResolver`,
`resolveChapterPlan`). `MC`, or any name the main character answers to, is
the main character; a character the Story Information declares keeps its
aliases; a new name gets one entry, reused by that exact name afterwards.
Things and abilities stay separate entries even under one name, and a thing
in a plan's cast resolves among things, so it never takes a character's entry
(a sword and its spirit stay two); a fact naming someone or something the cast
holds once is about that member. A cast member whose kind is off the menu is
read as a character, and something it already has as a thing, and the plan's checks say so. Two entries whose names are forms of one
name are flagged as possible duplicates.

**The record** (2026-10-20) is never stored: it is worked out again from the
committed chapters' plans, in story order, every time, so a rewritten chapter
changes it and nothing counts twice. `derivePlanRecord` (`shared/planRecord.ts`)
gives each entity its look (the plan's whole look when it first cast them,
then each look fact), gender and age, who they are, its state (`status`
facts: wounded, recovered, dead, revived, sealed, captured, freed,
transformed, damaged, repaired, destroyed; the dead stay dead and the
destroyed stay gone unless revived), goals, values, commitments both ways and
stances, said and acted. `deriveHoldings` (`shared/holdings.ts`) gives what
each character has, uses, knows and is, as four facts kept apart: a thing is
*owned* (with a count) and may be *equipped* (in use); an ability is
*learning* or *learned* (with a level), and a learned one may be *sealed*;
*usable* is worked out (learned and not sealed), and rank belongs to the
character. Its facts are the plan's `holding` facts (gains, loses, equips,
unequips, learning, learns, improves, seals, unseals, rank) and what a cast
member already had (`alreadyHas`, never counted as a gain). The same rules
decide, before the writer sees a plan, which of its facts cannot be true
(`blockedFact`, `checkChapterPlan`). The Codex (`deriveStoryCodex`) and the
planner's Codex section (`buildCodexSection`) both read this record; every
fact links to the chapter, and the event, whose plan made it.

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
- Owner-approved resets: schema 22 (narration plus Sound Cues in the tiny
  SEN language), schema 27 (arcs of 30 chapters) and schema 33 (the chapter
  loop, 2026-10-20: "with no compatibility", SENSEI) have no upgrade step.
  Every story before schema 27 was a test story planned in 100-chapter arcs,
  so the product owner chose to start fresh: earlier workspaces are
  preserved untouched and the page opens empty, and the upgrade steps for
  schemas 22 to 26 are gone. Any later reset needs the same explicit
  approval.
