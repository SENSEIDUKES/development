# Feature audit — 2026-10-18

A read-only audit of what SEN, the Library and the NovelExpanded app actually have,
compared feature by feature with the old production app (`SENSEIDUKES/Light-Novels`,
README dated 2026-07-25). Taken at `main` 5041579 (2026-10-17, after #399).

This is a snapshot for the owner and for agents to orient by. It is not the source of
truth: [`NOVEL_EXPANDED.md` → Where we are](../../NOVEL_EXPANDED.md#where-we-are-2026-10-10)
remains the only section that says what is built. Where the two disagree, check the code
and update Where we are.

Many features below are listed as **not rebuilt yet**. That is expected: they are
coming on the new path, not lost. Never reconnect the old systems to fill them.

## Why the features were hard to see

- The Light-Novels README was a showcase. The Development README is an agent rulebook,
  and the feature story moved into Where we are as dated build notes.
- **Names drifted between repos:**
  - *Alter Fate* (old) forked the story into a new branch. *Fate* (new) is a
    one-chapter direction. Branching is not rebuilt.
  - *World Card* (old) was the ceremony card for a character, beast, relic or event
    on its first appearance, with its sound. *World Card* (new) is the story's tile
    on Home and its World Info page.
  - *Living Codex* (old, six chambers) is now *the Codex* (a card gallery on the record).
  - *Scene scoring* (old) meant music following the scene. That is now the Soundtrack.
    "Scoring" as a SEN system has no code on the new path.
- **There are two Readers and two Codexes in Development.** The app uses the new ones:
  `harness-generation/development/HarnessReaderSession.tsx` and `StoryCodex.tsx`. A legacy
  port of the old Reader Chamber and six/seven-tab Codex still sits in
  `src/components/reader-chamber/` and `src/components/reader-codex/` and is exported
  from `@seihouse/sen` (`./reader-chamber`, `./reader-codex`, `./cards`), but
  `npm run check:app` blocks the app from using it. It is material for the remake, not a
  shipping feature.

## Maturity key

- **In the app:** real logic, reached end to end at `/app/`, with tests.
- **Workshop only:** real logic and tests, but only a `?preview=` page reaches it.
- **Preview only:** a mock or visual.
- **Not rebuilt yet:** existed in Light-Novels, not on the new path.

## In the app, and better than Light-Novels

| Feature | What's better | Where |
| --- | --- | --- |
| **Next Chapter (HARNESS)** | One model call per chapter, no separate memory call. The writer tags sounds, speakers, holdings, appearances and soundtrack in the tiny SEN language, so every fact sits on exact words. About 1,500 words / 35 paragraphs. Short replies fail cleanly. Writing survives leaving the Reader. Point of view is kept. | `components/harness-generation/shared/`, `server/harness-generation/`, `narrative/marks.ts` |
| **The Codex** | Worked out again from the chapters every time, so it always matches them. Characters, Factions and Items, each with rank, look, first words, equipped and carried things, abilities and a Chronicle. Items keep an Archived list. Every fact links to its passage after a confirm. | `harness-generation/shared/storyCodex.ts`, `development/StoryCodex.tsx` |
| **Listen (triple narration)** | Narrator, Protagonist and Side voices, decided by the writer's `[[@MC]]`/`[[@Name]]` tags, not by guessing. The spoken sentence is lit and the page follows it. Voices and speed are kept per language. Uses device voices. | `narrative/readAloud.ts`, `host/reader/webSpeechNarration.ts` |
| **Soundtrack and Sound Cues** | Each chapter's writer picks its soundscape and atmosphere. Cues sit on the 1–8 words where the sound happens. SEIHouse audio player mixer with levelling toward −20 LUFS, channel levels and presets, sleep timer, menu music. Sound Words per story, and `.spp` media packs. | `src/audio/`, `host/reader/readerMixer.ts`, `useReaderSoundtrack` |
| **Fate and arcs** | Three suggested directions per chapter or the reader's own, Rhythm by default. Regular and Fate Survival modes, the Destined Ending, 30-chapter arcs (10–40 per story), each arc planned when it begins, goals reviewed before its first chapter. | `FatePage.tsx`, `FatePanel.tsx`, `shared/{chapterDirection,rhythm,arcState}.ts`, `components/arc-goals/` |
| **Story Seed and World Blueprint** | AI fills every blank and never rewrites what the creator wrote. Arc 1 only, with a private look-ahead. Story Length, Story Language and Reading Mode. Story Sparks on Home. *Gated by the owner access token.* | `components/story-seed/`, `server/story-seed-blueprint/`, `server/story-spark/` |
| **Reader frame and typography** | The chapter never leaves the page: Fate, Codex and Settings open as panels. SEIHouse Sans/Display, about 60 characters a line, reading place remembered on the device. | `HarnessReaderSession.tsx`, `ReaderSettingsSheet.tsx` |

## In the app, and new (never in Light-Novels)

- **Holdings fixer:** quiet repair of small record problems, calling a model only when a check flags one (`shared/holdingsFixer.ts`).
- **First appearance and Looks:** looks kept consistent across chapters; Codex **Manifest** pictures from the recorded look, stored on the device, no Energy charged yet (`shared/appearances.ts`, `lookDescriber.ts`, `server/story-cover/codexPicture.ts`).
- **Create mode (Highlight Engine):** edit the newest chapter's words, Sound Cues and soundscape/atmosphere, then seal it (`components/highlight-engine/`, `ChapterAuthoring.tsx`).
- **Rewrite this chapter**, with an optional note (`shared/chapterRewrite.ts`).
- **Export story:** one file with every chapter, its exact writer inputs and raw reply.
- **Accessibility Reading Modes:** Clear Reading, Easy Read and Literal Reading shape how each chapter is written (`narrative/readingMode.ts`).
- **Native story languages:** 15 languages, including right-to-left reading for Arabic, Hebrew, Persian and Urdu, with a font chosen for each script (`lib/language.ts`).
- **CAPA skill slots and `.spp` skill packages** in Story Settings (`host/generation/capa/`).
- **Covers and profile picture:** a real image model makes them through the Model Router; stored on the device (`server/story-cover/`, `server/profile-picture/`).
- **Familiar:** 12 companions across the app, plus the first voice experiment for choosing Fate (#399) (`library/familiars/helper.ts`, `host/familiar/voice.ts`).
- **Profile / Cultivator Cave** with the Library economy: QI, Energy, DAO XP, Dao Pillar, Store, Familiar bonds, Achievements and Relics. The rules are real and tested; the app runs them on a **practice account** that resets on reload.
- **Model Router:** one server router for text, image, speech and video, with low reasoning by default.
- **SEN as its own package.** `@seihouse/sen` never depends on `@seihouse/library`, enforced by `npm run check:package-boundaries`.
- **Workshop tools:** Writer Instructions (versioned prompt history), Image Prompts, Image Lab, NovelExpanded Docs.

## Workshop only (real code, not in the app yet)

| Feature | Notes |
| --- | --- |
| Reader translation (translate an existing chapter) | `reader-chamber/shared/translation/`, `server/reader-translation/`. Uses Gemini, not DeepL. The only caller is `workshop/ReaderPreviewRuntime.tsx`. |
| Character Voice (ElevenLabs Codex quotes) | `server/audio/codexVoiceQuote.ts`. Old Codex only; nothing is stored. Replaces Light-Novels' Kokoro. |
| Color Codes | `narrative/colorCodes.ts`, contrast-tested (#392). Only the legacy Reader and cards use it. Manifesting while reading waits on it. |
| Cards: System Panels, Fate result card, Codex cards | `./cards` entry, inspected in Card Workshop. The app is blocked from importing them. |
| Motion Picture | Still image to motion clip. Preview only. |
| Provenance | Version records and disclosure marks. Preview only, owner `deferred`. |
| Reward Loop, Closed-Door Cultivation, User Shop | Previews. Closed-Door's mechanic is undecided; User Shop is empty. |

## Not rebuilt yet (coming)

| Light-Novels feature | State on the new path |
| --- | --- |
| Manifestations while reading (people, beasts, places, relics) and chapter hero images | Not rebuilt. Covers and Codex pictures are the first media on the new path. Next on the plan. |
| Highlights / glowing names to manifest | Planned, waits on Color Codes. |
| Alter Fate as a real fork, with fate locks | Not rebuilt. Branching from a Blueprint is on the map. Rewrite this chapter is the closest thing today. |
| Cinematic scroll (voice-driven glide) | Planned. Only a stub remains (`reader-chamber/shared/stubs.ts`). |
| Reader modes: teleprompter, basic narration, SEN | Not on the new path. The app has one reading mode plus Listen. |
| Generate next five (batch) | Archived (`chapter-generation-flow`). "Write one chapter ahead" is planned. |
| World Cards for entities, with sound | Not rebuilt. The name now means something else (see above). |
| System Panels, Fate Survival result card, creature events | Not rebuilt. |
| Six-chamber Codex: Karma, Power Rankings, Lore, `contextPriority`/`authorContextNote` editing | Only in the legacy port. New-Codex Bestiary, places, timeline and relations are planned. |
| Kokoro character voice cards | Replaced by ElevenLabs quotes (Workshop only). AI narration is planned. |
| DeepL translation in the Reader | Rebuilt on Gemini, Workshop only. |
| Bookmarks panel | In the data model (`narrative/readerState.ts`); the panel is only in the legacy port. |
| Keyboard shortcuts, swipe, haptics in the Reader | Not in the new Reader. Profile shows Keyboard Shortcuts as "Not in the app yet". |
| Inventory panel, status effects | Gone. Holdings in the Codex covers what characters hold. |
| Sects and challenges | Routes only (`libraryRoutes.ts`), no pages. The Fate Survival judge is not built. |
| Accounts, Data Connect/Postgres, R2 media, offline PWA and outbox | Not on the new path. Stories, covers and the profile are device-local. 11 SQL migrations and Postgres code (Energy, QI, Dao Pillar, DAO XP) exist with tests but are never connected. |

## What cannot be claimed yet

- No accounts and no database: everything lives on the device.
- The economy is a practice account: 1,000,000 QI, everything unlocked, reset on
  reload. Energy is shown but never charged.
- A new story needs the owner access token (`STORY_SEED_BLUEPRINT_ACCESS_TOKEN`), so a
  public visitor cannot start one on the deployed app. Without the token, chapters
  are limited to 6 and covers to 3 per 30 minutes.
- Open real-model tests: the 10-chapter Holdings run, appearance and look tags, a real
  cover, a right-to-left story, and Listen on real phones.

## Small inconsistencies found

- `NOVEL_EXPANDED.md` listed Create mode under "Not connected yet", though the
  app's Reader wires it in. Moved to Built with this audit.
- `src/package/sen/index.ts` says `SEN_PACKAGE_VERSION = '0.27.1'`; `src/package/sen/package.json`
  is 0.39.0.
- `AGENTS.md` and `src/package/sen/index.ts` name "scoring" as a SEN system, but no
  code on the new path implements it.
