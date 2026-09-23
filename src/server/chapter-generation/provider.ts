import { GoogleGenAI } from "@google/genai";
import { estimateTokens } from "../../components/chapter-generation/shared/lib/helpers";
import type { ChapterModelCallKind } from "../../components/chapter-generation/shared/pipeline/types";
import type {
  ChapterModelCallUsage,
  ChapterUsageStage,
  EstimatedStageInputTokenBreakdown,
} from "../../components/chapter-generation/shared/pipeline/usage";
import { geminiApiModelId, type ResolvedChapterGenerationConfig } from "./config";
import { requireTextModelKey, textModelProvider, type ReasoningLevel } from "../model-router/catalog";
import { geminiThinkingConfig } from "../model-router/geminiThinking";
import { generateOpenRouterText } from "../model-router/openRouter";

export interface ChapterTextGenerationRequest {
  kind: ChapterModelCallKind;
  stage: ChapterUsageStage;
  systemInstruction: string;
  userPrompt: string;
  responseFormat: "json" | "text";
  temperature: number;
  maxOutputTokens: number;
  estimatedInputBreakdown?: EstimatedStageInputTokenBreakdown;
  abortSignal?: AbortSignal;
  /** Router Advanced setting; omitted means the model's own default. */
  reasoningLevel?: ReasoningLevel;
}

export interface ChapterTextGenerationResult {
  text: string;
  usage: ChapterModelCallUsage;
}

export interface ChapterTextModelProvider {
  readonly provider: string;
  readonly model: string;
  generate(request: ChapterTextGenerationRequest): Promise<ChapterTextGenerationResult>;
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export class GeminiChapterTextProvider implements ChapterTextModelProvider {
  readonly provider = "gemini";
  readonly model: string;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(
    request: ChapterTextGenerationRequest,
  ): Promise<ChapterTextGenerationResult> {
    const startedAt = Date.now();
    try {
      const response = await this.client.models.generateContent({
        model: geminiApiModelId(this.model),
        contents: request.userPrompt,
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          abortSignal: request.abortSignal,
          ...geminiThinkingConfig(request.reasoningLevel),
          ...(request.responseFormat === "json"
            ? { responseMimeType: "application/json" }
            : {}),
        },
      });
      const text = response.text?.trim() ?? "";
      if (!text) throw new Error("The configured model returned an empty response.");

      const metadata = response.usageMetadata as GeminiUsageMetadata | undefined;
      const hasReportedSplit = Number.isFinite(metadata?.promptTokenCount)
        && Number.isFinite(metadata?.candidatesTokenCount);
      const inputTokens = hasReportedSplit
        ? metadata!.promptTokenCount!
        : estimateTokens(`${request.systemInstruction}\n\n${request.userPrompt}`);
      const outputTokens = hasReportedSplit
        ? metadata!.candidatesTokenCount!
        : estimateTokens(text);
      const reportedTotal = metadata?.totalTokenCount;
      const totalTokens = hasReportedSplit && Number.isFinite(reportedTotal)
        ? reportedTotal!
        : inputTokens + outputTokens;

      return {
        text,
        usage: {
          kind: request.kind,
          stage: request.stage,
          provider: this.provider,
          model: this.model,
          inputTokens,
          outputTokens,
          totalTokens,
          generationTimeMs: Date.now() - startedAt,
          tokenSource: hasReportedSplit ? "provider" : "estimated",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error";
      throw new Error(`Gemini chapter generation failed during ${request.stage}: ${message}`);
    }
  }
}

export class OpenRouterChapterTextProvider implements ChapterTextModelProvider {
  readonly provider = "openrouter";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly reasoningEffort?: string,
  ) {}

  async generate(
    request: ChapterTextGenerationRequest,
  ): Promise<ChapterTextGenerationResult> {
    const startedAt = Date.now();
    try {
      const result = await generateOpenRouterText({
        apiKey: this.apiKey,
        model: this.model,
        systemInstruction: request.systemInstruction,
        userPrompt: request.userPrompt,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        responseFormat: request.responseFormat,
        abortSignal: request.abortSignal,
        reasoningEffort: request.reasoningLevel ?? this.reasoningEffort,
      });
      const text = result.text.trim();
      const inputTokens = result.usage?.inputTokens
        ?? estimateTokens(`${request.systemInstruction}\n\n${request.userPrompt}`);
      const outputTokens = result.usage?.outputTokens ?? estimateTokens(text);
      return {
        text,
        usage: {
          kind: request.kind,
          stage: request.stage,
          provider: this.provider,
          model: this.model,
          inputTokens,
          outputTokens,
          totalTokens: result.usage?.totalTokens ?? inputTokens + outputTokens,
          generationTimeMs: Date.now() - startedAt,
          tokenSource: result.usage ? "provider" : "estimated",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error";
      throw new Error(`OpenRouter chapter generation failed during ${request.stage}: ${message}`);
    }
  }
}

/** Route a configured chapter model to its provider through the Model Router. */
export function createChapterTextProvider(
  model: string,
  config: Pick<ResolvedChapterGenerationConfig, "keys" | "reasoningEffort">,
): ChapterTextModelProvider {
  const apiKey = requireTextModelKey(model, config.keys);
  return textModelProvider(model) === "openrouter"
    ? new OpenRouterChapterTextProvider(apiKey, model, config.reasoningEffort)
    : new GeminiChapterTextProvider(apiKey, model);
}
