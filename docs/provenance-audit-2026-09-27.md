# Provenance audit — 2026-09-27

## Assessment

The current feature is a useful development preview and a sensible starting contract. Its Ⓢ mark, source-neutral heading, separate `recordedAt` and `generatedAt` fields, and record-driven components are worth keeping. It is not yet evidence that an asset was generated, recorded for a particular user, or verified: all records are local examples and no production asset consumes them.

This audit covers `src/components/provenance/`, `src/workshop/ProvenanceTab.tsx`, its dedicated `?preview=provenance` page, the package ownership boundary, focused tests, and rendered desktop/mobile behavior. It does not change product code or connect a generator.

## What is working

- The record describes several media types without tying the UI to one model provider. `recordedAt` is required; exact generation time is optional.
- The badge is a real button with an accessible name and a 44px target. The shared popover opens from it and supports Escape dismissal.
- The tab shows six asset examples, mock records, the intended flow, and clearly labeled future connections. The separate `deferred` owner prevents accidental SEN/Library package export.
- `createProvenanceRecord()` forces locally created records to `recorded`. The focused provenance suite passes (9 tests on this audit branch).
- The current layout fits a 390px viewport; the badge and details view remain usable there.

## Findings, in priority order

### 1. The claim needs an authoritative recording event before reuse

The details view says “SEIHouse recorded this asset for this user,” but `createProvenanceRecord()` uses the local runtime clock, accepts caller-supplied timestamps and IDs, and can create a record with no `userId` or `assetId`. This is appropriate for a mock. It cannot yet support that claim on a real asset. When integrated, the system should create the record from a trusted application event, bind it to the authenticated account and a stable asset/version, and retain the recording timestamp assigned by that authority. The UI should only show the claim for such a record. Keep the user-approved wording; gate when it is used.

### 2. “Verified” is representable without a verifier

The local constructor correctly forces `status: 'recorded'`, but `ProvenanceBadge` and `ProvenanceDetails` accept any `ProvenanceRecord`. A caller can pass `{ status: 'verified' }`, and the details view will display “Verified” even though verification is not connected. Reserve that presentation state behind a future verified result, with a defined meaning and authority. For now, the development preview should never visually imply verification.

### 3. Asset evidence and lineage need version semantics

`contentHash` is a placeholder; no bytes are fingerprinted. A single `assetId` also does not say which revision, rendition, or export the record describes. Before dispute evidence is built, define the exact content being bound (for example, saved chapter revision versus rendered text, or original image versus resized cover), the fingerprint algorithm and canonicalization, and what happens after edits or regeneration. `parentAssetId` is rightly optional, but a future composite asset may have multiple inputs; do not assume one parent is a complete history. Show the time zone with `recordedAt` when presenting it as evidence; the current compact view formats a local time without a zone label.

### 4. Media type does not explain the AI contribution

`contentType` tells us whether an asset is a chapter, image, or audio file. `generator` and `model` name tools when known, but they do not distinguish fully generated content from AI-assisted editing, translation, narration of human text, or a later human revision. Add an explicit, small source/action classification when the first real generator is connected. Show only what the system actually knows.

### 5. Public details need a privacy boundary

The compact view currently displays raw `userId`, `assetId`, `contentHash`, and `parentAssetId` values. Those are useful internal evidence links, not necessarily safe public labels. Decide which fields are account-private, support-only, or publicly visible before integration. Keep the full record in a developer inspector; give ordinary viewers a short disclosure with safe identifiers and available generator context.

### 6. The compact view is visually too dense

The brand mark and dark styling fit the Workshop. On desktop and at 390px, the popover fits, but its 0.62–0.72rem supporting text is small and the ten metadata rows dominate the disclosure. Several read “Not provided.” Keep the compact view to the content type, recorded time, provenance ID, available generator/model, and a precise status; reveal advanced evidence only when it exists and is appropriate to the viewer. Increase text size and test contrast, keyboard focus, and 200% zoom before reuse outside the Workshop.

## Recommended sequence

1. **Refine the development preview:** keep Ⓢ and the approved wording; make sample data unmistakable, remove empty evidence rows from the compact view, improve text size, and prevent an arbitrary record from displaying a verified state. Leave the complete mock contract visible in the dev tab.
2. **Pilot one real asset type when integration is authorized:** choose one producer and one asset version. Record the account, asset identity, source/action, and authoritative `recordedAt` together with the saved asset. Test edits, retries, ownership changes, and failed recording explicitly.
3. **Add evidence only after defining the claim:** specify version binding, fingerprint scope, verification authority, and private/public fields. Extend to other generators through adapters around the same UI contract. Consider interoperable Content Credentials only if exported-media verification becomes a product requirement.

The Ⓢ mark is a SEIHouse disclosure, not the official Content Credentials indicator. The C2PA guidance supports progressive disclosure and clear AI-action wording; its explainer also cautions that even cryptographically valid provenance does not prove every underlying assertion true. These principles support keeping “recorded,” “asset-bound,” and “verified” distinct.

## Evidence and limits

- Source: `src/components/provenance/shared/types.ts`, `createProvenanceRecord.ts`, `development/ProvenanceBadge.tsx`, `development/ProvenanceDetails.tsx`, `development/provenance.css`, `src/workshop/ProvenanceTab.tsx`, and `scripts/ownershipInventory.mjs`.
- Validation: `npm run test:provenance` passed 9 tests; local browser rendered the dedicated preview, opened the details view, and showed the desktop and 390px layouts. The hosted preview redirected to Vercel login, so this audit's visual judgment comes from the local preview.
- External guidance: [C2PA explainer](https://spec.c2pa.org/specifications/specifications/2.2/explainer/Explainer.html), [C2PA user experience guidance](https://spec.c2pa.org/specifications/specifications/2.2/ux/UX_Recommendations.html), [C2PA guiding principles](https://c2pa.org/principles/), and [NIST synthetic-content transparency overview](https://www.nist.gov/publications/reducing-risks-posed-synthetic-content-overview-technical-approaches-digital-content).

## Implementation response — 2026-09-27

Implemented on the follow-up branch after the audit:

- Mock construction now has an explicit `mock` status and cannot accept caller-supplied status. The UI tracks trust separately from record data: only locally registered mocks are recognized, while arbitrary and deserialized objects default to mock. `verified` remains a reserved record status and is excluded from current presentation modes.
- Records identify required `assetId`, `versionId`, `actor`, and `action`; optional `parentVersions` points to one or more exact prior versions. A changed version gets a new record.
- The compact details view omits absent fields and internal user, asset, fingerprint, and parent IDs. It displays available version, actor/action, recording time with time zone, and generator/model. The approved user statement is reserved for records registered through a future authoritative recording path and appears only when a user ID is present.
- Text size is larger, and the mock records include a user-edited chapter version to exercise the additional event semantics.

An authoritative app recording event and actual verification remain future work. No generator, persistence, hash, C2PA, or backend connection was added.
