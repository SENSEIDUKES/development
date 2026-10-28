# Dead Implementations Audit — 2026-10-28

Prepared for SENSEI.

## What this is

A sweep of the whole `development` repository looking for code that is **outdated, redundant, unused, or superseded** — the kind of thing that quietly costs time every time a person or an agent works in this codebase.

No production-code regression was identified. The repository passes `check:ownership`, `check:package-boundaries` and `check:app` with zero violations. The problem is the opposite: work that was finished and then superseded, but never removed. It still compiles, it still passes its own tests, and it still looks like it belongs. The exceptions this audit does find are narrow and named: an unregistered preview route (#8), and a local test run that is red on a Windows checkout for reasons unrelated to any branch (#10, #11).

The method was an import-graph reconstruction over all 1,634 source files, resolved against every real entry point (`api/`, the ten `scripts/build*Api.mjs` bundlers, `vite.config.ts`, the package `exports` maps, and the app). Every finding below was then confirmed by grep before it was written down.

---

## Summary

| # | Finding | Size | Risk | Needs a decision? |
|---|---|---|---|---|
| 1 | The superseded Codex page is still published as a first-class SEN surface | 3 files, 6 live callers | Medium | **Yes** |
| 2 | A dead mock playback module, plus a published contract that describes it wrongly | 1 file | Low | No |
| 3 | Eight server barrels that export nothing reachable | 8 files | Low | No |
| 4 | Four "adapter" files that point back at the package that points at them | 4 files | Low | No |
| 5 | Environment settings nothing ever sets, for a system that no longer exists | 3 names | Low–Medium | No |
| 6 | Exported symbols that ship publicly and are used by nobody | 8 symbols | Low | No |
| 7 | A one-line shim that only its own test imports | 1 file | Low | No |
| 8 | A preview route that exists but is not listed anywhere | 1 route | Low | No |
| 9 | The same keyboard helper written twice, with different behaviour | 2 files | Medium | **Yes** |
| 10 | A leftover nested checkout that breaks `npm test` locally | 390 MB | Low | No |
| 11 | The test suite is not green on a Windows checkout | 4 files / 5 tests | Low | No |

**The single most consequential item is #1** — not because of its volume (three files), but because it is the only one that leaves two competing answers to "what is the Codex," and the only one that blocks the Codex cleanup until you say which way it goes. #9 also needs a call, but on a much smaller and reversible question. Everything else is housekeeping that can land in one change.

---

## What needs your call

### On #1 — the old Codex page

`src/components/reader-codex/README.md` records the decision on 2026-10-13 in plain words: *"The Codex is remade on the HARNESS record (`StoryCodex` and `deriveStoryCodex` in `harness-generation/`). The development `ReaderCodex` in this folder is unchanged and stays, but the Reader no longer opens it."*

So the README **already knows** the old Codex page is superseded. What has not happened is the consequence. The old Codex is still exported as `@seihouse/sen/reader-codex` — a first-class published surface — and the repository's own rule says a remake replaces the old thing "in the same change."

The conflict is real and it is yours to settle, because the README says "stays" while the rule says "delete." My recommendation is **delete the superseded page and leave the rest of the tree alone**, but that needs your word because SEN is a licensable engine and something outside this repository may be consuming that entry today.

Two corrections to the obvious plan, both found while this was being reviewed:

- **The entry cannot simply be retired.** It also publishes live helpers that live Workshop features import — the Character Voice preview and both Card Workshop surfaces. Those have to be relocated and their callers updated first. The full inventory and the ordering are in finding 1.
- **The dead set is three files, not a whole feature.** The section views and hooks look like part of the old Codex but are shared with the locked Original Reference, which AGENTS.md requires be retained. Deleting them would break the Workshop's Original Reference pane.

### On #9 — the duplicated keyboard helper

Two feature folders each own a copy of the same WAI-ARIA radio-group keyboard behaviour, and they behave slightly differently. The Story Seed copy is the one with a comment explaining the difference is deliberate. Merging them is a small behaviour change in Profile settings and Story Seed creation, so it is not a silent call.

---

## 1. The superseded Codex page is still a published first-class surface

**What it is.** The Codex *page* as it existed before the HARNESS took it over: the page shell (`development/ReaderCodex.tsx`, 41 KB), its sheet overlay (`development/CodexSheetOverlay.tsx`, 4 KB), and its bestiary (`development/ReaderCodexBestiary.tsx`, 10 KB). **3 source files, 55 KB**, plus their two test files.

**Why it should be cleaned up.** The repository currently contains **two Codex implementations with two different data models**. The live one is the HARNESS record: `StoryCodex` and `deriveStoryCodex` in `src/components/harness-generation/`, which the Reader renders at `HarnessReaderSession.tsx:535-558` and which the Workshop preview shows in its Development pane. The old one runs on `StoryMemory` from `src/components/reader-codex/shared/types.ts`.

The practical costs:

- **A promise the package cannot keep.** `src/package/sen/README.md:165-167` tells hosts that *"the top bar's Codex button opens the development Reader Codex as a page, with Holdings among its pages; `ReaderCodex` (in `./reader-codex`) takes `extraPages`."* The `extraPages` prop — the one documented way for a host to add its own Codex page — has **zero callers anywhere in the repository**. A host reading that README would build against an extension point that nothing demonstrates.
- **Two sources of truth for the same idea.** An agent asked to "change the Codex" has two plausible targets and no signal about which one the product uses. That is exactly the confusion this audit exists to remove.
- **A published entry that mixes dead and live.** `@seihouse/sen/reader-codex` exports the dead page *and* the live helpers at the same time, so the entry can only be cleaned up by relocation, not deletion.

**What depends on it today.** The superseded page itself is reached only by the package barrel (`src/package/sen/reader-codex.ts`, 35 exports) and the tests that exercise it — nothing renders it. The **entry** around it has six further live consumers, inventoried below. The Workshop preview renders the **reference** copy on its Original Reference side and the **HARNESS** copy on its Development side — so the superseded page is not on screen anywhere.

**The dead set, exactly** — 3 source files, 55 KB, plus 2 test files:

- `development/ReaderCodex.tsx` — the page.
- `development/CodexSheetOverlay.tsx` — its overlay.
- `development/ReaderCodexBestiary.tsx` — its bestiary.

**The scope is much smaller than it first looks, and that is the point.** The section views and hooks look like part of the old Codex, but they are **not** dead. The locked Original Reference page imports all eleven section views (`src/components/reader-codex/reference/ReaderCodex.tsx:16-26`) and three of the hooks (`:29-31`), and `ReaderCodexWorkspace.tsx:264` still renders that page on the Original Reference side of the Workshop preview. AGENTS.md requires that reference to be retained, so those files stay and must not be swept into a deletion.

**Everything else in that folder is live and stays.** None of the following may be swept into a deletion:

- The **eleven section views** in `shared/codex/` — `ReaderCodexCharacters`, `ReaderCodexFactions`, `ReaderCodexPower`, `ReaderCodexDashboards`, `ReaderCodexMysteries`, `ReaderCodexRelations`, `ReaderCodexTimeline`, `ReaderCodexArtifacts`, `ReaderCodexFate`, `ReaderCodexGlossary`, `ReaderCodexCollage` — plus `ReaderCodexImageGallery`, the twelfth. All are imported by the retained Original Reference page or by the card surfaces.
- The **hooks** in `shared/hooks/` — `useCodexAnalytics`, `useCodexImageEvolution` and `useCodexDeletions` (reference page, `:29-31`), `useCodexLocations` (via `shared/codex/ReaderCodexCharacters.tsx:6`), `useCodexCharacterEditing` (via `character-cards/CharacterEditCard.tsx:9`), `useCodexVoiceQuote` and `useCodexVoiceCards`, `useHistoricalMediaUrls`.
- The **card surfaces** published through `@seihouse/sen/cards` — `CharacterCard`, `CharacterEditCard`, `CharacterProfile`, `LocationCard`, `LocationProfile`, `CodexHovercard`, `CodexCardAmbience`, `codexEntityAccent`.
- **`development/CodexHovercard.tsx`, `development/CodexCardAmbience.tsx`, `development/codexEntityAccent.ts` and `development/codexHovercardStyles.ts`** — published through `@seihouse/sen/cards` and imported by `reader-chamber/development/CodexCard.tsx` and `ReaderChamber.tsx`. The `development/` folder is not a dead folder.
- **`shared/codex/entityImageHistory.ts`**, **`shared/assetIdentity.ts`**, **`shared/codexContext.ts`**, **`shared/codexEntryContext.ts`**, **`shared/downloadUtils.ts`**, **`shared/codex/CodexContext.tsx`**, **`shared/codex/CodexEntryContextDialog.tsx`**, **`shared/codex/CodexEntryContextFields.tsx`**, **`shared/DestinyChoicePanel.tsx`** and **`src/components/reader-codex/shared/types.ts`** — the last is still the shared reader contract (`checkNovelExpandedApp.mjs:44`) and is imported by `src/narrative/codexHighlighting.ts`.

**The entry itself cannot simply be retired.** The old Codex *page* is dead, but the entry also publishes live things that live Workshop features import. Retiring or repointing the entry without relocating those first would break them:

| Consumer | Imports from `@seihouse/sen/reader-codex` |
|---|---|
| `src/workshop/previews/character-voice/CharacterVoiceWorkspace.tsx:3-8` | `CodexProvider`, `useCodexVoiceQuote`, `type CodexVoiceQuoteState`, `type Character`, `type Story` |
| `src/components/card-workshop/development/CardWorkshopView.tsx:15` | `createCodexHighlighter`, `splitByCodexTerms` |
| `src/components/card-workshop/development/CardWorkshopContextualReader.tsx:9-14` | `createCodexHighlighter`, `splitByCodexTerms`, `type CodexTerm`, `type CodexTermType` |
| `src/components/reader-chamber/shared/stubs.ts:23` | `collectCodexTerms` |
| `src/workshop/previews/card-workshop/previewData.ts:2` | `type CodexTerm` |
| `src/workshop/reference-support/reader-codex/codexCompatibility.ts:10-11` | `canonicalAssetId`, `isSameAssetId`, `handleDownload` |

None of these come from the superseded page or from the card surfaces. They come from the **surviving** parts of the tree: `src/narrative/codexHighlighting.ts` (which owns `CodexTerm`, `CodexTermType`, `CodexHighlighter`, `CodexSegment`, `escapeRegExp`, `collectCodexTerms`, `createCodexHighlighter` and `splitByCodexTerms`), `shared/codex/CodexContext.tsx`, `shared/hooks/useCodexVoiceQuote.ts`, `shared/codexContext.ts`, `shared/assetIdentity.ts` and `shared/downloadUtils.ts`.

**Recommended action, in this order.**

1. Delete the 3 dead files and their 2 test files. **Nothing else in `reader-codex/` goes** — the section views, hooks, card surfaces and contracts are live through the retained Original Reference and the card system.
2. **Relocate the surviving exports and update the six consumers.** The highlighter is a `narrative/` module, so `@seihouse/sen/contracts` — which already re-exports `narrative/story`, `narrative/voice` and the rest of that layer — is its natural home. `CodexProvider`, `useCodexVoiceQuote` and the card-adjacent helpers belong with `@seihouse/sen/cards`, which already publishes `CharacterCard`, `CharacterEditCard` and `CodexHovercard` and already carries `reader-codex.css`. Then update the six consumers above to the new entry.
3. **Only then** repoint `@seihouse/sen/reader-codex` at the HARNESS Codex, or retire the entry — whichever the owner prefers.
4. Correct `src/package/sen/README.md:165-167` so it no longer promises `extraPages`.

Step 2 is not optional. Retiring or repointing the entry first would break the Character Voice preview and both Card Workshop surfaces.

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

**What depends on it.** Nothing executable. No file in the repository imports any of the four — the only code references are their own ownership rows in `scripts/ownershipInventory.mjs:16-18,20`, and the only prose references are the stale documentation claims quoted above.

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

`src/App.tsx:92,132` registers `?preview=audio-player-smoke`, and it works. But it has **no entry** in `src/workshop/manifest.ts` — so it is reachable by URL yet invisible on the Workshop home and absent from the feature list. The repository rule is one manifest entry per feature with an explicit `owner`. The ownership inventory owns *paths*, not routes — `src/App.tsx` itself is owned there as the "preview router" (`scripts/ownershipInventory.mjs:74`) — so what this route is missing is its own manifest record carrying an `owner` and a `status`.

**Recommended action.** Add the manifest row with its owner, or remove the route.

**Risk: low. Confidence: high.**

---

## 9. The same keyboard helper written twice, with different behaviour

`src/components/story-seed/development/radioGroupKeyboard.ts` and `src/components/user-profile/development/radioGroupKeyboard.ts` implement the same WAI-ARIA radio-group keyboard pattern. The behaviour differs: the Profile fork always calls `nextRadio.click()`, while the Story Seed version skips the click when focus does not change.

**Recommended action.** Merge into one Library-level helper, or at minimum align the behaviour and give it a shared test. (A third copy in `library-shell/reference/` is a recorded capture and is legitimate historical material.)

**Risk: medium.** A real behaviour change in Profile settings and Story Seed creation. The Profile copy is an explicitly documented fork, so this is a known trade-off rather than an accident.

---

## 10. A leftover nested checkout breaks `npm test` on the working machine

This one is not repository code — it is in the working directory — but it cost real time during this audit, so it belongs on the record.

**What it is.** `.claude/worktrees/pr-365-lm-studio/` is a leftover checkout of PR #365 — **24,506 files, 390 MB** — sitting inside the repository.

**Why it should be cleaned up.** Git ignores it (`.git/info/exclude:24` lists `.claude/worktrees/`), but **vitest does not read `.git/info/exclude`**. Its default glob runs every `*.test.ts` under the project root, so it picks up that other branch's tests and runs them against *this* repository's configuration. The result is a wall of failures that has nothing to do with the working tree:

- `npm test` → **138 failed / 421 passed** test files, 772 failed tests.
- The first failure is `.claude/worktrees/pr-365-lm-studio/src/workshop/previews/text-highlight-engine/parts.test.tsx:15` — *"Text Highlight Engine: src/components/text-highlight-engine/development/TextHighlightEngine.tsx: expected false to be true"*. The file it cannot find is in the main repository; the test resolves paths relative to the worktree it was written for.

**What depends on it.** Nothing in the repository — it is untracked and locally excluded. CI never sees it: a clean checkout has no `.claude/`, and the `verify` job's `npm test` passes there.

**Recommended action.** Delete the stale worktree. If these are produced routinely, add a `test.exclude` entry for `.claude/**` to the vitest configuration so the failure mode cannot recur — vitest honours its own `exclude` but not `.gitignore`.

**Risk: low. Confidence: high.**

---

## 11. The test suite is not green on a Windows checkout

This one costs every Windows contributor — and every agent working on this repository from a Windows machine — a red test run that has nothing to do with their change.

**What it is.** With the leftover worktree from #10 excluded, `npm test` still fails **4 test files / 5 tests**. CI is green, so these are local-only. Three of the five are deterministic; two are timeouts.

**Why it should be cleaned up.** The deterministic three are all in `src/components/reader-chamber/reference/snapshot.test.ts`, and all three are line-ending artifacts:

| Test | Failure | Cause |
|---|---|---|
| "keeps every copied production file byte-for-byte unchanged" | `expected [ …(119) ] to deeply equal []` | all 119 verbatim files hash differently |
| "lists every file in the copy, and nothing that is missing" | `expected [ …(127) ] to deeply equal [ …(127) ]` | Windows path separators against forward-slash paths |
| "marks every stand-in as a Workshop seam" | `expected false to be true` | the seam check is `startsWith('/**\n * WORKSHOP SEAM')`, and the file starts `/**\r\n` |

The cause is `core.autocrlf = true`. Git checks the reference copy out with CRLF line endings, while `snapshot.json` records SHA-256 hashes of the LF form stored in the repository. I verified this directly: across all 119 verbatim files, the working-tree hash mismatches the manifest **119 times**, and the hash of the same file read from git's index mismatches **0 times**.

**The repository already has the fix, for the same reason.** `.gitattributes` carries:

> `# Byte-verified Familiar assets retain their supplied bytes, including metadata line endings,` `# across platforms. Renderer-only pet-request projections are intentionally sanitized first.`
> `public/familiars/** -text`
> `src/host/familiar/package-metadata/** -text`

The production Reader snapshot is byte-verified in exactly the same way, and is missing from that list.

**The other two failures are timeouts.** `scripts/checkNovelExpandedApp.test.ts` ("passes the real app", 12.3 s) and `src/components/story-seed/development/ArcWorkspace.test.tsx` ("saves every Blueprint review edit…", 6.1 s) both fail with `Test timed out in 5000ms` — vitest's default budget. The surrounding `Not implemented: HTMLCanvasElement's getContext()` lines are jsdom noise from the missing `canvas` package, not the assertion.

**What depends on it.** Nothing in the product — the failures are in the test harness only.

**Recommended action.** Add `src/components/reader-chamber/reference/light-novels/** -text` to `.gitattributes`, matching the existing byte-verified rules, and normalise the paths and seam-header checks in `snapshot.test.ts` to be platform-independent. Then either raise the timeout for the two slow tests or give them an explicit budget — a five-second default is tight for a test that walks the whole app import graph.

**Risk: low.** The `.gitattributes` change alters what Git writes to disk for those files, so it needs one `git rm --cached` + re-checkout for the rule to take effect on an existing clone. **Confidence: high** on the diagnosis — it was measured, not inferred.

---

## The guard gap — why all of this survived

`scripts/ownershipGraph.mjs:145` already computes reachability — the `UNREACHABLE` check inside the `for (const [owner, pkg] of Object.entries(packages))` loop that starts at line 127. It just never runs where it would matter:

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
- **No Workshop or mock file leaks into any published package entry.** I resolved every import closure for all 37 `@seihouse/sen/*` and `@seihouse/library/*` entry points: zero Workshop, stub, `reference/`, or `readerPlayback` files.
- **No orphan files under the `sen`/`library` component trees** — `check:ownership` already fails on those.
- **No dead Workshop preview state.** Every mock and simulator under `src/workshop/previews/**` is referenced by its workspace.
- **The `reference/` folders are not dead** — they are the historical material the repository rules require, and this audit leaves them alone. The one exception worth a decision is `src/components/reader-codex/reference/CodexSheetOverlay.tsx`, which nothing opens: the reader-chamber reference uses its own copy instead.

---

## Method

Import-graph reconstruction over all 1,634 files under `src/`, resolved against every entry point: `api/`, the ten `scripts/build*Api.mjs` bundlers, `src/server/developmentApis.ts`, `vite.config.ts`, `src/host/`, and the `exports` maps in `src/package/{sen,library}/package.json`. Cross-checked against `npm run check:ownership` (0 violations) and `npm run check:package-boundaries` so that nothing already guarded is reported as new. Every finding above was confirmed by grep before it was written down, and the published-package import closures were computed directly rather than assumed.

Checks run against this branch: `npm run check:ownership` (1634 source files, 0 violations), `npm run check:package-boundaries` (0 violations), `npm run check:app` (690 files reached, 0 violations), `npm run typecheck` (clean), and CI's `verify` job (green, including `npm test`).

The local `npm test` run on this Windows machine is **not** green, for the two reasons in findings 10 and 11. Neither is caused by this branch, which changes one Markdown file and no code.

**This audit changed no product code.** It is a report only.
