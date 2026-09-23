import { type StorySeedArtifact } from '@seihouse/sen/story-seed';
import type { StorySeedChapterMappingReport } from "./packets/storySeedChapterAdapter";
import type { ChapterPipelineRun } from "./pipeline/types";
import type { ChapterTokenUsageSummary } from "./pipeline/usage";
import type { ChapterUsageStage } from "./pipeline/usage";
import type { AuthenticatedChapterGenerationContinuation } from "./batch/chapterBatch";

/** Model Router providers that can serve chapter generation. */
export type ChapterGenerationProvider = "gemini" | "openrouter";

export interface ChapterGenerationModelOption {
  id: string;
  label: string;
}

export interface ChapterGenerationServerInfo {
  provider: ChapterGenerationProvider;
  configured: boolean;
  models: ChapterGenerationModelOption[];
  defaultModel: string;
}

export interface ManifestChapterRequest {
  artifact: StorySeedArtifact;
  model: string;
  /** Model Router Advanced setting; the server ignores levels the model does not accept. */
  reasoningLevel?: string;
  temporaryInstruction?: string;
  /** Server-produced disposable state for Chapter 2+ of a sequential batch. */
  continuation?: AuthenticatedChapterGenerationContinuation;
}

export interface ManifestChapterResponse {
  provider: ChapterGenerationProvider;
  model: string;
  run: ChapterPipelineRun;
  usage: ChapterTokenUsageSummary;
  mapping: StorySeedChapterMappingReport;
  nextContinuation: AuthenticatedChapterGenerationContinuation;
}

export interface ChapterGenerationValidationIssue {
  field: string;
  reason: string;
  expected?: string;
  received?: string;
}

export type ChapterGenerationFailureCategory =
  | "validation"
  | "timeout"
  | "provider-response"
  | "rate-limit"
  | "authentication"
  | "safety"
  | "provider-unavailable"
  | "provider";

export interface SafeChapterGenerationFailure {
  chapterNumber: number;
  stage: ChapterUsageStage;
  category: ChapterGenerationFailureCategory;
  reason: string;
  validationIssues?: ChapterGenerationValidationIssue[];
}

export interface ChapterGenerationErrorResponse {
  error: string;
  /** Safe, structured failure context. Server causes and stack traces stay server-only. */
  failure?: SafeChapterGenerationFailure;
  /** Calls that completed before a later provider or structured-output failure. */
  usage?: ChapterTokenUsageSummary;
}

export type ChapterGenerationStreamEvent =
  | { type: "stage"; stage: ChapterUsageStage }
  | {
      type: "result";
      status: number;
      body: ManifestChapterResponse | ChapterGenerationErrorResponse;
    };
