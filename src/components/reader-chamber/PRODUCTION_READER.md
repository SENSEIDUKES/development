# Production's Reader: everything it does

Every feature and option in production's Reader, grouped by the job it does for the
reader, in plain language. It is the starting point for designing the Reader as one
clear piece: what to keep, what to merge, and what to leave behind.

- **Source:** SENSEIDUKES/Light-Novels `main` @ `647165a` (2026-09-16), copied unchanged
  into `reference/light-novels/` on 2026-10-07.
- **See it:** Workshop → Reader Chamber → **Original Reference** → **Scenes**. Most
  sections below name the Scene that shows them.
- **How this was made:** written 2026-10-07 by reading production's code. Nothing below
  was changed in production.
- **Citations:** paths under `reference/light-novels/src/`.

Notes used throughout:

- **Duplicate:** the same job sits in more than one place.
- **Unfinished:** promised or half-built, or no control can reach it.
- **Fixed value:** written into the code instead of coming from the story or the
  reader's settings.
- **Looks wrong:** reads as a mistake in the code. These were found by reading the code,
  not by using the app, so each is worth confirming in the Scenes before it is relied on.
- **Unused:** the code works it out but never shows it.

## At a glance

- **Nine jobs.** Production's Reader does nine jobs:
  - shows the page;
  - lets the reader shape how it looks;
  - reads it aloud;
  - scores it with music and sound;
  - explains the world inside the text;
  - helps the reader keep their place;
  - lets the reader direct the story;
  - translates;
  - tracks progress and rewards.

  The Codex, a whole application of its own, opens on top.
- **Four layers.** Those jobs are split across four layers, each owning part of the
  screen:
  - the Reader screen: top bar, recap, steering, Lore Glossary;
  - the chamber: effects, settings, sealing;
  - the page: the text and everything inside it;
  - the bottom bar: listen, navigate, Codex, Alter Fate, Immersion.

  The Codex sheet and the keyboard shortcuts sit outside the Reader entirely.
- **Settings are scattered.** Options live in three places: "Aetherial Styles" in the
  chapter header, the Immersion popover on the bottom bar, and the volume control in the
  chapter header. They are kept in four different ways: in the story, on the device,
  until the app reloads, and not at all (see "Where settings live").
- **Many things exist more than once:**
  - five ways to change chapter;
  - three ways to open the Codex;
  - two inline bookmark designs plus a drawer;
  - four separate continuity ideas;
  - two different things called Lore;
  - two master volume controls.
- **Much is fixed to one genre.** Steering cards, Codex captions, glossary terms and
  sample names are written for xianxia, with a protagonist called Han Feng, whatever the
  story is.

## The screen, top to bottom

1. **Top bar:**
   - the back arrow;
   - genre · title;
   - the clock;
   - chapter and total word counts;
   - **Lore Glossary** and **Codex**;
   - the arc progress line.
2. **Chapter header** (stays at the top while scrolling):
   - arc and chapter number, and the title;
   - the sealed lock and the Timeline Divergence badge;
   - mark as read;
   - **Aetherial Styles** (settings) and bookmarks;
   - the chapter list and volume.
3. **Settings panel**, when open: it pushes the page down.
4. **The page:**
   - fate alerts and continuity notes;
   - the System colour legend;
   - the chapter title and divider;
   - the text, with everything inside it;
   - the chapter's "memory" image and the Context Inspector;
   - **Previous**, **Next** and **Seal**.
5. **Arc-complete banner**, under the page.
6. **Bottom bar**, always on screen: listen, chapter navigation, Codex, Alter Fate and
   Immersion.
7. **On top of everything:**
   - the Lore Glossary and bookmarks drawers;
   - Alter Fate and the Continuity Guard;
   - the Codex sheet;
   - the shortcuts sheet;
   - the recap.

## Where settings live

| Where the reader finds it | What it controls | How long it is kept |
|---|---|---|
| **Aetherial Styles** panel (chapter header) | Font, size, theme, drop cap, particles, divider, System frame, highlight style, player style, vignette, text spacing and width | In the story: each story has its own look (`ReaderChamber.tsx:345-356`) |
| System legend's palette menu | Colour-blind palette | In the story |
| System legend's **Dismiss**, and the System Color Legend switch | Whether the legend shows | On this device (`lib/readerLegend.ts`) |
| Header volume, and Immersion → **Audio** | Master, music, atmosphere and cue levels; the pinned music track | On this device (`lib/audio/audioMixSettings.ts:26`) |
| Immersion switches | Immersion Engine, Autonomous Reading, Holographic Visions | Until the app reloads (production's app state, not saved) |
| Immersion → **Voice Matrix Signature**, **Playback Speed** | Narrator, protagonist and side voices; speed | Not kept: reset every time the Reader opens (`hooks/audio/useVoicePreferences.ts:5-12`) |
| **Lore Glossary** | Term translations per language | With the story, on production's servers |

## 1. Showing the page

Where: `components/ReaderViewport.tsx`, `components/ReaderChamber.tsx`. Scenes: Chapter
1, Chapter 3, Chapter 4, Chapter 5.

### Chapter states

- **Ready:** the chapter fades in.
- **Loading:** pulsing placeholder lines while the text loads or is written.
  - **Looks wrong:** a chapter being written anywhere makes every unwritten chapter show
    these lines instead of its "Unmanifested" screen (`ReaderViewport.tsx:1197-1218`).
- **Unwritten, "Unmanifested Segment":** the chapter's premise in quotes, and two buttons:
  - **Manifest** writes this chapter.
  - **Manifest Next 5 Chapters** (or **Resume 5-Chapter Batch**) writes a batch.
  - While working, the button names the agent: "VERSA is shaping...", "SCOUT is
    scanning..." or "Condensing Narrative...".
  - Scenes: Chapter 6 unwritten; A chapter being written.
- **Being written:** the text streams in live. It counts as already read, so the read
  check lights up (`ReaderScreen.tsx:59-68`).
- **Translating:** "Translating the Heavenly Dao..." replaces the whole chapter.

### What the page shows, in order

1. Fate alerts, in Fate Survival and Hardcore Fate stories (§6).
2. Continuity notes (§6).
3. The System colour legend, "Aetherial System Codes" (§4).
4. "{Story title} • Chapter N" and the chapter title.
5. A divider in the chosen style.
6. The text.
7. The "Memory of this event" image, on a chapter's most important moments (§9).
8. The Context Inspector (§10).
9. **Previous**, **Next** and **Seal Chapter (Publish)**.

### Inside the text

- Paragraphs are indented. The optional drop cap decorates the first paragraph, and
  screen readers still read the whole word.
- Right-to-left languages switch direction.
- **System notices**, from structured events or any `[ ... ]` line (§4).
- **Name highlights**, **reveal cards** and **World Cards** (§4).
- **Bookmark marks** beside paragraphs (§5).
- Hidden sound triggers for a few story moments (§3).

### Three ways of drawing a chapter

Production draws a chapter in one of three ways, and they do not offer the same features:

| | Structured chapter | Older plain-text chapter | Translated chapter |
|---|---|---|---|
| System notices | Full structured boxes | From `[ ]` lines | From `[ ]` lines |
| Reveal cards and World Cards | Yes | No | No |
| Bookmarks | Icon after each paragraph | A different margin design | None |
| Focus while listening (§2) | Yes | No | Yes |

### Shaping the page: "Reader Chamber Controls"

Opened and closed with the sliders button, **Aetherial Styles**, in the chapter header.
Scene: Reader Settings.

- It opens inside the page and pushes the text down. It has no close button of its own.
- Each group folds. Groups start open on desktop and folded on phones.
- Choices are kept in the story, so each story keeps its own look.

| Setting | Choices | Starts at |
|---|---|---|
| Aura Font | Literata (Serif), Rubik (Sans), System Mono | Serif |
| Initial Drop Cap | Off (Standard), Classic Imperial, Celestial Aura, Ancient Seal | Off |
| Atmospheric Hue (theme) | void, crimson, abyss, sepia, emerald, shown as raw names | void |
| Atmospheric Particles | Off, Low, Default, High (0, 15, 40 or 80 particles) | Default |
| Chapter Divider | Classic Minimal, Celestial Crest, Sword Qi Horizon, Lotus Serenity | Classic Minimal |
| System Notice Frame | Holographic Core, Ancient Scroll, Daoist Runic, Minimal Slate | Holographic Core |
| Visual Scale (text size) | xs, sm, base, lg, xl | lg (17 px on phones, 18 px on wider screens) |
| Visual Highlights (name style) | Full Block, Underline, Soft Tint | Full Block |
| Audio Player Style | Classic Vinyl, Minimal Core, Ethereal Pulse | Classic Vinyl |
| Cinematic Vignette | Pure Focus (Off), Cinematic Shadow, Glowing Cosmic Mist, Ancient Parchment | Off |
| System Color Legend | On or Off | On |

**Visual & Text Settings** (its folded header shows a summary such as "1.62 line ·
62ch"; **Reset Text** resets only these, keeping font, size and theme):

| Setting | Range | Starts at |
|---|---|---|
| Line height | 1.45 to 1.9 | 1.62 |
| Paragraph gap | 0.5 to 2.5 em | 1.15 em |
| Letter spacing | −0.03 to 0.08 em | 0 |
| Word spacing | −0.04 to 0.08 em | 0 |
| Reading width | 44 to 76 characters | 62 |
| Text alignment | Start or Justify | Start |

Each theme sets the background, text colour, selection colour, glow and a matching tint
on the chapter header. Dividers take the theme's accent: deep red (crimson), blue (abyss
and void), brown (sepia) or green (emerald).

Not in this panel:

- **Unfinished:** the colour-blind palettes live in the System legend instead (§4).
- **Unfinished:** a "context engine" setting and a whole accessibility settings shape,
  including a dyslexia-friendly font, exist in the data but have no controls
  (`types.ts:983`, `:995-1001`).

### Effects that change the page on their own

- **Critical-scene red glow:** the page edge turns red and pulses every 3.5 seconds when
  any of these is true (`ReaderChamber.tsx:370-409`):
  - the chapter title or summary mentions death (death, die, dying, killed, fatal,
    perish, slain, demise, sacrificed, mortal wound, heart stops, breathes last, and
    similar);
  - a paragraph mentions a death flag, critical health or near death;
  - a System notice is a corruption;
  - the chapter's danger is extreme: 9.5 out of 10, or 8 with sorrow, grief or fear.

  **Looks wrong:** words are matched inside other words, so "die" also matches
  "soldier", "studied" or "bodies", and ordinary chapters could turn red.
- **Screen shake:** a 0.6-second shake at a very intense moment, such as danger, a power
  shift or tension of 80% or more, or a boss-level beast.
  - At most once per chapter.
  - Only while narrating or auto-scrolling, and only with Holographic Visions on.
  - It does not check the device's reduced-motion setting (`ReaderChamber.tsx:456-493`).
- **Floating particles:** drift upward in the theme colour (red, blue, tan, green or
  gold). They do not check reduced motion either (`components/ParticleSystem.tsx`).
- **Vignette:**
  - Cinematic Shadow darkens the edges.
  - Glowing Cosmic Mist glows in the theme colour and pulses, and respects reduced motion.
  - Ancient Parchment adds paper margins and a double border.

### Fullscreen

Scene: Fullscreen reading.

- Tap the text (not a button or a link, and not while selecting) or press F. Esc leaves.
- It hides the top bar and the chapter header. The bottom bar stays.
- **Unfinished:** a code comment promises a dedicated fullscreen control; there is none
  (`ReaderViewport.tsx:405-407`).
- **Looks wrong:** the chapter header is what starts each chapter's music. A chapter
  opened in fullscreen likely starts no music (`ReaderHeader.tsx:37-43`).

## 2. Reading aloud

Where: `components/ReaderControls/PlaybackControls.tsx`, `hooks/useReaderPlayback.ts`,
`lib/voice/webSpeechCast.ts`, `components/ReaderControls/ImmersionSettings.tsx`. Scene:
Immersion settings, or press the disc in any reading Scene.

- **The play disc** sits in the bottom bar:
  - "Begin Rhythmic Recitation" starts reading.
  - While playing, the button is labelled "Stop Audio Playback". **Looks wrong:** it only
    pauses, and there is no stop control anywhere (`PlaybackControls.tsx:17-22`).
  - On desktop it also shows "Listen to Chapter" / "Rhythmic Recitation Active" and the
    chapter number. In basic mode it adds a "Basic Narration" badge.
  - Its look (Audio Player Style): Classic Vinyl has grooves and spins; Minimal Core is a
    plain disc; Ethereal Pulse is a glowing gradient.
- **Three modes, chosen automatically.** There is no mode picker.
  - **Full narration** works online with browser speech. It plays recorded voice clips
    when a chapter has them, and browser voices otherwise. It dims the other paragraphs,
    scrolls along, and shows reveal cards as the voice reaches them.
  - **Basic narration** is used offline or without browser speech: browser voices only,
    with no dimming.
  - **Manual reading** means no narration.
  - **Looks wrong:** after browser-voice narration, the mode appears to stay on full
    narration. That would keep scroll-triggered music and atmosphere cues switched off
    during later manual reading.
- **What it reads:**
  - the translation if one is active, otherwise the chapter;
  - it opens with "Chapter N. Title.";
  - it skips System alert brackets and sound tags.
- **Voices, "Voice Matrix Signature":** three dropdowns of the device's voices.
  - **Narrator Voice** reads narration.
  - **Protagonist Voice** reads dialogue (text in quotes) by the main character, or by an
    unnamed speaker.
  - **Side Character Voice** reads everyone else's dialogue, falling back to the
    protagonist's voice.
  - Defaults prefer "Daniel" for the narrator, "Rishi" for the protagonist, and a
    different, often female, voice for side characters.
- **Playback Speed:** a button that cycles 0.5x → 1.0x → 1.5x → 2.0x.
- **Unfinished:** pitch and narration volume are fixed. Voices and speed are not saved,
  so they reset every time the Reader opens.
- **Keeps going:** once you press play, each next chapter starts on its own half a second
  after its text is ready, once per chapter. **Looks wrong:** only the missing stop
  control would turn this off.
- **Changes apply live:** a new voice, speed or volume re-reads the current sentence.
- **Cutting the text:** pieces of at most 180 characters, about 8 seconds each. This also
  works for Chinese and Japanese text without spaces.
- **Looks wrong:** Master Audio does not silence browser voices, and it mutes only the
  recorded clip already playing; later clips start at full volume.

### Following the voice

Where: `hooks/useCinematicScroll.ts`, `lib/cinematicScroll/*`.

- **Autonomous Reading** keeps the paragraph being read about a third of the way down
  the screen. It moves smoothly and only forward.
- Any scroll, swipe, mouse wheel or scroll key hands control back to the reader for
  good.
  - A pill then says "Auto-scroll paused", with **Resume Reading**, which glides back to
    the voice.
  - There is no timed return.
- It turns off when the device asks for reduced motion, or when Immersion Engine or
  Autonomous Reading is off. The I key toggles it, ignoring Immersion Engine.
- **Focus:** the chunk being read is highlighted in blue. The other paragraphs dim to
  60%, in structured chapters only.

## 3. Music, atmosphere and story sounds

Where: `hooks/audio/useAtmosphericAudio.ts`, `lib/audio/*`,
`components/ReaderControls/AudioMenu.tsx`, `components/AudioWidget.tsx`. Scene:
Immersion settings.

All Reader sound plays only on the Reader screen, and only while Master Audio is on.

### Controls

- **Header volume:** mute, with a soft vibration. On wider screens, a volume slider
  appears on hover; phones get mute only.
  - **Duplicate:** this is the same control as Master Audio below.
- **Immersion → Audio:**
  - **Master Audio** — "All sound on or off. Your settings below are kept." On/off and
    0–100%.
  - **Music** — "Background music for each scene." On/off and a level.
    - **Track:** "Automatic (follows the story)", or one of 23 tracks grouped as
      Adventure, Ambient, Emotions, Fighting and War.
    - **Fixed value:** track names come from file names, so typos show: "Ambeint Night",
      "Ambeint Truimph", "Adventure Travling", "Sad Lost Opporunirty", "Fighting Rival
      Apperance" (`lib/audio/musicResolver.ts:89-119`).
  - **Atmosphere** — "Ambient sound like rain and wind." On/off and a level.
  - **Audio Cues** — "Short sound effects for story moments." On/off and a level.
  - Starting levels: master 100%, music 62.5% (and never louder than 40% of full),
    atmosphere 50%, cues 50%.

### What plays when

- **Music:**
  - Each chapter starts with a calm track matched to its tags.
  - During narration, intense moments can raise it:
    - war music needs very high danger;
    - fighting music needs high danger or intensity;
    - emotional music needs high intensity or tension.

    Otherwise the calm track of the same family plays.
  - A more intense track can replace a calmer one, never the reverse; a boss fight ranks
    highest and "tired" lowest.
  - A track the reader picks always wins.
  - **Unfinished:** the story data can name a region or a custom track address; both are
    ignored.
- **Atmosphere:**
  - 50 loops: noise, rain, combat, crowd, waves and wind.
  - One is chosen at chapter start by its tags; a tie means silence.
  - During narration, a strong match can switch the loop. Loops crossfade over 1.5
    seconds.
  - **Unfinished:** the code accepts a manual atmosphere choice, but no control sends one.
- **Story moment sounds:**
  - Six kinds only: System alert, breakthrough, artifact activation, beast reveal, fate
    shift and major impact.
  - At most three per chapter, one per third of the chapter, 20 seconds apart, and only
    while narrating or auto-scrolling (`lib/effects/cinematicEffectGovernor.ts`).
  - **Unfinished:** none of the six has a sound file yet, so on phones they only vibrate
    (`lib/audio/ambienceSoundCatalog.ts:197-204`).
  - **Looks wrong:** the triggers placed in the text are hidden elements, which never
    count as seen, so the scroll-triggered ones likely never fire.

### Other sounds

- World Card "Tap to Listen" (§4) and Codex character voices (§8).
- **Looks wrong:** opening a photo in the Codex collage plays a generated chime. It
  ignores Master Audio and breaks the audio rule elsewhere that nothing is synthesized
  (`codex/ReaderCodexCollage.tsx:37-69`).

## 4. Explaining the world inside the text

Where: `components/CodexHovercard.tsx`, `components/WorldEntityCard.tsx`,
`components/SystemBlock.tsx`, `components/SystemColorLegend.tsx`,
`lib/systemColors.ts`, `lib/codexHighlighting.ts`. Scene: Chapter 1.

### Name highlights

- Every character, place, faction and artifact name or alias of three or more letters is
  highlighted.
  - Longer names win over shorter ones.
  - It works in Chinese and Japanese text, which has no spaces.
- **Tap, click or Enter** opens a card; hovering does not. Clicking away closes it.
- **The card:**
  - a portrait, or **Manifest** / "Awaken Aetherial Portrait" to make one
    ("Summoning..." while working);
  - the name and four lines of description;
  - the role or tier.
- **Colour says what a name is:**
  - **Characters**, by their relationship to the main character:
    - blue: the main character, and anyone unmatched;
    - pink: lover, spouse, dao companion;
    - gold: mentor, master, elder;
    - green: friend, ally, sibling, comrade;
    - red: enemy, rival, villain;
    - gray: unknown, stranger.
  - **Places:** gold for sacred, secret or forbidden places, purple otherwise.
  - **Artifacts**, by tier:
    - gold: legendary, divine, mythic;
    - orange: great, epic, heaven;
    - blue: good, rare, earth;
    - dark green: decent, uncommon, mortal;
    - white: basic.
  - **Factions:** jade.
- While a paragraph is read aloud, its highlights pause.
- Making a portrait here uses the reader's image allowance. Unlike reveal cards, it is not
  limited to characters the story has built up.

### Reveal cards

- When a character, place or thing is marked as revealed in the chapter's data, a card
  appears before that paragraph. It shows:
  - a portrait, or **Manifest** / "Awaken Portrait";
  - "Reveal · {type}";
  - the name and two lines of description.
- **Backdrop:** one of five fixed landscape images (thunder, rain, mountains, forest,
  daytime), never the same twice in a row. The choice is saved back into the story
  (`ReaderViewport.tsx:21-36`). **Fixed value:** the five image addresses.
- **When it appears:**
  - Without full narration, it fades in when scrolled to.
  - With full narration, it appears when the voice reaches it, and only with Holographic
    Visions on.
- **Portraits are earned:** a major character needs at least two lasting signals in the
  story, a supporting one at least four. Existing images always show
  (`lib/manifestationEligibility.ts`).

### World Cards

- Cards for creatures, places, factions, artifacts and fate events. Each shows a wide
  image, its type, the title and a quote.
- **Tap to Listen:**
  - While playing: "Channeling..." / "Resonating..."; tap again to stop. With no sound:
    "Echo Unavailable".
  - Sound cards play a matching sound: roar, howl, chant, chime and so on.
  - Voice cards speak the quote in a browser voice: lower for creatures, higher for
    female-sounding names.
  - When muted: "Audio is muted — unmute in immersion settings to hear this echo."
- **Looks wrong:**
  - "metallic ring" cards have no sound files, so they always say "Echo Unavailable".
  - A voice card stops all browser speech, which would cut off chapter narration, and it
    ignores Master Audio.

### System notices and their colour legend

- **System notices** are framed boxes with:
  - a title and a "✦ meaning ✦" line;
  - a rarity badge;
  - label/value rows and a line of text.
- **Frames** (System Notice Frame setting): Holographic Core, Ancient Scroll, Daoist
  Runic, Minimal Slate.
- **Warnings:** "death flag" notices get a skull and a pulsing red border; "iron fate"
  notices get a bouncing warning and an amber border.
- **Looks wrong:** structured notices look clickable (pointer, zoom on hover) but do
  nothing.
- **The legend, "Aetherial System Codes"** — "Color guide for story system notifications
  and events." It appears when a chapter has System notices. It has 16 kinds:
  - Gray:
    - Basic System Info / Unknown;
    - Other System Context.
  - Blue: New Info / Main Character.
  - Green: Stable Growth / Friend.
  - Gold:
    - Awakening / Mentor & Special Location;
    - Loot & Achievements / Legendary.
  - Orange:
    - Risk & Pressure / Great Item;
    - Karmic Consequence / Great Item.
  - Red: Combat Threat / Enemy.
  - Red-gold: Combat Artifact.
  - Gold-red: Combat Breakthrough.
  - Purple-gold: Heavenly Tribulation.
  - Dark rose: Permanent Curse / Tragedy.
  - Purple: Fate & Prophecy / Regular Location.
  - Pink: Karmic Affinity / Lover.
  - Red glitch: System Instability / System Error.
- **Colour-blind palettes**, chosen in the legend: Default, Protanopia (Red-Blind),
  Deuteranopia (Green-Blind), Tritanopia (Blue-Blind) and High Contrast Dark.
  - **Looks wrong:** the palettes recolour the legend's own swatches. The System boxes and
    name highlights use fixed colours, so they likely do not change.
- **Dismiss** hides the legend on this device; the System Color Legend switch brings it
  back.

## 5. Keeping your place

### Changing chapter, five ways (Duplicate)

- **Header chapter list** (desktop only): "Ch. N: {first 20 letters}...", with ⚠️ on
  chapters that have continuity faults. The "..." is added even to short titles.
- **Bottom bar:**
  - desktop: "Previous Chapter" | "Codex" | "Next Chapter";
  - phones: ← n/max →.
- **End of the chapter:** **Previous** and **Next**.
- **Swipe** left or right on the text.
- **Keys:** [ and ], or ← and →.
- **Looks wrong:** only Previous and Next scroll back to the top. The list, the keys and
  Codex jumps change chapter without scrolling.

### Bookmarks, "The Chronicle Anchors"

Scene: Bookmarks.

- **The drawer:**
  - It opens from the header bookmark button, which shows a count.
  - It is headed "The Chronicle Anchors" / "Spatial Memory Nodes", with **Close**.
  - Tapping outside closes it; Esc does not.
- **Each bookmark shows:**
  - "Ch. N • {title}...", and the date;
  - the passage, and its note under "Anchor Resonance:";
  - **Release** and **Venture (Jump)**.
  - Jumping opens the chapter, centres the paragraph and highlights it for three seconds.
- **Order:** bookmarks are listed as they were added, not by chapter.
- **When empty:** "No memory anchors exist in current alignment. Hover beside paragraphs
  to affix anchors, annotations, and memory marks."
- **Two designs in the text (Duplicate):**
  - **Structured chapters:**
    - an icon after each paragraph, "Bookmark this position";
    - a note box, "Add a contemplation or heavenly mechanic note here...", with Cancel /
      Save Bookmark; the note then shows as "Note: …";
    - removing is one click, and a saved note cannot be edited;
    - **Looks wrong:** the saved passage ends in "...", and the drawer adds another "...".
  - **Older plain-text chapters:**
    - a margin rail: "Affix Anchor" ("+"), or "Engraved Anchor - Edit Note";
    - "Resonance Note:", with "Release Anchor";
    - a one-line editor, "Engrave Aetherial Resonance", with "Press Enter to engrave" and
      Release / Cancel / Save.
- Translated chapters have no bookmarks.

### Reading position

- **Saved** two seconds after scrolling stops: the chapter, the paragraph and the place
  within it. This also updates "last read".
- **Restored** when the same chapter is opened again, after waiting for fonts to load.

### Welcome-back recap

Scene: Welcome-back recap.

- **When it shows:**
  - when the reader returns after more than 12 hours;
  - or, with no last-read time, when opening past chapter 2.
  - **Looks wrong:** the code comment says 24 hours (`ReaderScreen.tsx:321-330`).
- **What it shows:** "Previously on {title}", with summaries of the last three chapters.
  - Each summary is cut to three sentences, and they appear 1.5 seconds apart.
  - **Resume Reading** closes it.
  - **Looks wrong:** the code comment says five chapters (`RecapScreen.tsx:15-19`).
- It is checked once each time a story is opened, and it replaces the whole Reader while
  shown.

### Keyboard shortcuts

Where: `components/KeyboardShortcuts.tsx`. Scene: Keyboard shortcuts.

| Key | Does | Where |
|---|---|---|
| Esc | Closes, in order: shortcuts sheet → settings → Codex → fullscreen; otherwise leaves the Reader | Anywhere |
| ? | Shortcuts sheet, "Shortcuts Meridian" | Anywhere |
| H | Library home | Anywhere |
| C | Creation Portal | Anywhere |
| P | Profile | Anywhere |
| S | App settings | Anywhere |
| K | Codex | Anywhere |
| [ or ← | Previous chapter | Reader |
| ] or → | Next chapter | Reader |
| F | Fullscreen | Reader |
| G | Lore Glossary | Reader |
| I | Auto-scroll on or off | Reader |

- **Looks wrong:**
  - The sheet advertises Alt+letter, but bare letters work too. Pressing H, C or P while
    reading leaves the Reader.
  - Esc does not know about the chamber's own panels: bookmarks, Alter Fate, the
    Glossary, Immersion and the Continuity Guard. With one open, Esc leaves the Reader.
  - Arrow keys and letters also fire while a button has focus.
- Keys are ignored while typing in a field.

## 6. Directing the story

### Writing chapters

- **Manifest** writes an unwritten chapter. **Manifest Next 5 Chapters** writes a batch,
  and **Resume 5-Chapter Batch** continues a paused or failed one.
- At the end of a finished batch, the page says "Batch complete — choose the next fate."
- Nothing can be written while another chapter is being written.
- A signed-out reader gets a browser alert: "You must sync your spirit (sign in) to forge
  new chapters."

### Alter Fate (Branch)

Where: `components/AlterFatePanel.tsx`, `lib/alterFateLock.ts`. Scene: Alter Fate
(Branch).

- **The button:** "Alter Fate (Branch)" in the bottom bar; a lightning icon on phones.
- **The panel's title** follows the genre:
  - "Alter Fate" for xianxia (and for stories with no genre);
  - "Story Steering" for plain stories (and any unrecognised genre);
  - "Quest Direction" for LitRPG;
  - "Omen Path" for dark fantasy;
  - its own titles for modern romance and military.
- **Subtitle:** "Branch reality from Chapter N. The Karma, Codex, and all future chapters
  will respect this divergence."
- **Templates:** "Alter the next scene", "Choose a path direction" and "Interrupt a
  trope". Each fills in one example instruction.
- **The instruction** is labelled by genre ("Divine Command" in xianxia), with the
  placeholder "Declare the new destiny parameter…".
- **The footer** reads "This creates a new linked copy in your library, preserving the
  original timeline." The button is **"Sundert The Timeline"**, a typo for Sunder.
- **Locked during a five-chapter batch:** "Fate may be altered after Chapter {n}."
  - **Looks wrong:** after a batch finishes, every chapter except the batch's last stays
    locked, earlier ones included, until another batch replaces it
    (`lib/alterFateLock.ts:7-27`).
- **Fixed value:** the bottom-bar button always says "Alter Fate (Branch)", whatever the
  genre's own wording.
- **Looks wrong:** the close button's screen-reader label is a raw key,
  "close_alter_fate_panel".
- In the Workshop, a notice describes the fork instead of making the copy.

### Steering the next arc

Where: `components/StorySteeringModal.tsx`. Scene: Steer the next arc.

- **The banner:** when the last arc's chapters are all written, "All chapters of this arc
  generated! Steer next segment." appears with **Steer Story Fate**. It shows under every
  chapter, not only the last.
- **The steering page** replaces the chamber. It shows:
  - "Shatter Boundary";
  - a title by genre: "The Great Steering Chamber" for xianxia, "Quest Director Panel"
    for LitRPG, and so on;
  - a promise of "the next 10 chapters".
- **Four AI-suggested directions:**
  - **Seek Alternate Fates** refreshes them.
  - Each carries a badge: Demonic Path (darker), Jade Companions (romance), Sect Warfare
    (action), Cosmic Shift (twist), Realm Ascension (a new place) or Alchemy Hermitage
    (continue).
  - **Fixed value:** the badge names are xianxia whatever the genre.
- **Choosing a direction** loads it into the instruction: "Destiny trace loaded - Edit
  freely below".
- **If suggestions fail:** "The consciousness link flickered. Cosmic presets remain
  accessible." with **Reconnect to Divine Stream**.
  - **Unfinished:** no presets are actually shown.
- **The footer:** "Genesis results in exactly 10 new chapters…", then **Unveil Next
  Chapters**.
- **Looks wrong:** suggestions reload whenever the story changes, for example at the
  five-minute reading-time save, which can clear the reader's pick.
- **Sign-in:** a signed-out reader is asked to sign in before steering (§10).

### Sealing a chapter: the Continuity Guard

Scene: Seal a chapter.

- **Seal Chapter (Publish)** ("Publish" on phones) appears on any written, unsealed
  chapter. While checking, it says "Guarding Continuity...".
- **The check:**
  - If it finds problems, "Continuity Guard Warning" opens: "The Heavenly Dao sensors
    have detected potential logic fractures… alter fate or manually edit before sealing."
    It lists the problems, with **Cancel** and **Seal Anyway**.
  - With no problems, or if the check itself fails, the chapter seals straight away.
- **A sealed chapter** shows a lock, "Published & Sealed". There is no unseal.
- **Unfinished:** "manually edit": the Reader has no editor.

### Continuity: four separate ideas (Duplicate)

- **The Continuity Guard**, at sealing (above).
- **Timeline Divergence**, for hard contradictions:
  - a pulsing badge in the chapter header;
  - a note at the top of the chapter that says it is still fully readable;
  - **Regenerate Chapter**.

  Scene: Chapter 4.
- **Continuity Note**, for soft notes: "Just for your awareness — nothing is broken and
  nothing needs fixing…" Scene: Chapter 3.
- **Continuity Alerts**, inside the Codex, with Resolve and Clear Alerts (§8).
- **Unfinished:** each chapter's "contract report" (did it meet its goal, the evidence,
  did the opening match) is documented as shown beside the continuity notes. Nothing
  shows it (`types.ts:743-749`).

### Fate Survival

Where: `components/ReaderFateAlerts.tsx`, `components/FateSurvivalExplanation.tsx`,
`components/FateResultCard.tsx`. Scene: Fate Survival story.

- **The Fate Survival panel** shows only when the genre is exactly "Fate Survival":
  - "Fate Survival Mode Active", with **"DOOM DEADLINE: CHAPTER 7"**;
  - the target profile;
  - "Remaining Steps: {7 − chapter} Chapters";
  - "Critical Apex" or "Fate Approaching".
  - **Fixed value:** chapter 7 for every story.
- **Inspect Fate Codex** opens the genre explainer:
  - "Read the story. Survive the world.";
  - ten kinds of doom: Death, Love, Kingdom, Villain, Betrayal, Poverty, War,
    Regression, Reputation and World;
  - a SEIHOUSE PRODUCTIONS credit.
- **Hardcore Fate:** "Hardcore Fate Mode Engaged" and "HIGH DANGER".
- **Fate Result cards** read "FATE AVERTED", "FATE SCARRED" or "DOOM MANIFESTED". They
  show:
  - the timeline scar;
  - the permanent cost or restrictions;
  - the new story state and any genre shift;
  - new stats.
- **Unfinished:** the story's fate pressure (Relaxed, Balanced, Hardcore, Dao Master) is
  never shown (`types.ts:1197`).

### Other story actions

- **Regenerate Chapter**, from the Timeline Divergence note.
- **Export Chronicle → Download** (Immersion popover): a text file with the chapter
  header, summary, System alerts and the cleaned text.

## 7. Translation and the Lore Glossary

Where: `hooks/useChapterTranslation.ts`, `components/GlossarySidePanel.tsx`. Scene: Lore
Glossary.

- **Automatic translation.** The Reader translates into the language on the reader's
  profile. It knows 17 languages:
  - Spanish, French, German, Italian;
  - Chinese (Simplified and Traditional), Japanese, Korean;
  - Portuguese (Brazil), Russian, Vietnamese, Indonesian;
  - Thai, Tagalog, Malay, Arabic, Hindi.

  Saved translations are reused.
- **Unfinished:**
  - There is no language switch inside the Reader.
  - If translation fails, the Reader silently stays in English.
- **Looks wrong:** while a chapter is being written, it may ask for a fresh translation on
  every streamed update.
- **What is lost:** translated chapters have no bookmarks, reveal cards, World Cards or
  structured System boxes (§1).
- **The Lore Glossary drawer** opens from the top bar or with G:
  - **Translation Target:** 15 languages, starting at Chinese (Simplified).
  - The terms for that language, each with a delete button.
  - Add a term: "Original word (e.g. Courting death)" → "Translation". These pairs are
    forced into translations.
  - **Looks wrong:** Italian and Arabic are missing, though the Reader translates into
    both.
  - **Duplicate:** the Codex has a "Lore" tab that means something else, a dictionary of
    world terms (§8).
- In the Workshop, translation gives production's "service unavailable" answer.

## 8. The Codex

Where: `components/CodexSheetOverlay.tsx`, `components/ReaderCodex.tsx`,
`components/codex/*`. Scene: Codex sheet.

- **Opening it** (Duplicate): from the top bar, the bottom bar or K.
- **Shape:** a bottom sheet with a drag handle on phones, a centred window on desktop,
  headed "← {title} - Reader Codex". The backdrop, the arrow, Esc or K closes it.
- **Sidebar:** "Divine Registry" / "The Living Codex", with six tabs: **Portraits**,
  **Karma**, **Power Rankings**, **Artifacts**, **Fate** and **Lore**.
- **Deep Memory** shows dormant and archived entries, with a count.
  - **Unfinished:** it is hidden on phones.
- **Fixed value:** a "Dimensional Node" box always reads "Linked to Han Feng's physical
  location…", whatever the story (`ReaderCodex.tsx:423-433`).
- **Continuity Alerts (N)**, with **Resolve** and **Clear Alerts** (Duplicate, §6).
- **Deleting** an artifact, faction or custom bond:
  - "Delete {type}?" asks the reader to type DELETE, then **Sever Karma**.
  - **Looks wrong:** an **Auto-Fill** button types DELETE for you.
  - **Unfinished:** places and karma nodes have delete code but no button, and
    characters cannot be deleted.

### Portraits tab

- **"Aetherial Chronicle Collage":** every image as a tilted photo.
  - Filters: All Memories, Scene Cruxes, Aura Portraits.
  - Opening a photo shows its summary, the prompt that made it, **Revisit Chapter N**
    and a download.
  - **Fixed value:** captions such as "Immortal cultivator" and "Sacred Beast".
  - **Looks wrong:** the empty state points to "Characters & Locations tabs" that do not
    exist.
- **Characters and places**, shown as "Illustrated Cards" or "Detailed Lists".
- **Character cards:**
  - **Image:** a portrait, or "AURA UNMANIFESTED". Hovering shows earlier versions to
    switch back to.
  - **Badges:** relevance; alive, deceased or unknown; Unlocked or Locked, depending on
    whether the character has appeared yet.
  - **"Pwr:"** — **Looks wrong:** it is worked out from the character's ID, not their
    power level, so the number means nothing
    (`codex/ReaderCodexCharacters.tsx:113`).
  - **Details:** cultivation, affiliation, "Relation to MC:".
  - **Signature quote** with **Play Voice** / **Generate Voice**. These are AI voices;
    they ignore Master Audio and fail silently.
  - **Portrait actions:** **Awaken Portrait**, **Awaken Evolution**, and **Get** to
    download.
  - **Refine** opens the edit card.
- **The edit card:**
  - status, power level, affiliation, description and quote;
  - **Generation Context:** pin, aliases and known titles, context priority, and an
    author note of up to 1,000 characters;
  - a warning when an alias already belongs to someone else;
  - **Known Abilities**, each with:
    - a name and description;
    - its source, cost and limits;
    - the chapter it was acquired, its mastery and the chapter it was last used;
    - its canon status: Confirmed, Rumored, Forbidden or Lost.
  - **Abort** / **Save**.
- **Place cards, "World Geolocation Vistas":**
  - a safety badge, the realm, and "Known since Ch.N" or "Lore only";
  - context settings and a portrait.
  - **Looks wrong:** the eye button selects a place that nothing then shows.
  - **Unfinished:** an add-a-place form that nothing opens.
- **Factions, "Sect alliances & Hierarchies":**
  - an image with versions;
  - alignment, headquarters and status;
  - **Dismantle**;
  - members grouped into leader, elders and disciples by the words in their roles.
  - **Unfinished:** an add-a-faction form that nothing opens, with the label typo
    "Status Status".
- **"Visual Story Recaps":** every written chapter by arc, with **Read Scene Text** to
  jump there.

### Karma tab

- **Relationship map** ("Karma Web" in xianxia):
  - The main character sits in the centre.
  - Lines are blue for allied, red for hostile, gold for mentor and gray for neutral.
    The dead get a slash.
  - Tapping someone opens "Resonance Details".
  - **Unfinished:** "Fit View" and "Interactive Map" look like controls but are labels.
- **Custom bonds** ("Karma Bond"):
  - pick two characters;
  - set an **Affinity Score** from −100, "Deadly Enemy", to +100, "Eternal Mirror";
  - describe the bond, then **Bind Thread**;
  - a ledger lists bonds, with remove.
  - **Unfinished:** custom bonds never appear on the map.
- **"Karmic Threads & Plot Lines"** is read only: unresolved mysteries, each with the
  chapter that planted it, and severed karma struck through.

### Power Rankings tab

- The main character's rank out of 100.
  - **Fixed value:** "Min Stage: Mortal … Max Stage: Sovereign".
- Other characters are ranked by the words in their power level.
- Cultivation rules, "Universal Laws of Void", and an **Ability Ledger**.
- **Unfinished:** "Sort" and a grid icon are labels, not controls.
- **"Cultivation Analytics":**
  - an affinity line over time for each character, made up from keywords, not real data;
  - a breakthrough staircase with fixed steps: "Nascent (85)", "Core (70)", "Found.
    (55)", "Qi (35)", "Mortal";
  - karma counters.
  - **Fixed value:** "Master Gu".
  - **Looks wrong:** the empty text shows literal `**` marks.

### Artifacts tab

- **Forge Artifact** opens a form:
  - a description;
  - a tier: Mortal, Earth, Heaven or Primordial rank;
  - a bearer, with the placeholder "e.g. Han Feng or Elder Qin" (**Fixed value**);
  - **Abort** / **Forge Relic**.
- **Cards by tier:** Primordial gold foil, Heaven cyan with a pulse, Earth emerald,
  others gray. Each shows the bearer, its evolution, context settings, **Shatter**
  (delete) and **Generate Aura**.

### Fate tab

- **Four forms that add to the Codex:**
  - **Manifest Sovereign:** a character with a destined role;
  - **Formulate Domain:** a place with a safety level;
  - **Establish Sect:** a faction with an alignment;
  - **Alter Dao Rules:** a world rule.

  There is no confirmation; the form just clears.
- **Looks wrong:** the choices do not match what the rest of the Codex reads:
  - new characters always show gray;
  - "Spiritual Beast" is not treated as a beast;
  - "Deadly" and "Unknown" places get the red pulse;
  - new factions get no alignment colour.
- **Duplicate:** the place and faction forms repeat the hidden ones on the Portraits tab.

### Lore tab

- **Channel Story Lore** asks the AI for this story's terms and adds them. The list is
  searchable.
- It always includes seven fixed xianxia terms: Qi, Dantian, Heavenly Tribulation, Jade
  Slip, Kowtow, Dao and Spiritual Meridians.
- **Fixed value:** the request always names the genre "Sovereign Cultivation path", and
  sends the first arc's title as the story title.
- **Looks wrong:** results are saved on the device under the main character's name, so
  two stories with the same hero share terms. Terms cannot be deleted.

### Portrait evolution

- **Awaken** makes portrait options in the story's art style, using the reader's
  allowance.
- It opens "Evolution Preview":
  - Form I, II or III;
  - **Seal Form into Codex** or "Discard Traces".
- Earlier versions can be restored.
- **Hub stories** are locked for free readers: "Ascend to the Inner Sect to customize hub
  story visual representations!"

### Generation Context window

- Opened from the gear icons: aliases, priority, pin and author note, then **Save
  Context**.
- **Looks wrong:** Esc closes both this window and the Codex.

## 9. Progress and rewards

- **Mark read:** the header check, "Mark Chapter as Finished & Read" / "Mark Chapter as
  Unread". It turns gold when read.
- **Word counts:** "Chapter:" and "Total:" in the top bar.
  - Both carry the tooltip "Total Story Words".
  - **Fixed value:** any written chapter not yet loaded counts as 2,200 words, so Total is
    an estimate (`ReaderScreen.tsx:283-284`).
- **Clock:** the local time ("Time:"), hidden on smaller screens.
- **Arc progress line:** chapters in the current arc out of 100, with marks every 10%.
  - **Fixed value:** the 100.
  - **Looks wrong:** steering promises 10 chapters at a time, so the line sits near 10%;
    and it counts chapters that exist, not chapters read (`ReaderScreen.tsx:497-518`).
- **Reading time:**
  - counted every second while the page is visible;
  - per story and per arc;
  - saved every five minutes.
  - **Unused:** it is never shown.
  - **Looks wrong:** up to five minutes are lost when the reader leaves.
- **Qi:** opening an unread, written chapter earns 2 Qi, up to 20 times a day.
  - **Looks wrong:** it re-awards every time the story updates (each saved reading
    position, for example) until the day's cap (`ReaderScreen.tsx:313-319`).
- **Relics:** relic pop-ups are held back while narration plays.
  - **Looks wrong:** a rule meant to allow them only near the start or end of a chapter
    listens to the wrong scroller and never runs (`ReaderChamber.tsx:245-273`).
  - The relic pop-up itself lives outside the Reader.
- **"Memory of this event":** the image of a chapter's key moment, at the chapter's end.
  - It appears on at most three chapters per arc, the most important ones by a score:
    - the arc finale;
    - power shifts and danger;
    - mysticism;
    - beast events;
    - System prompts.
  - It is made automatically when scrolled to, without using the reader's allowance.
  - While working: "Distilling Visual Memory...".

## 10. Behind the scenes

- **Context Inspector:** a folding panel under every chapter that has a record of what
  the writer was given. It shows:
  - the engine version and token counts;
  - each section's share;
  - what was included, demoted or dropped, and why.

  It is a developer tool, shown to every reader.
- **Sign-in gate**, for signed-out readers outside local mode:
  - Steering asks for sign-in: "You must sync your spirit (sign in) to forge new
    destinies and steer the narrative."
  - Chapters above 10 ask for sign-in: "You have reached the limit of anonymous reading
    (10 chapters)…"
  - The button is **Sync Spirit (Sign In)**.
  - **Fixed value:** the limit is 10 and goes by chapter number, not by how many chapters
    were read.
  - The Workshop runs in production's local mode, so this gate never appears there.
- **Immersion popover header:** "Immersion Control Matrix", "v2.1" (**Fixed value**).
- **Unused code in the chamber:**
  - a filtered chapter list (all, unlocked, locked);
  - switches for an Immersion popover and a voice-detail panel;
  - a reader-mode setter;
  - the narration stop handler (`ReaderChamber.tsx:100-114`, `:203`, `:439-440`,
    `:827-835`).

## Ideas that look worth keeping

Judged from the code. Try each in the Scenes before deciding.

- **The text settings.** Line height, paragraph gap, letter and word spacing, reading
  width and alignment have sensible ranges and one reset.
- **One-tap silence.** Master Audio mutes everything and keeps every level for when sound
  comes back.
- **An effect budget.** At most three special moments per chapter, one per third, 20
  seconds apart. This keeps the Reader from becoming noisy.
- **Hand control back, then resume.** Auto-scroll yields the moment the reader scrolls,
  and **Resume Reading** returns to the voice.
- **Respect for reduced motion** in auto-scroll and the vignette.
- **Earned portraits.** Characters get a portrait offer only once the story has built
  them up.
- **A colour language** for System notices and names, explained by an in-chapter legend.
- **Reading position kept to the place within a paragraph**, restored after fonts load.
- **Three narration voices**, with dialogue voiced by who is speaking.

## Patterns to resolve in the redesign

- **One page, many owners.** Four layers each draw part of the screen and each keep
  their own state. The redesign can give the Reader one owner for what the reader sees.
- **Settings in four kinds of memory.** The same reader's choices are kept in four
  different ways (see "Where settings live"). One place, kept one way, would let a
  reader trust that their choices stay.
- **The same job in several places.** Chapter navigation (five), the Codex (three),
  continuity (four), bookmarks (three designs), master volume (two), and "Lore" (two
  meanings).
- **Effects that decide for themselves.** The red glow, the shake, reveal timing, music
  escalation and the chapter image each use their own rule: keywords, scores or
  metadata. The redesign can let the story say what a moment is, once, and let every
  effect read that.
- **One genre built in.** Xianxia names, terms and captions appear in every story.
- **Built or promised, but out of reach.** Several features exist in the code, or are
  promised by it, but nothing reaches them:
  - a stop control (the stop handler exists; nothing calls it);
  - a fullscreen control (promised in a comment);
  - an atmosphere picker (the sound engine accepts a choice);
  - two Codex add forms, and delete for places and karma nodes;
  - the contract report;
  - the reading-time totals.
