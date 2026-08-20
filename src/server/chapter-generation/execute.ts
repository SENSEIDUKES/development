import type {
  ManifestChapterRequest,
  ManifestChapterResponse,
  ChapterGenerationFailureCategory,
  SafeChapterGenerationFailure,
} from "../../components/chapter-generation/shared/liveChapterGeneration";
import {
  applyChapterContinuation,
  buildNextChapterContinuation,
  type ChapterGenerationContinuation,
} from "../../components/chapter-generation/shared/batch/chapterBatch";
import { adaptFinalizedStorySeedToChapterContracts } from "../../components/chapter-generation/shared/packets/storySeedChapterAdapter";
import { assembleChapterPacket } from "../../components/chapter-generation/shared/pipeline/assembleChapterPacket";
import { runChapterPipelineAsync } from "../../components/chapter-generation/shared/pipeline/runChapterPipelineAsync";
import { aggregateChapterTokenUsage } from "../../components/chapter-generation/shared/pipeline/usage";
import type { ChapterTokenUsageSummary } from "../../components/chapter-generation/shared/pipeline/usage";
import type { ChapterUsageStage } from "../../components/chapter-generation/shared/pipeline/usage";
import type { ResolvedChapterGenerationConfig } from "./config";
import { resolveConfiguredChapterModel } from "./config";
import {
  ChapterModelResponseValidationError,
  ChapterPlanValidationError,
  createLiveChapterModelCalls,
} from "./modelCalls";
import { sealChapterContinuation } from "./continuationSecurity";
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
  onStageChange?: (stage: ChapterUsageStage) => void;
  verifiedContinuation?: ChapterGenerationContinuation;
}

export class ChapterGenerationExecutionError extends Error {
  readonly cause: unknown;
  readonly usage: ChapterTokenUsageSummary;
  readonly failure: SafeChapterGenerationFailure;

  constructor(
    cause: unknown,
    usage: ChapterTokenUsageSummary,
    failure: SafeChapterGenerationFailure,
  ) {
    super(`Chapter ${failure.chapterNumber} failed during ${failure.stage}: ${failure.reason}`);
    this.name = "ChapterGenerationExecutionError";
    this.cause = cause;
    this.usage = usage;
    this.failure = failure;
  }
}

const safeFailureDetails = (
  error: unknown,
  stage: ChapterUsageStage,
): { category: ChapterGenerationFailureCategory; reason: string } => {
  if (error instanceof ChapterPlanValidationError) {
    return { category: "validation", reason: error.message };
  }
  const message = error instanceof Error ? error.message : "";
  if (message.includes("exceeded the") && message.includes("Development deadline")) {
    return { category: "timeout", reason: message };
  }
  if (/empty response/i.test(message)) {
    return {
      category: "provider-response",
      reason: `The provider returned an empty response during ${stage}.`,
    };
  }
  if (/no content|no recoverable prose|provider refusal/i.test(message)) {
    return { category: "provider-response", reason: message };
  }
  if (error instanceof ChapterModelResponseValidationError) {
    return { category: "validation", reason: message };
  }
  if (/\b429\b|rate.?limit|quota|resource.?exhausted/i.test(message)) {
    return {
      category: "rate-limit",
      reason: "The provider rejected the request because its rate limit or quota was reached.",
    };
  }
  if (/\b401\b|\b403\b|permission|unauthori[sz]ed|api.?key/i.test(message)) {
    return {
      category: "authentication",
      reason: "The provider rejected the request because server-side credentials or permissions were invalid.",
    };
  }
  if (/safety|blocked|prohibited content/i.test(message)) {
    return {
      category: "safety",
      reason: "The provider blocked the response under its safety controls.",
    };
  }
  if (/\b5\d\d\b|unavailable|overloaded|internal error/i.test(message)) {
    return {
      category: "provider-unavailable",
      reason: "The provider was unavailable or returned an internal service error.",
    };
  }
  return {
    category: "provider",
    reason: `The provider call failed during ${stage}. Review the server log for the protected provider detail.`,
  };
};

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
  if (request.continuation && !options.verifiedContinuation) {
    throw new Error("Chapter continuation was not verified by the Development server.");
  }
  const contracts = options.verifiedContinuation
    ? applyChapterContinuation(adapted.contracts, options.verifiedContinuation)
    : adapted.contracts;
  const chapterPacket = assembleChapterPacket(contracts);
  const provider = options.providerFactory
    ? options.providerFactory({ apiKey: config.apiKey, model })
    : new GeminiChapterTextProvider(config.apiKey, model);
  const liveCalls = createLiveChapterModelCalls(provider, {
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    timeoutMs: config.stageTimeoutMs,
  });
  let activeStage: ChapterUsageStage = "Plan Chapter";
  let run: ManifestChapterResponse["run"];
  try {
    run = await runChapterPipelineAsync({
      chapterPacket,
      model: liveCalls.model,
      onStageChange: stage => {
        activeStage = stage;
        options.onStageChange?.(stage);
      },
    });
  } catch (error) {
    const validationIssues = error instanceof ChapterPlanValidationError
      ? error.issues
      : undefined;
    const safeFailure = safeFailureDetails(error, activeStage);
    throw new ChapterGenerationExecutionError(
      error,
      aggregateChapterTokenUsage(liveCalls.usage),
      {
        chapterNumber: chapterPacket.chapterMission.number,
        stage: activeStage,
        category: safeFailure.category,
        reason: safeFailure.reason,
        ...(validationIssues?.length ? { validationIssues } : {}),
      },
    );
  }

  const nextContinuation = sealChapterContinuation({
    continuation: buildNextChapterContinuation({
      run,
      firstArcPromise: adapted.blueprint.firstArcPromise,
      temporaryInstruction: request.temporaryInstruction,
    }),
    artifact: request.artifact,
    secret: config.apiKey,
  });

  return {
    provider: "gemini",
    model,
    run,
    usage: aggregateChapterTokenUsage(liveCalls.usage),
    mapping: adapted.mapping,
    nextContinuation,
  };
}
