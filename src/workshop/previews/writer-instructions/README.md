# Writer Instructions

The Workshop page that shows the product owner the exact instructions a
chapter's two calls read before the story, the planner's (Fate) first and then
the writer's, and every dated change to them.
Open it at `?preview=writer-instructions` (Systems section).

- **Created:** 2026-10-04
- **Last Workshop update:** 2026-10-20
- **Last source comparison:** not applicable; the page reads the live code
- **Status:** active, Workshop-owned reference surface

## What it shows

- **The planner, before every chapter:** its role, how to read the story
  information, how to plan the chapter and its hard rules, each under its
  part's heading.
- **The writer, every chapter, in order:** its role, the Author skill (SEN's
  default) and the HARNESS writing rules, the HARNESS tag rules, Sound Cues
  with the default library's sound list, Soundtrack and Speakers, then how to
  read the story information, how to return the chapter and the hard rules,
  each under its part's heading. Each block shows whose words they are (a SEN
  skill and its version, or the HARNESS), when the call reads them, their
  size in words, and the date they last changed.
- **Only in some stories:** Fate Survival's planning half (the planner's) and
  writing half (the writer's), the three Reading Mode skills, and the official
  output requirements (shown at their fullest).
- **History:** every change, newest first, in plain words, retired blocks
  named as such.

Not shown: the story itself (Story Information, the Codex or the Chapter
Plan, the chapter request and the Mission Reminder, which change every
chapter), skills a story equips by hand (Pacing, Continuity, Style) and
Translation packages, which are the host's own.

## Sources

Nothing on the page is a copy. `writerInstructions.ts` reads every block from
the code the HARNESS uses: the planner's parts (`CHAPTER_PLANNER_ROLE`,
`CHAPTER_PLANNER_READING_GUIDE`, `CHAPTER_PLANNER_RULES`,
`CHAPTER_PLANNER_HARD_RULES` in `src/server/harness-generation/chapterPlanner.ts`),
the bundled SEN skills, `HARNESS_TAG_RULES`, `presentSoundVocabulary` over
`LIBRARY_SOUND_WORDS`, `buildHarnessOfficialOutputRequirements` and the
writer's parts (`HARNESS_ROLE`, `HARNESS_WRITING_RULES`,
`HARNESS_READING_GUIDE`, `HARNESS_RETURN_FORMAT`, `HARNESS_HARD_RULES` in
`src/server/harness-generation/prompt.ts`). A test checks that the blocks,
with their headings and CAPA headers, are exactly the instruction a Regular
Reader story's planner and a default English story's writer receive.

## The history guard

`writerInstructionsHistory.ts` records, for each change, the date, a plain
summary and the fingerprint (`fingerprintText`) of each changed block's new
text. `writerInstructions.test.tsx` fails when any block's text no longer
matches the fingerprint of its latest entry, and its message names the block
and the fingerprint to record. To change the writer's instructions:

1. Change the code.
2. Add an entry at the top of `WRITER_INSTRUCTIONS_HISTORY` with today's date,
   what changed and why, and the fingerprint the failing test names.

## Workshop history

- **2026-10-20:** The chapter loop, step 2. The page shows both calls: the
  planner's four blocks first (its rules open on arrival), then the writer's.
  Fate Survival shows its planning and writing halves. SEN Holdings, SEN
  Appearance, the Holdings fixer and the look writer are retired, named in the
  history only, and After a chapter is gone: no call follows a chapter.
- **2026-10-17:** The look step becomes the look writer: it runs on demand, for
  one Codex entry, never after a chapter. It stays listed under After a chapter.
- **2026-10-14:** SEN Appearance joins the blocks read on every chapter (open
  on arrival, like the other tag blocks), and the look step joins After a
  chapter, beside the Holdings fixer.
- **2026-10-04:** Created with the structured tag instructions (tag rules,
  Sound Cues 2.0.0, Speakers 2.0.0, Holdings 2.0.0) and the history guard.

## Transfer

Workshop only: the page and its history stay in this repository. Nothing here
moves into SEN, Library or the app.
