import { GoogleGenAI } from "@google/genai";
import {
  buildBlueprintGenerationPayload,
  finalizeGeneratedWorldBlueprint,
  type BlueprintGenerationPayload,
} from "../../components/story-seed/shared/storySeedSchema";
import type { WorldBlueprint } from "../../components/story-seed/shared/types";
import { adaptFinalizedStorySeedToChapterContracts } from "../../components/chapter-generation/shared/packets/storySeedChapterAdapter";
import {
  geminiBlueprintModelId,
  type ResolvedStorySeedBlueprintConfig,
} from "./config";
import {
  buildWorldBlueprintPrompt,
  WORLD_BLUEPRINT_SYSTEM_PROMPT,
} from "./prompt";

export const WORLD_BLUEPRINT_RESPONSE_SCHEMA = {
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
    majorMysteries: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    firstArcPromise: { type: "string", minLength: 1 },
    tropeRules: { type: "string", minLength: 1 },
    styleBible: { type: "string", minLength: 1 },
    destinedEnding: { type: "string", minLength: 1 },
    estimatedArcs: { type: "integer", minimum: 1, maximum: 100 },
    unresolvedPlotThreads: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
  },
} as const;

export interface WorldBlueprintModelRequest {
  systemInstruction: string;
  userPrompt: string;
  responseJsonSchema: typeof WORLD_BLUEPRINT_RESPONSE_SCHEMA;
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
      const output = response.text?.trim();
      if (!output) throw new Error("Gemini returned an empty World Blueprint response.");
      return JSON.parse(output) as unknown;
    } finally {
      clearTimeout(timeout);
    }
  }
}

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
  "majorMysteries",
  "unresolvedPlotThreads",
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
  const generated = await provider.generate({
    systemInstruction: WORLD_BLUEPRINT_SYSTEM_PROMPT,
    userPrompt: buildWorldBlueprintPrompt(storySeed),
    responseJsonSchema: WORLD_BLUEPRINT_RESPONSE_SCHEMA,
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    timeoutMs: config.timeoutMs,
  });
  const blueprint = finalizeGeneratedWorldBlueprint(generated, storySeed);
  assertCompleteGeneratedBlueprint(blueprint);

  // This is the exact downstream gate used by the Chapter Generation upload
  // flow. Returning only its normalized artifact proves there is no fixture
  // substitution or looser Story Seed-only success path.
  return adaptFinalizedStorySeedToChapterContracts({ seed: storySeed, blueprint }).blueprint;
};
