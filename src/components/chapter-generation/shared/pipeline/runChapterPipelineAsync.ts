import type {
  AsyncChapterGenerationModelCalls,
  ChapterModelCallKind,
  ChapterPipelineRun,
  ChapterPlanningSignals,
  ChapterPacket,
} from "./types";
import {
  buildChapterPipelineRun,
  hasSeriousFinding,
} from "./runChapterPipeline";

export interface RunChapterPipelineAsyncInput {
  chapterPacket: ChapterPacket;
  model: AsyncChapterGenerationModelCalls;
  planningSignals?: ChapterPlanningSignals;
}

/** Runs the same four-stage engine across real asynchronous model boundaries. */
export async function runChapterPipelineAsync(
  input: RunChapterPipelineAsyncInput,
): Promise<ChapterPipelineRun> {
  const { chapterPacket, model } = input;
  const modelCalls: ChapterModelCallKind[] = [];

  const chapterPlan = await model.planChapter({
    chapterPacket,
    planningSignals: input.planningSignals ?? {},
  });
  modelCalls.push("plan");

  const manifestedChapter = await model.manifestChapter({
    chapterPacket,
    chapterPlan,
    consolidatedPermanentInstructions:
      chapterPacket.generationRules.permanentWritingInstructions,
  });
  modelCalls.push("manifest");

  const initialProcessingResult = await model.processResult({
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
    ? await model.repairChapter!({
        chapterPacket,
        chapterPlan,
        manifestedChapter,
        processingResult: initialProcessingResult,
      })
    : undefined;
  if (repairedChapter) modelCalls.push("repair");

  const processingResult = repairedChapter
    ? await model.processResult({
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
