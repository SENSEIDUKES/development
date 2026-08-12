import type { BaseCodexEntry } from './types';

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

export function stripLegacyCodexContextFields(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !LEGACY_CODEX_CONTEXT_FIELDS.has(key)),
  );
}

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

export const normalizeCodexSurface = (value: unknown): string =>
  typeof value === 'string'
    ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
    : '';

export const normalizeCodexAliases = (
  value: unknown,
  canonicalName?: string,
): string[] => {
  if (!Array.isArray(value)) return [];

  const canonicalKey = normalizeCodexSurface(canonicalName);
  const seen = new Set<string>();

  return value
    .filter((alias): alias is string => typeof alias === 'string')
    .map((alias) => alias.normalize('NFKC').trim().replace(/\s+/g, ' '))
    .filter((alias) => {
      const key = normalizeCodexSurface(alias);
      if (!key || key === canonicalKey || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const parseCodexAliases = (value: string, canonicalName?: string): string[] =>
  normalizeCodexAliases(value.split(/[\n,;]+/), canonicalName);

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
    const conflictingEntry = entries.find((entry) => {
      if (entry.id && entryId && entry.id === entryId) return false;
      const surfaces = [entry.name, ...normalizeCodexAliases(entry.aliases, entry.name)];
      return surfaces.some((surface) => normalizeCodexSurface(surface) === aliasKey);
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
