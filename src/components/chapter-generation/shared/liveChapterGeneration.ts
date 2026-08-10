import type { StorySeedArtifact } from "../../story-seed/shared/storySeedRepository";
import type { StorySeedChapterMappingReport } from "./packets/storySeedChapterAdapter";
import type { ChapterPipelineRun } from "./pipeline/types";
import type { ChapterTokenUsageSummary } from "./pipeline/usage";
import type { ChapterUsageStage } from "./pipeline/usage";
import type { ChapterGenerationContinuation } from "./batch/chapterBatch";

export interface ChapterGenerationModelOption {
  id: string;
  label: string;
}

export interface ChapterGenerationServerInfo {
  provider: "gemini";
  configured: boolean;
  models: ChapterGenerationModelOption[];
  defaultModel: string;
}

export interface ManifestChapterRequest {
  artifact: StorySeedArtifact;
  model: string;
  temporaryInstruction?: string;
  /** Server-produced disposable state for Chapter 2+ of a sequential batch. */
  continuation?: ChapterGenerationContinuation;
}

export interface ManifestChapterResponse {
  provider: "gemini";
  model: string;
  run: ChapterPipelineRun;
  usage: ChapterTokenUsageSummary;
  mapping: StorySeedChapterMappingReport;
  nextContinuation: ChapterGenerationContinuation;
}

export interface ChapterGenerationErrorResponse {
  error: string;
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
