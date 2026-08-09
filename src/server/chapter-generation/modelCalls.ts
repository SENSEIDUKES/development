import {
  appendSceneType,
  deriveSceneAnchors,
  SCENE_TYPES,
  type SceneAnchors,
  type ScenePathSelection,
  type SceneType,
} from "../../components/chapter-generation/shared/lib/sceneRhythm";
import { sanitizeChapterHandoff } from "../../components/chapter-generation/shared/lib/chapterHandoff";
import { createArcChapterPosition } from "../../components/chapter-generation/shared/packets/livingStoryState";
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
import type { ChapterModelCallUsage } from "../../components/chapter-generation/shared/pipeline/usage";
import {
  type ChapterHandoff,
  type StoryBlock,
  type ChapterContent,
} from "../../components/chapter-generation/shared/types";
import type { ChapterTextModelProvider } from "./provider";

const EFFECT_KINDS: ChapterEffectKind[] = [
  "narration-metadata",
  "beast-sound",
  "world-card",
  "system-panel",
  "scene-music",
  "atmosphere",
  "narrative-cue",
];

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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
  if (value.chapterNumber !== input.chapterPacket.chapterMission.number) {
    throw new Error("Plan Chapter returned the wrong chapter number.");
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
    throw new Error("Plan Chapter returned the wrong arc/chapter position.");
  }

  return {
    version: 1,
    chapterNumber: input.chapterPacket.chapterMission.number,
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
    if (!balanced) break;
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
      // Advance past the opening brace and continue looking for valid blocks.
    }
    cursor = start + Math.max(1, balanced.length);
  }
  return values;
};

const sanitizeStoryBlock = (value: JsonRecord, index: number): StoryBlock => {
  const id = requiredString(value.id, `Manifest Chapter block ${index + 1} id`);
  const returnedType = requiredString(value.type, `Manifest Chapter block ${index + 1} type`);
  const metadata = isRecord(value.metadata) ? value.metadata : undefined;
  const type = returnedType === "paragraph" || returnedType === "dialogue"
    ? returnedType
    : returnedType === "narration"
      ? "paragraph"
      : returnedType === "system" && isRecord(value.system)
        ? "paragraph"
        : (returnedType === "world-card" || returnedType === "world_card") && isRecord(value.worldCard)
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
    text: requiredString(value.text, `Manifest Chapter block '${id}' text`),
    ...(metadata ? { metadata: metadata as StoryBlock["metadata"] } : {}),
    ...(isRecord(value.system) ? { system: value.system as unknown as StoryBlock["system"] } : {}),
    ...(isRecord(value.worldCard) ? { worldCard: value.worldCard as unknown as StoryBlock["worldCard"] } : {}),
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
  const blocks = rawBlocks.map(sanitizeStoryBlock);
  const ids = new Set<string>();
  for (const block of blocks) {
    if (ids.has(block.id)) throw new Error(`Manifest Chapter returned duplicate block id '${block.id}'.`);
    ids.add(block.id);
  }
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
      abilities: [...current.characterState.abilities],
    },
    threads: {
      unresolved,
      resolved: Array.from(new Set([...current.threads.resolved, ...completedThreads])),
    },
    codex: {
      characters: current.codex.characters.map(entry => ({ ...entry })),
      factions: current.codex.factions.map(entry => ({ ...entry })),
      locations: current.codex.locations.map(entry => ({ ...entry })),
      artifacts: current.codex.artifacts.map(entry => ({ ...entry })),
    },
    scene: {
      ...current.scene,
      recentSceneTypes: appendSceneType(
        current.scene.recentSceneTypes,
        input.chapterPlan.resolvedSceneType,
      ),
      carriedAnchors: newAnchors,
    },
  };
};

export function parseProcessingResult(
  text: string,
  input: ProcessChapterInput,
): ChapterProcessingResult {
  const value = parseStructuredModelJson(text, "Process Result");
  const threads = requiredRecord(value.threads, "Process Result threads");
  const unresolvedValue = Array.isArray(threads.unresolved) ? threads.unresolved : [];
  const unresolved = unresolvedValue.map((item, index) => {
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

  return {
    version: 1,
    newAnchors,
    characterChanges: stringArray(value.characterChanges, "Process Result characterChanges"),
    worldStateChanges: stringArray(value.worldStateChanges, "Process Result worldStateChanges"),
    threads: {
      completed,
      changed: stringArray(threads.changed, "Process Result threads.changed"),
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
    nextChapterHandoff,
    proposedLivingStoryState: buildProposedState(
      input,
      nextChapterHandoff,
      newAnchors,
      unresolved,
      completed,
    ),
    repairRecommended: requiredBoolean(
      value.repairRecommended,
      "Process Result repairRecommended",
    ),
  };
}

const PLAN_SYSTEM = `You are the Plan Chapter boundary for Chapter Generation 1.0.
Return one strict JSON object and no prose. Use the complete Chapter Packet exactly as supplied.
Decide chapter-specific rhythm, scene type, Fate Survival application, effects, progression, pacing, ending, and next handoff target together.
Copy Fate Survival visibility and pressure from the Story Constitution. If Fate Survival is disabled, applies must be false.
Do not invent a legacy FatePressureTier when planningSignals does not provide one; omit selectedPressureTier in that case.
For Chapter 1 without carried anchors, omit selectedScenePath and choose resolvedSceneType from worldBuilding, conflict, or progression.
Required shape:
{"version":1,"chapterNumber":1,"arcChapterPosition":"Arc 1 — Chapter 1/100","rhythmResponse":{"recentSceneTypes":[],"direction":"..."},"resolvedSceneType":"worldBuilding","fateSurvival":{"configured":true,"applies":false,"visibility":"partial","pressure":"immortal","approach":"..."},"effects":[{"kind":"narration-metadata","intent":"...","required":true}],"sceneProgression":[{"order":1,"purpose":"...","pacing":"..."}],"pacing":{"directive":"...","shape":"..."},"intendedEnding":"...","nextChapterHandoffTarget":"..."}`;

const PROCESS_SYSTEM = `You are the Process Result boundary for Chapter Generation 1.0.
Inspect the manifested chapter against the exact Chapter Packet and Chapter Plan. Return one strict JSON object and no prose.
Report new anchors, character/world changes, thread changes, mission evidence, continuity and repetition findings, a complete next-chapter handoff, and whether repair is genuinely required.
characterChanges, worldStateChanges, threads.completed, and threads.changed must each be arrays of plain strings; use [] when there are no entries.
Use severity "serious" only for a defect that requires rewriting the manifested chapter. Set repairRecommended true only when at least one serious finding exists; do not force repair on a healthy run.
The server clones and advances Living Story State from this structured result; do not return a proposedLivingStoryState object.
Required shape:
{"version":1,"newAnchors":{"worldBuilding":"...","conflict":"...","progression":"..."},"characterChanges":[],"worldStateChanges":[],"threads":{"completed":[],"changed":[],"unresolved":[{"description":"...","originChapter":1}]},"missionCompletion":{"completed":true,"evidence":"..."},"continuityFindings":[],"repetitionFindings":[],"nextChapterHandoff":{"version":1,"chapterNumber":1,"endState":{"location":"...","timeMarker":"...","charactersPresent":[],"mcCondition":"...","openTension":"..."},"completedEvents":[],"nextImmediateAction":"...","fingerprints":[{"actionType":"other","participants":[],"location":"...","outcome":"...","chapterNumber":1}]},"repairRecommended":false}`;

const packetJson = (value: unknown) => JSON.stringify(value, null, 2);

export interface LiveChapterModelCalls {
  model: AsyncChapterGenerationModelCalls;
  usage: ChapterModelCallUsage[];
}

export function createLiveChapterModelCalls(
  provider: ChapterTextModelProvider,
  options: { temperature: number; maxOutputTokens: number },
): LiveChapterModelCalls {
  const usage: ChapterModelCallUsage[] = [];
  let processCallCount = 0;

  const generate = async (request: Parameters<ChapterTextModelProvider["generate"]>[0]) => {
    const result = await provider.generate(request);
    usage.push(result.usage);
    return result.text;
  };

  return {
    usage,
    model: {
      async planChapter(input) {
        const response = await generate({
          kind: "plan",
          stage: "Plan Chapter",
          systemInstruction: PLAN_SYSTEM,
          userPrompt: `PLANNING SIGNALS\n${packetJson(input.planningSignals)}\n\nCOMPLETE CHAPTER PACKET\n${packetJson(input.chapterPacket)}`,
          responseFormat: "json",
          temperature: Math.min(options.temperature, 0.5),
          maxOutputTokens: Math.min(options.maxOutputTokens, 4_096),
        });
        return parseChapterPlan(response, input);
      },

      async manifestChapter(input) {
        const response = await generate({
          kind: "manifest",
          stage: "Manifest Chapter",
          systemInstruction: `${input.consolidatedPermanentInstructions}\n\n=== LIVE MANIFEST BOUNDARY ===\nWrite one complete chapter from the exact packet and plan below. Return only ---CHAPTER_BLOCKS--- followed by NDJSON blocks. Every block type must be exactly \"paragraph\" or \"dialogue\"; a system or world-card event remains a paragraph block with its structured sibling object. Do not return a summary, state update, plan, or analysis.`,
          userPrompt: `COMPLETE CHAPTER PACKET\n${packetJson(input.chapterPacket)}\n\nCHAPTER PLAN\n${packetJson(input.chapterPlan)}`,
          responseFormat: "text",
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
        });
        return parseManifestedChapter(response, input);
      },

      async processResult(input) {
        processCallCount += 1;
        const response = await generate({
          kind: "process",
          stage: processCallCount === 1
            ? "Process Result"
            : "Process Result (repaired chapter)",
          systemInstruction: PROCESS_SYSTEM,
          userPrompt: `COMPLETE CHAPTER PACKET\n${packetJson(input.chapterPacket)}\n\nCHAPTER PLAN\n${packetJson(input.chapterPlan)}\n\nMANIFESTED CHAPTER\n${packetJson(input.manifestedChapter)}`,
          responseFormat: "json",
          temperature: Math.min(options.temperature, 0.35),
          maxOutputTokens: Math.min(options.maxOutputTokens, 6_144),
        });
        return parseProcessingResult(response, input);
      },

      async repairChapter(input) {
        const response = await generate({
          kind: "repair",
          stage: "Repair Chapter",
          systemInstruction: `${input.chapterPacket.generationRules.permanentWritingInstructions}\n\n=== SERIOUS-ISSUE REPAIR ===\nRewrite the complete chapter only to correct the serious processing findings. Preserve sound prose and all canon that is not implicated. Return only ---CHAPTER_BLOCKS--- followed by the full repaired NDJSON chapter. Every block type must be exactly \"paragraph\" or \"dialogue\"; a system or world-card event remains a paragraph block with its structured sibling object.`,
          userPrompt: `COMPLETE CHAPTER PACKET\n${packetJson(input.chapterPacket)}\n\nCHAPTER PLAN\n${packetJson(input.chapterPlan)}\n\nSERIOUS PROCESSING RESULT\n${packetJson(input.processingResult)}\n\nORIGINAL MANIFESTED CHAPTER\n${packetJson(input.manifestedChapter)}`,
          responseFormat: "text",
          temperature: Math.min(options.temperature, 0.6),
          maxOutputTokens: options.maxOutputTokens,
        });
        return parseManifestedChapter(response, input);
      },
    },
  };
}
