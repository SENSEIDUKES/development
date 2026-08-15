# Reader Chamber

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/ReaderChamber.tsx` and `src/components/ReaderViewport.tsx` (verified on `origin/main` @ `66643f6`)
- **Workshop preview:** `?preview=reader-chamber`
- **Replica created:** 2026-07-31
- **Last Workshop update:** 2026-08-15
- **Last source comparison:** 2026-08-15
- **Replica status:** faithful replica

## Workshop history

- **2026-08-15:** Rebuilt the active Development `CodexCard` on the shared `LibraryCard` region structure without changing the Reader reveal's presentation or flow. Existing media/backdrop, Manifest/Awaken action and Summoning state, entrance/hover behavior, typography, spacing, and routing remain intact; no generic LibraryCard visual treatment has been adopted.
- **2026-08-14:** Completed the first Part Three card cleanup on the existing Reader route: renamed the active presentations to `CodexCard` and `WorldCard`, limited visual Codex Cards to Human Portraits, Non-Human Portraits, Artifacts, and Locations, kept Bestiary/Faction highlights on World Cards, kept System/Fate content on System Panels, suppressed duplicate visual Codex/World signals in favor of the Codex Card, and removed the end-of-chapter Chapter Visual Memory render and trigger.
- **2026-08-13:** Added an isolated, disposable one-chapter entry at the existing Reader/Codex adapter boundary. A successfully processed direct Chapter Generation result now opens the unchanged Reader Chamber and complete Reader Codex with one prose chapter and one processed-state snapshot. The existing five-chapter adapter, exact-five completion guard, navigation, highlighting, layouts, and Codex internals remain unchanged. Verified with a real Gemini-generated Timeless chapter in a protected Preview.
- **2026-08-11:** Migrated the complete production Reader Codex as its own Workshop feature and restored the Reader Chamber integration: the existing Codex control now opens the production-style sheet over the still-mounted Reader, all six Codex pages are present, and prose highlighting/reveal-card resolution again use the story's Codex terms. The generated five-chapter session keeps its disposable, chapter-scoped snapshot boundary; generation and `batchToReaderAdapter.ts` were not changed.
- **2026-08-10:** Completed the Pass 3 connection from Chapter Generation: a completed five-chapter batch now opens as a disposable real Reader Chamber session with repaired final prose, Chapters 1–5 navigation, structured blocks/system panels, chapter-scoped cumulative Reader Codex snapshots, chapter and batch token totals (including repair/retry usage), five-chapter text export, and selected-chapter reuse of the existing four-stage Diagnostics. The standalone four-chapter story is now explicitly labeled as the no-batch mock fallback.
- **2026-08-10:** Integrated Pass 3 data bridge (`batchToReaderAdapter.ts`) connecting five-chapter generation batches to the Reader Chamber without altering Pass 2 chapter generation code. Added `ReaderCodexView` to display living Codex memory (characters, factions, locations, artifacts, unresolved plot threads) when switching to the Codex tab in the Reader Chamber.
- **2026-07-31:** Created faithful Workshop replica and local state simulator (11 preview states, mock StoryWorld with 4 chapters, zustand-free external mock store).
- **2026-07-31:** Consolidated all reader settings into a single **Reader Settings** panel (`development/ReaderSettings.tsx`) with three labeled sections — Reader (the former `ReaderPreferencesPanel` controls: font, size, theme, particles, chapter divider, highlights, typography, player style, System Color Legend), Audio (the `AudioMenu` mix, voice selects, playback speed, Export Chronicle), and Immersion (Immersion Engine master, Autonomous Reading, Holographic Visions). Both entry points (header button, now aria-labeled "Reader Settings", and the bottom-bar gear) open this one panel; the old bottom-bar `ImmersionSettings` popover and the standalone `ReaderPreferencesPanel` were removed. No control behavior changed — only organization and presentation.
- **2026-07-31:** Consolidated Reader Chamber navigation into the new layout direction (navigation architecture only — no visual redesign). The **top header** is now navigation and controls only: Back, story/chapter title, Audio, Settings, and a Quick Action slot. The **bottom action bar** carries reading actions only — Previous Chapter, Comments, Play/Pause (primary center action), Codex, Next Chapter — as one unified row on every breakpoint (the desktop-only recitation info text was dropped with the split layout). Details: the header **Audio** button opens the Reader Settings panel scrolled to the Audio section (`#reader-settings-audio`); the header **Settings** button is now the single settings entry point (the bottom-bar gear was removed); the chapter selector and mark-as-read toggle moved from the old header into a new **Chapter** section at the top of the settings panel; the bottom-bar **Comments** button reuses the Chronicle Anchors drawer (entry renamed to Comments, drawer internals untouched — Chronicle Anchors becomes the comments system later); **Alter Fate (Branch)** moved from the bottom bar into the header **Quick Action** menu, the placeholder slot's first wired action. `ReaderControls/ChapterNavigation.tsx` (inlined into `ReaderControls/index.tsx`) and `AudioWidget.tsx` (master mute/volume lives in the Audio section's `AudioMenu`) were removed from `development/`. Reader logic, TTS behavior, Codex, and Chronicle Anchors internals unchanged.
- **2026-07-31:** Restored scroll-direction header behavior (second attempt — the first was reverted for making the header vanish entirely). Root cause of both the old failure and the "header never returns" symptom: `#reader-chamber-root` had `overflow-hidden`, which silently disables `position: sticky` on the header, so the header simply scrolled away with the chapter. The root now uses `overflow-clip` — it clips exactly like `hidden` (rounded corners, particles, screen shake unaffected) but creates no scroll container, so the sticky header works again. On top of that, the chamber hides the header after 8px of accumulated downward scroll and reveals it after 8px of accumulated upward scroll, listening on the chamber's **actual scroll container** (nearest genuinely scrolling ancestor, resolved at runtime, document fallback) rather than assuming the global page scroll. The header stays pinned near the chapter top (≤80px) and while the Reader Settings panel is open; tiny touch jitter never flips it; the sticky slot reserves layout space so hide/show causes no reflow or scroll jump; `motion-reduce` disables the transition. Works for wheel, touch drag, and momentum scrolling on mobile, tablet, and desktop.

- **2026-07-31:** Reorganized the Workshop preview-control menu (Workshop panel only — no
  Reader Chamber behavior, no preview states removed). The single long Preview States list
  became four categories chosen from a compact `Reading | Effects | Menus | Pages` selector,
  with only the selected category's controls rendered: **Reading** (reading state, fullscreen
  reading, chapter selection), **Effects** (theme, particle intensity), **Menus** (Reader
  Settings open, Comments open, Alter Fate panel open), **Pages** (auto-scroll paused,
  generating, translating, Unmanifested Segment, death/critical scene, Continuity Guard
  warning). One responsive layout serves both breakpoints: the selector is a four-column grid
  that fits the mobile viewport, state buttons stack one per row on mobile and flow into 2–3
  columns from `sm`/`lg` up, long labels wrap instead of overflowing, every control keeps a
  ~44px minimum touch target, and the panel clips horizontal overflow (verified at 390px and
  1280px: zero horizontal page overflow in all four categories).

## Folder layout

```
reference/                    — untouched replica of production, locked
  ReaderChamber.tsx
  ReaderViewport.tsx
  ReaderHeader.tsx
  ReaderPreferencesPanel.tsx
  ReaderControls/             — index.tsx, types.ts, PlaybackControls.tsx,
                                ChapterNavigation.tsx, ImmersionSettings.tsx, AudioMenu.tsx
  CosmicBookmarksPanel.tsx
  VirtualizedList.tsx
  AlterFatePanel.tsx
  ParticleSystem.tsx
  AudioWidget.tsx
  SystemBlock.tsx
  FateResultCard.tsx
  WorldCard.tsx
  CodexCard.tsx
  ReaderFateAlerts.tsx
  FateSurvivalExplanation.tsx
  SystemColorLegend.tsx
  ContextInspector.tsx
development/                  — active Workshop version; started as an exact copy of reference/
  (same files, except: ReaderSettings.tsx replaces ReaderPreferencesPanel.tsx;
   ReaderControls/ no longer contains ImmersionSettings.tsx or
   ChapterNavigation.tsx; AudioWidget.tsx was removed — see history)
shared/                       — code genuinely identical between the two forks
  types.ts                    — ReaderChapter + composing types, StoryBlock/metadata/SystemEvent/
                                WorldCardEvent/FateResultData, StoryCuePayload, ContextManifest,
                                ReaderPreferences, StoryWorld + Codex entities, StoryArc, Bookmark,
                                and production-narrow Reader/Codex story patch contracts
  batchToReaderAdapter.ts     — immutable disposable accepted single-chapter and exact-five batch Reader/Codex session boundary
  reader-chamber.css          — reader-specific classes/vars/keyframes extracted from source
                                src/index.css (imported by the preview Workspace)
  stubs.ts                    — mock external store (useAppStore + selectIsGenerating, no
                                zustand), LOCAL_ONLY_MODE, inert hook stubs, inert audio engine
  readerPlayback.ts           — pure extractSFXCues (verbatim) + inert useReaderPlayback
  id.ts, readerTypography.ts, readerLegend.ts, alterFateLock.ts, systemColors.ts,
  dialect.ts, autoCuePolicy.ts, manifestationEligibility.ts,
  cinematicScroll/anchors.ts, effects/cinematicEffectGovernor.ts
                            — pure libs copied (near-)verbatim from production
  trackLibrary.ts             — static TRACK_LIBRARY catalog for the Audio Menu (display only)
```

Both forks render inside `src/workshop/previews/reader-chamber/ReaderChamberWorkspace.tsx`,
which shares one mock story and one categorized preview-control panel (Reading / Effects /
Menus / Pages — see "Available preview states") between them via `FeatureWorkspace`.

## What was copied

The full Reader Chamber presentation tree from `src/components/` in Light-Novels:
`ReaderChamber.tsx` (default export, `ReaderChamberProps`), `ReaderViewport.tsx`,
`ReaderHeader.tsx` (+ `AudioWidget`), `ReaderPreferencesPanel.tsx`, the whole
`ReaderControls/` folder, `CosmicBookmarksPanel.tsx` (+ `VirtualizedList`),
`AlterFatePanel.tsx`, `ParticleSystem.tsx`, `SystemBlock.tsx` (+ `FateResultCard`,
`lib/systemColors.ts`), the World Card presentation now named `WorldCard.tsx`,
`ReaderFateAlerts.tsx` (+ `FateSurvivalExplanation`), `SystemColorLegend.tsx`,
`ContextInspector.tsx`, plus the pure libraries listed under `shared/` above and the
reader-specific styling from `src/index.css` (`.light-novel-reader`,
`.reader-prose`/`.reader-paragraph` + CJK variants, `.gold-accent`/`.jade-accent`,
holographic-panel + keyframes, `.reading-focus-active/dimmed`, menacing/screen-shake
animations, `:root` reader CSS vars + entity-highlight palette vars incl. `data-palette`,
`.highlight-*` classes, custom scrollbar). The 5 hard-coded public R2 backdrop URLs in
`ReaderViewport.tsx` (`FALLBACK_BACKDROPS`) were kept for visual fidelity and back
Codex-term reveal cards when the mock chapter marks an entity as a reveal.

Styling caveat: `@theme` tokens were NOT duplicated — the Workshop `src/styles.css`
already carries the same font and color tokens.

## What was mocked

- **`useAppStore` / `selectIsGenerating`** — a tiny external store on
  `useSyncExternalStore` (no zustand), exposing the same call signatures
  (`useAppStore(selector)` + `useAppStore.getState()`). All setters genuinely update
  state, so reader mode, immersion toggles, fullscreen, read/unread, bookmarks,
  preferences, and the audio mix visibly work.
- **Story data** — one mock `StoryWorld` ("Ashes of the Ninth Meridian", genre
  `Fate Survival`) with 4 chapters:
  1. rich structured-`blocks` chapter (breakthrough system block, Fate Result card,
     World Card with a browser-native TTS line, soft continuity notes, Context
     Inspector manifest);
  2. long legacy `generatedContent` prose chapter with a hard Timeline Divergence
     banner and a legacy `[bracket]` system line;
  3. sealed chapter that is also a death/critical scene (menacing red chamber
     shading + corruption system block);
  4. empty chapter with no content ("Unmanifested Segment").
  Plus two bookmarks and default `readerPreferences`.
- **Hook stubs** matching the active destructured shapes: `useReaderPlayback`
  (play/pause flips real store state; `activeChunks` empty), `useReaderVisuals`
  (collects Codex terms from local story memory), `useCinematicScroll`
  (idle/following/yielded), `useReadingPosition` (no-op), `useChapterTranslation`
  (`translateChapter: async () => null`), `useAudioMix` (settings are real state,
  no sound), `vibrate` (no-op), `LOCAL_ONLY_MODE = true`.
- **`onSwitchTab`** — the Reader Chamber's existing Codex control opens the migrated
  production-style `CodexSheetOverlay` over the still-mounted Reader. The direct
  `?preview=reader-codex` workspace also exposes Reference, Development, and Compare.
- **Preview-state UI actions** — `preferences-open`, `bookmarks-open`,
  `alter-fate-open`, and `continuity-warning` click the real in-chamber buttons
  (by accessible label) after remount, exercising the production interaction path.
- **Reveal backdrop assignment** — `updateStory` runs against the mock store, so
  `assignedRevealBackdrops` writes are local and harmless.

## Available preview states

The Workshop preview-control menu is split into four categories, selected with a
compact `Reading | Effects | Menus | Pages` row at the top of the panel. Only the
selected category's controls render, so the menu is never one long vertical list.
Category membership lives on each scenario in
`src/workshop/previews/reader-chamber/previewStates.ts` (`category` field).

**Reading** — normal reading states and reading setup

- `reading` — rich blocks chapter 1 (system blocks, Fate Result card, World Card,
  Context Inspector, legend, Fate Survival banner)
- `fullscreen` — header hidden; click prose to toggle back
- Chapter selector (1–4)

**Effects** — preview-only visual and immersive controls

- Theme selector (void/crimson/abyss/sepia/emerald via `readerPreferences.themeOverride`)
- Particle intensity (off/low/default/high via `readerPreferences.particleIntensity`)

**Menus** — opened panels, drawers, and overlays

- `preferences-open` — Reader Settings panel expanded
- `bookmarks-open` — Comments button opening the Chronicle Anchors drawer (two anchor cards)
- `alter-fate-open` — Alter Fate (branch) modal

**Pages** — alternate Reader Chamber states and special full-screen conditions

- `auto-scroll-paused` — resume-reading pill (rendered at the chamber bottom, as in production)
- `generating` — chapter 4 with skeleton pulse placeholder
- `translating` — "Translating the Heavenly Dao…" spinner
- `empty-chapter` — "Unmanifested Segment" with Manifest buttons
- `death-scene` — sealed chapter 3 with menacing red shading + death flag block
- `continuity-warning` — Seal flow surfacing the Continuity Guard Warning modal

All of these are Workspace-only controls, never inside the reusable components. When the
active state belongs to a category that is not on screen, the panel names it on a footer
line so the current state is never ambiguous.

## Reusable Workshop dependencies

- `FeatureWorkspace` + one `manifest.ts` entry (`reader-chamber`, category `reader-ui`)
- Existing `@theme` tokens in `src/styles.css` (fonts, portal/void/signal/human/gold-accent)
- `lucide-react`, `motion/react` (already installed)

## Production dependencies intentionally excluded

- zustand stores (`store/useAppStore`, `store/useGenerationStore`) → `shared/stubs.ts`
- Firebase (`lib/firebase`, `LOCAL_ONLY_MODE`) → constant `true`
- storyStorage / IndexedDB persistence
- Generation pipeline (`onGenerateChapter`/`onGenerateNextFiveChapters` log only)
- TTS / audio engines (`useReaderPlayback` internals, `hooks/audio/useAudioMix`
  playback, `lib/audio/cardSoundCatalog`/`cardSoundPlayer`/`audioMixSettings`,
  `lib/vibration`, `lib/narrativeCues`) — settings state is real, playback inert;
  World Card SFX resolves to nothing ("Echo Unavailable"), `tts_line` cards use the
  browser's own `speechSynthesis` (no production dependency)
- `hooks/useChapterTranslation`, `hooks/useCinematicScroll`, and
  `hooks/useReadingPosition` — inert stubs
- Production Codex authentication, quota, persistence, image/audio generation,
  private-media renewal, and Gemini glossary services — represented by local,
  deterministic compatibility adapters. See `../reader-codex/README.md` for the
  exact boundary and transfer map.

## Dead code dropped while copying

- Unused `SystemBlock` import inside `ReaderChamber.tsx` (production keeps it, unused).
- Unused `stories` / `activeStoryId` / `saveStories` / `routingConfig` selectors
  (source `ReaderChamber.tsx` lines 101–104).

## Icon substitutions (lucide-react version difference)

The Workshop's `lucide-react@^1.27.0` removed several legacy aliases the source uses.
All substitutions are import-level aliases only — JSX is byte-identical to production:

- `Loader2` → `LoaderCircle as Loader2` (ReaderViewport, WorldCard)
- `Sliders` → `SlidersHorizontal as Sliders` (ReaderHeader, ReaderSettings)
- `AlertTriangle` → `TriangleAlert as AlertTriangle` (SystemBlock, FateSurvivalExplanation)
- `AlertCircle` → `CircleAlert as AlertCircle` (FateResultCard)
- `CheckCircle` → `CircleCheck as CheckCircle` (FateResultCard)
- `HelpCircle` → `CircleQuestionMark as HelpCircle` (FateSurvivalExplanation)

## Known visual differences from the source

- **Codex service actions are local** — the migrated UI, navigation, edit controls,
  caches, dialogs, and responsive layouts are present, but live AI/media generation,
  authentication, quota charging, and remote persistence do not run in the Workshop.
- **Alter Fate focus behavior is unchanged from the existing Workshop replica**;
  the migrated Codex context dialog uses `react-focus-lock` like production.
- **Audio inert** — the mixer's toggles and volumes are real state, but no music,
  atmosphere, cues, or narration ever play; World Card SFX shows "Echo Unavailable";
  `tts_line` World Cards speak via the browser's own speechSynthesis.
- **No TTS sync highlighting** — `activeChunks` is always empty, so the
  portal-colored narration span and `reading-focus-*` classes never activate;
  the play/pause vinyl still flips and spins.
- **Neutral/gray/zinc/slate/stone shade drift** — production overrides
  `--color-neutral-500/600/700` (lighter) and the gray/zinc/slate/stone 500–700
  ranges in its `@theme`; the Workshop tokens were intentionally left untouched, so
  some muted text renders a shade darker. Conversely `text-gold-accent` resolves in
  the Workshop (token exists here, not in production) where production falls back to
  inherited color. `text-jade-accent`, `text-neutral-350/550/650`,
  `border-neutral-850/855`, and `animate-fadeIn`/`animate-fade-in` are no-ops in BOTH
  repos (no token/keyframes anywhere), so parity there is automatic.
- **Mock story genre is `Fate Survival`**, so the Fate Survival banner renders on
  every chapter (production behavior for that genre) and the Alter Fate panel uses
  the `plain` dialect labels ("Story Steering" / "Command Prompt") exactly as
  production would for this genre.
- **Chapter Visual Memories are removed** — the Reader no longer renders a chapter-hero component or invokes an end-of-chapter image trigger. Existing chapter media data is left intact for compatibility and Manga Studio is unchanged.
- **Shared store between Compare panes** — the mock store is a module singleton, so
  in Compare mode both panes navigate/toggle in lockstep (intended: same data on
  both sides). The bottom control bar is viewport-`fixed`, so the two bars overlap
  exactly in Compare mode.
- **R2 backdrop URLs** — the 5 hard-coded public `FALLBACK_BACKDROPS` URLs were
  kept and now back metadata-driven Codex reveal cards that have no entity image.

## Exact files needed for transfer (verified)

When a development/ change is approved, transfer these to Light-Novels, reversing
the import rewrites (`../shared/X` → `../lib/X` / `../hooks/X` / `../store/X`,
`./X` unchanged) and mapping the Reader Codex shared imports back to production's
existing `CodexHovercard` and `lib/codexHighlighting` owners:

- `development/ReaderChamber.tsx` → `src/components/ReaderChamber.tsx`
- `development/ReaderViewport.tsx` → `src/components/ReaderViewport.tsx`
- `development/ReaderHeader.tsx` → `src/components/ReaderHeader.tsx`
- `development/ReaderSettings.tsx` → `src/components/ReaderSettings.tsx` (new file;
  on transfer, delete `src/components/ReaderPreferencesPanel.tsx` and
  `src/components/ReaderControls/ImmersionSettings.tsx` from production — their
  controls now live inside `ReaderSettings.tsx`)
- `development/ReaderControls/*` → `src/components/ReaderControls/*` (on transfer,
  delete `src/components/ReaderControls/ChapterNavigation.tsx` — the bottom action
  bar is now inline in `ReaderControls/index.tsx`)
- `development/CosmicBookmarksPanel.tsx` → `src/components/CosmicBookmarksPanel.tsx`
- `development/VirtualizedList.tsx` → `src/components/VirtualizedList.tsx`
- `development/AlterFatePanel.tsx` → `src/components/AlterFatePanel.tsx`
- `development/ParticleSystem.tsx` → `src/components/ParticleSystem.tsx`
- `development/SystemBlock.tsx` → `src/components/SystemBlock.tsx`
- `development/FateResultCard.tsx` → `src/components/FateResultCard.tsx`
- `development/WorldCard.tsx` → `src/components/WorldCard.tsx`
- `development/CodexCard.tsx` → `src/components/CodexCard.tsx`
- `src/components/library/LibraryCard.tsx` and its existing shared Library dependencies → the source application's compatible Library foundation before transferring `CodexCard`
- `development/ReaderFateAlerts.tsx` → `src/components/ReaderFateAlerts.tsx`
- `development/FateSurvivalExplanation.tsx` → `src/components/FateSurvivalExplanation.tsx`
- `development/SystemColorLegend.tsx` → `src/components/SystemColorLegend.tsx`
- `development/ContextInspector.tsx` → `src/components/ContextInspector.tsx`
- Style changes from `shared/reader-chamber.css` → merge back into `src/index.css`

Workshop-only — never transfer: `shared/stubs.ts`, `shared/types.ts` (production
`src/types.ts` is authoritative), `shared/trackLibrary.ts` (production
`lib/audio/musicResolver.ts` is authoritative), everything under
`src/workshop/previews/reader-chamber/`, the manifest entry, and the registry line.

## Transfer notes and cautions

- The chamber root uses `overflow-clip` instead of `overflow-hidden` — this is
  load-bearing, not cosmetic. `overflow-hidden` creates a scroll container that
  silently disables the header's `position: sticky`; `clip` keeps the exact
  same visual clipping while letting the sticky header (and its
  scroll-direction hide/show) work. Do not revert it to `hidden` on transfer.
- The header **Back** button falls back to `window.history.back()` when no
  `onBack` prop is passed — wire it to the production navigation handler on
  transfer.
- On transfer, delete production `src/components/AudioWidget.tsx` — the header
  master-mute shortcut was replaced by the header Audio button, which opens the
  Audio section of `ReaderSettings.tsx` (the `AudioMenu` keeps the same master
  switch and volume).
- The `reference/` and `development/` files import shared code from `../shared/…`;
  production paths were `../lib/…`, `../hooks/…`, `../store/…`, `../types`. Reverse
  the mapping exactly (see "What was mocked").
- `ReaderViewport.tsx` carries one deliberate rewrite: `chapterNumbers.at(-1)` →
  index access (Workshop tsconfig targets ES2020 without `Array.prototype.at`).
  Safe to carry back, or restore `.at(-1)`.
- `ReaderChamber.tsx` carries two strict-null coercions (`cue.danger ?? 0`) and two
  prop casts (`handleUpdatePreference`, `handleAlterFate`) required by the
  Workshop's stricter tsconfig; both are behavior-identical.
- The Alter Fate panel's production button label "Sundert The Timeline" is a
  production typo preserved verbatim — fix it deliberately in production, not here.
- `ReaderCodexStoryPatch` in `shared/types.ts` now mirrors production's intentional
  allowlist, preventing the Reader/Codex callback from overwriting unrelated story fields.
- lucide icons: on transfer, either keep the aliased imports (they exist in current
  lucide-react) or restore the legacy names if production's version still has them.

## Lifecycle

1. **Import** — copy production's current implementation into `reference/`.
2. **Fork once** — `development/` starts as a copy of `reference/`.
3. **Refine** — every Workshop task modifies `development/` only.
4. **Approve** — once approved, transfer `development/` back to Light-Novels.
5. **Resynchronize** — refresh `reference/` from the newly integrated production
   code, record the new comparison date, and reset `development/` for the next
   redesign cycle. There is no V2/V3 — only "what production currently is" vs "what
   we are currently trying to make it become."
