import { parseModelJson } from '@seihouse/sen/contracts';
import { STORY_LENGTH_ARCS, arcPlanFromDraft } from '@seihouse/sen/arc-goals';
import { createModelRouter, ModelRouterError, type GenerationResult, type ReasoningLevel } from '@seihouse/library/model-router-server';
import {
  buildBlueprintGenerationPayload,
  finalizeGeneratedWorldBlueprint,
  type GeneratedWorldBlueprint,
  validateBlueprintArcPlan,
  type BlueprintGenerationPayload,
  type StorySeedInput,
} from '@seihouse/sen/story-seed';
import { type WorldBlueprint } from '@seihouse/sen/story-seed';
import { SEN_BLUEPRINT_DEFAULT_SKILLS, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { type ResolvedStorySeedBlueprintConfig } from "./config";
import { DEVELOPMENT_OPENROUTER_ATTRIBUTION } from '../model-router/openRouter';
import {
  buildWorldBlueprintPrompt,
  buildWorldBlueprintSystemPrompt,
  worldBlueprintResponseSchema,
} from "./prompt";


/** The one structured call to the Blueprint model, which writes a whole Blueprint. */
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
    // A fenced answer is still the answer (Claude without enforced structured output).
    const parsed = parseModelJson(result.text);
    if (parsed === undefined) throw new Error('The model\'s answer was not readable JSON.');
    return parsed;
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

class RoutedWorldBlueprintProvider implements WorldBlueprintModelProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly provider: 'openrouter' | 'minimax' | 'anthropic',
  ) {}

  async generate(request: BlueprintModelRequest<object>): Promise<unknown> {
    return parseBlueprintResponse(createModelRouter({
      credentials: { [this.provider]: this.apiKey },
      openRouterAttribution: DEVELOPMENT_OPENROUTER_ATTRIBUTION,
    }).generate({
      capability: 'text', model: this.model, systemInstruction: request.systemInstruction,
      userPrompt: request.userPrompt, responseFormat: 'json', responseJsonSchema: request.responseJsonSchema,
      temperature: request.temperature, maxOutputTokens: request.maxOutputTokens, timeoutMs: request.timeoutMs,
      reasoningLevel: request.reasoningLevel,
    }), request.maxOutputTokens);
  }
}

export class OpenRouterWorldBlueprintProvider extends RoutedWorldBlueprintProvider {
  constructor(apiKey: string, model: string) { super(apiKey, model, 'openrouter'); }
}

class LocalWorldBlueprintProvider implements WorldBlueprintModelProvider {
  constructor(private readonly model: string, private readonly apiKey: string) {}
  async generate(request: BlueprintModelRequest<object>): Promise<unknown> {
    return parseBlueprintResponse(createModelRouter({ credentials: {}, localDevelopment: this.apiKey === 'local-dev' }).generate({
      capability: 'text', model: this.model, ...request, responseFormat: 'json',
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

/** What each required part is called where a creator reads it. */
const BLUEPRINT_PART_NAMES: Record<string, string> = {
  title: 'the title', logline: 'the logline', worldOverview: 'the world overview', startingLocation: 'the opening location',
  societyStructure: 'the society', mcProfile: "the main character's profile",
  destinedEnding: 'the Destined Ending', majorFactions: 'the factions', initialCharacters: 'the supporting characters',
  estimatedArcs: 'the story length', 'mainCharacter.name': "the main character's name", 'mainCharacter.age': "the main character's age",
  'mainCharacter.personality': "the main character's personality", 'mainCharacter.appearance': "the main character's appearance",
  'mainCharacter.backgroundProfile': "the main character's backstory",
};

/**
 * The model's answer left out parts a Blueprint must have. Nothing is padded or
 * saved, and the creator is told which parts, so a retry is a choice made
 * knowing why rather than a guess (SENSEI, 2026-10-31: a Blueprint failed with
 * no reason given, and the server's own log named the factions).
 */
export class BlueprintIncompleteError extends Error {
  constructor(readonly missing: readonly string[]) {
    const parts = missing.map(field => BLUEPRINT_PART_NAMES[field] ?? field);
    const list = parts.length <= 2 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
    super(`The model's World Blueprint left out ${list}. Nothing was saved; generate again.`);
    this.name = "BlueprintIncompleteError";
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
): WorldBlueprintModelProvider => config.provider === "lmstudio"
  ? new LocalWorldBlueprintProvider(config.model, config.apiKey)
  : config.provider === "minimax" || config.provider === "anthropic"
  ? new RoutedWorldBlueprintProvider(config.apiKey, config.model, config.provider)
  : config.provider === "openrouter"
  ? new OpenRouterWorldBlueprintProvider(config.apiKey, config.model)
  : new GeminiWorldBlueprintProvider(config.apiKey, config.model);

const REQUIRED_STRINGS = [
  "blueprintVersion",
  "title",
  "logline",
  "worldOverview",
  "startingLocation",
  "societyStructure",
  "mcProfile",
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
    throw new BlueprintIncompleteError(missing);
  }
};

export const generateWorldBlueprint = async (
  payload: BlueprintGenerationPayload,
  config: ResolvedStorySeedBlueprintConfig,
  provider: WorldBlueprintModelProvider,
  reasoningLevel?: ReasoningLevel,
  /** The Origin, World and Arc skills the Blueprint reads; SEN's own unless the host gives others. */
  skills: readonly HarnessSkillManifest[] = SEN_BLUEPRINT_DEFAULT_SKILLS,
): Promise<GeneratedWorldBlueprint> => {
  let storySeed: StorySeedInput;
  try { ({ storySeed } = buildBlueprintGenerationPayload(payload.storySeed)); }
  catch (error) { throw new BlueprintRequestError(error instanceof Error ? error.message : "The Story Seed is invalid."); }
  // The creator's Story Length, when set, is the exact length Arc 1 is planned for.
  const arcCount = storySeed.story.optional.arcCount;
  const generated = await provider.generate({
    systemInstruction: buildWorldBlueprintSystemPrompt(skills),
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
  // whole Blueprint. The creator's own Story Length is never adjusted. A
  // look-ahead written for the model's own length is dropped with it, so no
  // later arc is steered toward an ending placed for another length; each is
  // planned when the story reaches it.
  const suggestedArcs = arcCount === undefined && Number.isInteger(answer.estimatedArcs)
    ? Math.min(STORY_LENGTH_ARCS.max, Math.max(STORY_LENGTH_ARCS.min, answer.estimatedArcs as number))
    : answer.estimatedArcs;
  const lengthAdjusted = suggestedArcs !== answer.estimatedArcs;
  const blueprint = finalizeGeneratedWorldBlueprint({
    ...rest, estimatedArcs: suggestedArcs, ...(lengthAdjusted ? { arcLookahead: [] } : {}), arcPlans: arcOne ? [arcOne] : [],
  }, storySeed);
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
