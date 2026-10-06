import { createArcChapterPosition } from '../../arc-goals/shared/arcGoals';
import { activeAttemptForStory } from './attempts';
import { harnessArcPlan } from './arcState';
import { findStory } from './foundation';
import { cloneHarnessValue } from './ids';
import { CHAPTER_REWRITE_NOTE_LIMIT, type HarnessChapter, type HarnessWorkspaceState } from '../../../narrative/generation';

/**
 * Rewrite this chapter: the reader may have the story's latest chapter written
 * again, with an optional note on what to change, until the next chapter is
 * written. The new version is prepared from the story as it stood before that
 * chapter and replaces it only when it commits; until then, and whenever the
 * rewrite fails, the chapter stays as it was.
 */

/** The story's latest committed chapter: the one a rewrite replaces. */
export function latestStoryChapter(state: Pick<HarnessWorkspaceState, 'stories' | 'chapters'>, storyId: string): HarnessChapter | undefined {
  const story = state.stories.find(entry => entry.id === storyId);
  const latest = story?.head.lastCommittedChapterId
    ? state.chapters.find(chapter => chapter.id === story.head.lastCommittedChapterId)
    : undefined;
  return latest && latest.chapterNumber === story!.head.nextChapterNumber - 1 ? latest : undefined;
}

/**
 * Why the story's latest chapter cannot be written again now, if it cannot.
 * Only the latest chapter can be, and only while nothing has been built on it:
 * no chapter is being written, no batch is running, the next arc is not yet
 * planned from it, and none of the reader's corrections or story memory points
 * at it.
 */
export function chapterRewriteGap(state: HarnessWorkspaceState, storyId: string): string | undefined {
  const story = findStory(state, storyId);
  if (!story) return 'Open a story before rewriting a chapter.';
  if (!story.head.lastCommittedChapterId) return 'This story has no chapter to rewrite yet.';
  const latest = latestStoryChapter(state, storyId);
  if (!latest) return 'The story\'s latest chapter is missing, so it cannot be rewritten.';
  const chapter = `Chapter ${latest.chapterNumber}`;
  if (activeAttemptForStory(state, storyId)) return `Wait for the chapter being written before rewriting ${chapter}.`;
  if (state.batches.some(batch => batch.storyId === storyId && ['running', 'pause_requested'].includes(batch.status))) {
    return `Pause the batch writing this story before rewriting ${chapter}.`;
  }
  if (state.arcPlanOperations.some(operation => operation.storyId === storyId
    && ['request_started', 'provider_outcome_unknown', 'raw_received'].includes(operation.status))) {
    return `Wait for the next arc's plan before rewriting ${chapter}.`;
  }
  const next = createArcChapterPosition(latest.chapterNumber + 1);
  if (next.chapterInArc === 1 && harnessArcPlan(story, next.arcNumber)) {
    return `Arc ${next.arcNumber} is already planned from ${chapter}, so ${chapter} can no longer be rewritten.`;
  }
  // Story memory and the reader's corrections built on the chapter would be left pointing at nothing.
  const recordsFromIt = latest.eventIds.length
    || state.canonicalRecords.some(record => record.chapterId === latest.id)
    || state.capabilityReceipts.some(receipt => receipt.chapterId === latest.id)
    || state.projections.some(projection => projection.chapterId === latest.id);
  if (recordsFromIt) return `${chapter} carries story memory, so it cannot be rewritten.`;
  if (state.corrections.some(correction => correction.storyId === storyId && correction.readerEdit?.chapterNumber === latest.chapterNumber)) {
    return `${chapter} has your corrections, so it cannot be rewritten.`;
  }
  return undefined;
}

/** A reader's note, trimmed; absent when blank. Longer than the limit is refused. */
export function readRewriteNote(note: string | undefined): string | undefined {
  const text = note?.trim();
  if (!text) return undefined;
  if (text.length > CHAPTER_REWRITE_NOTE_LIMIT) {
    throw new Error(`A rewrite note can be at most ${CHAPTER_REWRITE_NOTE_LIMIT.toLocaleString()} characters.`);
  }
  return text;
}

/**
 * The workspace as it stood before the story's latest chapter was saved. That
 * chapter is gone, with everything worked out from it: the Codex entries it
 * brought in, the goals it achieved or missed, the route it broke and the
 * ending it reached. So is anything chosen after reading it (a direction for
 * the chapter after it), and the story head points back at it. Its attempt
 * stays, with the replaced version's reply. The input is never changed.
 */
export function withoutLatestChapter(state: HarnessWorkspaceState, storyId: string): HarnessWorkspaceState {
  const latest = latestStoryChapter(state, storyId);
  if (!latest) throw new Error('This story has no chapter to rewrite.');
  const next = cloneHarnessValue(state);
  const story = findStory(next, storyId)!;
  const { id, chapterNumber } = latest;
  next.chapters = next.chapters.filter(chapter => chapter.id !== id);

  // The Codex entries the chapter brought in: those its tags created, and a
  // declared character it named first. Entries an earlier chapter uses stay.
  const usedEarlier = new Set(next.chapters.filter(chapter => chapter.storyId === storyId)
    .flatMap(chapter => (chapter.holdingChanges ?? []).flatMap(change => [change.payload.holder.entryId, change.payload.target?.entryId])));
  const usedHere = new Set((latest.holdingChanges ?? []).flatMap(change => [change.payload.holder.entryId, change.payload.target?.entryId]));
  next.codexEntries = next.codexEntries.filter(entry => entry.storyId !== storyId || !(
    (entry.origin.source === 'tag' && entry.origin.chapterId === id) || (usedHere.has(entry.id) && !usedEarlier.has(entry.id))
  ));

  const previous = next.chapters.filter(chapter => chapter.storyId === storyId && chapter.chapterNumber < chapterNumber)
    .sort((left, right) => left.chapterNumber - right.chapterNumber).at(-1);
  story.head = {
    nextChapterNumber: chapterNumber,
    ...(previous ? { lastCommittedChapterId: previous.id, lastCommittedAt: previous.committedAt } : {}),
  };
  if (story.goalCompletions) story.goalCompletions = story.goalCompletions.filter(done => done.chapterNumber < chapterNumber);
  if (story.brokenRoute && story.brokenRoute.chapterNumber >= chapterNumber) delete story.brokenRoute;
  if (story.conclusion && story.conclusion.chapterNumber >= chapterNumber) delete story.conclusion;
  if (story.nextChapterDirection && story.nextChapterDirection.forChapter > chapterNumber) delete story.nextChapterDirection;
  return next;
}
