# Image Prompts

The Workshop page that gathers every prompt an image model is given, by kind
of image, with the rules around each, so the product owner can refine how
images are made in one place. Open it at `?preview=image-prompts` (Systems
section).

- **Created:** 2026-10-08
- **Last Workshop update:** 2026-10-08
- **Last source comparison:** the app's prompts are read from the live code;
  the old app's are quoted from SENSEIDUKES/Light-Novels at 647165a
  (2026-09-16)
- **Status:** active, Workshop-owned reference surface

## What it shows

One section per kind of image, each marked In the app, Old app only or Made
outside the app:

- **Cover art** (in the app): the Manifest cover prompt, from
  `buildStoryCoverPrompt` with each field shown in braces; its rules (the look
  for each tradition, 2:3, no lettering, field limits, the Model Router's image
  model, the visitor limit); and the old app's two cover prompts to compare.
- **Profile picture (the Divine Mirror)**: the old app's two-step portrait: the
  prompt writer's instructions with the 9 Dao Rank looks, the request sent with
  the photo, and the prompt used without a photo.
- **Codex portraits** (characters and beasts) and **Codex places, artifacts and
  factions**: the old app's prompts and its milestone evolution rules.
- **Chapter scene art (Visual Memory)**: the old app's automatic image for
  momentous chapters.
- **The old app's shared art direction**: the style it added to every image.
- **Familiar art**: the style contract and each Familiar's style notes, made
  outside the app (removed from the repository in 27e89a1, quoted from before).
- **Images that change over time**: ideas, not built: the owner's main
  character across the ages (16, 100 and 10,000 years), a profile picture that
  evolves, and Codex evolution that keeps a character recognizable.
- **History:** every change, newest first, in plain words.

## Sources

`imagePrompts.ts` reads the cover prompt and its rules from the live code
(`src/server/story-cover/prompt.ts`, `limits.ts`, and the Model Router
catalog), so the page cannot drift from what the image model receives. The
old app's prompts are quoted word for word, each with its file and line in
Light-Novels at 647165a; every `${...}` is written as a brace naming what
filled it. Nothing here calls them: they are material for rebuilding these
images on the new path.

## The history guard

`imagePromptsHistory.ts` records, for each change, the date, a plain summary
and the fingerprint (`fingerprintText`, shared with Writer Instructions) of
each changed prompt's new words. `imagePrompts.test.tsx` fails when a prompt's
words differ from its latest entry, and names the entry to add. It also checks
the history is well formed, that the cover prompt shown is the one the server
builds, and that every kind and prompt renders.

## History

- **2026-10-08** — Created at the owner's request: every image prompt in one
  tab, with the image rules from the old app and the ideas for images that
  evolve over time.
