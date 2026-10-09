# Image Prompts

The Workshop page that gathers every prompt an image model is given, by kind
of image, with the rules around each, so the product owner can refine how
images are made in one place. Open it at `?preview=image-prompts` (Systems
section).

- **Created:** 2026-10-08
- **Last Workshop update:** 2026-10-08 (tabs, prompt cards, Image Lab)
- **Last source comparison:** the app's prompts are read from the live code;
  the old app's are quoted from SENSEIDUKES/Light-Novels at 647165a
  (2026-09-16)
- **Status:** active, Workshop-owned reference surface

## How it is laid out

A row of tabs, kept at the top while scrolling (sideways on a phone): **Image
Lab**, one tab per kind of image (a dot shows In the app, Old app only or Made
outside the app), **Ideas** and **History**. A kind's tab shows its summary,
its prompts as cards (source, word count, last change, when it is used; long
prompts open with **Show all**; **Copy** and **Try this prompt** on each) and
its rules as short cards, two across on a laptop.

## The Image Lab

Makes one image from any prompt, so a prompt can be refined by seeing what it
makes. **Try this prompt** on a card sends its words here (covers at 2:3,
everything else square, as each was made; cover art and the profile picture
ask for three images to choose from). **Attach an image** sends a photo or
other image to the model beside the prompt (PNG, JPEG or WebP; made smaller in
the browser first, so a phone photo fits). **Images per try** is 1, or 3 to
choose from: each try's images sit together with a **Choose** button. Choose an image model from the Model
Router (it starts on the Router's Images choice; changing it here does not
change the Router) and a shape, then **Make image**. Words in braces are
flagged, since they are filled in for each image in the app.

- **Server:** `POST /api/image-lab` (`src/server/image-lab/http.ts`, registered
  in the Router as **Image Lab**), up to 8,000 characters and one attached
  image, 2 minutes per image. Three variations are three calls, so one refusal
  does not cost the others.
- **Who may use it:** only the owner's Development access token, since any
  prompt can be sent. The token is kept on this device, shared with the rest of
  the Workshop.
- **Images:** shown on the page until it is closed, with **Download**; nothing
  is kept on the server.

## What it shows

- **Cover art** (in the app): the Manifest cover prompt, from
  `buildStoryCoverPrompt` with each field shown in braces; its rules (the look
  for each tradition, 2:3, no lettering, field limits, the Model Router's image
  model, the visitor limit); and the old app's two cover prompts to compare.
- **Profile picture**: the owner's approved prompt (2026-10-08), sent to the
  image model with the reader's photo. The old app's two-step portrait (a text
  model writing the prompt from the photo) and its evolving by rank were
  removed.

Cover art and the profile picture give the reader **three to choose from**;
every other image (Codex, chapter scenes) is one image, and that is what the
reader gets.
- **Codex portraits** (characters and beasts) and **Codex places, artifacts and
  factions**: the old app's prompts and its milestone evolution rules.
- **Chapter scene art (Visual Memory)**: the old app's automatic image for
  momentous chapters.
- **The old app's shared art direction**: the style it added to every image.
- **Familiar art**: the style contract and each Familiar's style notes, made
  outside the app (removed from the repository in 27e89a1, quoted from before).
- **Images that change over time**: ideas, not built: the owner's main
  character across the ages (16, 100 and 10,000 years) and Codex evolution that keeps a character recognizable.
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
builds, that every kind and prompt renders, that the tabs switch, and that the
Image Lab sends a card's prompt with the saved token and shows the image or
the server's reason it failed.

## History

- **2026-10-08** — Created at the owner's request: every image prompt in one
  tab, with the image rules from the old app and the ideas for images that
  evolve over time.
- **2026-10-08** — The owner's review: good information, hard to use on a
  phone. Rebuilt as tabs with prompt cards and short rule cards, and added the
  Image Lab to make an image from any prompt.
- **2026-10-08** — The owner's direction: the profile picture is simply
  "Profile picture"; the Image Lab can attach an image; cover art and the
  profile picture make three to choose from, every other image one.
- **2026-10-08** — Fixes and the profile picture in the app. The cover tab
  shows the approved template and, beside it, "What the app sends today"
  until World Cards connect it. The profile picture is now in the app
  (`/api/profile-picture`), read here from the live code. Images default to
  Nano Banana 2 Lite. Every image made has a download button on it, and the
  Make button shows its Energy cost (5 per image) with "−5" floaters.
