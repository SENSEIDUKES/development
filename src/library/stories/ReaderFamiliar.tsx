import { useOptionalReaderMixer } from '@seihouse/audio-player';
import { CHAPTER_DIRECTION_TEXT_LIMIT, CHAPTER_FUNCTION_LABELS, type HarnessGenerationController, type HarnessWorkspaceState, type ReaderHostTools, type ChapterDirectionChoice } from '@seihouse/sen/harness-generation';
import { useFamiliarHelperContext } from '../../components/familiar/development/FamiliarHelper';
import type { FamiliarHelperAction, FamiliarHelperContext } from '../familiars/helper';

/** The Reader supplies Fate actions to the global helper; saving still belongs to SEN. */
export function readerFamiliarContext(state: HarnessWorkspaceState, storyId: string, controller: HarnessGenerationController, tools: ReaderHostTools): FamiliarHelperContext {
  const story = state.stories.find(entry => entry.id === storyId);
  const next = story?.head.nextChapterNumber;
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId).sort((a, b) => b.chapterNumber - a.chapterNumber);
  const ideas = chapters.find(chapter => chapter.rhythm?.nextChapterSuggestions)?.rhythm?.nextChapterSuggestions ?? {};
  const blocked = tools.busy || !story || Boolean(story.conclusion);
  const key = JSON.stringify([storyId, tools.chapterId, next, blocked, ideas]);
  const save = async (choice: ChapterDirectionChoice) => {
    const current = controller.snapshot();
    const currentStory = current.stories.find(entry => entry.id === storyId);
    const currentIdeas = current.chapters.filter(chapter => chapter.storyId === storyId).sort((a, b) => b.chapterNumber - a.chapterNumber)
      .find(chapter => chapter.rhythm?.nextChapterSuggestions)?.rhythm?.nextChapterSuggestions ?? {};
    if (currentStory?.head.nextChapterNumber !== next || JSON.stringify(currentIdeas) !== JSON.stringify(ideas)) {
      throw new Error('The next chapter changed. Choose its path again.');
    }
    await controller.chooseChapterDirection(storyId, choice);
  };
  const success = `Path saved for Chapter ${next}.`;
  const actions: FamiliarHelperAction[] = blocked ? [] : [
    ...(['worldBuilding', 'progression', 'conflict'] as const).map(chapterFunction => ({
      id: chapterFunction,
      label: CHAPTER_FUNCTION_LABELS[chapterFunction],
      phrases: chapterFunction === 'worldBuilding' ? ['world building', 'world-building', 'worldbuilding'] : [chapterFunction],
      describe: () => `Chapter ${next}: ${CHAPTER_FUNCTION_LABELS[chapterFunction]}${ideas[chapterFunction] ? ` — ${ideas[chapterFunction]}` : '.'}`,
      success,
      run: () => save({ kind: 'chapter-function', chapterFunction, ...(ideas[chapterFunction] ? { suggestion: ideas[chapterFunction] } : {}) }),
    })),
    {
      id: 'custom', label: 'Custom', phrases: ['custom'],
      input: { label: 'Your direction', maxLength: CHAPTER_DIRECTION_TEXT_LIMIT },
      describe: text => `Chapter ${next}: ${text}`,
      success, run: text => save({ kind: 'reader', text }),
    },
  ];
  return {
    key, title: story ? `Fate · Chapter ${next}` : 'Reader', actions,
    hint: blocked ? 'Fate is unavailable while writing or after the story ends.'
      : 'Say World Building, Progression, Conflict, or Custom followed by your direction.',
    interrupt: tools.interruptPlayback,
  };
}

/** Mounted through SEN's host slot, so the same bridge serves the app and Workshop Reader. */
export function ReaderFamiliar({ state, storyId, controller, tools }: {
  state: HarnessWorkspaceState; storyId: string; controller: HarnessGenerationController; tools: ReaderHostTools;
}) {
  const mixer = useOptionalReaderMixer();
  const context = readerFamiliarContext(state, storyId, controller, tools);
  useFamiliarHelperContext({
    ...context,
    interrupt: () => {
      const release = tools.interruptPlayback();
      const duck = mixer?.retainDuck();
      duck?.setDuck(1);
      return resume => { duck?.release(); release(resume); };
    },
  });
  return null;
}
