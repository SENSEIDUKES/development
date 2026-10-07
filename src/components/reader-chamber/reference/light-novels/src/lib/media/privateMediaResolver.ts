/**
 * WORKSHOP SEAM — not production code.
 *
 * Production's `src/lib/media/privateMediaResolver.ts` (Light-Novels main @
 * 647165a) refreshes signed R2 delivery URLs from the media service and keeps
 * private media in an IndexedDB blob cache. Workshop media is never private,
 * so this stand-in returns each descriptor's own delivery URL directly — the
 * same result production gives for public media.
 */
import type { MediaAssetDescriptor } from '../../contracts/mediaAssets';

export interface ResolvedPrivateMedia {
  assetId: string;
  descriptor: MediaAssetDescriptor;
  url: string;
  source: 'indexeddb' | 'network' | 'public' | 'direct';
}

export async function resolveMediaAssetForDisplay(
  descriptor: MediaAssetDescriptor,
  _expectedOwnerUid?: string,
): Promise<ResolvedPrivateMedia> {
  if (!descriptor.deliveryUrl?.trim()) {
    throw new Error(`Media asset ${descriptor.id} has no delivery URL in the Workshop preview.`);
  }
  return { assetId: descriptor.id, descriptor, url: descriptor.deliveryUrl, source: 'public' };
}

export async function discardCachedMedia(_assetId: string): Promise<void> {
  // Nothing is cached in the Workshop preview.
}

export function resetPrivateMediaResolver(): void {
  // Nothing is cached in the Workshop preview.
}
