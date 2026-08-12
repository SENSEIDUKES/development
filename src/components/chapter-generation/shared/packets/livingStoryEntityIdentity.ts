export type LivingStoryRecord = Record<string, unknown>;

const IDENTITY_ID_FIELDS = ["id", "persistenceId"] as const;
const IDENTITY_NAME_FIELDS = ["name", "title", "label", "slug"] as const;
const ALIAS_FIELDS = ["aliases", "alternateNames"] as const;

const isRecord = (value: unknown): value is LivingStoryRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Conservative identity normalization for casing, spacing, and punctuation variants. */
export const canonicalLivingStoryEntityKey = (value: string): string => value
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[’']/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .replace(/\s+/g, " ");

const stringValues = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.filter((candidate): candidate is string => typeof candidate === "string")
    : []
);

const livingStoryEntityIdKeys = (value: LivingStoryRecord): string[] => {
  const keys = new Set<string>();
  for (const field of IDENTITY_ID_FIELDS) {
    const candidate = value[field];
    if (typeof candidate !== "string") continue;
    const key = canonicalLivingStoryEntityKey(candidate);
    if (key) keys.add(`id:${key}`);
  }
  return [...keys];
};

const livingStoryEntityNameKeys = (value: LivingStoryRecord): string[] => {
  const keys = new Set<string>();
  for (const field of IDENTITY_NAME_FIELDS) {
    const candidate = value[field];
    if (typeof candidate !== "string") continue;
    const key = canonicalLivingStoryEntityKey(candidate);
    if (key) keys.add(`name:${key}`);
  }
  for (const field of ALIAS_FIELDS) {
    for (const alias of stringValues(value[field])) {
      const key = canonicalLivingStoryEntityKey(alias);
      if (key) keys.add(`name:${key}`);
    }
  }
  return [...keys];
};

export const livingStoryEntityKeys = (value: LivingStoryRecord): string[] => [
  ...livingStoryEntityIdKeys(value),
  ...livingStoryEntityNameKeys(value),
];

const recordsMatch = (left: LivingStoryRecord, right: LivingStoryRecord): boolean => {
  const leftIds = new Set(livingStoryEntityIdKeys(left));
  const rightIds = livingStoryEntityIdKeys(right);
  if (leftIds.size > 0 && rightIds.length > 0) {
    return rightIds.some(key => leftIds.has(key));
  }
  const leftNames = new Set(livingStoryEntityNameKeys(left));
  return leftNames.size > 0 && livingStoryEntityNameKeys(right).some(key => leftNames.has(key));
};

const mergeStringList = (left: unknown, right: unknown): string[] | undefined => {
  const merged = new Map<string, string>();
  for (const value of [...stringValues(left), ...stringValues(right)]) {
    const key = canonicalLivingStoryEntityKey(value);
    if (key && !merged.has(key)) merged.set(key, value.trim());
  }
  return merged.size > 0 ? [...merged.values()] : undefined;
};

const mergeRecord = (
  current: LivingStoryRecord,
  update: LivingStoryRecord,
  preserveCanonicalName: boolean,
): LivingStoryRecord => {
  const merged: LivingStoryRecord = {
    ...structuredClone(current),
    ...structuredClone(update),
  };
  for (const field of IDENTITY_ID_FIELDS) {
    if (typeof current[field] === "string" && current[field].trim()) {
      merged[field] = current[field];
    }
  }
  if (preserveCanonicalName && typeof current.name === "string" && current.name.trim()) {
    merged.name = current.name;
  }
  for (const field of ALIAS_FIELDS) {
    const aliases = mergeStringList(current[field], update[field]);
    if (aliases) merged[field] = aliases;
  }
  return merged;
};

/**
 * Merges canonical records without duplicating explicit aliases or harmless
 * casing/punctuation variants. Existing IDs and canonical names stay stable.
 */
export const mergeLivingStoryRecords = (
  current: LivingStoryRecord[],
  updates: LivingStoryRecord[],
): LivingStoryRecord[] => {
  const merged: LivingStoryRecord[] = [];
  for (const value of [...current, ...updates]) {
    const copied = structuredClone(value);
    const index = merged.findIndex(entry => recordsMatch(entry, copied));
    if (index >= 0) {
      merged[index] = mergeRecord(merged[index], copied, true);
      continue;
    }
    if (!merged.some(entry => JSON.stringify(entry) === JSON.stringify(copied))) merged.push(copied);
  }
  return merged;
};

/** Same identity rules for mixed ability ledgers, while allowing latest labels. */
export const mergeLivingStoryValues = (current: unknown[], updates: unknown[]): unknown[] => {
  const merged: unknown[] = [];
  const primitiveKeys = new Set<string>();

  for (const value of [...current, ...updates]) {
    if (isRecord(value)) {
      const copied = structuredClone(value);
      const index = merged.findIndex(entry => isRecord(entry) && recordsMatch(entry, copied));
      if (index >= 0) {
        merged[index] = mergeRecord(merged[index] as LivingStoryRecord, copied, false);
        continue;
      }
      if (!merged.some(entry => isRecord(entry) && JSON.stringify(entry) === JSON.stringify(copied))) {
        merged.push(copied);
      }
      continue;
    }

    const primitiveKey = typeof value === "string"
      ? `string:${canonicalLivingStoryEntityKey(value)}`
      : `json:${JSON.stringify(value)}`;
    if (primitiveKeys.has(primitiveKey)) continue;
    primitiveKeys.add(primitiveKey);
    merged.push(structuredClone(value));
  }

  return merged;
};
