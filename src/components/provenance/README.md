# Provenance

- **Source reference:** `https://lines.seihouse.org/LIBRARY/images/ICONS/Header/SENSEIHOUSEProvenance.svg`
- **Workshop location:** Home → Provenance tab
- **Replica created:** 2026-09-11
- **Last Workshop update:** 2026-09-27
- **Last source comparison:** 2026-09-11
- **Replica status:** under refinement

## Purpose

Provenance is the development-only front-end and contract skeleton for marking
SEIHouse asset versions. It gives text, chapters, stories, translations,
images, covers, audio, narration, video, and other media one quiet Ⓢ disclosure
and one provider-neutral record shape for AI generation, user edits, system
changes, and imported assets.

Every record identifies `assetId` and `versionId`. A meaningful change creates
a new version and a new record; old authoritative records are not edited to
describe newer versions. `actor` and `action` use a small vocabulary to describe
what caused that version to exist and what happened. `parentVersions` is
optional and normally contains one prior version; multiple parents are for
assets that genuinely combine inputs.

`recordedAt` is required and primary. `generatedAt` is optional and must only
be supplied when the actual generation time is known; the two timestamps are
not interchangeable. Local creation always sets `status: 'mock'` and uses the
runtime clock only to populate a fixture. `recorded` is reserved for an
authoritative application recording event, and `verified` is reserved for an
actual future verifier result.

## Workshop history

- **2026-09-11:** Captured the supplied provenance mark, created the shared
  user/asset/evidence record contract and local constructor, built the Ⓢ badge
  and compact details interaction, and added the Provenance preview/system-map
  tab with mock records and future connection labels.
- **2026-09-27:** Added required asset-version and actor/action fields, optional
  parent-version references, explicit mock status, safer compact disclosure,
  and a UI presentation mode that does not trust status strings in record data.

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

The following fields reserve future evidence relationships without
implementing persistence or verification:

- `userId`: future owner/account record
- `assetId` and `versionId`: asset and exact meaningful version
- `contentHash`: future exact-content fingerprint
- `parentVersions`: optional previous version references

The UI tracks presentation trust separately from the record's status string.
Records created by the development utility are registered as mock. Unknown or
deserialized records default to mock even if their data says `recorded` or
`verified`. A future authoritative recording path must register a record only
after binding an authenticated user where applicable, a stable asset and
version, and authoritative `recordedAt`. The current UI presentation type
excludes `verified`; a future verifier must provide an actual result before a
verified state can be added.

There is no Firestore, Postgres, R2, API, network request, hashing, C2PA,
cryptographic verification, blockchain, public verification route, or
production integration in this feature.

## Transfer notes

Future integration should keep `ProvenanceBadge` and `ProvenanceDetails`
record-driven. A host adapter may retrieve a record and pass it to the UI, but
must establish its trust through an authoritative recording or verification
path first; fetching, authentication, storage, hashing, and verification remain
outside the components. Public details should not expose raw user, asset,
fingerprint, or parent identifiers by default.

Before publishing this module, choose a cross-product package owner that can be
consumed by SEN, SEA, and other SEIHouse generators without making SEN depend on
Library. Package publication and production transfer are deliberately deferred.
