/**
 * Builds the packet-backed context foundation shared by the Reference and
 * Development chapter-generation flows. Packet settings and planning signals
 * stay at their owning boundaries so this helper contains only identical work.
 */
import type { BudgetedContext } from "../lib/contextBudgeter";
import { type ChapterContract } from '@seihouse/sen/generation';
import {
  buildLegacyGenerationMemory,
  type ChapterGenerationPacket,
} from "./assembly";

export interface AssembledPacketContext {
  chapterContract?: ChapterContract;
  budgetedContext: BudgetedContext;
  memoryJsonStr: string;
  systemInstruction: string;
  baseUserPrompt: string;
}

/** Rebuilds the identical ported context and prompt foundation for either flow. */
export function assemblePacketContext(
  packet: ChapterGenerationPacket,
): AssembledPacketContext {
  const {
    storyConstitution,
    livingStoryState,
    chapterMission,
    generationRules,
  } = packet;
  const memory = buildLegacyGenerationMemory(packet);
  const currentChapterNum = chapterMission.number;

  const formattedThreads = memory.unresolvedPlotThreads.map(
    thread => generationRules.renderers.threadForRouter(thread, currentChapterNum),
  );
  const baseMemory = {
    powerSystem: memory.powerSystem,
    currentPowerStage: memory.currentPowerStage,
    worldRules: memory.worldRules,
    abilities: generationRules.renderers.abilityLedger(memory.abilities),
    unresolvedPlotThreads: formattedThreads,
  };
  const chapterContract = chapterMission.contract;
  const lastSummary = generationRules.context.latestHistoryText(
    livingStoryState.contextBlocks,
  );
  const preparedContext = generationRules.context.prepareGenerationContext({
    engine: "v2",
    memory,
    baseMemory,
    blocks: livingStoryState.contextBlocks,
    legacyPastSummaries: [],
    fallbackSummary: chapterMission.fallbackSummary,
    threads: formattedThreads,
    worldRules: baseMemory.worldRules,
    pinned: {
      premise: generationRules.renderers.pinnedPremise({
        chapterNumber: currentChapterNum,
        title: chapterMission.title,
        premise: chapterMission.premise,
        genre: storyConstitution.genre,
        corePremise: storyConstitution.corePremise,
      }),
      mcStateCard: generationRules.renderers.mainCharacterState({
        mcName: storyConstitution.mainCharacterName,
        powerSystem: baseMemory.powerSystem,
        currentPowerStage: baseMemory.currentPowerStage,
        abilities: memory.abilities,
        destinedEnding: memory.destinedEnding,
        resolvedPlotThreads: memory.resolvedPlotThreads,
      }),
    },
    chapterContract,
    ranking: {
      mcName: storyConstitution.mainCharacterName,
      lastSummary,
      currentContext: chapterMission.premise || "",
      bonusContexts: [
        memory.unresolvedPlotThreads.map(thread => thread.description).join(" "),
        storyConstitution.corePremise,
      ],
      anchorText: generationRules.context.anchorTextFromBlocks(
        livingStoryState.contextBlocks,
      ),
    },
  });
  const budgetedContext = preparedContext.budgetedContext!;
  const { memoryJsonStr } = preparedContext;
  const systemInstruction = generationRules.prompts.system;
  const baseUserPrompt = generationRules.prompts.userPrompt(
    chapterMission.number,
    chapterMission.title,
    chapterMission.premise,
    storyConstitution.mainCharacterName,
    storyConstitution.genre,
    storyConstitution.corePremise,
    memoryJsonStr,
    "",
    true,
    storyConstitution.styleBible,
    storyConstitution.tropeRules,
    storyConstitution.storyTags,
    "v2",
  );

  return {
    chapterContract,
    budgetedContext,
    memoryJsonStr,
    systemInstruction,
    baseUserPrompt,
  };
}
