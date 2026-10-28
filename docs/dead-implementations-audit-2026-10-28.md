# Dead Implementations Audit — 2026-10-28

Prepared for SENSEI.

## What this is

A sweep of the whole `development` repository looking for code that is **outdated, redundant, unused, or superseded** — the kind of thing that quietly costs time every time a person or an agent works in this codebase.

Nothing here is broken. The repository passes `check:ownership`, `check:package-boundaries` and `check:app` with zero violations. The problem is the opposite: work that was finished and then superseded, but never removed. It still compiles, it still passes its own tests, and it still looks like it belongs.

The method was an import-graph reconstruction over all 1,634 source files, resolved against every real entry point (`api/`, the ten `scripts/build*Api.mjs` bundlers, `vite.config.ts`, the package `exports` maps, and the app). Every finding below was then confirmed by grep before it was written down.

---

## Summary

| # | Finding | Size | Risk | Needs a decision? |
|---|---|---|---|---|
| 1 | The superseded Codex page is still published as a first-class SEN surface | ~30 files | Medium | **Yes** |
| 2 | A dead mock playback module, plus a published contract that describes it wrongly | 1 file | Low | No |
| 3 | Eight server barrels that export nothing reachable | 8 files | Low | No |
| 4 | Four "adapter" files that point back at the package that points at them | 4 files | Low | No |
| 5 | Environment settings nothing ever sets, for a system that no longer exists | 3 names | Low–Medium | No |
| 6 | Exported symbols that ship publicly and are used by nobody | 9 symbols | Low | No |
| 7 | A one-line shim that only its own test imports | 1 file | Low | No |
| 8 | A preview route that exists but is not listed anywhere | 1 route | Low | No |
| 9 | The same keyboard helper written twice, with different behaviour | 2 files | Medium | **Yes** |

**The single most consequential item is #1.** Everything else is housekeeping that can land in one change.

---

## What needs your call

### On #1 — the old Codex page

`src/components/reader-codex/README.md` records the decision on 2026-10-13 in plain words: *"The Codex is remade on the HARNESS record (`StoryCodex` and `deriveStoryCodex` in `harness-generation/`). The development `ReaderCodex` in this folder is unchanged and stays, but the Reader no longer opens it."*

So the README **already knows** the old Codex page is superseded. What has not happened is the consequence. The old Codex is still exported as `@seihouse/sen/reader-codex` — a first-class published surface — and the repository's own rule says a remake replaces the old thing "in the same change."

The conflict is real and it is yours to settle, because the README says "stays" while the rule says "delete." My recommendation is **delete the superseded page and keep the card surfaces**, but that needs your word because SEN is a licensable engine and something outside this repository may be consuming that entry today.

### On #9 — the duplicated keyboard helper

Two feature folders each own a copy of the same WAI-ARIA radio-group keyboard behaviour, and they behave slightly differently. The Story Seed copy is the one with a comment explaining the difference is deliberate. Merging them is a small behaviour change in Profile settings and Story Seed creation, so it is not a silent call.

---

## 1. The superseded Codex page is still a published first-class surface

**What it is.** The Codex as it existed before the HARNESS took it over: the page shell, its sheet overlay, its bestiary, its twelve section views (Portraits, Factions, Power Rankings, Dashboards, Mysteries, Relations, Timeline, Artifacts, Fate, Lore, Collage, Image Gallery), and the eight hooks that drive Codex editing, imagery and voice.

**Why it should be cleaned up.** The repository currently contains **two Codex implementations with two different data models**. The live one is the HARNESS record: `StoryCodex` and `deriveStoryCodex` in `src/components/harness-generation/`, which the Reader renders at `HarnessReaderSession.tsx:535-558` and which the Workshop preview shows in its Development pane. The old one runs on `StoryMemory` from `src/components/reader-codex/shared/types.ts`.

The practical costs:

- **A promise the package cannot keep.** `src/package/sen/README.md:165-167` tells hosts that *"the top bar's Codex button opens the development Reader Codex as a page, with Holdings among its pages; `ReaderCodex` (in `./reader-codex`) takes `extraPages`."* The `extraPages` prop — the one documented way for a host to add its own Codex page — has **zero callers anywhere in the repository**. A host reading that README would build against an extension point that nothing demonstrates.
- **Two sources of truth for the same idea.** An agent asked to "change the Codex" has two plausible targets and no signal about which one the product uses. That is exactly the confusion this audit exists to remove.
- **Dead weight at the size of a feature.** Roughly 30 files and a third of a megabyte of source, all of it still passing its own tests, so nothing ever flags it as stale.

**What depends on it today.** Only the package barrel (`src/package/sen/reader-codex.ts`, 35 exports) and the tests that exercise it. The old section views are imported by exactly two Codex pages: the superseded development page and the locked historical `reference/` copy. The Workshop preview renders the **reference** copy on its Original Reference side and the **HARNESS** copy on its Development side — so the old page is not even on screen anywhere.

**Important: not the whole tree is dead.** Two things in that folder are genuinely live and must stay:

- The **card surfaces** published through `@seihouse/sen/cards` — `CharacterCard`, `CharacterEditCard`, `CharacterProfile`, `LocationCard`, `LocationProfile`, `CodexHovercard`, `CodexCardAmbience`, `codexEntityAccent`. `CharacterCard` imports `ReaderCodexImageGallery`, so that one section view has a live caller.
- **`src/components/reader-codex/shared/types.ts`**, which is still the shared reader contract (`checkNovelExpandedApp.mjs:44`) and is imported by `src/narrative/codexHighlighting.ts`.

**Recommended action.** Delete the superseded page, its overlay, its bestiary, and the section views and hooks that only that page uses. Keep the card surfaces and `shared/types.ts`. Repoint the `@seihouse/sen/reader-codex` entry at the HARNESS Codex, or retire the entry. Then correct `src/package/sen/README.md:165-167` so it no longer promises `extraPages`.

**Risk: medium.** It is published API, and SEN is meant to be embedded by other products. The rollback is a revert of one commit; the real risk is a host we cannot see.

---

## 2. A dead mock playback module, and a published contract that misdescribes it

**What it is.** `src/components/reader-chamber/shared/readerPlayback.ts` — a Workshop replica exporting an inert `useReaderPlayback`, a set of `MOCK_VOICES`, and `extractSFXCues`.

**Why it should be cleaned up.** The live Reader moved on: `development/ReaderChamber.tsx:29` now takes `useReaderPlayback` from `src/narrative/readerRuntime.tsx`, and `extractSFXCues` from `src/audio/readerVisibleText.ts`. The old file was left behind.

Worse, it leaves a **false statement in the published package**. `src/package/sen/reader-chamber.ts:14-20` says the Reader surfaces *"import the Workshop's mock application state directly (`shared/stubs`, `MOCK_VOICES`), so those mocks are bundled into this entry today."* I computed the published entry's full import closure — 108 files — and **not one** of them is a stub, a Workshop file, or `readerPlayback.ts`. The mocks are not bundled. The published boundary described to hosts is wrong.

**What depends on it.** One importer: `src/audio/readerVisibleText.test.ts:2`, and that test asserts `extractSFXCues` is identical to `extractReaderVisibleAudioText` — a tautology over an alias, testing nothing.

**Recommended action.** Delete the file, point the test at `src/audio/readerVisibleText` directly, and correct the package header. Then check whether the narration block in `shared/stubs.ts` (around lines 70-110) is still needed by anything.

**Risk: low. Confidence: high.**

---

## 3. Eight server barrels that export nothing reachable

**What it is.** `src/server/{achievements,dao-pillar,dao-xp,energy,familiars,qi,relics,rewards}/index.ts`.

**Why it should be cleaned up.** They present roughly fifty server symbols as a supported API that resolves to nothing. `dao-pillar/index.ts` is the sharpest case: it re-exports `PostgresDaoPillarRepository`, a durable Postgres adapter that is **wired into no runtime at all** — only the in-memory repositories are, in `src/server/economy/developmentRuntime.ts` and `economy/vercelHandler.ts`. A reader would reasonably conclude the durable path is live.

**What depends on it.** Nothing. No importer anywhere, no `exports` map entry, no build script, no client call.

**Recommended action.** Delete all eight. Note that doing so leaves `src/server/energy/narrativeUsage.ts` and `narrativeOperation.ts` with no non-test importer — its own file says *"nothing in `src/server/harness-generation` imports this yet, by design,"* so that is a conscious call to make, not an accident to let happen by accident.

**Risk: low. Confidence: high.**

---

## 4. Four "adapter" files that point back at the package that points at them

| File | Content | Imported by |
|---|---|---|
| `src/components/reader-chamber/shared/id.ts` | `export * from '@seihouse/sen/reader-chamber'` | nothing |
| `src/components/reader-chamber/shared/dialect.ts` | `export * from '@seihouse/sen/reader-chamber'` | nothing |
| `src/components/reader-codex/shared/codexHighlighting.ts` | `export * from '@seihouse/sen/reader-codex'` | nothing |
| `src/components/reader-codex/shared/CodexHovercard.tsx` | `export * from '.../workshop/reference-support/reader-codex/CodexHovercard'` | nothing |

**Why it should be cleaned up.** These are two-line shims that give a *second* public path to symbols that already have a canonical one — and in two cases a circular one: component → package → component. They were created to give the locked reference reader a single clean seam, but the reference reader never adopted them; it kept its own snapshot copies (`reference/light-novels/src/lib/id.ts`, `lib/dialect.ts`, `components/CodexHovercard.tsx`).

They also carry **stale claims**. `src/components/reader-codex/README.md:92` says `shared/CodexHovercard.tsx` *"now serves only the historical Reference Reader path"* — it serves nothing; the one test that touches it imports the `workshop/reference-support` module directly, bypassing the adapter. And `src/workshop/reference-support/story-seed/dialect.ts:3` cites *"the same pattern as `reader-chamber/shared/dialect.ts`"* — a file that now has no content of its own.

**What depends on it.** Nothing. The only mention of each path in the repository is its own ownership row in `scripts/ownershipInventory.mjs:16-18,20`.

**Recommended action.** Delete all four and remove their four ownership rows.

**Risk: low. Confidence: high.**

---

## 5. Environment settings nothing ever sets, for a system that no longer exists

- **`CHAPTER_GENERATION_DEFAULT_MODEL`** — read only at `src/server/story-seed-blueprint/config.ts:33`. Never set anywhere in the repository, and never documented. It names the **retired** chapter-generation system that the HARNESS replaced.
- **`AI_TEMPERATURE`** and **`AI_MAX_TOKENS`** — read at `story-seed-blueprint/config.ts:46,53` and `harness-generation/config.ts:43,47`. Never set, never documented. They are invisible global fallbacks shared by two unrelated features, which means tuning one silently affects the other.

**Recommended action.** Drop both `?? environment.AI_*` fallbacks and the `CHAPTER_GENERATION_DEFAULT_MODEL` read; the per-feature `HARNESS_GENERATION_*` and `STORY_SEED_BLUEPRINT_*` settings already cover it.

**Risk: low–medium.** A deployed Vercel environment could set variables we cannot see from here. Confirm before removing.

---

## 6. Exported symbols that ship publicly and are used by nobody

| Symbol | Where |
|---|---|
| `ExpansionSeals` | `src/components/light-novels-home/development/WorldExpressions.tsx:17` |
| `ARC_PLAN_SCHEMA` | `src/components/arc-goals/shared/arcGoals.ts:44` |
| `CATEGORIZED_TAGS`, `TAG_PRESETS` | `src/components/story-seed/shared/storyTagCatalog.ts:518,523` |
| `WORLD_BLUEPRINT_RESPONSE_SCHEMA` | `src/server/story-seed-blueprint/generate.ts:121` |
| `geminiBlueprintModelId` | `src/server/story-seed-blueprint/config.ts:65` |
| `geminiHarnessModelId` | `src/server/harness-generation/config.ts:85` |
| `VOICE_CLASSIFICATIONS` | `src/server/audio/voiceCatalog.ts:29` |

**Why it should be cleaned up.** Each is exported but imported nowhere. Because they travel out through `export *` barrels, they silently become public API with no consumer, no test and no documentation. A host could reasonably depend on `ARC_PLAN_SCHEMA` — but `ARC_PLAN_DRAFT_SCHEMA`, its sibling, is the one the writer actually uses (`src/server/harness-generation/prompt.ts:403`). Two similarly-named schemas where one is a decoy is a trap.

The two tag constants are the clearest case: the reference form uses its own copies from `story-seed/reference/constants.ts:1,99`, so the shared ones are pure duplication.

**Recommended action.** Delete or unexport each. Check the published-package consumers before removing anything that a host might already use.

**Risk: low internally.**

---

## 7. A one-line shim that only its own test imports

`src/server/model-router/geminiThinking.ts` is a single line re-exporting from `@seihouse/library/model-router-server`. Its only importer is its own test (`modelRouter.test.ts:15`). The real implementation is `src/library/model-router/geminiThinking.ts`, which is already the registered adapter (`src/server/model-router/catalog.ts:71`).

**Recommended action.** Delete the shim and point the test at the package entry.

**Risk: low. Confidence: high.**

---

## 8. A preview route that exists but is listed nowhere

`src/App.tsx:92,132` registers `?preview=audio-player-smoke`, and it works. But it has **no entry** in `src/workshop/manifest.ts` — so it is reachable by URL yet invisible on the Workshop home, absent from the feature list, and absent from the owner inventory in `scripts/ownershipInventory.mjs`. The repository rule is one manifest entry per feature with an explicit owner.

**Recommended action.** Add the manifest row with its owner, or remove the route.

**Risk: low. Confidence: high.**

---

## 9. The same keyboard helper written twice, with different behaviour

`src/components/story-seed/development/radioGroupKeyboard.ts` and `src/components/user-profile/development/radioGroupKeyboard.ts` implement the same WAI-ARIA radio-group keyboard pattern. The behaviour differs: the Profile fork always calls `nextRadio.click()`, while the Story Seed version skips the click when focus does not change.

**Recommended action.** Merge into one Library-level helper, or at minimum align the behaviour and give it a shared test. (A third copy in `library-shell/reference/` is a recorded capture and is legitimate historical material.)

**Risk: medium.** A real behaviour change in Profile settings and Story Seed creation. The Profile copy is an explicitly documented fork, so this is a known trade-off rather than an accident.

---

## The guard gap — why all of this survived

`scripts/ownershipGraph.mjs:145` already computes reachability. It just never runs where it would matter:

- The check iterates `Object.entries(packages)`, which is **`sen` and `library` only**.
- `src/server/` is classified `host` (`ownershipInventory.mjs:71`), so **no server file is ever reachability-checked**.
- The four adapters in #4 and the mock in #2 are classified `workshop`, so they are **never checked** either.
- The superseded Codex in #1 is classified `sen` — and it passes, because *publishing* it makes it "reachable." The guard cannot tell published-and-used from published-and-abandoned.

**One change closes the category permanently:** run the existing `UNREACHABLE` check against `host`, rooted at the real server entry points (`api/*.js`, the ten `scripts/build*Api.mjs` `ssr:` entries, `src/server/developmentApis.ts`), and add a reachability pass for `workshop`-owned files. Otherwise every sprint re-audits this by hand.

---

## What I checked and found clean

Stated so the next audit does not repeat it:

- **All ten API routes** have a matching builder script *and* a real client caller. No orphan routes.
- **Every `vercelHandler.ts`** is a genuine bundler entry, not an orphan.
- **The Postgres adapters** are test-reachable *and* documented as the durable reference in their own READMEs. Deliberately retained.
- **No duplicate server implementation.** `src/server/model-router/*` over `src/library/model-router/*` is a correct facade-over-library pattern, with #7 the only divergence.
- **No Workshop or mock file leaks into any published package entry.** I resolved every import closure for all 22 `@seihouse/sen/*` and `@seihouse/library/*` entries: zero Workshop, stub, `reference/`, or `readerPlayback` files.
- **No orphan files under the `sen`/`library` component trees** — `check:ownership` already fails on those.
- **No dead Workshop preview state.** Every mock and simulator under `src/workshop/previews/**` is referenced by its workspace.
- **The `reference/` folders are not dead** — they are the historical material the repository rules require, and this audit leaves them alone. The one exception worth a decision is `src/components/reader-codex/reference/CodexSheetOverlay.tsx`, which nothing opens: the reader-chamber reference uses its own copy instead.

---

## Method

Import-graph reconstruction over all 1,634 files under `src/`, resolved against every entry point: `api/`, the ten `scripts/build*Api.mjs` bundlers, `src/server/developmentApis.ts`, `vite.config.ts`, `src/host/`, and the `exports` maps in `src/package/{sen,library}/package.json`. Cross-checked against `npm run check:ownership` (0 violations) and `npm run check:package-boundaries` so that nothing already guarded is reported as new. Every finding above was confirmed by grep before it was written down, and the published-package import closures were computed directly rather than assumed.

**This audit changed no product code.** It is a report only.
