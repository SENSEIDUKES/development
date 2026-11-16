import { buildReadAloudScript, type ReadAloudScript } from '../../../narrative/readAloud';
import type { HarnessChapter, HarnessWorkspaceState } from '../../../narrative/generation';
import { findStory } from './foundation';
import { harnessParagraphBlockId } from './chapterBody';
import { protagonistNames } from './speakers';

/** A chapter's paragraphs under the ids its Sound Cues and speaker records use. */
export const chapterReadAloudBlocks = (chapter: Pick<HarnessChapter, 'chapterNumber' | 'paragraphs'>) =>
  chapter.paragraphs.map((text, index) => ({ id: harnessParagraphBlockId(chapter.chapterNumber, index), text }));

/**
 * A saved chapter as the lines Read Aloud speaks. The Reader and anything that
 * prepares audio for a chapter build it here, so both name every line the same.
 */
export function chapterReadAloudScript(state: HarnessWorkspaceState, chapter: HarnessChapter): ReadAloudScript {
  // The main character as this chapter's writer was told: speech it left untagged is voiced from its narration.
  const attempt = state.attempts.find(item => item.id === chapter.attemptId);
  return buildReadAloudScript({
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    language: findStory(state, chapter.storyId)?.originalLanguage ?? 'en',
    paragraphs: chapterReadAloudBlocks(chapter),
    speakers: chapter.speakers,
    mainCharacter: attempt ? protagonistNames(attempt.storyInformation.currentStory, attempt.storyInformation.canonicalState.characters) : undefined,
    soundCues: chapter.soundCues,
  });
}
