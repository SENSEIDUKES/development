import { ARC_LOOKAHEAD_SCHEMA, ARC_PLAN_DRAFT_SCHEMA, STORY_LENGTH_ARCS, arcPlanFromDraft } from '@seihouse/sen/arc-goals';
import { createModelRouter, ModelRouterError, type GenerationResult, type ReasoningLevel } from '@seihouse/library/model-router-server';
import {
  SEED_CHARACTER_LIMIT,
  SEED_CHARACTER_SLOT_FIELDS,
  SEED_FACTION_LIMIT,
  SEED_FACTION_SLOT_FIELDS,
  SEED_MAIN_CHARACTER_SLOT_FIELDS,
  buildBlueprintGenerationPayload,
  finalizeGeneratedWorldBlueprint,
  type GeneratedWorldBlueprint,
  validateBlueprintArcPlan,
  type BlueprintGenerationPayload,
  type StorySeedInput,
} from '@seihouse/sen/story-seed';
import { type WorldBlueprint } from '@seihouse/sen/story-seed';
import { type ResolvedStorySeedBlueprintConfig } from "./config";
import { DEVELOPMENT_OPENROUTER_ATTRIBUTION } from '../model-router/openRouter';
import {
  buildWorldBlueprintPrompt,
  WORLD_BLUEPRINT_SYSTEM_PROMPT,
} from "./prompt";

const textSlots = (fields: readonly string[]) => Object.fromEntries(fields.map(field => [field, { type: "string" }]));

/**
 * The Blueprint response schema. It has a place for every Story Seed slot
 * (filled only where the creator left one blank) and it plans Arc 1 only (`arcOne`: wording and
 * chapters; the identities are assigned on the server) and a hidden look-ahead
 * for the next arcs. `exactArcs` is the Seed's Story Length, when the creator
 * chose one; without it the model picks a realistic length.
 */
export const worldBlueprintResponseSchema = (exactArcs?: number) => ({
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
    "characters",
    "factions",
    "abilities",
    "powerSystem",
    "mainOpposition",
    "firstArcPromise",
    "arcOne",
    "arcLookahead",
    "tropeRules",
    "styleBible",
    "destinedEnding",
    "estimatedArcs",
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
      required: ["name", "age", "personality", "appearance", "backgroundProfile", ...SEED_MAIN_CHARACTER_SLOT_FIELDS],
      properties: {
        name: { type: "string", minLength: 1 },
        age: { type: "string", minLength: 1 },
        personality: { type: "string", minLength: 1 },
        appearance: { type: "string", minLength: 1 },
        backgroundProfile: { type: "string", minLength: 1 },
        ...textSlots(SEED_MAIN_CHARACTER_SLOT_FIELDS),
      },
    },
    // Side characters and factions as cards: the creator's own by name first, then supporting ones.
    characters: { type: "array", minItems: 1, maxItems: SEED_CHARACTER_LIMIT, items: {
      type: "object", additionalProperties: false, required: ["name", ...SEED_CHARACTER_SLOT_FIELDS],
      properties: { name: { type: "string", minLength: 1 }, ...textSlots(SEED_CHARACTER_SLOT_FIELDS) },
    } },
    factions: { type: "array", minItems: 1, maxItems: SEED_FACTION_LIMIT, items: {
      type: "object", additionalProperties: false, required: ["name", ...SEED_FACTION_SLOT_FIELDS],
      properties: { name: { type: "string", minLength: 1 }, ...textSlots(SEED_FACTION_SLOT_FIELDS) },
    } },
    abilities: { type: "object", additionalProperties: false, required: ["startingPowerConcept", "uniquePath"], properties: textSlots(["startingPowerConcept", "uniquePath"]) },
    powerSystem: { type: "object", additionalProperties: false, required: ["flavor", "knownRanks"], properties: textSlots(["flavor", "knownRanks"]) },
    mainOpposition: { type: "string" },
    arcOne: ARC_PLAN_DRAFT_SCHEMA,
    arcLookahead: ARC_LOOKAHEAD_SCHEMA,
    firstArcPromise: { type: "string", minLength: 1 },
    tropeRules: { type: "string", minLength: 1 },
    styleBible: { type: "string", minLength: 1 },
    destinedEnding: { type: "string", minLength: 1 },
    estimatedArcs: { type: "integer", minimum: exactArcs ?? STORY_LENGTH_ARCS.min, maximum: exactArcs ?? STORY_LENGTH_ARCS.max },
  },
}) as const;

export const WORLD_BLUEPRINT_RESPONSE_SCHEMA = worldBlueprintResponseSchema();

/** One structured call to the Blueprint model: a whole Blueprint, or only the arcs being added. */
export interface BlueprintModelRequest<Schema extends object = ReturnType<typeof worldBlueprintResponseSchema>> {
  systemInstruction: string;
  userPrompt: string;
  responseJsonSchema: Schema;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  /** The chapter model's reasoning level, when the model takes one. */
  reasoningLevel?: ReasoningLevel;
}

export type WorldBlueprintModelRequest = BlueprintModelRequest;

export interface WorldBlueprintModelProvider {
  generate(request: BlueprintModelRequest<object>): Promise<unknown>;
}

const parseBlueprintResponse = async (
  generation: Promise<GenerationResult>,
  maxOutputTokens: number,
): Promise<unknown> => {
  try {
    const result = await generation;
    if (result.capability !== 'text') throw new Error('Unexpected speech result.');
    return JSON.parse(result.text.trim()) as unknown;
  } catch (error) {
    if (error instanceof ModelRouterError && error.code === 'output-limit') {
      throw new BlueprintOutputLimitError(maxOutputTokens);
    }
    throw error;
  }
};

export class GeminiWorldBlueprintProvider implements WorldBlueprintModelProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(request: BlueprintModelRequest<object>): Promise<unknown> {
    return parseBlueprintResponse(createModelRouter({ credentials: { gemini: this.apiKey } }).generate({
      capability: 'text', model: this.model, systemInstruction: request.systemInstruction,
      userPrompt: request.userPrompt, responseFormat: 'json', responseJsonSchema: request.responseJsonSchema,
      temperature: request.temperature, maxOutputTokens: request.maxOutputTokens, timeoutMs: request.timeoutMs,
      reasoningLevel: request.reasoningLevel,
    }), request.maxOutputTokens);
  }
}

export class OpenRouterWorldBlueprintProvider implements WorldBlueprintModelProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(request: BlueprintModelRequest<object>): Promise<unknown> {
    return parseBlueprintResponse(createModelRouter({
      credentials: { openrouter: this.apiKey },
      openRouterAttribution: DEVELOPMENT_OPENROUTER_ATTRIBUTION,
    }).generate({
      capability: 'text', model: this.model, systemInstruction: request.systemInstruction,
      userPrompt: request.userPrompt, responseFormat: 'json', responseJsonSchema: request.responseJsonSchema,
      temperature: request.temperature, maxOutputTokens: request.maxOutputTokens, timeoutMs: request.timeoutMs,
      reasoningLevel: request.reasoningLevel,
    }), request.maxOutputTokens);
  }
}

/** The model stopped at its output limit: the Blueprint is incomplete. */
export class BlueprintOutputLimitError extends Error {
  constructor(maxOutputTokens: number) {
    super(`The Blueprint reached the model's ${maxOutputTokens.toLocaleString("en-US")}-token output limit before it was complete. Nothing was shortened or saved. Raise STORY_SEED_BLUEPRINT_MAX_OUTPUT_TOKENS (up to 32,768) or generate again.`);
    this.name = "BlueprintOutputLimitError";
  }
}

/** A request this server cannot serve as asked. Nothing is generated; the message says why. */
export class BlueprintRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlueprintRequestError";
  }
}

/** The model's Arc 1 or story length is not what was asked for. Nothing is shortened, padded or saved. */
export class BlueprintRoadmapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlueprintRoadmapError";
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
  if (!Number.isInteger(blueprint.estimatedArcs) || blueprint.estimatedArcs < STORY_LENGTH_ARCS.min || blueprint.estimatedArcs > STORY_LENGTH_ARCS.max) {
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
  reasoningLevel?: ReasoningLevel,
): Promise<GeneratedWorldBlueprint> => {
  let storySeed: StorySeedInput;
  try { ({ storySeed } = buildBlueprintGenerationPayload(payload.storySeed)); }
  catch (error) { throw new BlueprintRequestError(error instanceof Error ? error.message : "The Story Seed is invalid."); }
  // The creator's Story Length, when set, is the exact length Arc 1 is planned for.
  const arcCount = storySeed.story.optional.arcCount;
  const generated = await provider.generate({
    systemInstruction: WORLD_BLUEPRINT_SYSTEM_PROMPT,
    userPrompt: buildWorldBlueprintPrompt(storySeed),
    responseJsonSchema: worldBlueprintResponseSchema(arcCount),
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    timeoutMs: config.timeoutMs,
    ...(reasoningLevel ? { reasoningLevel } : {}),
  });
  // Arc 1 arrives as wording and chapters; the server gives its goals their
  // identities. A missing or malformed Arc 1 fails loudly, never padded.
  const answer = (generated && typeof generated === "object" ? generated : {}) as Record<string, unknown>;
  const reason = (error: unknown) => (error instanceof Error ? error.message : "unknown problem").replace(/\.$/, "");
  let arcOne;
  let arcOneProblem: string | undefined;
  try { arcOne = arcPlanFromDraft(answer.arcOne, 1); }
  catch (error) { arcOneProblem = reason(error); }
  const { arcOne: _draft, ...rest } = answer;
  // The length the model suggests is kept within the story lengths a creator
  // may choose; a provider that ignores the schema's range does not cost the
  // whole Blueprint. The creator's own Story Length is never adjusted.
  const suggestedArcs = arcCount === undefined && Number.isInteger(answer.estimatedArcs)
    ? Math.min(STORY_LENGTH_ARCS.max, Math.max(STORY_LENGTH_ARCS.min, answer.estimatedArcs as number))
    : answer.estimatedArcs;
  const blueprint = finalizeGeneratedWorldBlueprint({ ...rest, estimatedArcs: suggestedArcs, arcPlans: arcOne ? [arcOne] : [] }, storySeed);
  assertCompleteGeneratedBlueprint(blueprint);
  if (arcOneProblem) throw new BlueprintRoadmapError(`The generated Arc 1 is invalid: ${arcOneProblem}. Nothing was saved; generate again.`);
  // The Blueprint takes the Seed's length, so the answer itself must have planned for it.
  if (arcCount !== undefined && answer.estimatedArcs !== arcCount) {
    throw new BlueprintRoadmapError(`The generated Blueprint was not planned for the ${arcCount} ${arcCount === 1 ? "arc" : "arcs"} requested. Nothing was saved; generate again.`);
  }
  try { validateBlueprintArcPlan(blueprint); }
  catch (error) { throw new BlueprintRoadmapError(`The generated Arc 1 is invalid: ${reason(error)}. Nothing was saved; generate again.`); }
  // HARNESS is the only downstream consumer. These gates plus the Story Seed
  // handoff validation are its contract; no legacy chapter adapter runs here.
  return blueprint;
};
