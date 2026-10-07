import { canonicalAssetId } from "../../contracts/assetIdentity";
import type { MediaAssetDescriptor } from "../../contracts/mediaAssets";
import type { StoryWorld } from "../../types";

/**
 * Retain the immutable metadata required to address an owner-scoped cached
 * blob after an offline reload. Delivery URLs are deliberately blanked: they
 * are page-local projections and never durable story identity.
 */
export function retainLocalMediaDescriptor(
  current: StoryWorld["mediaDescriptors"],
  descriptor: MediaAssetDescriptor,
): NonNullable<StoryWorld["mediaDescriptors"]> {
  const id = canonicalAssetId(descriptor.id);
  return {
    ...(current ?? {}),
    [id]: {
      ...descriptor,
      id,
      deliveryUrl: "",
    },
  };
}
