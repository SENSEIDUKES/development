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
  type LivingStoryCodex,
  type LivingStoryCodexUpdates,
} from "../../components/chapter-generation/shared/packets/livingStoryState";
import {
  canonicalLivingStoryEntityKey,
  ensureStableLivingStoryEntityIds,
  mergeLivingStoryValues,
  reconcileLivingStoryRecords,
  type LivingStoryIdentityWarning,
} from "../../components/chapter-generation/shared/packets/livingStoryEntityIdentity";
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
import type {
  ChapterHandoff,
  ChapterContent,
} from "../../components/chapter-generation/shared/types";
import type { ChapterTextModelProvider } from "./provider";
import { normalizeManifestResponse } from "./manifestNormalizer";

const EFFECT_KINDS: ChapterEffectKind[] = [
  "narration-metadata",
  "beast-sound",
  "world-card",
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

const collectChapterPlanValidationIssues = (
  value: JsonRecord,
): ChapterGenerationValidationIssue[] => {
  const issues: ChapterGenerationValidationIssue[] = [];
  const add = (
    field: string,
    reason: string,
    expected?: string,
    received?: unknown,
  ) => issues.push({
    field,
    reason: received === undefined ? "is missing" : reason,
    ...(expected ? { expected } : {}),
    received: receivedValue(received),
  });
  const requiredText = (record: JsonRecord | undefined, field: string, path: string) => {
    const fieldValue = record?.[field];
    if (typeof fieldValue !== "string" || !fieldValue.trim()) {
      add(path, fieldValue === undefined ? "is missing" : "must be a non-empty string", "a non-empty string", fieldValue);
    }
  };
  const requiredBooleanField = (record: JsonRecord | undefined, field: string, path: string) => {
    const fieldValue = record?.[field];
    if (typeof fieldValue !== "boolean") {
      add(path, fieldValue === undefined ? "is missing" : "must be a boolean", "true or false", fieldValue);
    }
  };

  const rhythm = isRecord(value.rhythmResponse) ? value.rhythmResponse : undefined;
  if (!rhythm) add("rhythmResponse", "must be a JSON object", "an object", value.rhythmResponse);
  else requiredText(rhythm, "direction", "rhythmResponse.direction");

  if (typeof value.resolvedSceneType !== "string" || !SCENE_TYPES.includes(value.resolvedSceneType as SceneType)) {
    add("resolvedSceneType", "must be a supported scene type", SCENE_TYPES.join(" | "), value.resolvedSceneType);
  }

  if (isRecord(value.selectedScenePath)) {
    const scenePath = value.selectedScenePath;
    if (!isRecord(scenePath.weights)) {
      add("selectedScenePath.weights", "must be a JSON object", "an object", scenePath.weights);
    }
    if (typeof scenePath.type !== "string" || !SCENE_TYPES.includes(scenePath.type as SceneType)) {
      add("selectedScenePath.type", "must be a supported scene type", SCENE_TYPES.join(" | "), scenePath.type);
    }
    requiredText(scenePath, "anchor", "selectedScenePath.anchor");
    requiredText(scenePath, "reason", "selectedScenePath.reason");
    if (scenePath.blocked !== undefined && !Array.isArray(scenePath.blocked)) {
      add("selectedScenePath.blocked", "must be an array", "an array", scenePath.blocked);
    }
  }

  const fate = isRecord(value.fateSurvival) ? value.fateSurvival : undefined;
  if (!fate) add("fateSurvival", "must be a JSON object", "an object", value.fateSurvival);
  else {
    requiredBooleanField(fate, "applies", "fateSurvival.applies");
    requiredText(fate, "approach", "fateSurvival.approach");
  }

  if (!Array.isArray(value.effects)) {
    add("effects", "must be an array", "an array", value.effects);
  } else {
    value.effects.forEach((item, index) => {
      const effect = isRecord(item) ? item : undefined;
      if (!effect) {
        add(`effects[${index}]`, "must be a JSON object", "an object", item);
        return;
      }
      if (typeof effect.kind !== "string" || !EFFECT_KINDS.includes(effect.kind as ChapterEffectKind)) {
        add(`effects[${index}].kind`, "must be a supported effect kind", EFFECT_KINDS.join(" | "), effect.kind);
      }
      requiredText(effect, "intent", `effects[${index}].intent`);
      requiredBooleanField(effect, "required", `effects[${index}].required`);
    });
  }

  if (!Array.isArray(value.sceneProgression) || value.sceneProgression.length === 0) {
    add("sceneProgression", "must contain at least one scene", "a non-empty array", value.sceneProgression);
  } else {
    value.sceneProgression.forEach((item, index) => {
      const scene = isRecord(item) ? item : undefined;
      if (!scene) {
        add(`sceneProgression[${index}]`, "must be a JSON object", "an object", item);
        return;
      }
      requiredText(scene, "purpose", `sceneProgression[${index}].purpose`);
      requiredText(scene, "pacing", `sceneProgression[${index}].pacing`);
    });
  }

  const pacing = isRecord(value.pacing) ? value.pacing : undefined;
  if (!pacing) add("pacing", "must be a JSON object", "an object", value.pacing);
  else {
    requiredText(pacing, "directive", "pacing.directive");
    requiredText(pacing, "shape", "pacing.shape");
  }
  requiredText(value, "intendedEnding", "intendedEnding");
  requiredText(value, "nextChapterHandoffTarget", "nextChapterHandoffTarget");
  return issues;
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
  const validationIssues = collectChapterPlanValidationIssues(value);
  if (validationIssues.length > 0) throw new ChapterPlanValidationError(validationIssues);
  const rhythm = requiredRecord(value.rhythmResponse, "ChapterPlan.rhythmResponse");
  const selectedPressureTier = input.planningSignals.fatePressureTier;
  const fate = requiredRecord(value.fateSurvival, "ChapterPlan.fateSurvival");
  const canonicalFate = input.chapterPacket.storyConstitution.fateSurvival;
  const requestedFateApplication = requiredBoolean(
    fate.applies,
    "ChapterPlan.fateSurvival.applies",
  );
  const progression = Array.isArray(value.sceneProgression) ? value.sceneProgression : [];
  if (progression.length === 0) throw new Error("ChapterPlan.sceneProgression cannot be empty.");
  const pacing = requiredRecord(value.pacing, "ChapterPlan.pacing");
  return {
    version: 1,
    chapterNumber: input.chapterPacket.chapterMission.number,
    arcChapterPosition: input.chapterPacket.arcChapterPosition.display,
    rhythmResponse: {
      recentSceneTypes: [...input.chapterPacket.livingStoryState.scene.recentSceneTypes],
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

export function parseManifestedChapter(
  text: string,
  input: ManifestChapterInput | RepairChapterInput,
): ChapterContent {
  const chapterNumber = input.chapterPacket.chapterMission.number;
  const normalized = normalizeManifestResponse(text, chapterNumber);
  const title = input.chapterPacket.storyConstitution.worldBlueprint?.title
    || input.chapterPacket.chapterMission.title;
  const storyId = `development-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "story"}`;

  return {
    storyId,
    chapterNumber,
    generatedContent: normalized.generatedContent,
    wordCount: normalized.diagnostics.wordCount,
    manifestStatus: normalized.diagnostics.status,
    manifestDiagnostics: normalized.diagnostics,
    blocks: normalized.blocks,
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
  nextAbilities: unknown[],
  nextCodex: LivingStoryCodex,
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
      abilities: nextAbilities,
    },
    threads: {
      unresolved,
      resolved: mergeLivingStoryValues(
        current.threads.resolved,
        completedThreads,
      ) as string[],
    },
    codex: nextCodex,
    scene: {
      ...current.scene,
      recentSceneTypes: appendSceneType(
        current.scene.recentSceneTypes,
        input.chapterPlan.resolvedSceneType,
      ),
      carriedAnchors: newAnchors,
    },
    carriedChanges: [
      ...(current.carriedChanges ?? []).map(entry => structuredClone(entry)),
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

const threadKey = (description: string): string => canonicalLivingStoryEntityKey(description);

const mergeUnresolvedThreads = (
  current: Array<{ description: string; originChapter: number }>,
  reported: string[],
  completed: string[],
  chapterNumber: number,
): Array<{ description: string; originChapter: number }> => {
  const completedKeys = new Set(completed.map(threadKey));
  const merged = new Map<string, { description: string; originChapter: number }>();

  // Process Result can report a known thread in a different surface form, but
  // only the carried Living Story State owns its original provenance.
  for (const thread of current) {
    const key = threadKey(thread.description);
    if (!key || completedKeys.has(key) || merged.has(key)) continue;
    merged.set(key, { ...thread });
  }

  // A description that is not already carried is first introduced by the
  // chapter that just completed. Gemini never supplies canonical provenance.
  for (const description of reported) {
    const key = threadKey(description);
    if (!key || completedKeys.has(key) || merged.has(key)) continue;
    merged.set(key, { description, originChapter: chapterNumber });
  }

  return [...merged.values()];
};

const reconcileAbilityValues = (
  current: unknown[],
  updates: unknown[],
  chapterNumber: number,
): {
  values: unknown[];
  appliedUpdates: unknown[];
  warnings: LivingStoryIdentityWarning[];
} => {
  const currentRecords = current.filter(isRecord);
  const stableCurrentRecords = ensureStableLivingStoryEntityIds("ability", currentRecords);
  let recordIndex = 0;
  let values = current.map(value => (
    isRecord(value) ? stableCurrentRecords[recordIndex++] : structuredClone(value)
  ));
  const appliedUpdates: unknown[] = [];
  const warnings: LivingStoryIdentityWarning[] = [];

  for (const update of updates) {
    if (!isRecord(update)) {
      const merged = mergeLivingStoryValues(values, [update]);
      if (merged.length > values.length) appliedUpdates.push(structuredClone(update));
      values = merged;
      continue;
    }
    const beforeRecords = values.filter(isRecord);
    const reconciliation = reconcileLivingStoryRecords({
      entityKind: "ability",
      current: beforeRecords,
      updates: [update],
      chapterNumber,
    });
    warnings.push(...reconciliation.warnings);
    appliedUpdates.push(...reconciliation.appliedUpdates);
    let replacementIndex = 0;
    values = values.map(value => (
      isRecord(value)
        ? reconciliation.records[replacementIndex++]
        : value
    ));
    values.push(...reconciliation.records.slice(beforeRecords.length));
  }

  return {
    values,
    appliedUpdates,
    warnings,
  };
};

export function parseProcessingResult(
  text: string,
  input: ProcessChapterInput,
): ChapterProcessingResult {
  const value = parseStructuredModelJson(text, "Process Result");
  const threads = requiredRecord(value.threads, "Process Result threads");
  const unresolvedValue = Array.isArray(threads.unresolved) ? threads.unresolved : [];
  const reportedUnresolved = unresolvedValue.map((item, index) => {
    if (typeof item === "string") {
      return requiredString(
        item,
        `Process Result threads.unresolved[${index}]`,
      );
    }
    const thread = requiredRecord(item, `Process Result threads.unresolved[${index}]`);
    // Validate the model's only authoritative contribution: the thread text.
    // originChapter is intentionally ignored; canonical ownership lives in the
    // carried Living Story State and this completed chapter's number.
    return requiredString(
      thread.description,
      `Process Result threads.unresolved[${index}].description`,
    );
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
    input.chapterPacket.chapterMission.number,
  );
  const characterChanges = stringArray(value.characterChanges, "Process Result characterChanges");
  const worldStateChanges = stringArray(value.worldStateChanges, "Process Result worldStateChanges");
  const characterStateValue = requiredRecord(
    value.characterStateUpdates,
    "Process Result characterStateUpdates",
  );
  const currentPowerStage = optionalString(characterStateValue.currentPowerStage);
  const rawAbilities = unknownArray(
    characterStateValue.abilities,
    "Process Result characterStateUpdates.abilities",
  );
  const reconciledAbilities = reconcileAbilityValues(
    input.chapterPacket.livingStoryState.characterState.abilities,
    rawAbilities,
    input.chapterPacket.chapterMission.number,
  );
  const characterStateUpdates: LivingStoryCharacterStateUpdate = {
    ...(currentPowerStage ? { currentPowerStage } : {}),
    abilities: reconciledAbilities.appliedUpdates,
  };
  const codexValue = requiredRecord(value.codexUpdates, "Process Result codexUpdates");
  const rawCodexUpdates: LivingStoryCodexUpdates = {
    characters: recordArray(codexValue.characters, "Process Result codexUpdates.characters"),
    factions: recordArray(codexValue.factions, "Process Result codexUpdates.factions"),
    locations: recordArray(codexValue.locations, "Process Result codexUpdates.locations"),
    artifacts: recordArray(codexValue.artifacts, "Process Result codexUpdates.artifacts"),
  };
  const currentCodex = input.chapterPacket.livingStoryState.codex;
  const chapterNumber = input.chapterPacket.chapterMission.number;
  const reconciledCharacters = reconcileLivingStoryRecords({
    entityKind: "character",
    current: currentCodex.characters,
    updates: rawCodexUpdates.characters,
    chapterNumber,
  });
  const reconciledFactions = reconcileLivingStoryRecords({
    entityKind: "faction",
    current: currentCodex.factions,
    updates: rawCodexUpdates.factions,
    chapterNumber,
  });
  const reconciledLocations = reconcileLivingStoryRecords({
    entityKind: "location",
    current: currentCodex.locations,
    updates: rawCodexUpdates.locations,
    chapterNumber,
  });
  const reconciledArtifacts = reconcileLivingStoryRecords({
    entityKind: "artifact",
    current: currentCodex.artifacts,
    updates: rawCodexUpdates.artifacts,
    chapterNumber,
  });
  const codexUpdates: LivingStoryCodexUpdates = {
    characters: reconciledCharacters.appliedUpdates,
    factions: reconciledFactions.appliedUpdates,
    locations: reconciledLocations.appliedUpdates,
    artifacts: reconciledArtifacts.appliedUpdates,
  };
  const nextCodex: LivingStoryCodex = {
    characters: reconciledCharacters.records,
    factions: reconciledFactions.records,
    locations: reconciledLocations.records,
    artifacts: reconciledArtifacts.records,
  };
  const identityWarnings = [
    ...reconciledAbilities.warnings,
    ...reconciledCharacters.warnings,
    ...reconciledFactions.warnings,
    ...reconciledLocations.warnings,
    ...reconciledArtifacts.warnings,
  ];

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
    identityWarnings,
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
      reconciledAbilities.values,
      nextCodex,
    ),
    repairRecommended: requiredBoolean(
      value.repairRecommended,
      "Process Result repairRecommended",
    ),
  };
}

const planSystemInstruction = (input: PlanChapterInput) => `You are the Plan Chapter boundary for Chapter Generation 1.0.
Return one strict JSON object and no prose. Use the complete Chapter Packet exactly as supplied.
Plan Chapter ${input.chapterPacket.chapterMission.number} at ${input.chapterPacket.arcChapterPosition.display}; these values are authoritative request context, not response fields.
Decide chapter-specific rhythm, scene type, Fate Survival application, effects, progression, pacing, ending, and next handoff target together.
If Fate Survival is disabled, applies must be false. The server attaches its configured status, visibility, and pressure.
Do not invent a legacy FatePressureTier when planningSignals does not provide one; omit selectedPressureTier in that case.
For Chapter 1 without carried anchors, omit selectedScenePath and choose resolvedSceneType from worldBuilding, conflict, or progression.
Do not return version, chapterNumber, arcChapterPosition, recentSceneTypes, run IDs, attempt IDs, timestamps, counts, or other technical fields. The server owns them from the request and Living Story State.
Required shape for this request:
{"rhythmResponse":{"direction":"..."},"resolvedSceneType":"worldBuilding","fateSurvival":{"applies":false,"approach":"..."},"effects":[{"kind":"narration-metadata","intent":"...","required":true}],"sceneProgression":[{"purpose":"...","pacing":"..."}],"pacing":{"directive":"...","shape":"..."},"intendedEnding":"...","nextChapterHandoffTarget":"..."}`;

const PROCESS_SYSTEM = `You are the Process Result boundary for Chapter Generation 1.0.
Inspect the manifested chapter against the exact Chapter Packet and Chapter Plan. Return one strict JSON object and no prose.
Report new anchors, character/world changes, explicit character-state and Codex-like updates, thread changes, mission evidence, continuity and repetition findings, a complete next-chapter handoff, and whether repair is genuinely required.
characterChanges, worldStateChanges, threads.completed, and threads.changed must each be arrays of plain strings; use [] when there are no entries.
characterStateUpdates.abilities and every codexUpdates collection must be arrays; use [] when there are no structured updates. Return currentPowerStage only when it genuinely changed. Preserve every discovered character, faction, location, artifact, or ability update in the matching structured collection as a JSON record.
Use severity "serious" only for a defect that requires rewriting the manifested chapter. Set repairRecommended true only when at least one serious finding exists; do not force repair on a healthy run.
Return only content-level proposals. Do not return IDs, chapter provenance, thread origins, timestamps, counts, proposedLivingStoryState, or other technical fields. The server clones and advances Living Story State, assigns stable identity, and attaches the current chapter to new facts.
Required shape:
{"newAnchors":{"worldBuilding":"...","conflict":"...","progression":"..."},"characterChanges":[],"worldStateChanges":[],"characterStateUpdates":{"abilities":[]},"codexUpdates":{"characters":[],"factions":[],"locations":[],"artifacts":[]},"threads":{"completed":[],"changed":[],"unresolved":["..."]},"missionCompletion":{"completed":true,"evidence":"..."},"continuityFindings":[],"repetitionFindings":[],"nextChapterHandoff":{"endState":{"location":"...","timeMarker":"...","charactersPresent":[],"mcCondition":"...","openTension":"..."},"completedEvents":[],"nextImmediateAction":"...","fingerprints":[{"actionType":"other","participants":[],"location":"...","outcome":"..."}]},"repairRecommended":false}`;

const packetJson = (value: unknown) => JSON.stringify(value, null, 2);

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
        return parseChapterPlan(response, input);
      },

      async manifestChapter(input) {
        const systemInstruction = `${input.consolidatedPermanentInstructions}\n\n=== LIVE MANIFEST BOUNDARY ===\nWrite one complete chapter from the exact packet and plan below. Return only ---CHAPTER_BLOCKS--- followed by NDJSON blocks. Every block must contain non-empty prose text. A block may optionally use type \"paragraph\" or \"dialogue\" and may optionally include structured presentation enrichment such as metadata, system, or worldCard. Do not return IDs, chapter numbers, word counts, run identity, state updates, summaries, plans, or analysis; the server owns technical fields and will normalize harmless formatting differences.`;
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
        return parseManifestedChapter(response, input);
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
        return parseProcessingResult(response, input);
      },

      async repairChapter(input) {
        const systemInstruction = `${input.chapterPacket.generationRules.permanentWritingInstructions}\n\n=== SERIOUS-ISSUE REPAIR ===\nRewrite the complete chapter only to correct the serious processing findings. Preserve sound prose and all canon that is not implicated. Return only ---CHAPTER_BLOCKS--- followed by the full repaired NDJSON chapter. Every block must contain non-empty prose text. Type and presentation enrichment remain optional, and code supplies block IDs and other technical fields.`;
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
        return parseManifestedChapter(response, input);
      },
    },
  };
}
