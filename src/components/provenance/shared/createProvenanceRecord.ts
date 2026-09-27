import type {
  CreateProvenanceRecordInput,
  ProvenancePresentationStatus,
  ProvenanceRecord,
} from './types';

const trustedPresentationStatuses = new WeakMap<object, ProvenancePresentationStatus>();

function registerPresentationStatus(record: ProvenanceRecord, status: ProvenancePresentationStatus) {
  trustedPresentationStatuses.set(record, status);
}

/** Unrecognized or deserialized records are always treated as development mocks. */
export function getProvenancePresentationStatus(record: ProvenanceRecord): ProvenancePresentationStatus {
  return trustedPresentationStatuses.get(record) ?? 'mock';
}

function createLocalId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `prov_${globalThis.crypto.randomUUID()}`;
  }

  // This fallback is a local-development identifier, never a security token.
  return `prov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Creates a development mock only; it does not record an asset with SEIHouse.
 * Callers may provide fixed IDs and timestamps for fixtures or tests.
 */
export function createProvenanceRecord(input: CreateProvenanceRecordInput): ProvenanceRecord {
  const record: ProvenanceRecord = Object.freeze({
    ...input,
    parentVersions: input.parentVersions
      ? Object.freeze(input.parentVersions.map(parent => Object.freeze({ ...parent })))
      : undefined,
    provenanceId: input.provenanceId ?? createLocalId(),
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    status: 'mock',
  });
  registerPresentationStatus(record, 'mock');
  return record;
}
