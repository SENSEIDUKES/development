/**
 * Chapter Mission — instructions that apply only to the chapter currently
 * being generated. Nothing in this package is permanent story canon and
 * nothing here changes the generator's permanent prompt rules.
 */
import type { MockChapterGenerationScenario } from "../fixtures/mockGenerationData";
import { buildChapterContract } from "../lib/chapterHandoff";
import { type ChapterContract } from '@seihouse/sen/generation';
import type { LivingStoryState } from "./livingStoryState";

export const FIRST_CHAPTER_FALLBACK_SUMMARY =
  "This is the very first chapter of the story arc! Set the scene dramatically.";

export interface ChapterMission {
  number: number;
  title: string;
  premise: string;
  fallbackSummary: string;
  contract?: ChapterContract;
  /** Temporary director/user direction for this chapter only. */
  pacingDirective: string;
}

/** Builds the current-chapter mission without making planning decisions. */
export function chapterMissionFromScenario(
  scenario: MockChapterGenerationScenario,
  livingState: LivingStoryState,
): ChapterMission {
  const contract = buildChapterContract({
    chapterNumber: scenario.currentChapter.number,
    premise: scenario.currentChapter.premise,
    previousHandoff: livingState.previousHandoff,
    recentFingerprints: livingState.recentFingerprints,
  });

  return {
    number: scenario.currentChapter.number,
    title: scenario.currentChapter.title,
    premise: scenario.currentChapter.premise,
    fallbackSummary: FIRST_CHAPTER_FALLBACK_SUMMARY,
    contract,
    pacingDirective: scenario.pacingDirective,
  };
}
