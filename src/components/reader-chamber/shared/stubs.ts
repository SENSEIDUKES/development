/**
 * Workshop stubs for the Reader Chamber replica.
 *
 * Every production dependency the copied presentation components import is
 * replaced here with a lightweight, fully local stand-in:
 *
 * - `useAppStore` / `selectIsGenerating` — a tiny external store built on
 *   `useSyncExternalStore` (no zustand). Setters genuinely update state so
 *   preferences, immersion toggles, fullscreen, playback and the audio mix
 *   visibly respond in the preview. The store intentionally mimics the
 *   zustand call signatures (`useAppStore(selector)` + `.getState()`).
 * - `LOCAL_ONLY_MODE` — always true (no Firebase in the Workshop).
 * - `useChapterTranslation`, `useCinematicScroll`, `useReadingPosition` —
 *   inert hooks matching the exact destructured shapes the copied components
 *   use. `useReaderVisuals` still returns local Codex terms from story memory.
 * - `useAudioMix`, `vibrate`, card-sound helpers — inert audio engine:
 *   settings are real state (so the toggles move), but no sound ever plays.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type {
  ReaderChapter,
  ReaderCodexStoryPatchUpdater,
  StoryWorld,
  UpdateStoryFields,
} from './types';
import { collectCodexTerms } from '../../reader-codex/shared/codexHighlighting';

export const LOCAL_ONLY_MODE = true;

// ─── Mock app store ──────────────────────────────────────────────────────────

export interface ImmersionSettingsState {
  master: boolean;
  autoScroll: boolean;
  imagePopups: boolean;
}

export type AudioChannelId = 'master' | 'music' | 'atmosphere' | 'cues';

export interface AudioChannelState {
  enabled: boolean;
  volume: number;
}

export interface AudioMixState {
  master: AudioChannelState;
  music: AudioChannelState;
  atmosphere: AudioChannelState;
  cues: AudioChannelState;
}

export interface MockUserProfile {
  preferredLanguage?: string;
  defaultTranslationLanguage?: string;
}

export type CinematicScrollStateName = 'idle' | 'following' | 'yielded';

export interface MockAppState {
  stories: StoryWorld[];
  activeStoryId: string | null;
  readerMode: string;
  immersion: ImmersionSettingsState;
  isReaderFullscreen: boolean;
  canShowRelicInReader: boolean;
  userProfile: MockUserProfile | null;
  currentUser: null;
  activeAgentId: string | null;
  isGenerating: boolean;
  streamingChapter: null;
  autoPlayNarration: boolean;
  // Narration playback (drives the useReaderPlayback stub in readerPlayback.ts)
  isPlayingText: boolean;
  isPausedText: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  selectedVoiceURI: string;
  selectedDialogueVoiceURI: string;
  selectedSideVoiceURI: string;
  // Translation (drives the useChapterTranslation stub below)
  isTranslating: boolean;
  translationError: string | null;
  // Cinematic scroll (drives the useCinematicScroll stub below)
  cinematicScrollState: CinematicScrollStateName;
  // Audio mix (drives the useAudioMix stub below)
  audioMix: AudioMixState;
}

export const createInitialMockState = (overrides: Partial<MockAppState> = {}): MockAppState => ({
  stories: [],
  activeStoryId: null,
  readerMode: 'sen',
  immersion: { master: true, autoScroll: true, imagePopups: true },
  isReaderFullscreen: false,
  canShowRelicInReader: true,
  userProfile: null,
  currentUser: null,
  activeAgentId: null,
  isGenerating: false,
  streamingChapter: null,
  autoPlayNarration: false,
  isPlayingText: false,
  isPausedText: false,
  speechRate: 1,
  speechPitch: 1,
  speechVolume: 1,
  selectedVoiceURI: 'mock-narrator-aurelia',
  selectedDialogueVoiceURI: 'mock-dialogue-kaito',
  selectedSideVoiceURI: 'mock-side-mei',
  isTranslating: false,
  translationError: null,
  cinematicScrollState: 'idle',
  audioMix: {
    master: { enabled: true, volume: 0.8 },
    music: { enabled: true, volume: 0.7 },
    atmosphere: { enabled: true, volume: 0.6 },
    cues: { enabled: true, volume: 0.8 },
  },
  ...overrides,
});

type Listener = () => void;
const listeners = new Set<Listener>();
let state: MockAppState = createInitialMockState();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export function setMockState(partial: Partial<MockAppState>) {
  state = { ...state, ...partial };
  emit();
}

export function resetMockState(overrides: Partial<MockAppState> = {}) {
  state = createInitialMockState(overrides);
  emit();
}

/** Mutate a story in the mock catalog outside the production patch boundary
 *  (Workshop-only; e.g. flipping a chapter's read status). */
export function updateMockStory(
  storyId: string,
  updater: (current: StoryWorld) => Partial<StoryWorld>,
) {
  setMockState({
    stories: state.stories.map((s) => (s.id === storyId ? { ...s, ...updater(s) } : s)),
  });
}

const mockActions = {
  setReaderMode: (readerMode: string) => setMockState({ readerMode }),
  setImmersion: (partial: Partial<ImmersionSettingsState>) =>
    setMockState({ immersion: { ...state.immersion, ...partial } }),
  setIsReaderFullscreen: (isReaderFullscreen: boolean) =>
    setMockState({ isReaderFullscreen }),
  setCanShowRelicInReader: (canShowRelicInReader: boolean) =>
    setMockState({ canShowRelicInReader }),
  setAutoPlayNarration: (autoPlayNarration: boolean) =>
    setMockState({ autoPlayNarration }),
  updateStory: (async (
    storyId: string,
    updates: ReaderCodexStoryPatchUpdater,
  ) => {
    setMockState({
      stories: state.stories.map((s) => {
        if (s.id !== storyId) return s;
        const patch = typeof updates === 'function' ? updates(s) : updates;
        return { ...s, ...patch };
      }),
    });
  }) as UpdateStoryFields,
  saveStories: async () => {},
};

export type MockAppStore = MockAppState & typeof mockActions;

function useAppStoreBase(): MockAppStore;
function useAppStoreBase<T>(selector: (store: MockAppStore) => T): T;
function useAppStoreBase<T>(selector?: (store: MockAppStore) => T): T | MockAppStore {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);
  const snapshot = useSyncExternalStore(subscribe, () => state);
  const store = { ...snapshot, ...mockActions } as MockAppStore;
  return selector ? selector(store) : store;
}

/** Zustand-shaped stand-in for `store/useAppStore` (selector + getState). */
export const useAppStore = Object.assign(useAppStoreBase, {
  getState: (): MockAppStore => ({ ...state, ...mockActions }),
});

/** Stand-in for `store/useGenerationStore`'s `selectIsGenerating`. */
export const selectIsGenerating = (store: { isGenerating?: boolean }) =>
  Boolean(store?.isGenerating);

// ─── Translation stub ────────────────────────────────────────────────────────

export function useChapterTranslation() {
  const isTranslating = useAppStore((s) => s.isTranslating);
  const translationError = useAppStore((s) => s.translationError);
  return {
    translateChapter: async (
      _storyId: string,
      _chapterNumber: number,
      _text: string,
      _targetLang: string,
    ): Promise<string | null> => null,
    isTranslating,
    translationError,
  };
}

// ─── Reader visuals compatibility (local Codex terms, no media generation) ─

export function useReaderVisuals(args: {
  selectedChapter: ReaderChapter;
  activeStory: StoryWorld;
  readerMode: string;
}) {
  const codexTerms = useMemo(
    () => collectCodexTerms(args.activeStory.memory),
    [args.activeStory.memory],
  );

  return {
    handleManifestReveal: (_entry: unknown, _type: string) => {},
    generatingRevealId: null as string | null,
    codexTerms,
    manifestChapterHero: async (
      _chapterNumber: number,
      _promptText: string,
    ): Promise<string> => '',
    generatingIds: new Set<string>(),
    isMomentousChapter: false,
    triggerHeroGeneration: () => {},
  };
}

// ─── Cinematic scroll stub ───────────────────────────────────────────────────

export function useCinematicScroll(_contentRef: unknown) {
  const scrollState = useAppStore((s) => s.cinematicScrollState);
  return {
    state: scrollState,
    resume: () => setMockState({ cinematicScrollState: 'following' }),
    intervene: () => setMockState({ cinematicScrollState: 'yielded' }),
  };
}

// ─── Reading position stub ───────────────────────────────────────────────────

export function useReadingPosition(_args: unknown) {}

// ─── Audio engine stubs (settings are real state; playback is inert) ────────

export function useAudioMix() {
  const mix = useAppStore((s) => s.audioMix);
  const setChannel = (channel: AudioChannelId, partial: Partial<AudioChannelState>) =>
    setMockState({
      audioMix: {
        ...state.audioMix,
        [channel]: { ...state.audioMix[channel], ...partial },
      },
    });
  return { mix, setChannel };
}

export const vibrate = (_pattern?: string) => {};

// World Card curated-sound catalog: nothing resolves, playback never starts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resolveCardSound = (_card: unknown): any => null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const playCardSound = async (_asset: unknown, _opts?: { volume?: number }): Promise<any> => {
  throw new Error('Audio playback is inert in the Workshop replica.');
};
export const stopCardSound = (_assetId?: string) => {};
export const effectiveChannelVolume = (_channel: AudioChannelId) => 0;
export const isChannelAudible = (_channel: AudioChannelId) => false;
