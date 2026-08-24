# Reader Codex

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/ReaderCodex.tsx`, `src/components/CodexSheetOverlay.tsx`, and `src/components/CodexHovercard.tsx` (verified against `origin/main` @ `66643f6`)
- **Workshop preview:** `?preview=reader-codex`
- **Replica created:** 2026-08-11
- **Last Workshop update:** 2026-08-23
- **Last source comparison:** 2026-08-18
- **Replica status:** under refinement

## Workshop history

- **2026-08-23:** Moved every Reader/Codex semantic color consumer to the shared Reader Chamber **Color Codes** registry and its accessibility-palette CSS variables. Development and Reference inline links, reveal cards, Portrait/Location/Faction/Artifact surfaces, Bestiary individual/threat badges, relationship nodes and status markers, mystery/thread and timeline badges, affinity and power-stage charts, active-tier and Karma metric badges, System outcomes, and the visible legend now resolve through the same semantic token rather than local hex or Tailwind maps. Character relationship colors re-read the current `relationshipToMC` record, including a selected Karma node after a story update; numeric inter-character affinity remains separately mapped from `StoryWorld.relationships`.

- **2026-08-21:** Published this feature as `@seihouse/sen/reader-codex`, with the card-level pieces published separately as `@seihouse/sen/codex-cards`. The entries carry `reader-codex.css` (and the Reader Chamber typography the Codex renders inside) as a side effect. Removed the `shared/VirtualizedList.tsx` re-export shim — the Codex views now import the Reader Chamber list directly. The locked `reference/` replica stays Workshop-only.

- **2026-08-21:** Removed R2 from the Character voice flow entirely. A tap now calls `POST /api/codex-voice-quote`, which resolves the canonical Character, assigns a stable provider-neutral `voiceKey` when needed, and calls ElevenLabs for that exact stored quote. The response carries the synthesized audio bytes directly for immediate playback — nothing is stored, hashed into an object key, or reused between taps; every tap calls ElevenLabs again. The `voiceClip` artifact, its public-URL validation, and the R2 store are gone. `voiceKey` assignment, eligibility rules, and the ready/generating/playing/stopping/unavailable/error card states are unchanged.
- **2026-08-20:** Moved Character voice onto the `signatureQuote` of named, intelligent Character Portrait cards. The quote offers the interaction before any recording exists: the first tap calls `POST /api/codex-voice-quote`, which resolves the canonical Character, assigns and persists a stable provider-neutral `voiceKey` when needed, generates that exact stored quote once through the server-only provider, saves it in the existing SEIHouse R2 audio namespace, and persists a `voiceClip` artifact bound to the character, quote, voiceKey, model, and artifact version. Later taps reuse the stored file, concurrent taps cannot duplicate generation, and a changed quote or voice invalidates the old recording. Opening, scrolling, or viewing the Codex generates nothing. The card exposes ready, generating, playing, stopping, unavailable, error, and retry states. The `character-voice` Workshop screen uses that same live endpoint and reports its real result; it does not simulate provider or storage responses. Bestiary species, unnamed entities, and non-intelligent Characters remain ineligible.

- **2026-08-19:** Replaced the Workshop-local voice preset and browser `speechSynthesis` path with the Phase 3 identity boundary. A validated named dialogue speaker receives one deterministic provider-neutral `voiceKey` on the server-owned canonical Character and reuses it in later chapters; Bestiary species never receive voices. Reader Codex can play an existing synthesized `voiceClipUrl` through the shared audio owner, but it neither assigns a voice nor advertises generation without a working server artifact path.
- **2026-08-19:** Documented the refined inline World Cue boundary: a named
  Reader entity can keep its independent Codex action while a separate neutral
  Library sound glyph beside the phrase owns cue playback.
- **2026-08-18:** Review follow-up: the highlighted-term dragon seal now applies its cyan and violet glow as a valid chained filter at rest, on hover, and while pressed. The decorative Manifest backdrop is hidden from assistive technology and carries a `data-slot` hook for focused tests; focus, placement, and local manifestation behavior are unchanged.
- **2026-08-18:** Brought the highlighted-term `CodexHovercard` to the approved dragon-cycle Manifest seal, matching the Reader Chamber `CodexCard`: the dashed orbit rings and accent core glow are gone — an enlarged `LibraryDragonCycleIcon` now forms the entire portal boundary (masked cyan→violet twin copies, slow 24s rotation), wrapped in the centered two-band conic aura, around a dark glass core holding the star, the Manifest label, and the awakening caption (now "Awaken Portrait" inside the core; the separate "Awaken Aetherial Portrait" line beneath the seal is retired). The pending state reads "Manifesting..." with a small spinning dragon glyph instead of the generic spinner, announces `aria-busy`, and every animation rests under `prefers-reduced-motion`. The card also now carries the story's Manifest backdrop behind the glass until a portrait exists — the same assigned-or-stable-fallback rule as the `CodexCard`, sourced from the new `development/codexManifestBackdrop.ts`: the five real production "IMMORTAL LAND" revelation landscapes, downloaded into `public/manifest-backdrops/` so no production media is hot-linked. Docking, desktop placement, focus/Escape handling, trigger theming, and the local manifestation flow are unchanged.
- **2026-08-18:** Review pass on the spectral-glass fork: the entity classification rules moved into a single shared `resolveCodexEntityBand` in `development/codexEntityAccent.ts`, and the hovercard trigger theme now maps from that band — this also repairs the modest-tier drift, so decent/uncommon/mortal/profane artifacts highlight in the same teal (`#2DD4BF`) the card ambience already used instead of the legacy dark green. The Manifest seals dropped their redundant keyboard handlers (native button activation already covers Enter/Space), the inline CodexCard seal now announces its "Summoning..." pending state to screen readers, and the transfer notes for the new helpers are marked pending an integration decision. Desktop placement, docking, focus/Escape handling, and the manifestation flow are unchanged.
- **2026-08-18:** Forked the highlighted-term Codex card into `development/CodexHovercard.tsx` and reimagined it with the approved Library spectral-glass treatment: translucent black-blue depth with a top-light falloff, inner rim lighting, the masked 1px spectral edge, an entity ambient accent (character relationship, Artifact tier, Location specialness, Faction), and a sparse spectral mote field. The Manifest trigger is now the circular seal itself — both rotating orbit rings, the star, and the Manifest label are preserved, with the "Awaken Aetherial Portrait" caption beneath — instead of the former rectangular button. Docking, desktop contextual placement with viewport clamping, portal focus/Escape handling, trigger highlight theming, and the local one-off manifestation flow are unchanged. The accent rules live in `development/codexEntityAccent.ts` and the particle layer in `development/CodexCardAmbience.tsx`, both shared with the Development `CodexCard`. `shared/CodexHovercard.tsx` is untouched and now serves only the locked Reference Reader path.
- **2026-08-17:** Refined highlighted-term Codex cards in the real Reader path: mobile and tablet cards now dock at the safe upper viewport edge, use a smaller width on phones, and cap their scrollable height so most novel text stays visible; desktop cards retain contextual placement with edge clamping. Persisted/generated imagery now gives the media frame its natural aspect ratio, keeping the complete artwork and rounded corners aligned without cropping. Keyboard-opened portal cards receive focus, close with Escape, and return focus to the highlighted term. The card skin, content, Manifest action, and Reader highlighting flow remain unchanged.
- **2026-08-17:** Moved the Workshop-only Codex page shortcuts into `FeatureWorkspace` Workshop Controls. The shortcuts still activate the real Codex tabs in each mounted pane; Reader Codex navigation and local story-state behavior remain unchanged.
- **2026-08-11:** Migrated the complete production Reader Codex, its responsive sheet, all six primary pages and nested sections, Reader prose highlighting/hovercards, local editing controls, and Reader Chamber navigation into DEV. Production-only auth, AI, media, and persistence seams were replaced with explicit local compatibility behavior.
- **2026-08-12:** Aligned generated Reader sessions with DEV Story Seed, World Blueprint, Process Result, and Living Story State contracts. The adapter now translates Seed character/profile aliases, power ranks, relationships, abilities, permanent power-system data, factions, locations, artifacts, mysteries, and resolved threads; Process updates merge into existing named entities; and each Codex timeline is limited to the selected chapter.
- **2026-08-13:** Added Part One's Development-only creature boundary: Process Result normalizes species into a lean Bestiary and persistent named non-human individuals into Portraits, with application-owned stable IDs, encounter history, and reciprocal species links. Development now separates Human and Non-Human Portraits and adds a Bestiary tab while preserving the frozen Reference.
- **2026-08-14:** Applied the first Part Three visual eligibility cleanup: only Human Portraits, Non-Human Portraits, Artifacts, and Locations can create new Codex artwork or render as Codex Cards. Bestiary species and Factions remain informational; legacy stored media stays readable without exposing a new Manifest action.

## What was migrated

The reference and development forks preserve production's `ReaderCodex` and
`CodexSheetOverlay` presentation and interaction hierarchy:

- **Portraits:** Chronicle collage, character and location cards/profiles,
  factions, image history, voice cards, editing, context fields, and visual
  chapter recaps.
- **Karma:** relationship constellation, relationship ledger, and unresolved /
  resolved mysteries.
- **Power Rankings:** protagonist and secondary ranks, power system, world rules,
  abilities, affinity history, breakthrough history, and dashboards.
- **Artifacts:** artifact creation, cards, history, context editing, and deletion.
- **Fate:** local forms for characters, locations, factions, and world rules.
- **Lore:** built-in glossary, search, local custom-term cache, extraction loading,
  deduplication, and error presentation.

Cross-section behavior includes responsive mobile/desktop navigation, Deep
Memory filtering, pinned dormant entries, continuity-warning resolution,
notifications, the context editor with focus lock and Escape handling, exact
`DELETE` confirmation, image-choice previews, chapter jumps, and Reader return
controls. The Reader Chamber also restores production's Codex-term matcher and
click/touch/keyboard hovercards without replacing DEV's newer Reader layout.

## Folder layout

```text
reference/
  ReaderCodex.tsx
  CodexSheetOverlay.tsx
development/
  ReaderCodex.tsx
  CodexSheetOverlay.tsx
  ReaderCodexBestiary.tsx
  CodexHovercard.tsx        — active highlighted-term card (spectral glass fork)
  codexEntityAccent.ts      — entity ambient accent rules shared with CodexCard
  CodexCardAmbience.tsx     — spectral mote field + accent aura for Codex Cards
shared/
  codex/                    — production section/component tree
  hooks/                    — pure hooks and local production-service adapters
  CodexHovercard.tsx        — now serves only the locked Reference Reader path
  codexHighlighting.ts
  codexContext.ts
  codexEntryContext.ts
  codexCompatibility.ts
  DestinyChoicePanel.tsx
  VirtualizedList.tsx       — adapter to DEV's existing Reader component
  reader-codex.css
```

The standalone Workshop state selector opens each real primary tab:
`Portraits`, `Bestiary`, `Karma`, `Power Rankings`, `Artifacts`, `Fate`, and
`Lore`.
Reader Chamber and generated five-chapter sessions open the Codex through the
existing `Open Codex` control as the production-style responsive overlay.

## DEV compatibility boundary

The source UI remains intact, but DEV intentionally does not import production
authentication, Firebase, Postgres, R2 signing/upload, quota, provider-key, or
AI-route ownership. The smallest local substitutes are used instead:

- image manifestation/evolution produces selectable local preview images;
  saved card evolutions patch the in-memory story, while a Reader hovercard's
  one-off manifestation remains component-local;
- existing application-owned `/dialogue/` voice artifacts use the shared DEV
  audio owner; third-party, relative, blob, and data sources are rejected; a bare
  `voiceKey` remains an assigned-but-not-yet-synthesized identity and exposes
  no client-side generation action;
- story-lore extraction produces deterministic local terms while retaining the
  source loading/cache/search/deduplication behavior;
- historical media resolution uses URLs already present on fixture records;
- Hub entitlement is locally unlocked;
- vibration and the collage chime remain inert;
- all Codex writes pass through the narrow `UpdateStoryFields` allowlist.

These are Workshop-only compatibility adjustments, not a replacement Codex
data architecture. The existing batch adapter translates the current Living
Story State plus permanent Story Constitution fields into the imported Reader
shape. It maps DEV `connectionToMC`, `rankLevel`, and `bio` fields to the
Codex's `relationshipToMC`, `powerLevel`, and `description` fields; carries the
main ability ledger and permanent power-system definition; and assigns stable
local IDs where DEV has only a canonical name. Explicit aliases plus harmless
casing, spacing, and punctuation variants update existing entities instead of
creating duplicate cards.

Creature data follows the same active Process → Living Story State → Reader
adapter path. A Bestiary entry is only a species-level answer to “what is this
species?” and stores its stable ID, description, classification, traits,
threat, signature sound, encounter chapters, and linked
notable individual IDs. A persistent named non-human remains a Portrait answer
to “who is this individual?” and can link to a species without requiring one.
Legacy `isBeast`/`beastProfile` input is translated at the active Reader and
Process boundaries; active generated data uses `creature` and never accepts
model-owned IDs, asset keys, URLs, encounter history, or reverse links.
Legacy Bestiary/Faction media fields remain readable so existing data is not
destructively migrated, but neither informational collection has an active
Codex image-generation or Manifest action.

The current boundary keeps Human Portraits, Non-Human Portraits, Artifacts,
and Locations on the visual Codex Card path. Bestiary species and Factions
remain informational Codex entries. A named entity in Reader prose can also
have a separate inline World Cue glyph without changing its Codex action;
System and Fate content remains on the existing System Panel path.

Moving chapters deliberately shows that chapter's cumulative generated memory
and only the completed chapter timeline through that point. The full
five-chapter collection stays available to Reader navigation, while later
chapter titles, summaries, entities, progression, artifacts, and mysteries stay
out of earlier Codex snapshots. Paused batches retain snapshots for every
completed chapter through the existing in-memory batch/checkpoint state.

DEV still has no reliable generated source for numeric custom relationship
bonds, Karma fate nodes, portrait media, reward/inventory ledgers, or canonical
story glossary entries. Those fields remain empty; the adapter does not create
placeholder records. Existing local Codex authoring plus Workshop-only media
and glossary controls remain presentation compatibility behavior. Voice
assignment is no longer a client compatibility control.

## Production dependencies intentionally excluded

- `/api/generate-card-image`, `/api/generate-audio`, and
  `/api/generate-custom-glossary`
- Firebase identity, secure provider-key retrieval, and image quotas
- R2/Data Connect media upload, signing, ownership, and re-resolution
- persisted voice assets and Kokoro voice assignment
- Hub/account entitlement enforcement

Consequently, real AI glossary extraction, real image/audio generation, cloud
media persistence, and private historical-media renewal are not restored in
DEV. Their visible controls operate against local state so the complete Codex
flow can still be inspected and tested without beginning a backend pass.

## Reusable dependencies

- React, `motion/react`, `lucide-react`, and `react-focus-lock`
- Reader Chamber's existing story/update types and mock store
- Reader Chamber's existing `VirtualizedList`, dialect, ID, theme, and entity
  highlight contracts
- the shared Reader/Codex fixture in
  `src/workshop/previews/reader-chamber/previewData.ts`

No dedicated production static assets exist for the Codex. Production imagery
comes from story/entity media records; DEV supplies local fixture URLs.

## Transfer notes

The verified production implementation is already authoritative. If a future
Development-fork refinement is approved for transfer, map:

- `development/ReaderCodex.tsx` → `src/components/ReaderCodex.tsx`
- `development/CodexSheetOverlay.tsx` → `src/components/CodexSheetOverlay.tsx`
- `development/CodexHovercard.tsx` → `src/components/CodexHovercard.tsx`
- `development/codexEntityAccent.ts` and `development/CodexCardAmbience.tsx` →
  **new production files; no existing owner.** Production's inline Codex Card
  lives in `src/components/ReaderViewport.tsx`, and there is no `src/lib`
  accent helper or shared ambience component today, so this mapping is pending
  an integration decision: expected destinations are
  `src/lib/codexEntityAccent.ts` and `src/components/CodexCardAmbience.tsx`,
  imported by both production Codex Card surfaces (`ReaderViewport.tsx` and
  `CodexHovercard.tsx`). The mote keyframes live in DEV `src/styles.css`
  (`--animate-codex-mote`) and move into production `src/index.css`
- `development/codexManifestBackdrop.ts` → production's reveal backdrop pool
  lives inline in `src/components/ReaderViewport.tsx` (`FALLBACK_BACKDROPS`,
  the R2 `LIBRARY BACKDROPS` URLs); the Workshop pool swaps in the published
  `lines.seihouse.org/LIBRARY/images/MANFEST/` "IMMORTAL LAND" landscapes as
  local files. On transfer, point the pool at the production MANFEST URLs (or
  keep production's existing pool) — do not copy `public/manifest-backdrops/`
  into the production app.
- `shared/codex/**` → `src/components/codex/**`
- pure shared hooks/utilities back to their verified `src/hooks`, `src/lib`,
  `src/contracts`, and `src/utils` owners
- `reader-codex.css` rules into production `src/index.css`

Never transfer Workshop compatibility adapters, mock fixtures, preview routes,
or local media/voice/glossary simulators over production's real services.
