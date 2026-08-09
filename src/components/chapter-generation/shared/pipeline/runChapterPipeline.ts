import { estimateTokens } from "../lib/helpers";
import type { GenerationStage } from "../stageTypes";
import type { ChapterContent } from "../types";
import type {
  ChapterGenerationModelCalls,
  ChapterModelCallKind,
  ChapterPipelineRun,
  ChapterPipelineStageKey,
  ChapterPlanningSignals,
  ChapterProcessingFinding,
  ChapterPacket,
} from "./types";

/** Serializes one pipeline result for the unchanged Workshop inspector. */
const stage = (
  key: ChapterPipelineStageKey,
  name: string,
  description: string,
  value: unknown,
): GenerationStage => {
  const content = JSON.stringify(value, null, 2);
  return {
    key,
    name,
    description,
    included: true,
    tokenEstimate: estimateTokens(content),
    sizeChars: content.length,
    format: "json",
    content,
  };
};

/** Returns whether processing found an issue severe enough to permit repair. */
export const hasSeriousFinding = (findings: ChapterProcessingFinding[]) =>
  findings.some(finding => finding.severity === "serious");

export interface RunChapterPipelineInput {
  chapterPacket: ChapterPacket;
  model: ChapterGenerationModelCalls;
  planningSignals?: ChapterPlanningSignals;
}

export interface BuildChapterPipelineRunInput {
  chapterPacket: ChapterPacket;
  chapterPlan: ChapterPipelineRun["chapterPlan"];
  manifestedChapter: ChapterContent;
  processingResult: ChapterPipelineRun["processingResult"];
  modelCalls: ChapterModelCallKind[];
  repairedChapter?: ChapterContent;
}

/** Builds the shared immutable result after either sync or async calls finish. */
export function buildChapterPipelineRun(
  input: BuildChapterPipelineRunInput,
): ChapterPipelineRun {
  const {
    chapterPacket,
    chapterPlan,
    manifestedChapter,
    processingResult,
    modelCalls,
    repairedChapter,
  } = input;
  const chapterForOutput = repairedChapter ?? manifestedChapter;
  const finalOutput: ChapterContent = {
    ...chapterForOutput,
    contextManifest: chapterPacket.contextManifest,
    contract: chapterPacket.chapterMission.contract,
    handoff: processingResult.nextChapterHandoff,
  };

  const stages = [
    stage(
      "assemble-chapter-packet",
      "Assemble Chapter Packet",
      "Pure code assembly of permanent story rules, current state, mission, anchors, relevant context, and model-visible arc/chapter position. No model call.",
      chapterPacket,
    ),
    stage(
      "plan-chapter",
      "Plan Chapter",
      "One structured planning call chooses chapter-specific rhythm, path, Fate Survival application, effects, progression, pacing, ending, and handoff target.",
      chapterPlan,
    ),
    stage(
      "manifest-chapter",
      "Manifest Chapter",
      "One writing call receives the complete Chapter Packet, Chapter Plan, and consolidated permanent writing/formatting instructions.",
      manifestedChapter,
    ),
    stage(
      "process-result",
      "Process Result",
      "One structured processing call proposes anchors, state and thread changes, mission/continuity findings, and the next handoff without committing story state. Repaired content is processed once more so its proposal stays aligned.",
      {
        ...processingResult,
        repairApplied: Boolean(repairedChapter),
      },
    ),
  ];

  return {
    stages,
    finalOutput,
    chapterPacket,
    chapterPlan,
    manifestedChapter,
    processingResult,
    modelCalls,
    repairApplied: Boolean(repairedChapter),
  };
}

/**
 * Runs the four actual stages. No legacy prompt-section stages execute here:
 * packet assembly is already complete, then exactly one planner, writer, and
 * processor boundary runs on the normal path.
 */
export function runChapterPipeline(input: RunChapterPipelineInput): ChapterPipelineRun {
  const { chapterPacket, model } = input;
  const modelCalls: ChapterModelCallKind[] = [];

  const chapterPlan = model.planChapter({
    chapterPacket,
    planningSignals: input.planningSignals ?? {},
  });
  modelCalls.push("plan");

  const manifestedChapter = model.manifestChapter({
    chapterPacket,
    chapterPlan,
    consolidatedPermanentInstructions:
      chapterPacket.generationRules.permanentWritingInstructions,
  });
  modelCalls.push("manifest");

  const initialProcessingResult = model.processResult({
    chapterPacket,
    chapterPlan,
    manifestedChapter,
  });
  modelCalls.push("process");

  const seriousIssueFound = hasSeriousFinding([
    ...initialProcessingResult.continuityFindings,
    ...initialProcessingResult.repetitionFindings,
  ]);
  const shouldRepair = Boolean(
    seriousIssueFound
    && initialProcessingResult.repairRecommended
    && model.repairChapter,
  );
  const repairedChapter = shouldRepair
    ? model.repairChapter!({
        chapterPacket,
        chapterPlan,
        manifestedChapter,
        processingResult: initialProcessingResult,
      })
    : undefined;
  if (repairedChapter) modelCalls.push("repair");

  const processingResult = repairedChapter
    ? model.processResult({
        chapterPacket,
        chapterPlan,
        manifestedChapter: repairedChapter,
      })
    : initialProcessingResult;
  if (repairedChapter) modelCalls.push("process");

  return buildChapterPipelineRun({
    chapterPacket,
    chapterPlan,
    manifestedChapter,
    processingResult,
    modelCalls,
    repairedChapter,
  });
}
