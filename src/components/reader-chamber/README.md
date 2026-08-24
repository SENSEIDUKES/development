# Reader Chamber

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/ReaderChamber.tsx` and `src/components/ReaderViewport.tsx` (verified on `origin/main` @ `f89cb41`)
- **Workshop preview:** `?preview=reader-chamber`
- **Replica created:** 2026-07-31
- **Last Workshop update:** 2026-08-23
- **Last source comparison:** 2026-08-22
- **Replica status:** under refinement

## Workshop history

- **2026-08-24:** Refined the Development `CodexCard` Manifest seal's dragon emblem. The dragon loop now turns counterclockwise from the reader's point of view (`animate-[spin_24s_linear_infinite_reverse]`) while the glass core and its Manifest content stay fixed, and it carries the redrawn `LibraryDragonCycleIcon` silhouette — tapered curved tail, sharper brow, narrower eye, defined snout and jaw, natural neck transition, and subtler swept back spines. Card layout, text, colors, the aura and glow treatment, the cyan→violet mask, the Manifesting state, and the manifestation flow are unchanged.

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
  CodexCard.tsx
  ReaderFateAlerts.tsx
  FateSurvivalExplanation.tsx
  SystemColorLegend.tsx
  ContextInspector.tsx
development/                  — active Workshop version; started as an exact copy of reference/
  (same files, except: ReaderSettings.tsx replaces ReaderPreferencesPanel.tsx;
   ReaderControls/ no longer contains ImmersionSettings.tsx or
   ChapterNavigation.tsx; AudioWidget.tsx was removed; InlineAudio.tsx and
   InlineAudio.css add the Phase 3 prose primitive — see history)
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
  id.ts, readerTypography.ts, readerLegend.ts, alterFateLock.ts, colorCodes.ts,
  systemColors.ts (compatibility re-export),
  dialect.ts, autoCuePolicy.ts, manifestationEligibility.ts,
  cinematicScroll/anchors.ts, effects/cinematicEffectGovernor.ts
                            — pure libs copied (near-)verbatim from production
  trackLibrary.ts             — static TRACK_LIBRARY catalog for the Audio Menu (display only)
```

Both forks render inside `src/workshop/previews/reader-chamber/ReaderChamberWorkspace.tsx`,
which shares one mock story and one categorized preview-control panel rendered through the
shared Workshop Controls menu — see "Available preview states" for the canonical Pages /
States / Effects mapping.

## What was copied

The full Reader Chamber presentation tree from `src/components/` in Light-Novels:
`ReaderChamber.tsx` (default export, `ReaderChamberProps`), `ReaderViewport.tsx`,
`ReaderHeader.tsx` (+ `AudioWidget`), `ReaderPreferencesPanel.tsx`, the whole
`ReaderControls/` folder, `CosmicBookmarksPanel.tsx` (+ `VirtualizedList`),
`AlterFatePanel.tsx`, `ParticleSystem.tsx`, `SystemBlock.tsx` (+ `FateResultCard`,
`lib/systemColors.ts`),
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
  1. rich structured-`blocks` chapter (breakthrough System Panel, Fate Result card,
     inline World Cues, soft continuity notes, Context Inspector manifest);
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

The preview controls now live inside the shared Workshop Controls menu (Pages / States /
Effects / Advanced), rendered by `FeatureWorkspace`. Each scenario in
`src/workshop/previews/reader-chamber/previewStates.ts` carries a `category` field that
maps it into the canonical section list. The mapping collapses the old Reader-specific
labels into the shared menu while keeping every scenario reachable:

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

- `reading` — rich blocks chapter 1 (System Panels, Fate Result card, inline World Cues,
  Context Inspector, legend, Fate Survival banner)
- `fullscreen` — header hidden; click prose to toggle back
- Chapter selector (1–4)

**States — Menus** — opened panels, drawers, and overlays

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

- zustand stores (`store/useAppStore`, `store/useGenerationStore`) → `shared/stubs.ts`
- Firebase (`lib/firebase`, `LOCAL_ONLY_MODE`) → constant `true`
- storyStorage / IndexedDB persistence
- Generation pipeline (`onGenerateChapter`/`onGenerateNextFiveChapters` log only)
- Scene and narration audio engines (`useReaderPlayback` internals,
  `hooks/audio/useAudioMix` playback, `audioMixSettings`, `lib/vibration`, and
  `lib/narrativeCues`) — settings state is real; inline World Cues are the narrow
  exception and play through the existing DEV audio owner.
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

- `Loader2` → `LoaderCircle as Loader2` (ReaderViewport)
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
- **Audio is intentionally partial** — the mixer's music, atmosphere, and
  narration remain inert. Only valid persisted Worldcues play, through the
  single shared DEV audio session and only after their own tap target is used.
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
- **R2 backdrop URLs** — Reference keeps the 5 hard-coded public
  `FALLBACK_BACKDROPS` R2 URLs; Development resolves the same
  `FALLBACK_BACKDROPS` / `getFallbackBackdrop` names from
  `reader-codex/development/codexManifestBackdrop.ts`, whose pool is the five
  local "IMMORTAL LAND" Manifest landscapes in `public/manifest-backdrops/`.

## Exact files needed for transfer (verified)

When a development/ change is approved, transfer these to Light-Novels, reversing
the import rewrites (`../shared/X` → `../lib/X` / `../hooks/X` / `../store/X`,
`./X` unchanged) and mapping the Reader Codex imports back to production's
existing owners — `reader-codex/development/CodexHovercard.tsx` →
`src/components/CodexHovercard.tsx`, `codexHighlighting` → `lib/codexHighlighting`,
and the Codex Card ambience/accent helpers per the Reader Codex README:

- `development/ReaderChamber.tsx` → `src/components/ReaderChamber.tsx`
- `development/ReaderViewport.tsx` → `src/components/ReaderViewport.tsx`
- `development/InlineAudio.tsx` + `InlineAudio.css` → new production Reader
  primitive/style files, adapted to production's owning `@seihouse/audio-player`
  session rather than copying the Workshop `DevAudioPlaybackProvider`
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
- `development/CodexCard.tsx` → `src/components/CodexCard.tsx`
- `development/CodexCardInscription.css` → `src/components/CodexCardInscription.css`
  (new file; the inscribed-name title styles imported by `CodexCard.tsx`)
- `development/CodexCardSeal.css` → `src/components/CodexCardSeal.css`
  (new file; the Manifest seal idle-breath keyframes and reduced-motion backstop
  imported by `CodexCard.tsx`)
- `src/components/library/LibraryCard.tsx` and its existing shared Library dependencies (including `LibraryDragonCycleIcon`, which the Manifest seal reuses unchanged) → the source application's compatible Library foundation before transferring `CodexCard`
- `development/ReaderFateAlerts.tsx` → `src/components/ReaderFateAlerts.tsx`
- `development/FateSurvivalExplanation.tsx` → `src/components/FateSurvivalExplanation.tsx`
- `development/SystemColorLegend.tsx` → `src/components/SystemColorLegend.tsx`
- `development/ContextInspector.tsx` → `src/components/ContextInspector.tsx`
- Style changes from `shared/reader-chamber.css` → merge back into `src/index.css`
- `src/audio/inlineAudio.ts` → the provider-neutral action and catalog-resolution
  contract, alongside the production copy of the approved Library Cue catalog

Workshop-only — never transfer: `shared/stubs.ts`, `shared/types.ts` (production
`src/types.ts` is authoritative), `shared/trackLibrary.ts` (production
`lib/audio/musicResolver.ts` is authoritative), everything under
`src/workshop/previews/reader-chamber/`, the manifest entry, and the registry line.
`getReaderChamberSurfaceClass` is a Card Workshop presentation seam, not production API.
`audioMoments` is chapter-owned generation output rather than a Workshop prop.
Transfer its validator, resolver, accepted-result persistence, Reader adapter,
and block-scoped rendering together; do not copy the preview fixtures as data.

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
