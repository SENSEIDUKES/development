import { useOptionalReaderMixer } from '@seihouse/audio-player';
import { CHAPTER_DIRECTION_TEXT_LIMIT, CHAPTER_FUNCTION_LABELS, type HarnessGenerationController, type HarnessWorkspaceState, type ReaderHostTools, type ReaderSoundAuthoring, type ChapterDirectionChoice } from '@seihouse/sen/harness-generation';
import { AudioLines, Globe, PenLine, Swords, TrendingUp } from 'lucide-react';
import { useFamiliarHelperContext } from '../../components/familiar/development/FamiliarHelper';
import type { FamiliarHelperAction, FamiliarHelperContext, FamiliarIcon, FamiliarTopic } from '../familiars/helper';
import { useFamiliarHelpTopics } from '../familiars/helpTopics';
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
  // The cue as shown for review, so "right there" never follows Listen to a later sentence before Confirm.
  const reviewed = (input: string, prepared: unknown) => (prepared as ReturnType<typeof resolve> | undefined) ?? resolve(input);
  return {
    id: 'sound', label: 'Add sound', icon: AudioLines, detail: 'On words you name, or right there', phrases: ['add', 'put', 'place'],
    input: { label: 'Sound and where it goes', maxLength: SOUND_REQUEST_LIMIT },
    check: input => { const result = resolve(input); return result.ok ? undefined : result.problem; },
    describe: input => {
      const result = resolve(input);
      if (!result.ok) return result.problem;
      const { cue, paragraph, occurrences } = result;
      const again = occurrences > 1 ? ` Those words appear ${occurrences} times in this chapter.` : '';
      return `Chapter ${sounds.chapterNumber}: “${cue.payload.sound}” on “${cue.anchor.selectedText}”, paragraph ${paragraph + 1}.${again}`;
    },
    prepare: resolve,
    ...(playCue ? { preview: (input: string, prepared?: unknown) => { const result = reviewed(input, prepared); if (result.ok) playCue(result.cue.payload.cue.publicUrl); } } : {}),
    success: `Sound placed in Chapter ${sounds.chapterNumber}. Listen plays it when the voice reaches those words.`,
    // The page checks the reviewed cue's words are still free as it adds it.
    run: async (input, prepared) => {
      const result = reviewed(input, prepared);
      if (!result.ok) throw new Error(result.problem);
      await sounds.place(result.cue);
    },
  };
}

/** Create mode: the Highlight Engine's commands (Sound Cues so far), only while it is open. Nothing to explain yet. */
export function createModeFamiliarContext(sounds: ReaderSoundAuthoring, interrupt: FamiliarHelperContext['interrupt'], playCue?: (url: string) => void): FamiliarHelperContext {
  const example = sounds.soundWords[0] ?? 'wind';
  return {
    key: JSON.stringify(['create-mode', sounds.chapterNumber, sounds.soundWords]),
    title: 'Create mode',
    topics: [],
    actions: [soundAction(sounds, playCue)],
    hint: `To add a sound, say “Add ${example} on” and its words, or “Add ${example} right there” while listening.`,
    interrupt,
  };
}

const FATE_ICONS: Record<'worldBuilding' | 'progression' | 'conflict', FamiliarIcon> = { worldBuilding: Globe, progression: TrendingUp, conflict: Swords };

/** The Reader: what it explains, and Fate as its actions (saving still belongs to SEN). */
export function readerFamiliarContext(state: HarnessWorkspaceState, storyId: string, controller: HarnessGenerationController, tools: ReaderHostTools, topics: readonly FamiliarTopic[] = []): FamiliarHelperContext {
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
      icon: FATE_ICONS[chapterFunction],
      ...(ideas[chapterFunction] ? { detail: ideas[chapterFunction] } : {}),
      phrases: chapterFunction === 'worldBuilding' ? ['world building', 'world-building', 'worldbuilding'] : [chapterFunction],
      describe: () => `Chapter ${next}: ${CHAPTER_FUNCTION_LABELS[chapterFunction]}${ideas[chapterFunction] ? ` — ${ideas[chapterFunction]}` : '.'}`,
      success,
      run: () => save({ kind: 'chapter-function', chapterFunction, ...(ideas[chapterFunction] ? { suggestion: ideas[chapterFunction] } : {}) }),
    })),
    {
      id: 'custom', label: 'Custom', icon: PenLine, detail: 'Your own direction', phrases: ['custom'],
      input: { label: 'Your direction', maxLength: CHAPTER_DIRECTION_TEXT_LIMIT },
      describe: text => `Chapter ${next}: ${text}`,
      success, run: text => save({ kind: 'reader', text }),
    },
  ];
  return {
    key, title: 'Reader', topics, actions,
    hint: blocked ? 'Fate is unavailable while writing or after the story ends.'
      : 'Say World Building, Progression, Conflict, or Custom followed by your direction.',
    interrupt: tools.interruptPlayback,
  };
}

/**
 * Mounted through SEN's host slot, so the same bridge serves the app and
 * Workshop Reader. Where the reader is decides what the Familiar offers: the
 * Reader's Fate, or Create mode's commands while Create mode is open.
 */
export function ReaderFamiliar({ state, storyId, controller, tools }: {
  state: HarnessWorkspaceState; storyId: string; controller: HarnessGenerationController; tools: ReaderHostTools;
}) {
  const mixer = useOptionalReaderMixer();
  const interrupt = () => {
    const release = tools.interruptPlayback();
    const duck = mixer?.retainDuck();
    duck?.setDuck(1);
    return (resume: boolean) => { duck?.release(); release(resume); };
  };
  const topics = useFamiliarHelpTopics('reader');
  const create = tools.createMode;
  useFamiliarHelperContext(create
    ? createModeFamiliarContext(create.sounds, interrupt, mixer ? url => { mixer.playCue(url); } : undefined)
    : { ...readerFamiliarContext(state, storyId, controller, tools, topics), interrupt });
  return null;
}
