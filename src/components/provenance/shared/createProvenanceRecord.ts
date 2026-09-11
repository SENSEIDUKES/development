import type { CreateProvenanceRecordInput, ProvenanceRecord } from './types';

function createLocalId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `prov_${globalThis.crypto.randomUUID()}`;
  }

  // This fallback is a local-development identifier, never a security token.
  return `prov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Creates a local provenance record without reading or writing persistence.
 * Callers may provide fixed IDs and timestamps for imports, fixtures, or tests.
 */
export function createProvenanceRecord(input: CreateProvenanceRecordInput): ProvenanceRecord {
  return {
    ...input,
    provenanceId: input.provenanceId ?? createLocalId(),
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    status: 'recorded',
  };
}
