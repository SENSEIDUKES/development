import type { HarnessGenerationAttempt, HarnessWorkspaceState } from '../../../narrative/generation';

/**
 * Whether an attempt still holds its story: it is being written, or waits on
 * an explicit retry of a saved checkpoint. A committed, failed or set-aside
 * attempt never does, so a failed chapter never blocks the next try.
 */
export const isBlockingAttempt = (attempt: HarnessGenerationAttempt) => ![
  'committed',
  'generation_failed',
  'abandoned',
].includes(attempt.stage);

/** The attempt holding a story, when one is. */
export const activeAttemptForStory = (state: Pick<HarnessWorkspaceState, 'attempts'>, storyId: string) =>
  state.attempts.find(attempt => attempt.storyId === storyId && isBlockingAttempt(attempt));
