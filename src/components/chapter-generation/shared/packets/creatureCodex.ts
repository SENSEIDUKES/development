import {
  canonicalLivingStoryEntityKey,
  reconcileLivingStoryRecords,
  type LivingStoryIdentityWarning,
  type LivingStoryRecord,
} from "./livingStoryEntityIdentity";

export type PortraitKind = "human" | "non-human";

export interface CreatureCodexNormalizationInput {
  currentCharacters: LivingStoryRecord[];
  currentBestiary: LivingStoryRecord[];
  characterUpdates: LivingStoryRecord[];
  bestiaryUpdates: LivingStoryRecord[];
  chapterNumber: number;
}

export interface CreatureCodexNormalizationResult {
  characters: LivingStoryRecord[];
  bestiary: LivingStoryRecord[];
  characterUpdates: LivingStoryRecord[];
  bestiaryUpdates: LivingStoryRecord[];
  identityWarnings: LivingStoryIdentityWarning[];
}

type RecordSource = "current" | "model";

const MODEL_OWNED_FIELDS = new Set([
  "id",
  "persistenceId",
  "imageUrl",
  "imageAssetId",
  "imageHistory",
  "assetId",
  "assetKey",
  "storageKey",
  "soundAssetId",
  "soundUrl",
  "voiceAssetId",
  "voiceClipUrl",
  "voiceClip",
  "voiceKey",
  "voicePresetId",
  "voiceId",
  "voice_id",
  "providerVoiceId",
  "provider_voice_id",
  "providerId",
  "speciesId",
  "notableIndividualIds",
  "firstEncounteredChapter",
  "appearanceChapters",
  "firstAppeared",
  "lastMajorInvolvement",
  "createdAt",
  "updatedAt",
  "runId",
  "attemptId",
  "provenance",
]);

const PROVIDER_VOICE_FIELD_KEYS = new Set([
  "voicekey",
  "voicepresetid",
  "voiceid",
  "providervoiceid",
  "voiceproviderid",
  "providerid",
  "providerapikey",
  "providertoken",
  "providersecret",
  "providercredential",
  "providercredentials",
  "elevenlabsid",
  "elevenlabsvoiceid",
  "elevenlabsapikey",
  "apikey",
  "accesstoken",
  "secretkey",
]);

const compactProviderFieldKey = (field: string): string => field
  .replace(/[^A-Za-z0-9]/g, "")
  .toLocaleLowerCase();

export const isProviderVoiceField = (field: string): boolean => {
  const key = compactProviderFieldKey(field);
  return PROVIDER_VOICE_FIELD_KEYS.has(key)
    || key.startsWith("elevenlabs")
    || (
      (key.startsWith("provider") || key.startsWith("voiceprovider"))
      && /(?:id|key|token|secret|credential|credentials)$/u.test(key)
    );
};

export interface ScrubProviderVoiceFieldsOptions {
  /** The canonical Character root may retain its application-owned voiceKey. */
  preserveRootVoiceKey?: boolean;
}

/**
 * Recursively removes provider selectors regardless of casing or separators.
 * Canonical Character data may retain exactly one root `voiceKey`; nested
 * voice/provider fields and every Bestiary/model-supplied voice key are gone.
 */
export const scrubProviderVoiceFields = (
  record: LivingStoryRecord,
  options: ScrubProviderVoiceFieldsOptions = {},
): LivingStoryRecord => {
  const scrub = (value: unknown, depth: number): unknown => {
    if (Array.isArray(value)) return value.map(item => scrub(item, depth + 1));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value as LivingStoryRecord).flatMap(([field, nested]) => {
        const preserveVoiceKey = depth === 0
          && options.preserveRootVoiceKey === true
          && field === "voiceKey";
        if (!preserveVoiceKey && isProviderVoiceField(field)) return [];
        return [[field, scrub(nested, depth + 1)]];
      }),
    );
  };
  return scrub(record, 0) as LivingStoryRecord;
};

const isRecord = (value: unknown): value is LivingStoryRecord => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const stringField = (record: LivingStoryRecord, ...fields: string[]): string | undefined => {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const stringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const values = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) continue;
    const trimmed = item.trim();
    const key = canonicalLivingStoryEntityKey(trimmed);
    if (key && !values.has(key)) values.set(key, trimmed);
  }
  return [...values.values()];
};

const chapterList = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((chapter): chapter is number => (
    typeof chapter === "number" && Number.isInteger(chapter) && chapter > 0
  )))].sort((left, right) => left - right);
};

const positiveChapter = (value: unknown): number | undefined => (
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined
);

const recordId = (record: LivingStoryRecord): string | undefined => stringField(record, "id", "persistenceId");

const omitModelOwnedFields = (record: LivingStoryRecord): LivingStoryRecord => {
  const sanitized = structuredClone(record);
  for (const field of MODEL_OWNED_FIELDS) delete sanitized[field];
  return sanitized;
};

const uniqueIds = (values: string[]): string[] => {
  const ids = new Map<string, string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = canonicalLivingStoryEntityKey(trimmed);
    if (key && !ids.has(key)) ids.set(key, trimmed);
  }
  return [...ids.values()];
};

const normalizePortraitRecord = (
  record: LivingStoryRecord,
  source: RecordSource,
): LivingStoryRecord => {
  const original = scrubProviderVoiceFields(
    source === "model" ? omitModelOwnedFields(record) : record,
    { preserveRootVoiceKey: source === "current" },
  );
  const legacyIsBeast = original.isBeast === true;
  const legacyProfile = isRecord(original.beastProfile) ? original.beastProfile : undefined;
  const existingCreatureProfile = isRecord(original.creatureProfile)
    ? original.creatureProfile
    : undefined;
  const rawPortraitKind = stringField(original, "portraitKind");
  const speciesName = stringField(original, "speciesName", "species");
  const existingSpeciesId = source === "current" ? stringField(original, "speciesId") : undefined;
  const legacyRoleIsBeast = stringField(original, "role")?.toLowerCase() === "beast";

  delete original.isBeast;
  delete original.beastProfile;
  delete original.species;
  delete original.speciesName;
  delete original.portraitKind;
  if (source === "model") delete original.speciesId;

  const portraitKind: PortraitKind = rawPortraitKind === "non-human"
    || legacyIsBeast
    || legacyRoleIsBeast
    || Boolean(speciesName || existingSpeciesId)
    ? "non-human"
    : "human";

  return {
    ...original,
    ...(legacyRoleIsBeast ? { role: "Companion" } : {}),
    portraitKind,
    ...(existingSpeciesId ? { speciesId: existingSpeciesId } : {}),
    ...(speciesName ? { speciesName } : {}),
    ...(existingCreatureProfile || legacyProfile
      ? { creatureProfile: existingCreatureProfile ?? legacyProfile }
      : {}),
  };
};

const normalizeBestiaryRecord = (
  record: LivingStoryRecord,
  source: RecordSource,
): LivingStoryRecord => {
  const original = scrubProviderVoiceFields(
    source === "model" ? omitModelOwnedFields(record) : record,
  );
  const traits = stringList(original.traits ?? original.knownTraits ?? original.abilities);
  const description = stringField(original, "description", "details", "summary");
  const classification = stringField(original, "classification", "kind", "type");
  const threatLevel = stringField(original, "threatLevel", "threatTier");
  const signatureSound = stringField(original, "signatureSound", "sound");

  delete original.knownTraits;
  delete original.abilities;
  delete original.kind;
  delete original.type;
  delete original.threatTier;
  delete original.sound;
  delete original.traits;
  delete original.description;
  delete original.details;
  delete original.summary;
  delete original.classification;
  delete original.threatLevel;
  delete original.signatureSound;
  // Species are informational Bestiary records. Voice identity belongs only
  // to a named Character that has a validated spoken-dialogue moment.
  delete original.voiceKey;
  delete original.voiceAssetId;
  delete original.voiceClipUrl;
  delete original.voiceClip;
  delete original.signatureQuote;

  return {
    ...original,
    ...(description ? { description } : {}),
    ...(classification ? { classification } : {}),
    ...(traits.length > 0 ? { traits } : {}),
    ...(threatLevel ? { threatLevel } : {}),
    ...(signatureSound ? { signatureSound } : {}),
  };
};

const normalizeCanonicalBestiaryRecord = (
  record: LivingStoryRecord,
  chapterNumber: number,
  encounteredThisChapter: boolean,
): LivingStoryRecord => {
  const normalized = normalizeBestiaryRecord(record, "current");
  const firstEncountered = positiveChapter(normalized.firstEncounteredChapter);
  const firstAppeared = positiveChapter(normalized.firstAppeared);
  const appearances = chapterList(normalized.appearanceChapters);
  const knownFirstEncounter = firstEncountered ?? firstAppeared ?? appearances[0];
  const firstEncounteredChapter = knownFirstEncounter ?? chapterNumber;
  const appearanceChapters = chapterList([
    ...appearances,
    ...(knownFirstEncounter ? [knownFirstEncounter] : []),
    ...(encounteredThisChapter ? [chapterNumber] : []),
  ]);

  return {
    ...normalized,
    description: stringField(normalized, "description") ?? "",
    classification: stringField(normalized, "classification") ?? "Unknown",
    traits: stringList(normalized.traits),
    threatLevel: stringField(normalized, "threatLevel") ?? "Unknown",
    firstEncounteredChapter,
    appearanceChapters,
    notableIndividualIds: uniqueIds(stringList(normalized.notableIndividualIds)),
  };
};

const speciesKeys = (record: LivingStoryRecord): string[] => {
  const keys = [
    stringField(record, "name", "title", "label"),
    ...stringList(record.aliases),
    ...stringList(record.alternateNames),
  ].flatMap(value => value ? [canonicalLivingStoryEntityKey(value)] : []);
  return keys.filter(Boolean);
};

const containsSpeciesName = (records: LivingStoryRecord[], speciesName: string): boolean => {
  const key = canonicalLivingStoryEntityKey(speciesName);
  return records.some(record => speciesKeys(record).includes(key));
};

/**
 * Converts Process Result creature records into application-owned Codex data.
 * The model supplies story-facing names and descriptions only; this boundary
 * owns stable IDs, chapter encounter history, media ownership, and links.
 */
export const normalizeCreatureCodexRecords = (
  input: CreatureCodexNormalizationInput,
): CreatureCodexNormalizationResult => {
  const currentBestiary = input.currentBestiary.map(record => normalizeBestiaryRecord(record, "current"));
  const characterUpdates = input.characterUpdates.map(record => normalizePortraitRecord(record, "model"));
  const bestiaryUpdates = input.bestiaryUpdates.map(record => normalizeBestiaryRecord(record, "model"));

  for (const character of characterUpdates) {
    const speciesName = stringField(character, "speciesName");
    if (!speciesName || containsSpeciesName([...currentBestiary, ...bestiaryUpdates], speciesName)) continue;
    bestiaryUpdates.push({ name: speciesName });
  }

  const bestiaryResult = reconcileLivingStoryRecords({
    entityKind: "creature",
    current: currentBestiary,
    updates: bestiaryUpdates,
    chapterNumber: input.chapterNumber,
  });
  const updatedBestiaryIds = new Set(
    bestiaryResult.appliedUpdates.map(recordId).filter((id): id is string => Boolean(id)),
  );
  let bestiary = bestiaryResult.records.map(record => normalizeCanonicalBestiaryRecord(
    record,
    input.chapterNumber,
    Boolean(recordId(record) && updatedBestiaryIds.has(recordId(record)!)),
  ));

  const speciesIdByKey = new Map<string, string>();
  for (const species of bestiary) {
    const id = recordId(species);
    if (!id) continue;
    for (const key of speciesKeys(species)) speciesIdByKey.set(key, id);
  }

  const currentCharacters = input.currentCharacters.map(record => normalizePortraitRecord(record, "current"));
  const characterResult = reconcileLivingStoryRecords({
    entityKind: "character",
    current: currentCharacters,
    updates: characterUpdates,
    chapterNumber: input.chapterNumber,
  });
  const updatedCharacterIds = new Set(
    characterResult.appliedUpdates.map(recordId).filter((id): id is string => Boolean(id)),
  );
  const characters = characterResult.records.map(record => {
    const normalized = normalizePortraitRecord(record, "current");
    const speciesName = stringField(normalized, "speciesName");
    const resolvedSpeciesId = speciesName
      ? speciesIdByKey.get(canonicalLivingStoryEntityKey(speciesName))
      : stringField(normalized, "speciesId");
    delete normalized.speciesName;
    if (resolvedSpeciesId) {
      normalized.speciesId = resolvedSpeciesId;
      normalized.portraitKind = "non-human";
    }
    return normalized;
  });

  const charactersById = new Map(
    characters.flatMap(record => {
      const id = recordId(record);
      return id ? [[id, record] as const] : [];
    }),
  );
  const notableIdsBySpecies = new Map<string, string[]>();
  const encounteredSpeciesIds = new Set(updatedBestiaryIds);
  for (const character of characters) {
    const id = recordId(character);
    const speciesId = stringField(character, "speciesId");
    if (!id || !speciesId || character.portraitKind !== "non-human") continue;
    if (updatedCharacterIds.has(id)) encounteredSpeciesIds.add(speciesId);
    notableIdsBySpecies.set(speciesId, [
      ...(notableIdsBySpecies.get(speciesId) ?? []),
      id,
    ]);
  }

  const linkedBestiaryIds = new Set<string>();
  bestiary = bestiary.map(species => {
    const id = recordId(species);
    if (!id) return species;
    const appearanceChapters = encounteredSpeciesIds.has(id)
      ? chapterList([...chapterList(species.appearanceChapters), input.chapterNumber])
      : chapterList(species.appearanceChapters);
    const existing = stringList(species.notableIndividualIds).filter(individualId => {
      const character = charactersById.get(individualId);
      return !character || (
        character.portraitKind === "non-human"
        && stringField(character, "speciesId") === id
      );
    });
    const notableIndividualIds = uniqueIds([
      ...existing,
      ...(notableIdsBySpecies.get(id) ?? []),
    ]);
    if (
      JSON.stringify(existing) !== JSON.stringify(notableIndividualIds)
      || JSON.stringify(species.appearanceChapters) !== JSON.stringify(appearanceChapters)
    ) {
      linkedBestiaryIds.add(id);
    }
    return { ...species, appearanceChapters, notableIndividualIds };
  });

  const normalizedCharacterUpdates = characters.filter(record => {
    const id = recordId(record);
    return Boolean(id && updatedCharacterIds.has(id));
  });
  const normalizedBestiaryUpdates = bestiary.filter(record => {
    const id = recordId(record);
    return Boolean(id && (updatedBestiaryIds.has(id) || linkedBestiaryIds.has(id)));
  });

  return {
    characters,
    bestiary,
    characterUpdates: normalizedCharacterUpdates,
    bestiaryUpdates: normalizedBestiaryUpdates,
    identityWarnings: [
      ...bestiaryResult.warnings,
      ...characterResult.warnings,
    ],
  };
};
