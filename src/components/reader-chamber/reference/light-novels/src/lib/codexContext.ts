import type { BaseCodexEntry } from '../types';

export interface NamedCodexEntry extends BaseCodexEntry {
  id?: string;
  name?: string;
}

export interface AliasCollision {
  alias: string;
  conflictingEntryId?: string;
  conflictingEntryName: string;
}

const LEGACY_CODEX_CONTEXT_FIELDS = new Set([
  'pinned',
  'isUserPinned',
  'priority',
  'contextNote',
]);

const AUTHOR_CONTROLLED_CODEX_FIELDS = new Set([
  'aliases',
  'contextPriority',
  'authorContextNote',
  'provenance',
  ...LEGACY_CODEX_CONTEXT_FIELDS,
]);

/** Remove abandoned root-level context fields while preserving approved metadata. */
export function stripLegacyCodexContextFields(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !LEGACY_CODEX_CONTEXT_FIELDS.has(key)),
  );
}

/**
 * Remove every user-authoritative Codex field from provider output. Nested
 * ability payloads are sanitized as well so generation cannot bypass the entry
 * boundary through an embedded object.
 */
export function stripAuthorControlledCodexFields(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const stripped = Object.fromEntries(
    Object.entries(value).filter(([key]) => !AUTHOR_CONTROLLED_CODEX_FIELDS.has(key)),
  );

  for (const nestedField of ['abilities', 'newAbilities']) {
    if (Array.isArray(stripped[nestedField])) {
      stripped[nestedField] = stripped[nestedField].map((item: unknown) => (
        item && typeof item === 'object'
          ? stripAuthorControlledCodexFields(item as Record<string, unknown>)
          : item
      ));
    }
  }

  return stripped;
}

/**
 * Canonical comparison key for user-authored Codex identity fields.
 * NFKC keeps visually equivalent Unicode forms deterministic while preserving
 * the user's original casing in persisted values.
 */
export const normalizeCodexSurface = (value: unknown): string =>
  typeof value === 'string'
    ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
    : '';

/** Trim and case-insensitively deduplicate aliases, excluding the canonical name. */
export const normalizeCodexAliases = (
  value: unknown,
  canonicalName?: string,
): string[] => {
  if (!Array.isArray(value)) return [];

  const canonicalKey = normalizeCodexSurface(canonicalName);
  const seen = new Set<string>();

  return value
    .filter((alias): alias is string => typeof alias === 'string')
    .map(alias => alias.normalize('NFKC').trim().replace(/\s+/g, ' '))
    .filter(alias => {
      const key = normalizeCodexSurface(alias);
      if (!key || key === canonicalKey || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/** Parse a compact intake/editor value without asking a model to infer aliases. */
export const parseCodexAliases = (value: string, canonicalName?: string): string[] =>
  normalizeCodexAliases(value.split(/[\n,;]+/), canonicalName);

/**
 * Detect aliases that already identify another entry in the same Codex kind.
 * Callers decide the kind boundary (characters, factions, locations, etc.).
 */
export const findCodexAliasCollisions = (
  entryId: string | undefined,
  canonicalName: string | undefined,
  aliases: unknown,
  entries: NamedCodexEntry[],
): AliasCollision[] => {
  const normalizedAliases = normalizeCodexAliases(aliases, canonicalName);
  const collisions: AliasCollision[] = [];

  for (const alias of normalizedAliases) {
    const aliasKey = normalizeCodexSurface(alias);
    const conflictingEntry = entries.find(entry => {
      if (entry.id && entryId && entry.id === entryId) return false;

      const surfaces = [entry.name, ...normalizeCodexAliases(entry.aliases, entry.name)];
      return surfaces.some(surface => normalizeCodexSurface(surface) === aliasKey);
    });

    if (conflictingEntry) {
      collisions.push({
        alias,
        conflictingEntryId: conflictingEntry.id,
        conflictingEntryName: conflictingEntry.name || 'another Codex entry',
      });
    }
  }

  return collisions;
};
