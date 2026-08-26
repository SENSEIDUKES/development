import {
  appendSceneType,
  deriveSceneAnchors,
  SCENE_TYPES,
  type SceneAnchors,
  type ScenePathSelection,
  type SceneType,
} from "../../components/chapter-generation/shared/lib/sceneRhythm";
import { sanitizeChapterHandoff } from "../../components/chapter-generation/shared/lib/chapterHandoff";
import { estimateTokens } from "../../components/chapter-generation/shared/lib/helpers";
import type { ChapterGenerationValidationIssue } from "../../components/chapter-generation/shared/liveChapterGeneration";
import {
  createArcChapterPosition,
  type LivingStoryCharacterStateUpdate,
  type LivingStoryCodexUpdates,
} from "../../components/chapter-generation/shared/packets/livingStoryState";
import {
  isProviderVoiceField,
  normalizeCreatureCodexRecords,
} from "../../components/chapter-generation/shared/packets/creatureCodex";
import type {
  AsyncChapterGenerationModelCalls,
  ChapterEffectKind,
  ChapterEffectSelection,
  ChapterPlan,
  ChapterProcessingFinding,
  ChapterProcessingResult,
  ManifestChapterInput,
  PlanChapterInput,
  ProcessChapterInput,
  RepairChapterInput,
} from "../../components/chapter-generation/shared/pipeline/types";
import type {
  ChapterModelCallUsage,
  EstimatedStageInputTokenBreakdown,
} from "../../components/chapter-generation/shared/pipeline/usage";
import {
  STORY_ENTITY_TYPES,
  type ChapterHandoff,
  type StoryBlock,
  type StoryBlockMetadata,
  type StoryEntityType,
  type SystemEvent,
  type SystemPromptBadge,
  type SystemPromptChange,
  type SystemPromptPresentation,
  type SystemStatusScreen,
  type WorldNoticeData,
  type ChapterContent,
} from "../../components/chapter-generation/shared/types";
import type { ChapterTextModelProvider } from "./provider";
import { parseModelWorldCueIntents } from "./manifestNormalizer";
import { assignCharacterVoices } from "../audio/characterVoiceAssignments";

const EFFECT_KINDS: ChapterEffectKind[] = [
  "narration-metadata",
  "world-cue",
  "system-panel",
  "scene-music",
  "atmosphere",
  "narrative-cue",
];

export class ChapterPlanValidationError extends Error {
  readonly issues: ChapterGenerationValidationIssue[];

  constructor(issues: ChapterGenerationValidationIssue[]) {
    const details = issues.map(issue => {
      const expectation = issue.expected ? ` Expected ${issue.expected}.` : "";
      const received = issue.received ? ` Received ${issue.received}.` : "";
      return `${issue.field}: ${issue.reason}.${expectation}${received}`;
    }).join(" ");
    super(`Plan Chapter validation failed: ${details}`);
    this.name = "ChapterPlanValidationError";
    this.issues = issues.map(issue => ({ ...issue }));
  }
}

export class ChapterModelResponseValidationError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "The model response failed validation.");
    this.name = "ChapterModelResponseValidationError";
    this.cause = cause;
  }
}

const asModelResponseValidation = <T>(parse: () => T): T => {
  try {
    return parse();
  } catch (error) {
    if (error instanceof ChapterPlanValidationError) throw error;
    throw new ChapterModelResponseValidationError(error);
  }
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const receivedValue = (value: unknown): string => {
  if (value === undefined) return "missing";
  const rendered = JSON.stringify(value);
  return rendered && rendered.length <= 160
    ? rendered
    : `${Array.isArray(value) ? "array" : typeof value}`;
};

const requiredRecord = (value: unknown, label: string): JsonRecord => {
  if (!isRecord(value)) throw new Error(`${label} must be a JSON object.`);
  return value;
};

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const optionalValidatedString = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredString(value, label);
};

const optionalFiniteNumber = (value: unknown, label: string): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
};

const requiredBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean.`);
  return value;
};

const stringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.flatMap((item, index) => {
    if (typeof item === "string") {
      const trimmed = item.trim();
      return trimmed ? [trimmed] : [];
    }
    if (isRecord(item)) {
      const described = [item.description, item.change, item.summary, item.event, item.result]
        .find(candidate => typeof candidate === "string" && candidate.trim()) as string | undefined;
      if (described) return [described.trim()];
      const preserved = JSON.stringify(item);
      if (preserved !== "{}") return [preserved];
    }
    if (item === null || item === undefined) return [];
    throw new Error(`${label}[${index}] must be a string or described change object.`);
  });
};

const unknownArray = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return structuredClone(value);
};

const recordArray = (value: unknown, label: string): JsonRecord[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((item, index) => ({
    ...requiredRecord(item, `${label}[${index}]`),
  }));
};

const MODEL_PRIVATE_FIELD_KEYS = new Set([
  "voicekey",
  "voicepresetid",
  "voiceid",
  "providervoiceid",
  "providerid",
  "soundurl",
  "audiourl",
  "voiceclipurl",
  "imageurl",
  "portraiturl",
  "assetid",
  "imageassetid",
  "voiceassetid",
  "audioassetid",
  "mediaassetid",
  "filepath",
  "filename",
  "filekey",
  "fileid",
  "storagekey",
  "catalogid",
  "catalogentry",
  "catalogentryid",
  "catalogkey",
  "catalogurl",
]);

const compactFieldKey = (field: string): string => field
  .replace(/[^A-Za-z0-9]/g, "")
  .toLocaleLowerCase();

/**
 * Model-owned records may describe meaning, but never select media or a
 * provider identity. This recursively removes selectors before an update can
 * reach canonical Living Story State.
 */
const isModelPrivateField = (field: string): boolean => {
  const key = compactFieldKey(field);
  return isProviderVoiceField(field)
    || MODEL_PRIVATE_FIELD_KEYS.has(key)
    || key.endsWith("url")
    || key.endsWith("uri")
    || key.includes("filepath")
    || key.includes("filename")
    || key.includes("assetid")
    || key.startsWith("catalog");
};

const stripModelPrivateFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripModelPrivateFields);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([field, nested]) => (
      isModelPrivateField(field)
        ? []
        : [[field, stripModelPrivateFields(nested)]]
    )),
  );
};

const sanitizedRecordArray = (value: unknown, label: string): JsonRecord[] => (
  recordArray(value, label).map(record => stripModelPrivateFields(record) as JsonRecord)
);

const cleanModelEnvelope = (text: string): string => text
  .replace(/<think>[\s\S]*?<\/think>/gi, "")
  .replace(/^\s*```(?:json)?\s*/i, "")
  .replace(/\s*```\s*$/i, "")
  .trim();

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
    if (character === "{" || character === "[") {
      stack.push(character === "{" ? "}" : "]");
    } else if (character === "}" || character === "]") {
      if (stack.pop() !== character) return undefined;
      if (stack.length === 0) return text.slice(start, index + 1);
    }
  }
  return undefined;
};

export const parseStructuredModelJson = (text: string, stage: string): JsonRecord => {
  const cleaned = cleanModelEnvelope(text);
  try {
    return requiredRecord(JSON.parse(cleaned), `${stage} response`);
  } catch {
    const balanced = extractFirstBalancedValue(cleaned);
    if (!balanced) throw new Error(`${stage} returned invalid structured JSON.`);
    try {
      return requiredRecord(JSON.parse(balanced), `${stage} response`);
    } catch {
      throw new Error(`${stage} returned invalid structured JSON.`);
    }
  }
};

const sceneType = (value: unknown, label: string): SceneType => {
  if (typeof value !== "string" || !SCENE_TYPES.includes(value as SceneType)) {
    throw new Error(`${label} must be a supported scene type.`);
  }
  return value as SceneType;
};

const parseScenePath = (value: unknown): ScenePathSelection | undefined => {
  if (!isRecord(value)) return undefined;
  const weights = requiredRecord(value.weights, "ChapterPlan.selectedScenePath.weights");
  return {
    type: sceneType(value.type, "ChapterPlan.selectedScenePath.type"),
    anchor: requiredString(value.anchor, "ChapterPlan.selectedScenePath.anchor"),
    weights: {
      worldBuilding: Number(weights.worldBuilding) || 0,
      conflict: Number(weights.conflict) || 0,
      progression: Number(weights.progression) || 0,
    },
    blocked: Array.isArray(value.blocked)
      ? value.blocked.map((item, index) => sceneType(item, `ChapterPlan.selectedScenePath.blocked[${index}]`))
      : [],
    reason: requiredString(value.reason, "ChapterPlan.selectedScenePath.reason"),
  };
};

const parseEffects = (value: unknown): ChapterEffectSelection[] => {
  if (!Array.isArray(value)) throw new Error("ChapterPlan.effects must be an array.");
  return value.map((item, index) => {
    const effect = requiredRecord(item, `ChapterPlan.effects[${index}]`);
    const kind = requiredString(effect.kind, `ChapterPlan.effects[${index}].kind`) as ChapterEffectKind;
    if (!EFFECT_KINDS.includes(kind)) {
      throw new Error(`ChapterPlan.effects[${index}].kind is unsupported.`);
    }
    return {
      kind,
      intent: requiredString(effect.intent, `ChapterPlan.effects[${index}].intent`),
      required: requiredBoolean(effect.required, `ChapterPlan.effects[${index}].required`),
    };
  });
};

export function parseChapterPlan(text: string, input: PlanChapterInput): ChapterPlan {
  const value = parseStructuredModelJson(text, "Plan Chapter");
  const expectedChapter = input.chapterPacket.chapterMission.number;
  if (value.chapterNumber !== expectedChapter) {
    throw new ChapterPlanValidationError([{
      field: "chapterNumber",
      reason: "does not match the requested chapter",
      expected: String(expectedChapter),
      received: receivedValue(value.chapterNumber),
    }]);
  }
  const rhythm = requiredRecord(value.rhythmResponse, "ChapterPlan.rhythmResponse");
  const selectedPressureTier = input.planningSignals.fatePressureTier;
  const fate = requiredRecord(value.fateSurvival, "ChapterPlan.fateSurvival");
  requiredBoolean(fate.configured, "ChapterPlan.fateSurvival.configured");
  const canonicalFate = input.chapterPacket.storyConstitution.fateSurvival;
  const requestedFateApplication = requiredBoolean(
    fate.applies,
    "ChapterPlan.fateSurvival.applies",
  );
  const progression = Array.isArray(value.sceneProgression) ? value.sceneProgression : [];
  if (progression.length === 0) throw new Error("ChapterPlan.sceneProgression cannot be empty.");
  const pacing = requiredRecord(value.pacing, "ChapterPlan.pacing");
  const returnedPosition = requiredString(value.arcChapterPosition, "ChapterPlan.arcChapterPosition");
  if (returnedPosition !== input.chapterPacket.arcChapterPosition.display) {
    throw new ChapterPlanValidationError([{
      field: "arcChapterPosition",
      reason: "does not match the requested arc position",
      expected: JSON.stringify(input.chapterPacket.arcChapterPosition.display),
      received: receivedValue(value.arcChapterPosition),
    }]);
  }

  return {
    version: 1,
    chapterNumber: expectedChapter,
    arcChapterPosition: returnedPosition,
    rhythmResponse: {
      recentSceneTypes: Array.isArray(rhythm.recentSceneTypes)
        ? rhythm.recentSceneTypes.map((item, index) => sceneType(item, `ChapterPlan.rhythmResponse.recentSceneTypes[${index}]`))
        : [],
      ...(selectedPressureTier ? { selectedPressureTier } : {}),
      direction: requiredString(rhythm.direction, "ChapterPlan.rhythmResponse.direction"),
    },
    ...(input.chapterPacket.existingAnchors
      ? { selectedScenePath: parseScenePath(value.selectedScenePath) }
      : {}),
    resolvedSceneType: sceneType(value.resolvedSceneType, "ChapterPlan.resolvedSceneType"),
    fateSurvival: {
      configured: Boolean(canonicalFate),
      applies: Boolean(canonicalFate?.enabled && requestedFateApplication),
      ...(canonicalFate ? { visibility: canonicalFate.visibility } : {}),
      ...(canonicalFate ? { pressure: canonicalFate.pressure } : {}),
      approach: requiredString(fate.approach, "ChapterPlan.fateSurvival.approach"),
    },
    effects: parseEffects(value.effects),
    sceneProgression: progression.map((item, index) => {
      const scene = requiredRecord(item, `ChapterPlan.sceneProgression[${index}]`);
      return {
        order: Number.isInteger(scene.order) ? scene.order as number : index + 1,
        purpose: requiredString(scene.purpose, `ChapterPlan.sceneProgression[${index}].purpose`),
        pacing: requiredString(scene.pacing, `ChapterPlan.sceneProgression[${index}].pacing`),
      };
    }),
    pacing: {
      directive: requiredString(pacing.directive, "ChapterPlan.pacing.directive"),
      shape: requiredString(pacing.shape, "ChapterPlan.pacing.shape"),
    },
    intendedEnding: requiredString(value.intendedEnding, "ChapterPlan.intendedEnding"),
    nextChapterHandoffTarget: requiredString(
      value.nextChapterHandoffTarget,
      "ChapterPlan.nextChapterHandoffTarget",
    ),
  };
}

const extractBalancedObjects = (text: string): JsonRecord[] => {
  const values: JsonRecord[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const next = text.slice(cursor).search(/[\[{]/);
    if (next < 0) break;
    const start = cursor + next;
    const balanced = extractFirstBalancedValue(text.slice(start));
    if (!balanced) {
      throw new Error("Manifest Chapter returned a malformed or unbalanced block.");
    }
    try {
      const parsed = JSON.parse(balanced);
      if (Array.isArray(parsed)) {
        values.push(...parsed.filter(isRecord));
      } else if (isRecord(parsed) && Array.isArray(parsed.blocks)) {
        values.push(...parsed.blocks.filter(isRecord));
      } else if (isRecord(parsed)) {
        values.push(parsed);
      }
    } catch {
      throw new Error("Manifest Chapter returned a malformed JSON block.");
    }
    cursor = start + Math.max(1, balanced.length);
  }
  return values;
};

const BLOCK_ATMOSPHERE_CATEGORIES = ["wind", "crowd", "waves", "rain", "combat", "noise"] as const;
const BEAST_EVENT_TYPES = ["reveal", "power-up", "technique", "injury", "turning-point", "death", "breakthrough"] as const;
const BEAST_SIZES = ["tiny", "small", "medium", "large", "giant", "colossal"] as const;
const SYSTEM_EVENT_KINDS = ["system_prompt", "fate_system_prompt"] as const;
const SYSTEM_PROMPT_TYPES = [
  "neutral", "codex_update", "friendly_scan", "enemy_scan", "warning", "critical_danger",
  "progression", "breakthrough", "reward", "romance", "karmic_bond", "mystery", "fate_event",
  "corruption", "death_event", "quest_update", "choice_consequence", "system_error",
] as const;
const SYSTEM_PROMPT_PRESENTATIONS = ["narrative", "mechanical", "world_notice"] as const;
const FATE_RESULT_OUTCOMES = ["FATE AVERTED", "FATE SCARRED", "DOOM MANIFESTED"] as const;
const optionalMetadataStringArray = (value: unknown, label: string): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  return stringArray(value, label);
};

const parseBlockMetadata = (
  value: unknown,
  label: string,
  blockId: string,
  blockText: string,
): StoryBlockMetadata | undefined => {
  if (value === undefined || value === null) return undefined;
  const metadata = requiredRecord(value, label);
  const atmosphereCategory = optionalValidatedString(metadata.atmosphereCategory, `${label}.atmosphereCategory`);
  if (atmosphereCategory && !BLOCK_ATMOSPHERE_CATEGORIES.includes(
    atmosphereCategory as (typeof BLOCK_ATMOSPHERE_CATEGORIES)[number],
  )) {
    throw new Error(`${label}.atmosphereCategory is unsupported.`);
  }
  const entities = metadata.entities === undefined
    ? undefined
    : Array.isArray(metadata.entities)
      ? metadata.entities.map((item, index) => {
          const entity = requiredRecord(item, `${label}.entities[${index}]`);
          const receivedType = requiredString(entity.type, `${label}.entities[${index}].type`);
          // Manifest prompt compatibility still accepts "beast" here; the
          // generated chapter state and Reader path use "creature" from this
          // boundary onward.
          const type = receivedType === "beast" ? "creature" : receivedType;
          const mention = requiredString(entity.mention, `${label}.entities[${index}].mention`);
          if (!STORY_ENTITY_TYPES.includes(type as StoryEntityType)) {
            throw new Error(`${label}.entities[${index}].type is unsupported.`);
          }
          if (mention !== "reveal" && mention !== "reference") {
            throw new Error(`${label}.entities[${index}].mention is unsupported.`);
          }
          return {
            name: requiredString(entity.name, `${label}.entities[${index}].name`),
            type: type as StoryEntityType,
            mention: mention as "reveal" | "reference",
          };
        })
      : (() => { throw new Error(`${label}.entities must be an array.`); })();
  const music = metadata.music === undefined
    ? undefined
    : (() => {
        const item = requiredRecord(metadata.music, `${label}.music`);
        const region = optionalValidatedString(item.region, `${label}.music.region`);
        if (region && !["chinese", "japanese", "western"].includes(region)) {
          throw new Error(`${label}.music.region is unsupported.`);
        }
        return {
          mood: requiredString(item.mood, `${label}.music.mood`),
          ...(region ? { region: region as "chinese" | "japanese" | "western" } : {}),
          ...(optionalFiniteNumber(item.intensity, `${label}.music.intensity`) !== undefined
            ? { intensity: optionalFiniteNumber(item.intensity, `${label}.music.intensity`) }
            : {}),
        };
      })();
  const theme = metadata.theme === undefined
    ? undefined
    : typeof metadata.theme === "string"
      ? requiredString(metadata.theme, `${label}.theme`)
      : stringArray(metadata.theme, `${label}.theme`);
  const beastEvent = metadata.beastEvent === undefined
    ? undefined
    : (() => {
        const event = requiredRecord(metadata.beastEvent, `${label}.beastEvent`);
        const type = requiredString(event.type, `${label}.beastEvent.type`);
        if (!BEAST_EVENT_TYPES.includes(type as (typeof BEAST_EVENT_TYPES)[number])) {
          throw new Error(`${label}.beastEvent.type is unsupported.`);
        }
        const profile = requiredRecord(event.profile, `${label}.beastEvent.profile`);
        const size = optionalValidatedString(profile.size, `${label}.beastEvent.profile.size`);
        if (size && !BEAST_SIZES.includes(size as (typeof BEAST_SIZES)[number])) {
          throw new Error(`${label}.beastEvent.profile.size is unsupported.`);
        }
        return {
          type: type as NonNullable<StoryBlockMetadata["beastEvent"]>["type"],
          profile: {
            ...(size ? { size: size as (typeof BEAST_SIZES)[number] } : {}),
            ...(optionalValidatedString(profile.bodyType, `${label}.beastEvent.profile.bodyType`) ? { bodyType: optionalValidatedString(profile.bodyType, `${label}.beastEvent.profile.bodyType`) } : {}),
            ...(optionalValidatedString(profile.element, `${label}.beastEvent.profile.element`) ? { element: optionalValidatedString(profile.element, `${label}.beastEvent.profile.element`) } : {}),
            ...(optionalValidatedString(profile.movement, `${label}.beastEvent.profile.movement`) ? { movement: optionalValidatedString(profile.movement, `${label}.beastEvent.profile.movement`) } : {}),
            ...(optionalValidatedString(profile.intelligence, `${label}.beastEvent.profile.intelligence`) ? { intelligence: optionalValidatedString(profile.intelligence, `${label}.beastEvent.profile.intelligence`) } : {}),
            ...(optionalValidatedString(profile.threatTier, `${label}.beastEvent.profile.threatTier`) ? { threatTier: optionalValidatedString(profile.threatTier, `${label}.beastEvent.profile.threatTier`) } : {}),
            ...(optionalValidatedString(profile.signatureSound, `${label}.beastEvent.profile.signatureSound`) ? { signatureSound: optionalValidatedString(profile.signatureSound, `${label}.beastEvent.profile.signatureSound`) } : {}),
          },
        };
      })();
  const audioMoments = parseModelWorldCueIntents(
    metadata.audioMoments,
    blockId,
    blockText,
  ).intents;

  return {
    ...(optionalValidatedString(metadata.sceneType, `${label}.sceneType`) ? { sceneType: optionalValidatedString(metadata.sceneType, `${label}.sceneType`) } : {}),
    ...(optionalMetadataStringArray(metadata.environment, `${label}.environment`) ? { environment: optionalMetadataStringArray(metadata.environment, `${label}.environment`) } : {}),
    ...(atmosphereCategory ? { atmosphereCategory: atmosphereCategory as StoryBlockMetadata["atmosphereCategory"] } : {}),
    ...(optionalMetadataStringArray(metadata.atmosphereTags, `${label}.atmosphereTags`) ? { atmosphereTags: optionalMetadataStringArray(metadata.atmosphereTags, `${label}.atmosphereTags`) } : {}),
    ...(theme ? { theme } : {}),
    ...(optionalValidatedString(metadata.motion, `${label}.motion`) ? { motion: optionalValidatedString(metadata.motion, `${label}.motion`) } : {}),
    ...(optionalValidatedString(metadata.emotion, `${label}.emotion`) ? { emotion: optionalValidatedString(metadata.emotion, `${label}.emotion`) } : {}),
    ...(optionalFiniteNumber(metadata.intensity, `${label}.intensity`) !== undefined ? { intensity: optionalFiniteNumber(metadata.intensity, `${label}.intensity`) } : {}),
    ...(optionalFiniteNumber(metadata.tension, `${label}.tension`) !== undefined ? { tension: optionalFiniteNumber(metadata.tension, `${label}.tension`) } : {}),
    ...(optionalFiniteNumber(metadata.danger, `${label}.danger`) !== undefined ? { danger: optionalFiniteNumber(metadata.danger, `${label}.danger`) } : {}),
    ...(optionalFiniteNumber(metadata.mysticism, `${label}.mysticism`) !== undefined ? { mysticism: optionalFiniteNumber(metadata.mysticism, `${label}.mysticism`) } : {}),
    ...(optionalValidatedString(metadata.audioSignature, `${label}.audioSignature`) ? { audioSignature: optionalValidatedString(metadata.audioSignature, `${label}.audioSignature`) } : {}),
    ...(optionalValidatedString(metadata.speakerName, `${label}.speakerName`) ? { speakerName: optionalValidatedString(metadata.speakerName, `${label}.speakerName`) } : {}),
    ...(optionalValidatedString(metadata.mode, `${label}.mode`) ? { mode: optionalValidatedString(metadata.mode, `${label}.mode`) } : {}),
    ...(optionalValidatedString(metadata.speakerRole, `${label}.speakerRole`) ? { speakerRole: optionalValidatedString(metadata.speakerRole, `${label}.speakerRole`) } : {}),
    ...(entities ? { entities } : {}),
    ...(music ? { music } : {}),
    ...(beastEvent ? { beastEvent } : {}),
    ...(audioMoments.length > 0 ? { audioMoments } : {}),
  };
};

const parseWorldNotice = (value: unknown, label: string): WorldNoticeData => {
  const notice = requiredRecord(value, label);
  if (!Array.isArray(notice.entries) || notice.entries.length === 0) {
    throw new Error(`${label}.entries must be a non-empty array.`);
  }
  return {
    entries: notice.entries.map((item, index) => {
      const entry = requiredRecord(item, `${label}.entries[${index}]`);
      const details = entry.details === undefined
        ? undefined
        : Array.isArray(entry.details)
          ? entry.details.map((detail, detailIndex) => {
              const value = requiredRecord(detail, `${label}.entries[${index}].details[${detailIndex}]`);
              return {
                label: requiredString(value.label, `${label}.entries[${index}].details[${detailIndex}].label`),
                value: requiredString(value.value, `${label}.entries[${index}].details[${detailIndex}].value`),
              };
            })
          : (() => { throw new Error(`${label}.entries[${index}].details must be an array.`); })();
      return {
        title: requiredString(entry.title, `${label}.entries[${index}].title`),
        ...(optionalValidatedString(entry.body, `${label}.entries[${index}].body`)
          ? { body: optionalValidatedString(entry.body, `${label}.entries[${index}].body`) }
          : {}),
        ...(details && details.length > 0 ? { details } : {}),
      };
    }),
  };
};

const parseSystemBadge = (value: unknown, label: string): SystemPromptBadge | undefined => {
  if (value === undefined || value === null) return undefined;
  const badge = requiredRecord(value, label);
  return {
    label: requiredString(badge.label, `${label}.label`),
    value: requiredString(badge.value, `${label}.value`),
  };
};

const parseSystemChanges = (value: unknown, label: string): SystemPromptChange[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((item, index) => {
    const change = requiredRecord(item, `${label}[${index}]`);
    const direction = requiredString(change.direction, `${label}[${index}].direction`);
    if (direction !== "gain" && direction !== "loss") {
      throw new Error(`${label}[${index}].direction is unsupported.`);
    }
    const tone = optionalValidatedString(change.tone, `${label}[${index}].tone`);
    if (tone && !["positive", "uncertain", "warning", "negative"].includes(tone)) {
      throw new Error(`${label}[${index}].tone is unsupported.`);
    }
    return {
      direction,
      label: requiredString(change.label, `${label}[${index}].label`),
      ...(tone ? { tone: tone as SystemPromptChange["tone"] } : {}),
    };
  });
};

const parseSystemStatus = (value: unknown, label: string): SystemStatusScreen | undefined => {
  if (value === undefined || value === null) return undefined;
  const status = requiredRecord(value, label);
  const level = optionalValidatedString(status.level, `${label}.level`);
  const bars = status.bars === undefined
    ? undefined
    : Array.isArray(status.bars)
      ? status.bars.map((item, index) => {
          const bar = requiredRecord(item, `${label}.bars[${index}]`);
          const tone = requiredString(bar.tone, `${label}.bars[${index}].tone`);
          if (!["health", "spirit", "progress"].includes(tone)) {
            throw new Error(`${label}.bars[${index}].tone is unsupported.`);
          }
          const barValue = optionalFiniteNumber(bar.value, `${label}.bars[${index}].value`);
          const max = optionalFiniteNumber(bar.max, `${label}.bars[${index}].max`);
          if (barValue === undefined || max === undefined || max <= 0) {
            throw new Error(`${label}.bars[${index}] requires finite value and positive max numbers.`);
          }
          const display = optionalValidatedString(bar.display, `${label}.bars[${index}].display`);
          return {
            label: requiredString(bar.label, `${label}.bars[${index}].label`),
            value: barValue,
            max,
            tone: tone as "health" | "spirit" | "progress",
            ...(display ? { display } : {}),
          };
        })
      : (() => { throw new Error(`${label}.bars must be an array.`); })();
  const stats = status.stats === undefined
    ? undefined
    : Array.isArray(status.stats)
      ? status.stats.map((item, index) => {
          const stat = requiredRecord(item, `${label}.stats[${index}]`);
          const delta = optionalFiniteNumber(stat.delta, `${label}.stats[${index}].delta`);
          return {
            label: requiredString(stat.label, `${label}.stats[${index}].label`),
            value: requiredString(stat.value, `${label}.stats[${index}].value`),
            ...(delta !== undefined ? { delta } : {}),
          };
        })
      : (() => { throw new Error(`${label}.stats must be an array.`); })();
  const effects = status.effects === undefined
    ? undefined
    : Array.isArray(status.effects)
      ? status.effects.map((item, index) => {
          const effect = requiredRecord(item, `${label}.effects[${index}]`);
          const tone = optionalValidatedString(effect.tone, `${label}.effects[${index}].tone`);
          if (tone && tone !== "positive" && tone !== "negative") {
            throw new Error(`${label}.effects[${index}].tone is unsupported.`);
          }
          const detail = optionalValidatedString(effect.detail, `${label}.effects[${index}].detail`);
          const effectValue = optionalValidatedString(effect.value, `${label}.effects[${index}].value`);
          return {
            name: requiredString(effect.name, `${label}.effects[${index}].name`),
            ...(detail ? { detail } : {}),
            ...(effectValue ? { value: effectValue } : {}),
            ...(tone ? { tone: tone as "positive" | "negative" } : {}),
          };
        })
      : (() => { throw new Error(`${label}.effects must be an array.`); })();
  const abilities = status.abilities === undefined
    ? undefined
    : Array.isArray(status.abilities)
      ? status.abilities.map((item, index) => {
          const ability = requiredRecord(item, `${label}.abilities[${index}]`);
          const detail = optionalValidatedString(ability.detail, `${label}.abilities[${index}].detail`);
          return {
            name: requiredString(ability.name, `${label}.abilities[${index}].name`),
            ...(detail ? { detail } : {}),
          };
        })
      : (() => { throw new Error(`${label}.abilities must be an array.`); })();
  if (!level && !bars?.length && !stats?.length && !effects?.length && !abilities?.length) {
    throw new Error(`${label} must contain at least one supported status field.`);
  }
  return {
    ...(level ? { level } : {}),
    ...(bars?.length ? { bars } : {}),
    ...(stats?.length ? { stats } : {}),
    ...(effects?.length ? { effects } : {}),
    ...(abilities?.length ? { abilities } : {}),
  };
};

const parseSystemEvent = (value: unknown, label: string): SystemEvent | undefined => {
  if (value === undefined || value === null) return undefined;
  const event = requiredRecord(value, label);
  const kind = requiredString(event.kind, `${label}.kind`);
  if (!SYSTEM_EVENT_KINDS.includes(kind as (typeof SYSTEM_EVENT_KINDS)[number])) {
    throw new Error(`${label}.kind is unsupported.`);
  }
  if (kind === "fate_system_prompt" && (event.fateResult === undefined || event.fateResult === null)) {
    throw new Error(`${label} of kind 'fate_system_prompt' requires a fateResult payload.`);
  }
  if (kind === "system_prompt" && event.fateResult !== undefined && event.fateResult !== null) {
    throw new Error(`${label} of kind 'system_prompt' cannot accept a fateResult payload.`);
  }
  if (
    kind === "fate_system_prompt"
    && (event.presentation !== undefined || event.worldNotice !== undefined || event.status !== undefined)
  ) {
    throw new Error(`${label} of kind 'fate_system_prompt' cannot accept a presentation or worldNotice payload, or status data.`);
  }
  const rows = event.rows === undefined
    ? undefined
    : Array.isArray(event.rows)
      ? event.rows.map((item, index) => {
          const row = requiredRecord(item, `${label}.rows[${index}]`);
          if (row.trend !== undefined && row.trend !== "up" && row.trend !== "down") {
            throw new Error(`${label}.rows[${index}].trend is unsupported.`);
          }
          return {
            label: requiredString(row.label, `${label}.rows[${index}].label`),
            value: requiredString(row.value, `${label}.rows[${index}].value`),
            ...(row.trend === "up" || row.trend === "down"
              ? { trend: row.trend as "up" | "down" }
              : {}),
          };
        })
      : (() => { throw new Error(`${label}.rows must be an array.`); })();
  const promptType = optionalValidatedString(event.promptType, `${label}.promptType`);
  const fateResult = event.fateResult === undefined
    ? undefined
    : (() => {
        const result = requiredRecord(event.fateResult, `${label}.fateResult`);
        const outcome = requiredString(result.outcome, `${label}.fateResult.outcome`);
        if (!FATE_RESULT_OUTCOMES.includes(outcome as (typeof FATE_RESULT_OUTCOMES)[number])) {
          throw new Error(`${label}.fateResult.outcome is unsupported.`);
        }
        return {
          outcome: outcome as (typeof FATE_RESULT_OUTCOMES)[number],
          timelineScar: requiredString(result.timelineScar, `${label}.fateResult.timelineScar`),
          permanentCosts: stringArray(result.permanentCosts, `${label}.fateResult.permanentCosts`),
          ...(optionalValidatedString(result.newStoryState, `${label}.fateResult.newStoryState`) ? { newStoryState: optionalValidatedString(result.newStoryState, `${label}.fateResult.newStoryState`) } : {}),
          ...(result.newActiveStats === undefined ? {} : { newActiveStats: stringArray(result.newActiveStats, `${label}.fateResult.newActiveStats`) }),
          ...(optionalValidatedString(result.genreShift, `${label}.fateResult.genreShift`) ? { genreShift: optionalValidatedString(result.genreShift, `${label}.fateResult.genreShift`) } : {}),
        };
      })();

  const title = requiredString(event.title, `${label}.title`);
  const validatedPromptType = promptType && SYSTEM_PROMPT_TYPES.includes(promptType as (typeof SYSTEM_PROMPT_TYPES)[number])
    ? (promptType as SystemEvent["promptType"])
    : undefined;
  const validatedRarity = optionalValidatedString(event.rarity, `${label}.rarity`);
  const badge = parseSystemBadge(event.badge, `${label}.badge`);
  const changes = parseSystemChanges(event.changes, `${label}.changes`);

  if (kind === "fate_system_prompt") {
    if (!fateResult) {
      throw new Error(`Invalid chapter model payload: ${label}.fateResult is required for fate_system_prompt.`);
    }
    return {
      kind: "fate_system_prompt",
      title,
      ...(validatedPromptType ? { promptType: validatedPromptType } : {}),
      ...(rows ? { rows } : {}),
      ...(validatedRarity ? { rarity: validatedRarity } : {}),
      ...(badge ? { badge } : {}),
      ...(changes?.length ? { changes } : {}),
      fateResult,
    };
  }

  if (!validatedPromptType) {
    throw new Error(`${label}.promptType is required and must be supported for system_prompt.`);
  }

  const receivedPresentation = requiredString(event.presentation, `${label}.presentation`);
  if (!SYSTEM_PROMPT_PRESENTATIONS.includes(
    receivedPresentation as (typeof SYSTEM_PROMPT_PRESENTATIONS)[number],
  )) {
    throw new Error(`${label}.presentation is unsupported.`);
  }
  const presentation = receivedPresentation as SystemPromptPresentation;
  const flavor = optionalValidatedString(event.flavor, `${label}.flavor`);
  const worldNotice = presentation === "world_notice"
    ? parseWorldNotice(event.worldNotice, `${label}.worldNotice`)
    : undefined;
  if (presentation !== "world_notice" && event.worldNotice !== undefined && event.worldNotice !== null) {
    throw new Error(`${label}.worldNotice requires presentation 'world_notice'.`);
  }
  const status = presentation === "mechanical"
    ? parseSystemStatus(event.status, `${label}.status`)
    : undefined;
  if (presentation !== "mechanical" && event.status !== undefined && event.status !== null) {
    throw new Error(`${label}.status requires presentation 'mechanical'.`);
  }

  return {
    kind: "system_prompt",
    title,
    promptType: validatedPromptType,
    ...(flavor ? { flavor } : {}),
    ...(rows ? { rows } : {}),
    ...(validatedRarity ? { rarity: validatedRarity } : {}),
    ...(badge ? { badge } : {}),
    ...(changes?.length ? { changes } : {}),
    presentation,
    ...(worldNotice ? { worldNotice } : {}),
    ...(status ? { status } : {}),
  };
};

const sanitizeStoryBlock = (
  value: JsonRecord,
  index: number,
  chapterNumber: number,
): StoryBlock => {
  const id = `c${chapterNumber}-p${index + 1}`;
  const returnedType = requiredString(value.type, `Manifest Chapter block ${index + 1} type`);
  const text = requiredString(value.text, `Manifest Chapter block '${id}' text`);
  const metadata = parseBlockMetadata(
    value.metadata,
    `Manifest Chapter block '${id}' metadata`,
    id,
    text,
  );
  const system = parseSystemEvent(value.system, `Manifest Chapter block '${id}' system`);
  const type = returnedType === "paragraph" || returnedType === "dialogue"
    ? returnedType
    : returnedType === "narration"
      ? "paragraph"
      : returnedType === "system" && system
        ? "paragraph"
        : metadata?.mode === "dialogue"
            ? "dialogue"
            : undefined;
  if (!type) {
    throw new Error(`Manifest Chapter block '${id}' has unsupported type '${returnedType}'.`);
  }
  return {
    id,
    type,
    text,
    ...(metadata ? { metadata } : {}),
    ...(system ? { system } : {}),
  };
};

export function parseManifestedChapter(
  text: string,
  input: ManifestChapterInput | RepairChapterInput,
): ChapterContent {
  const cleaned = cleanModelEnvelope(text)
    .replace(/^\s*---CHAPTER_BLOCKS---\s*/i, "")
    .trim();
  const rawBlocks = extractBalancedObjects(cleaned);
  if (rawBlocks.length === 0) {
    throw new Error("Manifest Chapter returned no readable NDJSON blocks.");
  }
  if (rawBlocks.length > 500) {
    throw new Error("Manifest Chapter returned too many blocks.");
  }
  const chapterNumber = input.chapterPacket.chapterMission.number;
  const blocks = rawBlocks.map((block, index) => sanitizeStoryBlock(
    block,
    index,
    chapterNumber,
  ));
  const generatedContent = blocks.map(block => block.text).join("\n\n");
  const title = input.chapterPacket.storyConstitution.worldBlueprint?.title
    || input.chapterPacket.chapterMission.title;
  const storyId = `development-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "story"}`;

  return {
    storyId,
    chapterNumber: input.chapterPacket.chapterMission.number,
    generatedContent,
    blocks,
  };
}

const parseFindingList = (value: unknown, label: string): ChapterProcessingFinding[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((item, index) => {
    const finding = requiredRecord(item, `${label}[${index}]`);
    const severity = requiredString(finding.severity, `${label}[${index}].severity`);
    if (severity !== "info" && severity !== "warning" && severity !== "serious") {
      throw new Error(`${label}[${index}].severity is unsupported.`);
    }
    return {
      severity,
      code: requiredString(finding.code, `${label}[${index}].code`),
      message: requiredString(finding.message, `${label}[${index}].message`),
    };
  });
};

const parseAnchors = (value: unknown): SceneAnchors | undefined => {
  if (!isRecord(value)) return undefined;
  const anchors = {
    worldBuilding: optionalString(value.worldBuilding),
    conflict: optionalString(value.conflict),
    progression: optionalString(value.progression),
  };
  return anchors.worldBuilding && anchors.conflict && anchors.progression
    ? anchors as SceneAnchors
    : undefined;
};

const buildProposedState = (
  input: ProcessChapterInput,
  handoff: ChapterHandoff,
  newAnchors: SceneAnchors,
  unresolved: Array<{ description: string; originChapter: number }>,
  completedThreads: string[],
  changedThreads: string[],
  characterChanges: string[],
  worldStateChanges: string[],
  characterStateUpdates: LivingStoryCharacterStateUpdate,
  codexUpdates: LivingStoryCodexUpdates,
  normalizedCreatureCodex: Pick<
    ReturnType<typeof normalizeCreatureCodexRecords>,
    "characters" | "bestiary"
  >,
) => {
  const current = input.chapterPacket.livingStoryState;
  return {
    ...current,
    position: createArcChapterPosition(
      input.chapterPacket.chapterMission.number + 1,
      current.position.chaptersInArc,
    ),
    contextBlocks: [
      ...current.contextBlocks.map(block => ({ ...block })),
      {
        kind: "recent-summary" as const,
        chapterNumber: input.manifestedChapter.chapterNumber,
        text: input.manifestedChapter.generatedContent,
      },
    ],
    previousHandoff: handoff,
    recentFingerprints: [
      ...current.recentFingerprints.map(fingerprint => ({ ...fingerprint })),
      ...handoff.fingerprints.map(fingerprint => ({ ...fingerprint })),
    ],
    characterState: {
      ...current.characterState,
      currentPowerStage: characterStateUpdates.currentPowerStage
        ?? current.characterState.currentPowerStage,
      abilities: mergeCarriedValues(
        current.characterState.abilities.map(ability => stripModelPrivateFields(ability)),
        characterStateUpdates.abilities,
      ),
    },
    threads: {
      unresolved,
      resolved: Array.from(new Set([...current.threads.resolved, ...completedThreads])),
    },
    codex: {
      characters: normalizedCreatureCodex.characters.map(entry => structuredClone(entry)),
      bestiary: normalizedCreatureCodex.bestiary.map(entry => structuredClone(entry)),
      factions: mergeCarriedRecords(current.codex.factions, codexUpdates.factions),
      locations: mergeCarriedRecords(current.codex.locations, codexUpdates.locations),
      artifacts: mergeCarriedRecords(current.codex.artifacts, codexUpdates.artifacts),
    },
    scene: {
      ...current.scene,
      recentSceneTypes: appendSceneType(
        current.scene.recentSceneTypes,
        input.chapterPlan.resolvedSceneType,
      ),
      carriedAnchors: newAnchors,
    },
    carriedChanges: [
      ...(current.carriedChanges ?? []).map(entry => (
        stripModelPrivateFields(entry) as typeof entry
      )),
      {
        chapterNumber: input.chapterPacket.chapterMission.number,
        characterChanges: [...characterChanges],
        worldStateChanges: [...worldStateChanges],
        threadChanges: [...changedThreads],
        completedThreads: [...completedThreads],
        characterStateUpdates: structuredClone(characterStateUpdates),
        codexUpdates: structuredClone(codexUpdates),
      },
    ],
  };
};

const recordIdentity = (value: JsonRecord): string | undefined => {
  for (const field of ["id", "name", "title", "label", "slug"] as const) {
    const candidate = value[field];
    if (typeof candidate === "string" && candidate.trim()) {
      return `${field}:${candidate.trim().toLowerCase()}`;
    }
  }
  return undefined;
};

const mergeCarriedRecords = (
  current: JsonRecord[],
  updates: JsonRecord[],
): JsonRecord[] => {
  const merged = current.map(entry => structuredClone(entry));
  for (const update of updates) {
    const copied = structuredClone(update);
    const identity = recordIdentity(copied);
    const index = identity
      ? merged.findIndex(entry => recordIdentity(entry) === identity)
      : -1;
    if (index >= 0) merged[index] = { ...merged[index], ...copied };
    else if (!merged.some(entry => JSON.stringify(entry) === JSON.stringify(copied))) merged.push(copied);
  }
  return merged;
};

const mergeCarriedValues = (current: unknown[], updates: unknown[]): unknown[] => {
  const merged: unknown[] = [];
  const unkeyed = new Set<string>();
  for (const value of [...current, ...updates]) {
    if (isRecord(value)) {
      const copied = structuredClone(value);
      const identity = recordIdentity(copied);
      const index = identity
        ? merged.findIndex(entry => isRecord(entry) && recordIdentity(entry) === identity)
        : -1;
      if (index >= 0) {
        merged[index] = { ...(merged[index] as JsonRecord), ...copied };
        continue;
      }
      const serialized = JSON.stringify(copied);
      if (merged.some(entry => isRecord(entry) && JSON.stringify(entry) === serialized)) continue;
      merged.push(copied);
      continue;
    }
    const serialized = JSON.stringify(value);
    if (unkeyed.has(serialized)) continue;
    unkeyed.add(serialized);
    merged.push(structuredClone(value));
  }
  return merged;
};

const threadKey = (description: string): string => description.trim().toLocaleLowerCase();

const mergeUnresolvedThreads = (
  current: Array<{ description: string; originChapter: number }>,
  reported: Array<{ description: string; originChapter: number }>,
  completed: string[],
): Array<{ description: string; originChapter: number }> => {
  const completedKeys = new Set(completed.map(threadKey));
  const merged = new Map<string, { description: string; originChapter: number }>();
  for (const thread of [...current, ...reported]) {
    const key = threadKey(thread.description);
    if (!key || completedKeys.has(key) || merged.has(key)) continue;
    merged.set(key, { ...thread });
  }
  return [...merged.values()];
};

export function parseProcessingResult(
  text: string,
  input: ProcessChapterInput,
): ChapterProcessingResult {
  const value = parseStructuredModelJson(text, "Process Result");
  const threads = requiredRecord(value.threads, "Process Result threads");
  const unresolvedValue = Array.isArray(threads.unresolved) ? threads.unresolved : [];
  const reportedUnresolved = unresolvedValue.map((item, index) => {
    const thread = requiredRecord(item, `Process Result threads.unresolved[${index}]`);
    const originChapter = Number(thread.originChapter);
    if (!Number.isInteger(originChapter) || originChapter < 1) {
      throw new Error(`Process Result threads.unresolved[${index}].originChapter must be positive.`);
    }
    return {
      description: requiredString(
        thread.description,
        `Process Result threads.unresolved[${index}].description`,
      ),
      originChapter,
    };
  });
  const missionCompletion = requiredRecord(
    value.missionCompletion,
    "Process Result missionCompletion",
  );
  const rawHandoff = requiredRecord(value.nextChapterHandoff, "Process Result nextChapterHandoff");
  const nextChapterHandoff = sanitizeChapterHandoff(
    rawHandoff,
    input.chapterPacket.chapterMission.number,
  );
  if (!nextChapterHandoff) {
    throw new Error("Process Result returned an empty next-chapter handoff.");
  }
  const newAnchors = parseAnchors(value.newAnchors) ?? deriveSceneAnchors({
    handoff: nextChapterHandoff,
    worldBuildingSeed: input.chapterPacket.livingStoryState.scene.worldBuildingSeed,
  });
  const completed = stringArray(threads.completed, "Process Result threads.completed");
  const changed = stringArray(threads.changed, "Process Result threads.changed");
  const unresolved = mergeUnresolvedThreads(
    input.chapterPacket.livingStoryState.threads.unresolved,
    reportedUnresolved,
    completed,
  );
  const characterChanges = stringArray(value.characterChanges, "Process Result characterChanges");
  const worldStateChanges = stringArray(value.worldStateChanges, "Process Result worldStateChanges");
  const characterStateValue = requiredRecord(
    value.characterStateUpdates,
    "Process Result characterStateUpdates",
  );
  const currentPowerStage = optionalString(characterStateValue.currentPowerStage);
  const characterStateUpdates: LivingStoryCharacterStateUpdate = {
    ...(currentPowerStage ? { currentPowerStage } : {}),
    abilities: unknownArray(
      characterStateValue.abilities,
      "Process Result characterStateUpdates.abilities",
    ).map(ability => stripModelPrivateFields(ability)),
  };
  const codexValue = requiredRecord(value.codexUpdates, "Process Result codexUpdates");
  const normalizedCreatureCodex = normalizeCreatureCodexRecords({
    currentCharacters: input.chapterPacket.livingStoryState.codex.characters,
    currentBestiary: input.chapterPacket.livingStoryState.codex.bestiary ?? [],
    characterUpdates: sanitizedRecordArray(
      codexValue.characters,
      "Process Result codexUpdates.characters",
    ),
    bestiaryUpdates: sanitizedRecordArray(
      codexValue.bestiary,
      "Process Result codexUpdates.bestiary",
    ),
    chapterNumber: input.chapterPacket.chapterMission.number,
  });
  const dialogueSpeakers = (input.manifestedChapter.blocks ?? []).flatMap(block => {
    const speakerName = block.metadata?.speakerName?.trim();
    return block.type === "dialogue"
      && speakerName
      ? [{ speakerName }]
      : [];
  });
  const characterVoices = assignCharacterVoices({
    characters: normalizedCreatureCodex.characters,
    dialogueSpeakers,
  });
  const normalizedCodexWithVoices = {
    characters: characterVoices.characters,
    bestiary: normalizedCreatureCodex.bestiary,
  };
  const codexUpdates: LivingStoryCodexUpdates = {
    characters: mergeCarriedRecords(
      normalizedCreatureCodex.characterUpdates,
      characterVoices.changedCharacters,
    ),
    bestiary: normalizedCreatureCodex.bestiaryUpdates,
    factions: sanitizedRecordArray(codexValue.factions, "Process Result codexUpdates.factions"),
    locations: sanitizedRecordArray(codexValue.locations, "Process Result codexUpdates.locations"),
    artifacts: sanitizedRecordArray(codexValue.artifacts, "Process Result codexUpdates.artifacts"),
  };

  return {
    version: 1,
    newAnchors,
    characterChanges,
    worldStateChanges,
    characterStateUpdates,
    codexUpdates,
    threads: {
      completed,
      changed,
      unresolved,
    },
    missionCompletion: {
      completed: requiredBoolean(
        missionCompletion.completed,
        "Process Result missionCompletion.completed",
      ),
      evidence: requiredString(
        missionCompletion.evidence,
        "Process Result missionCompletion.evidence",
      ),
    },
    continuityFindings: parseFindingList(
      value.continuityFindings,
      "Process Result continuityFindings",
    ),
    repetitionFindings: parseFindingList(
      value.repetitionFindings,
      "Process Result repetitionFindings",
    ),
    identityWarnings: normalizedCreatureCodex.identityWarnings,
    nextChapterHandoff,
    proposedLivingStoryState: buildProposedState(
      input,
      nextChapterHandoff,
      newAnchors,
      unresolved,
      completed,
      changed,
      characterChanges,
      worldStateChanges,
      characterStateUpdates,
      codexUpdates,
      normalizedCodexWithVoices,
    ),
    repairRecommended: requiredBoolean(
      value.repairRecommended,
      "Process Result repairRecommended",
    ),
  };
}

const planSystemInstruction = (input: PlanChapterInput) => `You are the Plan Chapter boundary for Chapter Generation 1.0.
Return one strict JSON object and no prose. Use the complete Chapter Packet exactly as supplied.
Decide chapter-specific rhythm, scene type, Fate Survival application, effects, progression, pacing, ending, and next handoff target together.
Copy Fate Survival visibility and pressure from the Story Constitution. If Fate Survival is disabled, applies must be false.
Do not invent a legacy FatePressureTier when planningSignals does not provide one; omit selectedPressureTier in that case.
For Chapter 1 without carried anchors, omit selectedScenePath and choose resolvedSceneType from worldBuilding, conflict, or progression.
The response chapterNumber must be ${input.chapterPacket.chapterMission.number} and arcChapterPosition must be ${JSON.stringify(input.chapterPacket.arcChapterPosition.display)}. Copy both exact values; do not use a prior chapter number from the story history.
Required shape for this request:
{"version":1,"chapterNumber":${input.chapterPacket.chapterMission.number},"arcChapterPosition":${JSON.stringify(input.chapterPacket.arcChapterPosition.display)},"rhythmResponse":{"recentSceneTypes":[],"direction":"..."},"resolvedSceneType":"worldBuilding","fateSurvival":{"configured":true,"applies":false,"visibility":"partial","pressure":"immortal","approach":"..."},"effects":[{"kind":"narration-metadata","intent":"...","required":true}],"sceneProgression":[{"order":1,"purpose":"...","pacing":"..."}],"pacing":{"directive":"...","shape":"..."},"intendedEnding":"...","nextChapterHandoffTarget":"..."}`;

const PROCESS_SYSTEM = `You are the Process Result boundary for Chapter Generation 1.0.
Inspect the manifested chapter against the exact Chapter Packet and Chapter Plan. Return one strict JSON object and no prose.
Report new anchors, character/world changes, explicit character-state and Codex-like updates, thread changes, mission evidence, continuity and repetition findings, a complete next-chapter handoff, and whether repair is genuinely required.
characterChanges, worldStateChanges, threads.completed, and threads.changed must each be arrays of plain strings; use [] when there are no entries.
characterStateUpdates.abilities and every codexUpdates collection must be arrays; use [] when there are no structured updates. Return currentPowerStage only when it genuinely changed. Preserve every discovered character, faction, location, artifact, or ability update in the matching structured collection as a JSON record.
Use "creature" as the canonical term. The codexUpdates.bestiary collection holds whole-species records only: name, short description, classification, traits, threatLevel, and signatureSound when known. A species encounter updates its Bestiary entry even when no individual matters enough for a Portrait. Never put a generic, disposable, or one-scene creature in codexUpdates.characters.
codexUpdates.characters holds persistent individuals. Set portraitKind to "non-human" only for an important named creature, bonded pet, companion, recurring monster, intelligent creature with lasting identity, or other non-human individual; intelligence alone is not enough. When a non-human Character speaks dialogue, include explicit creatureProfile.intelligence evidence such as "sapient" or "human-like"; a name or Portrait alone does not make it voice-eligible. A non-human individual may include speciesName when it belongs to a real species. If both are new, include the species in bestiary and the individual in characters. A unique individual without a real species has no speciesName. Human characters use portraitKind "human". Bestiary species and Factions are informational records only; never propose generated Codex artwork or visual-manifestation state for either collection.
Never return voiceKey, voicePresetId, voiceId, voice_id, providerVoiceId, provider_voice_id, providerId, provider credentials, URLs, filenames, file paths, storage keys, asset IDs, catalog IDs or entries, internal Codex IDs, speciesId, notableIndividualIds, encounter chapters, first-encounter values, or provenance. The application assigns identities, resolves media, encounter history, and links itself.
Use severity "serious" only for a defect that requires rewriting the manifested chapter. Set repairRecommended true only when at least one serious finding exists; do not force repair on a healthy run.
The server clones and advances Living Story State from this structured result; do not return a proposedLivingStoryState object.
Required shape:
{"version":1,"newAnchors":{"worldBuilding":"...","conflict":"...","progression":"..."},"characterChanges":[],"worldStateChanges":[],"characterStateUpdates":{"abilities":[]},"codexUpdates":{"characters":[{"name":"...","portraitKind":"human"}],"bestiary":[{"name":"...","description":"...","classification":"...","traits":[],"threatLevel":"...","signatureSound":"..."}],"factions":[],"locations":[],"artifacts":[]},"threads":{"completed":[],"changed":[],"unresolved":[{"description":"...","originChapter":1}]},"missionCompletion":{"completed":true,"evidence":"..."},"continuityFindings":[],"repetitionFindings":[],"nextChapterHandoff":{"version":1,"chapterNumber":1,"endState":{"location":"...","timeMarker":"...","charactersPresent":[],"mcCondition":"...","openTension":"..."},"completedEvents":[],"nextImmediateAction":"...","fingerprints":[{"actionType":"other","participants":[],"location":"...","outcome":"...","chapterNumber":1}]},"repairRecommended":false}`;

/** Model-visible serialization omits canonical provider and media selectors. */
const packetJson = (value: unknown) => JSON.stringify(
  value,
  (field, nested) => (field && isModelPrivateField(field) ? undefined : nested),
  2,
);

const estimateStageInputBreakdown = (
  input: PlanChapterInput | ManifestChapterInput | ProcessChapterInput | RepairChapterInput,
  systemPrompts: string,
): EstimatedStageInputTokenBreakdown => {
  const { worldBlueprint, ...seedAndConstitution } = input.chapterPacket.storyConstitution;
  const { pacingDirective, ...chapterMission } = input.chapterPacket.chapterMission;
  const estimates = {
    storySeedConstitution: estimateTokens(packetJson(seedAndConstitution)),
    blueprint: estimateTokens(packetJson(worldBlueprint ?? {})),
    livingStoryState: estimateTokens(packetJson(input.chapterPacket.livingStoryState)),
    chapterMission: estimateTokens(packetJson(chapterMission)),
    generationRules: estimateTokens(packetJson(input.chapterPacket.generationRules)),
    userInstruction: pacingDirective.trim() ? estimateTokens(pacingDirective) : 0,
    systemPrompts: estimateTokens(systemPrompts),
  };
  return {
    source: "estimated",
    ...estimates,
    total: Object.values(estimates).reduce((total, value) => total + value, 0),
  };
};

export interface LiveChapterModelCalls {
  model: AsyncChapterGenerationModelCalls;
  usage: ChapterModelCallUsage[];
}

export function createLiveChapterModelCalls(
  provider: ChapterTextModelProvider,
  options: { temperature: number; maxOutputTokens: number; timeoutMs?: number },
): LiveChapterModelCalls {
  const usage: ChapterModelCallUsage[] = [];
  let processCallCount = 0;

  const generate = async (request: Parameters<ChapterTextModelProvider["generate"]>[0]) => {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? 90_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await provider.generate({
        ...request,
        abortSignal: controller.signal,
      });
      usage.push({
        ...result.usage,
        ...(request.estimatedInputBreakdown
          ? { estimatedInputBreakdown: request.estimatedInputBreakdown }
          : {}),
      });
      return result.text;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`${request.stage} exceeded the ${Math.round(timeoutMs / 1_000)} second Development deadline.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    usage,
    model: {
      async planChapter(input) {
        const systemInstruction = planSystemInstruction(input);
        const response = await generate({
          kind: "plan",
          stage: "Plan Chapter",
          systemInstruction,
          userPrompt: `PLANNING SIGNALS\n${packetJson(input.planningSignals)}\n\nCOMPLETE CHAPTER PACKET\n${packetJson(input.chapterPacket)}`,
          responseFormat: "json",
          temperature: Math.min(options.temperature, 0.5),
          maxOutputTokens: Math.min(options.maxOutputTokens, 4_096),
          estimatedInputBreakdown: estimateStageInputBreakdown(input, systemInstruction),
        });
        return asModelResponseValidation(() => parseChapterPlan(response, input));
      },

      async manifestChapter(input) {
        const systemInstruction = `${input.consolidatedPermanentInstructions}\n\n=== LIVE MANIFEST BOUNDARY ===\nWrite one complete chapter from the exact packet and plan below. Return only ---CHAPTER_BLOCKS--- followed by NDJSON blocks. Every block must contain a \"type\" exactly equal to \"paragraph\" or \"dialogue\" and non-empty prose \"text\". Do not output block IDs; the application assigns stable chapter-position IDs after validation. A System Panel event remains a paragraph block with its structured sibling object. Do not return a summary, state update, plan, word count, run identity, or analysis.`;
        const response = await generate({
          kind: "manifest",
          stage: "Manifest Chapter",
          systemInstruction,
          userPrompt: `COMPLETE CHAPTER PACKET\n${packetJson(input.chapterPacket)}\n\nCHAPTER PLAN\n${packetJson(input.chapterPlan)}`,
          responseFormat: "text",
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
          estimatedInputBreakdown: estimateStageInputBreakdown(input, systemInstruction),
        });
        return asModelResponseValidation(() => parseManifestedChapter(response, input));
      },

      async processResult(input) {
        processCallCount += 1;
        const stage = processCallCount === 1
          ? "Process Result" as const
          : "Process Result (repaired chapter)" as const;
        const response = await generate({
          kind: "process",
          stage,
          systemInstruction: PROCESS_SYSTEM,
          userPrompt: `COMPLETE CHAPTER PACKET\n${packetJson(input.chapterPacket)}\n\nCHAPTER PLAN\n${packetJson(input.chapterPlan)}\n\nMANIFESTED CHAPTER\n${packetJson(input.manifestedChapter)}`,
          responseFormat: "json",
          temperature: Math.min(options.temperature, 0.35),
          maxOutputTokens: Math.min(options.maxOutputTokens, 6_144),
          estimatedInputBreakdown: estimateStageInputBreakdown(input, PROCESS_SYSTEM),
        });
        return asModelResponseValidation(() => parseProcessingResult(response, input));
      },

      async repairChapter(input) {
        const systemInstruction = `${input.chapterPacket.generationRules.permanentWritingInstructions}\n\n=== SERIOUS-ISSUE REPAIR ===\nRewrite the complete chapter only to correct the serious processing findings. Preserve sound prose and all canon that is not implicated. Return only ---CHAPTER_BLOCKS--- followed by the full repaired NDJSON chapter. Every block must contain a \"type\" exactly equal to \"paragraph\" or \"dialogue\" and non-empty prose \"text\". Do not output block IDs; the application assigns stable chapter-position IDs after validation. A System Panel event remains a paragraph block with its structured sibling object.`;
        const response = await generate({
          kind: "repair",
          stage: "Repair Chapter",
          systemInstruction,
          userPrompt: `COMPLETE CHAPTER PACKET\n${packetJson(input.chapterPacket)}\n\nCHAPTER PLAN\n${packetJson(input.chapterPlan)}\n\nSERIOUS PROCESSING RESULT\n${packetJson(input.processingResult)}\n\nORIGINAL MANIFESTED CHAPTER\n${packetJson(input.manifestedChapter)}`,
          responseFormat: "text",
          temperature: Math.min(options.temperature, 0.6),
          maxOutputTokens: options.maxOutputTokens,
          estimatedInputBreakdown: estimateStageInputBreakdown(input, systemInstruction),
        });
        return asModelResponseValidation(() => parseManifestedChapter(response, input));
      },
    },
  };
}
