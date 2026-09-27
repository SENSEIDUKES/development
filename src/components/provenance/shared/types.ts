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

export type ProvenanceActor = 'user' | 'ai' | 'system' | 'import';

export type ProvenanceAction =
  | 'generated'
  | 'edited'
  | 'regenerated'
  | 'translated'
  | 'converted'
  | 'media-added'
  | 'uploaded';

export type ProvenanceAssetVersionRef = Readonly<{
  assetId: string;
  versionId: string;
}>;

/**
 * Mock is the only status created by the local development utility. Recorded
 * describes an authoritative SEIHouse recording event. Verified is reserved
 * for a future verifier result and is not currently a UI presentation state.
 */
export type ProvenanceStatus = 'mock' | 'recorded' | 'verified';

/** Current UI modes deliberately exclude verified until a real result exists. */
export type ProvenancePresentationStatus = Extract<ProvenanceStatus, 'mock' | 'recorded'>;

/**
 * A provider-neutral description of one meaningful asset version. When that
 * version changes, create a new version and record instead of mutating history.
 * This shape alone does not establish that a record is authoritative.
 */
export type ProvenanceRecord = Readonly<{
  provenanceId: string;
  contentType: ProvenanceContentType;
  assetId: string;
  versionId: string;
  actor: ProvenanceActor;
  action: ProvenanceAction;
  userId?: string;
  contentHash?: string;
  parentVersions?: readonly ProvenanceAssetVersionRef[];
  generator?: string;
  model?: string;
  generatedAt?: string;
  recordedAt: string;
  status: ProvenanceStatus;
}>;

/** Input for mock data only; status and generated identity are never caller-set. */
export type CreateProvenanceRecordInput = Pick<
  ProvenanceRecord,
  'contentType' | 'assetId' | 'versionId' | 'actor' | 'action'
> & Partial<Omit<
  ProvenanceRecord,
  'contentType' | 'assetId' | 'versionId' | 'actor' | 'action' | 'status'
>>;
