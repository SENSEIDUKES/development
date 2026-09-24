import { MAX_ROADMAP_ARCS, arcRoadmapSchema, validateArcRoadmap } from '@seihouse/sen/arc-goals';
import { GoogleGenAI } from "@google/genai";
import { buildBlueprintGenerationPayload, finalizeGeneratedWorldBlueprint, type BlueprintGenerationPayload } from '@seihouse/sen/story-seed';
import { type WorldBlueprint } from '@seihouse/sen/story-seed';
import {
  geminiBlueprintModelId,
  type ResolvedStorySeedBlueprintConfig,
} from "./config";
import { generateOpenRouterText } from "../model-router/openRouter";
import {
  buildWorldBlueprintPrompt,
  WORLD_BLUEPRINT_SYSTEM_PROMPT,
} from "./prompt";

/** Output tokens reserved for every Blueprint field other than the arc roadmap. */
export const BLUEPRINT_PROSE_OUTPUT_TOKENS = 4_500;
/** Output tokens one arc plan may need: up to five one-line goals with identities and allocations. */
export const ROADMAP_OUTPUT_TOKENS_PER_ARC = 250;

/**
 * How many arcs one Blueprint call can plan within its output budget. The
 * roadmap is generated whole in the same call; this limit bounds the arc count
 * the model may choose instead of letting a long roadmap be cut off.
 */
export const blueprintRoadmapArcLimit = (maxOutputTokens: number): number => Math.max(1, Math.min(
  MAX_ROADMAP_ARCS,
  Math.floor((maxOutputTokens - BLUEPRINT_PROSE_OUTPUT_TOKENS) / ROADMAP_OUTPUT_TOKENS_PER_ARC),
));

export const worldBlueprintResponseSchema = (maxArcs: number) => ({
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "logline",
    "worldOverview",
    "startingLocation",
    "societyStructure",
    "powerSystemOutline",
    "mainCharacter",
    "mcProfile",
    "majorFactions",
    "initialCharacters",
    "majorMysteries",
    "firstArcPromise",
    "arcPlans",
    "tropeRules",
    "styleBible",
    "destinedEnding",
    "estimatedArcs",
    "unresolvedPlotThreads",
  ],
  properties: {
    title: { type: "string", minLength: 1 },
    logline: { type: "string", minLength: 1 },
    worldOverview: { type: "string", minLength: 1 },
    startingLocation: { type: "string", minLength: 1 },
    societyStructure: { type: "string", minLength: 1 },
    powerSystemOutline: { type: "string", minLength: 1 },
    mainCharacter: {
      type: "object",
      additionalProperties: false,
      required: ["name", "age", "personality", "appearance", "backgroundProfile"],
      properties: {
        name: { type: "string", minLength: 1 },
        age: { type: "string", minLength: 1 },
        personality: { type: "string", minLength: 1 },
        appearance: { type: "string", minLength: 1 },
        backgroundProfile: { type: "string", minLength: 1 },
      },
    },
    mcProfile: { type: "string", minLength: 1 },
    majorFactions: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    initialCharacters: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    majorMysteries: { type: "array", items: { type: "string", minLength: 1 } },
    arcPlans: arcRoadmapSchema(maxArcs),
    firstArcPromise: { type: "string", minLength: 1 },
    tropeRules: { type: "string", minLength: 1 },
    styleBible: { type: "string", minLength: 1 },
    destinedEnding: { type: "string", minLength: 1 },
    estimatedArcs: { type: "integer", minimum: 1, maximum: maxArcs },
    unresolvedPlotThreads: { type: "array", items: { type: "string", minLength: 1 } },
  },
}) as const;

export const WORLD_BLUEPRINT_RESPONSE_SCHEMA = worldBlueprintResponseSchema(MAX_ROADMAP_ARCS);

export interface WorldBlueprintModelRequest {
  systemInstruction: string;
  userPrompt: string;
  responseJsonSchema: ReturnType<typeof worldBlueprintResponseSchema>;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export interface WorldBlueprintModelProvider {
  generate(request: WorldBlueprintModelRequest): Promise<unknown>;
}

export class GeminiWorldBlueprintProvider implements WorldBlueprintModelProvider {
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(request: WorldBlueprintModelRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.client.models.generateContent({
        model: geminiBlueprintModelId(this.model),
        contents: request.userPrompt,
        config: {
          systemInstruction: request.systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: request.responseJsonSchema,
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          abortSignal: controller.signal,
        },
      });
      if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        throw new BlueprintOutputLimitError(request.maxOutputTokens);
      }
      const output = response.text?.trim();
      if (!output) throw new Error("Gemini returned an empty World Blueprint response.");
      return JSON.parse(output) as unknown;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class OpenRouterWorldBlueprintProvider implements WorldBlueprintModelProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(request: WorldBlueprintModelRequest): Promise<unknown> {
    const { text } = await generateOpenRouterText({
      apiKey: this.apiKey,
      model: this.model,
      systemInstruction: request.systemInstruction,
      userPrompt: request.userPrompt,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      responseFormat: "json",
      responseJsonSchema: request.responseJsonSchema,
      timeoutMs: request.timeoutMs,
    });
    return JSON.parse(text.trim()) as unknown;
  }
}

/** The model stopped at its output limit: the Blueprint and its arc roadmap are incomplete. */
export class BlueprintOutputLimitError extends Error {
  constructor(maxOutputTokens: number) {
    super(`The Blueprint reached the model's ${maxOutputTokens.toLocaleString("en-US")}-token output limit before its arc roadmap was complete. Nothing was shortened or saved. Raise STORY_SEED_BLUEPRINT_MAX_OUTPUT_TOKENS (up to 32,768) or generate again.`);
    this.name = "BlueprintOutputLimitError";
  }
}

/** Route the configured Blueprint model to its provider through the Model Router. */
export const createWorldBlueprintProvider = (
  config: Pick<ResolvedStorySeedBlueprintConfig, "provider" | "model"> & { apiKey: string },
): WorldBlueprintModelProvider => config.provider === "openrouter"
  ? new OpenRouterWorldBlueprintProvider(config.apiKey, config.model)
  : new GeminiWorldBlueprintProvider(config.apiKey, config.model);

const REQUIRED_STRINGS = [
  "blueprintVersion",
  "title",
  "logline",
  "worldOverview",
  "startingLocation",
  "societyStructure",
  "powerSystemOutline",
  "mcProfile",
  "firstArcPromise",
  "tropeRules",
  "styleBible",
  "destinedEnding",
] as const;

const REQUIRED_ARRAYS = [
  "majorFactions",
  "initialCharacters",
] as const;

const assertCompleteGeneratedBlueprint = (blueprint: WorldBlueprint): void => {
  const missing: string[] = [];
  for (const field of REQUIRED_STRINGS) {
    if (typeof blueprint[field] !== "string" || !blueprint[field]?.trim()) missing.push(field);
  }
  for (const field of REQUIRED_ARRAYS) {
    if (!Array.isArray(blueprint[field]) || blueprint[field].length === 0) missing.push(field);
  }
  const mainCharacter = blueprint.mainCharacter;
  for (const field of ["name", "age", "personality", "appearance", "backgroundProfile"] as const) {
    if (!mainCharacter || typeof mainCharacter[field] !== "string" || !mainCharacter[field].trim()) {
      missing.push(`mainCharacter.${field}`);
    }
  }
  if (!Number.isInteger(blueprint.estimatedArcs) || blueprint.estimatedArcs < 1 || blueprint.estimatedArcs > 100) {
    missing.push("estimatedArcs");
  }
  if (missing.length > 0) {
    throw new Error(`Gemini returned an incomplete World Blueprint: ${missing.join(", ")}.`);
  }
};

export const generateWorldBlueprint = async (
  payload: BlueprintGenerationPayload,
  config: ResolvedStorySeedBlueprintConfig,
  provider: WorldBlueprintModelProvider,
): Promise<WorldBlueprint> => {
  const { storySeed } = buildBlueprintGenerationPayload(payload.storySeed);
  const maxArcs = blueprintRoadmapArcLimit(config.maxOutputTokens);
  const generated = await provider.generate({
    systemInstruction: WORLD_BLUEPRINT_SYSTEM_PROMPT,
    userPrompt: buildWorldBlueprintPrompt(storySeed, maxArcs),
    responseJsonSchema: worldBlueprintResponseSchema(maxArcs),
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    timeoutMs: config.timeoutMs,
  });
  const blueprint = finalizeGeneratedWorldBlueprint(generated, storySeed);
  assertCompleteGeneratedBlueprint(blueprint);
  // The roadmap is all-or-nothing: an incomplete or malformed roadmap fails the
  // generation loudly instead of being trimmed or padded to fit.
  const plans = Array.isArray((generated as { arcPlans?: unknown })?.arcPlans) ? (generated as { arcPlans: unknown[] }).arcPlans : [];
  if (plans.length !== blueprint.estimatedArcs) {
    throw new Error(`The generated Blueprint planned ${plans.length} of its ${blueprint.estimatedArcs} arcs. Nothing was shortened or saved; generate again.`);
  }
  try { validateArcRoadmap(blueprint.arcPlans, blueprint.estimatedArcs); }
  catch (error) { throw new Error(`The generated arc roadmap is invalid: ${error instanceof Error ? error.message : 'unknown problem'}`); }
  // HARNESS is the only downstream consumer. These gates plus the Story Seed
  // handoff validation are its contract; no legacy chapter adapter runs here.
  return blueprint;
};
