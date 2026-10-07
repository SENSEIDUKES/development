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
  validation, checkpointing, tag processing, and commit.

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
| CAPA Schema | `CAPA_SCHEMA` in `shared/skills.ts` | The single ordered slot registry (Author, Pacing, Fate, Continuity, Style, Accessibility, Translation, Sound Cues, Soundtrack, Speakers, Holdings) with each slot's responsibility. Loadout freezing and CAPA assembly both iterate it, so its order is the assembled order. Seven slots are managed (`managedBy`): loadout freezing fills each from story state, the result is frozen on the attempt, and none is ever equipped by hand. Fate (`fate-mode`) follows the chapter's frozen Fate mode: SEN's Fate Survival skill (`shared/fateSurvivalSkill.ts`) on every Fate Survival call, nothing in Regular Reader mode. Accessibility (`reading-mode`) follows the story's Reading Mode (`HarnessStory.chapterWritingStyle`): SEN's bundled skill for Clear Reading, Easy Read or Literal Reading (`shared/readingModeSkills.ts`), nothing for Standard. Translation (`story-language`) follows the story's Original Language: nothing for English; otherwise the one installed package declaring `generation` for that language (`resolveStoryLanguagePackage`, through the rule Reader translation shares), written without one when none is installed, and refused when several compete. Sound Cues (`media-loadout`) follows the story's Media Loadout: SEN's Sound Cues skill (`shared/soundCuesSkill.ts`) whenever the story has sound words (an equipped Sound Cue Pack's, which replace the default library's), nothing when it has none; the frozen words travel with it as its list. Soundtrack (`media-loadout` too) follows the same Media Loadout: SEN's Soundtrack skill (`shared/soundtrackSkill.ts`) whenever the story's frozen media has music moods or atmospheres (`soundtrackVocabulary`), which travel with it as its lists; a host without the skill leaves the slot empty and the chapter is written without a soundtrack, never refused. Speakers and Holdings (`always`) load SEN's own skill for the slot (`ALWAYS_LOADED_SKILLS`: `shared/speakersSkill.ts`, `shared/holdingsSkill.ts`) on every chapter in both Fate modes; a host without one leaves its slot empty and the chapter is written without those tags, never refused. `installable` is separate: Translation packages are installed but never equipped; Fate, Accessibility, Sound Cues, Soundtrack, Speakers and Holdings take no packages. The Media Loadout itself is not a CAPA slot: only its sound words, music moods and atmosphere words reach the writer, through the Sound Cues and Soundtrack slots. |
| CAPA Skill | `HarnessSkillManifest` in `src/narrative/generation.ts` | A versioned, replaceable manifest occupying one CAPA Schema slot. Only manifests declaring the `generation` application contribute authoring text. |
| CAPA Prompt | `assembleCapaPrompt` in `shared/skills.ts`, producing `CapaPrompt` (`src/narrative/generation.ts`) | Every active generation skill, Author first, once each, in schema order, with the HARNESS tag rules (`HARNESS_TAG_RULES`, `shared/tagRules.ts`: what every tag kind shares) said once just before the first skill that teaches a tag (slots marked `writesTags`), and the story's frozen sound words closing the Sound Cues section (`presentSoundVocabulary`: one example tag made from the first word, then one line per word, stored as `CapaPrompt.soundVocabulary`), and its music moods and atmosphere words closing the Soundtrack section (`presentSoundtrackVocabulary`, stored as `CapaPrompt.soundtrackVocabulary`), followed by the permanent HARNESS Official Output Requirements (`buildHarnessOfficialOutputRequirements`) only when the chapter needs them: when an Accessibility or Translation skill is loaded, or when the story's Original Language is not English (then a one-line Story Language requirement travels even with no Translation skill), all assembled into one `text`. An English, Standard chapter carries none. The official requirements are visible in Development but are not a replaceable CAPA Skill and never enter the skill inventory. Non-generation skills are listed in that inventory (`authoring: false`) but contribute no text. Frozen on `HarnessGenerationAttempt.capaPrompt`; a provider retry resends it unchanged only while the managed skills the story resolves still match it. Has its own soft budget (`CAPA_PROMPT_TOKEN_LIMIT`); never spends the packet's. |
| Story Information | `HarnessWorkspaceState` plus `HarnessStory` and `StoryFoundationRevision` (`src/narrative/generation.ts`), persisted through `shared/repository.ts` | The complete durable story and world state, including the reader's pending one-chapter direction (`HarnessStory.nextChapterDirection`), the path each committed chapter took (`HarnessChapter.path`), the story's Fate mode and conclusion, its Story Settings (the permanent Original Language and the owner's Reading Mode, which reach the writer only as the managed skills they resolve), Reader-edit correction history, every chapter's holding changes and closing list (`HarnessChapter.holdingChanges`, `closingHoldings`), and the Codex entries they name (`HarnessWorkspaceState.codexEntries`, see The tag system below). Persistent steering saved before one-chapter directions is kept read-only as `earlierSteering` and never travels. |
| Story Information Packet | `compileStoryInformationPacket` in `shared/context.ts` (with `projectCurrentStory`, `shared/canonicalProjection.ts`, and the one budget in `shared/packetBudget.ts`), producing `StoryInformationPacket` (`src/narrative/generation.ts`) | Story data only, held as distinct compact sections until the provider boundary: Current Story Information (the active Foundation's stable domain fields and compacted corrections, and `pointOfView`: the point of view the story opened in, read by `storyPointOfView` (`shared/pointOfView.ts`) from the earliest committed chapter that shows one clearly, worked out each time and never stored; the Style skill chooses it in the opening chapter, and the response contract tells every later chapter to keep it), Destined Ending and Hard Pins with the story's Fate mode (`fateMode`: `regular` makes the ending the story's guaranteed standing direction, never a forced deadline; `survival` does not guarantee it), the Active Arc Goal from the existing Arc Plan authority (the saved plan for the chapter's own arc; the provider sees only its active goal, deadline, and position on the planned route — never a later goal or arc — with `route`: on or off track with the arc's missed goals, past a missed final goal in Regular Reader mode, or broken in Fate Survival, when the one chapter that must end the story keeps the arc the route broke in), the persisted Fate Pressure rhythm direction with its matching suggestion (only when the chapter's path is automatic: Regular Reader mode with no reader choice), the latest five saved Previously On recaps, the current canonical state (latest applicable state per resolved entity; deterministic aliases merged, near-duplicates flagged, relevance-ranked under its allocation), and Holdings (section 8, protected: what each character has now, worked out by `deriveHoldings` from the committed chapters' holding changes and shaped by `holdingsSection`, the main character first even with nothing recorded, then the six most recently changed others, by exact name). Holdings is owned by the Codex entries and holding changes; the canonical state's artifact, ability and resource groups come from the old memory extraction, which is retired; these readers remain for existing records and receive nothing new from that call. It carries no Story Seed snapshot, chapter prose, evidence passage, memory extraction, ordinary thread/mystery record, or timeline. Its `diagnostics` (section measurements, omissions, identity ambiguities, storage totals) are HARNESS-only and never presented. It has no skill field. Frozen on `HarnessGenerationAttempt.storyInformation`; a provider retry resends the frozen packet unchanged unless the reader changed that chapter's direction since, in which case it is rebuilt. |
| Immediate Chapter Request | `buildImmediateChapterRequest` in `shared/immediateChapterRequest.ts`, producing `ImmediateChapterRequest` (`src/narrative/generation.ts`) | Chapter number, opening/continuation, the HARNESS-owned chapter-scale target (`chapterScale`: the word range and this chapter's exact paragraph count, rolled from `HARNESS_CHAPTER_PARAGRAPH_RANGE` by `harnessChapterParagraphTarget`, seeded by story and chapter so a retry keeps it; the response schema requires exactly that many paragraphs, and a miss is kept and flagged), and the reader's direction for this one chapter (`direction`: one of Rhythm's three chapter functions with the idea they chose, or their own words), when they chose one on the Fate page. It is the only place the reader's choice travels, and it is consumed when that chapter commits. A rewrite of the latest chapter adds `rewrite`: the chapter it replaces, the reader's optional note, and the replaced version's title and recap. The chapter-scale target is HARNESS mechanics, not a CAPA skill and not canonical Story Information: the Pacing skill decides how the chapter uses the space it allows. Frozen on `HarnessGenerationAttempt.immediateChapterRequest`. Its presentation (`presentImmediateChapterRequest`) also says where the chapter sits in its arc (`presentArcPosition`: worked out from the chapter number, never stored), so the first chapter of the story or of an arc grounds the reader and any other picks up from the latest recap. |
| Generation Model Call | `HarnessGenerationRequest` (`src/narrative/generation.ts`) → `buildHarnessGenerationPrompt` (`src/server/harness-generation/prompt.ts`) → `HarnessTextModelProvider` (`src/server/harness-generation/provider.ts`) | The request carries `capaPrompt`, `storyInformation`, `missionReminder`, and `immediateChapterRequest` as separate fields. The provider boundary presents its sections once, in order: CAPA Prompt, Current Story Information, Destined Ending and Hard Pins, Active Arc Goal, Fate Pressure Rhythm Direction (automatic paths only), Previously On, Current Canonical State, Holdings (`presentHoldings`), Mission Reminder, Immediate Chapter Request. It measures the exact serialized request (`HarnessRequestMeasurement`, returned with the response and persisted on the attempt). The provider is a host adapter; Gemini is only DEV's concrete implementation. Reader presentation fields, media locations, recordings, URLs, account/economy data, catalog selections, and packet diagnostics never enter the call; of the Media Loadout, only the story's sound words do, in the CAPA Prompt; every signal travels as a tag inside `paragraphs`, so the response schema (`buildHarnessChapterResponseSchema`) has no list of signals. With the Holdings skill loaded, the schema asks for `mainCharacterHoldings` right after the chapter: a plain list of names, which adds no structure. The fixed response contract is infrastructure, not a skill or loadout, and carries no tag wording. Every block of the system instruction is shown, from the live code, on the Workshop's Writer Instructions page, with a dated history no change can skip. |
| Generated Chapter | `HarnessGenerationResponse.rawProviderResponse`, processed by `shared/responseAcceptance.ts` with `shared/chapterSignals.ts`, and committed by `shared/controller.ts` / `shared/repository.ts` | Checkpointed raw, then read through its tags, in the tiny SEN language: the model returns one authoritative `paragraphs` array in which it puts a sound tag on the words where a sound happens (`[[sound: Sound Word | Words | Energy]]`, read by `readMarks` in `src/narrative/marks.ts` with the story's sound words), with no separate list. The numbered marks (`[[n|words]]`) and `soundCues` list that came before are retired: still removed, placing nothing, with a warning. The HARNESS strips every tag from every reply string (paragraphs, title, plan, recap, suggestions and both evidence passages), derives the readable prose from the clean paragraphs (`shared/chapterBody.ts`), and measures `wordCount`/`paragraphCount` against its own chapter-scale target. It then places each Sound Cue deterministically (`placeSoundCues`, `src/audio/soundCuePlacement.ts`): the word must be one of the story's frozen sound words, the cue snaps to the whole words its tag wraps (one to eight, never in a system line, no overlap, at most ten in reading order), and the recording is that word's, preferring the Energy asked for, in a stable rotation. Each cue is stored as a manuscript span attachment (`SoundCueAttachment`) on the paragraph id `c{n}-p{i}` (`harnessParagraphBlockId`); anything set aside becomes a plain warning and never costs prose. Speakers are the third kind: the writer puts a speaker tag before the speech it names, the main character's own `[[@MC]]` (`MAIN_CHARACTER_SPEAKER_TAG`, whatever name or pronoun the prose uses) or `[[@Name]]` for anyone else (read by `readMarks` before any other tag, so a speaker tag is never mistaken for one), with no list in the reply and no change to the response schema. The HARNESS finds each paragraph's quoted lines (`findSpokenLines`, `src/narrative/speech.ts`), gives each the nearest tag before it (`placeSpeakers`, `shared/speakers.ts`), saves an `[[@MC]]` line under the name the attempt's frozen Story Information gives the main character, checks a name tag against that same Story Information (the cast's main character with its aliases, `protagonistNames`; a part of their name that no other declared name shares also counts), and stores one manuscript span attachment per line (`SpeakerAttachment`, payload `{speaker, protagonist}`); untagged speech and unused tags become one plain warning, never a refusal. Read Aloud gives those lines the Protagonist or Side voice, and voices speech left untagged from its narration (`narratedSpeaker`, `src/narrative/speech.ts`): the Side voice when the sentence beside it names someone else first, otherwise the Protagonist voice, production's own default. Holdings are the fourth kind, the first written as word tags: the HARNESS reads each (`readMarks`, `readHoldingTag`), saves it as a holding change on the sentence it points at (`placeHoldingChanges`, `HoldingChangeAttachment`), keeps the closing list as `closingHoldings`, and, when the chapter commits, in the same write, resolves every name to a Codex entry (`resolveHoldingChanges`); unreadable tags become one plain warning, never a refusal. Narration, Sound Cues, speakers and holdings are the kinds the language carries today; System Panels, first appearance, status, place and ties come next, one at a time, then Manifestations, Soundscapes and Creature Events. Short or single-paragraph output is preserved and flagged, never rejected, down to a quarter of the chapter's minimum words: below that a reply is a failed write (`harnessFailedWrite`, `HARNESS_FAILED_WRITE_SHARE`), never saved, its raw reply kept on the attempt for a retry. A chapter label the writer put before its title ("Chapter 3: …") is dropped at acceptance (`chapterTitleText`, `src/narrative/chapterTitle.ts`), since the HARNESS numbers chapters. Holdings come from the writer's tags; the Holdings fixer after commit only corrects what the checks flag. The separate memory extraction and on-request control are retired. Historical extraction receipts remain stored and ignored; deterministic readers of existing canonical state remain. |
| *(Arc planning call, separate operation)* | `planNextArc` / `prepareArcPlan` in `shared/controller.ts`, with `arcPlanningContext`, `nextArcStep`, `arcPlanGap` and `arcReviewGap` in `shared/arcState.ts`; `buildHarnessArcPrompt` in `src/server/harness-generation/prompt.ts` | Not a Generation Model Call. It plans the goals of the arc the next chapter begins. A story with a planned length (`plannedArcCount`, every story made from a World Blueprint) starts with Arc 1 only and plans each later arc when the reader begins it, never inside a chapter write; the reader then reviews the plan (accepts it or edits it) before the arc's first chapter, in both Fate modes. Beside the compact Story Information Packet, only this call receives the planning context (`HarnessArcRequest.planning`): the arc's place in the story's length and whether it is the final arc, the earlier arcs' goals with their outcomes, and the hidden look-ahead (`HarnessStory.arcLookahead`, at most two one-line directions for the next arcs, first written by the Blueprint and replaced by each planning). The reply is a goal draft, a fresh look-ahead and the Destined Ending; the HARNESS assigns the arc number and every goal identity. The look-ahead never enters the Story Information Packet or the Generation Model Call, and no reader surface shows it. Every arc is 30 chapters (`ARC_LENGTH`). A goal's chapters are a budget, not a quota: a goal reached early hands over to the next in the following chapter, which keeps its own deadline (`activeArcGoal`), and the response contract tells the writer that `completionDeadline` is the latest chapter, never a length to fill, and that every chapter changes the story's situation. |
| *(Rewrite this chapter, a second request for the latest chapter)* | `rewriteLatestChapter` in `shared/controller.ts`, with `chapterRewriteGap`, `latestStoryChapter` and `withoutLatestChapter` in `shared/chapterRewrite.ts`; `ImmediateChapterRequest.rewrite` (`HarnessChapterRewrite`), presented by `presentImmediateChapterRequest` | A Generation Model Call like any other, for the story's latest chapter while nothing is built on it. Its inputs are prepared from the story as it stood before that chapter (`withoutLatestChapter`: the chapter, the Codex entries it brought in, its goal outcomes, broken route and ending, and a direction chosen after it, all gone) with the chapter's own direction back in place; the request adds the reader's optional note and the replaced version's title and recap, never its prose. The new version replaces the old one only when it commits, in the same write; the replaced attempt keeps its reply and gains `replacedByChapterId`. A failed rewrite changes nothing, and never holds the story. |
| *(Holdings fixer, separate operation after commit)* | `planHoldingsFix` / `applyHoldingsFixes` in `shared/holdingsFixer.ts`, run by the controller after each commit; `HarnessHoldingsFixRequest` → `executeHoldingsFix` / `buildHoldingsFixerPrompt` (`src/server/harness-generation/holdingsFixer.ts`); the record is `HarnessChapter.fixer` | Not a Generation Model Call: one small call with the chapter's model at its lowest reasoning level, only when the chapter's own holdings checks flag problems the plain rules cannot settle, reading small cases rather than the chapter (see The tag system below). Registered in the Model Router as Holdings Fixer. Its instructions are on the Writer Instructions page. |
| *(capability handlers, separate concept)* | `HarnessCapabilityRegistry` in `shared/capabilities.ts` | Not a CAPA concern: permanent, deterministic post-commit handlers that interpret already-committed semantic events. |
| *(Story-direction sources, separate durable concept)* | Shared domain contract in `src/narrative/storyDirection.ts` (Hard Pins, Fate Pressure tiers, chapter functions, recaps); Hard Pins and the rhythm recommendation on `HarnessStory`, recaps and rhythm metadata on `HarnessChapter`, `fatePressure` on `StoryFoundationInput`; tuning in `FATE_PRESSURE_RHYTHM_CONFIG` (`shared/rhythm.ts`); `buildMissionReminder` (`shared/missionReminder.ts`) frozen on `HarnessGenerationAttempt.missionReminder`; written only through `shared/controller.ts` | Durable Story Information the HARNESS displays, persists, and now projects into the compact Story Information Packet (sections 3 through 6) and, for the Mission Reminder, section 8 of the Generation Model Call. The writer returns the recap, chapter function, and three one-line suggestions as shallow fields of its existing chapter reply; it never writes Hard Pins, Fate Pressure, or the Destined Ending, and the rhythm recommendation is computed deterministically from saved chapter functions and the one configuration. The Mission Reminder is a bounded excerpt of the Author skill's CAPA text and performs no story analysis. |
| *(Media Loadout, separate runtime concept)* | SEN contracts in `src/audio/media.ts`, `src/audio/soundWords.ts`, `src/audio/soundtrackVocabulary.ts` and `src/audio/soundCuePlacement.ts`; Library selection/entitlement policy in `src/library/media/mediaPacks.ts`; host records in `src/host/media/`; frozen through `shared/controller.ts` | SEN owns portable intent, references and deterministic resolution. Library owns first-party selection/entitlement policy; the host owns catalog records and truth (SEN Soundscapes and SEN Atmospheres, Volume 1, and the words a writer chooses an atmosphere by, `FrozenNarrativeMedia.atmospheres`). HARNESS freezes only opaque provenance and never grants entitlements, and freezes the media before CAPA so the Sound Cues and Soundtrack slots and acceptance read the same words. Only those words (sound words with their examples and meanings; music moods and atmosphere words) reach the Generation Model Call, through the CAPA Sound Cues and Soundtrack slots; recordings, URLs, catalogs and entitlements never enter CAPA, Story Information, the Immediate Chapter Request, or the call. |

## The tag system (the tiny SEN language)

The writer has two jobs in one Generation Model Call: write the chapter, and
write its tags. Tags say what happened; the saved records tell the next
chapter what remains true. No second call writes the chapter or its tags. The
Holdings fixer (below) is a separate small call after commit, only when the
chapter's holdings checks found problems a model must decide; it reads small
cases, never the chapter, and only corrects what the checks flagged.

- **Sound tag** — `[[sound: Sound Word | Words | Energy]]`: wraps the words where
  a sound plays and names it; the words stay in the prose. (The numbered mark
  `[[n|words]]` it replaced is retired: still removed, placing nothing.)
- **Speaker tag** — `[[@MC]]`, `[[@Name]]`: names who speaks the speech after it.
- **Soundtrack tag** — `[[soundtrack: Music Mood | Atmosphere]]`, once, at the
  very start of the chapter: the mood of the chapter's music and its
  atmosphere, from the story's own lists (`soundtrackVocabulary`: the moods at
  least three playable pieces share, and the atmosphere words). Only the first
  counts; its words are read for what they are, in either order
  (`chapterSoundtrack`), and saved as the chapter's scene
  (`HarnessChapter.scene`: the mood, and the atmosphere's bed, the beds that
  share a word taking turns by chapter). The Reader plays it; a chapter without
  one goes on with the scene before it.
- **Word tag** — `[[word: who | what | more]]`: a tag word (`TAG_WORDS` in
  `src/narrative/marks.ts`, each with the other spellings it accepts), then its
  parts. It points at the sentence it starts or sits in; written right after a
  sentence with no space, at that sentence; at a paragraph's end, at the last.
  A tag never reaches the prose: `readMarks` removes every tag it reads, and
  every tag it cannot read.

Every kind is built from the same five parts: the **tag** the writer types;
the **teaching**, a CAPA skill in a managed slot, always in one shape (JOB,
FORMAT, REQUIRED, FORBIDDEN, CHECK BEFORE YOU RETURN), with what every kind
shares said once by the HARNESS tag rules; the **reading**, where the
HARNESS removes the tag and keeps where it sat; the **rules**, plain checks
with no model; the **home**, where the result lands. A wrong tag is dropped
and flagged, never a reason to refuse a chapter. Each kind is taught only to
the stories that use it, and kinds are added one at a time. New kinds do not
change the shape of the writer's reply; each still costs engine work, an
instruction, and the writer's attention.

Two families: **presentation** tags shape how the chapter is shown and heard
(Sound Cues, speakers, the soundtrack; System Panels next) and never record; **information**
tags say what changed in the story world and record it in the Codex (holdings
now; first appearance, status, place and ties next) and never show. The
information tags and the Codex's slots are the same in every genre; themes
change only how they look and are labelled.

**Codex entry** (`CodexEntry`, `src/narrative/holdings.ts`): one character,
thing or ability with one permanent ID the app assigns, never the writer.
Names resolve to it exactly (letter case, accents and punctuation aside), by
its name or an alias. `MC`, or any name the main character answers to, is the
main character; a character the Story Information declares keeps its aliases;
a new name gets one entry, reused by that exact name afterwards. Things and
abilities stay separate entries even under one name. Two tagged entries whose
names are forms of one name are flagged as possible duplicates.

**Holdings** — what each character has, uses, knows and is, as four facts kept
apart: a thing is *owned* (with a count) and may be *equipped* (in use);
an ability is *learning* or *learned* (with a level), and a learned one may be
*sealed*. Putting a sword away keeps it owned; sealing keeps an ability known;
*usable* is worked out (learned and not sealed). Rank belongs to the
character. The tag words: `has`, `gained`, `lost` (used up, broken, given
away, stolen, sold; with a count and reason), `equipped`, `unequipped`;
`knows`, `learning`, `learned`, `improved` (to a new level), `sealed`,
`unsealed`; `rank`. `has` and `knows` mark the first time the story shows
something a character already had. Only what happens in the story's present
counts, never a plan, promise, dream, memory or lie.

**Holding change** (`HoldingChangeAttachment`): one tag, saved as a
manuscript span attachment on its sentence, so the HARNESS, a person or a
familiar write the same record. What everyone holds is never stored:
`deriveHoldings` works it out again from each chapter's current changes, in
story order, so reading a chapter again cannot count anything twice and a
rewritten chapter changes the result. Taking a thing in hand or putting it
away shows the character has it, so the first time the story shows a thing
that way, it is recorded as held. Its rules flag a change that cannot be true
and leave it out: losing what is not held, a second gain without a count,
improving what was never begun, sealing what was never learned, a count or
level the record cannot match. Moving up a stage while still learning is
progress: the stage is recorded, and the ability stays learning until it is
learned, keeping that stage. After an edit, every later chapter is checked again.

**Closing list** (`closingHoldings`, the reply's `mainCharacterHoldings`): the
main character's things and abilities by name after the chapter. Each list is
checked against the record after its chapter; what it leaves out, and what no
tag recorded, are flagged. The 10-chapter test compares the chapters' prose
against the Holdings page.

**Holdings fixer** (`shared/holdingsFixer.ts`, run after commit by the
controller): the chapter's own flags (`chapterHoldingFlags`) become small
cases (`planHoldingsFix`): a sentence with its neighbours, its tags, what
the record showed before the chapter and what the chapter itself recorded
about the same item before that sentence; a closing-list name with the chapter's sentences that name
it after the chapter's own last tag for it (all of them, when it has none);
or two names that may be one entry. A closing-list name with no such sentence
(the chapter never names it, or names it only up to its own last tag for it)
is settled as fine without a call: nothing in the chapter could show a change
the tags missed. With no case left, nothing is called, so a chapter with no
flags of its own, or only settled ones, makes no call, and an earlier
chapter's flag never makes a later one call. Otherwise one `fix-holdings` call
with the chapter's own model answers every case with one of the answers it
allows: `record` (the tags are wrong; for two names, they are one entry),
`prose` (one sentence is wrong), `fine` or `major` (a contradiction too big
for one sentence or tag, recorded and left as it is). `applyHoldingsFixes`
keeps a fix only when it leaves the chapter with fewer problems: corrected
tags on the same sentence, one sentence rewritten in place (never one a Sound
Cue or speaker sits on; every span after it moves with the text by the
manuscript's own rule, `rebaseSpan`), or the chapter's new entry merged into
the one already there, which learns the new name as an alias. Every case's
outcome is kept on the chapter (`HarnessChapter.fixer`, in the export). How
far it may go is the host's choice (`HarnessHoldingsFixerPolicy`: off, records
only, or records and sentences); in the Library it belongs to the Familiar.

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
  SEN language) and schema 27 (arcs of 30 chapters) have no upgrade step.
  Every story before schema 27 was a test story planned in 100-chapter arcs,
  so the product owner chose to start fresh: earlier workspaces are
  preserved untouched and the page opens empty, and the upgrade steps for
  schemas 22 to 26 are gone. Any later reset needs the same explicit
  approval.
