import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import type { SenLanguageCode } from '../lib/language';
import type { Character, ReaderChapter, StoryWorld, UpdateStoryFields } from './story';
import type { CodexVoiceResolution } from './voice';
import type { SceneAudioTrack } from '../audio/soundscapes';
import { collectCodexTerms } from './codexHighlighting';

export type AudioChannelId = 'master' | 'music' | 'atmosphere' | 'cues';
export interface AudioChannelState { enabled: boolean; volume: number }
export type AudioMixState = Record<AudioChannelId, AudioChannelState>;
export interface ReaderLanguagePreferences { interfaceLanguage?: SenLanguageCode; defaultReadingLanguage?: SenLanguageCode }
export interface ImmersionSettingsState { master: boolean; autoScroll: boolean; imagePopups: boolean }

/** Only reading state and host commands. No Library identity, tier, balance, or account model. */
export interface ReaderStoreSnapshot {
  stories: StoryWorld[];
  activeStoryId: string | null;
  readerMode: string;
  immersion: ImmersionSettingsState;
  isReaderFullscreen: boolean;
  canShowRelicInReader: boolean;
  languagePreferences: ReaderLanguagePreferences | null;
  activeAgentId: string | null;
  isGenerating: boolean;
  autoPlayNarration: boolean;
  audioMix: AudioMixState;
  setReaderMode(mode: string): void;
  setImmersion(value: Partial<ImmersionSettingsState>): void;
  setIsReaderFullscreen(value: boolean): void;
  setCanShowRelicInReader(value: boolean): void;
  setAutoPlayNarration(value: boolean): void;
  updateStory: UpdateStoryFields;
  saveStories(): Promise<void>;
}

export interface NarrationPlayback {
  isPlayingText: boolean;
  isPausedText: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  availableVoices: Array<{ voiceURI: string; name: string }>;
  selectedVoiceURI: string;
  selectedDialogueVoiceURI: string;
  selectedSideVoiceURI: string;
  activeChunks: Array<{ paragraphIndex: number; text: string }>;
  currentChunkIndex: number;
  setSpeechRate(value: number | ((previous: number) => number)): void;
  setSpeechPitch(value: number | ((previous: number) => number)): void;
  setSpeechVolume(value: number | ((previous: number) => number)): void;
  setSelectedVoiceURI(value: string): void;
  setSelectedDialogueVoiceURI(value: string): void;
  setSelectedSideVoiceURI(value: string): void;
  handleTogglePlayback(): void;
  handleStopSpeaking(): void;
  currentNarratedBlockIndex: number | null;
}

export interface GlossaryInput {
  storyTitle: string; mcName: string; powerSystem?: string;
  characterNames: string[]; factionNames: string[]; routingConfig?: unknown;
}
export interface GlossaryTerm { term: string; category: string; definition: string }

/** Host-scoped, advisory reader preferences. Keys contain no Library or Workshop namespace. */
export interface ReaderPreferenceStorage {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export interface ReaderRuntime {
  store: { getSnapshot(): ReaderStoreSnapshot; subscribe(listener: () => void): () => void };
  /** Hooks are supplied once for a mounted provider and follow React's hook rules. */
  useNarration(input: { selectedChapter: ReaderChapter; activeTranslationContent: string | null }): NarrationPlayback;
  tracks: readonly SceneAudioTrack[];
  setAudioChannel(channel: AudioChannelId, value: Partial<AudioChannelState>): void;
  haptic?: (pattern?: string) => void;
  /** UI affordances only. The host must independently enforce every actual operation. */
  canGenerate(storyId: string): boolean;
  canManifest(storyId: string): boolean;
  manifestReveal?: (entry: unknown, type: string) => void;
  saveReadingPosition?: (position: unknown) => void;
  extractGlossary?: (input: GlossaryInput) => Promise<GlossaryTerm[]>;
  defaultGlossary?: readonly GlossaryTerm[];
  preferences?: ReaderPreferenceStorage;
  requestVoice?: (character: Character) => Promise<CodexVoiceResolution>;
  selectMusicTrack?: (id: string) => void;
}

const ReaderRuntimeContext = createContext<ReaderRuntime | null>(null);

export function ReaderRuntimeProvider({ value, children }: PropsWithChildren<{ value: ReaderRuntime }>) {
  return <ReaderRuntimeContext.Provider value={value}>{children}</ReaderRuntimeContext.Provider>;
}

export function useReaderRuntime(): ReaderRuntime {
  const runtime = useContext(ReaderRuntimeContext);
  if (!runtime) throw new Error('Reader and Codex require a host ReaderRuntimeProvider.');
  return runtime;
}

export function useReaderStore(): ReaderStoreSnapshot;
export function useReaderStore<T>(selector: (state: ReaderStoreSnapshot) => T): T;
export function useReaderStore<T>(selector?: (state: ReaderStoreSnapshot) => T) {
  const { store } = useReaderRuntime();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return selector ? selector(snapshot) : snapshot;
}

export function useReaderPlayback(input: { selectedChapter: ReaderChapter; activeTranslationContent: string | null }) {
  return useReaderRuntime().useNarration(input);
}

export function useAudioMix() {
  const runtime = useReaderRuntime();
  const mix = useReaderStore(state => state.audioMix);
  return { mix, setChannel: runtime.setAudioChannel };
}

export function useReaderVisuals(input: { selectedChapter: ReaderChapter; activeStory: StoryWorld; readerMode: string }) {
  const runtime = useReaderRuntime();
  const codexTerms = useMemo(() => collectCodexTerms(input.activeStory.memory), [input.activeStory.memory]);
  return { codexTerms, handleManifestReveal: runtime.manifestReveal, generatingRevealId: null };
}

export function useReadingPosition(position: { activeStory: StoryWorld; selectedChapterNum: number; hasRenderableContent: boolean; contentRef: unknown; updateStoryFields: unknown }) {
  const { saveReadingPosition } = useReaderRuntime();
  useEffect(() => { saveReadingPosition?.(position); }, [saveReadingPosition, position.activeStory.id, position.selectedChapterNum, position.hasRenderableContent]);
}

export function useCinematicScroll(_contentRef: unknown) {
  const [state, setState] = useState<'idle' | 'following' | 'yielded'>('idle');
  return { state, resume: () => setState('following'), intervene: () => setState('yielded') };
}

export const selectIsGenerating = (state: { isGenerating?: boolean }) => Boolean(state.isGenerating);
