# Development documentation

[Project guides](#project-guides) · [Plans](#plans) · [Research](#research) · [Archive](#archive) · [Source guides](#source-guides) · [Supporting data](#supporting-data)

## Documentation rules

- Put shared how-to and architecture guides in `docs/guides/`.
- Put plans and roadmaps in `docs/plans/`. Record completed work, open work, and any owner decisions still needed in the plan.
- Put research notes, findings, and investigations in `docs/research/`. Date findings that describe a particular checkout.
- Put finished or replaced documents and their evidence in `docs/archive/`. Link to the successor when there is one.
- Keep feature READMEs, package contracts, service runbooks, and agent skills with the files they describe.
- Update this index and incoming links when adding, moving, archiving, or replacing a document.

**Current** marks a maintained guide. **Active plan** means work remains. **Proposed** marks a design awaiting implementation. **Reference** marks research or supporting material. **Archived** marks a historical record. **Retired** marks an owner note for a removed feature.

## Project guides

| Document | Status | Covers |
| --- | --- | --- |
| [Development documentation](README.md) | Current | Repository documentation index and rules. |
| [Repository README](../README.md) | Current | Setup, Workshop previews, and verification. |
| [Coding agent instructions](../AGENTS.md) | Current | Required skills and repository workflow. |
| [NovelExpanded product direction](../NOVEL_EXPANDED.md) | Current | Product map, build state, and roadmap. |
| [Development reconstruction policy](../DEVELOPMENT_RECONSTRUCTION.md) | Current | Scope and infrastructure rules for rebuilding systems. |
| [NovelExpanded app](../src/novel-expanded/README.md) | Current | App routes, shell, storage, and Workshop integration. |
| [Package ownership](../src/package/README.md) | Current | Where SEN and Library features belong. |
| [SEN package](../src/package/sen/README.md) | Current | Portable engine entry points and host integration. |
| [Library package](../src/package/library/README.md) | Current | First-party surfaces and package entry points. |
| [Adding a Workshop component](guides/ADDING-A-COMPONENT.md) | Current | Component ownership, preview registration, and checks. |
| [Library header family](guides/library-header-family.md) | Current | Shared header composition, controls, and ownership. |
| [Library navigation](guides/library-navigation.md) | Current | Destinations, responsive shell, and focused workspaces. |

## Plans

| Document | Status | Covers |
| --- | --- | --- |
| [Arc goals on cards](plans/arc-goals-on-cards.md) | Proposed | 4 to 10 goals per arc (built); one Main Goal per arc proven by a card change. |
| [Create, the creator's hub](plans/create-hub.md) | Active plan | The World Space (author's world view), manuscript import, and chapter tagging. |
| [CTE consequences](plans/cte-consequences.md) | Proposed | Design and open questions for the consequence layer. |
| [Discover](plans/discover-page.md) | Active plan | Discover's catalogue, publication, and community features. |
| [SEIHouse Front Desk](plans/front-desk-plan.md) | Active plan | Front Desk rollout, Familiar guides, and accessibility. |
| [The World at Chapter 0](plans/world-at-chapter-0.md) | Active plan | The opening world record and the follow-on CTE work. |
| [World state pipeline](plans/world-state-pipeline.md) | Active plan | Codex entries from the Blueprint, Alter Fate, and arc boundaries. |

## Research

| Document | Status | Covers |
| --- | --- | --- |
| [Story Tag audit](research/story-tag-audit-2026-10-25.md) | Reference | 2026-10-25 catalogue findings, first cleanup, and niche design. |

## Archive

| Document or evidence | Status | Covers |
| --- | --- | --- |
| [Archive overview](archive/README.md) | Current | How to use the historical records. |
| [Dead implementations audit](archive/dead-implementations-audit-2026-10-28.md) | Archived | 2026-10-28 inventory of old or unused implementations. |
| [Profile environment catalogue](archive/profile-cave-environment.md) | Archived | 2026-10-28 record of the retired Cave layouts and environments. |
| [Feature audit](archive/feature-audit-2026-10-18.md) | Archived | 2026-10-18 comparison of Development and Light-Novels. |
| [Provenance audit](archive/provenance-audit-2026-09-27.md) | Archived | 2026-09-27 provenance and disclosure findings. |
| [Translation and Accessibility audit](archive/translation-accessibility-audit.md) | Archived | 2026-09-26 managed-slot design. |
| [Familiar mobile performance audit](archive/familiar-mobile-performance-2026-09-20.md) | Archived | 2026-09-20 sprite, companion, and action tray measurements. |
| [HARNESS chapter generation audit](archive/HARNESS_CHAPTER_GENERATION_AUDIT.md) | Archived | 2026-09-19 chapter generation and prompt findings. |
| [Library UI migration](archive/library-ui-migration.md) | Archived | 2026-09-19 transfer of Library UI responsibilities. |
| [Product ownership and package audit](archive/product-ownership-package-audit.md) | Archived | 2026-09-18 package coverage and implementation follow-up. |
| [Skill system audit](archive/skill-system-audit.md) | Archived | 2026-09-17 consolidation of agent guidance. |
| [App-shell header verification](archive/app-shell-header-validation.md) | Archived | 2026-09-09 responsive header and page titles. |
| [Library top navigation verification](archive/library-top-navigation-validation.md) | Archived | 2026-09-09 navigation actions and browser results. |
| [Standalone Home change report](archive/standalone-home/changes.md) | Archived | 2026-09-09 Home foundation and validation. |
| [Standalone Home browser results](archive/standalone-home/navigation-browser.json) | Archived | Navigation evidence for the Standalone Home report. |
| [Standalone Home mobile screenshot](archive/standalone-home/home-mobile.png) | Archived | Home at 390 × 844. |
| [Library Shell mobile screenshot](archive/standalone-home/library-mobile.png) | Archived | Comparison evidence for the Standalone Home report. |
| [Library header validation](archive/library-header-validation.md) | Archived | 2026-09-08 interaction and layout checks. |
| [Library Shell validation](archive/library-shell-validation.md) | Archived | 2026-09-08 capture fidelity and later shell checks. |
| [Library UI browser verification](archive/library-ui-browser-verification.json) | Archived | 2026-09-06 browser results for the Library UI transfer. |
| [HARNESS continuation evaluation](archive/harness-continuation-evaluation-2026-09-06.md) | Archived | 2026-09-06 steered continuation trial. |

## Source guides

<details>
<summary>Engine and feature guides</summary>

| Document | Status | Covers |
| --- | --- | --- |
| [Portable narrative audio](../src/audio/README.md) | Current | Audio contracts and host playback. |
| [Arc Goals](../src/components/arc-goals/README.md) | Current | Arc goal scoring and presentation. |
| [Card Workshop](../src/components/card-workshop/README.md) | Current | Card surfaces and the Workshop reference. |
| [Celestial Store](../src/components/celestial-store/README.md) | Current | Store surfaces and reward previews. |
| [Chapter Generation](../src/components/chapter-generation/README.md) | Retired | Record of the removed pipeline. |
| [Generation Overlay](../src/components/chapter-manifestation/README.md) | Current | Chapter generation presentation. |
| [Closed-Door Cultivation](../src/components/closed-door-cultivation/README.md) | Current | Cultivation experience and preview. |
| [Creator Space](../src/components/creator-space/README.md) | Current | Create page and creator tools. |
| [World Space](../src/components/world-space/README.md) | Current | One of the creator's worlds: its Feature card, Blueprint, Chapters and tagging, Assets, Info. |
| [Daily Dao Pillar](../src/components/dao-pillar/README.md) | Current | Daily practice and its reward surface. |
| [Discover implementation](../src/components/discover/README.md) | Current | Shared Discover surface, catalogue, and Lore. |
| [Energy](../src/components/energy/README.md) | Current | Energy surfaces and host connections. |
| [Familiar](../src/components/familiar/README.md) | Current | Companion, Front Desk integration, and playback. |
| [Familiar Page and Bonds](../src/components/familiar-training/README.md) | Current | Familiar interactions and training. |
| [HARNESS Generation](../src/components/harness-generation/README.md) | Current | Chapter generation, tagging, and Workshop behavior. |
| [HARNESS architecture vocabulary](../src/components/harness-generation/ARCHITECTURE_VOCABULARY.md) | Current | Canonical terms and implementation owners. |
| [HARNESS principles](../src/components/harness-generation/HARNESS_PRINCIPLES.md) | Current | Generation principles and the world record. |
| [HARNESS Media Loadout](../src/components/harness-generation/MEDIA_LOADOUT.md) | Current | Runtime media catalogue and loadout boundary. |
| [HARNESS SPP import](../src/components/harness-generation/SPP_IMPORT.md) | Current | Skill import and validation. |
| [Highlight Engine](../src/components/highlight-engine/README.md) | Current | Text highlight contracts and editing. |
| [Library presentation](../src/components/library-presentation/README.md) | Current | Shared Library materials and presentation. |
| [Library Shell](../src/components/library-shell/README.md) | Current | Shell ownership, adapters, and previews. |
| [Light Novels Home](../src/components/light-novels-home/README.md) | Current | Home surface and Workshop preview. |
| [Motion Picture](../src/components/motion-picture/README.md) | Current | Motion Picture contracts and preview. |
| [Palette & Materials](../src/components/palette-materials/README.md) | Current | Palette controls and material settings. |
| [Provenance](../src/components/provenance/README.md) | Current | Attribution and disclosure surfaces. |
| [Reader Chamber](../src/components/reader-chamber/README.md) | Current | Reader Chamber owner guide and comparison preview. |
| [Production Reader inventory](../src/components/reader-chamber/PRODUCTION_READER.md) | Reference | Historical Reader behavior used for its remake. |
| [Reader translation](../src/components/reader-chamber/READER_TRANSLATION.md) | Current | Translation overlay and skill resolution. |
| [Reader Codex](../src/components/reader-codex/README.md) | Current | Codex ownership and comparison preview. |
| [Fate Survival Relics](../src/components/relics/README.md) | Current | Relic inventory and reader-facing behavior. |
| [Rewards](../src/components/rewards/README.md) | Current | Achievements, Mystery Scrolls, and reward reveals. |
| [SEN icons](../src/components/sen-icons/README.md) | Current | Icon ownership and usage. |
| [R2 icon URLs](../src/components/sen-icons/URLS.md) | Reference | Hosted icon locations. |
| [Sparks](../src/components/sparks/README.md) | Current | Sparks authoring surfaces and contracts. |
| [Story Seed](../src/components/story-seed/README.md) | Current | Seed fields, tags, and Blueprint handoff. |
| [User Profile](../src/components/user-profile/README.md) | Current | Cultivator Cave routes and profile behavior. |
| [World Card](../src/components/world-card/README.md) | Current | Shared cards and their variants. |

</details>

<details>
<summary>Server, service, and Workshop guides</summary>

| Document | Status | Covers |
| --- | --- | --- |
| [Daily Dao Pillar calendar](../src/server/dao-pillar/README.md) | Current | Day boundaries, claims, and calendar rules. |
| [Energy ledger](../src/server/energy/README.md) | Current | Energy balances and transaction rules. |
| [Model Router](../src/server/model-router/README.md) | Current | Provider choices and generation consumers. |
| [Relics server](../src/server/relics/README.md) | Current | Relic persistence and lifecycle. |
| [Library reward core](../src/server/rewards/README.md) | Current | Reward issuance and server ownership. |
| [Kokoro voice server](../services/kokoro-voice/README.md) | Current | Deployment and voice generation service. |
| [Qwen3-TTS trial](../services/qwen-voice-test/README.md) | Reference | Character voice experiment and how to reproduce it. |
| [Workshop product-term docs](../src/workshop/docs/README.md) | Current | Workshop reference workspace and term content. |
| [Image Prompts workspace](../src/workshop/previews/image-prompts/README.md) | Current | Prompt editing and preview. |
| [Library Components workspace](../src/workshop/previews/library-components/README.md) | Current | Shared component fixtures. |
| [OAuth workspace](../src/workshop/previews/oauth/README.md) | Current | Sign-in preview and integration boundaries. |
| [User Shop workspace](../src/workshop/previews/user-shop/README.md) | Current | Shop preview and fixtures. |
| [Writer Instructions workspace](../src/workshop/previews/writer-instructions/README.md) | Current | Inspection of generation instructions. |
| [SPP package templates](../templates/spp/README.md) | Current | Creating and validating `.spp` packages. |
| [Vendored artifacts](../vendor/README.md) | Current | Dependency provenance and artifact updates. |
| [Script fonts license](../public/fonts/scripts/OFL.txt) | Reference | License included with the script fonts. |

</details>

<details>
<summary>Agent skills and references</summary>

| Document | Status | Covers |
| --- | --- | --- |
| [Sensei Skill](../skills/sensei-skill/SKILL.md) | Current | Product-owner communication. |
| [SEIHouse Codebase Conventions](../skills/seihouse-codebase-conventions/SKILL.md) | Current | Repository ownership and implementation rules. |
| [Change protocol](../skills/seihouse-codebase-conventions/references/change_protocol.md) | Current | Verification by change type. |
| [Engineering conventions](../skills/seihouse-codebase-conventions/references/conventions.md) | Current | Implementation guidance. |
| [System map](../skills/seihouse-codebase-conventions/references/system_map.md) | Current | Product responsibilities and boundaries. |
| [Workshop Replica](../skills/workshop-replica/SKILL.md) | Current | Replica and reconstruction workflows. |
| [Faithful replica procedure](../skills/workshop-replica/references/faithful-replica.md) | Current | Source capture and preview validation. |
| [Verification Loop](../skills/seihouse-verification-loop/SKILL.md) | Current | Implementation and review passes. |

</details>

## Supporting data

| File | Status | Covers |
| --- | --- | --- |
| [Lore master glossary](lore/master-glossary.json) | Current | Source data for the Discover encyclopedia build. |

## History

- 2026-11-18 — Created the index and organized the repository's guides, plans, research, and historical reports.
