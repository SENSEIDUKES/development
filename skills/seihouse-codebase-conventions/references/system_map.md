# SEIHouse Stable System Map

This map describes product responsibilities. Repository names and folder locations may
change. Always verify the current implementation.

## Authority and package ownership

Read the [skill entrypoint](../SKILL.md) for authority, compatibility, deletion and
package boundaries, and [current package documentation](../../../src/package/README.md)
for the maintained implementation contract. [NOVEL_EXPANDED.md](../../../NOVEL_EXPANDED.md)
governs over this map, and its [Names](../../../NOVEL_EXPANDED.md#names) table is the
current vocabulary. Verify every path and export independently. Report conflicts with
this map and resolve them deliberately.

## SEN and Library

SEN is the portable expanded-narrative engine. The Library is SEIHouse's first-party
host: the product Expanded Novels, presented as the Celestial Library, whose app is the
NovelExpanded app at `/app/` (`src/novel-expanded/`). The Library may depend on SEN;
SEN must never depend on the Library. Reader Chamber is a reading surface within SEN,
not the entire engine. AI generation is an optional content source. Library branding,
cultivation, economy, hub behavior, services, and infrastructure belong to the host.

## Shared SEIHouse infrastructure

SPP and CAPA, the Model Router, provenance, asset and version systems, shared UI
primitives, media infrastructure, and storage and provider boundaries belong to neither
product. SEN pressure-tests them so SEA can inherit them. Some live inside SEN or the
Library today because they were first needed there; do not move more into
`@seihouse/sen` for that reason. Every model call is registered in the Model Router
(see AGENTS.md, Generation features and the Model Router).

## SEIHouse

SEIHouse is the broader creator-infrastructure company and product family. Its systems
should translate artistic intent into richer experiences without permanently binding
the product to one model provider, one medium, or one implementation detail.

## The Library / Celestial Library

The Library is the story-facing product environment. Depending on the product stage,
“Library” may refer to the personal story collection, the broader application, or the
future discovery/community layer.

When a task mentions Library behavior, determine whether it concerns personal story
loading, story identity and metadata, discovery/publication, media-expression
navigation, the shared UI shell, or synchronization and persistence. Do not assume all
of these belong to one component or service.

## Story

A story is the primary shared canon/world object. Stable responsibilities include
identity and ownership, story seed and creation metadata, world and character
relationships, canonical continuity, publication and permissions, progress and
versioning, and relationships to media expressions.

A story may support novel, Reader Codex, audio, manga, game, animation, and future media
expressions. Each expression should be able to declare whether it is canonical, adapted,
alternate, or promotional. Current UI may expose fewer media types than the backend can
represent.

## Story Generation

Before inspecting generation implementation, read the HARNESS
[architecture vocabulary](../../../src/components/harness-generation/ARCHITECTURE_VOCABULARY.md)
and [principles](../../../src/components/harness-generation/HARNESS_PRINCIPLES.md).
The HARNESS is invisible to readers; its only user-facing place is Story Settings.

What a chapter knows, plans and records follows [the chapter loop](../../../docs/chapter-loop.md):
the record (the Codex snapshot) as the last chapter left it, a plan step (Fate) that
decides what happens, CTE deciding what events do to people, the writer narrating the
plan, and the record updating from the plan. Media tags (Sound Cues, soundscape,
atmosphere) stay in the prose; information is never tagged in the prose. The writer
narrates consequences; it never decides them. Check that document's build order before
treating any part of the loop as built.

Generated data flows into durable story systems through explicit contracts. Rendered
chapter text alone does not prove generation completed successfully.

## Reader Chamber

Reader Chamber is where chapters are read, within SEN: a HARNESS story's chapters on the
Highlight Engine with Sound Cues, Listen (read aloud in each character's voice from the
voice cast), the soundtrack, Reader Settings, and progress and resume. The NovelExpanded
app's Reader and the Workshop's `?preview=reader-chamber` Development view use it; the
older development Reader is retired.

Reader Chamber consumes generation outputs and the Codex through clear contracts. It
should not be fused to a particular model provider or generation process. Keep the
current product names in NOVEL_EXPANDED.md's Names table.

## Reader Codex

The Codex is the story's world as its record knows it: characters, factions and items
today, places and a Bestiary later, every fact linked to its passage. **One record, many
views:** each category is one record, built the same way. Power rankings, Karma and other
Codex mechanics are ways of displaying that record, never separate stores fed
separately. The Codex shows only what the record holds today and grows as each step of
the chapter loop is built.

Manifesting happens while reading: a name the story has met glows in the chapter and
its card offers Manifest. Nothing the story has not yet shown can be manifested. Entries
stay tied to the correct story and source passage; cards, portraits, highlights and
manifestations are downstream of correct records. When several visible symptoms fail
together, inspect the shared record or persistence contract first.

## Media and R2

Object storage owns durable media assets when the current repository uses R2. Media
concerns include upload/generation, stable object keys, access, metadata,
story/chapter/entity association, availability, fallback, cleanup, and replacement.

A database record without an available object is not complete user-visible success. An
uploaded object without a durable relational record is also incomplete.

## Postgres and Firebase

Postgres owns application data migrated away from Firestore, subject to the repository’s
current implementation. Typical concerns include stories, chapters, user-owned records,
Reader Codex metadata, progression, preferences, synchronization state, media
references, publication, and permissions.

The intended stable direction is Firebase Auth, Postgres application data, and R2 media.
Code inspection determines the actual active responsibility. Do not expand Firebase
application-data ownership by default.

## Harmony / Library Synchronization

Harmony refers to synchronization and retrieval behavior that keeps a user’s Library
current and usable. A successful Library load means more than placeholder story rows:
stories should become available promptly with expected metadata and cover art.

Distinguish initial local render, remote refresh, reconciliation, media availability,
stale data, retries, duplicate writes, and queued work. Avoid write amplification and
repeated full refreshes.

## Profiles and Profile Pictures

Profile systems include authentication identity presentation, application profile data,
preferences, progression identity, and selected/generated profile pictures.

A provider avatar, generated profile picture, media asset, and persisted profile
selection may have different owners and lifecycles. Developer-facing profile-picture
code should use the current `profilePicture` vocabulary while persisted media-purpose
and schema contracts remain compatible.

## Cultivation, Qi, Relics, and Rewards

These are product-domain systems, not generic gamification labels. They may include
closed-door cultivation, Qi/energy economy, ranks, relic acquisition and rarity,
cosmetic unlocks, claim/reveal flows, offering, and conversion mechanics.

Keep economy state and reward truth authoritative. Animations and reveal cards present
the result; they should not independently decide or persist rewards.

## Workshop and Themes

The new path is built in this repository: SEN, Library and the NovelExpanded app at
`/app/`. NOVEL_EXPANDED.md decides what gets built. Use [Workshop Replica](../../workshop-replica/SKILL.md)
to bring a surface over from the production app or for approved reconstruction;
reconstruction follows [DEVELOPMENT_RECONSTRUCTION.md](../../../DEVELOPMENT_RECONSTRUCTION.md).

Old systems wait for their remake or their import; follow the skill's
[Deleting old code](../SKILL.md#deleting-old-code) rules for when they go. Existing
`reference/` folders are historical old production versions, never edited, refreshed
or re-synced. New features use one `development/` folder, optional genuinely shared
code, one FeatureWorkspace preview, one manifest entry and a README with a short dated
history. Themes use shared tokens, primitives and package contracts rather than
scattered values.

Never change another repository without the owner's explicit request.

## Audio ownership

Inspect the current audio package documentation and feature owners for coordinated playback of narration,
World Card clips, music/scene scoring, ambient loops, and discrete sound cues. Avoid
competing audio lifecycles inside individual components. Respect user controls, autoplay
restrictions, persistence, interruption, and mobile/lock-screen behavior where
supported.

## Library Hub and Future Media

The Hub is the eventual discovery/community and cross-media entry layer. Library owns its hub experience; SEN supplies reusable narrative capabilities. Shared story architecture should allow one Library
entry to lead to multiple media expressions without each medium reinventing story
identity, world ownership, canon, or permissions.
