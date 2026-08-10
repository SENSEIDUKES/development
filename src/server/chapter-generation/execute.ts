import type {
  ManifestChapterRequest,
  ManifestChapterResponse,
} from "../../components/chapter-generation/shared/liveChapterGeneration";
import { adaptFinalizedStorySeedToChapterContracts } from "../../components/chapter-generation/shared/packets/storySeedChapterAdapter";
import { assembleChapterPacket } from "../../components/chapter-generation/shared/pipeline/assembleChapterPacket";
import { runChapterPipelineAsync } from "../../components/chapter-generation/shared/pipeline/runChapterPipelineAsync";
import { aggregateChapterTokenUsage } from "../../components/chapter-generation/shared/pipeline/usage";
import type { ChapterTokenUsageSummary } from "../../components/chapter-generation/shared/pipeline/usage";
import type { ResolvedChapterGenerationConfig } from "./config";
import { resolveConfiguredChapterModel } from "./config";
import { createLiveChapterModelCalls } from "./modelCalls";
import {
  GeminiChapterTextProvider,
  type ChapterTextModelProvider,
} from "./provider";

export type ChapterProviderFactory = (input: {
  apiKey: string;
  model: string;
}) => ChapterTextModelProvider;

export interface ExecuteChapterGenerationOptions {
  providerFactory?: ChapterProviderFactory;
}

export class ChapterGenerationExecutionError extends Error {
  readonly cause: unknown;
  readonly usage: ChapterTokenUsageSummary;

  constructor(cause: unknown, usage: ChapterTokenUsageSummary) {
    super(cause instanceof Error ? cause.message : "Unknown chapter-generation failure");
    this.name = "ChapterGenerationExecutionError";
    this.cause = cause;
    this.usage = usage;
  }
}

export async function executeChapterGeneration(
  request: ManifestChapterRequest,
  config: ResolvedChapterGenerationConfig,
  options: ExecuteChapterGenerationOptions = {},
): Promise<ManifestChapterResponse> {
  const model = resolveConfiguredChapterModel(request.model, config);
  if (!config.apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the Development server.");
  }
  if (!request.artifact?.blueprint) {
    throw new Error(
      "Select a finalized Story Seed with its World Blueprint. No Workshop fixture data was substituted.",
    );
  }

  const adapted = adaptFinalizedStorySeedToChapterContracts({
    seed: request.artifact.seed,
    blueprint: request.artifact.blueprint,
    temporaryInstruction: request.temporaryInstruction,
  });
  const chapterPacket = assembleChapterPacket(adapted.contracts);
  const provider = options.providerFactory
    ? options.providerFactory({ apiKey: config.apiKey, model })
    : new GeminiChapterTextProvider(config.apiKey, model);
  const liveCalls = createLiveChapterModelCalls(provider, {
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    timeoutMs: config.stageTimeoutMs,
  });
  let run: ManifestChapterResponse["run"];
  try {
    run = await runChapterPipelineAsync({
      chapterPacket,
      model: liveCalls.model,
    });
  } catch (error) {
    throw new ChapterGenerationExecutionError(
      error,
      aggregateChapterTokenUsage(liveCalls.usage),
    );
  }

  return {
    provider: "gemini",
    model,
    run,
    usage: aggregateChapterTokenUsage(liveCalls.usage),
    mapping: adapted.mapping,
  };
}
