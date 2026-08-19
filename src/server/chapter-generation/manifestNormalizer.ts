import type {
  BeastSonicProfile,
  ChapterManifestDiagnostics,
  ChapterManifestWarning,
  FateResultData,
  StoryBlock,
  StoryBlockMetadata,
  SystemEvent,
} from "../../components/chapter-generation/shared/types";

type JsonRecord = Record<string, unknown>;

export const MINIMUM_CHAPTER_WORD_COUNT = 2_000;

const BLOCK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const BLOCK_ATMOSPHERE_CATEGORIES = ["wind", "crowd", "waves", "rain", "combat", "noise"] as const;
const BEAST_EVENT_TYPES = ["reveal", "power-up", "technique", "injury", "turning-point", "death", "breakthrough"] as const;
const BEAST_SIZES = ["tiny", "small", "medium", "large", "giant", "colossal"] as const;
const SYSTEM_EVENT_KINDS = ["status", "skill_acquired", "level_up", "quest", "appraisal", "fate_result"] as const;
const SYSTEM_PROMPT_TYPES = [
  "neutral", "codex_update", "friendly_scan", "enemy_scan", "warning", "critical_danger",
  "progression", "breakthrough", "reward", "romance", "karmic_bond", "mystery", "fate_event",
  "corruption", "death_event", "quest_update", "choice_consequence", "system_error",
] as const;
const FATE_OUTCOMES: FateResultData["outcome"][] = ["FATE AVERTED", "FATE SCARRED", "DOOM MANIFESTED"];

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const parseWholeJson = (text: string): unknown | undefined => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const recordsFromJson = (value: unknown): JsonRecord[] => {
  if (typeof value === "string" && value.trim()) return [{ text: value.trim() }];
  if (Array.isArray(value)) {
    return value.flatMap(item => recordsFromJson(item));
  }
  if (!isRecord(value)) return [];
  if (Array.isArray(value.blocks)) return value.blocks.flatMap(item => recordsFromJson(item));
  return [value];
};

const extractFirstBalancedValue = (text: string): string | undefined => {
  const start = text.search(/[\[{]/);
  if (start < 0) return undefined;
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{" || character === "[") stack.push(character === "{" ? "}" : "]");
    else if (character === "}" || character === "]") {
      if (stack.pop() !== character) return undefined;
      if (stack.length === 0) return text.slice(start, index + 1);
    }
  }
  return undefined;
};

interface ExtractedManifestRecords {
  records: JsonRecord[];
  skippedBlocks: number;
  plainProse: boolean;
}

const looksLikeUnreadableJson = (text: string): boolean =>
  /^[\s\[{]/.test(text) || /"(?:text|blocks)"\s*:/.test(text);

const isProviderRefusal = (text: string): boolean => {
  const normalized = text.trim().replace(/^['"]+/, "");
  return /^(?:i (?:cannot|can't|am unable)\b|i(?:'m| am) sorry[,;:]?\s*(?:but\s+)?i (?:cannot|can't|am unable)|as an ai\b|i must decline\b)/i.test(normalized);
};

const extractManifestRecords = (text: string): ExtractedManifestRecords => {
  const whole = parseWholeJson(text);
  if (whole !== undefined) {
    return { records: recordsFromJson(whole), skippedBlocks: 0, plainProse: false };
  }

  const lineRecords: JsonRecord[] = [];
  let lineSkippedBlocks = 0;
  const jsonLikeLines = text.split(/\r?\n/).filter(line => /^[\s]*[\[{]/.test(line));
  for (const line of jsonLikeLines) {
    const parsed = parseWholeJson(line.trim().replace(/,$/, ""));
    if (parsed === undefined) lineSkippedBlocks += 1;
    else lineRecords.push(...recordsFromJson(parsed));
  }
  if (lineRecords.length > 0) {
    return { records: lineRecords, skippedBlocks: lineSkippedBlocks, plainProse: false };
  }

  const records: JsonRecord[] = [];
  let skippedBlocks = 0;
  let cursor = 0;
  while (cursor < text.length) {
    const relativeStart = text.slice(cursor).search(/[\[{]/);
    if (relativeStart < 0) break;
    const start = cursor + relativeStart;
    const balanced = extractFirstBalancedValue(text.slice(start));
    if (!balanced) {
      skippedBlocks += 1;
      cursor = text.indexOf("\n", start) + 1;
      if (cursor <= 0) break;
      continue;
    }
    const parsed = parseWholeJson(balanced);
    if (parsed === undefined) skippedBlocks += 1;
    else records.push(...recordsFromJson(parsed));
    cursor = start + balanced.length;
  }
  if (records.length > 0 || skippedBlocks > 0 || looksLikeUnreadableJson(text)) {
    return { records, skippedBlocks, plainProse: false };
  }

  const prose = text
    .split(/\r?\n\s*\r?\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map(paragraph => ({ text: paragraph }));
  return { records: prose, skippedBlocks: 0, plainProse: prose.length > 0 };
};

const countProseWords = (text: string): number => text
  .trim()
  .split(/\s+/u)
  .filter(Boolean)
  .length;

interface BlockWarningContext {
  warnings: ChapterManifestWarning[];
  blockIndex: number;
  blockId?: string;
}

const warning = (
  context: BlockWarningContext,
  code: ChapterManifestWarning["code"],
  message: string,
  field?: string,
) => context.warnings.push({
  code,
  message,
  blockIndex: context.blockIndex,
  ...(context.blockId ? { blockId: context.blockId } : {}),
  ...(field ? { field } : {}),
});

const safeFieldLabel = (field: string): string => field
  .replace(/[^A-Za-z0-9_.[\]-]/g, "")
  .slice(0, 96) || "unnamed";

const optionalStringField = (
  record: JsonRecord,
  field: string,
  context: BlockWarningContext,
  path: string,
): string | undefined => {
  if (record[field] === undefined || record[field] === null || record[field] === "") return undefined;
  const value = nonEmptyString(record[field]);
  if (!value) warning(context, "optional-field-removed", `Removed invalid optional ${path}.`, path);
  return value;
};

const optionalNumberField = (
  record: JsonRecord,
  field: string,
  context: BlockWarningContext,
  path: string,
): number | undefined => {
  if (record[field] === undefined || record[field] === null) return undefined;
  const value = finiteNumber(record[field]);
  if (value === undefined) warning(context, "optional-field-removed", `Removed invalid optional ${path}.`, path);
  return value;
};

const optionalStringArrayField = (
  record: JsonRecord,
  field: string,
  context: BlockWarningContext,
  path: string,
): string[] | undefined => {
  const raw = record[field];
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    warning(context, "optional-field-removed", `Removed invalid optional ${path}.`, path);
    return undefined;
  }
  const values = raw.flatMap((item, index) => {
    const value = nonEmptyString(item);
    if (value) return [value];
    warning(context, "optional-field-removed", `Removed invalid optional ${path}[${index}].`, `${path}[${index}]`);
    return [];
  });
  return values.length > 0 ? values : undefined;
};

const parseMetadataEntities = (
  value: unknown,
  context: BlockWarningContext,
): StoryBlockMetadata["entities"] => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    warning(context, "optional-field-removed", "Removed invalid optional metadata.entities.", "metadata.entities");
    return undefined;
  }
  const entities = value.flatMap((item, index) => {
    const path = `metadata.entities[${index}]`;
    if (!isRecord(item)) {
      warning(context, "optional-field-removed", `Removed invalid optional ${path}.`, path);
      return [];
    }
    const name = nonEmptyString(item.name);
    const type = nonEmptyString(item.type);
    const mention = nonEmptyString(item.mention);
    if (!name || !type || !["character", "artifact", "location", "beast", "faction"].includes(type)
      || (mention !== "reveal" && mention !== "reference")) {
      warning(context, "optional-field-removed", `Removed invalid optional ${path}.`, path);
      return [];
    }
    return [{
      name,
      type: type as NonNullable<StoryBlockMetadata["entities"]>[number]["type"],
      mention: mention as NonNullable<StoryBlockMetadata["entities"]>[number]["mention"],
    }];
  });
  return entities.length > 0 ? entities : undefined;
};

const parseMusic = (
  value: unknown,
  context: BlockWarningContext,
): StoryBlockMetadata["music"] => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    warning(context, "optional-field-removed", "Removed invalid optional metadata.music.", "metadata.music");
    return undefined;
  }
  const mood = nonEmptyString(value.mood);
  if (!mood) {
    warning(context, "optional-field-removed", "Removed invalid optional metadata.music.", "metadata.music");
    return undefined;
  }
  const region = optionalStringField(value, "region", context, "metadata.music.region");
  const validRegion = region && ["chinese", "japanese", "western"].includes(region)
    ? region as NonNullable<StoryBlockMetadata["music"]>["region"]
    : undefined;
  if (region && !validRegion) {
    warning(context, "optional-field-removed", "Removed unsupported optional metadata.music.region.", "metadata.music.region");
  }
  const intensity = optionalNumberField(value, "intensity", context, "metadata.music.intensity");
  const customUrl = optionalStringField(value, "customUrl", context, "metadata.music.customUrl");
  const trackId = optionalStringField(value, "trackId", context, "metadata.music.trackId");
  for (const field of Object.keys(value)) {
    if (!["mood", "region", "intensity", "customUrl", "trackId"].includes(field)) {
      const path = safeFieldLabel(`metadata.music.${field}`);
      warning(context, "optional-field-removed", `Removed unsupported optional ${path}.`, path);
    }
  }
  return {
    mood,
    ...(validRegion ? { region: validRegion } : {}),
    ...(intensity === undefined ? {} : { intensity }),
    ...(customUrl ? { customUrl } : {}),
    ...(trackId ? { trackId } : {}),
  };
};

const parseBeastEvent = (
  value: unknown,
  context: BlockWarningContext,
): StoryBlockMetadata["beastEvent"] => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value) || !isRecord(value.profile)) {
    warning(context, "optional-field-removed", "Removed invalid optional metadata.beastEvent.", "metadata.beastEvent");
    return undefined;
  }
  const type = nonEmptyString(value.type);
  if (!type || !BEAST_EVENT_TYPES.includes(type as (typeof BEAST_EVENT_TYPES)[number])) {
    warning(context, "optional-field-removed", "Removed invalid optional metadata.beastEvent.", "metadata.beastEvent");
    return undefined;
  }
  const profile: BeastSonicProfile = {};
  const size = optionalStringField(value.profile, "size", context, "metadata.beastEvent.profile.size");
  if (size && BEAST_SIZES.includes(size as (typeof BEAST_SIZES)[number])) {
    profile.size = size as BeastSonicProfile["size"];
  } else if (size) {
    warning(context, "optional-field-removed", "Removed unsupported optional metadata.beastEvent.profile.size.", "metadata.beastEvent.profile.size");
  }
  for (const field of ["bodyType", "element", "movement", "intelligence", "threatTier", "signatureSound"] as const) {
    const parsed = optionalStringField(value.profile, field, context, `metadata.beastEvent.profile.${field}`);
    if (parsed) profile[field] = parsed;
  }
  return { type: type as NonNullable<StoryBlockMetadata["beastEvent"]>["type"], profile };
};

const parseBlockMetadata = (
  value: unknown,
  context: BlockWarningContext,
): StoryBlockMetadata | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    warning(context, "optional-field-removed", "Removed invalid optional metadata.", "metadata");
    return undefined;
  }
  const metadata: StoryBlockMetadata = {};
  for (const field of ["sceneType", "motion", "emotion", "audioSignature", "speakerName", "mode", "speakerRole"] as const) {
    const parsed = optionalStringField(value, field, context, `metadata.${field}`);
    if (parsed) metadata[field] = parsed;
  }
  for (const field of ["intensity", "tension", "danger", "mysticism"] as const) {
    const parsed = optionalNumberField(value, field, context, `metadata.${field}`);
    if (parsed !== undefined) metadata[field] = parsed;
  }
  const environment = optionalStringArrayField(value, "environment", context, "metadata.environment");
  if (environment) metadata.environment = environment;
  const atmosphereTags = optionalStringArrayField(value, "atmosphereTags", context, "metadata.atmosphereTags");
  if (atmosphereTags) metadata.atmosphereTags = atmosphereTags;
  const atmosphereCategory = optionalStringField(value, "atmosphereCategory", context, "metadata.atmosphereCategory");
  if (atmosphereCategory && BLOCK_ATMOSPHERE_CATEGORIES.includes(
    atmosphereCategory as (typeof BLOCK_ATMOSPHERE_CATEGORIES)[number],
  )) metadata.atmosphereCategory = atmosphereCategory as StoryBlockMetadata["atmosphereCategory"];
  else if (atmosphereCategory) {
    warning(context, "optional-field-removed", "Removed unsupported optional metadata.atmosphereCategory.", "metadata.atmosphereCategory");
  }
  if (value.theme !== undefined && value.theme !== null) {
    const theme = nonEmptyString(value.theme)
      ?? optionalStringArrayField(value, "theme", context, "metadata.theme");
    if (theme) metadata.theme = theme;
    else if (!Array.isArray(value.theme)) {
      warning(context, "optional-field-removed", "Removed invalid optional metadata.theme.", "metadata.theme");
    }
  }
  const entities = parseMetadataEntities(value.entities, context);
  if (entities) metadata.entities = entities;
  const music = parseMusic(value.music, context);
  if (music) metadata.music = music;
  const beastEvent = parseBeastEvent(value.beastEvent, context);
  if (beastEvent) metadata.beastEvent = beastEvent;

  const knownFields = new Set([
    "sceneType", "environment", "atmosphereCategory", "atmosphereTags", "theme", "motion", "emotion",
    "intensity", "tension", "danger", "mysticism", "audioSignature", "speakerName", "mode",
    "speakerRole", "entities", "music", "beastEvent",
  ]);
  for (const field of Object.keys(value)) {
    if (!knownFields.has(field)) {
      const path = safeFieldLabel(`metadata.${field}`);
      warning(context, "optional-field-removed", `Removed unsupported optional ${path}.`, path);
    }
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const parseFateResult = (
  value: unknown,
  context: BlockWarningContext,
): FateResultData | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    warning(context, "optional-field-removed", "Removed invalid optional system.fateResult.", "system.fateResult");
    return undefined;
  }
  const outcome = nonEmptyString(value.outcome);
  const timelineScar = nonEmptyString(value.timelineScar);
  const permanentCosts = Array.isArray(value.permanentCosts)
    ? value.permanentCosts.map(nonEmptyString).filter((item): item is string => Boolean(item))
    : undefined;
  if (!outcome || !FATE_OUTCOMES.includes(outcome as FateResultData["outcome"])
    || !timelineScar || !permanentCosts) {
    warning(context, "optional-field-removed", "Removed invalid optional system.fateResult.", "system.fateResult");
    return undefined;
  }
  const newActiveStats = optionalStringArrayField(value, "newActiveStats", context, "system.fateResult.newActiveStats");
  return {
    outcome: outcome as FateResultData["outcome"],
    timelineScar,
    permanentCosts,
    ...(optionalStringField(value, "newStoryState", context, "system.fateResult.newStoryState") ? {
      newStoryState: optionalStringField(value, "newStoryState", context, "system.fateResult.newStoryState"),
    } : {}),
    ...(newActiveStats ? { newActiveStats } : {}),
    ...(optionalStringField(value, "genreShift", context, "system.fateResult.genreShift") ? {
      genreShift: optionalStringField(value, "genreShift", context, "system.fateResult.genreShift"),
    } : {}),
  };
};

const parseSystemEvent = (
  value: unknown,
  context: BlockWarningContext,
): SystemEvent | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    warning(context, "optional-field-removed", "Removed invalid optional system object.", "system");
    return undefined;
  }
  const kind = nonEmptyString(value.kind);
  const title = nonEmptyString(value.title);
  if (!kind || !SYSTEM_EVENT_KINDS.includes(kind as (typeof SYSTEM_EVENT_KINDS)[number]) || !title) {
    warning(context, "optional-field-removed", "Removed invalid optional system object.", "system");
    return undefined;
  }
  const promptType = optionalStringField(value, "promptType", context, "system.promptType");
  const validPromptType = promptType && SYSTEM_PROMPT_TYPES.includes(promptType as (typeof SYSTEM_PROMPT_TYPES)[number])
    ? promptType as SystemEvent["promptType"]
    : undefined;
  if (promptType && !validPromptType) {
    warning(context, "optional-field-removed", "Removed unsupported optional system.promptType.", "system.promptType");
  }
  let rows: SystemEvent["rows"];
  if (value.rows !== undefined && value.rows !== null) {
    if (!Array.isArray(value.rows)) {
      warning(context, "optional-field-removed", "Removed invalid optional system.rows.", "system.rows");
    } else {
      const parsedRows = value.rows.flatMap((item, index) => {
        if (!isRecord(item) || !nonEmptyString(item.label) || !nonEmptyString(item.value)) {
          warning(context, "optional-field-removed", `Removed invalid optional system.rows[${index}].`, `system.rows[${index}]`);
          return [];
        }
        return [{ label: nonEmptyString(item.label)!, value: nonEmptyString(item.value)! }];
      });
      if (parsedRows.length > 0) rows = parsedRows;
    }
  }
  const rarity = optionalStringField(value, "rarity", context, "system.rarity");
  const fateResult = parseFateResult(value.fateResult, context);
  for (const field of Object.keys(value)) {
    if (!["kind", "title", "promptType", "rows", "rarity", "fateResult"].includes(field)) {
      const path = safeFieldLabel(`system.${field}`);
      warning(context, "optional-field-removed", `Removed unsupported optional ${path}.`, path);
    }
  }
  return {
    kind: kind as SystemEvent["kind"],
    title,
    ...(validPromptType ? { promptType: validPromptType } : {}),
    ...(rows ? { rows } : {}),
    ...(rarity ? { rarity } : {}),
    ...(fateResult ? { fateResult } : {}),
  };
};

const normalizedBlockId = (
  record: JsonRecord,
  index: number,
  chapterNumber: number,
  warnings: ChapterManifestWarning[],
): string => {
  const raw = nonEmptyString(record.id);
  const id = `c${chapterNumber}-p${index + 1}`;
  if (raw !== id) {
    warnings.push({
      code: "block-id-generated",
      message: raw
        ? `Replaced a ${BLOCK_ID_PATTERN.test(raw) ? "model-supplied" : "invalid"} block ID with the stable code-owned ID.`
        : "Assigned a stable code-owned block ID.",
      blockIndex: index,
      blockId: id,
      field: "id",
    });
  }
  return id;
};

const normalizeBlock = (
  record: JsonRecord,
  index: number,
  chapterNumber: number,
  warnings: ChapterManifestWarning[],
): StoryBlock | undefined => {
  const text = nonEmptyString(record.text);
  if (!text) {
    warnings.push({
      code: "block-skipped",
      message: "Skipped a Manifest block because it contained no usable prose text.",
      blockIndex: index,
      field: "text",
    });
    return undefined;
  }
  const id = normalizedBlockId(record, index, chapterNumber, warnings);
  const context: BlockWarningContext = { warnings, blockIndex: index, blockId: id };
  const metadata = parseBlockMetadata(record.metadata, context);
  const system = parseSystemEvent(record.system, context);
  const rawType = nonEmptyString(record.type);
  const type = rawType === "dialogue" || (!rawType && metadata?.mode === "dialogue")
    ? "dialogue"
    : "paragraph";
  if (rawType && rawType !== type) {
    const safeType = ["narration", "system"].includes(rawType)
      ? `'${rawType}'`
      : "an unsupported prose-like label";
    warning(
      context,
      "block-type-normalized",
      `Normalized prose block type ${safeType} to '${type}'.`,
      "type",
    );
  } else if (record.type !== undefined && !rawType) {
    warning(context, "block-type-normalized", "Normalized an invalid prose block type to 'paragraph'.", "type");
  }
  const knownFields = new Set(["id", "type", "text", "metadata", "system"]);
  for (const field of Object.keys(record)) {
    if (!knownFields.has(field)) {
      const label = safeFieldLabel(field);
      warning(context, "optional-field-removed", `Removed unsupported optional block field '${label}'.`, label);
    }
  }
  return {
    id,
    type,
    text,
    ...(metadata ? { metadata } : {}),
    ...(system ? { system } : {}),
  };
};

export interface NormalizedManifestResult {
  blocks: StoryBlock[];
  generatedContent: string;
  diagnostics: ChapterManifestDiagnostics;
}

/**
 * Treats readable prose as the Manifest's essential result. Optional formatting
 * and enrichment can be recovered or removed without discarding the chapter.
 */
export function normalizeManifestResponse(
  text: string,
  chapterNumber: number,
): NormalizedManifestResult {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^\s*---CHAPTER_BLOCKS---\s*/i, "")
    .trim();
  if (!cleaned) throw new Error("Manifest Chapter returned no content.");

  const extracted = extractManifestRecords(cleaned);
  if (extracted.records.length > 500) throw new Error("Manifest Chapter returned too many blocks.");
  const warnings: ChapterManifestWarning[] = Array.from(
    { length: extracted.skippedBlocks },
    () => ({
      code: "block-skipped" as const,
      message: "Skipped an unreadable Manifest block while preserving surrounding prose.",
    }),
  );
  if (extracted.plainProse) {
    warnings.push({
      code: "plain-prose-recovered",
      message: "Recovered a plain-prose Manifest response into paragraph blocks.",
    });
  }
  const blocks = extracted.records
    .map((record, index) => normalizeBlock(
      record,
      index,
      chapterNumber,
      warnings,
    ))
    .filter((block): block is StoryBlock => Boolean(block));
  if (blocks.length === 0) {
    throw new Error("Manifest Chapter returned no recoverable prose.");
  }
  const generatedContent = blocks.map(block => block.text).join("\n\n");
  if (isProviderRefusal(generatedContent)) {
    throw new Error("Manifest Chapter returned a provider refusal instead of prose.");
  }
  const wordCount = countProseWords(generatedContent);
  if (wordCount < MINIMUM_CHAPTER_WORD_COUNT) {
    warnings.push({
      code: "under-minimum-word-count",
      message: `Preserved the chapter at ${wordCount.toLocaleString()} words; it needs repair or review because the minimum is ${MINIMUM_CHAPTER_WORD_COUNT.toLocaleString()} words.`,
      field: "wordCount",
    });
  }
  const status = wordCount < MINIMUM_CHAPTER_WORD_COUNT
    || warnings.some(item => item.code === "block-skipped")
    ? "needs-review"
    : "healthy";
  return {
    blocks,
    generatedContent,
    diagnostics: {
      status,
      wordCount,
      minimumWordCount: MINIMUM_CHAPTER_WORD_COUNT,
      warnings,
    },
  };
}
