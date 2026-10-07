/**
 * WORKSHOP SEAM — not production code.
 *
 * Production's `src/lib/media/mediaAssetClient.ts` (Light-Novels main @
 * 647165a) uploads generated images and voice cards to the authenticated
 * `/api/foundation/media-assets` service, which stores them in Cloudflare R2
 * and records them in PostgreSQL. The constants, error type and identity
 * check below are production's own; the four network calls are replaced by
 * an in-memory record, so a Workshop "manifestation" shows on screen and is
 * forgotten when the preview reloads.
 */
import { generateUUID } from '../id';
import type {
  MediaAssetDescriptor,
  MediaAssetType,
  MediaAssociation,
  MediaVisibility,
} from '../../contracts/mediaAssets';
import { canonicalAssetId } from '../../contracts/assetIdentity';

export const MEDIA_TARGET_KIND = {
  STORY: 'STORY',
  CHAPTER: 'CHAPTER',
  CHARACTER: 'CHARACTER',
  BEAST: 'BEAST',
  LOCATION: 'LOCATION',
  ARTIFACT: 'ARTIFACT',
  FACTION: 'FACTION',
  PORTRAIT: 'PORTRAIT',
} as const;

export const MEDIA_PURPOSE = {
  STORY_COVER: 'STORY_COVER',
  MANIFESTATION: 'MANIFESTATION',
  CHAPTER_HERO: 'CHAPTER_HERO',
  CELESTIAL_PORTRAIT: 'CELESTIAL_PORTRAIT',
  VOICE_CARD: 'VOICE_CARD',
} as const;

export interface SaveBrowserMediaInput {
  source: string | Blob;
  assetType: MediaAssetType;
  purpose: string;
  association: Omit<MediaAssociation, 'purpose'>;
  visibility?: MediaVisibility;
  filename?: string;
  expectedMimeType?: string;
  generationJobId?: string | null;
  replacesAssetId?: string | null;
  idempotencyKey?: string;
  expectedOwnerUid?: string;
}

export class MediaAssetClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly recoverable: boolean;
  readonly assetId?: string;

  constructor(
    message: string,
    options: { code?: string; status?: number; recoverable?: boolean; assetId?: string } = {},
  ) {
    super(message);
    this.name = 'MediaAssetClientError';
    this.code = options.code ?? 'media_request_failed';
    this.status = options.status ?? 0;
    this.recoverable = options.recoverable ?? (this.status >= 500 || this.status === 0);
    this.assetId = options.assetId;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Production's identity check, unchanged. */
export function requirePersistenceUuid(value: string | undefined, label: string): string {
  const normalized = value?.trim() ?? '';
  const canonical = canonicalAssetId(normalized);
  if (UUID_PATTERN.test(canonical)) return canonical;
  const prefixed = normalized.match(/^(?:story|seed)-([0-9a-f-]{36})$/i)?.[1];
  if (prefixed) {
    const canonicalPrefixed = canonicalAssetId(prefixed);
    if (UUID_PATTERN.test(canonicalPrefixed)) return canonicalPrefixed;
  }
  throw new MediaAssetClientError(
    `${label} has not synchronized with PostgreSQL yet. Retry after synchronization completes.`,
    { code: 'persistence_identity_missing', status: 409, recoverable: true },
  );
}

const assets = new Map<string, MediaAssetDescriptor>();

function describe(id: string, input: SaveBrowserMediaInput, deliveryUrl: string): MediaAssetDescriptor {
  const now = new Date().toISOString();
  return {
    id,
    assetType: input.assetType,
    purpose: input.purpose,
    visibility: input.visibility ?? 'PRIVATE',
    status: 'READY',
    mimeType: input.source instanceof Blob
      ? input.source.type || 'application/octet-stream'
      : input.expectedMimeType ?? 'image/png',
    byteSize: input.source instanceof Blob ? String(input.source.size) : '0',
    checksumSha256: '',
    version: 1,
    deliveryUrl,
    deliveryUrlExpiresAt: null,
    createdAt: now,
    readyAt: now,
  };
}

export async function saveMediaAsset(input: SaveBrowserMediaInput): Promise<MediaAssetDescriptor> {
  const id = generateUUID();
  const deliveryUrl = input.source instanceof Blob ? URL.createObjectURL(input.source) : input.source;
  const descriptor = describe(id, input, deliveryUrl);
  assets.set(id, descriptor);
  return descriptor;
}

export async function getMediaAsset(
  assetId: string,
  _expectedOwnerUid?: string,
): Promise<MediaAssetDescriptor> {
  const descriptor = assets.get(canonicalAssetId(assetId));
  if (!descriptor) {
    throw new MediaAssetClientError('This media was never saved in the Workshop preview.', {
      code: 'media_not_found',
      status: 404,
      recoverable: false,
      assetId,
    });
  }
  return descriptor;
}

export async function selectMediaAsset(
  assetId: string,
  _association: MediaAssociation,
  _expectedOwnerUid?: string,
): Promise<MediaAssetDescriptor> {
  return getMediaAsset(assetId);
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  assets.delete(canonicalAssetId(assetId));
}
