# Reader Chamber

Where `reference/` exists, it holds the old production version, kept as reference
material for the remake; it is not edited or refreshed. New features do not get a
reference folder. Old systems stay until each is remade on the new path; never
reconnect them as they are or re-sync with the old production app. The destination
is SEN, Library and NovelExpanded built here, guided by `NOVEL_EXPANDED.md`.

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** the Reader screen `src/components/ReaderScreen.tsx` (export `ReaderScreen`), which mounts `src/components/ReaderChamber.tsx` (default export), plus the overlays production's `src/App.tsx` mounts beside it: `CodexSheetOverlay`, `KeyboardShortcuts`, `ParticleSystem` and `AtmosphericAudio` (verified on `main` @ `647165a`, 2026-09-16)
- **Original Reference:** a byte-for-byte copy of that Reader in `reference/light-novels/`, copied 2026-10-07 at the owner's request; see “Original Reference: production's Reader” below
- **Workshop preview:** `?preview=reader-chamber`. Original Reference is production's Reader; Development is the NovelExpanded app's own Reader (since 2026-10-09)
- **Development view:** the app's Reader, `HarnessReaderSession` (SEN, `src/components/harness-generation/development/`), hosted exactly as the app hosts it by Library's `StoryPages` on its read page. The older development Reader in `development/` is no longer on this card; its code stays for the Card Workshop, Reader Codex and Character Voice previews that use parts of it
- **First Workshop record:** 2026-07-31
- **Last recorded Workshop update:** 2026-10-09
- **Historical source inspection:** 2026-08-22 (the older copy), 2026-10-07 (the current Original Reference)
- **Implementation status:** under refinement

## Workshop history

- **2026-10-09 (Development is the app's Reader):** The owner asked for a place to work on the Reader inside the NovelExpanded app, which had drifted far from the Reader this card showed. Development now shows that Reader itself: Library's `StoryPages` on its read page over `useLibraryStories`, with the app's writing screen (VERSA), soundscapes, read-aloud voices and the official CAPA skills installed as the app installs them. So the Workshop and the app render the same component and cannot drift apart. Only the services differ (`src/workshop/previews/reader-chamber/`):
  - **The story.** It is the owner's Sundered Heavens test (eight chapters written in the app on 2026-10-06), as Export story saved it. `sampleStory.json` is trimmed from 2.9 MB to 0.9 MB by leaving out copies the Reader never reads: each attempt's accepted draft, foundation snapshot and frozen media, and the recordings catalog inside each chapter's frozen media. The loader restores the snapshot and media from the identical records beside them.
  - **Storage.** The story and the reading place are kept in memory, one copy per scene.
  - **The writer calls no model.** Asked for a chapter, it waits about five seconds and answers with the reply the model gave for that chapter. The HARNESS then accepts and saves it exactly as it did then: replaying Chapter 8 gives back its prose, Sound Cues, speakers, holdings, soundtrack and path unchanged (`sampleStory.test.ts`). A chapter the story never had (Chapter 9) fails with that reason, which is how the Reader shows a writer that cannot help.
  - **Scenes and pages.** **States** places the reader: Chapter 1, the middle, before the newest chapter ("Write Chapter 8"), on the newest chapter (Rewrite; Write Chapter 9), and the story start (Write Chapter 1). Going before a chapter uses SEN's own rewind (`withoutLatestChapter`), with Rhythm's recommendation worked out again as the HARNESS does before a rewrite. **Pages** opens Fate, Holdings or Reader Settings by pressing the Reader's own button. **Advanced** opens any story saved with the app's Export story, kept in the browser tab only.
  - **Back** opens the story's World Info, as in the app; its Continue returns to the chapter.
  - **The Familiar** is no longer drawn around the Development Reader: the app keeps it out of the Reader, which is immersive.
  - **The older development Reader** (`development/`, `@seihouse/sen/reader-chamber`) left this view with its scenario list (`previewStates.ts`). Its code and package entry stay.
  - **The Original Reference and its Scenes are unchanged.**
  - **Workshop Controls.** A preview's open modal now covers them (`src/styles.css`), so Reader Settings is no longer hidden behind them on a phone.
- **2026-10-07:** The Original Reference is production's actual Reader again. The owner found the Workshop copy was not the Reader production shows, and asked for the real one so its ideas and customization options can be studied before the Reader is redesigned. The older copy had been taken from production in late July and later adapted: it lacked the whole outer Reader screen (the top bar with genre and title, clock, chapter and total word counts, Lore Glossary and Codex, and the arc progress line), the Lore Glossary panel, the welcome-back recap, the steering screen and the keyboard shortcuts, it predated features such as the cinematic vignettes and the four System notice frames, parts of it had been rewired to development code, and the Workshop never passed Alter Fate, so its button was hidden. At the owner's explicit request, and as a deliberate exception to the rule that reference folders are never refreshed, `reference/` now holds production's Reader exactly as Light-Novels `main` has it at `647165a`: 119 files copied unchanged into `reference/light-novels/`, mirroring production's `src/` so not one import was rewritten. Eight production services are replaced at their own paths by marked Workshop seams (app state, Firebase, story storage, persistence, the media service and its resolver, and the embedding search), `firebase/auth` resolves to a local stand-in for this folder only, and production's direct AI routes are answered locally while the Reader is on screen. `reference/snapshot.json` records the commit and every file's fingerprint, and `reference/snapshot.test.ts` fails if a copied file is ever edited. The copy is type-checked under production's own compiler settings (`tsconfig.reference.json`); the Workshop loads it through a glob so this repository's strict program never checks production code. The Original Reference pane has its own sample story and **Scenes** (eighteen production surfaces, each opened through production's own control); the Development Reader and its controls are unchanged. The Card Workshop's locked reference keeps rendering exactly as before: its three borrowed files (`SystemBlock`, `FateResultCard`, `ManifestationImage`) moved into `card-workshop/reference/`, and `shared/alterFateLock.ts` and `shared/trackLibrary.ts`, which only the older copy used, were removed. `PRODUCTION_READER.md` lists everything production's Reader does, as the starting point for designing the Reader as one clear piece.
- **2026-10-01:** `InlineAudio.tsx`, `InlineAudio.css` and their tests moved to `src/audio/` and are published from `@seihouse/sen/inline-audio`, no longer from this entry. `ReaderViewport` imports them from there. Sound Cue rendering is shared by every SEN reader, and the HARNESS Reader now renders cues without reaching this folder.
- **2026-09-27:** The Reader stays outside the Library Shell. Library browsing screens now scroll inside the App Shell's fixed frame, but the Reader is immersive and its cinematic scrolling depends on the document scroller, so `library-shell/development/ReaderScrollBoundary.test.ts` guards that boundary. The overlay gate now listens for scroll on the Reader's real scroll surface (the document, or a host's inner scroller) instead of the prose container, which never scrolls; `findReaderScroller` is shared with the scroll-direction header.
- **2026-09-25 (Fate Phase 2):** The development Reader no longer carries the
  retired Fate Survival and Alter Fate (Branch) surfaces. Removed from
  `development/` and the SEN package: `AlterFatePanel` (the "linked copy"
  timeline fork, whose only handler was a Workshop `console.log`),
  `ReaderFateAlerts` (the genre-string–triggered banner with its hard-coded
  "DOOM DEADLINE: CHAPTER 7" countdown and Hardcore Fate banner), and
  `FateSurvivalExplanation`. The header Quick Action **Alter Fate** now calls
  the host's `onOpenFate`; the HARNESS Reader opens its Fate page there
  (see the Harness Generation README). Next at the newest chapter can now run a
  host action (`continueAfterLatest`, typed `ReaderContinueAction`): the
  bottom-bar Next and the end-of-chapter link name it (for example "Write
  Chapter 4" or "Direct Chapter 4"), show it running, report its error, and
  open the chapter it produced with the same scroll as ordinary navigation.
  Without one, Next still stops at the newest chapter; earlier chapters and
  swipes only navigate. The paragraph bookmarks became the first
  **Mind Palace**: `shared/mindPalace.ts` anchors each kept passage to the
  block's stable identity (`blockId`) and its exact canonical text (`passage`),
  so a passage whose block moved is still found, a block whose words changed is
  never mistaken for it, and bookmarks saved before anchoring are found again by
  their excerpt without guessing between copies. Save, note, remove and jump
  work as before; tapping a kept passage now opens its note with an explicit
  Remove instead of deleting it; a jump that can no longer find its passage says
  so instead of landing elsewhere. The bottom bar's placeholder "Comments"
  button is now **Mind Palace**, the drawer is titled Mind Palace, and kept
  passages get a quiet gold margin (`custom-bookmark-bg`, previously unstyled).
  The locked `reference/` replica is unchanged; `shared/alterFateLock.ts` now
  serves only it.
- **2026-09-25:** Audited the Development header against the mobile Reader preview.
  Its hide/reveal threshold now uses the Chamber's position within the actual
  scroller, so host content above the Reader cannot hide it prematurely. Open
  header controls keep it visible, and focus reveals it for keyboard users.
  Header buttons have 44px targets. SEN exposes an optional host accessory slot;
  the Library preview mounts Familiar recall there with reserved space, using a
  second row on narrow phones. Fullscreen reading retains the separate recall
  control because the Reader header is absent in that mode. Quick Actions now
  uses the shared anchored popover so Escape, outside dismissal, focus return,
  and narrow-screen placement work while the header is sticky.
- **2026-09-24:** Development Reader baseline on saved HARNESS stories. The
  Development Reader Chamber UI is unchanged; what changed is what sits behind
  it. `useReadingPosition` now saves and restores a semantic paragraph anchor
  (ported behavior from production `useReadingPosition`: debounced save,
  font-aware restore with a corrective pass), additionally saving when the
  reader switches chapters or leaves the page. Reader-owned state — place,
  last-read chapter, bookmarks, reader settings, read marks, and decorative
  reveal backdrops — is a portable SEN contract (`src/narrative/readerState.ts`,
  exported from `@seihouse/sen/reader-runtime`) persisted per story by the host
  (`src/host/reader/readerStateStorage.ts`, IndexedDB
  `seihouse-reader-state-v1`), independent of the HARNESS workspace. The host
  narration hook is now real browser speech (`src/host/reader/webSpeechNarration.ts`):
  play/pause/resume/stop, narrator/protagonist/side voices, speed, sentence
  highlighting and block focus, speaking the displayed text only. The Workshop
  fixture preview uses the same real narration and reading-position behavior.
  Chapter scroll-follow during narration (`useCinematicScroll`) remains inert.

- **2026-09-16:** Connected committed HARNESS Soundscapes and pack-resolved
  Sound Cues to Reader through the existing shared playback boundary. The
  Audio Menu exposes the chapter's resolved soundscape without autoplay, and
  failed optional audio leaves canonical chapter prose readable.
- **2026-09-16:** Corrected Reader translation ordering, account-default initialization, deterministic skill selection, complete skill/cache identities, glossary provenance, source-cue suppression, and safe Original fallback behavior.
- **2026-09-15:** Reused the neutral SEN arc-position type. Alter Fate presentation retains its existing Workshop contract; Arc Goal routing is not part of it.

- **2026-09-11:** Reused the source-owned SEN Settings mark in both Reader Settings entry and panel heading. Settings behavior, controls, and the locked reference remain unchanged.

- **2026-08-26:** Reconnected generated chapters through the public SEN card
  and Color Codes entries. `ReaderViewport` now takes `SystemBlock`,
  `CodexCard`, `CodexHovercard`, and their semantic registry through the same
  package boundaries as Card Workshop. Missing or unsupported Codex entities
  retain the intentional Unknown fallback rather than receiving the Main
  Character color, while current relationship state is still resolved on
  every render so ally-to-enemy changes repaint immediately. Card visuals,
  interaction behavior, accessibility palettes, narration, and the locked
  Reference remain unchanged.

- **2026-08-25:** Kept the compact Structured Mechanical card and restored the Narrative Expanded Info. The in-flow mechanical card remains the vitals preview (headline, level pill, meters, legacy rows) and its orb still opens `SystemStatusPanel` — the portaled `role="dialog" aria-modal="true"` status screen with corner brackets, the STATUS headline, class line, classification, LEVEL pill, semantic HP/QI/EXP meters, the full two-column stat grid with signed deltas, active effects, abilities, and any legacy rows. Everything else from the split is reverted: the Codex-shaped `expanded` payload, the `SystemPromptExpanded*` Reader-only types, the viewport-locked event report overlay, and `SystemConsequenceRow`'s `expanded` variant are all back, so the Narrative Notification orb is once again its Expanded Info action. `SystemOrbEmblem` stays its own module, now shared as the action form on both cards. Focus trap, scroll lock, Escape/close/backdrop dismissal, nested Codex hovercard Escape deferral, focus return to the orb, and the `data-reader-narration="excluded"` boundary hold on both dialogs. World Notices, Fate results, reduced-motion behavior, the semantic Color Code registry, and the locked Reference are unchanged.
- **2026-08-25:** Restyled the Development `SystemPromptMechanical` LitRPG display as a modern status screen on the approved reference: layered dark-emerald holographic glass with a controlled edge glow and corner ticks, a bright headline with muted flavor and classification lines plus a bordered LEVEL pill, semantic resource meters (HP red, QI blue, EXP gold through the existing Color Code registry) with `role="progressbar"` and full aria values, a two-column inset stat grid with signed gain/loss deltas in green and red, and active-effect and ability lines with muted labels and bright values. The layout is driven by a new optional, application-owned `status` payload on `RegularSystemEvent`, normalized at the Reader boundary by `normalizeSystemStatusScreen` and attached only to the mechanical route; mechanical events without it keep the legacy plain-rows grid and rarity pill. The TTS summary now rests collapsed by default behind the same small centered chevron toggle the Narrative card uses (`data-system-summary` / `data-system-summary-toggle`), and narration still reads only the block data, never the stats. Narrative Notifications, World Notices, Fate results, the expanded overlay, reduced-motion behavior, and the locked Reference are unchanged.

- **2026-08-25:** Audited the Development System Prompt family through the real Reader/Card Workshop path for accessibility, responsive fit, correctness, motion, long content, palette contrast, and rendering cost. Expanded reports now keep their title and 44px close action pinned while a single keyboard-focusable body region handles short-height or authored long-content overflow; the full-viewport backdrop blur is removed, focus remains trapped and returns to the orb for every report close path, and nested Codex Escape handling leaves the hovercard to close itself. The compact narration toggle is now a 44px target. Narrative, Mechanical, Fate, menacing, and rarity animation paths honor reduced motion; inert Mechanical and legacy panels no longer advertise click behavior through pointer cursors or hover scaling; and long unbroken headings, rows, statuses, sections, and World Notice details wrap without horizontal overflow. Rendered contrast checks passed unchanged across the default, protanopia, deuteranopia, tritanopia, and high-contrast-dark palettes. The visual direction, ReaderViewport integration, Workshop-local data boundary, TTS ownership, and locked Reference remain unchanged.

- **2026-08-24:** Consolidated the reusable System presentation boundary behind `resolveSystemPromptRoute`: `kind: "fate_system_prompt"` is the sole Fate route, while a regular `system_prompt` explicitly selects Narrative, Mechanical, or World Notice. The shared boundary now normalizes public Reader payloads before rendering, keeps `promptType` as semantic color only, and preserves the legacy shape fallback only for regular prompts with no authored presentation. `SystemBlock` delegates the Mechanical form to `SystemPromptMechanical`, World Notice remains the inert document renderer, and Fate Result remains the outcome-specific card. The `@seihouse/sen/reader-chamber` entry now exports the three component prop contracts plus route, payload-normalization, and shared-color helpers; direct World Notice and Fate Result consumers receive the same malformed-payload safety. No generation, persistence, TTS source, locked Reference, or source-comparison metadata changed.

- **2026-08-24:** Clarified regular System Prompt presentation into three explicit families without altering the two top-level kinds: `system_prompt` now selects `narrative`, `mechanical`, or `world_notice`, while `fate_system_prompt` remains wholly on its existing Fate Result route. `promptType` continues to own semantic meaning and color only; it no longer selects a layout for new prompts. The new Development `WorldNotice` is one static, diegetic document surface for direct headings such as `GUILD BOUNTY`, `WANTED NOTICE`, and `MISSION BRIEF`: a single entry reads as one notice and multiple entries as a divided board, with optional subdued flavor and labeled details. It has no links, controls, hovercards, focus behavior, or narration role; `StoryBlock.text` remains the sole TTS source. Legacy regular data with no presentation retains the prior shape-based fallback (row-only mechanical, otherwise narrative). The Reader Chamber fixture and Card Workshop selector add single-notice and mission-board examples; the compact Narrative Notification card, LitRPG holographic display, Fate card, locked Reference, and source-comparison date are unchanged.

- **2026-08-24:** The `CodexCard` Manifest seal's dragon loop now spins counterclockwise from the reader's point of view (same 24s period, `animation-direction: reverse` via `animate-[spin_24s_linear_infinite_reverse]`). The dark glass core holding the Manifest label and caption is a sibling of the rotating layer, so the center content stays fixed; the aura spin (26s), glows, hover/press states, Manifesting state, and reduced-motion backstop are unchanged.
- **2026-08-23:** The Manifest seal label now wears the same accent sheen as the inscribed name, but self-running instead of contact-only: a single bright band sweeps the glyphs every ~5s (`codex-seal-manifest-sheen` in `CodexCardSeal.css`, gated on `background-clip: text`), then rests in its plain signal color; the existing reduced-motion backstop stills the sweep at the rest position. Seal button behavior, dragon, aura, and Manifesting state are unchanged.
- **2026-08-23:** Refined the Development `CodexCard` eyebrow into an engraved-plate header band: the entity-type label is now flanked by two accent-tinted hairline rules that fade to transparent at their outer ends (decorative, `aria-hidden`, shrink gracefully at narrow widths), carries a faint accent glow, and steps up in size and spacing at `sm:` (10px→11px, `mb-2.5`→`mb-3`, longer rules). The label remains real selectable text in the entity's accent color; media, seal, inscribed name, description, and interactions are unchanged.
- **2026-08-23:** Moved the Development `CodexCard` eyebrow header (the entity-type label, e.g. `HUMAN PORTRAIT`) above the media area, so the type now leads the card before the manifested portrait or the Manifest seal. Media, inscribed name, description, spacing, styling, and interactions are unchanged.
- **2026-08-23:** Fixed the deployed mobile gray-color regression by separating the canonical accessibility palette variables into `shared/color-codes.css` and loading that authority from the Workshop entrypoint as well as the portable Reader stylesheet. Color Code consumers still resolve semantic meaning exclusively through `shared/colorCodes.ts`; the new global load guarantees those CSS variables exist before any lazy Reader, Codex, card, badge, link, or consequence surface renders, without adding literal-color fallbacks or changing any established palette meanings.
- **2026-08-23:** Consolidated the Reader and Codex color authority into shared `shared/colorCodes.ts`. It preserves the established System-event meanings and accessibility palette variables while extending them to Codex links, reveal cards, Portrait/Location/Faction/Artifact cards, Bestiary individual and threat badges, relationship nodes and status markers, Karma/mystery/timeline badges, affinity and power-stage charts, System badges/outcomes/trends/expanded reports, Fate Result cards, Fate Survival alerts and taxonomy, and the visible Story Seed Reference taxonomy. The visible legend is now named **Color Codes**. Current `relationshipToMC` data re-resolves on every render (including a stored Karma selection), so ally/enemy changes repaint rather than leaving stale card or graph accents; the separate numeric `StoryWorld.relationships` affinity graph retains its own neutral bands. `systemColors.ts` remains a compatibility re-export only.

- **2026-08-23:** Reworked the Development `SystemBlock` compact outcome row after review: the bottom half is now limited to two metadata slots separated by a clear `|` divider, and each slot splits into a neutral white subject plus a meaning-colored state word instead of one fully colored line (REALM ASCENDED reads white + green, TITLE STRIPPED white + red), so adjacent outcomes no longer blur together. Numbers leave the compact card entirely — a quantity label compresses to its subject plus Increased/Decreased from the direction (KARMA 15 → KARMA DECREASED, LIFESPAN 100 → LIFESPAN INCREASED) — while the expanded event report keeps the full outcome list with the exact signed figures (KARMA −15, LIFESPAN +100) and every lower-priority outcome the compact slots drop. `SystemConsequenceRow` gains a `compact | expanded` variant for the two renderings; the data contract, tone semantics, badge, key/value rows, classification line, TTS toggle, holographic panel, Fate results, and overlay structure are unchanged.
- **2026-08-23:** Refined the Development `SystemBlock` compact System Prompt layout after review: key/value facts are clean flat rows again with labels at the left edge and values (plus trend arrows) at the right edge, and badges are reserved for true status information — the event badge (e.g. Threat Assessment · Moderate) renders as one static full-width pill with the label at the left end and the severity value at the right end, so its size never varies with content. The bottom outcomes return to clean flat rows of meaning-colored text: `SystemPromptChange` gains an optional `tone` ("positive" green, "uncertain" yellow, "warning" orange, "negative" red) that defaults from `direction` (gain → positive, loss → negative), so INTEL GAINED reads green and DETECTION RISK: HIGH red, while signs still appear only on genuine mathematical changes. The compact classification line simplifies to its most useful term — the colored subtype (`✦ AWAKENING ✦`, `✦ ENEMY ✦`) — while the expanded overlay report keeps the full `category | subtype` classification. The overlay report, holographic mechanical panel, Fate results, TTS toggle, and entrance animations are unchanged.
- **2026-08-23:** Refined the Development `SystemBlock` compact System Prompt cards: main titles are now direct and immediately understandable at a glance (e.g. Cultivation Breakthrough, Karmic Consequence, Hostile Target Scan) with dramatic/world-specific language supported as secondary flavor (`system.flavor`). Meaningful existing metadata items (badges, rows with trend arrows, and outcomes) now render as dedicated metadata badges in a flexible wrapping container (`flex flex-wrap gap-1.5 md:gap-2`) rather than forcing into rigid single-line layouts or clipping. The compact layout was tightened to eliminate the empty vertical dead space left by the minimized TTS summary without adding filler content, keeping the resting card compact and sleek. The LitRPG mechanical panel, expanded overlay report, World Notice card, and entrance animations remain untouched.
- **2026-08-23:** Collapsed the compact System Prompt's bottom TTS sentence behind a small centered arrow toggle at the card's bottom edge. The muted gray serif line is hidden by default to conserve reader screen space and reveals in place on tap (the chevron flips while open); narration is unaffected because TTS reads the sentence from the structured block data (`StoryBlock.text`), never from its visibility. The toggle is a 44px keyboard/touch control with `aria-expanded`/`aria-controls`, and the expanded report overlay, outcome row, hierarchy, colors, and all other compact-card behavior are unchanged.
- **2026-08-23:** Restyled the Development `SystemBlock` compact System Prompt from the holographic window to the approved compact reference: a dark smoky, mostly opaque event-tinted surface (the `.system-window` recipe in `reader-chamber.css` is now a mild backdrop blur only — the scanline veil and brightness/saturation frost are gone), a thinner luminous border, smaller rounded corners, a restrained outer glow, and tighter padding and section spacing. The full-bleed tinted header band is replaced by a thin divider under the headline block, and the bottom TTS sentence is demoted to a smaller muted gray secondary layer so it reads as narration metadata instead of competing with the reader's prose; Codex-linked names keep their assigned character colors. The information hierarchy, outcome sign contract (signs only on genuine mathematical changes), outcome-row fit logic, trend arrows, badge severity treatment, Codex links, entrance/hover motion, menacing pulses, orb emblem, responsive behavior, holographic structured panel, Fate results, legacy fallback, locked Reference, and the viewport-locked expanded report are unchanged.
- **2026-08-22:** PR #151 review follow-up: the compact card's outcome-row wrapper now clips its own invisible full-width measurement mirror (`overflow-hidden`), so the mirror can never contribute to page scroll overflow regardless of ancestor overflow contracts; the `trend` row field is documented as application-owned (generation does not emit it yet and the normalizer drops it). Rendering, layout, and behavior are unchanged.
- **2026-08-22:** Review follow-up on the compact System window: the angled clipped corners are gone in favor of softly rounded pill corners, and the flat translucent pane is replaced by a holographic finish — the new `.system-window` recipe in `reader-chamber.css` (backdrop blur + brightness + saturation, the same family as the holographic panel, plus a faint scanline veil) keeps the tinted surface rich instead of muddy over reader content. Key/value rows now mark changed values with small direction arrows through the optional `trend: "up" | "down"` row field — green up for upgrades, red down for regressions, neutral facts unmarked — so a realm gain or a sealed record reads at a glance. The window layout, header band, dividers, outcome row, expanded report, structured panel, Fate results, legacy fallback, and locked Reference are unchanged.
- **2026-08-22:** Restyled the Development `SystemBlock` compact System Prompt from the nearly black card into a translucent colored System window. The fixed blue-black surface is gone: a bright accent rim and a tinted translucent pane — both driven by the event's assigned semantic System color through `currentColor` (gold Awakening, orange Karma, red Combat, green stable growth; blue remains the default new-info voice) — carry lightly clipped corners via the new `.system-window-clip` utilities in `reader-chamber.css`, a restrained outer glow, a slightly stronger full-bleed header band (`.system-window-clip-top` keeps its top corners inside the clipped outline), and simple tinted dividers. The metadata row now holds one to three short, genre-native System outcomes (the four-outcome cap is gone): plus/minus signs render only on genuine mathematical changes, with the direction's sign before the number (QI +200, KARMA −15, HEALTH −30%), while plain status outcomes (REALM ASCENDED, ABILITY UNLOCKED, TITLE ACQUIRED, PRESENCE EXPOSED, DETECTION RISK: HIGH) render unsigned; the measured fit logic still shows the third outcome only when all three fit cleanly, otherwise the first two. Layout, positioning, entrance/hover motion, Codex links, semantic text highlights, menacing pulses, the structured holographic panel, Fate results, legacy fallback, locked Reference, and the viewport-locked expanded report are unchanged. **Same-day revision:** the clipped corners and flat translucency were replaced by pill corners and the holographic `.system-window` finish (see the entry above); the outcome-row convention from this entry stands.
- **2026-08-22:** PR review follow-up on the expanded `SystemBlock` overlay: added vertical auto-scrolling with `max-h-full overflow-y-auto overscroll-contain` on the overlay panel as a resilient fallback for tall reader-supplied content without breaking the one-screen fit for standard fixtures; guarded backdrop clicks with `onPointerDown` tracking so text-selection drag releases starting inside the panel do not dismiss the report; updated `CodexHovercard` and `SystemBlock` to strip the `data-slot="codex-hovercard"` marker immediately when closing initiates so rapid second Escape keypresses close the report without waiting for the 0.15s exit animation; and wrapped Playwright test teardown in `try/finally` while selecting the first exact match for `event.value` locators.
- **2026-08-22:** Replaced the Development `SystemBlock` in-place expanded breakdown with a viewport-locked overlay event report portaled above the Reader Chamber. Tapping the orb opens one flat `role="dialog" aria-modal="true"` panel — classification line, headline, subject, optional severity badge, the signed consequence row, then flat Codex sections with simple dividers (the per-section stacked cards are gone) — capped to the three highest-priority sections on mobile via `hidden md:block` so one screen holds everything with no page or panel scrolling; larger screens show all sections in the same structure. The compact card no longer swaps content while open: rows, badge, consequence row, and prose stay put, so the chapter layout and reader scroll position never change, page scroll locks behind the dialog, and closing (Escape, close button, or backdrop tap) restores focus to the orb. The report root keeps the `data-reader-narration="excluded"` boundary and lives outside the reader DOM, so TTS still reads only the compact card's prose; an open Codex hovercard floating above the dialog defers Escape and closes first. The expanded data contract, holographic structured panel, Fate results, legacy fallback, and locked Reference are unchanged.
- **2026-08-22:** Corrected the compact System Prompt's color semantics so color communicates meaning instead of tinting content. The classification line now uses simple two-part wording (e.g. `✦ COMBAT | ENEMY ✦`, `✦ KARMA | CONSEQUENCE ✦`) from a new `getSystemCompactClassification` map in the shared System color module: the main category renders neutral gray and only the meaningful subtype carries the meaning's assigned color. Key/value row labels render neutral gray and ordinary values render white, the badge keeps a neutral label while only its severity takes color (Light yellow, Moderate orange, Severe red, Deadly as an inverted black pill with white text and a strong contrasting border, Unknown gray), and consequence signs keep their green/red direction colors with character names retaining their Codex colors in the prose. The full legend names remain the structured-panel and legend wording. The event identity tint (headline, border, glow, orb), expanded breakdown, holographic panel, Fate results, legacy fallback, and locked Reference are unchanged.
- **2026-08-22:** Reworked the Development `SystemBlock` compact regular System Prompt to the production information hierarchy. The card is now title-led — the per-event headline leads with the temporary orb emblem still at the right edge (the fixed SYSTEM kicker word retired), a small `✦ classification ✦` line from the existing semantic System color meaning sits beneath it, up to three concise key/value rows (`system.rows`, production panel anatomy) may follow, then the optional badge, then the non-scrolling signed consequence row — now with green `+` gains and red `−` losses over readable neutral labels — and the concise serif sentence (`content`, still the only text narration reads) moved to its own bordered bottom section, italic and centered per production, still flowing through the character-only Codex renderer. Compact routing is now keyed on consequences: events carrying `changes` (or no rows) render compact, while row-only events keep the holographic panel untouched — so dense mechanical readouts, rarity chips, generation assembler fixtures, and Reader Chamber preview events are unchanged. The measured consequence fit logic (mobile three-or-two, roomy four, no scrolling), the in-place expanded breakdown, Fate results, the legacy fallback, and the locked Reference are unchanged.
- **2026-08-22:** Added the expanded regular System Prompt presentation through the existing Development `SystemBlock` owner. The celestial orb now provides a 44px keyboard/touch disclosure action, keeps the compact card as the default, changes from the ✦ core to an upward chevron while open, and collapses back to the compact consequence row on a second activation. Expanded data is a Reader-only optional display extension containing a subject plus relevant Codex-style sections, values, progress, statuses, warnings, lore, and narrative consequences; every character string continues through `ReaderViewport`'s existing character-only Codex renderer. The short `StoryBlock.text` remains the sole TTS source, while the expanded region is explicitly presentation-only. Card Workshop supplies the three deterministic breakdown fixtures; chapter generation types, prompts, parsers, normalization, real Codex data, persistence, Fate results, structured mechanical rows, legacy fallback, and the locked Reference are unchanged.
- **2026-08-22:** Completed the compact System Prompt follow-up through the existing Development owners. `ReaderViewport` now resolves only character Codex terms inside System TTS prose and gives `SystemBlock` the existing `CodexHovercard` rendering, so a stored character keeps its novel-assigned color and opens its Codex details without extending this pass to other entity types. `BaseSystemEvent` gains an optional structured `badge`; the visible prose removes its matching label/value phrase while the original block `content` remains unchanged for TTS. The consequence row no longer scrolls: it measures its priority-ordered labels, shows three on mobile only when they fit cleanly, otherwise the first two, and permits a fourth only on roomy non-mobile layouts. Target Scan demonstrates all three refinements; structured panels, Fate results, legacy fallback, Reference, and shared audio playback remain unchanged.
- **2026-08-22:** Rebuilt the Development `SystemBlock` compact System Prompt around three parts: the fixed SYSTEM kicker with the temporary orb emblem shrunk beside it (no longer a large side element), a dramatic per-event headline rendered from `system.title`, the concise serif sentence from `content` — still the only text narration reads — and one horizontal bottom row of up to four prioritized signed consequences from `system.changes`. The single-column stack fixes the portrait-viewport layout: the text column now spans the card's full width at 390px, and the consequence row keeps one horizontal line by selecting fewer priority-ordered consequences whenever the available width is insufficient. The block keeps its Reader rhythm (`my-6 md:my-8`, `max-w-xl`), entrance/hover motion, per-`promptType` semantic palette over blue-black depth, and death-flag/iron-fate menacing pulses. Everything renders from structured props — the component hardcodes no event text. Events carrying mechanical `rows` keep the holographic panel, Fate results still route to `FateResultCard`, and the legacy string fallback and locked Reference replica are untouched.
- **2026-08-22:** Rebuilt the Development `SystemBlock` compact regular System Prompt to the approved reference design: the fixed SYSTEM label, one concise event sentence in reader serif, and one small signed metadata row beneath it carrying at most two structured changes, with the existing Codex orb (radial glow, glass sphere, dashed/dotted orbit rings, ✦ core) reused as the temporary System emblem at the right edge. The block keeps its Reader rhythm (`my-6 md:my-8`, `max-w-xl`) and entrance/hover motion, and stays on the per-`promptType` semantic palette — label, changes row, border, and orb inherit the event's accent through `currentColor`, with the approved reference's blue as the default new-info voice — over blue-black depth; death-flag and iron-fate events keep their menacing border pulses. Regular events carrying mechanical `rows` keep the existing holographic panel, Fate results still route to `FateResultCard`, and the legacy string fallback and locked Reference replica are untouched. The shared `BaseSystemEvent` contract gains the optional `changes: { direction: "gain" | "loss"; label }[]` field; generation prompts, the normalizer, and parsers were not wired to emit it.
- **2026-08-22:** Hardened the inline World Cue resting-state contrast and touch-target symmetry (`development/InlineAudio.css`): resting color lifted to `var(--color-neutral-450)` (Library muted-copy convention; holds ≥ 4.5:1 on the dark glass) and the `opacity: 0.68` multiplier removed so the effective contrast is the token's contrast regardless of the underlying panel/card; the `::before` hit-area expansion is now a symmetric 1-value `inset: -0.4em` shorthand (25.28 × 25.28 px at 16 px base, clearing WCAG 2.5.5) with `-0.5em` under `pointer: coarse` (28.48 × 28.48 px), so the left edge is as reachable as the right instead of essentially unreachable. Hover/focus/playing/error state colors and the `<LibrarySoundGlyph>` rendering are unchanged. Added `InlineAudio.styles.test.ts` (string-based CSS contract test) and wired it into the `test:inline-audio` script.

- **2026-08-21:** Published this feature as `@seihouse/sen/reader-chamber`. The entry barrel in `src/package/reader-chamber.ts` exports the `development/` chamber, its controls and surfaces, and the `shared/` reading model, and carries `reader-chamber.css` as a side effect so consumers no longer hand-import it. **Known gap:** `ReaderChamber`, `ReaderViewport`, and `ReaderControls/AudioMenu` still import the Workshop's mock application state directly (`shared/stubs`, `shared/trackLibrary`, `MOCK_VOICES`), so those mocks are bundled into the published entry today, not excluded from it — they're temporary DEV runtime dependencies this restructure carried over, and replacing them with a host-supplied store and audio catalog is follow-up work for production integration. The locked `reference/` replica is Workshop-only and is never published.

- **2026-08-20:** Removed the dialogue-audio annotation path from the Reader. Chapter prose carries Worldcues only: a voice annotation reaching the Reader is not playable and stays plain readable dialogue. Character speech is now a Reader Codex interaction, and the one shared audio owner is still the only playback path, so a Codex voice and a Worldcue can never overlap.

- **2026-08-19:** Completed the Phase 3 Worldcue boundary. Manifested audible-action intents are validated against application-owned block IDs and exact zero-based phrase occurrences, resolved by application logic to approved Library Cues, persisted on the accepted chapter result, and copied through batch and Reader adapters. The Reader now consumes only the selected chapter's block-scoped resolved annotations, so a cue cannot spread to another mention, chapter, legacy paragraph, or translation. Entity/Bestiary metadata alone creates no marker; atmosphere and System Panel audio keep their existing owners. Dialogue receives a permanent server-assigned character `voiceKey`, but no quote glyph renders until a playable server-generated artifact exists.
- **2026-08-19:** Refined inline World Cues into a typographic prose annotation: entity names retain their normal text or Codex highlight, while a circle-free `0.76em` `LibrarySoundGlyph` owns playback beside the phrase, uses an invisible expanded pointer target, keeps the final word and punctuation joined without preventing long names from wrapping, and gains a soft Library aura only while active. The Reader fixture now makes `Vermilion Debt Fox` sound-only plain prose while `The Azure Ring` keeps its orange Codex action plus the independent cue mark. Removed the retired card presentation, Reader render branch, generation contract, Workshop presets and adapter, dedicated fixtures/tests, and exclusive shared types/stubs. Codex Cards, System Panels, the one shared audio owner, and Development-only cue annotations remain intact.
- **2026-08-19:** Added Phase 2 inline audio to the Development Reader: catalog-gated `sound` actions, provider-neutral future `voice` actions, and user-only loading/playing/error behavior through the existing `@seihouse/audio-player` session. Five real beast, weapon, artifact, location, and faction cues sit in controlled Chapter 1 prose outside persisted StoryBlock data.
- **2026-08-18:** Review follow-up: the Development `CodexCard` dragon seal now applies its cyan and violet glows as valid chained filter functions in base, hover, and press states. Interaction, layout, and reduced-motion behavior are unchanged.
- **2026-08-18:** Manifest backdrops are real art again in Development: the `CodexCard` fallback backdrop pool moved from the five hot-linked public R2 `LIBRARY BACKDROPS` URLs to the published "IMMORTAL LAND" revelation landscapes, downloaded into `public/manifest-backdrops/` and owned by the new shared `reader-codex/development/codexManifestBackdrop.ts`. `CodexCard` re-exports the pool under the established `FALLBACK_BACKDROPS` / `getFallbackBackdrop` names, so `ReaderViewport` assignment, the Card Workshop fixtures, and the reveal rendering are untouched. The locked Reference `ReaderViewport` keeps the production R2 list.
- **2026-08-18:** Reimagined the Development `CodexCard` Manifest seal as the dragon itself: the circular glass orb, dashed/dotted orbit rings, and accent core glow were replaced by an enlarged `LibraryDragonCycleIcon` — the shared Library cycle glyph, reused unchanged — that forms the entire portal boundary. Two stacked `currentColor` copies with a vertical mask tint the silhouette cyan→violet, wrapped in a slow-turning blurred conic aura in the Library portal spectrum (`#04ACFF → #7C5CFF`), around a dark glass core that now holds both the Manifest label and the "Awaken Portrait" caption (previously a separate line beneath the seal). The seal remains one real keyboard-operable `<button>` with the same `onManifestReveal` callback, a Manifest/Manifesting aria-label swap, and a disabled Manifesting state (also `aria-busy` with a lit aura); hover and press brighten the aura and the dragon's glow. The aura spin and the dragon's motion rest fully under `prefers-reduced-motion`. The preview mock gains one artwork-less eligible reveal (the "Stair of a Thousand Debts" location, chapter 1) so the unmanifested seal renders in the Reading state and in Compare. Portrait media, eyebrow, inscribed name, description, glass surface, ambience, accent resolution, reveal routing, and card layout are unchanged. **Same-day refinement:** the aura's conic gradient now carries two diametrically opposed bright bands so the blurred glow reads centered through the whole spin (the single bright band pooled to one side); the dragon now rotates slowly (24s/rev) instead of the barely-visible scale breath, so the `codex-seal-breathe` keyframes are gone and `CodexCardSeal.css` is the reduced-motion backstop only; and the pending state is renamed "Manifesting..." with a small spinning `LibraryDragonCycleIcon` in place of the generic lucide spinner.
- **2026-08-18:** Gave the Development `CodexCard` title an "Inscribed Name" treatment (`development/CodexCardInscription.css`, imported by `CodexCard.tsx`): the entity name settles ~6px into place as the card reveals, a thin frayed-thread SVG underline in the entity's ambient accent draws itself outward from the center and holds, and a faint glint periodically travels the thread; pointer-fine hover lifts the name, opens tracking slightly, and passes a single accent sheen across the glyphs. Motion wakes on the card's own reveal (`onViewportEnter` / SEN `isRevealed`) and rests fully under `prefers-reduced-motion`; the name remains real selectable text. Portrait, eyebrow, flavor text, glass surface, seal, layout, and reveal behavior are unchanged.
- **2026-08-18:** Removed the "Reveal · " prefix from the `CodexCard` eyebrow header in Development so the card displays the entity type directly (e.g. `HUMAN PORTRAIT`, `NON-HUMAN PORTRAIT`, `ARTIFACT`, `LOCATION`) without repetitive reveal wording. Styling, spectral-glass treatment, seal behavior, and entity classification are unchanged.
- **2026-08-18:** PR review follow-up on the spectral-glass `CodexCard`: suppressed the `LibraryCard` accent hairline on this card (`after:!content-none`) so no solid accent line crosses the top edge — the entity accent still speaks through the aura, motes, seal, and eyebrow. The artwork state no longer letterboxes inside a fixed 180px square; the media frame is now full-width at the image's natural aspect (`block w-full h-auto`), matching the hovercard's media behavior. Glass recipe, seal, ambience, and behavior unchanged.
- **2026-08-18:** Reimagined the Development `CodexCard` with the approved Library spectral-glass treatment, adopting the full `LibraryCard` glass skin the card was rebuilt for on 2026-08-15: translucent black-blue depth, top-light falloff, inner rim lighting, the masked 1px spectral edge, and an entity ambient accent (via `accentColor`) resolved from the entity's own identity rules (`reader-codex/development/codexEntityAccent.ts`). A sparse spectral mote field (`reader-codex/development/CodexCardAmbience.tsx`) sits under the content, the flat min-height and dead space are gone, and the Manifest trigger is now the circular seal itself — orbit rings, star, and Manifest label preserved, "Awaken Portrait" caption beneath — rather than a rectangular button. Reveal routing, backdrop assignment, Manifest/Summoning callbacks, entrance behavior, typography, and the LibraryCard region contract are unchanged. The highlighted-term card path now imports the new Development `CodexHovercard` fork (`reader-codex/development/CodexHovercard.tsx`); the locked Reference fork keeps the shared copy.
- **2026-08-17:** Fixed the real highlighted-term Codex card path used by `ReaderChamber`: mobile and tablet cards now dock at the safe upper viewport edge with a smaller phone width and a scrollable height cap that leaves most novel text visible; desktop cards retain contextual word placement with viewport-edge clamping. Card media now follows the complete artwork's natural aspect ratio so the image and rounded frame corners align without cropping. Portal keyboard focus/Escape behavior was restored. No Reader routing, Codex data, card content, or visual skin changed.
- **2026-08-17:** Replaced the Reader-specific preview menu shell with `FeatureWorkspace` Workshop Controls. Reader page shortcuts, deterministic reading/menu states, chapter selection, themes, and particles now use the shared Pages / States / Effects structure while continuing to drive the real Reader controls and one shared mock story. Reader Chamber navigation and component behavior were not changed.
- **2026-08-15:** Rebuilt the active Development `CodexCard` on the shared `LibraryCard` region structure without changing the Reader reveal's presentation or flow. Existing media/backdrop, Manifest/Awaken action and Summoning state, entrance/hover behavior, typography, spacing, and routing remain intact; no generic LibraryCard visual treatment has been adopted.
- **2026-08-14:** Limited visual Codex Cards to Human Portraits, Non-Human Portraits, Artifacts, and Locations, kept System/Fate content on System Panels, and removed the end-of-chapter Chapter Visual Memory render and trigger.
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
reference/                    — production's Reader, copied unchanged (owner request, 2026-10-07)
  light-novels/src/           — Light-Novels src/ @ 647165a, same paths: components/ReaderScreen.tsx,
                                ReaderChamber.tsx, ReaderViewport.tsx, ReaderControls/, codex/,
                                hooks/, lib/, contracts/, utils/, types.ts … (119 verbatim files)
                                plus 8 marked WORKSHOP SEAM stand-ins at production's own paths:
                                store/useAppStore.ts, store/useGenerationStore.ts, lib/firebase.ts,
                                lib/storage.ts, lib/persistence/index.ts, lib/rag.ts,
                                lib/media/mediaAssetClient.ts, lib/media/privateMediaResolver.ts
  host/                       — the Workshop's stand-in for production's App around the Reader:
                                ProductionReaderHost.tsx (page frame, footer, Codex sheet, error
                                toast, shortcuts, audio; simulated story-engine actions),
                                workshopStory.ts (sample story in production's shapes),
                                productionApiGuard.ts (answers production's AI routes locally),
                                firebaseAuth.ts (the `firebase/auth` stand-in),
                                production-reader.css (production's src/index.css, scoped)
  snapshot.json               — source commit and every file's fingerprint
  snapshot.test.ts            — fails if a copied production file changes
development/                  — active Workshop version; started as an exact copy of the older reference
  (same files, except: ReaderSettings.tsx replaces ReaderPreferencesPanel.tsx;
   ReaderControls/ no longer contains ImmersionSettings.tsx or
   ChapterNavigation.tsx; AudioWidget.tsx, AlterFatePanel.tsx,
   ReaderFateAlerts.tsx and FateSurvivalExplanation.tsx were removed;
   the Phase 3 prose primitive InlineAudio now lives in src/audio — see
   history)
shared/                       — code genuinely identical between the two forks
  types.ts                    — ReaderChapter + composing types, StoryBlock/metadata/SystemEvent/
                                FateResultData, StoryCuePayload, ContextManifest,
                                ReaderPreferences, StoryWorld + Codex entities, StoryArc, Bookmark,
                                and production-narrow Reader/Codex story patch contracts
  batchToReaderAdapter.ts     — immutable disposable accepted single-chapter and exact-five batch Reader/Codex session boundary
  reader-chamber.css          — reader-specific classes/vars/keyframes extracted from source
                                src/index.css (imported by the preview Workspace)
  stubs.ts                    — mock external store (useAppStore + selectIsGenerating, no
                                zustand), LOCAL_ONLY_MODE, inert hook stubs, inert audio engine
  readerPlayback.ts           — pure extractSFXCues (verbatim) + inert useReaderPlayback
  id.ts, readerTypography.ts, readerLegend.ts, colorCodes.ts,
  systemColors.ts (compatibility re-export),
  dialect.ts, autoCuePolicy.ts, manifestationEligibility.ts,
  cinematicScroll/anchors.ts, effects/cinematicEffectGovernor.ts
                            — pure libs copied (near-)verbatim from production
```

The card is `src/workshop/previews/reader-chamber/ReaderChamberWorkspace.tsx`.
The Original Reference loads `reference/host/ProductionReaderHost.tsx` lazily with its own
sample story and Scenes (`productionScenarios.ts`). Development is the app's Reader
(`AppReader.tsx`) on the owner's Sundered Heavens test (`sampleStory.json`, opened by
`sampleStory.ts`), with the scenes in `readerScenes.ts`; see "Available preview states".
The older development Reader in `development/` is no longer on this card.

## Original Reference: production's Reader

Copied 2026-10-07 from SENSEIDUKES/Light-Novels `main` @ `647165a` (2026-09-16), the
latest production commit: the Reader screen and everything it imports, followed from
five entry points production mounts together — `ReaderScreen` (top bar, recap,
steering hand-off, Lore Glossary, and the chamber), `CodexSheetOverlay` (production's
Living Codex), `KeyboardShortcuts`, `ParticleSystem` and `AtmosphericAudio` (the
reader's music, atmosphere and story-cue conductor). The files keep production's paths
under `reference/light-novels/`, so every relative import is production's own.

- **Unchanged:** 119 files, byte-identical to production. `snapshot.json` lists each with
  its production SHA-256 and `snapshot.test.ts` re-checks them on every test run.
- **Seams:** 8 files at production paths stand in for production services; each starts
  with a `WORKSHOP SEAM` header naming what it replaces. `firebase/auth` (one import in
  `ReaderScreen`) resolves to `host/firebaseAuth.ts` through `vite.config.ts` and
  `tsconfig.reference.json`, for this folder only.
- **Styles:** production's `src/index.css` is reproduced as `host/production-reader.css`,
  generated rather than hand edited: every rule is scoped to `.production-reader-frame`,
  keyframes carry an `ln-` prefix, and production's colour tokens (including its lighter
  neutral, gray, zinc, slate and stone shades) are re-applied on the frame, with the
  Workshop-only tokens production never had (such as `gold-accent`) unset there. Fonts are
  the same Google Fonts both repositories load.
- **Type checking:** `npm run typecheck` checks the copy under production's compiler
  settings (`tsconfig.reference.json`, not strict) after this repository's strict check;
  `tsconfig.json` leaves the folder out, and the Workshop imports the host through
  `import.meta.glob`, so the strict program never follows into it.
- **Page frame:** `host/ProductionReaderHost.tsx` reproduces what production's
  `src/App.tsx` puts around the Reader: the page frame and star field, the
  `motion` wrapper, the footer, the Codex sheet, the error toast from
  `ModalsAndToasts.tsx`, keyboard shortcuts and the audio conductor. Production's global
  header (app navigation) is not part of the Reader and is not included.
- **Inventory:** [`PRODUCTION_READER.md`](./PRODUCTION_READER.md) lists every feature and
  option of this Reader by the job it does, with what is duplicated, unfinished, fixed to
  one genre or looks wrong, as the starting point for the redesign.

## What stands in for production

### Original Reference

- **App state** (`store/useAppStore.ts`): a zustand-compatible store holding only the
  fields the Reader, Codex and shortcuts read, with production's setter behavior and
  production's own `updateStory` rules. `selectIsGenerating` keeps production's definition.
- **Story storage** (`lib/storage.ts`): chapter bodies live apart from the story, as in
  production; the Reader loads each one through `storyStorage.getChapterContent`.
- **Sign-in** (`lib/firebase.ts`, `host/firebaseAuth.ts`): always production's local-only
  mode, signed out, so the sign-in gate never appears.
- **Persistence** (`lib/persistence/index.ts`): the Lore Glossary, profile saves and the
  image quota answer from memory.
- **Media** (`lib/media/*`): a manifested portrait is kept in memory and shown from its
  own URL.
- **Embedding search** (`lib/rag.ts`): the steering screen gets the latest chapter
  summaries in order instead of a vector search.
- **Direct AI routes** (`host/productionApiGuard.ts`, while the Reader is on screen):
  steering suggestions, the Codex glossary and portraits return sample answers in
  production's response shape; translation and voice cards return the error production
  shows when those services are down; anything else under `/api/foundation/` or
  `/api/persistence` is refused. Every other request passes through untouched.
- **Story-engine actions** (`host/ProductionReaderHost.tsx`): mark read, seal and Codex
  memory edits work for real; the continuity check returns two sample warnings; writing
  a chapter streams a sample chapter in; steering adds three unwritten chapters;
  Alter Fate and five-chapter writing show a Workshop notice describing what production
  would do.
- **Sample story** (`host/workshopStory.ts`): "Ashes of the Ninth Meridian" in
  production's own shapes, six chapters each exercising a different part of the Reader
  (see the file header), with characters, factions, places, artifacts, a technique,
  karma and relationships, two bookmarks and a Lore Glossary.

### Development preview

Development is the app's Reader, so nothing in it is replaced; only the services the
app hands it differ (`src/workshop/previews/reader-chamber/`):

- **Story storage:** an in-memory `HarnessGenerationRepository` holding the scene's copy
  of the story, where the app keeps stories in the browser's IndexedDB.
- **Reading place:** an in-memory `ReaderStateRepository`, opened on the scene's chapter.
- **Writer:** `createReplayWriter` answers each chapter request with the reply that
  chapter was written with, after about five seconds, and calls no model. It plans no
  arcs and runs no Holdings fixer.
- **Skills, media and preferences:** the official CAPA skills installed in memory as the
  app installs them, the Library's base media, the app's soundscapes, and the
  Workshop's own reader preferences (`workshop.reader.`), apart from the app's. Music
  and sound play through the Workshop's one host mixer.

### The older development Reader (no longer on this card)

It ran on these stand-ins, which stay for the previews that still use its parts:

- **`useAppStore` / `selectIsGenerating`** — a tiny external store on
  `useSyncExternalStore` (no zustand), exposing the same call signatures
  (`useAppStore(selector)` + `useAppStore.getState()`). All setters genuinely update
  state, so reader mode, immersion toggles, fullscreen, read/unread, bookmarks,
  preferences, and the audio mix visibly work.
- **Story data** — one mock `StoryWorld` ("Ashes of the Ninth Meridian", genre
  `Fate Survival`) with 4 chapters:
  1. rich structured-`blocks` chapter (breakthrough System Panel, Fate Result card,
     inline Sound Cues, soft continuity notes, Context Inspector manifest);
  2. long legacy `generatedContent` prose chapter with a hard Timeline Divergence
     banner and a legacy `[bracket]` system line;
  3. sealed chapter that is also a death/critical scene (menacing red chamber
     shading + corruption system block);
  4. empty chapter with no content ("Unmanifested Segment").
  Plus two bookmarks and default `readerPreferences`.
- **Hook stubs** matching the active destructured shapes: `useReaderVisuals`
  (collects Codex terms from local story memory), `useCinematicScroll`
  (idle/following/yielded), `useAudioMix` (settings are real state,
  no sound), `vibrate` (no-op), `LOCAL_ONLY_MODE = true`. Since 2026-09-24,
  narration (browser speech) and `useReadingPosition` are real in every host,
  including this fixture; the fixture's story store remains an in-memory mock.
- **`onSwitchTab`** — the Reader Chamber's existing Codex control opens the migrated
  production-style `CodexSheetOverlay` over the still-mounted Reader. The direct
  `?preview=reader-codex` workspace also exposes Reference, Development, and Compare.
- **Preview-state UI actions** — `preferences-open`, `bookmarks-open`,
  `alter-fate-open`, and `continuity-warning` click the real in-chamber buttons
  (by accessible label) after remount, exercising the production interaction path.
- **Reveal backdrop assignment** — `updateStory` runs against the mock store, so
  `assignedRevealBackdrops` writes are local and harmless.

## Available preview states

**Scenes (Original Reference)** — production's own Reader, each scene reloading the
sample story and opening its surface through production's control:

- Reading: Chapter 1 (System panels, World Card, reveals), Chapter 3 (dialogue and a
  continuity note), Chapter 4 (older prose chapter with hard continuity warnings),
  Chapter 5 (sealed death-flag chapter), fullscreen reading
- Panels and settings: Reader Settings ("Aetherial Styles"), Immersion settings,
  Bookmarks ("The Chronicle Anchors"), Lore Glossary, Codex sheet, keyboard shortcuts
- Story moments: Alter Fate (Branch), sealing a chapter (Continuity Guard), Chapter 6
  unwritten (write it), a chapter being written, the welcome-back recap, steering the
  next arc, a Fate Survival story

**States (Development)** — where the reader is in the story. Each scene starts from a
fresh copy of the story; switching between Development and Compare keeps what happened
in it until another scene is chosen.

- **Chapter 1** — all eight chapters written; the Reader opens on Chapter 1
- **Chapter 4** — the middle of the story
- **Write Chapter 8** — Chapter 8 not written yet: the Reader opens on Chapter 7, and
  Write Chapter 8 writes it again from its saved reply behind VERSA's writing screen
- **Chapter 8, the newest** — Rewrite writes it again from the same reply; Write
  Chapter 9 shows the Reader's message when the writer cannot help
- **Story start** — no chapter yet; Write Chapter 1 writes it from its saved reply

**Pages (Development)** — Fate, Holdings and Reader Settings, each opened by pressing the
Reader's own button. The story stays as it is.

**Advanced (Development)** — open a story saved with the app's Export story; the scenes
follow its chapter count. The file stays in the browser tab.

### The older development Reader's states (no longer on this card)

These drove the older development Reader until 2026-10-09; its scenario list
(`previewStates.ts`) left with it. Each scenario carried a `category` field that
mapped it into the canonical section list:

- **`pages` (old)** → **Pages** section — alternate Reader Chamber states and full-screen conditions.
- **`reading` (old)** → **States** section — normal reading states and reading setup.
- **`menus` (old)** → **States** section — opened panels, drawers, and overlays.
- **`effects` (old)** → **Effects** section — preview-only theme and particle controls
  (no Reader scenario is currently assigned; the section renders when a feature supplies
  Effects content).

So in the shared menu the **States** section surfaces both the former Reading and Menus
lists under one canonical heading, while **Pages** and **Effects** keep their old roles.
Theme and particle controls (the old Effects list) still render under the canonical
Effects section when supplied.

**States — Reading** — normal reading states and reading setup

- `reading` — rich blocks chapter 1 (System Panels, Fate Result card, inline Sound Cues,
  Context Inspector, legend)
- `fullscreen` — header hidden; click prose to toggle back
- Chapter selector (1–4)

**States — Menus** — opened panels, drawers, and overlays

- `preferences-open` — Reader Settings panel expanded
- `bookmarks-open` — Mind Palace button opening the kept-passage drawer (two passage cards)

**Pages** — alternate Reader Chamber states and special full-screen conditions

- `auto-scroll-paused` — resume-reading pill (rendered at the chamber bottom, as in production)
- `generating` — chapter 4 with skeleton pulse placeholder
- `translating` — "Translating the Heavenly Dao…" spinner
- `empty-chapter` — "Unmanifested Segment" with Manifest buttons
- `death-scene` — sealed chapter 3 with menacing red shading + death flag block
- `continuity-warning` — Seal flow surfacing the Continuity Guard Warning modal

**Effects** — preview-only visual and immersive controls (theme + particles render here
when supplied; no Reader scenario is assigned, see the category mapping above)

- Theme selector (void/crimson/abyss/sepia/emerald via `readerPreferences.themeOverride`)
- Particle intensity (off/low/default/high via `readerPreferences.particleIntensity`)

All of these are Workspace-only controls, never inside the reusable components. When the
active state belongs to a category that is not on screen, the panel names it on a footer
line so the current state is never ambiguous.

## Reusable Workshop dependencies

- `FeatureWorkspace` + one `manifest.ts` entry (`reader-chamber`, category `reader-ui`)
- Existing `@theme` tokens in `src/styles.css` (fonts, portal/void/signal/human/gold-accent)
- Existing client-safe `src/audio/libraryCues.ts` / `inlineAudio.ts` contract and
  the one `DevAudioPlaybackProvider` backed by `@seihouse/audio-player`
- `lucide-react`, `motion/react` (already installed)

## Production dependencies intentionally excluded

Neither pane reaches production: no Firebase, Data Connect, IndexedDB storage manager,
media upload service, embedding search, quota charging, AI generation or translation
call. The Original Reference replaces those at their own paths (see “What stands in
for production”); the Development preview runs the app's Reader on in-memory storage and
a writer that replays saved chapters.
Public media still loads as it does in production: the Original Reference's reveal
backdrops come from production's public R2 bucket, and its music, atmosphere and cue
sounds from SEIHouse's public audio host.

## Exact copy

Nothing was dropped or rewritten in the Original Reference: no unused imports were
removed and no icons were substituted. Every icon production imports exists in this
repository's `lucide-react`, and production's strict-null patterns are checked under
production's own compiler settings.

## Known visual differences from the source

### Original Reference

- **Surroundings:** production's global header (app navigation) sits above the Reader
  in production and is not included; the Workshop's own chrome sits around the frame.
  Production screens outside the Reader (story detail, home, creator, profile) show a
  Workshop placeholder with a way back, for example after Back or a shortcut key.
- **Audio engine:** the reader's music and atmosphere run on this repository's
  `@seihouse/audio-player` 4.0.0, which still offers production's `createSceneMixEngine`;
  production pins an earlier commit of the same package.
- **Sample content:** the story, portraits and landscapes are Workshop material;
  manifested portraits, steering suggestions, the Codex glossary and written chapters
  are sample answers, so their wording is not what production's writers would produce.
- **Simulated actions:** Alter Fate's timeline fork and five-chapter writing are
  described in a Workshop notice rather than run; translation and voice cards show
  production's service-down error.
- **The separate Reader Codex Workshop entry** still shows its older adapted Codex copy;
  the Codex sheet opened from this Reader is production's.
- **Compare:** the two panes no longer share a store, so they no longer navigate in
  lockstep; both bottom bars are viewport-fixed and overlap.

### Development

Development is the app's Reader, so it looks as the app does, with these differences:

- **Writing is a replay:** a chapter takes about five seconds instead of the writer's
  real time, and only chapters the story already has can be written.
- **World Info** (behind Back) has no Library Shell around it; in the app it sits in the
  shell.
- **Media hosts:** SEIHouse's media and audio hosts must be reachable for icons, sound
  and music, as in the app.

### The older development Reader (no longer on this card)

- **Codex service actions are local** — the migrated UI, navigation, edit controls,
  caches, dialogs, and responsive layouts are present, but live AI/media generation,
  authentication, quota charging, and remote persistence do not run in the Workshop.
- **Alter Fate opens the host's Fate page** in development; production's branch panel
  lives in the Original Reference. The migrated Codex context dialog uses
  `react-focus-lock` like production.
- **Audio is intentionally partial** — the mixer's music, atmosphere, and
  narration remain inert. Only valid persisted Worldcues play, through the
  single shared DEV audio session and only after their own tap target is used.
- **No TTS sync highlighting** — `activeChunks` is always empty, so the
  portal-colored narration span and `reading-focus-*` classes never activate;
  the play/pause vinyl still flips and spins.
- **Neutral/gray/zinc/slate/stone shade drift** — production lightens
  `--color-neutral-500/600/700` and the gray/zinc/slate/stone 500–700 ranges; the
  Development Reader uses the Workshop tokens, so some muted text renders a shade
  darker, and `text-gold-accent` resolves here where production falls back to the
  inherited colour. (The Original Reference re-applies production's tokens.)
- **The development Reader no longer reacts to a genre string**; production's Fate
  Survival banner renders in the Original Reference for a story whose genre is
  literally "Fate Survival".
- **Chapter Visual Memories are removed** — the Reader no longer renders a chapter-hero component or invokes an end-of-chapter image trigger. Existing chapter media data is left intact for compatibility and Manga Studio is unchanged.
- **R2 backdrop URLs** — Development resolves `FALLBACK_BACKDROPS` /
  `getFallbackBackdrop` from `reader-codex/development/codexManifestBackdrop.ts`, whose
  pool is the five local "IMMORTAL LAND" Manifest landscapes in
  `public/manifest-backdrops/`; the Original Reference keeps production's five public
  R2 URLs.

## Implementation inventory

The packages and NovelExpanded app built here are the destination. Keep Workshop
controls, fixtures and adapters outside reusable package entries; another repository
changes only when the owner asks. Historical references stay untouched.

The existing local files named by this inventory are:

- `development/ReaderChamber.tsx`
- `development/ReaderViewport.tsx`
- `src/audio/InlineAudioView.tsx`
- `development/ReaderHeader.tsx`
- `development/ReaderSettings.tsx`
- `development/CosmicBookmarksPanel.tsx`
- `development/ParticleSystem.tsx`
- `development/SystemBlock.tsx`
- `development/SystemPromptMechanical.tsx`
- `development/SystemStatusPanel.tsx`
- `development/SystemOrbEmblem.tsx`
- `development/WorldNotice.tsx`
- `development/FateResultCard.tsx`
- `development/CodexCard.tsx`
- `development/CodexCardInscription.css`
- `development/CodexCardSeal.css`
- `shared/mindPalace.ts`
- `development/SystemColorLegend.tsx`
- `development/ContextInspector.tsx`
- `shared/reader-chamber.css`
- `src/audio/inlineAudio.ts`
- `shared/stubs.ts`
- `shared/types.ts`
- `src/workshop/previews/reader-chamber/`

## Compatibility notes

- The chamber root uses `overflow-clip`. `overflow-hidden` creates a scroll container
  that disables the header's `position: sticky`; `clip` preserves clipping and the
  sticky header's scroll-direction hide/show.
- Header Back falls back to `window.history.back()` when no `onBack` is supplied.
- Reader Settings owns the Audio section; the header Audio button opens it and
  `AudioMenu` retains the master switch and volume.
- The Original Reference keeps production's imports exactly; it mirrors Light-Novels'
  `src/` so `../lib/…`, `../hooks/…`, `../store/…` and `../types` resolve as they do in
  production, with production's services replaced at those same paths.
- `ReaderViewport.tsx` uses index access rather than `chapterNumbers.at(-1)` for
  the Workshop's ES2020 compatibility. Reader Chamber's `cue.danger ?? 0` coercions
  and `handleUpdatePreference` cast are behavior-identical strict-null adaptations.
- `ReaderCodexStoryPatch` in `shared/types.ts` mirrors the intentional field allowlist,
  preventing Reader/Codex callbacks from overwriting unrelated story fields.
- The `onOpenFate` callback is host-owned. Historical Fate panels and their source
  wording remain in the reference; they are not reconnected or retired by this work.
- `getReaderChamberSurfaceClass` is a Card Workshop presentation seam, not a public
  application API. `shared/stubs.ts`, fixture types and Workshop previews remain local
  compatibility material.
- `soundCues` are chapter-owned SEN `SoundCueAttachment` records. Placement,
  accepted-result persistence, Reader adaptation and block-scoped rendering belong
  together; preview fixtures are not story data.
- The System presentation helper keeps one route and semantic-color contract for
  its four presentation consumers. `mindPalace.ts` supplies anchored passages for
  `CosmicBookmarksPanel` and `ReaderViewport`.
- Codex Card name/seal styles belong with `CodexCard.tsx`; the seal uses the existing
  Library foundation and `LibraryDragonCycleIcon`. The provider-neutral Inline Audio
  contract requires a host-approved catalogue and media resolver.
- Aliased lucide imports remain supported by the current `lucide-react` dependency.

### 2026-09-06 — Library UI ownership migration

Reusable presentation now comes from the canonical Library UI package. Portable SEN surfaces resolve presentation through the host provider; the first-party Workshop supplies LibraryPresentationProvider. Domain, generation, persistence, media, and locked reference sources are unchanged.

### 2026-09-20 — Library Familiar host preview

The Development preview composes the reusable floating Library Familiar around
the Reader canvas. It supports dragging and authoritative Energy inspection in
normal and fullscreen reading states. The portable SEN Reader and locked reference
have no Familiar dependency; production should mount it once in the Library app
shell. See [Familiar transfer notes](../familiar/README.md).
