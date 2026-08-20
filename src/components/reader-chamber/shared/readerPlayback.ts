/**
 * Reader playback — Workshop replica.
 *
 * `extractSFXCues` reuses the dependency-free Reader-visible text boundary
 * that inline-audio placement also validates against.
 *
 * `useReaderPlayback` is an inert stand-in matching the exact destructured
 * shape `ReaderChamber.tsx` consumes. Playback state lives in the mock app
 * store so the play/pause vinyl visibly flips, but no speech synthesis or
 * audio ever runs.
 */

import type { ReaderChapter } from './types';
import { setMockState, useAppStore } from './stubs';
import { extractReaderVisibleAudioText } from '../../../audio/readerVisibleText';

export const extractSFXCues = extractReaderVisibleAudioText;

export interface MockVoice {
  voiceURI: string;
  name: string;
}

/** Placeholder voices so the Voice Matrix selects render realistic rows. */
export const MOCK_VOICES: MockVoice[] = [
  { voiceURI: 'mock-narrator-aurelia', name: 'Aurelia — Narrator (Workshop)' },
  { voiceURI: 'mock-dialogue-kaito', name: 'Kaito — Protagonist (Workshop)' },
  { voiceURI: 'mock-side-mei', name: 'Mei — Companion (Workshop)' },
];

const pick = <T,>(value: T | ((prev: T) => T), prev: T): T =>
  typeof value === 'function' ? (value as (p: T) => T)(prev) : value;

export function useReaderPlayback(_args: {
  selectedChapter: ReaderChapter;
  activeTranslationContent: string | null;
}) {
  const isPlayingText = useAppStore((s) => s.isPlayingText);
  const isPausedText = useAppStore((s) => s.isPausedText);
  const speechRate = useAppStore((s) => s.speechRate);
  const speechPitch = useAppStore((s) => s.speechPitch);
  const speechVolume = useAppStore((s) => s.speechVolume);
  const selectedVoiceURI = useAppStore((s) => s.selectedVoiceURI);
  const selectedDialogueVoiceURI = useAppStore((s) => s.selectedDialogueVoiceURI);
  const selectedSideVoiceURI = useAppStore((s) => s.selectedSideVoiceURI);

  const handleTogglePlayback = () => {
    const { isPlayingText: playing, isPausedText: paused } = useAppStore.getState();
    if (playing && !paused) {
      setMockState({ isPausedText: true });
    } else {
      setMockState({ isPlayingText: true, isPausedText: false });
    }
  };

  const handleStopSpeaking = () => {
    setMockState({ isPlayingText: false, isPausedText: false });
  };

  return {
    isPlayingText,
    isPausedText,
    speechRate,
    speechPitch,
    speechVolume,
    availableVoices: MOCK_VOICES,
    selectedVoiceURI,
    selectedDialogueVoiceURI,
    selectedSideVoiceURI,
    activeChunks: [] as { paragraphIndex: number; text: string }[],
    currentChunkIndex: 0,
    setSpeechRate: (v: number | ((prev: number) => number)) =>
      setMockState({ speechRate: pick(v, useAppStore.getState().speechRate) }),
    setSpeechPitch: (v: number | ((prev: number) => number)) =>
      setMockState({ speechPitch: pick(v, useAppStore.getState().speechPitch) }),
    setSpeechVolume: (v: number | ((prev: number) => number)) =>
      setMockState({ speechVolume: pick(v, useAppStore.getState().speechVolume) }),
    setSelectedVoiceURI: (uri: string) => setMockState({ selectedVoiceURI: uri }),
    setSelectedDialogueVoiceURI: (uri: string) =>
      setMockState({ selectedDialogueVoiceURI: uri }),
    setSelectedSideVoiceURI: (uri: string) => setMockState({ selectedSideVoiceURI: uri }),
    handleTogglePlayback,
    handleStopSpeaking,
    currentNarratedBlockIndex: -1 as number | null,
  };
}
