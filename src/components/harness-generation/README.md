# Harness Generation

Where `reference/` exists, it holds the old production version, kept as reference
material for the remake; it is not edited or refreshed. New features do not get a
reference folder. Old systems stay until each is remade on the new path; never
reconnect them as they are or re-sync with the old production app. The destination
is SEN, Library and NovelExpanded built here, guided by `NOVEL_EXPANDED.md`.

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
as paragraphs with their Sound Cues, and carries saved recaps, story
direction, and the current canonical state into the next chapter while the
complete prose, evidence, and memory history stay in storage.

It is not a replacement, wrapper, import path, or compatibility layer for the
existing Chapter Generation feature.

## Workshop record

| Field | Value |
| --- | --- |
| First Workshop record | 2026-08-29 |
| Last recorded Workshop update | 2026-10-06 |
| Historical source inspection | 2026-09-12 — verified the creative author direction in `Light-Novels/src/server/prompts.ts` on `main` before extracting the Author skill |
| Lifecycle status | Reader-directed continuation (Fate page) in a Reader on the Text Highlight Engine that reads aloud in three voices over the SEIHouse audio player's soundtrack, with holdings tagged by the writer, checked by plain rules and quietly fixed after each chapter by the Holdings fixer, the newest chapter rewritable with a note, the story's point of view kept from its opening, and failed writes never saved |

### History

- **2026-10-06 (A stage reached while still learning is kept; the fixer sees the chapter's own earlier tags):** From the owner's Sundered Heavens test. In Chapter 4 the writer began Heaven-Shattering Body Cultivation and then tagged its first stage (`improved … | Stage 1`); the rules called that improving before learning, raised a check and dropped the stage, so later chapters' writers never knew he had reached it (Chapter 6 tagged "began learning" again). Moving up a stage while still learning is now progress, as cultivation stories tell it: the stage is recorded, the ability stays under Learning (the writer reads "(Stage 1)", the Holdings page shows it), and a later `learned` keeps that stage. Improving an ability never begun is still a check. Because holdings are worked out from the tags every time, stories already written are read the new way: the owner's export now has no checks, and its seven chapters would make no fixer call. The fixer's sentence cases also show what the chapter itself recorded about the same item before that sentence (`earlier in this chapter, …`), so a case is never judged without it.
- **2026-10-06 (The Holdings fixer is called only when needed):** On the owner's ask, the fixer is never called unless a check flags a problem in the chapter itself that the plain rules cannot settle. That already held (the call is made only for cases built from the chapter's own flags); one rule is now exact: a closing-list problem is asked about only with the sentences that name the item after the chapter's own last tag for it, and with none it is settled as fine without a call, since nothing in the chapter could show a change the tags missed (a sword gained here and never named again, or a pill used up here and still listed). A sword gained and then named again, as it snaps, is still asked about, with that sentence alone. `holdingsFixerChapter.test.ts` guards it across chapters: clean chapters and closing lists nothing could fix make no call, and a problem answered "fine" in one chapter never makes a later one call.
- **2026-10-06 (Phase 3: Rewrite this chapter, and the Holdings fixer):** Two pieces, chosen and ordered by the owner. **Rewrite this chapter:** at the end of the newest chapter, until the next one is written, the Reader shows one quiet link that opens a box for an optional note (`ChapterRewrite.tsx`). `rewriteLatestChapter` writes the chapter again as one new attempt, prepared from the story as it stood before it (`withoutLatestChapter` in `shared/chapterRewrite.ts`: the chapter, the Codex entries it brought in, its goal outcomes, broken route and ending, and a direction chosen after it, all gone), with the chapter's own direction back in place. The request carries `rewrite` (the note, and the replaced version's title and recap, never its prose), and the writer is told to write the chapter afresh from the same point. The new version replaces the old one only when it commits, in one write; the replaced attempt keeps its reply (`replacedByChapterId`), so the export still shows it. `chapterRewriteGap` refuses while anything is built on the chapter (a chapter being written, a running batch, the next arc already planned from it, story memory or the reader's corrections on it). A failed rewrite changes nothing and keeps the reader's note; a rewrite interrupted by a closed page fails instead of holding the story, and retrying a failed one rewrites again. **Holdings fixer:** after each chapter commits, the controller turns the chapter's holdings flags into small cases (`planHoldingsFix` in `shared/holdingsFixer.ts`), settles closing-list names the chapter never mentions without asking, and sends the rest in one `fix-holdings` call with the chapter's own model at its lowest reasoning level, no randomness and a 60-second deadline (`src/server/harness-generation/holdingsFixer.ts`, registered in the Model Router as Holdings Fixer, with its own visitor bucket). `applyHoldingsFixes` keeps an answer only when it leaves the chapter with fewer problems: corrected tags, one corrected sentence (never one a Sound Cue or speaker sits on; spans after it move by the manuscript's own `rebaseSpan`), or a new entry merged into the one already there, which learns the new name. A contradiction too big for one sentence is recorded as `major` and left. Every case is kept on the chapter (`HarnessChapter.fixer`, exported), and a rewrite takes back what the fixer did. The host sets how far it goes (`holdingsFixer`: `off`, `records-only`, `records-and-sentences`, the default); `useLibraryStories` carries it, which is where the Familiar will control it. The app sends the reader's token with it but never asks for one on its behalf. The reader sees none of it. Schema 28 (optional fields, a no-op upgrade from 27). The fixer's instructions are on the Writer Instructions page.
- **2026-10-06:** Removed the separate memory model call, its on-request control and the recurring story-memory-incomplete warning. Chapter writing, acceptance, saving, Reader behavior, recaps, canonical-state readers and Holdings are unchanged. Historical stored extraction fields remain readable and ignored; no schema migration. SEN 0.21.0 removes the controller method/option and adapter method; Library’s peer range remains valid.

- **2026-10-06 (Phase 1 fixes from the owner's Sovereign Hive test):** Fixes only, no new features. **Sound tags:** 14 of 15 sound tags in the test sat on their own line or between sentences, with words of their own, leaving lower-case fragments ("his pick scraped salt crystal") and repeated phrases. Sound Cues 2.1.0 asks for tags around words already in the sentence, and acceptance now settles any tag that still lands outside a sentence (`soundTagRepair.ts`): its words are removed, its sound moves onto the nearby words that echo them (within the cue's 8-word limit), else onto the nearest sentence, and the chapter carries a `sound_tag_moved` warning. A paragraph never starts with the full stop a tag left behind. **Speakers:** Chapter 3 copied `[[@Name]]` from the instructions for 14 of Bo's lines. A placeholder speaker now counts as no tag (unless the story has someone by that name), so the line is voiced from its narration, and Speakers 2.1.0 shows no placeholder name to copy. **Holdings:** the list had grown into a notebook (plot facts, names with counts in them, and Chapter 1's tags written inside the closing list). `holdingName` takes a count or description out of a name ("Spirit Pill ×3", "3 Spirit Pills", "Core (cracked)"), keeps a number that belongs to the name ("1000 Year Ginseng"), and sets aside a name that reads as a note (a sentence, a sighting, a countdown); tags written in the closing list are recorded at the chapter's end, once, never repeating a change the prose already tagged; Holdings 2.1.0 asks for things and abilities only. **Writer:** the response contract keeps countdowns out of recaps and says an older recap's span of time counts from its own chapter ("nine days" had stood still for four chapters), and forbids leaning on a pet word ("arithmetic" ×13); the chapter request gives a words-per-paragraph guide and calls anything under the minimum too short (two chapters had come in at 1,594 and 1,248 words). Recorded in the Writer Instructions history. SEN 0.20.0.
- **2026-10-05 (The Reader's soundtrack is the SEIHouse audio player):** The owner's audio player (`@seihouse/audio-player` 4.0.0) replaces the single-channel player as the Reader's sound. `useReaderSoundtrack` (this folder) connects `HarnessReaderSession` to the host's reader mixer: the reader's chosen atmosphere plays while the chapter is on screen and fades out while a page covers it (Fate, Holdings, an arc's page, the writing screen), keeping a sleep timer, and leaving the Reader stops every layer; only the layers the chapter uses appear (Sound Cues when it has some; soundscapes are not chosen yet); the chapter's cues are warmed; while Listen speaks, the soundtrack dips (`LISTEN_DUCK`, 0.6) and the reader counts as active; a sleep timer that fires stops Listen too; the chapter's navigation coming into view, or Listen finishing the chapter, is the chapter's end. The player's ghost note sits above the Listen bar (tap mutes, long-press opens Audio; with no speech it still shows), and Reader Settings opens with Audio (the player's approved `ReaderMixerPanel`, loaded when the sheet first opens) before Narration. Sound Cues play through the mixer (`MixerCueControl`), overlapping, at their Energy. Without a host mixer none of this appears. SEN 0.19.0, Library 0.19.0.

- **2026-10-04 (A chapter stopped at the deadline says so):** After six OpenRouter chapter models were added (PR #319), the owner's chapter never arrived and the server logged "The configured model returned an empty response". The model was still writing when the HARNESS's 170-second deadline stopped it; OpenRouter answers 200 at once and holds the reply open, so the deadline landed while the reply was read and the error was swallowed. The server now reports the deadline, and the Reader says "The model was still writing after 170 seconds, so it was stopped. Choose a lower reasoning level or a faster model in the Model Router." GLM 5.3 Flash, Qwen 3.8 Flash and DeepSeek V4.1 Flash thought past the deadline on their own defaults; the Model Router now sends each a level that finishes, and routes GLM to its fastest OpenRouter provider (Library 0.17.1). Each answer logs one line with its model, time and token counts, never the story.
- **2026-10-04 (The writer's tags, one strict shape; sound tags; the Writer Instructions page):** The owner's two exports showed the tag instructions were worded too loosely: no speaker tags at all in either story's Chapter 1, 36% of sounds lost (3 to numbers that fell out of step with the list, 7 to the five-word limit). The owner approved one shape for every tag kind, then asked for it audited down to what the writer needs, so more kinds can stack.
  - **One shape:** every tag kind is taught as JOB, FORMAT, REQUIRED, FORBIDDEN and CHECK BEFORE YOU RETURN. What every tag shares is said once, as the HARNESS tag rules (`HARNESS_TAG_RULES`, `shared/tagRules.ts`), just before the first skill that teaches a tag: tags are machine notes removed before anyone reads; write each exactly as its FORMAT shows; each paragraph reads complete without them; never outside paragraphs; never written about in the prose. CAPA slots that teach a tag say so (`writesTags`). SEN Speakers 2.0.0 (every chapter including the first, one speaker per paragraph), SEN Holdings 2.0.0 (the same rules as a table) and SEN Sound Cues 2.0.0. The three kinds and the rules are 737 words, down from 874.
  - **Sound tags:** the writer puts a sound tag on the words where a sound happens, `[[sound: Sound Word | Words | Energy]]`, and the reply format no longer asks for a `soundCues` list, so no number can fall out of step. `readMarks` reads the tags (with the story's sound words, one written the other way round reads right); `placeSoundCues` places them. A writer that still returns the list, or still writes numbered marks, places nothing and is told so; the words are kept. The story's sound list is one line per word (`blade drawn: drew his sword`), after one example tag made from the first word.
  - **Eight words:** by the owner's decision a Sound Cue fits 1–8 whole words (`SOUND_CUE_RULES.maxWords`), for the writer and for cues placed by hand, so a natural phrase ("a horn blared across the terrace") keeps its sound.
  - **Writer Instructions:** a Workshop page (`?preview=writer-instructions`) shows every block the chapter writer reads before the story, from the live code, with its version, size and last change. A dated history records every change, and a test fails until a change is written there, so the instructions never change without the owner knowing.
  - **Versions:** SEN 0.17.0, Library 0.17.0.
- **2026-10-03 (What a five-chapter test showed: point of view, failed writes, titles, holdings):** The owner's Goblin test story (five chapters, exported) switched its point of view, saved a failed write as Chapter 3, numbered its own titles, and lost an item from Holdings. Each is fixed where it starts.
  - **Point of view:** Chapter 1 was told in the third person, Chapter 2 in the first, Chapter 4 switched mid-chapter, and Chapter 5 went back. The Japanese Style allows first person or close third, which is right for that tradition, but the writer sees only recaps of earlier chapters, never their prose, so it could not see which one the story opened in. The Style still chooses; the HARNESS now remembers. It reads the story's point of view from its earliest committed chapter that shows one clearly (`storyPointOfView`, `shared/pointOfView.ts`: in English narration with speech left out, "I", "me", "my" and "myself" against the main character's names, at least 8 and twice the other; anything less clear reads as nothing), carries it in Current Story Information (`CurrentStoryProjection.pointOfView`, worked out each time, never stored), and the response contract tells the writer to keep it and never switch. The SEN Speakers skill no longer mentions first person (v1.2.0: "whatever name or pronoun the prose uses for them"), so point of view is the Style's alone.
  - **Failed writes:** Chapter 3 came back as four paragraphs and 104 words, two of them the writer's own notes about the task ("Need fix tag syntax…"), with none of the fields that follow a chapter, and it was saved, because a short chapter was never refused. By the owner's decision that rule changes: a reply under a quarter of the chapter's minimum (`HARNESS_FAILED_WRITE_SHARE`, 450 of 1,800 words) is a failed write (`harnessFailedWrite`). It is never saved, its raw reply stays on the attempt, and the Reader says "Chapter 3 was not saved. The writer stopped after 104 words, far short of the 1,800 a chapter needs. You can try again." with Next ready to try again. A chapter that is only short is still kept and flagged. So that a whole chapter in Thai, Lao, Khmer or Burmese (written without spaces between words) is never mistaken for one, `countHarnessWords` now counts those words by the language's own rules (`wordRanges`); before, a Thai chapter counted about a fifth of its words.
  - **Titles:** the writer named every chapter "Chapter N: …", so the Reader showed "Chapter 3" twice and Read Aloud said it twice. Acceptance now drops a chapter label from the writer's title (`chapterTitleText`, `src/narrative/chapterTitle.ts`, in every SEN story language); a title that was only the label takes the HARNESS's "Chapter N". The Reader heading and Read Aloud do the same for chapters already saved, and the response contract says a title is the chapter's name alone.
  - **Holdings:** Chapter 1 tagged the slate Grit pulled from under a stone only as equipped. Equipping something the record did not show as held was flagged and left out, so the slate never reached Holdings and the writer dropped it from Chapter 2. Taking a thing in hand, or putting it away, now records it as held the first time the story shows it. Losing something never recorded is still flagged.
  - **Tests:** every test chapter is now long enough to be a chapter (`writtenChapter`, `src/test-utils/writtenChapter.ts`), and the failed write is the owner's own Chapter 3 reply (`STOPPED_WRITE_REPLY`).
  - **Versions:** SEN 0.16.0, Library 0.16.0.
- **2026-10-03 (Read Aloud: what worked in production):** The owner, testing on Windows, heard the main character and everyone else in one voice, and a pause of about three seconds whenever a character's voice began; production's Read Aloud never did either. We took what worked from production (`light-novels`, `useReaderPlayback`, `webSpeechCast`), not a copy.
  - **Who speaks:** a real export showed the writer tagging about half the spoken lines (Chapter 1: none of 45), and untagged speech went to the Side voice, the main character's included. Production's writer labelled every paragraph, and read an unlabelled quote in the main character's voice. Now Read Aloud reads speech nobody tagged from its narration (`narratedSpeaker`): the sentence after the quote ("…,” Lin Xiao said.), else the ones leading into it, names someone else first, so the Side voice; otherwise the main character's voice, production's default (`UNTAGGED_SPEECH_ROLE`). A quote whose own narration names no one takes another of its paragraph's speakers, one speaker to a paragraph as production read it; a pronoun is never guessed. Against the six chapters' own tags it never disagreed (42 of 42). It runs when the chapter is read, so chapters already written are voiced the new way. The Reader passes the main character's names from the chapter's frozen Story Information (`protagonistNames`).
  - **The pause:** our default voices were online ones on Windows (Chrome's Google voices, Edge's Microsoft Natural voices), which fetch every line. Production landed on the computer's own voices. `chooseDefaultVoices` now takes a voice on the device before an online one and a pick's standard voice before its Enhanced or Premium one, and the Library's picks are production's cast: Daniel or Google US English narrates, Rishi or the device's next voice (Microsoft David) is the Protagonist, Samantha or Zira the Side voice. Like production, the player clears the browser's queue before every line and waits 50 ms after a line ends. Reader Settings marks online voices. A reader's own saved choice still wins.
  - **Versions:** SEN 0.15.0 (breaking: `UNTAGGED_SPEECH_ROLE` is the Protagonist voice), Library 0.15.0.
- **2026-10-03 (Arcs of 30 chapters; goals as budgets):** The first real Holdings test (exported with Export story) stayed on one scene for six chapters: Arc 1's first goal had 25 of its 100 chapters, the writer was told to pace it across them without delivering it early, and a goal reached early stayed active until its segment ended.
  - **Arcs:** every arc is 30 chapters (`ARC_LENGTH`), the standard size the product prices and sells by.
  - **Handover:** a goal reached early hands over to the next in the following chapter, which keeps its own deadline and gains the spare chapters (`activeArcGoal`); once every goal is resolved the last stays active, as reached.
  - **The writer:** the response contract says a goal's chapters are a budget, not a quota (`completionDeadline` is the latest chapter, never a length to fill), that every chapter changes the story's situation and never ends where the last one ended, that the goal is the destination and not the only subject, and that a reached goal (`completionConfirmed`) is written past, never staged again. The next-chapter ideas must move the story on from where the chapter ends.
  - **Edits:** an arc edit can no longer give a goal not yet reached a deadline before the next chapter: `editArcGoals` refuses it in plain words, so no chapter works toward an overdue goal. Before, the edit was saved and the goal recorded missed in the next chapter.
  - **Storage and versions:** schema 27 upgrades nothing older, by the owner's decision (every earlier story was a test story): older storage is kept untouched and the page opens empty. SEN 0.14.0, Library 0.14.0.
- **2026-10-03 (Holdings: the tag system's first information tags):** The owner's number-one long-story problem: by chapter 10 the main character had ten abilities and seven weapons, because nothing remembered what they held. The writer now has two jobs in one call, the chapter and its tags, and no second call is added. Definitions live in [the vocabulary](./ARCHITECTURE_VOCABULARY.md#the-tag-system-the-tiny-sen-language).
  - **Word tags:** `readMarks` reads `[[word: who | what | more]]` (`TAG_WORDS`, with the other spellings each accepts); nothing it reads or cannot read reaches the prose.
  - **Holding changes:** each tag is saved as a `HoldingChangeAttachment` on the sentence it points at (`placeHoldingChanges`); a tag alone in its own paragraph moves to the next. When the chapter commits, every name resolves to a Codex entry with an app-made ID (`resolveHoldingChanges`, `HarnessWorkspaceState.codexEntries`); `MC` is the main character.
  - **Never stored, always worked out:** `deriveHoldings` rebuilds what everyone holds from each chapter's current changes in story order: owned with counts and equipped; learning or learned with a level, and sealed. Plain rules flag what cannot be true and leave it out; the writer's closing list (`closingHoldings`) is checked after each chapter; close names are flagged as possible duplicates.
  - **The writer reads it:** a protected Holdings section (section 8 of the packet) shows the main character first, then the most recently changed others. The SEN Holdings skill (an always-managed `holdings` slot) teaches the tags with placeholders, the pacing rule (use and grow what they have; new things only when the story earns them; finding a manual is not learning it) and the closing list (`mainCharacterHoldings` in the reply, a plain list of names).
  - **The Reader:** a Holdings page beside Fate lists each character's holdings, each change linked to its passage, and the Checks worth testing.
  - **Storage and versions:** schema 26 adds `codexEntries`, `HarnessChapter.holdingChanges` and `closingHoldings`; chapters written before carry over with nothing recorded. SEN 0.13.0, Library 0.13.0.
- **2026-10-02 (Listen voices from the owner's test; Fate Survival paths; a fixed chapter length):** Changes from SENSEI's first real test on the preview.
  - **The main character's own speaker tag.** A real chapter read the main character in both the Protagonist and the Side voice, and often in the Side voice. The protagonist was decided by matching the writer's tag to the main character's full name, so a shortened name of more than one word (a hyphenated given name such as "Jin-Woo" for "Sung Jin-Woo") fell to the Side voice, and the Story Seed's main character carries no nicknames to match. Production instead trusted the writer's role label on each line. Now the writer tags the main character's speech `[[@MC]]` whatever name the prose uses (`MAIN_CHARACTER_SPEAKER_TAG`, SEN Speakers v1.1.0), and the record is saved under the name Story Information gives them. A name tag remains the fallback: a part of one of the main character's names, word for word, counts when no other declared name shares it (`isProtagonist`). Chapters written before keep the voices they were saved with.
  - **Fate Survival offers the four paths.** The Fate page now offers Fate Survival the writer's three suggested directions as well as the reader's own words, as Regular Reader mode does. Nothing is automatic: there is no "Let fate decide", nothing starts chosen, and a chapter still waits for the reader's choice (`validateChapterDirectionChoice` accepts a chapter function in both modes). When the Reader opens the Fate page for a waiting chapter, focus lands on the first path rather than the text box, so a phone keyboard doesn't cover the options.
  - **Chapter length fixed at 50 paragraphs for testing.** `HARNESS_CHAPTER_PARAGRAPH_RANGE` is `{ min: 50, max: 50 }`, so every chapter asks for exactly 50 and the writer's accuracy can be compared chapter to chapter (the Harness Generation page shows "N paragraphs (50 asked)" and flags a miss). The range to return to is 40 to 80; `harnessChapterParagraphTarget` takes a range for that.
- **2026-10-01 (Read Aloud and dialogue speakers):** The owner asked for the prototype's triple-voice narration, remade rather than ported. **Reader:** `HarnessReaderSession` gains Listen and Reader Settings, whose only section is Narration.
  - **Voices:** the Narrator reads prose, the Protagonist voice the main character's spoken lines, the Side voice everyone else's.
  - **The light:** the sentence being spoken is lit through the engine's overlay, and the page follows it unless the reader is scrolling.
  - **Leaving the chapter:** Fate, a new arc's page and the writing screen pause speech; listening carries into the next chapter.
  - **Where it lives:** the engine is SEN's (`useReadAloud` in `./reader-runtime`); the host supplies `readerPreferences` and the Library its voices.
  - **Speakers, the third kind in the tiny SEN language:** the writer puts `[[@Name]]` before speech (SEN Speakers skill, an always-managed `speakers` slot). The HARNESS saves one speaker record per quoted line with whether the speaker is the main character, decided from the attempt's frozen Story Information (`placeSpeakers`, `protagonistNames`). Untagged speech is read in the Side voice and flagged (`speaker_tags_incomplete`). The response schema is unchanged.
  - **Storage and versions:** schema 25 adds `HarnessChapter.speakers`. SEN 0.12.0, Library 0.12.0.
- **2026-10-01 (Arcs planned as they begin):** Following the owner's World Blueprint direction (`NOVEL_EXPANDED.md`), a story made from a Blueprint starts with Arc 1 only: the Foundation takes `initialArcPlan`, the story's length (`plannedArcCount`) and the Blueprint's hidden look-ahead (`initialArcLookahead`, copied onto `HarnessStory.arcLookahead`); the whole-route `arcRoadmap` is gone. Each later arc is planned when the reader begins it (`planNextArc`, which handles every planning state), never inside a chapter write: `arcPlanGap` stops the chapter until then. Only the planner receives the planning context (`HarnessArcRequest.planning`: the arc's place in the length and whether it is final, the last three arcs' goals with their outcomes and a tally of earlier ones, and the look-ahead); it returns a goal draft, a fresh look-ahead and the ending, and the HARNESS assigns arc numbers and goal identities. The chapter writer never sees the look-ahead. Before an arc's first chapter its goals wait on the reader's review in both modes (`arcReviewGap`; Arc 1 is reviewed in the Blueprint): accept, or edit, which counts as the review; a public Regular novel can still accept. `nextArcStep` is the one answer the Reader, the Fate page and the Workshop page read. In the Reader, Next at the end of an arc says "Arc N begins" and opens `BlueprintArcPage`, the World Blueprint's goal section, which plans the arc, shows its goals for review, then writes (Regular) or directs (Survival) its first chapter. A batch pauses at the gate with the reason. Stories without a planned length still plan their next arc at each boundary. Schema 24 drops every stored roadmap copy. SEN 0.11.0, Library 0.11.0.
- **2026-10-01 (The way in, the new Reader, one veil):** A new story now goes Story Seed → World Blueprint → **World Info** → **Reader**. **World Info:** after Start Story, the Story Seed Workshop host opens `?preview=harness-generation&story=<id>&info=<id>`, and the Library surface shows the story's World Info page before its panel (`StoryDetailScreen` with `harnessStoryDisplay`: title, genre, the Seed's tags, the Blueprint logline or else the premise, and the chapter count; no invented art, author or arc). A story with no chapters offers **Start Story** (the World Info page's new `onStart`): the Reader opens and begins Chapter 1 at once (`startOnOpen`; Regular Reader writes it, Fate Survival asks for its direction first). A story with chapters offers Start Reading, or Continue · Ch. N from the host's Reader state. Back from the Reader returns to World Info, and Back from World Info to the panel, which gains a World Info button; "Open in SEN" is now "Open Reader Chamber". The Workshop keeps both pages in the URL (`info`, `read`). **Reader:** `HarnessReaderSession` is rebuilt as just reading. Each paragraph sits on the read-only Text Highlight Engine (block `c{n}-p{i}`) with its Sound Cues (`InlineAudioText`). It keeps Previous and Next, Next at the newest chapter (write, direct, or see how it ended), the Fate page from its header, and the reading place in host Reader state. The packaged Reader Chamber, Codex sheet, Mind Palace, reading settings and themes, reader translation, read-aloud and read marks are gone from it; their saved records are left untouched. With `renderWriting` the host shows a screen while a chapter is written: the Library shows the Aura Veil with the host's agent (`writingAgent`; the Workshop passes Versa), naming the chapter without a percentage it cannot know. **Memory:** the controller takes `chapterMemory: 'after-commit' | 'on-request'`. The Library uses `on-request`, because the Codex waits: the separate memory call no longer runs after each chapter, and the inspection panel's "Recover memory from saved prose" runs it on request. Chapters keep their recaps and Story Seed foundation for continuity. SEN 0.9.0, Library 0.9.0.
- **2026-09-29 (Basic paragraph counter):** The most basic chapter length control, with no story styles yet. For every chapter the HARNESS rolls an exact paragraph count from one range, 50–100 (`HARNESS_CHAPTER_PARAGRAPH_RANGE`, `harnessChapterParagraphTarget`). The roll is seeded by story and chapter number, so chapters vary in length while a retry keeps its number; it is frozen on the Immediate Chapter Request as `chapterScale.paragraphs`. The response schema requires exactly that many paragraphs (`minItems` = `maxItems`), the request says "exactly N paragraph entries" beside the unchanged word range, and `http.ts` refuses a count that is not a whole number from 1 to 600. A chapter that misses is kept, never retried, and flagged (`chapter_paragraphs_off_target`, `metrics.paragraphTarget`); the Workshop chapter row shows the count asked beside the count returned. Schema 23 upgrades schema 22 unchanged. Styles with their own ranges come after this is proven with a real model.
- **2026-09-29 (Tiny SEN language, part 1: the switch):** Chapters now speak the tiny SEN language, with narration and Sound Cues only. **Writer:** the model wraps the one to five words where a sound happens (`[[n|words]]`) and names it in a flat list (`soundCues: [{mark, sound, energy?}]`), choosing only from the story's sound words. The new managed CAPA slot **Sound Cues** (`media-loadout`, after Translation) carries SEN's bundled `SEN_SOUND_CUES_SKILL`; the story's frozen words close it as an example list whose header says the lines show how to mark and are not text for the chapter. A story with no sound words gets no section and no schema field. **Response contract:** `buildHarnessChapterResponseSchema(words)` drops dialogue, manifestations, System Panels, soundscapes and creature events; `soundCues` follows `paragraphs` with the words as an enum and a cap of ten; the contract keeps its no-invented-IDs guard and carries no Sound Cue wording. `http.ts` checks the words against the pack limits and answers 400 otherwise. **HARNESS:** media is frozen before CAPA; acceptance strips every mark from every reply string, then `placeSoundCues` places each cue on whole words (1–5, never in a system line, no overlap, first ten in reading order), picks that word's recording (matching Energy first, stable rotation), and stores a `SoundCueAttachment` span on paragraph `c{n}-p{i}`; set-aside cues become plain warnings. **Storage:** schema 22; `HarnessChapter` keeps paragraphs, prose and metrics, gains `soundCues`, loses `blocks`, `audioMoments` and `soundscapes`; by the product owner's decision there is no upgrade step, so earlier workspaces are kept untouched and the page starts fresh. **Reader:** one narration block per paragraph with its Sound Cues; the memory-based speaker guess is gone until dialogue is rebuilt. `acceptedChapterMedia.ts` and the World Cue intent system are deleted. SEN 0.8.0, Library 0.7.0.
- **2026-09-29 (Tiny SEN language, part 1: foundation):** First half of narration + Sound Cues in the tiny SEN language; how chapters are written is unchanged until part 2. **Sound words:** a Sound Cue recording now names the event it answers (`metadata.sound`, e.g. "blade drawn"), and a catalog declares its words with a 1–5 word example each (`SoundWord`, `validateSoundWords`, `soundVocabulary`). The default library's 92 Sound Cue recordings carry 30 starter words (`src/audio/data/library-sounds.v1.json`) and Energy read from their names. **Studio tags:** SENSEI's tagging system (`src/audio/audioTags.ts`): a Sound Cue's parent is its cue category, a Soundscape's parent is ADVENTURE, AMBIENT, EMOTIONS, FIGHTING, WAR or SPECIAL, and both share Tone, Energy and Tension. **Packs:** a Sound Cue Pack declares `sounds`, every recording names a declared word, and an equipped pack replaces the default Sound Cue set (words and recordings); the frozen Media Loadout carries the attempt's words and the Media Loadout panel lists them. **Marks:** `src/narrative/marks.ts` reads and removes `[[n|words]]` marks, tolerating the slips a writer makes, for part 2's contract. See `MEDIA_LOADOUT.md` and `src/audio/README.md`.
- **2026-09-26 (Story Settings: Translation and Accessibility):** Implements `docs/history/translation-accessibility-audit.md` with one product rule: users configure the story, the HARNESS decides the skills. **Story Settings:** the Story Seed's Settings sheet now holds Story Language (the existing Original Language control, moved there; the Blueprint Review confirms it read-only) and a new Reading Mode (production's Standard, Clear Reading, Easy Read, Literal Reading, `seed.story.optional.chapterWritingStyle`, kept out of every Blueprint request). A new seed takes the account's defaults; a saved seed keeps its own. The story copies both at creation (`HarnessStory.originalLanguage`, `HarnessStory.chapterWritingStyle`), and the novel page's Story Settings panel shows the Story Language and lets the owner change the Reading Mode for chapters still to come, in plain terms. **Managed slots:** `managedBy` now has three kinds. Accessibility (`reading-mode`) loads SEN's bundled skill for the mode (`SEN_READING_MODE_SKILLS`, production's instructions word for word), nothing for Standard. Translation (`story-language`) loads nothing for English, otherwise the one installed `generation` package for the language through `resolveTranslationPackage`, the rule Reader translation now shares; with none the chapter is still written and Story Settings says no specialized writing package is installed; competing packages are refused with a message. Neither slot is ever equipped by hand (`createStory`, `setSkillSlot`, initial loadouts and per-slot uploads all refuse), while Translation packages stay installable (`CapaSlotDefinition.installable`). **Prompt:** the Official Output Requirements travel only when Accessibility or Translation is loaded; a non-English story without a package gets only a one-line Story Language requirement and the machine-facing English rule; an English, Standard chapter carries none (about 320 estimated tokens saved). **Retry:** a failed chapter resends its frozen inputs only while the managed skills the story resolves still match, so a changed Reading Mode or package resolution rebuilds the request. **Surfaces:** the CAPA slot panel and SPP intake render only for a host that sets `showHarnessInternals` (the Workshop does); there the managed slots are read-only inspection cards. The Workshop's Dyslexic Readability sample is retired. Schema 21 removes hand-saved Translation and Accessibility references; a story without a Reading Mode reads as Standard. SEN 0.7.0, Library 0.5.0.
- **2026-09-26 (Library Create):** The Library workspace can open a requested novel: `initialStoryId` selects it once the stored stories load (the pre-hydration snapshot is empty, so the request waits for them; unknown ids fall back to the first story), and `initialFocus: 'next-chapter'` brings its Generate Chapter panel into view and focus once. The Workshop wrapper reads them from `story` and `focus`, which Library Create's Continue and Studio send, and which fixes Story Seed's existing "start story" handoff (it already sent `story=`). No HARNESS concept, contract or persistence changed.
- **2026-09-25 (Fate Phase 2):** Persistent steering is replaced by the reader's
  one-chapter direction. The HARNESS Reader's Alter Fate opens a new SEN **Fate
  page** (`development/FatePage.tsx`, built from `FatePanel.tsx`) showing the
  Destined Ending with its mode's promise, the active Arc Goal with where the
  route stands, and the next chapter's path. In Regular Reader mode fate decides
  by default (Rhythm's automatic pick), and the reader may intervene through four
  paths: one of the writer's three suggested directions, or their own words. Fate
  Survival offers only the reader's own words and writes nothing until they are
  given. In the Reader, Next at the newest chapter continues the story: Regular
  Reader mode writes the next chapter and opens it, Fate Survival goes to the
  direction step first (or writes once a direction is set), and the Fate page
  stays its own action for intervening. `controller.chooseChapterDirection` saves the
  choice as `HarnessStory.nextChapterDirection` for that one chapter; it survives
  failed attempts (a retry resends it, or rebuilds when the reader changed it)
  and is consumed in the same write that commits the chapter, which records its
  `path`. The choice travels only in the Immediate Chapter Request
  (`direction`); the packet's Rhythm section is sent only for automatic paths, so
  reader direction and Rhythm never compete. The Fate mode now reaches the
  writer (`storyDirection.fateMode`) and is fixed once a novel begins. Both modes
  now record Arc Goals honestly: a deadline chapter always commits, and a goal it
  did not achieve is recorded as missed (`ArcGoalCompletion.outcome: 'missed'`);
  the writer is never pushed into claiming success to save a chapter. The mode
  decides what a miss means (see "Fate modes" below): off track in Regular Reader
  mode, where a missed final goal lets the story continue past its roadmap toward
  the same Destined Ending; a broken route in Fate Survival, after which the next
  chapter must end the story and is saved only when its prose shows that ending.
  The writer reports, with a verbatim passage, that a Survival chapter completes
  the story's ending (`storyEnded`, for example a death); a story ends only when
  committed prose shows it, never on a chapter count, a broken route alone, or an
  unsupported claim. Every Fate Survival chapter call carries SEN's Fate Survival
  CAPA skill (`shared/fateSurvivalSkill.ts`) in the new mode-managed Fate slot:
  follow the reader's direction, pursue goals and the ending without forcing
  success, let consequences stand, and write the ending when the route breaks.
  An ended story writes and plans nothing more; no successor destiny is planned.
  The
  retired Survival visibility and Blueprint mystery/thread proposals, their
  packet section, `steerStory`, `revise-history` and the `NEXT CHAPTER ASSIGNMENT`
  wording are removed. Schema 20 migrates saved stories: a direction given since
  the last commit becomes the next chapter's direction, every earlier direction
  is kept read-only as `earlierSteering`, Survival keeps only its switch, and
  frozen attempts drop the retired fields. The Library workspace uses the same
  SEN Fate pieces in place of its steering form and private arc goal card.

- **2026-09-25:** The Story Seed handoff now carries the Blueprint's added world
  detail. Where the author wrote the world, society, or opening location, the
  Foundation keeps the author's line as the fact and adds the Blueprint's
  compatible detail beside it once: `World detail` and `Society detail` lines in
  `worldFacts`, and the opening detail on its own line after the author's opening
  in `openingSituation`. A detail travels only while its fact still reads as it
  did when the detail was generated or last reviewed, so a cleared or rewritten
  fact never receives a detail written for another. Generated supporting
  characters and factions that mention an author's character or faction now reach
  the Foundation as identities instead of being discarded upstream. The
  chapter-writing prompt and the packet's structure are unchanged; stories without
  detail keep identical Foundations. No HARNESS schema change.

- **2026-09-24:** Connected the Destined Ending and the Blueprint's arc roadmap.
  A story started from a reviewed Blueprint receives every arc's saved plan and
  the planned arc count (`StoryFoundationInput.arcRoadmap`/`plannedArcCount`);
  each arc keeps its own revision history (`harnessArcPlan`), and a roadmap
  story never calls the Arc planner at a boundary: after its final arc it stops
  with an explicit "route complete" error. The chapter request still carries
  only the active goal, its deadline, and now the arc's position on the route
  (`plannedArcCount`, `finalArc`); the response contract no longer tells the
  writer never to "complete" the Destined Ending, so the final arc can reach it
  while the ending stays user-owned. `arcGoalEditState` is the one edit rule:
  Regular Reader mode edits the active and upcoming arcs while the novel is
  private (completed arcs and completed goals never change); Fate Survival
  reviews each arc once (edit or `acceptArcGoals`) immediately before it
  begins and locks it when its generation begins (`arcGoalReviews`). The
  Destined Ending and arc count are fixed across Foundation revisions. Arc
  Goals are edited from the novel page's new Blueprint tab (Library
  `NovelBlueprintTab`), which also reopens and saves the novel's World
  Blueprint as a Foundation revision; the Active Arc Goal card and the HARNESS
  Reader Codex now show plans read-only. Schema 19 upgrades saved schema 18
  workspaces in place after the host keeps an untouched copy, instead of
  resetting them.
- **2026-09-24:** The Development Reader Chamber now reads saved HARNESS stories
  as a durable reading experience. `HarnessReaderSession` scopes the Reader
  runtime store to the saved story (story data and writes no longer touch the
  Workshop mock store), opens the last-read chapter, and routes Reader-owned
  fields — place, bookmarks, reader settings, read marks, decorative reveal
  backdrops — to host Reader state (`readerStateRepository`) instead of the
  correction journal. Codex, relationship, and media edits keep using the
  correction journal unchanged; bookmarks or settings already in the journal
  seed Reader state on first open and remain in the journal untouched. Image
  manifestation is disabled in HARNESS sessions (no durable image pipeline) so
  preview art can never be saved into a real story. The Workshop keeps the open
  story in the URL (`&read=<storyId>`) so a reload returns to the Reader. No
  HARNESS schema, prompt, Codex, or generation change; schema stays 18.
  Separately, the host repository no longer discards a workspace it cannot read:
  a stale or unreadable record is copied to a `preserved:` key in the same
  atomic write as the reset, and the Workshop offers it for download.

- **2026-09-23:** The Story Seed handoff reconciles the Seed and Blueprint first,
  so every Blueprint review edit reaches HARNESS through the Seed. Characters and
  factions come only from the Seed's structured lists (Blueprint-generated cast is
  promoted into them); the Blueprint contributes only its background and power
  outline prose. No HARNESS schema change.

- **2026-09-23:** Finished the Story Seed ↔ HARNESS verification; the upstream
  generation configuration is complete. The handoff now sends every Story Seed
  concept once: each character and faction travels only as a Foundation identity
  whose evidence is its single description (authored Seed entries with structured
  aliases, plus Blueprint additions); `characters` is no longer filled from the
  Seed, and `worldFacts` holds only World, Society, Power system, and Main
  Opposition. Title and opening no longer repeat inside World Identity JSON, Blueprint
  copies of authored entities are not re-sent, and storage IDs no longer reach the
  provider. No HARNESS schema change; stories created before this keep their frozen
  Foundation.

- **2026-09-20:** Story Seed Origin routing now retains Fate Survival settings and
  Blueprint mystery/thread proposals in a dedicated Foundation field. The packet
  and provider include one labeled Fate Survival context section only while enabled;
  disabled proposals remain saved but never enter ordinary chapter context. Pressure
  remains in rhythm direction and Destined Ending in story direction, each once;
  the handoff no longer copies any of these through `intendedDirection`. Schema 17
  resets stale Development HARNESS data; Story Seed and Blueprint storage stay intact.

- **2026-09-20:** Replaced the bloated Story Information delivery with the
  compact long-story generation packet. The Story Information Packet is now
  six distinct sections (`shared/context.ts`, `shared/canonicalProjection.ts`)
  budgeted by the one configuration in `shared/packetBudget.ts`: Current
  Story Information projected from stable Foundation fields (no Story Seed
  snapshot, storage record, or repeated copy), Destined Ending and Hard Pins,
  the Active Arc Goal from the existing Arc Plan authority, the persisted Fate
  Pressure rhythm direction with the previous chapter's matching suggestion,
  the latest five saved recaps, and the current canonical state: one latest
  applicable entry per resolved entity, deterministic alias and correction
  merging only, probable near-duplicates flagged for inspection, and
  relevance-ranked selection (current arc, request, cast, recent chapters)
  that compacts older entities before omitting any. Complete prior chapters,
  raw evidence passages, memory extractions, threads, mysteries, timelines, and
  the selection audit no longer reach the provider; the audit lives in packet
  `diagnostics` and the Development diagnostics panel. The Generation Model
  Call presents nine sections once, in order, adds the frozen Mission Reminder
  as its own request field, and returns the exact serialized request size,
  which the attempt persists (`requestMeasurement`). A provider retry resends
  the abandoned attempt's frozen inputs instead of rebuilding them from newer
  state. The per-story context policy and its controls were removed. Schema
  version 16 resets stale Development data.
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
  never rejects prose for them, and the commit saves them once with their chapter.
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

## Implementation inventory and boundaries
- `reference/` is a historical independent-baseline message. No legacy generator
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
`development/HarnessReaderSession.tsx` is the Reader: chapters on the read-only
Text Highlight Engine with their Sound Cues, and the Fate page. It owns no
second persistence path; the reading place is host Reader state.
`shared/senAdapter.ts` still derives the SEN story the controller's reader-edit
path uses, though the Reader no longer edits. SEN stays provider-neutral.

## Durable generation behavior

1. Persist `request_started` before a provider request.
2. Persist the raw provider response immediately after it returns.
3. Accept the paragraphs as the authoritative chapter, strip every mark from
   the reply, place each Sound Cue on the words its mark wraps with a
   recording from the frozen Media Loadout, and persist that accepted chapter
   draft. A malformed or unplaceable cue becomes a warning, never lost prose.
4. Persist the (now always empty) writer-lane event checkpoint so the existing
   retry and replay stages remain unchanged.
5. Atomically append a chapter with its paragraphs and placed Sound Cues,
   attempt receipt, and updated story head. A rewrite first takes the story
   back to just before the chapter it replaces, in the same write.
6. Replay existing committed events deterministically, with no memory model call.
   New chapter state comes from tags; historical canonical-state readers remain.
7. Run the Holdings fixer on the new chapter. Its outcome is saved as the
   chapter's `fixer` record; a failed call or write leaves the committed
   chapter exactly as it was.

Only a committed chapter enters the next context snapshot.

**Storage resets preserve data.** A saved workspace this build cannot read (an
older schema version or an unreadable shape; schema 22 deliberately upgrades
nothing earlier) is still reset for this build, but
the host IndexedDB repository first copies the untouched record to a
`preserved:v<version>:<time>` key in the same transaction, and the Workshop
lists it with a download control. Reader state (the reading place) is stored
separately and is never affected by a HARNESS reset. If storage fails,
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
versioned packages in one of the eight CAPA Schema slots (`CAPA_SCHEMA` in
`shared/skills.ts`): Author, Pacing, Fate, Continuity, Style, Accessibility,
Translation, and Sound Cues. Author, Pacing, Continuity and Style are equipped per
story. Fate, Accessibility, Translation and Sound Cues are managed: the HARNESS resolves
them from the story's Fate mode, Reading Mode, Story Language and Media Loadout at every
loadout freeze, and nobody equips them. Users configure those through Story Settings and
the Media Loadout and never see a slot. The Media Loadout itself is not a CAPA slot:
only its sound words reach the writer, as the Sound Cues skill's list. The bundled SEN Novel Author is a normal, replaceable generation skill, not
hidden creative Harness behavior. It is equipped for new and previously saved local
stories.

The host supplies validated `HarnessSkillManifest` records. The Harness persists an
exact `id` and `version` reference in the story and refuses to generate if a
referenced version is unavailable. For each attempt it freezes the equipped manifests
in schema order and assembles every generation skill, Author first, once, into one
CAPA Prompt (`assembleCapaPrompt`). The permanent HARNESS Official Output Requirements
follow the skills only when a chapter needs them (an Accessibility or Translation skill is
loaded, or the story is not written in English) and are shown as a locked inspection card
in Development; they are not a CAPA Skill and cannot be equipped, removed, or reordered. That CAPA Prompt is frozen on the attempt and is
the model's complete authoring instruction; it never enters the Story Information
Packet. Only manifests declaring the `generation` application contribute text.
Reader and post-commit applications may be recorded in the frozen CAPA Prompt's
skill inventory for their owning host runtime and send nothing to the writing model.

When any loaded skill teaches a tag (Sound Cues, Speakers, Holdings), the
HARNESS tag rules (`HARNESS_TAG_RULES`) come once, just before the first of
them: what every tag kind shares, so no kind repeats it. Like the official
requirements they are HARNESS text, never a skill.

The separate permanent `HARNESS_RESPONSE_CONTRACT` describes the chapter reply:
the paragraphs, the Arc Goal and ending evidence, the recap and the three
suggestions, and the guard against invented IDs, URLs and assets. It carries no
tag wording: how to tag lives only in the CAPA skills, and every signal travels
as a tag inside `paragraphs`, so the response schema
(`buildHarnessChapterResponseSchema`) has no list of signals. It is fixed
HARNESS infrastructure, never an installable skill or loadout slot, and
contains no asset catalog, R2 path, filename, track list, unlocked-resource
list, or pack contents. HARNESS retains validation, placement, generated IDs,
ordering, persistence, and checkpoint recovery; sound words stay
machine-facing English while the words a sound tag wraps stay in the story's
language. Every block the writer reads is shown, from the live code, on the
Workshop's Writer Instructions page.

The Workshop's sample skill manifests remain preview data only. Media Packs use
the separate inventory and runtime boundary documented in
[MEDIA_LOADOUT.md](./MEDIA_LOADOUT.md). Development includes only two tiny test
catalog fixtures and a Workshop-owned temporary test reward adapter; it does not define product
packs, marketplace behavior, currency, scheduling, or a reward economy.

## Chapter direction and continuation

The reader directs one chapter at a time. `controller.chooseChapterDirection(id,
choice)` saves the path for the next chapter only: one of Rhythm's three chapter
functions with the idea the reader picked, or the reader's own direction in
their words (either mode). `null` returns Regular Reader mode to fate's
automatic pick. The choice travels in the Immediate Chapter Request, stays
through failed attempts, and is consumed when that chapter commits; the committed
chapter records the `path` it took. Fate Survival requires a direction for every
chapter and cannot run batches. Corrections, not directions, change established
canon; Foundation/Blueprint future plans are subordinate proposals.

In the HARNESS Reader, Next at the newest chapter continues the story
(`ReaderChamber`'s `continueAfterLatest`, supplied by `HarnessReaderSession`):
Regular Reader mode writes the next chapter, through Rhythm unless the reader
chose a path, and opens it; Fate Survival opens the Fate page at the direction
step, or writes once a direction is set; an ended story shows how it ended. On
earlier chapters Next only navigates, and a swipe never writes. The Fate page and
Next share one writer (`useNextChapterWriter`), so a failed write reports the same
error in both places and keeps the chosen direction for the retry.

### Fate modes

Both modes record every Arc Goal honestly. A goal is achieved only when the writer
reports it with a verbatim passage from the chapter; when its deadline chapter
commits without that, it is recorded as missed. A chapter never waits for the
writer to claim a goal. The one chapter that can be held back is the one a broken
Fate Survival route requires to end the story: `missingRequiredEnding` keeps it
uncommitted until its prose shows that ending. `commitHarnessArc` applies the
rest, in the same write as the chapter:

| | Regular Reader | Fate Survival |
| --- | --- | --- |
| Who directs | Fate (Rhythm) by default; the reader may take any chapter | The reader, every chapter |
| Fate CAPA skill | None: the mode-managed Fate slot stays empty | SEN Fate Survival, loaded on every chapter call |
| Destined Ending | Guaranteed as the standing direction: every chapter pursues it; nothing forces the prose to reach it | Not guaranteed |
| A missed goal | The story is off track; the next goal begins; no consequence | Counted within its arc; the next goal begins |
| Route breaks | Never | When at least half of one arc's goals are missed (`goalsThatBreakRoute`: 1 of 1 or 2, 2 of 3 or 4, 3 of 5) or the final goal is missed (`HarnessStory.brokenRoute`) |
| Missed final goal | No ending is recorded. The story continues past its roadmap with that goal still its destination and no deadline (`route.status: 'past-final-goal'`); no arc or goal is invented. When the prose reaches the Destined Ending the story concludes (`reached-after-final-goal-missed`) | The route breaks (`final-goal-missed`) |
| After the route breaks | — | The next chapter must end the story (`route.status: 'broken'`, and the Fate Survival skill's ending rule). The reader still directs it. It commits only when its prose shows the ending (`storyEnded` with a verbatim passage); otherwise it is not saved, its direction stays in place, and the reader tries again. No recovery call is made. It may pass the arc's planned end but never begins, plans, reviews or locks another arc. A chapter that breaks the route and already shows a genuine ending ends the story at once |
| The story ends | The final goal achieved (`final-goal-completed`) | Only when committed prose shows it: the final goal achieved, or the writer's verbatim passage showing the ending (`story-ended`: a fatal ending at any point, or the ending a broken route requires). A chapter count, a broken route alone, or an unsupported claim never ends it |

After `HarnessStory.conclusion` is set no chapter is written or planned. How a
Regular reader might later change the Destined Ending, and any "continue this
series" flow after an ending, are deliberately not decided here.

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
story state merely because they ran later. Historical extraction fields are retained as stored evidence and are ignored;
there is no extraction or recovery operation. The Reader preview derives chapter-scoped memory. Its reading settings
and edits are session-local; durable story changes belong to the reader's chapter
directions and corrections. Fully malformed optional output still requires usable source evidence;
replay does not invent missing facts or call the model again.

## Generation Model Call and inspection

Each attempt freezes the three HARNESS-prepared inputs and shows them separately:
the **Frozen CAPA Prompt**, the **Frozen Story Information Packet** (with its
**Included / Omitted** lists), and the **Immediate Chapter Request**. The packet
shows the exact selected Foundation revision, source Seed and optional Blueprint,
corrections (with target evidence), retained chapters, the reader's direction, and
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

## Retired memory call and historical state

The separate automatic/on-request memory model call, client method, server operation,
and Workshop recovery control are removed. Chapters no longer receive the recurring
“story memory incomplete” warning. Chapter writing, acceptance, saving, replay and the
Reader retain their existing paths. Sound Cues, speakers and Holdings come from tags;
recaps come from the chapter response.

Current Canonical State and its deterministic readers remain. Existing committed events,
canonical records, corrections and previously saved chapter checkpoints are still read;
the removed call produces no new event records. Historical `memoryRecoveries` requests,
raw replies, usage receipts and status fields remain stored and readable, but are never
resumed or applied. No stored data or schema version changes, and no migration is needed.
Deterministic replay of existing events remains available without a provider call.
Tests seed historical records directly to check their readers and saved-story compatibility.

## Implementation inventory and boundaries
The active `development/` and `shared/` implementation is exposed through its
package barrel and the host server route. Workshop previews and controls remain
separate from the packages and app.

### 2026-09-06 — Library UI ownership migration

Reusable presentation now comes from the canonical Library UI package. Portable SEN surfaces resolve presentation through the host provider; the first-party Workshop supplies LibraryPresentationProvider. Domain, generation, persistence, media, and locked reference sources are unchanged.

### 2026-09-20 — Story Seed Arc handoff

Story Seed initializes the existing Hard Pin authority with zero to three
author-owned entries and the existing Arc Plan authority with one initial goal.
Only the active goal and its deadline are presented to the generation model;
the full Arc Plan remains internal. Fun Settings are optional Current Story
Information and cannot override canon, CAPA, ending, pins, or the current goal.
They do not enter canonical state or CAPA. The saved HARNESS schema is now 18;
existing Development reset behavior rejects stale state.
