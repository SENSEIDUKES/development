import type { GeneratedImage } from '../types';

interface HistoryBearingEntity {
  id: string;
  imageHistory?: GeneratedImage[];
}

/**
 * Collect every manifestation recorded for one Codex entity.
 *
 * The entity's own `imageHistory` is the durable record: PostgreSQL rebuilds it
 * from the media attachments bound to that entity. The story-level
 * `imageHistory` is rebuilt from `targetKind: 'STORY'` attachments alone, so it
 * only ever returns covers from the cloud — filtering it by `entityId` yielded
 * an empty gallery for every portrait as soon as Harmony replaced the local
 * replica with the cloud shape. Codex callers therefore never consult the
 * story record for a portrait; each manifestation is written to its owner.
 *
 * Entries are keyed by canonical asset id where one exists; a delivery URL is
 * transient and the same asset can carry different ones across two reads.
 */
export function resolveEntityImageHistory(
  entity: HistoryBearingEntity,
): GeneratedImage[] {
  const merged: GeneratedImage[] = [];
  const seen = new Set<string>();

  const add = (image: GeneratedImage) => {
    const key = image.assetId || image.id || image.imageUrl;
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(image);
  };

  entity.imageHistory?.forEach(add);

  return merged;
}
