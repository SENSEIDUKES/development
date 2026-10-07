import { useEffect, useMemo, useState } from "react";
import { canonicalAssetId } from "../contracts/assetIdentity";
import { getMediaAsset } from "../lib/media/mediaAssetClient";
import { resolveMediaAssetForDisplay } from "../lib/media/privateMediaResolver";

export interface HistoricalMediaReference {
  assetId?: string;
  imageUrl?: string;
}

interface ResolutionState {
  ownerKey: string;
  urls: Record<string, string>;
}

/**
 * Resolve only historical images that are actually mounted by the UI.
 *
 * Full-story hydration resolves current slots; eagerly downloading every old
 * manifestation made Library reads scale with the entire image history. This
 * hook keeps that history canonical-id based and fills its disposable URLs
 * only when a history surface is rendered.
 */
export function useHistoricalMediaUrls(
  references: readonly HistoricalMediaReference[],
  expectedOwnerUid?: string,
): Readonly<Record<string, string>> {
  const ownerKey = expectedOwnerUid ?? "";
  const unresolvedKey = useMemo(() => JSON.stringify(
    [...new Set(
      references
        .filter((reference) => !reference.imageUrl?.trim())
        .map((reference) => reference.assetId?.trim())
        .filter((assetId): assetId is string => Boolean(assetId))
        .map(canonicalAssetId),
    )].sort(),
  ), [references]);
  const [resolution, setResolution] = useState<ResolutionState>({
    ownerKey,
    urls: {},
  });

  useEffect(() => {
    const assetIds = JSON.parse(unresolvedKey) as string[];
    let cancelled = false;
    setResolution((current) => ({
      ownerKey,
      urls: current.ownerKey === ownerKey
        ? Object.fromEntries(
          assetIds.flatMap((assetId) =>
            current.urls[assetId] ? [[assetId, current.urls[assetId]]] : [],
          ),
        )
        : {},
    }));
    if (assetIds.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    void Promise.all(assetIds.map(async (assetId) => {
      try {
        const descriptor = await getMediaAsset(assetId, expectedOwnerUid);
        const resolved = await resolveMediaAssetForDisplay(
          descriptor,
          expectedOwnerUid,
        );
        return [assetId, resolved.url] as const;
      } catch (error) {
        console.warn(`Historical media ${assetId} could not be resolved.`, error);
        return null;
      }
    })).then((entries) => {
      if (cancelled) return;
      setResolution((current) => {
        if (current.ownerKey !== ownerKey) return current;
        const urls = { ...current.urls };
        for (const entry of entries) {
          if (entry) urls[entry[0]] = entry[1];
        }
        return { ownerKey, urls };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [expectedOwnerUid, ownerKey, unresolvedKey]);

  return resolution.ownerKey === ownerKey ? resolution.urls : {};
}
