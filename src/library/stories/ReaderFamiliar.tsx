import { useOptionalReaderMixer } from '@seihouse/audio-player';
import { CHAPTER_DIRECTION_TEXT_LIMIT, CHAPTER_FUNCTION_LABELS, type HarnessGenerationController, type HarnessWorkspaceState, type ReaderHostTools, type ReaderSoundAuthoring, type ChapterDirectionChoice } from '@seihouse/sen/harness-generation';
import { useFamiliarHelperContext } from '../../components/familiar/development/FamiliarHelper';
import type { FamiliarHelperAction, FamiliarHelperContext } from '../familiars/helper';
import { parseReaderSoundCommand } from './readerSoundCommand';

/** The longest Sound Cue request the Familiar takes after "add". */
const SOUND_REQUEST_LIMIT = 200;

/**
 * Add a Sound Cue by voice or typing: "Add wind on whistling drafts", or "Add
 * wind right there" while listening. SEN finds the words and makes the same
 * cue a highlight would; the Familiar only reads the request. Each step
 * re-reads the chapter, so a proposal is never applied to words that moved.
 */
function soundAction(sounds: ReaderSoundAuthoring, playCue?: (url: string) => void): FamiliarHelperAction {
  const resolve = (input: string) => {
    const command = parseReaderSoundCommand(input, sounds.soundWords);
    return command.ok ? sounds.resolve(command.sound, command.target) : command;
  };
  return {
    id: 'sound', label: 'Add sound', phrases: ['add', 'put', 'place'],
    input: { label: 'Sound and where it goes', maxLength: SOUND_REQUEST_LIMIT },
    check: input => { const result = resolve(input); return result.ok ? undefined : result.problem; },
    describe: input => {
      const result = resolve(input);
      if (!result.ok) return result.problem;
      const { cue, paragraph, occurrences } = result;
      const again = occurrences > 1 ? ` Those words appear ${occurrences} times in this chapter.` : '';
      return `Chapter ${sounds.chapterNumber}: “${cue.payload.sound}” on “${cue.anchor.selectedText}”, paragraph ${paragraph + 1}.${again}`;
    },
    ...(playCue ? { preview: (input: string) => { const result = resolve(input); if (result.ok) playCue(result.cue.payload.cue.publicUrl); } } : {}),
    success: `Sound placed in Chapter ${sounds.chapterNumber}. Listen plays it when the voice reaches those words.`,
    run: async input => {
      const result = resolve(input);
      if (!result.ok) throw new Error(result.problem);
      await sounds.place(result.cue);
    },
  };
}

/** The Reader supplies Fate actions to the global helper; saving still belongs to SEN. */
export function readerFamiliarContext(state: HarnessWorkspaceState, storyId: string, controller: HarnessGenerationController, tools: ReaderHostTools, playCue?: (url: string) => void): FamiliarHelperContext {
  const story = state.stories.find(entry => entry.id === storyId);
  const next = story?.head.nextChapterNumber;
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId).sort((a, b) => b.chapterNumber - a.chapterNumber);
  const ideas = chapters.find(chapter => chapter.rhythm?.nextChapterSuggestions)?.rhythm?.nextChapterSuggestions ?? {};
  const blocked = tools.busy || !story || Boolean(story.conclusion);
  const sounds = tools.sounds;
  const key = JSON.stringify([storyId, tools.chapterId, next, blocked, ideas, sounds?.soundWords ?? null]);
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
  const fate: FamiliarHelperAction[] = blocked ? [] : [
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
  const actions = sounds ? [...fate, soundAction(sounds, playCue)] : fate;
  const example = sounds?.soundWords[0] ?? 'wind';
  const soundHint = sounds ? ` To add a sound, say “Add ${example} on” and its words, or “Add ${example} right there” while listening.` : '';
  return {
    key, actions,
    title: !story ? 'Reader' : !sounds ? `Fate · Chapter ${next}`
      : blocked ? `Sounds · Chapter ${sounds.chapterNumber}` : `Sounds · Chapter ${sounds.chapterNumber} · Fate · Chapter ${next}`,
    hint: (blocked ? 'Fate is unavailable while writing or after the story ends.'
      : 'Say World Building, Progression, Conflict, or Custom followed by your direction.') + soundHint,
    interrupt: tools.interruptPlayback,
  };
}

/** Mounted through SEN's host slot, so the same bridge serves the app and Workshop Reader. */
export function ReaderFamiliar({ state, storyId, controller, tools }: {
  state: HarnessWorkspaceState; storyId: string; controller: HarnessGenerationController; tools: ReaderHostTools;
}) {
  const mixer = useOptionalReaderMixer();
  const context = readerFamiliarContext(state, storyId, controller, tools, mixer ? url => { mixer.playCue(url); } : undefined);
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
