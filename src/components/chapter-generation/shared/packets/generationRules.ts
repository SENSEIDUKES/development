/**
 * Generation Rules — permanent, generator-owned instructions and renderers.
 *
 * This package owns references and small shared wrappers only. It deliberately
 * does not retype prompt text: fixed prompts and block bodies remain in their
 * existing modules, including DEV's code-owned technical-field boundary.
 */
import { CHAPTER_PROMPTS } from "../lib/chapterPrompts";
import { buildChapterContract } from "../lib/chapterHandoff";
import { appendChapterWritingStyleInstruction } from "../lib/chapterWritingStyle";
import { buildContextManifestFromOutcomes } from "../lib/contextManifest";
import { CONTEXT_BUDGET_DEFAULTS } from "../lib/contextBudgeter";
import { renderCulturalProseInstruction } from "../lib/culturalProse";
import {
  anchorTextFromBlocks,
  formatMainCharacterState,
  latestHistoryText,
  prepareGenerationContext,
} from "../lib/generationContext";
import { formatGlossaryForPrompt } from "../lib/glossaryFormatter";
import {
  cleanChapterResponse,
  estimateTokens,
  formatAbilityLedgerForPrompt,
} from "../lib/helpers";

/** Adds deterministic thread-age guidance used by context assembly. */
export const formatThreadForRouter = (
  thread: { description: string; originChapter: number },
  currentChapterNum: number,
) => {
  const age = currentChapterNum - thread.originChapter;
  return age >= 1
    ? `${thread.description} (Thread open for ${age} chapter${age > 1 ? "s" : ""} — pay it off or deepen it!)`
    : thread.description;
};

/** Renders the protected chapter premise block. */
export const pinnedPremiseBlock = (input: {
  chapterNumber: number;
  title: string;
  premise: string;
  genre: string;
  corePremise: string;
}) => [
  `Chapter ${input.chapterNumber}: ${input.title || ""}`,
  `Goal: ${input.premise || ""}`,
  input.genre ? `Genre/style: ${input.genre}` : "",
  input.corePremise ? `Core premise: ${input.corePremise}` : "",
].filter(Boolean).join("\n");

export interface GenerationRules {
  prompts: {
    system: string;
    userPrompt: typeof CHAPTER_PROMPTS.userPrompt;
  };
  context: {
    budgetDefaults: typeof CONTEXT_BUDGET_DEFAULTS;
    buildChapterContract: typeof buildChapterContract;
    prepareGenerationContext: typeof prepareGenerationContext;
    buildContextManifestFromOutcomes: typeof buildContextManifestFromOutcomes;
    latestHistoryText: typeof latestHistoryText;
    anchorTextFromBlocks: typeof anchorTextFromBlocks;
  };
  renderers: {
    glossary: typeof formatGlossaryForPrompt;
    writingStyle: typeof appendChapterWritingStyleInstruction;
    culturalProse: typeof renderCulturalProseInstruction;
    threadForRouter: typeof formatThreadForRouter;
    abilityLedger: typeof formatAbilityLedgerForPrompt;
    pinnedPremise: typeof pinnedPremiseBlock;
    mainCharacterState: typeof formatMainCharacterState;
  };
  output: {
    estimateTokens: typeof estimateTokens;
    cleanChapterResponse: typeof cleanChapterResponse;
  };
}

/** References the canonical prompt, renderer, context, and output rule owners. */
export function buildGenerationRules(): GenerationRules {
  return {
    prompts: {
      system: CHAPTER_PROMPTS.system,
      userPrompt: CHAPTER_PROMPTS.userPrompt,
    },
    context: {
      budgetDefaults: CONTEXT_BUDGET_DEFAULTS,
      buildChapterContract,
      prepareGenerationContext,
      buildContextManifestFromOutcomes,
      latestHistoryText,
      anchorTextFromBlocks,
    },
    renderers: {
      glossary: formatGlossaryForPrompt,
      writingStyle: appendChapterWritingStyleInstruction,
      culturalProse: renderCulturalProseInstruction,
      threadForRouter: formatThreadForRouter,
      abilityLedger: formatAbilityLedgerForPrompt,
      pinnedPremise: pinnedPremiseBlock,
      mainCharacterState: formatMainCharacterState,
    },
    output: {
      estimateTokens,
      cleanChapterResponse,
    },
  };
}
