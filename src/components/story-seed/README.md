# Story Seed

- **Source repository:** `SENSEIDUKES/Light-Novels`
- **Source location:** `src/components/CreationModal.tsx` (default export `CreationModal`)
- **Workshop preview:** `?preview=story-seed` (`&state=<scenario-id>` deep-links a state)
- **Replica created:** 2026-08-01
- **Last Workshop update:** 2026-08-23
- **Last source comparison:** 2026-08-10
- **Lifecycle status:** finalized Workshop feature; refactored, optimized, and ready for production transfer

The source path, `/api/generate-blueprint` route, Blueprint prompt, response
cleaner, and canonical production Blueprint fields were verified against
`SENSEIDUKES/Light-Novels` `origin/main` on 2026-08-10.

## Finalized product contract

Story Seed is one creation flow with these visible destinations:

- **Origin** owns Story Title, Style, Core Premise / Secret Catalyst, Genre,
  and Story Tags.
- **ARC** owns story-sauce controls, story direction, long-term goal, first
  major conflict, main opposition, Destined Ending, and Make It Work.
- **World** owns World Identity, Characters, Factions, Abilities, and Power
  System.
- **Story Seed Settings** owns mature-audience metadata and Fate Survival.
- **Help** owns searchable written guidance and translated audio playback.
- **Story Bank** is the only home for saved seeds, import/export, Blueprint
  access, seed reuse, and novel manifestation actions.
- **World Blueprint** is an editable sibling artifact. It is not nested inside
  the portable Creator / Story / World seed.

The canonical Story Seed shape is `creator / story / world`. Story Title has
one owner at `world.optional.worldIdentity.title`; Blueprint title editing
updates that same value. The Blueprint keeps creator-authored Origin
provenance separate from generated story direction.

## Current ownership

```text
development/
  CreationModal.tsx               flow controller and generation boundaries
  DeferredStorySeedView.tsx       secondary-view loading and error boundaries
  StorySeedSecondary.ts           deferred Help, Bank, import, and Blueprint entry
  StorySeedHeader.tsx             desktop identity and utility actions
  StorySeedMobileNavigation.tsx   mobile drawer, navigation, and sheets
  StorySeedSettings.tsx           one Settings body for desktop and mobile
  StorySeedSelector.tsx           Story / World navigation model adapter
  StoryBank.tsx                   saved-seed states and actions
  useStoryBankRecords.ts          list, loading, error, cancellation, retry
  StorySeedHelpMenu.tsx           Help modal and audio lifecycle
  BlueprintReview.tsx             editable Blueprint dossier coordinator
  blueprint/                      memoized review sections, collections, copy format
  workspaces/                     Origin, ARC, and World editors
  workspaces/origin/              Style, Genre, and premise/tag responsibilities
  seedSections.ts                 visible navigation plus required-input gate
  seedState.ts                    immutable updates over canonical seed state
  constants.ts                    finalized catalog and premise data
  story-seed.css                  feature-scoped presentation

shared/
  storySeedSchema.ts              canonical contract and generation payloads
  storySeedRepository.ts          persistence port
  workshopStorySeedStorage.ts     Workshop-only localStorage adapter
  storySeedSerialization.ts       portable import/export
  legacySeedImport.ts             isolated compatibility adapter for old files
  storyAdministrativeMetadata.ts  separate minimal story metadata
  storyStyle.ts                   canonical Style values
  storyTagInference.ts            deterministic empty-tag inference
  types.ts                        Blueprint and shared domain types
  stubs.ts                        Workshop-only app/store boundary

reference/
  locked production comparison replica; do not refine in place
```

`reference/SeedLibraryPanel.tsx` and the old flat intake vocabulary remain
only inside the locked reference replica. They are comparison evidence, not
active development code. `legacySeedImport.ts` is also intentional: it is the
single compatibility boundary that lets previously exported seed files open
without leaking old field names into current state or UI.

Shared Library primitives live in `src/components/library/`. Story Seed uses
those components directly instead of maintaining local button, panel,
navigation, header, or field variants.

## Workshop and production boundaries

The Workshop still simulates application authentication, story records, seed
persistence, and story-start callbacks. World Blueprint manifestation is now a
real protected same-origin Gemini call. It does not provide or modify a
database, production authentication, chapter persistence, or production media
infrastructure.

- `shared/stubs.ts` supplies the local app-store boundary.
- `shared/workshopStorySeedStorage.ts` is the only localStorage adapter.
- `storySeedRepository.ts` is the swappable persistence port.
- `shared/blueprintGenerationClient.ts` calls `/api/generate-blueprint` with a
  page-memory-only Development access token; the Gemini key never enters the
  browser bundle.
- `src/server/story-seed-blueprint/` owns the protected endpoint, the
  Light-Novels-informed prompt, Gemini structured output, creator-authority
  merge, completeness validation, and final Chapter Generation adapter check.
- Preview fixtures are under `src/workshop/previews/story-seed/`.
- The Workshop loads preview routes and the locked Story Seed reference on
  demand. Those `App`, `DeferredWorkspace`, and `FeatureWorkspace` boundaries
  are Workshop shell concerns, not production feature code.
- Help audio requests the finalized Library Lines endpoint; written guidance
  remains available when a topic intentionally has no audio.
- The auth backdrop uses the local optimized poster under
  `public/story-seed/`; its video is deferred and is skipped for reduced
  motion, data saver, and slow connections.
- The locked Reference pane and named preview scenarios remain deterministic.
  Manual manifestation in Development calls Gemini; starting a story remains
  a no-op because Chapter Generation owns that separate test flow.

The persistence key `seihouse-workshop-story-seeds-v3` is retained so existing
Workshop drafts are not orphaned by this refactor.

## Preview states

Creation workspace:

- `empty-intake`
- `filled-intake`
- `generating-blueprint`
- `blueprint-generation-error`

World Blueprint:

- `blueprint-review`
- `blueprint-generating-story`

Story Bank:

- `story-bank-empty`
- `story-bank-populated`
- `story-bank-loading`
- `story-bank-load-error`
- `story-bank-import-open`

Authentication:

- `auth-gated`

Scenario scripts interact with rendered controls and DOM IDs. They do not
reach into React internals or bypass form state.

## Transfer notes

When this finalized feature is approved for production transfer:

1. Copy the required files from `development/`, including the `blueprint/`,
   `workspaces/`, and `workspaces/origin/` folders plus `story-seed.css` and
   `public/story-seed/library-auth-backdrop.jpg` when transferring the auth
   gate.
2. Reuse the supporting Library primitives already owned by
   `src/components/library/`.
3. Transfer only the shared domain modules needed by the production owner,
   including the Blueprint client/finalizer when production adopts this pass.
   Transfer `src/server/story-seed-blueprint/config.ts`, `prompt.ts`,
   `generate.ts`, `http.ts`, and `vercelHandler.ts`; the temporary shared bearer
   helper at `src/server/shared/bearerToken.ts`; the Vercel entry
   `api/generate-blueprint.js`; and `scripts/buildStorySeedBlueprintApi.mjs`.
   Those files provide and bundle the endpoint required for manifestation.
4. Replace `shared/stubs.ts` and `workshopStorySeedStorage.ts` with the real
   app store, auth, and repository integrations. Replace the Development bearer
   token with production authentication while keeping Gemini server-side.
5. Keep Workshop navigation, access-token controls, preview controls,
   route-loading boundaries, fixtures, and scenario adapters behind.
6. After production integration, refresh `reference/`, update
   `source.lastCompared`, and begin the next Workshop cycle from the newly
   synchronized source.

## Validation

From the repository root:

```bash
npm run test:story-seed
npx tsc -b --pretty false
npm run build
```

There is no repository lint script. A strict unused-symbol TypeScript audit is
run separately for Story Seed scope; known unrelated warnings elsewhere in
the Workshop are not part of this feature.

Browser verification covers phone and desktop layouts plus Origin, ARC,
World, Settings persistence, Help audio, navigation, auth, Story Bank actions,
Blueprint editing, generation loading/error, and Story Bank loading, empty,
error, and populated states. Live Gemini verification additionally requires
server-side `GEMINI_API_KEY` plus a configured Story Seed Development access
token. Chapter Generation no longer needs a Development access token.

Measured against the merged refactor baseline on the same production build
harness:

- Initial Story Seed JavaScript fell from 1,320,541 raw / 356,819 gzip bytes
  to a 577,518 raw / 176,559 gzip byte direct static closure (56.27% raw and
  50.52% gzip reductions). The old large-chunk warning is gone; the largest
  emitted chunk is 319.10 kB.
- Slow-4G plus 4x-CPU DOMContentLoaded averaged 2,489.7 ms before and
  1,146.3 ms after (53.96% faster).
- Ten-character Origin input automation averaged 1,757 ms before and 1,314 ms
  after (25.2% faster); warm direct Origin and Blueprint commits both measured
  about 0.6 ms median after isolation.
- Initial Story Bank storage reads fell from one to zero; the first open still
  performs exactly one load.
- All seven lazy Workshop routes and the nested locked Story Seed reference
  render without loading-boundary, console, or page errors.

## Concise Workshop history

- **2026-08-23:** Routed the visible Fate Survival taxonomy in the locked
  Story Seed Reference pane through the shared Reader **Color Codes** registry.
  Its ten original Fate meanings remain intact while the active accessibility
  palette now repaints it with the Reader and Codex; Story Seed intake,
  persistence, and generation behavior remain unchanged.
- **2026-08-21:** Published the Development creation workspace, Story Bank,
  Blueprint review, supporting UI, repository port, serialization, and
  canonical Creator / Story / World contracts through
  `@seihouse/sen/story-seed`. The Workshop Development pane now consumes that
  package entry; preview fixtures, mock-state controls, the locked Reference,
  and the server-side Blueprint implementation remain outside the entry.
- **2026-08-21:** Stacked the Mature Audiences row on phones to match Fate
  Survival: the Rated 18+ pill now rests at content width below its
  description instead of competing with wrapped text. Anchored both Settings
  toggle knobs with an explicit left inset — the unanchored knob previously
  derived its start position from inherited text alignment, resting
  flush-right when off and sliding past the pill's right edge when on; it now
  settles with a symmetric 2px inset in both states.
- **2026-08-21:** Kept the mobile Fate Survival master toggle from stretching
  edge to edge. The Settings header retains its stacked phone layout, but the
  switch pill now shrinks to content width below the description instead of
  dominating the section. Desktop presentation and the shared 2.75rem
  coarse-pointer touch floor are unchanged.
- **2026-08-21:** Reworked the mobile Settings sheet so expanded Fate Survival
  content no longer clips invisibly. The header and Save Draft action are now
  pinned sheet chrome while only the settings body scrolls, the oversized top
  reservation and bottom dead-zone padding were corrected to real header and
  safe-area sizes, and the native scrollbar was replaced with a bottom edge
  fade that lifts once the scroll end is reached.
- **2026-08-18:** Raised Story Seed helper and status copy to a WCAG AA
  contrast floor, strengthened placeholder legibility, announced the missing
  requirements on the disabled Manifest action, and moved automatic tag
  suggestions into their own row below the premise field. Complete mobile
  intake now also exposes Manifest as a fifth bottom-navigation action, while
  the locked Reference replica and generation contracts remain unchanged.
- **2026-08-18:** Followed up on accessibility and refresh-state hardening.
  Custom radio controls now follow the standard single-Tab-stop and arrow-key
  pattern, Help traps and restores keyboard focus, Blueprint copy feedback is
  announced, and Story Bank keeps already-loaded records visible while a new
  owner refreshes. The Workshop store also preserves selector equality so
  unrelated preview state no longer redraws the Creation flow.
- **2026-08-18:** Hardened the finalized Story Seed shell for keyboard and
  mobile use. Desktop Settings now contains focus and restores it to its
  trigger, Premise preserves native Tab navigation, and the mobile dock shows
  four labeled, functional destinations without the unwired Profile placeholder.
  The locked Reference replica and Story Seed data/generation contracts remain unchanged.
- **2026-08-17:** Moved Story Seed's Workshop-only page shortcuts, deterministic scenario states, and Development access token into the shared responsive `FeatureWorkspace` Workshop Controls menu. The menu still drives the real Origin, Blueprint, Story Bank, and auth surfaces through their existing controls; product navigation and generation contracts were not changed.
- **2026-08-10:** Replaced the Development preview's mock World Blueprint
  callback with protected server-side Gemini generation based on the complete
  canonical Story Seed. Reused the proven Light-Novels Blueprint completion
  behavior, added a creator-authority merge and strict completeness checks,
  retained the editable review and paired export, and proved the exported file
  passes Chapter Generation's strict intake without fixture fallback.
- **2026-08-08:** Expanded Help into the shared 20-topic Library guidance
  system while keeping Story Seed topics prioritized in its creation flow.
  Applied the finalized main-tip and Library Lines audio contracts, preserved
  written-only quick tips and search coverage, and made modal closure an
  unconditional audio stop/reset boundary. Restricted hover activation to
  fine-pointer devices so touch accordions expand and collapse reliably.
- **2026-08-07:** Completed the dedicated measured optimization pass over the
  finalized foundation. Deferred Workshop previews and secondary Story Seed
  experiences, removed eager Story Bank reads and heavyweight remote auth
  imagery, isolated Origin tags and Blueprint dossier sections from unrelated
  renders, stabilized navigation callbacks and comparisons, hardened audio and
  timer cleanup, and reduced coarse-pointer blur/shadow/animation work. The
  visual, naming, state, persistence, generation, and accessibility contracts
  remain unchanged.
- **2026-08-07:** Refactored the finalized feature without changing its UI or
  generation contract. Removed the obsolete separate Story Settings preview,
  six superseded standalone seed workspaces, stale versioned preview records,
  dead constants/imports, and hidden legacy navigation records. Consolidated
  Settings, Story Bank loading ownership, desktop/mobile shell ownership,
  Origin responsibilities, Blueprint dossier primitives/collections/copy
  formatting, repository reset behavior, and error-state previews. Story Bank
  remained the finalized saved-seed home. Review follow-up aligned dialog/radio
  semantics, mobile focus containment, persistence failure reporting, malformed
  record rejection, and canonical Origin completion without changing the
  finalized presentation.
- **2026-08-07:** Finalized Story Bank, its actions, import/export ownership,
  manifested status, mobile navigation placement, and Library dossier skin.
- **2026-08-06:** Finalized the editable World Blueprint hierarchy and Library
  dossier presentation, Origin provenance, title synchronization, optional
  sibling persistence, copy/export coverage, and Blueprint reopening.
- **2026-08-06:** Standardized Manifest language and the shared Library shell;
  hardened Help audio lifecycle and translated audio routing.
- **2026-08-05:** Finalized Story Seed Settings placement, mature-audience
  metadata, Fate Survival controls, Help guidance, navigation drawer, and the
  compact ARC story-sauce controls.
- **2026-08-04:** Consolidated Story Title into Origin, compacted Origin/ARC,
  and preserved the Creator / Story / World state contract.
- **2026-08-03:** Added canonical schema, validation, tag inference,
  serialization, repository port, Workshop persistence, and generation
  boundaries while retaining compatibility imports.
- **2026-08-02:** Corrected the creation hierarchy around Origin, ARC, World,
  and Settings without changing the locked reference replica.
- **2026-08-01:** Created the production replica and initial development fork.
