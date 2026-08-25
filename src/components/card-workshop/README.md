# Card Workshop

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Verified source locations:** `src/components/ReaderViewport.tsx`, `src/components/SystemBlock.tsx`, `src/components/FateResultCard.tsx`
- **Workshop preview:** `?preview=card-workshop`
- **Replica created:** 2026-08-14
- **Last Workshop update:** 2026-08-25
- **Last source comparison:** 2026-08-22
- **Replica status:** under refinement

## Purpose

The development-only Card Workshop makes the active Reader presentations inspectable without generating a chapter. Card Type Tabs keeps an isolated preset gallery, while Contextual View routes the selected preset through the real Development `ReaderViewport` inside a deterministic local chapter.

Card Type Tabs is organized as two real parent branches, and only the selected
parent's categories are ever offered:

- **Codex Cards** — Human, Non-Human, Artifacts, Locations, Factions;
- **System Prompts** — Narrative, Mechanical, World Notice, Fate System.

The current presentation set is deliberately limited to:

- `CodexCard` for Human Portraits, Non-Human Portraits, Artifacts, Locations, and Factions resolved from application-owned Codex entries;
- `SystemBlock` and its nested `FateResultCard` presentation as independent System Panels;
- inline World Cue examples showing both a Codex-linked term with an independent sound mark and a sound-only term whose prose remains visually native.

Chapter Visual Memories are not part of the Reader or Card Workshop. Manga Studio is outside this feature and is unchanged.

## Workshop history

- **2026-08-25:** Audited the real Reader/Card Workshop presentation for accessibility, narrow and short viewports, keyboard behavior, reduced motion, long-content overflow, palette contrast, and rendering cost. Expanded System reports now keep a pinned header and one keyboard-focusable scrolling body, restore focus to their opener, and avoid backdrop blur; Workshop controls preserve the branch/category architecture while meeting touch-target and selected-state semantics. Non-interactive System surfaces no longer advertise hover/click behavior, long values wrap safely, and motion-heavy effects respect reduced-motion preferences.

- **2026-08-24:** Split Card Type Tabs into real parent/child branches — **Codex Cards** (Human, Non-Human, Artifacts, Locations, Factions) and **System Prompts** (Narrative, Mechanical, World Notice, Fate System) — so only the selected parent's categories are shown, and each System category exposes only the content examples that belong to it. Added the missing Faction Codex preset to complete the Codex categories. Mobile-optimized the development page so every control wraps and stays usable from 320px up with no horizontal page cut-off. Card components themselves are unchanged.

- **2026-08-24:** Clarified the regular System Prompt selector into explicit `narrative`, `mechanical`, and `world_notice` families while retaining `system_prompt` and `fate_system_prompt` as the only top-level kinds. The existing Narrative Notification compact/expanded card and LitRPG mechanical panel retain their approved layouts; `promptType` supplies their shared semantic color, never layout choice. Added deterministic **Guild Bounty** (single notice) and **Mission Board** (multi-entry board) examples through the existing System Prompt selector, rendered by the Reader's static `WorldNotice` document surface with direct headings, secondary flavor, ordered labeled details, no controls, raw HTML, Codex links, or TTS ownership. The contextual Reader adds a board fixture; Fate, locked Reference, preview routes, and source-comparison metadata are unchanged.

- **2026-08-23:** Adopted the two-slot compact outcome treatment in the System Prompt examples: each example's bottom half now shows at most two outcomes as flat slots separated by a clear divider — a white subject plus a meaning-colored state word (Cultivation Breakthrough: `Realm Ascended` | `Lifespan Increased`; Broken Promise: `Karma Decreased` | `Title Stripped`; Target Scan: `Intel Gained` | `Weakness Found`) — with no numbers compact. The signed figures (`Lifespan +100`, `Karma −15`) and the remaining outcomes (`Presence Exposed`, `Sect Enmity`, `Detection Risk: High`) still render in the expanded event report. Fixture data, priority order, and tone overrides are unchanged.

- **2026-08-23:** Refined the compact System Prompt cards after review: key/value facts returned to clean flat rows spread across the card's ends, badges are reserved for true status information as one static full-width pill (Threat Assessment · Moderate), and the bottom outcomes returned to clean flat rows of meaning-colored text — green positive (`Intel Gained`, `Weakness Found`), yellow uncertain, orange warnings (`Presence Exposed`), red negative or severe risk (`Detection Risk: High`, `Sect Enmity`) — through an optional `tone` on `SystemPromptChange` that defaults from `direction`. The compact classification line simplifies to its most useful term (`✦ AWAKENING ✦`, `✦ CONSEQUENCE ✦`, `✦ ENEMY ✦`); the expanded overlay keeps the full classification. Expanded reports, structured mechanical panels, Fate results, and event fixtures are otherwise unchanged.

- **2026-08-23:** Updated the System Prompt examples and Development `SystemBlock` compact cards with direct, immediately understandable main titles (`Cultivation Breakthrough`, `Karmic Consequence`, `Hostile Target Scan`) while retaining dramatic/world-specific context as secondary flavor (`Mortal Tribulation Surpassed`, `Oath Before the Rain Court Broken`, `Elder Kaelen Assessment`). Meaningful metadata items and outcomes render as dedicated metadata badges in a flexible wrapping container, and the minimized TTS summary empty space was tightened. Presets, expanded overlay reports, and structured mechanical panels remain intact.

- **2026-08-22:** System Prompt examples adopt the pill-cornered holographic window finish and demonstrate the new row direction arrows: the breakthrough's `New Realm` and `Meridian State` values carry green up-arrows, the broken oath's sealed `Celestial Record` carries a red down-arrow, and the target scan stays unmarked (a scan changes nothing). Fixture text, outcomes, expanded breakdowns, and event structure are unchanged.
- **2026-08-22:** Adopted the translucent System window treatment and the genre-native outcome convention in the System Prompt examples. The three mocked events keep their assigned event colors, data, and layout while the compact card renders as a tinted, clipped-corner System window, and their metadata rows now carry one to three short System outcomes: Cultivation Breakthrough — `Realm Ascended`, `Lifespan 100` (renders LIFESPAN +100), `Presence Exposed`; Broken Promise — `Karma 15` (renders KARMA −15), `Title Stripped`, `Sect Enmity`; Target Scan — `Intel Gained`, `Weakness Found`, `Detection Risk: High`. Signs appear only on the genuine mathematical changes. Expanded breakdowns, the example switch, event slugs, the structured mechanical panel, Fate results, and the locked Reference are unchanged.
- **2026-08-22:** Replaced the in-place expanded System Prompt breakdown with a viewport-locked overlay event report. The orb action now opens one flat panel portaled above the reader — classification, headline, subject, optional badge, the signed consequence row, then Codex sections separated by simple dividers instead of stacked cards — while the compact card keeps its consequence row and prose untouched underneath, so the chapter never grows and the reader's position never moves. Mobile shows only the three highest-priority sections (the rest are `hidden md:block`) so everything fits one screen without page or panel scrolling; larger screens show every section in the same structure. Character names keep their Codex colors and links, the report stays narration-excluded (TTS still reads only the compact prose), and Escape, the close button, or a backdrop tap closes it with focus returned to the orb. Fixture data, event examples, the structured mechanical panel, Fate results, and the locked Reference are unchanged.
- **2026-08-22:** Adopted meaning-first color semantics for the compact System Prompt demonstrations: simplified two-part classification lines (neutral category, colored subtype), neutral row labels and values, and severity-colored badges (target scan's `THREAT ASSESSMENT · MODERATE` keeps a neutral label with only `MODERATE` in orange). Fixture content and event structure are unchanged.
- **2026-08-22:** Updated the System Prompt example set to demonstrate the finished production-hierarchy compact card. Each mocked event (cultivation breakthrough, broken promise, target scan) now carries two concise key/value rows that add new facts only — never restating the title, badge, prose, or consequence labels — and its prose was rewritten to describe the System appearing or responding in the moment while the reader views the card. The target-scan example keeps its structured badge, with the badge phrase still present in the narration source and stripped from the visible prose. The example switch, event slugs, expanded breakdowns, and the four-row structured mechanical panel demonstration are unchanged.
- **2026-08-22:** Built the in-place expanded System Prompt view on the existing Development `SystemBlock`. The celestial orb is now a 44px accessible disclosure action: compact remains the default, tapping opens the event on the same card with an upward-chevron core, and tapping again restores the compact consequence row. Expanded content is a Reader-only optional display contract composed from subject identity, Codex-shaped sections, values, positive or bipolar progress, statuses, warnings, lore, and narrative consequences. Character strings reuse the same character-only Codex renderer as the short summary, so `Yun Che`, `Elder Han`, `Magistrate Jinhai`, and `Elder Kaelen` retain their assigned novel colors and open local Codex details. Added complete local breakdowns for cultivation breakthrough, broken promise, and target scan. The chapter block `text` remains the short summary and is still the only TTS source; expanded fixtures are not connected to chapter generation, normalization, persistence, or real Codex data. The locked Reference, Fate result, and structured mechanical panel remain unchanged.
- **2026-08-22:** Finished the compact System Prompt refinement without changing its narration owner. Named characters in the TTS prose now reuse the existing Reader Codex highlighter and hovercard only when a character entry resolves, preserving the entry's assigned novel color; Artifacts, Locations, Factions, and unnamed mentions remain outside this System-prose pass. Added an optional structured `badge` such as `THREAT ASSESSMENT · MODERATE`; the full original `content` stays intact for TTS while the matching badge phrase moves out of the visible serif sentence. Replaced consequence scrolling with measured priority selection: mobile shows three only when all three fit with breathing room, otherwise the first two, while roomy layouts may still show four. Every visible item remains untruncated on one line. The target-scan mock proves the red hostile character link, badge, and three-item row; the breakthrough mock proves the two-item mobile fallback. The locked Reference and existing TTS playback path remain unchanged.
- **2026-08-22:** Rebuilt the compact System Prompt around three parts: the fixed SYSTEM kicker with the temporary orb emblem resting small beside it, a dramatic per-event headline from `system.title`, the concise serif sentence from `content` (still the only text narration reads), and one horizontal bottom row of up to four prioritized signed consequences from `system.changes`. The single-column stack fixes the portrait layout — the large side orb no longer squeezes the text column at 390px. The component stays fully data-driven; the Workshop example switch now offers three mocked Wuxia events — cultivation breakthrough (gold), broken promise (orange), and target scan (red) — beside the unchanged structured mechanical example. The shared `SystemPromptChange` contract now documents the four-consequence cap in priority order; generation is still not wired to emit it.
- **2026-08-22:** Rebuilt the compact regular System Prompt (Development `SystemBlock`, events without mechanical rows) to the approved reference: the fixed SYSTEM label, one concise event sentence in reader serif, and one small signed metadata row beneath it carrying no more than two structured changes. Supporting that row, the shared `BaseSystemEvent` contract gains an optional `changes: { direction: "gain" | "loss"; label }[]` field, so the row never relies on arbitrary text. The existing Codex orb (radial glow, glass sphere, dashed/dotted orbit rings, ✦ core) sits at the right edge as the temporary System emblem. The card keeps the semantic System color system — label, changes row, border, and orb all inherit the event's `promptType` accent, with the approved reference's blue as the default new-info voice — over blue-black depth; death-flag and iron-fate events keep their menacing border pulses. Fate System Prompts, the structured mechanical rows panel, the legacy string fallback, and the locked Reference are unchanged. The literary example becomes the bond notice "Aster now considers you someone she can trust." with `+ Karma Bond`. The expanded view, Codex overhaul, broader terminology system, and chapter-generation wiring remain out of scope.
- **2026-08-21:** Consolidated System Prompt categories across the Workshop, types, normalizer, model parsers, and prompt directives into strictly two top-level options: universal System Prompt (`system_prompt`), which supports concise literary notices and optional structured mechanical rows with a development example switch, and Fate System Prompt (`fate_system_prompt`), which strictly requires a valid Fate Survival payload. Removed obsolete legacy kinds cleanly across all contracts and test suites without altering visual rendering or layout.
- **2026-08-19:** Removed the retired standalone world presentation and every Card Workshop preset, adapter, override, and Reference rendering branch that existed only for it. Contextual View now demonstrates the replacement circle-free, footnote-scale annotations on audible actions: `the Rain Court bell tolled` contains the independently linked Codex name while its separate mark starts playback, and `a Vermilion Debt Fox growled once` remains ordinary prose with only the small sound mark identifying the event. Each final word, mark, and punctuation stays together while longer phrases can wrap normally.
- **2026-08-18:** Development fixtures adopted the real Manifest backdrop pool and published Library test images for Codex media.
- **2026-08-18:** Refined the shared Codex Manifest seal, awakening state, spectral glass, and entity accent treatment without changing its content or routing.
- **2026-08-17:** Adopted the shared responsive `FeatureWorkspace` Workshop Controls shell.
- **2026-08-15:** Added Contextual View so selected Codex or System presentations enter the real Reader structured-block path between fixed prose.
- **2026-08-14:** Created the Card Workshop, extracted the production-inline Codex presentation for shared Reader/Workshop rendering, and added deterministic local state simulation.

## Development states

Contextual View supports:

- Human and Non-Human Portrait Codex Cards;
- Artifact and Location Codex Cards;
- existing Codex artwork, eligible Manifest/Awaken state, and missing-without-action state;
- Codex entry present or missing;
- first reveal or existing-entity reference;
- a Codex-linked audible action with an independently operable inline Worldcue;
- a sound-only audible action that remains ordinary Reader prose;
- every current `SystemBlock` kind, explicit Narrative Notification and LitRPG/Mechanical Display examples, single-notice and multi-entry World Notice fixtures, the compact-default/expanded disclosure states for the Narrative examples, and all existing Fate outcomes;
- mobile, tablet, and desktop widths.

Card Type Tabs exposes a parent branch row (Codex Cards / System Prompts) above a
child category row, and mounts exactly one presentation at a time. Arrow keys plus
Home and End move between the visible child categories. Card Type Tabs and
Contextual View share one selected category and one override state. Each System
category narrows the shared System Prompt preset to its own content examples:
Narrative offers Cultivation Breakthrough and Broken Promise, Mechanical offers
Structured Mechanical and Target Scan, World Notice offers Guild Bounty and
Mission Board, and Fate System renders the Fate result preset.

Every branch row, category row, mode switch, viewport switch, selector, and
Technical Details control wraps within the viewport at 320px and above, so the
development page never scrolls horizontally.

## Mock and production boundaries

- Fixtures are static local objects, including the three expanded System Prompt breakdowns and their local character entries, plus real Library test images under `/public/card-workshop/test-images`.
- Development Codex reveals use the Manifest backdrop pool under `/public/manifest-backdrops`; the locked Reference keeps its existing placeholder.
- The Workshop makes no model, generation, API, database, story-write, persistence, or production-media calls.
- The contextual Worldcue starts from a block-scoped resolved annotation only;
  the model-safe fixture chooses category, variation, and semantic tags while
  application logic selects the approved public Library Cue.
- Reference mode uses locked production presentation replicas and has no Development controls.
- Bestiary and Faction records remain informational and expose no Codex image-generation action.
- Fate panels, the structured mechanical System example, and System routing retain their existing presentation; the compact System Prompt renders as an event-tinted System window with a small orb emblem, direct headline, optional flavor text, a single-term classification line, flat key/value rows with direction arrows on changed values and values spread to the right edge, a full-width reserved status badge, character-linked TTS prose, and clean flat outcome rows of meaning-colored text (with signs on genuine mathematical changes) while keeping the semantic System color system.
- Regular System Prompt `presentation` explicitly selects the unchanged Narrative Notification, unchanged LitRPG/Mechanical Display, or the static World Notice document surface; `promptType` keeps the same semantic color meaning across all three. World Notices use direct document titles, optional flavor, and plain-text entries/details without controls, Codex links, hovercards, or TTS ownership.

## Transfer notes

The active Development presentation owners are:

- `src/components/reader-chamber/development/CodexCard.tsx`
- `src/components/reader-chamber/development/InlineAudio.tsx`
- `src/components/reader-chamber/development/ReaderViewport.tsx`
- `src/components/reader-chamber/development/SystemBlock.tsx`
- `src/components/reader-chamber/development/WorldNotice.tsx`
- `src/components/library/LibrarySoundGlyph.tsx`

`Light-Novels` `main` was inspected at commit `f89cb41` on 2026-08-22. Its current Reader, System, and Fate source paths remain the comparison baseline; this Workshop change does not modify that repository.

Do not transfer Workshop controls, fixtures, contextual Reader harness, or preview overrides into production.
