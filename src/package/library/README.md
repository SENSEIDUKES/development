# `@seihouse/library`

**Unreleased (2026-10-29):** Reader blue's colors for what sits on its glass
(control faces, ink, hover and press washes, focus, settings fields) are named
`--reader-glass-*` custom properties on `:root` in `reader-glass.css`, beside the
existing glass recipe, which stays literal for Palette & Materials. Values are unchanged.

**0.35.0 (2026-10-26):** Presentation exports 12 individually named reusable icons
and includes them in the 54-icon catalog. Requires SEN 0.40.0 for the shared artwork.

**Unreleased (2026-10-16):** `./familiar` exports `FamiliarHelperProvider`,
`FamiliarHelperAction`, `useFamiliarHelperContext`, the screen action/context and
replaceable voice contracts, and `FamiliarHelperController`. Hosts opt in once
at the app root; mounted screens supply actions. `./stories` registers the Reader's
existing Fate choices when that provider is present. Saving stays with SEN's
existing controller. No speech provider is bundled into Library.

**0.34.0 (2026-10-13):** Right-to-left scripts in the Reader's fonts. `./stories`:
`LIBRARY_READER_FONTS` names Noto Naskh Arabic and Noto Serif Hebrew beside each serif and title
font, and Noto Sans Arabic and Noto Sans Hebrew beside each sans (Rubik keeps its own). The host
loads those faces; SEIHouse's theme does, from Google Fonts, each downloading only for text in
its script.

**0.33.0 (2026-10-12):** Atmospheres are a Media Loadout slot, beside Soundscapes and Sound
Cues (SENSEI: they are made in the Library's studios like the others). `./media`: a third pack
type, `AtmospherePack` (`type: 'atmosphere'`, looping beds each with a word, a name, an
optional group, a playable file and an optional measured loudness); `StoryMediaLoadoutSlot`
and `StoryMediaLoadout` gain `atmospheres`; `MEDIA_SLOT_PACK_TYPES` and `MEDIA_LOADOUT_SLOTS`
name each slot's pack type. An equipped Atmosphere pack is the story's whole set of
atmospheres: `createAuthorizedMediaCatalog` and `createLibraryMediaPort` freeze its beds in
place of the base's. `./stories`: the Media Loadout shows three slots (`3/3 equipped`), and
`useLibraryStories`'s `mediaDefaults` names "The Library's own Atmospheres". Requires
`@seihouse/sen` 0.33.0.

**0.32.0 (2026-10-11):** Sound Words in Story Settings. `./stories`: `SoundWordsPanel`
(exported) is the story's own sound words in `StorySettings`, `CreateStorySettings` and the
HARNESS developer page: a preset fills the list, the reader adds, changes and removes words
(at most 30, a count beside them), a word no recording plays is marked, and an empty list
plays no Sound Cues. `useLibraryStories` takes the host's `soundWordPresets` (the first is a
new story's) and `importSoundWords` (a Sound Words `.spp` installer); `StorySettingsDraft`
gains `soundWords` and `createSoundWords(draft, presets)` gives the words a new story
starts with. The Media Loadout no longer lists the story's words: its pack cards say which
sounds a pack plays. Readers install their own: `useLibraryStories` takes `skillIntake` and
`installSkill` (each hand-equipped CAPA slot in Story Settings and Create gets an SPP upload,
`SkillPackageImport`, moved here from the Workshop, over the host's `SkillPackageIntake`) and
`importMediaPack` (the Media Loadout's **Import .spp**, which equips the pack in its slot). A
slot with no pack shows the Library's own media as equipped (`mediaDefaults`), and the
Soundscapes slot no longer says new chapters ignore it.

**0.31.0 (2026-10-10):** The Familiar in the Reader. `./stories`: `StoryPages` puts the host's
header accessory (the Familiar's recall, from `WorkspaceHeaderAccessoryProvider`) in the Reader's
top bar beside Reader Settings. `./shell`: `useWorkspaceHeaderAccessory` reads that accessory, for a page that
draws its own bar. Requires `@seihouse/sen` 0.29.

**0.30.0 (2026-10-10):** The SEIHouse fonts in the Reader. `./stories`: `StoryPages` gives the
Reader `LIBRARY_READER_FONTS` (exported): SEIHouse Sans (the default) and Noto Serif for chapter
text, and SEIHouse Display Ink (the default), Soft, Edge and Wide, and Alegreya for titles. The host
loads the faces: `@seihouse/seireader/sans.css` and `@seihouse/living-titles/fonts.css`, from
SEIHouse/FONT-LAB (Development's `src/host/styles/theme.css`); without them each stack falls back to
the theme's fonts. Requires `@seihouse/sen` 0.28.

**0.29.0 (2026-10-09):** World Info's four cards: Codex, Portal, Information, Settings.
`./home`: `StoryDetailDisplay` gains `originalLanguage`, `readingLanguages`, `matureContent`,
`permissions` (`WorldPermissions`: visibility, branching, blueprint), `provenanceUrl`, `updatedAt`
and `authorNotes`. `./world-card`: the format mark leaves the Info cover and marks the
**Information** card (`WorldCardInformationPanel`): format, creator, activity, views, Began and
Last updated, SEN verification, language, rating, permissions, a provenance link when the host
has one, and Author's notes. `WorldCardInfo` (and `StoryDetailScreen`) take `portal`
(`{ expansions }`: the world's connected media, `WorldExpressions`, below the cards) and
`settings` (the host's story settings in the **Settings** card, after Read it in when
`readingLanguage` is given; `WorldCardSettings`). `./stories`: `StoryPages` gives every story its
Portal (the novel alone until adaptations exist) and puts `StorySettings`, which gains
**Author's notes**, in the Settings card. New exports `WorldCardInformationPanel`,
`WorldCardSettings`, `languageName`, `worldInformationSummary`. Needs `@seihouse/sen` 0.27.0.

**0.28.0 (2026-10-09):** Covers are made on the cover. `./stories`: `StoryCoverService`
replaces `manifest(storyId, request)` with `make(storyId, request, count)` (one cover or
three, `STORY_COVER_CHOICES`), `keep(storyId, madeUrl)` and `letGo(madeUrls)` (breaking for a
host's cover service). World Info's empty cover says Manifest and offers one cover or three to
choose from, each at an image's Energy; three open a picker. `./world-card`: `WorldCardInfo`
(and `StoryDetailScreen`) take `coverAction`, the host's controls laid over the cover.

**0.27.0 (2026-10-08):** The profile picture, images at 5 Energy, Nano Banana 2 Lite.
`./profile`: the portrait builder is **Profile picture**: a photo of the reader, three
portraits to choose from (each with a download button), "Use this portrait" or "Make three
more". The controller gives `generatedPortraitUrls`, `chosenPortrait` and `setChosenPortrait`
in place of `generatedPortraitUrl`, `generationStep`, `portraitDesc` and `setPortraitDesc`
(breaking for a host's controller). `./energy`: images cost 5 Energy (projected), and
`EnergySpendFloater` shows Energy leaving as "−5" floaters. `./stories`: Story View's cover
shows its cost, floaters and a download button. `./model-router-server`: an image request
may carry `referenceImages` (a photo the model works from), and `DEFAULT_IMAGE_MODEL` is
Nano Banana 2 Lite (`google/gemini-3.1-flash-lite-image`). Every Energy number wears the
Energy badge (balances and costs alike); `EnergyCostMeter` shows an action's price and its
"−price" as results arrive, beside Write Chapter in the Reader (`./stories`) and Manifest in
Story Seed.

**0.26.0 (2026-10-08):** Story Settings and cover art for a host's stories. `./stories`:
World Info (`StoryPages`) has the story's **Story Settings**, closed until opened: its
language, Reading Mode, CAPA skill slots and Media Loadout (`StorySettings`), the same
panels the HARNESS developer page shows (which adds its inspection). A change applies to
chapters written from then on and waits while one is being written. `CreateStorySettings`
shows the skills and media a story will start with in Story Seed's Settings
(`CreationModal`'s `renderStorySettings`), as a draft the host keeps
(`useStorySettingsDraft`, `applyStorySettingsDraft`) until Manifest. `StoryPages` takes
`covers` (`StoryCoverService`): World Info and Home wear the story's cover, and Manifest
cover makes one from the story's own words (`storyCoverRequest`) behind the media reveal.
`useLibraryStories` also returns the skills and Media Packs Story Settings offers.
`./model-router-server`: image generation (`ImageGenerationRequest`, Gemini and OpenRouter),
`DEFAULT_IMAGE_MODEL` (Nano Banana 2) and `imageModelProvider`. Requires `@seihouse/sen` 0.25.0.

**0.25.0 (2026-10-07):** what a host needs to bring the Cave and the Familiar into its
own app. `./shell`: `LibraryDestinationsProvider` gives every Library navigation beneath
it the host's places, the ones a Library page draws itself included (the Cave's); a
navigation's own `destinations` still wins. `useLibraryBottomClearance` says how much of
the screen's bottom the Library's bottom bar and the sound control floating above it
cover (0 with no bar, as on laptops), so a host keeps its own floating pieces, such as
the Familiar, above them. `./profile`: `LibraryProfile` takes `homeHref` for its header
logo (`/` when omitted), and the services port takes `notYetBuilt` (`note`, `features`):
the account and server pieces a host has not built yet (portrait generation, Keyboard
Shortcuts, code redemption, Sever Link, Harmony sync, backup and import, the Aether
Router, the Inbox) still show, disabled, each with the host's note
(`notYetBuiltNote`). Omitted, everything is the controller's, as before. NovelExpanded
uses all of it. Requires `@seihouse/sen` 0.24.2, as before.

**0.24.0 (2026-10-07):** the shell takes a host's own places. `LibraryNavigation` takes
`destinations`: the strip and the Pathways sidebar show only those, in the Library's
order, and Settings shows only beside Profile (all four, as before, when omitted).
`WorkspaceHeaderSoundProvider` gives every Library header beneath it the host's sound
control, Story Seed's included; a header's own `sound` wins. While a Library bottom bar
is on screen (phones and tablets) a header's sound control floats just above the bar's
right end instead of sitting in the header, as the Reader's note floats above its Listen
bar (`useLibraryBottomBar`, `useLibrarySoundSlot`). `useStoredLibrarySidebarMode`
keeps the Pathways sidebar's open or minimized choice in the host's device preferences
(`LIBRARY_SIDEBAR_MODE_KEY`, `readLibrarySidebarMode`). `useLibraryLegalDocuments` gives a
host the footer's draft Terms, Privacy and Cookies in their sheet; `MainLibraryFooter`
uses it, unchanged. `./stories`' `StoryPages` takes `frame`, the host's browsing frame
around World Info (the Reader is never framed). NovelExpanded uses all of it. Requires
`@seihouse/sen` 0.24.2, as before.

**0.23.1 (2026-10-06):** adopts universal UI 0.11.0, Library UI 0.10.0 and SEN
0.24.2. The desktop Pathways sidebar uses the UI package's two-way double tap/click
instead of a star, with a keyboard-focus-only width control. Its scrollbar appears
only during scrolling/dragging and its frame has a gold-and-cyan bevel. The host's
remembered `pinned`/`compact` preference and mobile navigation are preserved.
Hosts using the currently locked audio-player 4.0.0 build also need the scoped
UI peer override documented in [private UI artifacts](../../../vendor/README.md).

**0.23.0 (2026-10-07):** The Generation Overlay shows the host's equipped Familiar
with matching elemental colors and stays in its neutral pose until touched or
hovered. One supplied wave plays per interaction, then returns to neutral; holding
hover does not loop. Keyboard activation also greets. Both full and compact modes
use this behavior; successful arrival holds the review pose. The aura is softer,
the hero no longer bobs, and its underline stays decorative and inactive. Reduced
motion, visibility and pause stop playback. `FamiliarSprite.playOnce` is an optional
request counter; omitted, existing continuous playback is unchanged.

Pass `loadingFamiliar` to `LibraryPresentationProvider`, built with
`loadingFamiliarPresentation`; `./manifestations` also exports
`LoadingFamiliarProvider` for a host's existing profile session. Selection remains
host-owned, with no equipment store or write. `./familiar` exports shared
`familiarElement`, `FAMILIAR_ELEMENT_AFFINITY` and `familiarElementColors`; form
glows keep their colors, including the new Frostforged Golem's Frost affinity.

The canonical `./manifestations` names are `GenerationOverlay`, `StatusMessage`,
`ProgressIndicator`, `AmbientEffects`, `ProgressLabel` and
`CompactGenerationOverlay`. Active callers and Workshop labels use them. Prior
published names remain compatibility exports of the same components. See
[the naming map](../../components/chapter-manifestation/README.md#canonical-names).
SEN stays at 0.24.0, and the existing `>=0.24.0` peer range is preserved. The newer
music and chapter-writing behavior is unchanged.

**0.22.0 (2026-10-07):** requires `@seihouse/sen` 0.24.0 and names `@seihouse/audio-player`
`^4.0.0` as a peer. `./shell` adds `HeaderSoundControl` (the reader mixer's music note for
`WorkspaceHeader`'s new `sound` slot: a tap mutes, a held finger opens a Music
volume slider; since 2026-10-12 it is the Reader's own note and opens its Master volume) and the reader's Menu music setting (`useMenuMusic`, `readMenuMusic`,
`writeMenuMusic`, `MENU_MUSIC_KEY`). `./profile`'s services port takes optional
`soundPreferences`, which shows Settings › Sound and its Menu music switch.
`StoryPages` takes optional `soundscapes`, the Reader's music before a story has a chapter.

**0.21.0 (2026-10-06):** requires `@seihouse/sen` 0.23.0. `useLibraryStories`'s
`generateNextChapter` finishes a chapter a closed browser interrupted before writing a
new one (`writeNextChapter`). The Library media port freezes the host's atmospheres
with every attempt (`baseMedia.atmospheres`), so the writer can choose one. The Model
Router sends `low` reasoning by default to every model that offers it (Gemini 3.8, 3.7
and 3.5 Flash, Gemini 3.1 Pro Preview, GPT-6 Luna and Luna Pro, Gemini 3.8 Flash on
OpenRouter); a reader's own choice still wins. The Harness Generation page shows the
Soundtrack slot. `LIBRARY_PACKAGE_VERSION` reads 0.21.0 (it had stayed at 0.19.0).

**0.19.1 (2026-10-06):** The generation veil's traveler advances during whole-response
generation and arrives before the veil closes on success. Unknown work shows no
invented percentage. Failure/cancellation never signals arrival. Chapter saving,
Reader behavior and SEN's public contracts are unchanged.
The Model Router also omits deprecated custom sampling for Gemini, directly
and through OpenRouter, and checks thinking levels against the model catalog.
Gemini uses model-default sampling; other providers keep their settings.

Celestial Library's client-safe product behavior, assembled on the portable
SEN engine and the two UI packages. Library owns SEIHouse users, products,
economy, community and business policy. Authentication enforcement, secrets,
durable ledgers and concrete infrastructure stay in the host/backend.

**0.20.0:** includes 0.19.1 above; requires `@seihouse/sen` 0.22.0. `useLibraryStories` returns
`rewriteLatestChapter(storyId, note?)`, written with the current model, and takes
`holdingsFixer` (how far SEN's Holdings fixer goes; the Familiar's control point);
`StoryPages` gives the Reader its Rewrite this chapter. The server Model Router entry
adds `lowestReasoningLevel`, which the Holdings fixer's call uses.

**0.19.0:** requires `@seihouse/sen` 0.19.0 (the Reader's sound is the
SEIHouse audio player's reader mixer; the host supplies `ReaderMixerProvider`).

**0.18.1:** `WorkspaceSheet` takes `aboveVeil`, opening it over the
full-screen writing veil for a question the writing waits on (the app's
access token sheet, when a chapter reaches the visitor limit).

**0.18.0:** requires `@seihouse/sen` 0.18.0 (a story runs 10 to 40 arcs).
`CreationModal` opens the Blueprint review, with the reason, for a banked
story whose only problem is a length saved before that range, where the length
is fixed without a model call; an older Blueprint planned as one arc, whose
Arc 1 is the whole story, is regenerated there instead.

**0.17.1:** chapter models that think too long finish again. GLM 5.3 Flash,
Qwen 3.8 Flash and DeepSeek V4.1 Flash thought past the 170-second chapter
deadline on their own defaults, so the Router now sends each a level that
finishes (`ModelReasoning.sendDefault`: GLM low, Qwen and DeepSeek none)
unless the reader chooses another. GLM is also routed to its fastest OpenRouter
provider (`RoutedModel.fastestProvider`): of its 35 providers, OpenRouter
favoured the cheapest, which were too slow. The OpenRouter adapter reports a reply still
being written at the deadline as a timeout, and an empty reply with its finish
reason, provider and token counts, instead of 'returned an empty response'.

**0.17.0:** requires `@seihouse/sen` 0.17.0 (the writer tags sounds where
they happen, in one strict shape for every tag kind; Sound Cues fit 1–8
words). No Library API changed.

**0.16.0:** requires `@seihouse/sen` 0.16.0 (failed writes are never saved;
the story's point of view is kept; titles without a chapter label; equipping
records a thing as held).

**0.15.0:** requires `@seihouse/sen` 0.15.0. `LIBRARY_READ_ALOUD_VOICES` is
production's cast: Daniel or Google US English narrates, Rishi or the device's
next voice is the Protagonist, and a female voice by production's names is the
Side voice; on Windows that is Microsoft David (or Mark) and Zira.

**0.14.0:** requires `@seihouse/sen` 0.14.0 (arcs of 30 chapters). The Story
Seed's Story Length and the Blueprint count 30 chapters an arc.

**0.13.1:** `StoryPages`' World Info page has Export story: the whole story
as one file (`exportHarnessStory`), for sharing a test.
`HarnessGenerationWorkspace`'s export saves the same file.

**0.13.0:** requires `@seihouse/sen` 0.13.0. `HarnessGenerationWorkspace`'s
slot inspection shows the Holdings slot beside Speakers, and the Reader it
opens has the Holdings page.

**0.12.0:** requires `@seihouse/sen` 0.12.0. `./stories` adds
`LIBRARY_READ_ALOUD_VOICES`, SEIHouse's narration voices: Daniel narrates and
Rishi voices the protagonist on Apple devices, with a female side voice, and
the closest equivalents on Edge, Windows and Chrome. `StoryPages` takes
`readerPreferences` (the host's device storage) and hands both to the Reader.
`HarnessGenerationWorkspace` passes `readerPreferences` through, and its slot
inspection shows the Speakers slot.

**0.11.0:** requires `@seihouse/sen` 0.11.0. `useLibraryStories` gains
`planArc`, and `StoryPages` hands it to the Reader, so a new arc's goals are
planned and reviewed in the World Blueprint before its first chapter. The
`./story-seed` re-exports lose `onExtendArcRoadmap`/`onAddArcs` (Add arcs is
gone).

**0.10.0:** requires `@seihouse/sen` 0.10.0. New `./stories` entry, the
reader's side of a HARNESS story: `useLibraryStories` opens a host's stories
with the Library's defaults (story memory read only on request, the Library
media port, the remembered model), `StoryPages` shows one story's World Info
page and its Reader with the Aura Veil while a chapter is written, and
`storyHomeWorlds` lists the stories as Home cards, newest first.
`HarnessGenerationWorkspace` is built on the same hook and pages.
`./story-seed` adds `harnessStoryStartFromSeed`: the story a Story Seed starts.
`LightNovelsHome` takes an optional `emptyState` (`{ title, description }`),
so a host can word its list before it has any worlds.

**0.9.0:** requires `@seihouse/sen` 0.9.0. A HARNESS story opens on its World
Info page: `HarnessGenerationWorkspace` takes `infoStoryId` /
`onInfoStoryChange` (host-controlled like `readingStoryId`) and `writingAgent`,
the agent the Aura Veil shows while the Reader writes a chapter. Its controller
reads story memory only on request. `WorldCardInfo` and `StoryDetailScreen`
take `onStart`, which turns an empty story's Chapters card into Start Story.
The Development `AILoadingVeil` takes `progress` (`null` when unknown) and has
two screens: every narrative operation shows the same narrative manifestation,
every media operation the same reveal.

**0.8.0 (breaking):** `@seihouse/library/world-card` no longer exports
`WorldCardCompact`, `WorldCardMini`, or `WorldCardMiniProps`. Use
`WorldCard face="compact"` for creator tiles. The unused mock Mini row was
removed; a real Mini face can be designed later. The Info cover uses
`WorldCard face="info"` through `WorldCardInfo`.

## Public entries

| Import | Responsibility |
| --- | --- |
| `@seihouse/library` | Common Library exports and version |
| `./presentation` | Library-to-SEN presentation composition and host asset-location provider |
| `./profile` | Cave/Profile behavior, public views, settings, admin host ports |
| `./energy` | Client-safe Energy contracts, read projections and provider |
| `./familiar` | Sprite animation, draggable/resizable companion, minimize/recall, profile selection, and the Familiar account: ownership, Bond Rank cultivated with QI, element mastery, and the Active Elemental Effect (`FamiliarTrainingPanel`, `ElementalEffectPanel`, `FamiliarNameEffect`, `activeNameEffect`) |
| `./celestial-store` | Official Familiar Store page and the reusable `ShopCard`: offer configuration, deterministic daily rotation, and the account port for host-owned ownership and purchases |
| `./cultivation` | Spendable-QI and permanent DAO XP read projections (DAO XP alone sets Cultivator Rank, which only chooses colours), economy standards, and cultivation surfaces |
| `./dao-pillar` | Calendar/reward contracts and server-result-driven UI |
| `./rewards` | Achievements and Mystery Scrolls: reward vocabulary, the achievements client, `AchievementsPanel`, the shared reward reveal (`MysteryScrollReveal`, `RewardRevealCard`), and `useRefreshWhenReplaced` for re-reading balances when a reward lands |
| `./relics` | Fate Survival Relics: contracts, the read client, `FateSurvivalRelicsPanel` and `RelicReveal` |
| `./shell` | Navigation, route models, header/footer and shell orchestration |
| `./home` | Library Home, discovery and story-detail surfaces |
| `./creator-space` | The Create page: Creator Space tiles, the Creator Toolkit preview and the Your worlds row over host-supplied worlds, Energy and destinations |
| `./discover` | The Discover page, as store-front shelves: Featured, New Chapters and My updates (newest first), the Fate Survival feature, Heavenly Rankings in the host's order, Events and Browse by Genre, over host-supplied worlds, releases and destinations |
| `./world-card` | The shared `WorldCard` with Full, Compact, and Info cover faces, plus its Info page — over host-supplied world display data and destinations |
| `./story-seed` | Authenticated Story Bank, Help and branded creation journey; Story Seed Settings own the Story Language and Reading Mode a new story starts with |
| `./generation` | First-party HARNESS workspace composition: the novel page with the same Story Settings panels as `./stories`, plus the developer inspection (CAPA skill instructions, the Official Requirements, slot uploads) when a development host sets `showHarnessInternals` |
| `./stories` | A reader's HARNESS stories over host-supplied storage and writer: `useLibraryStories` (one controller with the Library's defaults), `StoryPages` (a story's World Info page, with Manifest on its cover and its Story Settings, and its Reader, with the Aura Veil while a chapter is written), `harnessStoryDisplay` and `storyHomeWorlds` (Home cards, newest first, with the host's covers), `StorySettings` and `CreateStorySettings` (language, Reading Mode, CAPA skill slots, Media Loadout; Create's as a draft the host keeps), `storyCoverRequest`, `STORY_COVER_CHOICES` and the `StoryCoverService` port (make one or three, keep one, let go of the rest) |
| `./model-router-server` | Server-only Gemini/OpenRouter/MiniMax text and image routing, ElevenLabs speech, and MiniMax video tasks; apps supply credentials, prompts, HTTP policy, and storage |
| `./media` | First-party catalog selection and entitlement contracts |
| `./manifestations` | Celestial manifestation orchestration around Library UI visuals |
| `./styles.css` | Library feature styles |

Profile consumes the Energy, spendable-QI and permanent DAO XP projections; it is not their
authority. DAO Pillar requests today's claim without naming a reward amount. The achievements
client can only open a scroll the cultivator owns, the Relics client only reads, and the Familiar
client asks the server to train, choose a look, or buy at today's price. Every balance,
progression total, reward, role and permission is host-authoritative, and no Familiar effect
grants a boost, multiplier, discount or other advantage.

`LibraryPresentationProvider` composes stateless `@seihouse/library-ui@0.10.0`
visuals over SEN. Concrete CDN and public-directory locations are supplied as
`LibraryAssets`; they are not embedded in the package.

The Library's official icon artwork is selected by `./styles.css` from the public
SEIHouse R2 Basic/Special folders. `./presentation` exports `LIBRARY_ICON_CATALOG`
for inspection (exact keys, URLs, ETags and Library identifiers); the existing
Library UI renderer and named adapters keep their contracts.

The 12 bundled icons have individual named exports from `./presentation`:

```tsx
import { LibraryAtmosphereIcon, LibrarySoundscapeIcon } from '@seihouse/library/presentation';

<LibraryAtmosphereIcon size={24} aria-label="Atmosphere" />
<LibrarySoundscapeIcon size={24} aria-label="Soundscape" />
```

The other named exports are `LibraryEditIcon`, `LibraryCopyIcon`, `LibraryMediaIcon`,
`LibraryRemoveIcon`, `LibraryBackIcon`, `LibraryAudioIcon`, `LibraryCueIcon`,
`LibrarySaveIcon`, `LibraryUndoIcon`, and `LibraryDeleteIcon`.
They inherit `currentColor`, accept SVG props and `className`, and are decorative
by default; provide `aria-label` for standalone meaning.

`LIBRARY_ICON_CATALOG` includes all 54 icons in Basic and Special categories.
Entries identify their `source`: `remote` entries retain their public URLs and
Library identifiers; `bundled` entries provide a named `Icon` component and
`exportName`. The existing Icons Workshop shows this same catalog.

## Server Model Router

**2026-10-19:** Anthropic is a direct text provider through the official
`@anthropic-ai/sdk`. Pass `credentials.anthropic` from the host's server
environment (`ANTHROPIC_API_KEY`). Writer models are Claude Opus 5.5, Sonnet
5.5, Haiku 5.5 and Fable 5.1 (`anthropic/<model>`). Requests stream, send low
effort by default (`output_config.effort`; thinking is always on) and send no
sampling parameters. Opus, Sonnet and Fable opt into Anthropic's server-side
fallback (`fallbacks: "default"`), which reruns a policy decline on Anthropic's
recommended model in the same call; Haiku 5.5 has none. A decline that remains
is reported as an error, never returned as text. As with MiniMax, the JSON
schema goes in the instructions and hosts keep validating the answer. MiniMax's
M3.1 Flash id is now `minimax/MiniMax-M3.1-Flash`, MiniMax's own name; the
earlier `-Preview` id is not in MiniMax's documented models.

**2026-10-14:** MiniMax is a direct provider for text, images and video tasks.
Pass `credentials.minimax` from the host's server environment. Writer models
include M3.1 Flash (low reasoning by default), M3 and the M2 series.
MiniMax receives JSON schemas in the instructions; hosts keep validating the
answer. Image prompts are limited to 1,500 characters; Image 01 Live requires
a portrait reference. `generate({ capability: 'video', ... })` submits one
job and returns `VideoTaskResult` with its task ID. `queryVideoTask({ model,
taskId, timeoutMs })` checks the same job until succeeded, failed or cancelled.
Download URLs expire, so hosts must store completed videos through their own
media system. No automatic retries or credential fallback occur. A configured
key does not establish model entitlement; Token Plan and M Plan tiers differ.

**2026-10-12:** Local development text inference can use `LOCAL_LM_STUDIO_MODEL`
(`lmstudio/loaded`) with `createModelRouter({ credentials: {}, localDevelopment:
true })`. Execution additionally requires `NODE_ENV=development` and neither
`VERCEL` nor `VERCEL_ENV`. It discovers the single loaded text model from LM
Studio on localhost:1234, sends OpenAI-compatible chat requests under `/v1`
without authentication, and returns its actual model ID in the result. See the
[local provider setup](../../server/model-router/README.md#local-lm-studio).

Import `@seihouse/library/model-router-server` only in a trusted Node server.
An app owns its API route, authentication, prompt, model allowlist, and saved
work. Pass its server credentials into the router; never serialize them into a
status response or browser code.

```ts
import { createModelRouter } from '@seihouse/library/model-router-server';

const router = createModelRouter({
  credentials: {
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    elevenlabs: process.env.ELEVENLABS_API_KEY,
    minimax: process.env.MINIMAX_API_KEY,
  },
  openRouterAttribution: { referer: 'https://your-app.example', title: 'Your App' },
});

const result = await router.generate({
  capability: 'text', model: 'google/gemini-3.1-flash-lite',
  systemInstruction: appOwnedInstructions, userPrompt: appOwnedPrompt,
  temperature: 0.8, maxOutputTokens: 4096, timeoutMs: 90_000,
  responseFormat: 'json', responseJsonSchema: appOwnedSchema,
});
```

`text` handles Gemini, OpenRouter and MiniMax text and returns text plus optional
provider token usage. `temperature` applies to non-Gemini models; Gemini uses
provider-default sampling and supported `reasoningLevel` values are sent as
thinking levels (OpenRouter uses `reasoning.effort`). An unsupported or unknown
Gemini level is omitted to use the model default. `tts` takes a server-chosen
voice ID and returns MPEG bytes from ElevenLabs. Provider errors use the stable `ModelRouterError.code`;
apps should branch on that code rather than parsing message text. Apps decide
their own HTTP message and retry policy. Images use Gemini, OpenRouter or
MiniMax and return base64 plus the image MIME type. MiniMax video has an
asynchronous task adapter; Veo, music and 3D remain catalog only. A configured key
does not prove that a provider call will succeed.

## Dependencies and verification

Library consumes SEN only through `@seihouse/sen/*`. Its type build resolves
SEN's emitted declarations, preventing a second engine copy. The packed smoke
installs both tarballs plus UI peers in a fresh directory, bundles every public
entry and type-checks Profile, Energy, QI, DAO XP, rewards, Relics, Familiar and HARNESS host contracts.

```bash
npm run check:ownership
npm run build:package:library
npm run test:package
```

Workshop simulations, API handlers, identity verification, database adapters,
and production infrastructure are not published. Provider access is published
only through the server-only Model Router entry.

**2026-10-26 icon refinements:** Presentation also exports `LibraryDaoInsightIcon`,
`LibraryMortalPressureIcon`, `LibraryImmortalPressureIcon`, `LibraryHeavenPressureIcon`,
`LibrarySurvivalIcon`, and `LibraryGenreIcon`. The 54-entry catalog includes the local
Help, Search, Settings, Manifest, Origin, and Information SVGs. These assets are bundled
with the Library; existing remote artwork remains available in the same catalog.
