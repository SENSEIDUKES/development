# `@seihouse/sen`

**Unreleased (2026-10-16):** `./harness-generation` adds the optional
`HarnessReaderSession.renderHostTools` slot and `ReaderHostTools` contract. A host
receives the active chapter ID, busy state and `interruptPlayback()`, whose
release callback resumes only the narration it paused if no later reader action
superseded it. `CHAPTER_DIRECTION_TEXT_LIMIT` exposes the existing direction
limit. The Reader has no dependency on a host's helper or speech-input service.

**2026-10-16:** `StoryCodex` shows each held thing and ability as one line (how it is now, since which chapter) with its changes behind History, the newest first, ten at a time; a look's changes and the Chronicle likewise.

**0.39.0 (2026-10-15):** `StoryCodex` takes the host's `pictures` (`CodexPictures`): each card wears its
picture, and an opened character or item whose look the record wrote down offers **Manifest**
(`CodexPictureCard`: its key, character or thing, name and latest look), with Manifesting, Manifest again
and the host's reason a picture failed. A card without a look says Manifest waits for one.
`HarnessReaderSession` passes `codexPictures` to its Codex.

**2026-10-15:** Refined shared Color Codes, safety/threat classification, and dark-surface
palettes. The rebuilt Reader, Codex, and Highlight Engine integration remains deferred.

**0.38.0 (2026-10-14):** `thingAppearancesFromHoldings` gives a thing its first appearance on the
first holding tag that shows it; `deriveAppearances` reads a look tag in the paragraph that first shows
its subject as that first look; SEN Appearance 1.1.0; `AppearancePassage` carries `startOffset`.
Chapters ask for 1,200 to 1,700 words in 35 paragraphs. `StoryCodex` shows things no longer held under
Archived and asks before a fact's link moves the chapter.

**0.37.0 (2026-10-14):** The first information tag after holdings: first appearance, with its
look. `./harness-generation`: SEN Appearance (`SEN_APPEARANCE_SKILL`, in the new Appearance slot,
loaded on every chapter like Speakers and Holdings) teaches `[[appears: Name | character]]`,
`[[appears: Thing | thing]]` and `[[look: Name | what changed]]`; `TAG_WORDS` is now
`HOLDING_TAG_WORDS` and `APPEARANCE_TAG_WORDS` together (`isHoldingTagWord`,
`isAppearanceTagWord`). Each tag is saved on its sentence (`AppearanceAttachment`,
`HarnessChapter.appearances`; `placeAppearances`, `readAppearanceTag`) and resolves, at commit,
through one resolver shared with holdings (`createCodexEntryResolver`, `resolveAppearances`).
`deriveAppearances` works out who and what is on the page and flags what cannot be true;
`appearancesSection` is Story Information's new Appeared section (`StoryInformationPacket.appearances`,
packet section `appearances`). An adapter that offers `describeLooks` (`HarnessLookRequest`, the
`describe-looks` operation) runs the look step after each chapter with appearances
(`planLookSubjects`, `chapterLooks`), kept as `HarnessChapter.looks`. The Codex meets characters and
items that stepped onto the page and shows each Look (`CodexCharacter.appearance`,
`CodexItem.appearance`); `CodexCheck` is now a holdings or an appearance check. Schema 32: optional
chapter fields only, with a no-op upgrade from 31.

**0.36.1 (2026-10-13):** `StoryCodex` is a gallery of cards: one tab per category, the same
card for every category (its art, its name, one line) opening into the same profile (its art large,
then everything the record knows about it). No API change.

**0.36.0 (2026-10-13, breaking):** The Codex, remade on the record. `./harness-generation`:
`deriveStoryCodex` works out the Codex from a story's Codex entries and chapters (its characters,
met by what they hold or say, the main character first, with their holdings, rank, first words and
chronicle; its factions, declared by the story (`declaredFactions`) or named as a body of people,
never characters even when they speak; its items, each with its holder now and its history; and the record's checks, each with
its paragraph), and `StoryCodex` shows it: Characters (a roster and each character's sheet), Factions and
Items, every fact a link to its passage. In `HarnessReaderSession` the Codex is a panel
(`ReaderLayer` `{ kind: 'panel'; id: 'codex' }`): a fact moves the chapter behind it to its passage
and lights it, and `ReaderPanel`'s new `peek` lowers the sheet to half height so the chapter shows.
`HoldingEvent` gains `targetId`. Breaking: `HoldingsPage` is removed (the Codex holds holdings), and
`ReaderLayer` no longer has a Codex page. The development Reader Codex in `./reader-codex` is
unchanged; the Reader no longer opens it.

**0.35.0 (2026-10-13):** Right-to-left reading. `./contracts`: `SenLanguageCode` and
`SEN_LANGUAGES` gain Arabic (`ar`), Hebrew (`he`), Persian (`fa`) and Urdu (`ur`), each with
direction `rtl` (`getSenTextDirection`) and speech tags (`senSpeechLanguageTags`; Hebrew also
`iw`). `./harness-generation`: the Reader sets its frame's `dir` from the story's language, so a
right-to-left story reads right to left, with Back and the chapter arrows mirrored and the
sentence controls kept in left-to-right order; the chapter list opens in the story's direction.
Speech finds Hebrew „…“ quotes, and an Arabic ؟ or Urdu ۔ ends a sentence. A host offering its
own Reader fonts should name a face for these scripts in each stack.

**0.34.0 (2026-10-13, breaking):** One Highlight Engine overlay per sound. `./highlight-engine`:
`ManuscriptOverlayMode` is `'off' | 'cues' | 'soundscapes' | 'atmospheres'` (no `'audio'`), listed
by category in `MANUSCRIPT_OVERLAY_GROUPS` (Audio holds all three; `overlayGroupOf`) and in order in
`MANUSCRIPT_OVERLAYS`; the switch shows Off and the categories, then the chosen category's overlays; `OVERLAY_KINDS` gives each one kind and
`OVERLAY_SOUNDTRACK_KIND` the soundtrack kind it shows. `openingSoundMark(manuscript, kind)` now
takes one kind. Soundscapes are red and atmospheres yellow. `SoundtrackChoices.opening` lets a
word in the chapter's first sentence choose the opening (`isChapterOpening`, `WRITER_OPENING`);
`./harness-generation`'s Create mode uses it in place of its Soundscape and atmosphere picker.

**0.33.1 (2026-10-13):** Create mode shows where a chapter's sound begins and says when it
has none. `./highlight-engine`: `openingSoundMark(manuscript, { soundscape?, atmosphere? })`
marks the chapter's first word in the Soundscape and Atmosphere colors (split when both open
it), and the Audio overlay's legend names the kinds **Soundscape** and **Atmosphere**, covering
both the opening and a change. `./harness-generation`: Create mode draws that mark on the
Audio overlay and, when the chapter has no Sound Cues, says so above the page (never in the
Reader); a chapter without one is still accepted.

**0.33.0 (2026-10-12):** A story's atmospheres come from its Media Loadout's Atmospheres
slot. `./audio`: `MediaSelectionSlot` gains `atmospheres`; `SceneAtmosphere` gains `url` (where
the bed plays) and `loudness`. `./harness-generation`: while the Reader is open, the reader
mixer's atmospheres are the chapter's frozen beds (`useReaderSoundtrack`'s `atmospheres`,
`atmosphereOption`), and the host's come back when it closes; beds frozen without a file
leave the host's in place.

**0.32.0 (2026-10-12, breaking):** The music, the atmosphere and Sound Cues are three
separate sounds. The writer's tags: SEN Soundtrack 2.0.0 teaches `[[soundscape: Music Mood]]`
and `[[atmosphere: Atmosphere]]`, each once at the chapter's start, in place of the combined
`[[soundtrack: Music Mood | Atmosphere]]` (still read). `SoundtrackTag` gains `kind`
(`SoundtrackTagKind`); `SOUNDTRACK_TAG_WORDS` is now a record by kind; `chapterSoundtrack`
reads the first tag of each kind. Create mode: `HarnessChapter.openingSound`
(`ChapterOpeningSound`, the reader's own opening piece or atmosphere, locked at the start)
and `HarnessChapter.soundtrackChanges` (one `SoundscapeChangeAttachment` and one
`AtmosphereChangeAttachment` at most, each on the word where it begins;
`SOUNDTRACK_CHANGE_RULES`), saved by `authorChapter`; the Reader plays them as the reader
reaches each word (`readerSceneAt`). `./highlight-engine`: `soundCueActions` is now
`audioActions` (with the host's `soundtrack` choices: Media → Audio → Soundscape and
Atmosphere); `SoundtrackChangePanel`, `SoundtrackOptionList`; the overlay mode `cues` is now
`audio` and tints all three kinds.

**0.31.1 (2026-10-13):** SEN Sound Cues 2.4.0 no longer tells the writer that a chapter
may have no Sound Cues. Told so, the writer tagged none in two chapters whose prose rang a
bell five times. A cue is still earned by the prose, at most 10 a chapter, and never added
or bent to fit; a chapter without one is still accepted.

**0.31.0 (2026-10-12, breaking):** The Text Highlight Engine is the **Highlight Engine**: it
highlights prose today and will highlight images for sequential art. The entry
`./text-highlight-engine` is now `./highlight-engine`; `TextHighlightEngine` and
`TextHighlightEngineProps` are now `HighlightEngine` and `HighlightEngineProps`. The prose
surface's own names (`TextHighlightBlock`, `TextHighlightOverlay`, the `sen-text-highlight-*`
classes) are unchanged.

**0.30.0 (2026-10-11):** A story's Sound Words are its own, apart from its recordings.
`HarnessStory` gains `soundWords` (at most 30; an empty list plays no Sound Cues; absent, a
story from before keeps its recordings' words). The HARNESS controller's
`setSoundWords(storyId, words)` saves them and `describeSoundWords(storyId)` gives them with
the words a recording answers now; changing the Sound Cue pack (`setMediaSelection`) never
changes them, and `describeMediaSelection(selection, soundWords?)` also returns `answered`.
Each attempt freezes the story's words, the word alone, and the writer receives those a
recording plays; a word without one stays the story's. `./audio`: `validateSoundWordList`,
`SoundWordsPreset`, `answeredSoundWords` and `withStorySoundWords`; `SOUND_WORD_LIMITS.maxWords`
is 30 and a `SoundWord`'s `example` is optional. SEN Sound Cues 2.3.0: the list is the words
alone, one per line, with no example tag or meanings. Saved workspaces upgrade from schema
30 to 31 as they are: chapters keep their cues and attempts what they froze.
Recordings may live in a package installed on the device: `packageMediaUrl`,
`readPackageMediaUrl` and `isPackageMediaUrl` name a file in an installed `.spp`
(`spp://<package id>/<version>/assets/…`), and `isPlayableMediaUrl` (a public HTTPS file
or such a file) replaces the HTTPS-only check wherever SEN places, accepts or plays a
recording; the host turns the address into one its player can play.

**0.29.0 (2026-10-10):** The Reader Chamber: what opens over the chapter never takes it away.
`./harness-generation`: `HarnessReaderSession` keeps one `ReaderLayer` (exported): a panel (Fate,
Reader Settings) or a page (the Codex, an arc's goals). `ReaderPanel` and `useWideReader` are exported:
a non-modal panel over the chapter, which stays readable and scrollable (a two-height sheet below
1024px, a 28rem panel at the right from 1024px with the chapter beside it). The top bar's Codex button
(in place of Holdings) opens the development Reader Codex as a page, with Holdings among its pages;
`ReaderCodex` (in `./reader-codex`) takes `extraPages`. Listen reads on under a panel; a page still
pauses it and returns the reader to their place. The bars: top, Back, the story and chapter, the host's
`companion` (a new slot) and Reader Settings; bottom (`ReaderBottomBar`, in place of the Listen bar), the
Codex, Listen in the middle, Fate and the chapters ("5/10").

**0.28.0 (2026-10-10):** The Reader is a frame around a swappable chapter body, and sets its
text. `./harness-generation`: `HarnessReaderSession` takes `chapterBody` (a `ReaderChapterBody`;
`ProseChapterBody` by default) and `readerFonts`; `ReaderChapterBodyProps`, `ReaderChapter` and
`NarrationHighlight` are exported. A body keeps `data-chapter-number`, `data-read-aloud-title` and
`data-sen-text-block` on what it draws. The frame's top bar stays on screen; the prose column is 34em,
about 60 characters a line in any font. Reader Settings opens with Text (font, title font, size, line spacing,
weight). `./reader-runtime`: `ReaderFonts`, `ReaderFontChoice`, `DEFAULT_READER_FONTS`,
`ReaderTextSettings` with `readReaderTextSettings`/`writeReaderTextSettings` (key `text-settings`)
and `resolveReaderText`. `./highlight-engine`: a paragraph's line height follows
`--sen-text-line-height` (1.85 without it).

**0.27.1 (2026-10-10):** A holdings tag no longer takes words away. When the writer puts one
where its thing's name belongs (`a twist of [[equipped: MC | Copper Hair Wire]] that bit`,
`which held [[…]].`, `tucking [[…]] securely`), `readMarks` leaves the name in the text in its
place, so the sentence keeps its noun and the change is still recorded on that sentence. Tags
written as they should be, at a sentence's start or after the name itself, change nothing.

**0.27.0 (2026-10-09):** Author's notes. `HarnessStory` gains `authorNotes` (at most
`AUTHOR_NOTES_LIMIT`, 2,000 characters); the HARNESS controller's `setAuthorNotes(storyId, notes)`
saves them (an empty value removes them). They never reach the chapter writer. Saved workspaces
upgrade from schema 29 to 30 as they are.

**0.26.0 (2026-10-09):** `HarnessReaderSession` takes `renderWriteAside(chaptersWritten)`:
whatever the host shows beside the button that writes the next chapter (the Library puts
its Energy price there). It appears only when Next writes a chapter.

**0.25.0 (2026-10-08):** Story Settings before a story exists. The HARNESS controller's
`describeMediaSelection(selection)` says which sound words and music words a story would
start with under a Media Loadout, before the story is created, so a host's Create can show
them beside the skills it chooses. Nothing else changes.

**0.24.3 (2026-10-08):** Sound Cues are earned by the prose. SEN Sound Cues 2.2.0
tells the writer to tag a sound only where its own sentence already describes it (a
chapter may have none), and the sound list it receives names each sound and its
meaning with no example phrases to copy. A sound tag written beside a sentence moves
only onto nearby words that clearly say it (two of its words, or its only one) and is
dropped otherwise; it is never put on the nearest sentence's first words.

**0.24.2 (2026-10-06):** updates the universal UI peer to 0.11.0 for the
coordinated Library navigation package adoption. Narrative behavior and public
interfaces are unchanged; SEN still has no Library UI dependency.
Hosts using the currently locked audio-player 4.0.0 build also need the scoped
UI peer override documented in [private UI artifacts](../../../vendor/README.md).

**0.24.1 (2026-10-07):** The HARNESS Reader shows each chapter's word count beside its number (`Chapter 7 · 2,174 words`), a testing aid while chapter length is tuned. When the music switches between the host's and a hold (the Reader), the new request starts with a different piece than the one playing whenever it has another, so the Reader never seems to open on the menu's piece.

**0.24.0 (2026-10-07):** The Reader never opens to the host's music. `StorySoundtrack`
carries a piece on only between requests of one kind: the host's music never follows the
reader into a hold, nor a hold's piece back out. The Reader always holds its own music:
the chapter's mood when a piece answers it, else `READER_MUSIC_MOOD` (`mystical`), which
also plays while Chapter 1 is written. `HarnessReaderSession` takes optional
`soundscapes`, the host's pieces for the Reader before the story has a chapter. Leaving
the Reader no longer stops the music itself (it cancels the sleep timer and stops the
atmosphere), so the soundtrack moves from the Reader's music to the host's in one step.

**0.23.0 (2026-10-06, breaking):** Phase 4: audio that's always there, and writing
that survives leaving. **The chapter being written belongs to the controller:**
`HarnessGenerationController.chapterWrite(storyId)` (`HarnessChapterWrite`, announced
to listeners when it starts and ends) is the one write every surface sees, and
`writeNextChapter(storyId, model)` finishes a write a closed browser interrupted (a
saved reply with no new model call; a cut-off request asked again) before writing a
new one. `nextChapterWaitsOnReader` is exported. **Music and atmosphere:**
`./reader-runtime` exports `StorySoundtrack` and `storySoundtrack(mixer)` (pieces of
one mood follow one another on the reader mixer; a hold plays over the host's own
music), `piecesForMood`, `SoundtrackRequest`, and the reader's choice
(`SoundtrackChoice`, `readSoundtrackChoice`, `writeSoundtrackChoice`,
`SOUNDTRACK_CHOICE_KEY`, `DEFAULT_SOUNDTRACK_CHOICE`). `HarnessReaderSession` plays
the atmosphere from the moment it opens (Chapter 1's writing screen included) and
under its own pages, locks the music and atmosphere into each chapter's scene
(Automatic), and Reader Settings › Audio gains Scene (Automatic or the reader's own
piece and atmosphere). **The writer chooses the scene:** the tiny SEN language gains
`[[soundtrack: Music Mood | Atmosphere]]` (`MarkReading.soundtracks`, required;
`SoundtrackTag`, `SOUNDTRACK_TAG_WORDS`); `SEN_SOUNDTRACK_SKILL` (1.0.0) fills a new
`soundtrack` CAPA slot managed by the Media Loadout (`HarnessSkillSlotId` widens);
`presentSoundtrackVocabulary`, `chapterSoundtrack`, `HarnessChapter.scene`
(`HarnessChapterScene`), the warning `soundtrack_incomplete`, and the frozen
`soundtrackVocabulary` on the loadout and CAPA Prompt. `./audio`: `SceneAudioTrack`
may carry `label` and `loudness`; `FrozenNarrativeMedia.atmospheres` (`SceneAtmosphere`)
and `MediaCatalog.atmospheres` (required); `soundtrackVocabulary`. Saved stories move
to schema 29 with an upgrade that keeps them as they are.

**0.22.0 (2026-10-06):** Phase 3. **Rewrite this chapter:**
`HarnessGenerationController.rewriteLatestChapter(storyId, model, note?)` writes the
story's newest chapter again from the story as it stood before it, and replaces it only
when the new version commits; `chapterRewriteGap`, `latestStoryChapter`,
`withoutLatestChapter` and `readRewriteNote` are exported, `ImmediateChapterRequest`
gains `rewrite` (`HarnessChapterRewrite`, `CHAPTER_REWRITE_NOTE_LIMIT`), an attempt gains
`replacedByChapterId`, and `HarnessReaderSession` takes `onRewriteChapter`.
**Holdings fixer:** after each chapter commits, the controller settles the chapter's
holdings problems through an optional adapter method,
`HarnessGenerationModelAdapter.fixHoldings` (`HarnessHoldingsFixRequest`), and keeps
the record on `HarnessChapter.fixer`; the controller option `holdingsFixer` and
`setHoldingsFixer` take a `HarnessHoldingsFixerPolicy`. `planHoldingsFix`,
`applyHoldingsFixes`, `chapterHoldingFlags`, `holdingTagText`, `readFixTags`,
`readHoldingsFixReply` and `HOLDINGS_FIXER_CASE_LIMIT` are exported, and a closing-list
`HoldingFlag` carries the item's `name`. `activeAttemptForStory` and
`isBlockingAttempt` are exported. Saved stories move to schema 28 with an upgrade that
keeps them as they are. `SEN_PACKAGE_VERSION` reads 0.22.0 (it had stayed at 0.20.0).

**0.21.0 (2026-10-06):** Retired the separate memory model call and its warning.
Removed `HarnessGenerationController.recoverChapterMemory`, the `chapterMemory`
controller option, and `HarnessGenerationModelAdapter.recoverMemory`. Historical
`HarnessMemoryRecovery` / request storage types stay exported so saved fields remain
readable and ignored. Chapter writing, acceptance, saving, recaps, canonical-state
readers and Holdings are unchanged. Library's `>=0.19.0` SEN peer range includes 0.21.0.


SEN is the portable expanded-narrative engine. A publisher supplies content,
branding, accounts, storage, media, and—if desired—a generation method. AI is
optional. SEN has no dependency on Celestial Library, Library UI, Library
accounts, Energy, QI, first-party catalogs, Workshop state, or concrete APIs.

## Color Codes

`./color-codes` owns the meanings; the shared CSS owns palette values. The default vocabulary:

| Color | Meaning |
| --- | --- |
| Blue | Main character, information, Codex updates |
| Green | Allies, safety, support, growth; uncommon items |
| Red | Hostility, serious danger, harmful outcomes |
| Orange | Caution, risk, pressure, consequences |
| Gold | Mentorship, attainment, sacred significance; legendary items |
| Pink | Affection and bonds |
| Purple | Mystery, fate, hidden significance; great/epic items |
| Light blue | Good/rare items |
| Muted rose | Lasting harm, curses, scars |
| Gray / white | Unknown or ordinary context / ordinary items |

Resolve the fact being shown: relationship for a character, tier for an item,
known safety before a location's distinction. Unknown labels stay neutral;
species never decides a character's relationship. `warning` and `mystery` are
independent codes; `itemGreat` and `location` keep their IDs with refined meanings.
Existing alternate palettes retain their IDs and use hue and lightness changes.

These are product conventions informed by [semantic discriminability research](https://arxiv.org/abs/2108.03685),
not universal psychological rules. Palette tests enforce at least 4.5:1 text contrast
on #111111, 10% token tints, and the Fate card gradient (7:1 for High Contrast Dark), plus distinct critical
signals. Future integrations must retain meaning in the content's text or shape
([WCAG color use](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html),
[contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html));
palette checks alone do not establish accessibility for a finished surface.

## Public entries

| Import | Owner responsibility |
| --- | --- |
| `./highlight-engine` | Single-block selection, nested actions, local editing, host-approved manual cue placement, and the manuscript page (permanent paragraph/sentence IDs, paragraph/sentence/span anchors, one edit rule, draft/sealed); no chapter dependency |
| `@seihouse/sen` | Neutral presentation contracts/defaults and version |
| `./contracts` | Story, chapter, block, identity, voice, usage and language contracts |
| `./presentation` | Product-neutral presentation provider and slots |
| `./reader-runtime` | Required host ports for Reader/Codex state and services, Read Aloud (spoken lines and speaker records, the three-voice script, voice choice, device preferences through `ReaderPreferenceStorage`, and the `useReadAloud` player over the browser's speech), and the story's soundtrack: `StorySoundtrack` on the host's reader mixer and the reader's Automatic or own choice of music and atmosphere |
| `./reader-chamber` | Portable Reader behavior and UI, including the anchored Mind Palace |
| `./reader-codex` | Portable Codex behavior and UI |
| `./inline-audio` | Sound Cues on the page: the glyph on the words a cue sits on and its playback, through the host's reader mixer (`ReaderMixerProvider`) or, without one, a host `NarrativeAudioProvider` |
| `./color-codes` | Single narrative Color Code authority |
| `./cards` | Narrative and System card families |
| `./manifestations` | Neutral manifestation capability and reveal UI |
| `./motion-picture` | Item-neutral still-to-motion picture for any pictured entity |
| `./audio` | Media intent, resolution, provenance and playback contracts |
| `./story-seed` | Foundation schema, validation, import/export, repository port and neutral editor |
| `./generation` | Provider-neutral chapter/block/media acceptance contracts |
| `./harness-generation` | Canonical state, continuity, CAPA, generation ports, recovery and export; the Fate page and its panels |
| `./translation` | Translation/accessibility contracts and controller |
| `./arc-goals` | Arc planning contracts and operations |
| `./styles.css` | SEN feature styles |

There is no `chapter-generation` or `codex-cards` compatibility entry. Legacy
Chapter Generation was retired; HARNESS is the one canonical generated-story
owner.

**0.20.0:** the fixes from the owner's Sovereign Hive test (Phase 1).

- A sound tag written beside its sentence instead of around its words
  (`isStraySoundTag`) no longer leaves broken lines: its words are removed and
  its sound moves onto the nearby words that echo them, or the nearest
  sentence (`settleStraySoundTags`, warning `sound_tag_moved`). A paragraph
  never starts with the full stop a tag left behind
  (`trimLeadingStrayPunctuation`).
- A placeholder speaker tag copied from the instructions (`[[@Name]]`) counts
  as no tag, so its lines take their speaker from the narration.
- Holdings keep things and abilities only: `holdingName` takes a count or a
  description out of a name, keeps a number that belongs to it ("1000 Year
  Ginseng"), and sets aside a name that reads as a note (a sentence, a
  sighting, a countdown). Tags written into the closing list instead of the
  prose are recorded at the chapter's end, never twice.
- Sound Cues, Speakers and Holdings skills 2.1.0; the response contract keeps
  countdowns out of recaps and pet words out of chapters, and the chapter
  request gives a words-per-paragraph guide.
- A Story Seed Blueprint drops its hidden look-ahead when the story's length
  changes, and the review saves a length as it is typed.

**0.19.0 (breaking):** the Reader's sound is the SEIHouse audio player's
reader mixer. `@seihouse/audio-player` ^4.0.0 is a new peer.

- The HARNESS Reader (`./harness-generation`) plays its soundtrack through the
  host's `ReaderMixerProvider`: the reader's chosen atmosphere plays while the
  chapter is on screen and fades out while a page covers it (Fate, Holdings,
  an arc's page, the writing screen), keeping a sleep timer; every layer stops
  on leaving the Reader; only the layers the chapter uses appear in Audio
  settings (Sound Cues when it has some; soundscapes are not chosen yet); the
  chapter's cues are warmed early; Listen dips the soundtrack and keeps the
  reader active; a sleep timer that fires stops Listen too; the chapter's
  navigation coming into view, or Listen finishing the chapter, is the
  chapter's end for an End of chapter timer. A cue whose saved Energy is not
  low, medium or high plays as medium.
- The Reader shows the player's ghost note above the Listen bar (a tap mutes
  story audio, a long-press opens Audio), and Reader Settings opens with an
  Audio section (the player's `ReaderMixerPanel`, loaded only when the sheet
  opens) before Narration. Without a mixer, neither appears.
- `./inline-audio`: with a mixer, a Sound Cue plays over the soundtrack
  (`MixerCueControl`), cues may overlap, and its loudness is the reader's
  Sound Cues level times the moment's Energy (`SOUND_CUE_ENERGY_VOLUME`: low
  0.8, medium 0.9, high 1). A tap that makes no sound says why (story audio
  muted, Sound Cues off). `InlineAudio` needs a `ReaderMixerProvider` or a
  `NarrativeAudioProvider`.
- Host setup: create one mixer for the page (`createReaderMixer`, with your
  atmospheres and saved mix), wrap the Reader in `ReaderMixerProvider`, import
  `@seihouse/audio-player/styles.css` and
  `@seihouse/audio-player/reader-ui/styles.css`, and add the player's
  `dist/reader-ui.js` to Tailwind's `@source`.

**0.18.0 (breaking):** a story runs 10 to 40 arcs.

- `./arc-goals`: `STORY_LENGTH_ARCS` (`{ min: 10, max: 40 }`, 300 to 1,200
  chapters) is the range a Story Length or a Blueprint's length is chosen in.
  `MAX_ROADMAP_ARCS` (100) stays the longest a saved story or draft carries.
- `./story-seed`: `validateRequestedArcCount`, `validateStorySeedInput` and
  `validateBlueprintArcPlan` require a length in range; drafts and Blueprints
  saved with another length still load and normalize as they are. New
  `describeStoryLengthProblem` names the problem, which the Blueprint review
  fixes without a model call, except for an older Blueprint planned as one arc
  (`arcOneScope: 'whole-story'`, its Arc 1 the whole story): a length edit
  cannot make that Arc 1 an opening, so the review asks for it to be regenerated.

**0.17.0 (breaking):** the writer's tags, one strict shape.

- `./harness-generation`: every tag kind is taught in one shape (JOB, FORMAT,
  REQUIRED, FORBIDDEN, CHECK BEFORE YOU RETURN), and what every tag shares is
  said once, as `HARNESS_TAG_RULES`, before the first skill that teaches a
  tag (CAPA slots that teach one carry `writesTags`). SEN Sound Cues, Speakers
  and Holdings are 2.0.0. Sounds are tagged where they happen,
  `[[sound: Sound Word | Words | Energy]]`: the reply format no longer asks
  for `soundCues`, and `readHarnessSoundCueSignals` and
  `HARNESS_SOUND_CUE_SIGNAL_LIMIT` are gone. A writer that still returns the
  list, or still writes numbered marks, places nothing and is told so in a
  warning (`ignoredSoundCueListWarning`); the words are kept.
- `./generation`: `readMarks(text, { soundWords })` reads sound tags
  (`MarkReading.sounds`, `soundIssues`, `SoundTag`); given the story's sound
  words, a tag written the other way round reads the right way. Numbered marks
  are still read so they never leak, and nothing is placed from them.
- `./audio`: `placeSoundCues` takes each paragraph's sound tags (`sounds`)
  instead of marks and signals; `SoundCueSignal` is gone, and a set-aside tag
  keeps its sound, words and place. `SOUND_CUE_RULES.maxWords` is 8, for a cue
  placed by hand and one the writer tags alike.

**0.16.0 (breaking):** what a five-chapter test showed.

- `./harness-generation`: a reply under a quarter of the chapter's minimum
  words is a failed write (`harnessFailedWrite`, `HARNESS_FAILED_WRITE_SHARE`):
  never saved, its raw reply kept on the attempt for a retry. A chapter that is
  only short is still kept and flagged. The story's point of view travels in
  Current Story Information (`CurrentStoryProjection.pointOfView`, read from its
  earliest committed chapter that shows one clearly), and the response contract
  tells the writer to keep it; SEN Speakers v1.2.0 no longer mentions point of
  view. A chapter label the writer put before its title is dropped
  (`chapterTitleText`), and the Reader and Read Aloud say the number once.
  Taking a thing in hand or putting it away records it as held the first time
  the story shows it (`deriveHoldings`), instead of being flagged and left out.

**0.15.0 (breaking):** Read Aloud reads like production.

- `./reader-runtime`: speech nobody tagged is voiced from its narration
  (`narratedSpeaker`, `ReadAloudChapter.mainCharacter`): the Side voice when
  the sentence beside it names someone else first, otherwise the main
  character's, now `UNTAGGED_SPEECH_ROLE` (was the Side voice).
  `chooseDefaultVoices` takes a voice on the device before an online one
  (`isDeviceVoice`) and a pick's standard voice before its Enhanced or Premium
  one, then the first voice not yet taken (no longer a voice from another
  region). The browser's queue is cleared before every line, and the next line
  waits 50 ms after one ends, as in production.

**0.14.0 (breaking):** arcs of 30 chapters.

- `./arc-goals`: `ARC_LENGTH` is 30, so an arc plan's goals total 30 chapters
  and Arc 2 begins with Chapter 31. `activeArcGoal` hands a goal reached early
  to the next in the following chapter; that goal keeps its own deadline.
- `./harness-generation`: `HARNESS_GENERATION_SCHEMA_VERSION` 27 upgrades no
  older storage; an older workspace is kept untouched and the page opens empty.
  `editArcGoals` refuses an edit that gives a goal not yet reached a deadline
  before the next chapter.

**0.13.0 (breaking):** holdings, the tag system's first information tags.

- `./generation`: `readMarks` reads word tags (`[[gained: MC | Thing]]`) and
  `TAG_WORDS` lists the tag words with the spellings each accepts.
- `./harness-generation`:
  - `CodexEntry`, `HoldingChangeAttachment` and `HoldingsSection`: the records.
  - `placeHoldingChanges`, `resolveHoldingChanges`, `deriveHoldings` and
    `holdingsSection`: tags to records, records to Codex entries, and what
    every character holds now, worked out and checked by plain rules.
  - `SEN_HOLDINGS_SKILL` in a new always-managed `holdings` CAPA slot
    (`ALWAYS_LOADED_SKILLS`), and `HoldingsPage` in the Reader.
  - Breaking: `HarnessSkillSlotId` and `PacketSectionId` widen with
    `holdings`, `HarnessWorkspaceState` requires `codexEntries`, and the
    workspace schema is 26.

**0.12.0 (breaking):** Read Aloud and dialogue speakers.

- `./reader-runtime`: Read Aloud, the Reader's three-voice narration on the
  browser's own speech.
  - `findSpokenLines`, `SpeakerAttachment` and `SPEAKER_KIND`: spoken lines and
    the speaker records on them.
  - `buildReadAloudScript`: a chapter as short lines inside its sentences, each
    for the Narrator, Protagonist or Side voice.
  - `chooseDefaultVoices` and `resolveReadAloudVoices`: voices for the story's
    language, from a host's `ReadAloudVoicePicks`.
  - The preferences codec, through the existing `ReaderPreferenceStorage` port.
  - `useReadAloud`, with `createWebSpeechEngine`.
- `./harness-generation`:
  - `HarnessReaderSession` takes `readerPreferences` and `readAloudVoices`, and
    shows Listen and Reader Settings (Narration) when the browser can speak.
  - Speaker tags (`[[@MC]]` for the main character, `[[@Name]]` for anyone
    else, read by `readMarks`) become `HarnessChapter.speakers` (schema 25).
  - `SEN_SPEAKERS_SKILL` fills the new always-managed `speakers` slot.
  - `HarnessSkillSlotId` and `CapaSlotManager` widen, which is the breaking part.
- `./contracts`: `senSpeechLanguageTags`.
- `./inline-audio`: a cue's screen-reader status no longer shifts passage offsets.

**0.11.0 (breaking):** a World Blueprint plans only Arc 1; every later arc is
planned when the reader begins it.

- `./story-seed`:
  - `WorldBlueprint.arcPlans` holds exactly Arc 1, and a new hidden
    `arcLookahead` holds at most two one-line directions for the next arcs.
  - `validateBlueprintArcPlan`, `describeBlueprintArcPlanProblem`,
    `alignArcOneWithSeed` and `fitArcLookahead` replace the whole-roadmap
    functions.
  - `buildArcRoadmapExtensionPayload`, `ARC_ROADMAP_EXTENSION_OPERATION` and
    `ArcRoadmapExtensionPayload` are removed, and so are `CreationModal`'s
    `onExtendArcRoadmap` and `BlueprintReview`'s `onAddArcs`.
  - New: `fillBlankSeedSlots`, `readGeneratedSeedSlots`, `GeneratedSeedSlots`,
    `GeneratedWorldBlueprint`, and the `SEED_*` slot lists and card limits.
  - The Seed holds the creator's Story Length (`story.optional.arcCount`, 1 to
    100 arcs). The Blueprint is generated for it and its `estimatedArcs`
    follows it; `WorldBlueprint.arcOneScope` records what Arc 1 was planned as.
    `BlueprintGenerationPayload.arcCount` is removed, and
    `buildBlueprintGenerationPayload` takes only the Seed.
- `./arc-goals`:
  - `insertArcsBeforeFinal`, `arcsCanBeAddedBeforeFinal`, `validateArcRoadmap`
    and `arcRoadmapSchema` are removed.
  - New look-ahead and planning helpers: `ArcLookaheadEntry`,
    `normalizeArcLookahead`, `arcLookaheadFromPlans`, `ARC_PLAN_DRAFT_SCHEMA`,
    `arcPlanFromDraft`, and `ARC_LOOKAHEAD_SCHEMA`.
- `./harness-generation`:
  - The Foundation takes `initialArcPlan`, `plannedArcCount` and
    `initialArcLookahead` in place of `arcRoadmap`.
  - `planNextArc`, `nextArcStep`, `arcPlanGap`, `arcReviewGap` and
    `routeCompleteGap` are new, together with `BlueprintArcPage`, the World
    Blueprint's goal section that reappears in the Reader when a new arc
    begins.
  - `HarnessReaderSession` takes `onPlanArc`.
  - Storage moves to schema 24.

**0.10.0 (breaking):** `InlineAudio`, `InlineAudioControl` and `InlineAudioText`
moved from `./reader-chamber` to their own entry, `./inline-audio`, and their
source from `components/reader-chamber/development/` to `src/audio/`. The
HARNESS Reader now renders Sound Cues without reaching the older Reader
Chamber, its Codex cards or their styles.

**0.9.0 (breaking):** `HarnessReaderSession` is just reading. Each chapter's
paragraphs sit on the read-only Highlight Engine with their Sound Cues
(`InlineAudioText`); Previous, Next, Next at the newest chapter and the Fate
page (its header's Fate button) stay. The `installedSkills` prop is removed, and
with it the packaged Reader Chamber, Codex sheet, Mind Palace, reading
settings, reader translation, read-aloud and read marks in this Reader. New:
`renderWriting(writing: HarnessReaderWriting)`, the host's screen while a
chapter is written (rendered on every pass so it can animate out);
`startOnOpen`, which begins Chapter 1 as the Reader opens for a story with no
chapters; `NextChapterWriter.writingChapter`; and the controller option
`chapterMemory: 'after-commit' | 'on-request'` (default `after-commit`), which
lets a host read story memory only on request.

**0.8.0 (breaking):** chapters speak the tiny SEN language, starting with
narration and Sound Cues. The writer wraps the one to five words where a sound
happens (`[[n|words]]`) and names it from the story's sound words
(`soundCues: [{mark, sound, energy?}]`); the HARNESS strips every mark, places
the cue on those exact words (`placeSoundCues`), picks the recording and stores
it as a manuscript span attachment (`SoundCueAttachment`, kind `sound-cue`). A
new managed CAPA slot, Sound Cues (`media-loadout`), carries SEN's bundled
`SEN_SOUND_CUES_SKILL` and the story's sound words as its example list.
`HarnessChapter` and the accepted draft keep `paragraphs`, `prose` and
`metrics`, gain `soundCues`, and lose `blocks`, `audioMoments` and
`soundscapes`; `ChapterContent.audioMoments`, `ChapterProse.audioMoments` and
`ReaderChapter.audioMoments` became `soundCues` (a production transfer note:
Light-Novels reads `audioMoments` today). Removed: the World Cue intent,
validation and resolution system (`resolveWorldCueIntent`,
`resolveChapterAudioMoments`, `ResolvedAudioMoment`, `WorldCueIntent`,
`INLINE_AUDIO_CUE_CATEGORIES`), `acceptChapterMedia`, the HARNESS signal
families and their enums (`readHarnessChapterSignals`,
`applyHarnessChapterSignals`, `HARNESS_SIGNAL_LIMITS` and the rest), and
`createManualCueMoment` (now `createManualSoundCue`). `InlineAudio`,
`InlineAudioControl` and `InlineAudioText` take `cue`/`cues`. Dialogue,
Manifestations, System Panels, Soundscapes and Creature Events are rebuilt
later, one at a time. Saved HARNESS workspaces are not upgraded (schema 22):
by the product owner's decision the earlier workspace is kept untouched and
the page starts fresh.

**0.7.0 (breaking):** Translation and Accessibility are managed CAPA slots, like
Fate. The HARNESS resolves Translation from the story's Story Language (its
Original Language) and Accessibility from its Reading Mode
(`HarnessStory.chapterWritingStyle`, production's values, from
`./contracts`), with SEN bundling one Accessibility skill per non-Standard mode
(`SEN_READING_MODE_SKILLS`). Neither slot can be equipped by hand. The
always-sent `HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS` constant became
`buildHarnessOfficialOutputRequirements`, sent only when a chapter needs it;
`isTranslationSkillCompatible` and `translationCompatibilityError` gave way to
`resolveStoryLanguagePackage` and the shared `resolveTranslationPackage`.
`CapaSlotDefinition` gains `installable`. Saved HARNESS workspaces upgrade in
place (schema 21).

**0.6.0 (breaking):** removed `AlterFatePanel`, `ReaderFateAlerts`,
`FateSurvivalExplanation` and the `alterFateLock` helpers from `./reader-chamber`
(the Reader's `handleAlterFate` prop became `onOpenFate`, and its unused
`currentPowerStage` prop is gone); removed `HarnessSteering`,
`controller.steerStory` and the Fate Survival mystery/visibility fields from
`./harness-generation` in favor of `chooseChapterDirection`, the one-chapter
`HarnessChapterDirection`, and the Fate page (`FatePage`, `FatePathChooser`,
`FateArcGoalCard`, `FateDestinedEnding`, `FateConclusion`). Saved HARNESS
workspaces upgrade in place (schema 20).

## Required host composition

Reader and Codex require `ReaderRuntimeProvider`; Story Seed persistence is a
`StorySeedRepository`; generation is a `HarnessGenerationModelAdapter`; media
is supplied through portable media ports. Missing providers fail clearly. No
package surface installs browser storage, a mock store, a same-origin endpoint,
a provider, a catalog, authentication, or payment policy by default.

The packed-consumer smoke installs SEN without Library UI or the SEIHouse audio
player, supplies an independent presentation component, custom account and
repository types, and bundles every export with no AI adapter.

## Enforcement and build

`npm run check:ownership` classifies every production source file, checks every
public closure, rejects cross-owner source imports, undeclared dependencies,
host/Workshop defaults, package cycles and invalid dependency direction. It
does not begin from exports alone, so an unexported production capability fails.

```bash
npm run check:ownership
npm run build:package:sen
npm run test:package
```

Locked references, Workshop previews and fixtures, `src/host`, `src/server`,
concrete asset locations, and cross-product provenance are deliberately absent.
