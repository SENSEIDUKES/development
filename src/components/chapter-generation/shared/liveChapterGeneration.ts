import type { StorySeedArtifact } from "../../story-seed/shared/storySeedRepository";
import type { StorySeedChapterMappingReport } from "./packets/storySeedChapterAdapter";
import type { ChapterPipelineRun } from "./pipeline/types";
import type { ChapterTokenUsageSummary } from "./pipeline/usage";

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
}

export interface ManifestChapterResponse {
  provider: "gemini";
  model: string;
  run: ChapterPipelineRun;
  usage: ChapterTokenUsageSummary;
  mapping: StorySeedChapterMappingReport;
}

export interface ChapterGenerationErrorResponse {
  error: string;
  /** Calls that completed before a later provider or structured-output failure. */
  usage?: ChapterTokenUsageSummary;
}
