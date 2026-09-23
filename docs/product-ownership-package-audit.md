# Product Ownership and Package Coverage Audit — Part One

**Audit date:** 2026-09-18

**Approved baseline audited:** `main` at `60934256df3e84c5dbb50c917a03b18b038399d2`

**Audit branch:** `audit/product-ownership-package-coverage`

**Scope:** audit and planning only; no product code, package manifest, export, schema, API, or runtime behavior changes

> **Later change (2026-09-23):** this report describes the audited commit and is left as written.
> The reward rework has since retired the Relic v3 foundation, the story-milestone Relic economy,
> standalone reward Titles, and the Dao Pillar's Relic and Title reward types. Relics are now Fate
> Survival rewards, achievements earn Mystery Scrolls, and `@seihouse/library/rewards` exists. See
> [`src/server/rewards/README.md`](../src/server/rewards/README.md) before acting on any Relic,
> Title or reward recommendation below.

## Reading this report

- **Verified fact** means the statement was confirmed from the audited commit's files, import graph, Git history, or a command recorded in this report.
- **Recommendation** means a proposed Part Two correction. It is not implemented by this audit.
- **Decision** means SENSEI must select or approve the direction before implementation.
- “Public” means reachable from a package export in the published manifest, not merely imported by the Development application.
- “Effective owner” means the source or runtime boundary that controls the capability today. Current location is evidence, not a claim that the location is correct.

## 1. Executive summary

**Verified fact:** The approved baseline is current. Local `main`, `origin/main`, and the audit branch all resolved to `60934256df3e84c5dbb50c917a03b18b038399d2` when the audit began. First-parent history includes merged PR #224 for the latest Profile settings work, PR #225 for the standalone Energy skeleton and its reservation-price correction, and PR #226 for the Daily Dao Pillar and Qi ledger.

**Verified fact:** The repository has four intended package lanes, but only two are authored here. Development authors `@seihouse/sen` and `@seihouse/library`; it consumes reproducible vendored artifacts for `@seihouse/ui` and `@seihouse/library-ui` from the UI repository. The declared top-level dependency direction is correct: Library depends on SEN and Library UI; Library UI depends on UI; SEN depends on UI. SEN does not declare Library or Library UI.

**Verified fact:** Package coverage is not healthy enough to treat a green package build as an ownership proof.

- `@seihouse/sen` exposes 14 manifest exports and its public graph reaches 286 source files. That graph includes 11 files in the explicitly Library-branded `src/components/library-shell/` tree, first-party audio catalogs and URLs, Celestial presentation, authentication UI, a Workshop-named localStorage adapter, and 11 explicitly waived DEV mock-application importers.
- `@seihouse/library` exposes only four manifest exports and reaches 10 source files. It publishes cultivation presentation, relic presentation/model, and the Library presentation provider, but not Profile, Energy, Qi, Daily Dao Pillar, Library shell/navigation/footer, Home/discovery, account behavior, administration, or the server-side relic foundation.
- Profile, Energy, DAO Pillar/Qi, Library shell, Light Novels Home, and provenance all contain production-relevant capabilities that are absent from every public package entry.
- The boundary validator starts only from published entries. It can detect forbidden files in the graph it sees, but it cannot detect missing ownership or unexported production features. Its narrow Library-owned path list also does not classify `library-shell`, `user-profile`, `energy`, `dao-pillar`, `light-novels-home`, or `sen-icons` as Library-owned.

**Verified fact:** Profile is a Library product surface, not a SEN capability. Its current implementation mixes Library domain behavior, Celestial presentation, host service ports, local Workshop simulation, and direct source imports. It is not exported by `@seihouse/library` or `@seihouse/library-ui`.

**Verified fact:** Energy is no longer owned by Profile state. A real standalone server-owned Library Energy capability now exists for balances, grants, prices, reservation, settlement/charging, release of held reservations, transaction history, identity, authorization, and idempotent recovery. Profile reads it through an Energy client/provider and never mounts it in public view. However, Energy has no public Library package entry, no generation consumer, no production identity verifier or durable adapter wired in DEV, and no post-settlement refund operation. Releasing a held reservation is not the same as refunding an already charged transaction.

**Recommendation:** Part Two should first establish neutral contracts and enforcement, then remove Library and mock dependencies from SEN, then publish the missing Library-domain surfaces, and only afterward wire concrete host/backend adapters and migrate consumers. Moving directories first would preserve the current coupling under different names.

## 2. Verified current package and dependency graph

### Baseline and provenance

| Item | Verified value |
| --- | --- |
| Approved branch | `main` |
| Audited commit | `60934256df3e84c5dbb50c917a03b18b038399d2` |
| Commit subject | `Merge pull request #226 from SENSEIDUKES/claude/daily-dao-pillar-calendar-uhio77` |
| Profile merge | PR #224, merge commit `cf253a4` |
| Energy merge | PR #225, merge commit `e3edbe5`; feature commits include `0032dd6` and reservation fix `5d6ebaa` |
| DAO Pillar/Qi merge | PR #226, merge commit `6093425`; feature commits `d874a29` and `b13dc30` |
| UI artifact provenance | UI commit `42961e48e78ee816f9c2801a37a7f66af8aa2ae2`, UI PR #60 |
| Library UI artifact provenance | UI commit `1470501fa09156019eebb4f5e08179f8f9f2afde`, UI PR #65 |

### Declared package graph

```text
Development / Library host
├── @seihouse/library@0.2.0
│   ├── peer: @seihouse/sen >=0.4.0
│   └── peer: @seihouse/library-ui 0.4.0
├── @seihouse/sen@0.4.0
│   ├── peer: @seihouse/ui 0.4.0
│   └── peer: @seihouse/audio-player
├── @seihouse/library-ui@0.4.0 (vendored from UI)
│   └── peer: @seihouse/ui ^0.4.0
└── @seihouse/ui@0.4.0 (vendored from UI)
```

**Verified fact:** Both vendored UI manifests are currently marked `private: true`. Development consumes them from pinned tarballs and validates their integrity and provenance. This does not invalidate the ownership lane, but publication/installability outside this workspace is an external UI-repository release concern.

### Public exports and real source reachability

| Package | Manifest exports | Effective source reachability | Coverage observation |
| --- | ---: | --- | --- |
| `@seihouse/ui@0.4.0` | root, styles, tokens | Vendored built artifact | Universal primitives/tokens; source is external to this audit. |
| `@seihouse/library-ui@0.4.0` | root, styles | Vendored built artifact | Celestial Library presentation; source is external to this audit. |
| `@seihouse/sen@0.4.0` | 14 | 286 files: 8 audio, 2 arc goals, 42 chapter generation, 25 manifestation, 20 HARNESS, **11 Library shell**, 53 Reader, 52 Codex, 3 SEN icons, 51 Story Seed, 3 language, 3 presentation, 13 entry files | Broad, but semantically contaminated by Library chrome, first-party catalogs, auth UI, local defaults, and mock state. |
| `@seihouse/library@0.2.0` | 4 | 10 files: 1 cultivation, 1 Library presentation provider, 4 relics, 4 entries | Structurally clean but drastically incomplete for actual Library product behavior. |

The SEN subpaths are root, presentation, color-codes, cards, reader-chamber, reader-codex, manifestations, audio, story-seed, chapter-generation, harness-generation, codex-cards (deprecated alias), arc-goals, and styles. The Library subpaths are root, presentation, cultivation, and relics.

**Verified fact:** The packed-package smoke tests find no unresolved declared-package dependency and prove every advertised entry can install, typecheck, and bundle. That proves distribution integrity for the existing exports; it does not prove that all real capabilities are exported or semantically assigned to the correct package.

### Actual dependency-direction exceptions hidden inside the source graph

The manifest graph says SEN is independent of Library. The source graph is more complicated:

```text
SEN public entries
├── Story Seed ──> Library-branded workspace shell and global icons
├── Reader ──────> Library-shell icon wrapper, DEV playback, first-party tracks
├── HARNESS ─────> Library-shell icon wrapper
├── Audio ───────> first-party Library cue/track catalogs and entitlement semantics
├── Manifestation -> Celestial scenes, vessel, and LibraryScrubber presentation
└── Full surfaces -> 11 waived DEV mock-application importers
```

This does not appear as a declared `@seihouse/sen -> @seihouse/library` dependency because the imports bypass the package name and reach source directories directly.

## 3. Complete feature-ownership matrix

The matrix groups files by cohesive production capability rather than listing tests and styles individually. Each row records current location, effective owner/public reachability, layer, dependencies/consumers, direction or coupling, whether it must stay together or split, the required correction, and risk/downstream effect.

### Product and runtime capabilities

| Capability | Current location; effective owner; public reachability | Layer | Dependencies, consumers, and violations | Intended owner; keep/split; required correction | Risk / downstream effects |
| --- | --- | --- | --- | --- | --- |
| Universal primitives and tokens | Vendored `@seihouse/ui`; UI repository; public root/styles/tokens | Presentation | Used by SEN and Library UI. No product-domain dependency found in DEV's manifest. | `@seihouse/ui`; keep product-neutral. Audit/release changes belong in UI repository. | External artifact/version coordination; low DEV source risk. |
| Celestial Library visual system | Vendored `@seihouse/library-ui` plus unexported compatibility wrapper `src/components/library/ParticleEffect.tsx`; UI repository is effective owner; public root/styles | Presentation | Depends on UI; consumed by Library and Workshop. | `@seihouse/library-ui`; keep presentation-only. Move only stateless Celestial skin/icons/particles here, never account/economy behavior. Remove the local compatibility wrapper after consumers use the artifact directly. | Cross-repository release and synchronized vendor update. |
| Narrative presentation contracts/defaults | `src/presentation/`, `src/package/sen/presentation.ts`, and `src/components/library-presentation/LibraryPresentationProvider.tsx`; SEN contracts and Library provider are public | Presentation contract | SEN surfaces use `Narrative*` slots; Library supplies `LibraryPresentationProvider`. Direction is correct. | `@seihouse/sen` owns neutral slots/defaults; `@seihouse/library`/Library UI owns first-party provider/skin. Keep split. | Provider compatibility across all SEN surfaces. |
| Language registry | `src/lib/language.ts`; SEN root public | Headless narrative/accessibility | Used by Reader, Story Seed, Library shell, and Profile. Profile imports source directly rather than a public SEN contract. | `@seihouse/sen` for portable language codes/normalization; consumers import public entry. | Type migration and declaration compatibility. |
| Color Codes and narrative cards/System Panels | Reader/Codex shared/development plus SEN cards/color-codes entries; SEN public | Headless narrative semantics + presentation | Shared across Reader, Codex, generation, and Workshop. Some compatibility duplicate export paths remain. | `@seihouse/sen`; keep semantic registry and card behavior together, with product-neutral presentation slots. Retire aliases only after consumers migrate. | High visual/serialization compatibility risk. |
| Arc goals | `src/components/arc-goals/`; SEN `./arc-goals` public | Headless narrative behavior + small inspector | Used by Story Seed, Chapter Generation, HARNESS, Reader/Codex. | `@seihouse/sen`; keep contract/calculator together. Decide whether the editor is neutral enough for SEN or is host presentation. | Schema and 100-chapter planning compatibility. |
| Reader Chamber | `src/components/reader-chamber/`; SEN public | Narrative behavior + presentation + local integration | Imports Chapter Generation types/adapters, Codex internals, HARNESS skill types, Library-shell icons, mock state, DEV playback, and first-party tracks. Consumers include generation and HARNESS sessions. | Split: SEN owns reader state, navigation, translation/accessibility behavior, media ports, and neutral UI. Host/Library owns branded icons, catalogs, app store, haptics, playback wiring. Move generation-specific adapter out of the base Reader entry. | Very high; Reader types are central to generated and imported stories. |
| Reader Codex | `src/components/reader-codex/`; SEN public | Narrative domain + presentation + local integration | Bidirectional internal dependency with Reader; imports Reader list/types/colors and mock store/vibration. Voice/image/glossary production services are omitted. | `@seihouse/sen` owns characters, locations, factions, narrative artifacts, relationships, lore, Codex state and ports. Host supplies services and media. Break cycles through neutral contracts. | Very high; broad state shape and UI consumers. |
| Story foundation / Story Seed contracts | `src/components/story-seed/shared/`; SEN public through `./story-seed` | Headless narrative identity, import/export, validation, portability | Correctly feeds Chapter Generation/HARNESS, but full entry also reaches Library shell and mock/default persistence. | `@seihouse/sen`; keep canonical Creator/Story/World schema, serialization, validation, inference, repository interface, and one-way foundation handoff. | High; saved artifact/schema compatibility. |
| Library-branded Story Seed creation flow | `src/components/story-seed/development/`; currently SEN public | Presentation + Library product orchestration | Exports `CreationModal`, `LibraryHelpMenu`, `StoryAuthGate`, Story Bank, same-origin Blueprint client, and Library workspace chrome. Directly imports `library-shell`. | Split. Library owns auth gate, Story Bank account orchestration, Library Help and branded creation shell. SEN owns neutral editors/contracts and optional generation port. Remove Workshop storage as default published behavior. | Very high; existing package consumers may import the full flow. |
| Legacy Chapter Generation | `src/components/chapter-generation/` and `src/server/chapter-generation/`; client flow SEN public, server excluded | Narrative generation contracts + DEV test UI + host provider | SEN exports packet/pipeline contracts **and** `ChapterGenerationTestFlow`, Diagnostics, same-origin endpoint client, and Reader handoffs. Reader imports its types back, creating a cycle. Concrete Gemini/API is server-owned. | Split. SEN keeps provider-neutral chapter contracts, normalization, validation and handoff. Workshop owns the DEV test flow/Diagnostics unless approved as a reusable host tool. Host backend owns provider/API/secrets. Decide coexistence or retirement relative to HARNESS. | Very high; public API, generation behavior, and Reader adapters. |
| HARNESS/CAPA | `src/components/harness-generation/` and `src/server/harness-generation/`; client/core SEN public, server excluded | Headless narrative engine + persistence adapter + full workspace + host provider | Correct narrative owner, but reuses Chapter Generation source contracts, composes Reader/Codex, imports Library-shell icon wrapper, and exposes IndexedDB/same-origin defaults. | `@seihouse/sen` for canonical state, continuity, memory, CAPA/generation contracts, response acceptance, recovery/export/versioning. Split browser adapter/full workspace from minimal core if needed; host owns provider/API/secrets. Rebase shared contracts to neutral SEN modules instead of legacy feature sources. | Highest; canonical story state and committed chapter invariants. |
| Reader translation/accessibility | Reader translation modules plus `src/server/reader-translation/`; indirectly SEN public | Headless narrative behavior + host provider | Reader translation depends on HARNESS `HarnessSkillManifest` and translation helpers; server provides concrete HTTP/model prompt. | SEN owns language/translation/glossary/accessibility contracts and repository port independent of full HARNESS. Host backend owns provider endpoint. | High; cache identity and canonical-content preservation. |
| Audio intent, story-media relationship, and playback ports | `src/audio/`, Reader components, `@seihouse/sen/audio`; SEN public | Headless narrative media + presentation/integration | Portable intent/validation is mixed with `celestialaudio.seihouse.org` catalogs, built-in `TRACK_LIBRARY`, DEV playback context, premium flags, and Library entitlement/equipment rules. | Split. SEN owns intent, annotations, validation, deterministic host-supplied resolution, and playback interfaces. Library/host owns first-party catalogs, Media Pack entitlements/equipment, CDN records, and account truth. | High; persisted media provenance and Reader playback. |
| General manifestation contracts | `src/components/chapter-manifestation/shared/`; SEN manifestations public | Headless capability | Operation/mode/reveal state can be source-agnostic. Used by generation surfaces. | `@seihouse/sen`; keep general contracts and neutral capability hooks. | Medium; operation taxonomy compatibility. |
| Celestial manifestation presentation | `src/components/chapter-manifestation/development/`; currently SEN public | Celestial presentation | Public entry exports `CelestialChannel`, `SwordCultivatorClash`, `CelestialScrollVessel`, `LibraryScrubber`, and Celestial/SEIHouse wording. | `@seihouse/library-ui` for purely visual pieces, with `@seihouse/library` orchestration if Library rules are involved. SEN should expose neutral slots/defaults only. | High visual breakage and external UI-repository coordination. |
| Library shell, header, navigation, footer, Help/Search | `src/components/library-shell/`; unexported directly but 11 files indirectly SEN-reachable | Library presentation + host navigation/orchestration | Consumed by Story Seed, Reader, HARNESS, Profile, Light Novels Home, Workshop. It imports Story Seed Help back, creating a Story Seed ↔ shell cycle. | Split stateless chrome to `@seihouse/library-ui`; route models, destinations, Help/Search orchestration and account navigation to `@seihouse/library` or host. Remove every SEN source dependency on this tree. | Highest immediate boundary violation; widespread UI consumers. |
| Library Home, discovery, collection/detail screens | `src/components/light-novels-home/`; unexported | Library product + presentation | Consumes Library shell and preview data; represents first-party catalog/discovery behavior. | `@seihouse/library` for product behavior/contracts; `@seihouse/library-ui` for stateless visuals; host/backend for catalog APIs and permissions. | Medium-high; production source synchronization is old. |
| Profile/account/public profile/settings/admin | `src/components/user-profile/`; unexported | Library domain + presentation + host integration | Direct source imports from Energy, DAO Pillar, Library shell; imports `StoryAuthGate` from SEN. Service port includes account/profile/admin actions; Workshop provides mocks. | Split: `@seihouse/library/profile` for client-safe domain, routes, controllers, visibility, ranks and host ports; `@seihouse/library-ui` for pure Cave/tier/portrait visuals; host/backend for auth, persistence, R2, permissions and admin enforcement. Replace SEN auth import with host/Library auth boundary. | Highest; privacy, roles, economy display, many host callbacks. |
| Cultivation, rank and Qi presentation | `closed-door-cultivation` is Library public; Profile contains rank/Qi helpers; new server Qi ledger is unexported | Library behavior + presentation + backend ledger | Current Library cultivation export is props-driven presentation only. Rank thresholds live in Profile. DAO Pillar deposits server Qi, then Profile mirrors it locally. | `@seihouse/library` owns one client-safe cultivation/rank/Qi contract. Backend owns authoritative Qi transactions. Presentation can use Library UI. Eliminate parallel balance truth by adapting the host profile store to the ledger contract. | Highest economic consistency risk. |
| Energy | `src/components/energy/`, `src/server/energy/`, migration; unexported | Library domain + UI + backend infrastructure | Profile is a consumer, not owner. Server imports contracts from a component folder. No generation path imports Energy. In-memory DEV and Postgres reference adapters exist. | `@seihouse/library/energy` for client-safe action IDs, catalog contract, snapshots, ports/hooks and behavior; Library UI for pure visuals as appropriate; host/backend for auth, transactions and concrete storage. SEN generation gets only generic authorization/usage-accounting ports. Add an explicit post-settlement refund policy/operation if required. | Highest financial/economy risk; idempotency and durable settlement. |
| Daily DAO Pillar rewards | `src/components/dao-pillar/`, `src/server/dao-pillar/`; unexported | Library rewards behavior + presentation + backend | Profile consumes it directly. Server owns calendar/theme/claims and uses the **Energy** principal resolver. Reward union names future Relics, Titles, Energy and Media Packs, but only Qi is deliverable. | `@seihouse/library/dao-pillar` for client contracts/calendar behavior; Library UI for skin; backend for clock, claims, delivery and storage. Replace Energy-named authentication with a shared host identity boundary before adding reward types. | High; one-claim guarantee, clock/time zone, future cross-economy delivery. |
| Qi ledger | `src/server/qi/` and migration; unexported | Backend infrastructure/domain | DAO Pillar repository deposits Qi. Production Profile still has `daoXp`/`heavenlyQi`; client applies a mirror callback. | Library host/backend owns authoritative Qi ledger through a Library-defined port. Select one durable source of truth before production transfer. | Highest; duplicate/partial balances and rank divergence. |
| Library Relics economy | `src/components/relics/` is Library public; `src/server/relics/` unexported/disconnected | Library economy + presentation + backend foundation | Package exports cards/modal/reveal/types. Server has templates, assignments, earned records and evaluators, but is not connected to package/client surfaces. | `@seihouse/library/relics` owns client-safe economy contracts and behavior; Library UI owns reveal/card skin; backend owns awards, inventory and persistence. Connect, do not create a second economy. | High; reward identity and inventory compatibility. |
| Narrative artifacts | Reader/Codex artifact records; SEN public | Narrative domain | Shares the English word “artifact” with Library Relics but is story canon, not account inventory. | `@seihouse/sen`; keep separate types and naming from Library Relics. Any adaptation must be explicit, not a shared store. | High conceptual collision if merged. |
| Provenance | `src/components/provenance/`; Workshop-local barrel only | Cross-product domain + presentation prototype | Provider-neutral record is intended for SEN, SEA and other generators. No persistence/verification. No current package cleanly owns cross-product non-narrative provenance. | **Decision required.** UI can own only badge/details presentation; SEN or Library would be too narrow for the record. Keep unexported until an approved cross-product owner exists; do not invent a fifth package in Part Two without approval. | Medium now, high once records become durable/legal evidence. |
| SEN/Library icon set | `src/components/sen-icons/`; no public subpath, indirectly SEN-reachable | Mixed presentation assets | Contains narrative icons and Library navigation/account icons such as Energy, Store, Profile, Home, Discovery and Qi. Imported through `library-shell` and directly by SEN surfaces. | Split by meaning: product-neutral narrative marks to SEN/UI as appropriate; Celestial Library/navigation/economy marks to Library UI. | Medium visual and asset-path breakage. |

### Host, Workshop, and tooling capabilities

| Capability | Current location; effective owner; public reachability | Layer | Dependencies, consumers, and violations | Intended owner; correction | Risk / downstream effects |
| --- | --- | --- | --- | --- | --- |
| Generation/provider HTTP boundaries | `src/server/chapter-generation`, `harness-generation`, `story-seed-blueprint`, `reader-translation`; excluded from packages | Host/backend integration | Import client contracts directly from component source; use Gemini/provider secrets and same-origin APIs. | Concrete providers, secrets, rate guards and HTTP stay host/backend. Provider-neutral request/response/validation contracts should be imported through SEN public headless entries. | High API and billing behavior. |
| Voice catalog/provider | `src/server/audio`; excluded | Host/backend integration | ElevenLabs/provider IDs and voice catalog; Codex calls same-origin endpoint. | Host/backend. SEN owns only voice identity/artifact/playback ports and story relationship. | High privacy/cost; medium package risk. |
| Energy/DAO/Qi/Relics storage and transactions | `src/server/*`, `database/migrations`; excluded | Backend infrastructure | Correctly outside NPM bundles, but contracts are located under components and durable adapters are not production-wired. | Library host/backend; packages publish client-safe ports/types only. | Highest transaction and migration risk. |
| Workshop previews, fixtures and mocks | `src/workshop/`; excluded from entries, plus some “Workshop” adapters under `src/components` | Workshop simulation | Preview-local clients correctly stay in Workshop. However, SEN public graph reaches six registered mock modules through 11 waivers and reaches `workshopStorySeedStorage.ts`, which is not in the mock ledger. | Workshop-only. Replace package-reachable state/playback/haptics/storage with injected ports; move or rename defaults so validators can classify them. | High embeddability risk. |
| Card Workshop | `src/components/card-workshop/` and `src/workshop/previews/card-workshop/`; explicitly forbidden from packages | Workshop inspection/tooling | Exercises the real packaged card/Reader presentation using fixtures; no product persistence or provider calls. | Workshop-only. Keep its controls/fixtures out of packages; changes to the actual cards continue through their SEN owners. | Low product risk; useful regression coverage. |
| Locked reference replicas | `reference/` directories; excluded | Workshop comparison | Boundary validator forbids them from package graph. | Workshop-only; keep locked. | Low if validator remains enforced. |
| Repository scripts/build/API bundlers | `scripts/`, `vite*.ts`, `api/`; not package product surfaces | Tooling/host deployment | Build/finalize/smoke derive entries from manifests. API shims bundle server graphs. | Repository tooling and host deployment. Add audit/coverage checks here, not product packages. | Medium CI risk. |
| Empty legacy directories | `AILoadingVeil`, `IdleCultivationModal`, `IdleCultivationModalV2`, `LoadingSystem`, `relic-reveal`, `story-settings`; zero files | No capability | No runtime imports or exports found. | Remove only in a separately approved cleanup or document as inert; no package owner needed. | Low; avoid mistaking directory names for implemented features. |

## 4. Unpackaged or unowned production capabilities

**Verified findings:**

| Finding | Capability | Current state | Recommended target |
| --- | --- | --- | --- |
| U1 | Profile/account/public profile/settings/admin | Real 43-file Library surface; no package entry | Split Library behavior, Library UI presentation, host services/backend. |
| U2 | Energy | Real client and server domain; no package entry; no generation consumer | `@seihouse/library/energy` plus host/backend; generic SEN usage port only. |
| U3 | Daily DAO Pillar | Real client/server calendar and claim behavior; no package entry | `@seihouse/library/dao-pillar` plus host/backend and Library UI skin. |
| U4 | Qi ledger/rank contract | Server ledger and Profile rank/balance code have no unified public owner | Library behavior plus authoritative host/backend ledger. |
| U5 | Library shell/navigation/footer/Help/Search | Production-relevant and widely consumed; no Library entry; indirectly shipped by SEN | Split `@seihouse/library` orchestration and `@seihouse/library-ui` presentation. |
| U6 | Light Novels Home/discovery | First-party product surface only in Development/Workshop | Library behavior/presentation split; host catalog services. |
| U7 | Server relic economy foundation | Templates/assignments/earned/evaluation exist but are disconnected from Library package relic surfaces | Library client contract plus host/backend implementation. |
| U8 | Provenance | Cross-product record and UI prototype intentionally has no owner | SENSEI decision; do not force it into the four packages. |
| U9 | SEN/Library icons | Mixed asset set has no public entry and is indirectly bundled | Split narrative and Library presentation assets. |
| U10 | Authentication/account gate | Reusable-looking `StoryAuthGate` is public from SEN and reused by Profile, but auth is host/Library responsibility | Host authentication contract + Library-branded gate; not SEN. |

## 5. Incorrectly packaged or mixed-responsibility systems

### SEN exports responsibilities it should not own

1. **Library shell in SEN.** Story Seed, Reader, Chapter Generation and HARNESS reach Library shell icon/chrome files through relative source imports. Eleven Library-shell files are in the SEN entry closure.
2. **Account authentication in SEN.** `@seihouse/sen/story-seed` exports `StoryAuthGate`; Profile imports it from SEN.
3. **Library-branded creation in SEN.** The Story Seed subpath combines portable schemas with Story Bank, Library Help, branded workspace chrome, local default storage, and a same-origin Blueprint client.
4. **DEV test application in SEN.** `@seihouse/sen/chapter-generation` exports the Development test flow and endpoint-dependent full workspace, not only portable generation contracts.
5. **First-party audio and entitlement policy in SEN.** The audio subpath exports SEIHouse CDN cue data, a built-in track catalog, premium flags, pack entitlements and equipment/freezing helpers alongside neutral intent/resolution contracts.
6. **Celestial skin in SEN manifestations.** The public manifestations entry exports Celestial scenes/vessels and the Library scrubber together with general manifestation contracts.
7. **DEV mock and storage defaults in SEN.** Eleven importers are deliberately waived; Story Seed also defaults its repository to `workshopStorySeedStorage`, which is package-reachable but absent from the waiver ledger.

### Library behavior is present but not packaged

`@seihouse/library` currently represents a narrow visual slice of Library rather than the first-party product capability boundary described by the governing architecture. It omits Profile, accounts, Energy, Qi, DAO Pillar, Library navigation/Home/discovery, access/admin behavior, and the connected relic economy. Importing a packaged relic card or cultivation modal does not make the underlying product behavior packaged.

### Systems that require deliberate splits

- **Profile:** Library domain/controller and host-service ports; Library UI skin; backend auth/persistence/admin.
- **Story Seed:** portable foundation/schema/import/export in SEN; Library-branded creation, account Story Bank and auth in Library/host; provider in backend.
- **Manifestation:** portable operation/reveal contracts in SEN; Celestial vessel/scenes/scrubber in Library UI.
- **Generation:** portable HARNESS/contracts in SEN; provider/API/secrets in host; Energy adapter and first-party policy in Library.
- **Persistence:** portable repository/version/recovery contracts in SEN; explicit optional product-neutral browser adapters if approved; concrete production storage in host/backend. A Workshop-named localStorage adapter must not be the silent published default.
- **Audio/media:** portable story-media intent/provenance/resolution interfaces in SEN; Library catalogs, entitlements, rewards and CDN records in Library/host.
- **Relics/artifacts:** narrative artifacts remain SEN story canon; Library Relics remain account economy. They should not share an authoritative store merely because labels overlap.

### Duplicate and parallel authority findings

- **Two generation systems:** Chapter Generation and HARNESS are both public from SEN and both contain packet/normalization/Reader handoff concerns. They are not byte-for-byte duplicates, but their overlapping ownership will keep creating adapter and state dependencies until SENSEI names the supported long-term roles.
- **Qi representations:** the new server Qi ledger delivers DAO rewards while Profile still carries cultivation/Qi fields and applies a client-side mirror callback. That is an integration bridge, not yet one authoritative production balance.
- **Relics:** the Library package owns presentation/model types while `src/server/relics` owns a disconnected templates/assignments/earned-record foundation. They are parallel incomplete halves, not two proven implementations; Part Two should connect them around one contract.
- **Story persistence:** Story Seed localStorage and HARNESS IndexedDB are intentionally separate at the one-way handoff today, but both are published defaults tied to DEV browser state. They must become explicit adapters, not competing account/cloud stores.
- **No duplicate Energy ledger found:** service behavior is defined once through `EnergyRepository` and exercised against in-memory and Postgres adapters. Those are two implementations of one port, which is correct. No generation flow has copied Energy state.
- **No duplicate Color Code/card authority found:** the current code centralizes these semantics despite compatibility export aliases. Preserve that authority while changing package boundaries.

**Verified fact:** The packed-consumer smoke found no unresolved external dependency in the existing public manifests. The dependency problem is semantic and source-level bypass, not a currently missing install-time module.

## 6. Boundary violations and hidden coupling

### Verified import-direction and cycle findings

| Coupling | Evidence | Consequence |
| --- | --- | --- |
| SEN → Library shell | SEN graph reaches 11 `library-shell` files; Story Seed imports workspace chrome; Reader/HARNESS/Chapter Generation import shell icons | Portable SEN carries first-party brand/navigation implementation without a declared Library dependency. |
| Story Seed ↔ Library shell | Story Seed imports shell; `WorkspaceHeaderUtilities` lazy-imports `StorySeedHelpMenu` | Circular feature ownership; Help cannot move independently. |
| Reader ↔ Chapter Generation | Reader types/adapter import generation contracts; generation full surfaces import packaged Reader/Codex | Optional generation implementation becomes part of base Reader graph. |
| Reader ↔ Codex | Reader imports Codex highlighting/hovercard; Codex imports Reader types/list/colors/stubs | Parallel feature barrels do not represent independent layers. |
| Reader ↔ HARNESS | Reader translation imports HARNESS skill types/helpers; HARNESS adapter/session imports Reader/Codex | Translation and reading depend on the full generation feature's types. |
| HARNESS → legacy generation source | HARNESS types/signals/response acceptance import Chapter Generation types, media acceptance and normalizer directly | “Independent core” still relies on legacy feature source contracts, even if it does not run the legacy pipeline. |
| Profile → unexported source | Direct imports from Energy, DAO Pillar and Library shell | No package contract protects Profile integration. |
| Server → component source | Energy, DAO Pillar and generation servers import contracts from component folders | Headless business contracts are trapped in presentation-oriented source locations. |
| DAO Pillar → Energy auth | DAO server uses `createEnergyPrincipalResolver` and `ENERGY_IDENTITY_MODE` | Account identity is incorrectly named/owned by the Energy subsystem. |
| Qi ledger ↔ Profile mirror | DAO server deposits Qi; client invokes optional `applyQiDeposit` to mutate Profile state | Two representations can diverge until a production adapter defines one authority. |

### Validator limitations

**Verified fact:** `scripts/checkPackageBoundaries.mjs` is useful but insufficient for ownership assurance.

- It walks only from manifest exports. Unexported production capabilities are invisible.
- It proves forbidden reachability, not feature coverage or intended ownership.
- Its SEN Library-owned patterns recognize only `components/library`, `library-presentation`, `closed-door-cultivation`, `relics`, and `package/library`.
- It does not classify `library-shell`, `user-profile`, `energy`, `dao-pillar`, `light-novels-home`, or mixed `sen-icons` as Library-owned.
- It intentionally permits 11 published modules to import six DEV mock modules.
- The success line says no mock module is reachable and then reports 11 remaining mock dependencies; the latter is the accurate qualification.
- `workshopStorySeedStorage.ts` is reachable but escapes both the `src/workshop/` forbidden pattern and the registered mock-module set.
- It does not detect cross-feature cycles, relative source bypasses, default host integrations, semantic branding, or undeclared ownership.

**Recommendation:** Add a maintained production-capability inventory and semantic lane map before enforcing moves. Then make the validator check both (a) every production capability has an explicit owner/class and (b) every public entry obeys dependency direction. Do not infer ownership solely from folder names.

## 7. Profile and Energy findings

### Profile

**Verified fact:** Profile is a Library product surface and currently has no public owner. `src/components/user-profile/` contains 43 files and is reachable only through the Development/Workshop application.

It contains at least four layers:

1. **Library domain behavior:** public-profile visibility and projection, routes/destinations, creator-world filtering, rank/Qi visualization rules, timed status effects, Settings behavior, roles/admin controls, account entry behavior, and relic/story panels.
2. **Celestial presentation:** Cave layout, tier badge, portrait builder, environment and styling. `LibraryTierBadge` explicitly says it can move to `@seihouse/library-ui`.
3. **Host integration ports:** `UserProfileServicesProvider` and controller callbacks for authentication, profile persistence, sync, media, roles, stories, claims and deposits.
4. **Workshop simulation:** mock service implementation, sample accounts/stories and local public records under `src/workshop/previews/user-profile/`.

**Verified fact:** Profile still imports `StoryAuthGate` from `@seihouse/sen/story-seed`, even though authentication is explicitly a Library host/backend concern. It also imports Energy and DAO Pillar source directly because neither capability has a Library subpath.

**Recommendation:** Publish a client-safe `@seihouse/library/profile` domain/host-port contract, keep concrete authentication/persistence/admin enforcement in the host/backend, and move only stateless Cave/tier/portrait visuals to Library UI. Profile should consume Energy, DAO Pillar and Qi through Library public contracts rather than own or source-import them.

### Energy

**Verified fact:** Energy is now a standalone capability; Profile is only one consumer.

| Required responsibility | Current verified status |
| --- | --- |
| Balances | Implemented as settled `balance`, `held`, and derived `available`; server-owned. |
| Grants | Implemented with development authorization and idempotency. No production purchase/reward grant policy yet. |
| Spending | Implemented through settlement to a `charge` transaction. No generation flow invokes it yet. |
| Reservation | Implemented atomically with stored authoritative amount and idempotency. |
| Settlement | Implemented; replays safely; provider cost may be internal metadata. |
| Release before settlement | Implemented; returns held Energy and records `release`. |
| Refund after settlement | **Not implemented.** A charged reservation cannot be released; transaction kinds contain no refund. |
| Transaction history | Implemented for grant/reserve/charge/release. |
| Authorization | Implemented identity resolution and development-operation authorization; production requires an injected verified-token resolver. |
| Recovery | `findReservation` supports idempotent retry recovery. |
| Durable storage | Postgres migration/adapter is a tested reference; DEV actually uses in-memory storage and resets per process/instance. |
| Public package ownership | None. Client contracts live under `components`; server owns execution. |
| SEN integration | Intentionally absent; boundary test rejects generation imports. No generic SEN authorization/usage port exists yet. |

**Conclusion:** Energy is not trapped in Profile anymore, and most of the requested headless ledger exists. It is still incomplete as a product capability because it lacks a package contract, production host wiring, generation integration, and a settled-charge refund decision/operation.

**Recommendation:** Library Energy should implement a host adapter for a generic SEN authorization/usage-accounting interface. SEN must never import Energy, prices, balances, or Library account types directly. The server flow should reserve before a potentially billable call, checkpoint the reservation/operation, settle only after accepted durable success, and release on failure. Refund after settlement must be explicitly designed rather than treating `release` as a refund.

### Related mixed concepts

- **Narrative artifacts vs Library Relics:** verified as separate current models. Preserve the separation and add explicit adapters only where a story event grants an account reward.
- **Manifestations vs Celestial presentation:** split neutral manifestation contracts from Library scenes/vessels/scrubber.
- **Generation vs provider access/Energy:** SEN owns optional generation contracts and narrative acceptance; host owns provider access; Library Energy authorizes/charges through an adapter.
- **Portable persistence vs production storage:** SEN owns repository/version/export/recovery contracts; host supplies account/cloud storage. Workshop storage remains Workshop-only.
- **Story foundation vs branded creation:** SEN owns portable foundation/validation/import/export; Library owns its branded/account creation journey.

## 8. Stale or contradictory documentation

| Document | Verified inconsistency | Required documentation correction in Part Two |
| --- | --- | --- |
| `src/package/sen/README.md` | Entry table omits the real `@seihouse/sen/arc-goals` export. | List every manifest export from one source of truth. |
| `src/package/sen/README.md` | Says HARNESS “does not import legacy generation or Reader systems.” Actual source imports Chapter Generation contracts, and the published full workspace composes Reader/Codex. | Distinguish the HARNESS controller/runtime from the full workspace and state exact contract dependencies. |
| `src/package/sen/README.md` / validator output | “No mock” language conflicts with the documented 11-waiver ledger. | Say exactly which mock/default modules remain reachable and fail on new ones. |
| Story Seed README | Says shared Library primitives live in `src/components/library/`, while current code primarily resolves narrative presentation and Library shell sources; it also calls Workshop storage part of shared current ownership while the package publishes it as default. | Describe the actual package boundary and separate Workshop default adapters from portable contracts. |
| Library README | Describes the package as first-party Library product but its entries cover only cultivation presentation, relic presentation/model and provider. | List missing product capabilities until they are added; do not imply full coverage. |
| Profile README | The current top history correctly says `accountControls.energyBalance` was removed, but a later historical/integration section still says the Development wrapper supplies sample 120 Energy. | Mark historical behavior as superseded or remove the stale active-sounding statement. |
| Manifestation/Library scrubber docs | State UI owns transferred `LibraryScrubber`, while the SEN package still exports the local copy through manifestations. | Document which repository/artifact is authoritative and remove the SEN ownership contradiction after migration. |
| Audio docs | Call first-party Library cue catalogs canonical SEN audio while governing architecture requires outside publishers to supply their own media. | Separate portable media contract docs from SEIHouse catalog docs. |
| Workshop manifest | Lists Story Seed under the Library section while the package declares its full flow SEN, illustrating unresolved mixed ownership. | After splitting, describe foundation (SEN) and Library creation shell separately without duplicate feature cards. |

**Verified fact:** A repository-wide Markdown search found no current governing document that describes SEN as merely a Library reading mode or Library feature. `AGENTS.md`, the root README, and the SEN package README explicitly reject that stale model. The remaining documentation problem is implementation/entry descriptions that still assign Library-branded behavior and catalogs to SEN despite that correct top-level definition.

## 9. Recommended target ownership for every finding

**Recommendation summary:**

| Finding group | Target owner |
| --- | --- |
| Universal reusable visual primitives/tokens | `@seihouse/ui` |
| Celestial Library-only visuals, icons, particles, Cave/manifestation skin | `@seihouse/library-ui` |
| Narrative identity, story/chapter contracts, Reader/Codex, continuity/memory, Color Codes/cards, translation/accessibility, media intent, manifestation contracts, provenance/adaptation hooks specific to narrative, portability/version/recovery, optional generation/HARNESS contracts | `@seihouse/sen` |
| Profile, cultivation/ranks/Qi client behavior, Energy, DAO Pillar, Relics economy, Library shell/navigation/Home/discovery/community/business orchestration | `@seihouse/library` |
| Authentication, permissions enforcement, admin/moderation enforcement, secrets, provider clients, HTTP APIs, server-authoritative economy transactions, concrete databases/object storage | Library host/backend, not an NPM package |
| Preview fixtures, deterministic mocks, local preview clients and controls | Workshop only |
| Builds, validators, API bundlers, migration tooling | Repository tooling/host deployment |
| Cross-product provenance record | Unresolved decision; do not force into current four-package model |

Package subpaths proposed for approval, not yet authorized, are:

- SEN: smaller headless/runtime entries around story foundation, reader contracts, translation, media intent, manifestation contracts and generation authorization/usage ports. Exact names should follow existing vocabulary and avoid compatibility aliases unless SENSEI approves a migration window.
- Library: `profile`, `energy`, `cultivation`/`qi`, `dao-pillar`, `relics`, and `shell`/`navigation` (or a smaller approved grouping). Presentation-only exports should come from Library UI, not be duplicated.

## 10. Staged Part Two implementation plan

No stage below is authorized by this report.

### Stage 0 — Approve ownership map and add coverage guardrails

1. Resolve the decisions in section 11.
2. Add a maintained inventory that classifies each production capability as SEN, Library, UI, Library UI, host/backend, Workshop, tooling, or explicitly unresolved.
3. Extend validators to check coverage, semantic Library paths, direct cross-owner source imports, mock/default adapters, and dependency cycles.
4. Add characterization tests for current public exports and persisted contracts before moving code.

**Expected breakage:** CI may fail immediately on known violations; initially land rules in report-only/audit mode or with an explicit, shrinking debt ledger.

**Verification:** inventory completeness, graph snapshot, current package smoke, no product behavior changes.

### Stage 1 — Establish neutral SEN contracts and break feature cycles

1. Move shared story/chapter/block/media/translation types out of legacy feature-owned paths into approved SEN headless owners.
2. Make Reader independent of Chapter Generation and full HARNESS types.
3. Make HARNESS reuse neutral SEN contracts instead of legacy Chapter Generation source.
4. Define generic provider authorization/usage-accounting ports with no Library or Energy types.
5. Preserve canonical chapter/state schemas deliberately; bump Development schema versions where backward compatibility is not allowed.

**Expected breakage:** type import churn across Reader, Codex, HARNESS, Chapter Generation and servers; declaration paths change.

**Verification:** focused narrative tests, schema/reset tests, import-cycle check, SEN pack/type smoke, hand-written/imported story flow without any generator.

### Stage 2 — Remove Library, mocks and first-party defaults from SEN

1. Split Story Seed foundation/editor behavior from Library auth, Story Bank orchestration, Help and workspace chrome.
2. Replace Reader/Codex mock store, haptics, playback and catalog imports with injected runtime ports.
3. Remove Library shell/icon imports from SEN surfaces.
4. Split neutral manifestation and media contracts from Celestial presentation and first-party catalogs/entitlements.
5. Make browser persistence adapters explicit rather than silently defaulting to Workshop storage.
6. Decide whether the legacy Chapter Generation test flow is Workshop-only or an approved reusable host tool.

**Expected breakage:** hosts must provide runtime providers; visual defaults and asset paths change; current all-in-one Story Seed imports may stop compiling.

**Verification:** an external-brand fixture installs SEN with custom books, brand, accounts, storage and generation; AI omitted; no Library/UI-Library/mock/Workshop path in SEN graph; package smoke and accessibility tests.

### Stage 3 — Publish missing Library client capabilities

1. Add approved Library subpaths for Profile, Energy, cultivation/Qi, DAO Pillar, Relics behavior, and shell/navigation.
2. Separate pure presentation into Library UI through a coordinated UI repository release.
3. Connect relic client contracts to the existing server foundation instead of creating another model.
4. Make Profile consume Energy/DAO/Qi through public Library contracts.
5. Replace Energy-owned authentication reuse with a host identity contract.

**Expected breakage:** Library package version/peer changes, UI tarball update, app import migration, possible CSS/asset moves.

**Verification:** Library pack/type smoke against published SEN and Library UI; Profile privacy/role tests; Energy/DAO/Qi/Relics contract tests; no direct cross-owner source imports.

### Stage 4 — Wire authoritative host/backend adapters

1. Choose and implement production identity verification and durable storage adapters.
2. Select one authoritative Qi/profile balance path.
3. Wire Energy reservation/checkpoint/settlement/release to generation providers through the generic SEN port.
4. Design and test post-settlement refund policy if required.
5. Wire DAO rewards and Relic/Title/Media/Energy delivery only after each target economy has an idempotent transaction boundary.
6. Keep provider secrets, APIs and concrete infrastructure outside NPM packages.

**Expected breakage:** migrations, deployment configuration, auth/permission errors, billing-state recovery, live data compatibility.

**Verification:** migration tests on selected store, idempotency/concurrency/failure injection, unknown-provider-outcome recovery, authorization matrix, production-like integration tests, no client authority over balances/rewards.

### Stage 5 — Migrate consumers, remove compatibility debt, and reconcile docs

1. Migrate Development, Workshop and production consumers to public entries.
2. Remove deprecated aliases, mock waivers and source bypasses only after all consumers move.
3. Generate entry documentation from manifests or validate them against each other.
4. Re-run full builds/tests/package packs and external-brand acceptance.
5. Update transfer instructions and source-authority dates after actual source inspection.

**Expected breakage:** downstream imports and snapshots; removal of aliases can be a deliberate major-version boundary.

**Verification:** zero waiver debt unless SENSEI explicitly retains a time-boxed item; complete graph coverage; consumer builds; package install tests; hosted smoke.

## 11. Decisions requiring SENSEI approval

1. **Story Seed split:** Approve SEN ownership of the portable foundation/contracts and Library ownership of the current branded/authenticated Story Bank creation journey.
2. **SEN surface policy:** Decide whether SEN packages neutral complete UI surfaces, headless contracts plus optional UI, or both through separate subpaths. This controls Reader, HARNESS workspace and manifestation packaging.
3. **Legacy generation:** Decide whether Chapter Generation remains a supported SEN alternative, becomes Workshop diagnostics only, or is retired after HARNESS parity. Do not maintain two canonical story-state owners.
4. **Library public API:** Approve the Library subpath grouping for Profile, Energy, Qi/cultivation, DAO Pillar, Relics and shell/navigation.
5. **Library UI transfer:** Approve which Cave, shell, icon and manifestation visuals move to the external UI repository and the release/version sequence.
6. **Energy refunds:** Decide whether settled charges can be refunded, by whom, for which reasons, and whether refunds restore spendable Energy or create a separate adjustment record.
7. **Qi authority:** Choose whether the new Qi ledger replaces/profile-adapts `daoXp`/`heavenlyQi` or whether the existing production profile store implements the `QiLedger` port.
8. **Durable adapters:** Choose Data Connect, direct Postgres, or another host adapter for Energy, DAO Pillar, Qi and Relics. DEV's PGlite-tested Postgres adapters are reference implementations, not production selection.
9. **First-party media:** Decide whether Library package, host backend/static catalog, or Library UI artifact owns first-party cues, soundscapes and Media Pack metadata. Entitlement truth must remain server-authoritative.
10. **Provenance:** Choose a cross-product owner or keep the prototype unexported. The four-package model cannot cleanly own a provider-neutral record shared by SEN, SEA and other products without widening one package beyond its charter.
11. **Compatibility policy:** Approve whether Part Two may make a clean major-version break or must provide a time-boxed compatibility release. Do not add permanent dual owners or dual reads.

## 12. Risks, expected breakage, and required verification

| Risk | Severity | Why | Required verification before stage completion |
| --- | --- | --- | --- |
| Canonical story/state corruption | Critical | Reader, Codex, Chapter Generation and HARNESS share types through cycles. | Schema fixtures, export/import round trips, committed-chapter replay, recovery and version-reset tests. |
| Economy double-spend or lost funds | Critical | Energy/Qi/DAO/Relics need atomic, idempotent host transactions. | Concurrent reserve/claim/settle/refund tests, failure injection, durable adapter contract, authorization matrix. |
| SEN ceases to be embeddable | Critical | Current package carries Library chrome/catalogs and DEV defaults. | External publisher fixture with custom branding/storage/accounts/content and no AI provider. |
| Privacy/permission regression | Critical | Profile public/private views and admin controls currently rely on host services and local simulation. | Server-enforced role/visibility tests; prove private controllers are unreachable from public routes. |
| Package consumer breakage | High | Existing consumers may import full Story Seed/generation/manifestation exports. | Packed consumer builds, declaration tests, documented migration map, approved semver strategy. |
| Visual regression | High | Celestial visuals move across repository/package boundaries. | Mobile/desktop screenshots, keyboard/focus/reduced-motion/contrast checks, asset-path tests. |
| Duplicate authority persists | High | Qi/Profile, Relic UI/server and two generation systems overlap. | One-authority architecture tests and removal of parallel stores/calculators after migration. |
| Documentation drifts again | Medium | Hand-maintained tables already omit or contradict exports. | Manifest-to-doc validation and capability inventory in CI. |
| Validator gives false confidence | High | Current check sees only exported graph and narrow patterns. | Negative fixtures for unexported capability, semantic Library path, mock default, cycle and source bypass. |

## Baseline validation results

All validation was run against the audited commit before this document was added.

| Command | Result |
| --- | --- |
| `npm run check:ui-artifacts` | **Pass.** UI and Library UI 0.4.0 tarballs match manifest, lockfile integrity, provenance and installed packages. |
| `npm run check:package-boundaries` | **Pass with declared debt.** Two packages verified; 11 mock-application waivers remain. The limitations above mean this is not a completeness result. |
| `npx tsc -b --pretty false` | Initial run failed because the newly declared PGlite dependency was absent from stale `node_modules`. `npm ci` was blocked by a Windows lock on the Rolldown native binary; the documented Windows fallback `npm install` restored the lockfile-declared dependency set without tracked changes. Rerun: **pass**. |
| `npx vitest run` | **Fail under aggregate load:** 124 files passed, 2 skipped, 3 failed; 1,113 tests passed, 2 skipped, 2 tests and one cleanup hook timed out. Timeouts were Profile badge browser teardown, first Postgres Energy contract test, and first Postgres DAO contract test. No assertion mismatch was reported. |
| `npm run test:user-profile` | **Pass:** 4 files, 177 tests. |
| `npm run test:energy` | **Pass:** 5 files, 58 tests. |
| `npm run test:dao-pillar` | **Pass:** 5 files, 41 tests. |
| `npm run test:package` | **Pass:** both boundary checks, SEN and Library builds, packs, installs, typechecks and consumer bundles. SEN: 14 exports/35 bundles/about 1,588 kB JS. Library: 4 exports/7 bundles/about 77 kB JS. |
| `npm run build` | **Pass:** TypeScript, Workshop/Library-shell Vite build, and all API build scripts including Energy and DAO Pillar. |

The isolated passes indicate the full-suite failures are load-sensitive timeouts, but the authoritative full-suite baseline remains failed and should not be described as green. Part One does not change timeouts or repair tests.

## Part One change attestation

**Verified at delivery:** The audit branch is based on the exact approved `main` commit above. The only intended tracked change is this report. No product code, package manifest, export, schema, API, migration, test, build script, or runtime behavior is changed by Part One.

---

## Part Two implementation status (2026-09-19)

This section is a post-audit implementation record. The facts above remain the
verified Part One baseline at `60934256`; they have not been rewritten as if the
problems never existed.

### Implemented ownership map

| Owner | Implemented responsibility |
| --- | --- |
| `@seihouse/ui@0.4.0` | Universal primitives and tokens; unchanged. |
| `@seihouse/library-ui@0.5.0` | Stateless Celestial icons, Cave backdrop/particles, manifestation chamber/scenes/vessel and journey scrubber. Coordinated UI PR #68, source `04b8949`. |
| `@seihouse/sen@0.5.0` | Neutral story/chapter/block contracts, Reader and Codex, Color Codes/cards, translation/accessibility, story foundation/import/export, portable media intent/provenance/playback, neutral manifestations, HARNESS canonical state/continuity/CAPA/recovery and generic usage authorization. |
| `@seihouse/library@0.3.0` | Profile/Cave, Energy client contracts, QI/cultivation, DAO Pillar, Relics, shell/navigation, Home/discovery, branded Story Seed, first-party HARNESS composition, media entitlement policy and Celestial manifestation orchestration. |
| Library host/backend | Identity verification, APIs, provider access, Energy/QI/DAO/Relics transaction authority, concrete catalogs/assets/storage and DEV reference adapters. |
| Workshop | Legacy Chapter Generation diagnostics, previews, fixtures, mock stores, local persistence and simulation. |
| Tooling | Complete ownership inventory/graph, builds, pack verification and API bundlers. |
| Deferred | Cross-product provenance remains unexported pending an approved cross-product owner. No fifth package was created. |

### Public package changes

SEN now deliberately exports root, `presentation`, `contracts`,
`reader-runtime`, `reader-chamber`, `reader-codex`, `color-codes`, `cards`,
`manifestations`, `audio`, `story-seed`, `generation`, `harness-generation`,
`translation`, `arc-goals`, and `styles.css`. The deprecated `codex-cards` and
legacy `chapter-generation` entries are removed.

Library now deliberately exports root, `presentation`, `profile`, `energy`,
`cultivation`, `dao-pillar`, `relics`, `shell`, `home`, `story-seed`,
`generation`, `media`, `manifestations`, and `styles.css`.

### Implemented corrections

- Every production source under `src`, `api`, `database` and `scripts` is
  classified. New source fails closed. Published closure and complete owner
  reachability are both checked, so an unexported capability cannot be hidden.
- Direct cross-owner source imports, package/source cycles, wrong SEN direction,
  undeclared dependencies, dynamic imports and embedded mock/Workshop/host
  defaults are rejected. The former 11 mock waivers are gone.
- Shared story, chapter, block, translation, voice, generation, media and Reader
  runtime contracts live in neutral SEN modules. Reader/Codex edits append
  identity-addressed deltas to the HARNESS correction journal; committed prose
  and newly generated entities remain canonical.
- Reader/Codex require explicit host state, narration, playback, preferences,
  glossary, voice and image ports. SEN has no first-party catalog, CDN, premium,
  authentication, Energy, QI, Library UI or Workshop dependency.
- Story Seed is split: SEN owns portable foundation/schema/repository/editor;
  Library owns authentication UI, Story Bank, Help and the branded journey.
- Stateless Celestial presentation moved to Library UI. Library retains route,
  account, economy and orchestration decisions. Concrete asset locations moved
  into a host-supplied `LibraryAssets` catalog.
- Profile reads QI from the single ledger projection and Energy from its own
  Library client. DAO claims and cultivation claims never send an amount from
  the browser. Relics use one Library contract projected from the existing v3
  server repository; reveal acknowledgment is not an award operation.
- SEN's generic `NarrativeUsagePort` carries only operation, capability and
  story identity. Library's trusted Energy adapter binds verified principal,
  action policy and story authorization. Provider output is checkpointed before
  settlement; unknown outcomes retain the hold and fail closed on retry.
- Legacy Chapter Generation is unpublished Workshop diagnostics. HARNESS is the
  only canonical generated-story state owner in the package graph.

### Deliberately unresolved outside DEV

No production repository, production data, production service, cloud/database
choice, secret, billing connection or transfer was changed. PGlite/in-memory
stores and concrete Gemini/HTTP implementations are DEV reference adapters,
not a production architecture decision. A settled-refund product policy remains
unselected; no client refund or destructive charge deletion was added.

### Part Two verification record

The maintained commands and final PR/CI result are recorded here before merge:

| Verification | Result |
| --- | --- |
| Ownership graph | **Pass:** 824 classified source files; 169 SEN and 160 Library files reachable; zero violations or waivers. Documentation is checked against real manifest exports. |
| TypeScript project build | **Pass.** |
| Focused ownership/HARNESS/economy/Profile/media tests | **Pass.** Includes journal reload/failure/new-entity retention, Energy reservation/settlement/unknown-outcome recovery, QI/DAO/Relics authority and host-asset injection. |
| Full unit suite, default timeout | **1,141 pass, 2 skip, 1 aggregate failure:** only the known DAO Postgres first-test 5-second cold-start timeout; no assertion mismatch. This is narrower than the Part One baseline. |
| Full unit suite, parallel with database headroom | **Pass once:** 134 files passed, 2 skipped; 1,142 tests passed, 2 skipped. A later repeat hit the existing 60-second ceiling in the Chapter-50 continuation test under worker contention; that test passed alone in 22 seconds. |
| Full unit suite, stable final run | **Pass:** 134 files passed, 2 skipped; 1,142 tests passed, 2 skipped with one worker and 20-second database test/hook headroom. This is the final regression result. |
| Packed SEN consumer | **Pass:** custom branding/account/storage types, all 16 exports, no Library UI/audio-player install, AI omitted. |
| Packed Library consumer | **Pass:** all 14 exports install, typecheck and bundle on top of packed SEN and the two pinned UI artifacts. |
| Workshop and API build | **Pass:** Vite application plus Chapter Generation diagnostic, HARNESS, Story Seed, Codex voice, translation and consolidated Library economy API bundles. |
| Browser/accessibility | **Pass:** real Chromium at 390px and 1440px loaded Profile, Story Seed and HARNESS without console errors or horizontal overflow; the focused accessibility/browser set passed 26/26. Browser verification also caught and removed a stale Workshop-only `isPremium` field before delivery. |
| Diff hygiene | **Pass:** `git diff --check`. |
