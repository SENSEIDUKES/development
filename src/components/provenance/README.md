# Provenance

- **Source reference:** `https://lines.seihouse.org/LIBRARY/images/ICONS/Header/SENSEIHOUSEProvenance.svg`
- **Workshop location:** Home → Provenance tab
- **Replica created:** 2026-09-11
- **Last Workshop update:** 2026-09-11
- **Last source comparison:** 2026-09-11
- **Replica status:** under refinement

## Purpose

Provenance is the development-only front-end and contract skeleton for marking
AI-generated SEIHouse assets. It gives text, chapters, stories, translations,
images, covers, audio, narration, video, and other generated media one quiet Ⓢ
disclosure and one provider-neutral record shape.

The durable claim represented by this first contract is that SEIHouse recorded
an asset for a user at a particular time. `recordedAt` is therefore required and
primary. `generatedAt` is optional and must only be supplied when the actual
generation time is known; the two timestamps are not interchangeable.

## Workshop history

- **2026-09-11:** Captured the supplied provenance mark, created the shared
  user/asset/evidence record contract and local constructor, built the Ⓢ badge
  and compact details interaction, and added the Provenance preview/system-map
  tab with mock records and future connection labels.

## Ownership and structure

- `reference/SENSEIHOUSEProvenance.svg` is the untouched visual reference
  supplied for this task. There is no production component to replicate yet.
- `shared/` owns the provider-neutral record types and the non-persisting local
  constructor.
- `development/` owns the reusable badge, details UI, and component-only CSS.
- `src/workshop/ProvenanceTab.tsx` owns fixtures, example assets, system maps,
  and every development-only explanatory label.
- The feature root barrel is a local Development-repository import boundary.
  Nothing is exported from `@seihouse/sen`, `@seihouse/library`, or
  `@seihouse/ui` in this phase.

The existing Reader Codex `provenance` metadata describes narrative-memory
origin and author pinning. It is a separate contract and is intentionally not
extended, migrated, or consumed here.

## Mock and future evidence boundary

`createProvenanceRecord()` creates an in-memory object only. The Workshop uses
fixed mock IDs and timestamps so examples and tests remain stable. A mock
fingerprint string demonstrates the future field but is explicitly not a hash
of the displayed asset.

The following fields reserve future dispute-evidence relationships without
implementing them:

- `userId`: future owner/account record
- `assetId`: future SEIHouse asset record
- `contentHash`: future exact-content fingerprint
- `parentAssetId`: optional future source/derived-asset lineage

There is no Firestore, Postgres, R2, API, network request, hashing, C2PA,
cryptographic verification, blockchain, public verification route, or
production integration in this feature.

## Transfer notes

Future integration should keep `ProvenanceBadge` and `ProvenanceDetails`
record-driven. A host adapter may retrieve or verify a record and then pass the
same `ProvenanceRecord` to the UI; fetching, authentication, storage, hashing,
and verification must remain outside the components.

Before publishing this module, choose a cross-product package owner that can be
consumed by SEN, SEA, and other SEIHouse generators without making SEN depend on
Library. Package publication and production transfer are deliberately deferred.
