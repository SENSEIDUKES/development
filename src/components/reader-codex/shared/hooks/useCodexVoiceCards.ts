import { useEffect, useRef, useState } from 'react';
import { useDevAudioPlayback } from '../../../../audio/DevAudioPlayback';
import type { Character, StoryMemory } from '../types';

interface UseCodexVoiceCardsOptions {
  memory: StoryMemory;
  onUpdateMemory: (memory: StoryMemory) => void;
}

const WORKSHOP_VOICE_PREFIX = 'workshop-voice:';

/**
 * Local voice-card simulator. Existing playable URLs use DEV's shared
 * SEIHouse player; generated Workshop cards retain browser speech synthesis.
 */
export function useCodexVoiceCards({ memory, onUpdateMemory }: UseCodexVoiceCardsOptions) {
  const [generatingVoiceId, setGeneratingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const {
    currentTrackId,
    isPlaying,
    play,
    stop,
  } = useDevAudioPlayback();
  const activeTrackIdRef = useRef<string | null>(null);
  const activeCharacterIdRef = useRef<string | null>(null);

  const stopCurrentVoice = () => {
    if (activeTrackIdRef.current) {
      stop(activeTrackIdRef.current);
      activeTrackIdRef.current = null;
    }
    activeCharacterIdRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingVoiceId(null);
  };

  useEffect(() => () => {
    if (activeTrackIdRef.current) stop(activeTrackIdRef.current);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [stop]);

  useEffect(() => {
    const activeTrackId = activeTrackIdRef.current;
    const activeCharacterId = activeCharacterIdRef.current;
    if (!activeTrackId || !activeCharacterId) return;

    if (currentTrackId !== activeTrackId || !isPlaying) {
      setPlayingVoiceId(null);
      return;
    }
    setPlayingVoiceId(activeCharacterId);
  }, [currentTrackId, isPlaying]);

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

    const trackId = `codex-voice:${charId}`;
    activeTrackIdRef.current = trackId;
    activeCharacterIdRef.current = charId;
    play({
      id: trackId,
      source: url,
      title: 'Reader Codex voice',
    });
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
