# Reader Codex

- **Source repository:** SENSEIDUKES/Light-Novels
- **Source location:** `src/components/ReaderCodex.tsx`, `src/components/CodexSheetOverlay.tsx`, and `src/components/CodexHovercard.tsx` (verified against `origin/main` @ `66643f6`)
- **Workshop preview:** `?preview=reader-codex`
- **Replica created:** 2026-08-11
- **Last Workshop update:** 2026-08-18
- **Last source comparison:** 2026-08-17
- **Replica status:** under refinement

## Workshop history

- **2026-08-18:** Forked the highlighted-term Codex card into `development/CodexHovercard.tsx` and reimagined it with the approved Library spectral-glass treatment: translucent black-blue depth with a top-light falloff, inner rim lighting, the masked 1px spectral edge, an entity ambient accent (character relationship, Artifact tier, Location specialness, Faction), and a sparse spectral mote field. The Manifest trigger is now the circular seal itself — both rotating orbit rings, the star, and the Manifest label are preserved, with the "Awaken Aetherial Portrait" caption beneath — instead of the former rectangular button. Docking, desktop contextual placement with viewport clamping, portal focus/Escape handling, trigger highlight theming, and the local one-off manifestation flow are unchanged. The accent rules live in `development/codexEntityAccent.ts` and the particle layer in `development/CodexCardAmbience.tsx`, both shared with the Development `CodexCard`. `shared/CodexHovercard.tsx` is untouched and now serves only the locked Reference Reader path.
- **2026-08-17:** Refined highlighted-term Codex cards in the real Reader path: mobile and tablet cards now dock at the safe upper viewport edge, use a smaller width on phones, and cap their scrollable height so most novel text stays visible; desktop cards retain contextual placement with edge clamping. Persisted/generated imagery now gives the media frame its natural aspect ratio, keeping the complete artwork and rounded corners aligned without cropping. Keyboard-opened portal cards receive focus, close with Escape, and return focus to the highlighted term. The card skin, content, Manifest action, and Reader highlighting flow remain unchanged.
- **2026-08-17:** Moved the Workshop-only Codex page shortcuts into `FeatureWorkspace` Workshop Controls. The shortcuts still activate the real Codex tabs in each mounted pane; Reader Codex navigation and local story-state behavior remain unchanged.
- **2026-08-11:** Migrated the complete production Reader Codex, its responsive sheet, all six primary pages and nested sections, Reader prose highlighting/hovercards, local editing controls, and Reader Chamber navigation into DEV. Production-only auth, AI, media, and persistence seams were replaced with explicit local compatibility behavior.
- **2026-08-12:** Aligned generated Reader sessions with DEV Story Seed, World Blueprint, Process Result, and Living Story State contracts. The adapter now translates Seed character/profile aliases, power ranks, relationships, abilities, permanent power-system data, factions, locations, artifacts, mysteries, and resolved threads; Process updates merge into existing named entities; and each Codex timeline is limited to the selected chapter.
- **2026-08-13:** Added Part One's Development-only creature boundary: Process Result normalizes species into a lean Bestiary and persistent named non-human individuals into Portraits, with application-owned stable IDs, encounter history, and reciprocal species links. Development now separates Human and Non-Human Portraits and adds a Bestiary tab; the frozen Reference and World Card/Card Workshop behavior remain unchanged.
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
- voice-card generation uses a local browser speech compatibility path;
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

The first Part Three cleanup keeps Human Portraits, Non-Human Portraits,
Artifacts, and Locations on the visual Codex Card path. Highlighted Bestiary
species and Factions use World Cards; System and Fate content remains on the
existing System Panel path.

Moving chapters deliberately shows that chapter's cumulative generated memory
and only the completed chapter timeline through that point. The full
five-chapter collection stays available to Reader navigation, while later
chapter titles, summaries, entities, progression, artifacts, and mysteries stay
out of earlier Codex snapshots. Paused batches retain snapshots for every
completed chapter through the existing in-memory batch/checkpoint state.

DEV still has no reliable generated source for numeric custom relationship
bonds, Karma fate nodes, portrait media, reward/inventory ledgers, or canonical
story glossary entries. Those fields remain empty; the adapter does not create
placeholder records. Existing local Codex authoring and Workshop-only media,
voice, and glossary controls remain presentation compatibility behavior.

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
  production `src/lib/` / shared component owners (consumed by both production
  Codex Cards); the mote keyframes live in DEV `src/styles.css`
  (`--animate-codex-mote`) and move into production `src/index.css`
- `shared/codex/**` → `src/components/codex/**`
- pure shared hooks/utilities back to their verified `src/hooks`, `src/lib`,
  `src/contracts`, and `src/utils` owners
- `reader-codex.css` rules into production `src/index.css`

Never transfer Workshop compatibility adapters, mock fixtures, preview routes,
or local media/voice/glossary simulators over production's real services.
