import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { NarrativeAudioProvider, useOptionalNarrativeAudio, type NarrativeAudioPlayback } from '../../../audio/playback';
import { ReaderRuntimeProvider, type NarrationPlayback, type ReaderRuntime, type ReaderStoreSnapshot } from '../../../narrative/readerRuntime';
import type { StoryMemory, StoryWorld } from '../../../narrative/story';

/** The Codex loads when the reader first opens it, so reading never waits for it. */
const ReaderCodex = lazy(() => import('../../reader-codex/development/ReaderCodex'));

const noop = () => undefined;
const keepStory = async () => undefined;
const EMPTY_MEMORY: StoryMemory = {};

const SILENT_NARRATION: NarrationPlayback = {
  isPlayingText: false, isPausedText: false, speechRate: 1, speechPitch: 1, speechVolume: 1,
  availableVoices: [], selectedVoiceURI: '', selectedDialogueVoiceURI: '', selectedSideVoiceURI: '',
  activeChunks: [], currentChunkIndex: 0, currentNarratedBlockIndex: null,
  setSpeechRate: noop, setSpeechPitch: noop, setSpeechVolume: noop,
  setSelectedVoiceURI: noop, setSelectedDialogueVoiceURI: noop, setSelectedSideVoiceURI: noop,
  handleTogglePlayback: noop, handleStopSpeaking: noop,
};

/** A player that plays nothing, for the Codex's voice cards when the host has none of its own. */
const SILENT_AUDIO: NarrativeAudioPlayback = {
  autoplayBlocked: false, currentSource: null, currentTrackId: null, errorMessage: '', hasError: false,
  isBuffering: false, isMuted: false, isPlaying: false, volume: 1,
  load: noop, pause: noop, play: noop, replace: noop, restart: () => false, setVolume: noop, stop: noop,
  subscribe: () => noop, subscribeToTrackChange: () => noop, subscribeToQueueEnd: () => noop, toggleMute: noop,
};

/**
 * What the Codex needs from its host, with nothing switched on: it makes no
 * model call, no image and no voice, and saves nothing. The Reader's own
 * Listen and soundtrack are untouched by it.
 */
function quietCodexRuntime(story: StoryWorld): ReaderRuntime {
  const snapshot: ReaderStoreSnapshot = {
    stories: [story], activeStoryId: story.id, readerMode: 'reader',
    immersion: { master: false, autoScroll: false, imagePopups: false },
    isReaderFullscreen: false, canShowOverlays: false, languagePreferences: null, activeAgentId: null,
    isGenerating: false, autoPlayNarration: false,
    audioMix: {
      master: { enabled: true, volume: 1 }, music: { enabled: true, volume: 1 },
      atmosphere: { enabled: true, volume: 1 }, cues: { enabled: true, volume: 1 },
    },
    setReaderMode: noop, setImmersion: noop, setIsReaderFullscreen: noop, setCanShowOverlays: noop,
    setAutoPlayNarration: noop, updateStory: keepStory, saveStories: async () => undefined,
  };
  return {
    store: { getSnapshot: () => snapshot, subscribe: () => noop },
    useNarration: () => SILENT_NARRATION,
    tracks: [],
    setAudioChannel: noop,
    canGenerate: () => false,
    canManifest: () => false,
  };
}

/**
 * The Codex, as its own page inside the Reader Chamber: the story's world,
 * opened from the top bar while the chapter waits underneath at the reader's
 * place. It is the development Reader Codex, shown as it is and not yet fed
 * the story's world (its pages are empty until that is designed), so its
 * screens can be worked on in the Reader itself. The Reader adds its own
 * pages to it, such as Holdings.
 */
export function ReaderCodexPage({ storyId, storyTitle, mainCharacter, onBack, pages }: {
  storyId: string;
  storyTitle: string;
  /** The main character's name, which the Codex uses in its captions. */
  mainCharacter?: string;
  onBack: () => void;
  /** The Reader's own pages, listed after Lore. */
  pages: readonly { id: string; label: string; content: ReactNode }[];
}) {
  const mcName = mainCharacter ?? 'Main character';
  const story = useMemo((): StoryWorld => ({
    id: storyId, title: storyTitle, genre: '', mcName, customPremise: '',
    createdAt: '', updatedAt: '', arcs: [], currentChapterNumber: 0,
  } as StoryWorld), [storyId, storyTitle, mcName]);
  const runtime = useMemo(() => quietCodexRuntime(story), [story]);
  const audio = useOptionalNarrativeAudio() ?? SILENT_AUDIO;
  return <section className="mx-auto w-full min-w-0 max-w-6xl px-3 pb-12 pt-[max(1rem,env(safe-area-inset-top))] sm:px-4"
    aria-labelledby="reader-codex-title" data-testid="reader-codex-page">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">{storyTitle}</p>
        <h1 id="reader-codex-title" className="mt-1 font-display text-2xl text-white">Codex</h1>
      </div>
      <button type="button" onClick={onBack} className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/30">Back to reading</button>
    </div>
    <ReaderRuntimeProvider value={runtime}><NarrativeAudioProvider value={audio}>
      <Suspense fallback={<p role="status" className="text-sm text-neutral-400">Opening the Codex…</p>}>
        <ReaderCodex memory={EMPTY_MEMORY} arcs={[]} onUpdateMemory={noop} mcName={mcName} activeStory={story}
          updateStoryFields={keepStory} extraPages={pages} />
      </Suspense>
    </NarrativeAudioProvider></ReaderRuntimeProvider>
  </section>;
}
