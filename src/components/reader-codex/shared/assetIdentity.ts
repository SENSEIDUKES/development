/** Canonicalize UUID asset references before comparing persisted media ids. */
const COMPACT_UUID = /^[0-9a-f]{32}$/i;

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

export function isSameAssetId(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return false;
  return canonicalAssetId(left).toLowerCase() === canonicalAssetId(right).toLowerCase();
}
