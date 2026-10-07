/**
 * Canonical media-asset identity.
 *
 * PostgreSQL returns a UUID column either hyphenated or as compact hex
 * depending on the read path, and the profile hydrator re-hyphenates
 * `activePortraitAssetId` while a media descriptor carries the id exactly as
 * the media row stored it. Comparing those two forms with `===` silently
 * decided that a portrait the account really owns did not belong to it, so the
 * hydrated avatar was dropped. Every comparison between an asset reference and
 * a descriptor id must go through these helpers.
 */

const COMPACT_UUID = /^[0-9a-f]{32}$/i;

/** Hyphenate compact UUID hex; return anything else untouched. */
export function canonicalAssetId(value: string): string {
  const compact = value.trim().replace(/-/g, '');
  if (!COMPACT_UUID.test(compact)) return value.trim();
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join('-').toLowerCase();
}

/** True when two asset references identify the same row in either UUID form. */
export function isSameAssetId(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return false;
  return canonicalAssetId(left).toLowerCase() === canonicalAssetId(right).toLowerCase();
}
