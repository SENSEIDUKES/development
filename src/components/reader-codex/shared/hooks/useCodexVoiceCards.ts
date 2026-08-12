import { useEffect, useRef, useState } from 'react';
import type { Character, StoryMemory } from '../types';

interface UseCodexVoiceCardsOptions {
  memory: StoryMemory;
  onUpdateMemory: (memory: StoryMemory) => void;
}

const WORKSHOP_VOICE_PREFIX = 'workshop-voice:';

const clearAudioHandlers = (audio: HTMLAudioElement) => {
  audio.onplay = null;
  audio.onended = null;
  audio.onpause = null;
};

/**
 * Local voice-card simulator. Existing playable URLs still use Audio; newly
 * generated Workshop cards retain the source controls and use browser speech
 * synthesis without calling the production audio API or media store.
 */
export function useCodexVoiceCards({ memory, onUpdateMemory }: UseCodexVoiceCardsOptions) {
  const [generatingVoiceId, setGeneratingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentVoice = () => {
    if (audioRef.current) {
      clearAudioHandlers(audioRef.current);
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingVoiceId(null);
  };

  useEffect(() => () => {
    if (audioRef.current) {
      clearAudioHandlers(audioRef.current);
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handlePlayVoice = (url: string, charId: string) => {
    stopCurrentVoice();
    if (url.startsWith(WORKSHOP_VOICE_PREFIX)) {
      if (typeof window === 'undefined'
        || !('speechSynthesis' in window)
        || typeof SpeechSynthesisUtterance === 'undefined') return;
      const utterance = new SpeechSynthesisUtterance(
        decodeURIComponent(url.slice(WORKSHOP_VOICE_PREFIX.length)),
      );
      utterance.onstart = () => setPlayingVoiceId(charId);
      utterance.onend = () => setPlayingVoiceId(null);
      utterance.onerror = () => setPlayingVoiceId(null);
      window.speechSynthesis.speak(utterance);
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onplay = () => setPlayingVoiceId(charId);
    audio.onended = () => setPlayingVoiceId(null);
    audio.onpause = () => setPlayingVoiceId(null);
    void audio.play().catch(() => setPlayingVoiceId(null));
  };

  const handleStopVoice = () => stopCurrentVoice();

  const handleGenerateVoiceCard = async (character: Character) => {
    const quote = character.signatureQuote?.trim();
    if (!quote) return;
    setGeneratingVoiceId(character.id);
    try {
      await Promise.resolve();
      const voiceClipUrl = `${WORKSHOP_VOICE_PREFIX}${encodeURIComponent(quote)}`;
      onUpdateMemory({
        ...memory,
        characters: (memory.characters || []).map((entry) => (
          entry.id === character.id
            ? { ...entry, voicePresetId: entry.voicePresetId || 'workshop-local', voiceClipUrl }
            : entry
        )),
      });
      handlePlayVoice(voiceClipUrl, character.id);
    } finally {
      setGeneratingVoiceId(null);
    }
  };

  return {
    generatingVoiceId,
    playingVoiceId,
    handleGenerateVoiceCard,
    handlePlayVoice,
    handleStopVoice,
  };
}
