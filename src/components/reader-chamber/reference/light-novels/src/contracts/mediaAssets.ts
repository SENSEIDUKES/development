/**
 * Browser-safe contracts for the phase-one media foundation.
 *
 * Permanent records intentionally have no `bytes`, `blob`, `base64`, data URL,
 * or provider URL field. File bodies only cross the server boundary as a
 * transient MediaSource and are discarded after R2 confirms the upload.
 */

export const MEDIA_ASSET_TYPES = [
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'MOTION_COVER',
  'PDF',
  'EPUB',
  'MANGA_PAGE',
  'EXPORT',
  'OTHER',
] as const;

export const MEDIA_ASSET_STATUSES = [
  'GENERATING',
  'PROCESSING',
  'UPLOADING',
  'READY',
  'FAILED',
  'ARCHIVED',
  'DELETED',
  'ORPHANED',
  'PENDING_CLEANUP',
] as const;

export type MediaAssetType = (typeof MEDIA_ASSET_TYPES)[number];
export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number];
export type MediaVisibility = 'PRIVATE' | 'PUBLIC';

export interface MediaOwner {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  role?: 'owner' | 'admin' | 'user';
}

export interface MediaAssociation {
  targetKind: string;
  targetKey: string;
  purpose: string;
  storyId?: string | null;
  chapterId?: string | null;
  entityId?: string | null;
  /** Relational history metadata; never contains file bodies or source URLs. */
  clientHistoryId?: string | null;
  /** @deprecated Use clientHistoryId. Kept while local image history is migrated. */
  legacyMediaId?: string | null;
  entityType?: string | null;
  promptUsed?: string | null;
  chapterNumber?: number | null;
  arcTitle?: string | null;
  label?: string | null;
}

export interface MediaAssetRecord {
  id: string;
  ownerUid: string;
  storyId?: string | null;
  generationJobId?: string | null;
  replacesAssetId?: string | null;
  assetType: MediaAssetType;
  purpose: string;
  visibility: MediaVisibility;
  status: MediaAssetStatus;
  bucket: string;
  objectKey: string;
  originalFilename?: string | null;
  mimeType: string;
  extension: string;
  byteSize: string;
  checksumSha256: string;
  etag?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: string | null;
  version: number;
  cacheControl: string;
  failureCode?: string | null;
  failureMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
  cleanupAfter?: string | null;
}

export interface MediaAssetDescriptor {
  id: string;
  assetType: MediaAssetType;
  purpose: string;
  visibility: MediaVisibility;
  status: MediaAssetStatus;
  mimeType: string;
  byteSize: string;
  checksumSha256: string;
  width?: number | null;
  height?: number | null;
  durationMs?: string | null;
  version: number;
  deliveryUrl: string;
  /** Private delivery URLs are transient and must be refreshed after this time. */
  deliveryUrlExpiresAt?: string | null;
  createdAt: string;
  readyAt?: string | null;
}

export type MediaSource =
  | {
      kind: 'bytes';
      bytes: Uint8Array;
      mimeType?: string;
      filename?: string;
    }
  | {
      kind: 'blob';
      blob: Blob;
      filename?: string;
    }
  | {
      kind: 'data-url';
      dataUrl: string;
      filename?: string;
    }
  | {
      kind: 'remote-url';
      url: string;
      filename?: string;
      expectedMimeType?: string;
    };

export interface SaveMediaAssetRequest {
  source: MediaSource;
  assetType: MediaAssetType;
  purpose: string;
  visibility?: MediaVisibility;
  association: MediaAssociation;
  generationJobId?: string | null;
  replacesAssetId?: string | null;
  /** Owner-scoped retry key. Required by the authenticated HTTP upload routes. */
  idempotencyKey?: string;
}

export interface SelectMediaAssetRequest {
  association: MediaAssociation;
}

export interface MediaCleanupTask {
  id: string;
  assetId?: string | null;
  ownerUid: string;
  bucket: string;
  objectKey: string;
  reason: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  attemptCount: number;
  lastError?: string | null;
  nextAttemptAt: string;
  createdAt: string;
}

export interface StorageUsageRow {
  id: string;
  ownerUid: string;
  storyId?: string | null;
  assetType: MediaAssetType;
  status: MediaAssetStatus;
  byteSize: string;
  mimeType: string;
  objectKey: string;
  createdAt: string;
}
