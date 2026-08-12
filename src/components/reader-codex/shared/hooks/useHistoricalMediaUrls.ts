import { useMemo } from 'react';
import { canonicalAssetId } from '../assetIdentity';

export interface HistoricalMediaReference {
  assetId?: string;
  imageUrl?: string;
}

/**
 * DEV has no private-media signing service. Preserve already-hydrated URLs
 * and canonical-id lookup while intentionally making no network request.
 */
export function useHistoricalMediaUrls(
  references: readonly HistoricalMediaReference[],
  _expectedOwnerUid?: string,
): Readonly<Record<string, string>> {
  return useMemo(() => Object.fromEntries(
    references.flatMap((reference) => {
      const assetId = reference.assetId?.trim();
      const imageUrl = reference.imageUrl?.trim();
      return assetId && imageUrl ? [[canonicalAssetId(assetId), imageUrl]] : [];
    }),
  ), [references]);
}
