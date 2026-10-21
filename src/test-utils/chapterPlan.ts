import type { HarnessGenerationResponse } from '../narrative/generation';

/**
 * The planner's reply for a test chapter (SENSEI, 2026-10-20: every chapter
 * is planned before it is written): the main character on the page, deciding
 * to go on, with nothing changed. A test that is about the plan writes its own.
 */
export const TEST_CHAPTER_PLAN = {
  cast: [{ name: 'MC', kind: 'character' }],
  events: [{ kind: 'decision', actor: 'MC', targets: [], presses: [], how: 'MC decides to go on.', facts: [] }],
  arcGoalReached: { reached: false },
  chapterFunction: 'progression',
} as const;

/** A planner's reply as the provider returns it. */
export function plannedChapter(plan: object = TEST_CHAPTER_PLAN): HarnessGenerationResponse {
  return {
    rawProviderResponse: JSON.stringify(plan),
    providerReceipt: { provider: 'test', model: 'test-model', generatedAt: '2026-10-20T00:00:00.000Z', usage: { source: 'unavailable' } },
  };
}

/** A test adapter's planner: the same plan for every chapter. */
export const planEveryChapter = (plan: object = TEST_CHAPTER_PLAN) => async () => plannedChapter(plan);
