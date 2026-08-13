export type LivingStoryRecord = Record<string, unknown>;

export interface LivingStoryEntityLabel {
  name: string;
  descriptiveInformation?: string;
  originalLabel?: string;
}

export interface LivingStoryIdentityWarning {
  code: "ambiguous-entity-match";
  entityKind: string;
  canonicalName: string;
  message: string;
}

export interface ReconcileLivingStoryRecordsInput {
  entityKind: string;
  current: LivingStoryRecord[];
  updates: LivingStoryRecord[];
  chapterNumber: number;
  createdBy?: string;
}

export interface ReconcileLivingStoryRecordsResult {
  records: LivingStoryRecord[];
  appliedUpdates: LivingStoryRecord[];
  warnings: LivingStoryIdentityWarning[];
}

const IDENTITY_ID_FIELDS = ["id", "persistenceId"] as const;
const IDENTITY_NAME_FIELDS = ["name", "title", "label", "slug"] as const;
const ALIAS_FIELDS = ["aliases", "alternateNames"] as const;
const MODEL_TECHNICAL_FIELDS = [
  "id",
  "persistenceId",
  "chapterNumber",
  "originChapter",
  "firstAppeared",
  "lastMajorInvolvement",
  "createdAt",
  "updatedAt",
  "runId",
  "attemptId",
  "provenance",
] as const;

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

/**
 * Separates Blueprint-style labels such as `Yan Shi (Protagonist)` or
 * `Yan Shi — protagonist of the lower sect` without losing the description.
 */
export const splitDescriptiveLivingStoryEntityLabel = (
  value: string,
): LivingStoryEntityLabel => {
  const original = value.trim();
  const parenthetical = original.match(/^(.+?)\s*\(([^()]+)\)\s*$/u);
  const dash = parenthetical ? undefined : original.match(/^(.+?)\s+[—–]\s+(.+)$/u);
  const name = (parenthetical?.[1] ?? dash?.[1] ?? original).trim();
  const descriptiveInformation = (parenthetical?.[2] ?? dash?.[2])?.trim();
  return {
    name,
    ...(descriptiveInformation ? { descriptiveInformation } : {}),
    ...(name !== original ? { originalLabel: original } : {}),
  };
};

/** Conservative location-only support for `Name, a descriptive clause`. */
export const splitDescriptiveLivingStoryLocationLabel = (
  value: string,
): LivingStoryEntityLabel => {
  const parsed = splitDescriptiveLivingStoryEntityLabel(value);
  if (parsed.descriptiveInformation) return parsed;
  const original = value.trim();
  const descriptiveComma = original.match(
    /^(.+?),\s*((?:a|an|the|where|which|home|seat)\b.+)$/iu,
  );
  if (!descriptiveComma) return parsed;
  return {
    name: descriptiveComma[1].trim(),
    descriptiveInformation: descriptiveComma[2].trim(),
    originalLabel: original,
  };
};

const stableHash = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

/** Provider-independent ID for entities that have no canonical persisted ID. */
export const stableLivingStoryEntityId = (
  entityKind: string,
  canonicalName: string,
  discriminator?: string,
): string => {
  const kind = canonicalLivingStoryEntityKey(entityKind).replace(/\s+/g, "-") || "entity";
  const slug = canonicalLivingStoryEntityKey(canonicalName).replace(/\s+/g, "-") || "unnamed";
  return `dev-${kind}-${slug}${discriminator ? `-${stableHash(discriminator)}` : ""}`;
};

/** Converts a prose Blueprint label into a canonical record plus retained detail. */
export const livingStoryRecordFromDescriptiveLabel = (
  value: string,
  source: string,
  options: { location?: boolean } = {},
): LivingStoryRecord => {
  const parsed = options.location
    ? splitDescriptiveLivingStoryLocationLabel(value)
    : splitDescriptiveLivingStoryEntityLabel(value);
  return {
    name: parsed.name,
    ...(parsed.originalLabel ? { aliases: [parsed.originalLabel] } : {}),
    ...(parsed.descriptiveInformation
      ? { blueprintDescription: parsed.descriptiveInformation }
      : {}),
    source,
  };
};

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

const recordName = (value: LivingStoryRecord): string | undefined => {
  for (const field of IDENTITY_NAME_FIELDS) {
    const candidate = value[field];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return undefined;
};

const withoutModelTechnicalFields = (value: LivingStoryRecord): LivingStoryRecord => {
  const copied = structuredClone(value);
  for (const field of MODEL_TECHNICAL_FIELDS) delete copied[field];
  return copied;
};

const normalizeModelRecord = (
  value: LivingStoryRecord,
  entityKind: string,
): LivingStoryRecord => {
  const rawName = recordName(value);
  if (!rawName) throw new Error("Process Result returned an entity update without a usable name.");
  const parsed = entityKind === "location"
    ? splitDescriptiveLivingStoryLocationLabel(rawName)
    : splitDescriptiveLivingStoryEntityLabel(rawName);
  const normalized = withoutModelTechnicalFields(value);
  const aliases = mergeStringList(
    normalized.aliases,
    parsed.originalLabel ? [parsed.originalLabel] : undefined,
  );
  return {
    ...normalized,
    name: parsed.name,
    ...(aliases ? { aliases } : {}),
    ...(parsed.descriptiveInformation && normalized.blueprintDescription === undefined
      ? { blueprintDescription: parsed.descriptiveInformation }
      : {}),
  };
};

const deterministicRecordDiscriminator = (value: LivingStoryRecord): string => JSON.stringify(
  Object.keys(value)
    .sort()
    .map(key => [key, value[key]]),
);

const assignUniqueStableId = (
  value: LivingStoryRecord,
  entityKind: string,
  usedIds: Set<string>,
): LivingStoryRecord => {
  const copied = structuredClone(value);
  const existing = IDENTITY_ID_FIELDS
    .map(field => copied[field])
    .find(candidate => typeof candidate === "string" && candidate.trim()) as string | undefined;
  const name = recordName(copied);
  if (!name) throw new Error(`A ${entityKind} record is missing a usable canonical name.`);
  let id = existing?.trim() || stableLivingStoryEntityId(entityKind, name);
  if (usedIds.has(canonicalLivingStoryEntityKey(id))) {
    id = stableLivingStoryEntityId(entityKind, name, deterministicRecordDiscriminator(copied));
  }
  let uniqueId = id;
  let suffix = 2;
  while (usedIds.has(canonicalLivingStoryEntityKey(uniqueId))) {
    uniqueId = `${id}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(canonicalLivingStoryEntityKey(uniqueId));
  if (!existing || uniqueId !== existing) copied.id = uniqueId;
  return copied;
};

/** Assigns missing IDs while preserving explicitly distinct, same-named records. */
export const ensureStableLivingStoryEntityIds = (
  entityKind: string,
  records: LivingStoryRecord[],
): LivingStoryRecord[] => {
  const usedIds = new Set<string>();
  return records.map(record => assignUniqueStableId(record, entityKind, usedIds));
};

const nameMatches = (left: LivingStoryRecord, right: LivingStoryRecord): boolean => {
  const leftNames = new Set(livingStoryEntityNameKeys(left));
  if (leftNames.size > 0 && livingStoryEntityNameKeys(right).some(key => leftNames.has(key))) return true;
  const leftName = recordName(left);
  const rightName = recordName(right);
  if (!leftName || !rightName) return false;
  if (!rightName.toLocaleLowerCase().startsWith(leftName.toLocaleLowerCase())) return false;
  const remainder = rightName.slice(leftName.length).trimStart();
  if (!remainder || !["(", "—", "–", ",", ":"].includes(remainder[0])) return false;
  return remainder.slice(1).trimStart().length > 0;
};

const recordIndexesMatchingIds = (
  records: LivingStoryRecord[],
  candidate: LivingStoryRecord,
): number[] => {
  const candidateIds = new Set(livingStoryEntityIdKeys(candidate));
  if (candidateIds.size === 0) return [];
  return records.flatMap((record, index) => (
    livingStoryEntityIdKeys(record).some(key => candidateIds.has(key)) ? [index] : []
  ));
};

/**
 * Applies model-proposed entity content through code-owned IDs and provenance.
 * A name-only update matching more than one stable entity is preserved as a
 * separate candidate and reported instead of being guessed onto one entity.
 */
export const reconcileLivingStoryRecords = (
  input: ReconcileLivingStoryRecordsInput,
): ReconcileLivingStoryRecordsResult => {
  const warnings: LivingStoryIdentityWarning[] = [];
  const appliedUpdates: LivingStoryRecord[] = [];
  let records = ensureStableLivingStoryEntityIds(input.entityKind, input.current);
  const usedIds = new Set(
    records.flatMap(livingStoryEntityIdKeys).map(key => key.replace(/^id:/, "")),
  );

  for (const rawUpdate of input.updates) {
    const update = normalizeModelRecord(rawUpdate, input.entityKind);
    const idMatchIndexes = recordIndexesMatchingIds(records, rawUpdate);
    const nameMatchIndexes = records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => nameMatches(record, update))
      .map(({ index }) => index);
    if (idMatchIndexes.length > 1) {
      throw new Error(`Process Result ${input.entityKind} update matched multiple canonical IDs.`);
    }
    if (idMatchIndexes.length === 1 && nameMatchIndexes.some(index => index !== idMatchIndexes[0])) {
      throw new Error(`Process Result ${input.entityKind} update contradicts deterministic current identity.`);
    }
    const matches = idMatchIndexes.length === 1 ? idMatchIndexes : nameMatchIndexes;
    if (matches.length === 1) {
      const index = matches[0];
      const currentName = recordName(records[index]);
      const updateName = recordName(update);
      const updateWithAlias = currentName && updateName
        && canonicalLivingStoryEntityKey(currentName) !== canonicalLivingStoryEntityKey(updateName)
        ? {
            ...update,
            name: currentName,
            aliases: mergeStringList(update.aliases, [updateName]),
          }
        : update;
      records[index] = {
        ...mergeRecord(records[index], updateWithAlias, true),
        lastMajorInvolvement: input.chapterNumber,
      };
      appliedUpdates.push(structuredClone(records[index]));
      continue;
    }

    const canonicalName = recordName(update)!;
    const candidate = assignUniqueStableId({
      ...update,
      firstAppeared: input.chapterNumber,
      lastMajorInvolvement: input.chapterNumber,
      provenance: {
        sourceChapterNumber: input.chapterNumber,
        createdBy: input.createdBy ?? "process-result",
      },
    }, input.entityKind, usedIds);
    records.push(candidate);
    appliedUpdates.push(structuredClone(candidate));
    if (matches.length > 1) {
      warnings.push({
        code: "ambiguous-entity-match",
        entityKind: input.entityKind,
        canonicalName,
        message: `Preserved '${canonicalName.slice(0, 120)}' as a separate ${input.entityKind} because its update matched ${matches.length} existing entities.`,
      });
    }
  }

  return { records, appliedUpdates, warnings };
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
