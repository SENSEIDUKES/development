export type ProvenanceContentType =
  | 'text'
  | 'chapter'
  | 'story'
  | 'translation'
  | 'image'
  | 'cover'
  | 'audio'
  | 'narration'
  | 'video'
  | 'other';

/**
 * `recorded` is the only status created locally in this phase. The remaining
 * values reserve presentation states for a future verifier without providing
 * or implying verification itself.
 */
export type ProvenanceStatus =
  | 'recorded'
  | 'verified'
  | 'verification-unavailable';

/**
 * A provider-neutral description of an AI-generated asset and the evidence
 * SEIHouse may later use to protect its owner. Optional evidence fields do not
 * become claims merely because they exist in this contract.
 */
export type ProvenanceRecord = {
  provenanceId: string;
  contentType: ProvenanceContentType;
  userId?: string;
  assetId?: string;
  contentHash?: string;
  parentAssetId?: string;
  generator?: string;
  model?: string;
  generatedAt?: string;
  recordedAt: string;
  status: ProvenanceStatus;
};

export type CreateProvenanceRecordInput = Pick<ProvenanceRecord, 'contentType'>
  & Partial<Omit<ProvenanceRecord, 'contentType' | 'status'>>;
