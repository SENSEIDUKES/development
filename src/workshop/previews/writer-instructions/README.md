# Writer Instructions

The Workshop page that shows the product owner the exact instructions the
chapter writer reads before the story, and every dated change to them.
Open it at `?preview=writer-instructions` (Systems section).

- **Created:** 2026-10-04
- **Last Workshop update:** 2026-10-04
- **Last source comparison:** not applicable; the page reads the live code
- **Status:** active, Workshop-owned reference surface

## What it shows

- **Every chapter, in order:** the Author skill (SEN's default), the HARNESS
  tag rules, Sound Cues with the default library's sound list, Speakers,
  Holdings, and the HARNESS response and evidence contract. Each block shows
  whose words they are (a SEN skill and its version, or the HARNESS), when the
  writer reads them, their size in words, and the date they last changed.
- **Only in some stories:** Fate Survival, the three Reading Mode skills, and
  the official output requirements (shown at their fullest).
- **History:** every change, newest first, in plain words.

Not shown: the story itself (Story Information and the chapter request,
which change every chapter), skills a story equips by hand (Pacing,
Continuity, Style) and Translation packages, which are the host's own.

## Sources

Nothing on the page is a copy. `writerInstructions.ts` reads every block from
the code the HARNESS uses: the bundled SEN skills, `HARNESS_TAG_RULES`,
`presentSoundVocabulary` over `LIBRARY_SOUND_WORDS`,
`buildHarnessOfficialOutputRequirements` and `HARNESS_RESPONSE_CONTRACT`
(`src/server/harness-generation/prompt.ts`). A test checks that the
every-chapter blocks, with their CAPA headers, are exactly the system
instruction a default English story's writer receives.

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

- **2026-10-04:** Created with the structured tag instructions (tag rules,
  Sound Cues 2.0.0, Speakers 2.0.0, Holdings 2.0.0) and the history guard.

## Transfer

Workshop only: the page and its history stay in this repository. Nothing here
moves into SEN, Library or the app.
