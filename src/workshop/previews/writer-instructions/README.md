# Writer Instructions

The Workshop page that shows the product owner the exact instructions the
chapter writer reads before the story, and every dated change to them.
Open it at `?preview=writer-instructions` (Systems section).

- **Created:** 2026-10-04
- **Last Workshop update:** 2026-11-05
- **Last source comparison:** not applicable; the page reads the live code
- **Status:** active, Workshop-owned reference surface

## What it shows

Titled **What the Models Read** since 2026-11-05 (SENSEI: "you got to be a
robot to be able to look at, understand what you're seeing … it just needs to
be made properly so I can actually use it"). One step of the pipeline at a
time, never the whole wall:

- **The pipeline:** World builder (once, before Chapter 1) → Writer (every
  chapter) → Tagger (after every chapter) → Checks (plain code, no model) →
  Fixer (only when the checks find a problem) → Look writer (only when asked).
  It opens on the Tagger.
- **Each step:** its job in one sentence, what it is given and what it hands
  back (and which step reads that next), then its instructions as a row of
  chips in the order it reads them. The Tagger has one chip per tag.
- **Each block:** whose words they are, size, last change, when it is read,
  and the text in two views: easy to read (headings, lists, tags set apart,
  example notes read out field by field, every word kept; a test checks it)
  or exactly as the model sees it. "Why it says this" lists every dated
  change to that block.
- **Every change, with its date:** the whole history, newest first, each
  entry's blocks named by step.

**2026-11-05, the writer's real skills and the whole prompt** (SENSEI: "why
is the writer prompts only showing the author CAPA skill? Where are the other
CAPA skills? … we need to add an all button so I can see them when it's all as
one prompt"):

- The Writer step shows what a story made in Novel Expanded reads: the
  official CAPA skills it starts with (CAPA AUTHOR, Pacing, Continuity, and
  the Style its Story Seed chose; pick Chinese, Japanese or Korean), loaded
  from their `.spp` packages by `installOfficialCapaSkillsInMemory`, the
  app's own loader. Until now the page showed the bundled SEN Novel Author
  as every story's Author; it is only a story's that never chose one, and is
  now listed under "Only in some stories".
- Every step opens on **All, as one prompt**: every message the model is sent,
  in order, built by the same function that sends it
  (`writerSystemInstruction`, `buildHarnessTagPrompt`,
  `buildHoldingsFixerPrompt`, `buildLookDescriberPrompt`,
  `WORLD_BLUEPRINT_SYSTEM_PROMPT` with `buildWorldBlueprintPrompt`), with
  `⟨…⟩` where the parts that change every time go. Exactly as the model sees
  it by default, easy to read on a tap, and Copy all.

The address keeps the place (`#tagger/appearance`), so a link opens the same
block. `PIPELINE` in `writerInstructions.ts` says which step reads which
block; a test fails if a block belongs to none, or to two.

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

- **2026-10-29:** The Chapter tagger block loses its bridging sentence: the
  tag teaching is written for the tagger now, which returns notes in the
  margin and never the chapter. Same blocks, same order.
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
