import React, { useState } from 'react';
import { Character, StoryMemory } from '../types';
import { resolveKokoroVoicePreset } from '../lib/voice/voiceResolver';
import { useAppStore } from '../store/useAppStore';
import { generateUUID } from '../lib/id';
import {
  MEDIA_PURPOSE,
  MEDIA_TARGET_KIND,
  requirePersistenceUuid,
  saveMediaAsset,
} from '../lib/media/mediaAssetClient';
import {
  discardCachedMedia,
  resolveMediaAssetForDisplay,
} from '../lib/media/privateMediaResolver';

interface UseCodexVoiceCardsOptions {
  memory: StoryMemory;
  onUpdateMemory: (memory: StoryMemory) => void;
}

const clearAudioHandlers = (audio: HTMLAudioElement) => {
  audio.onplay = null;
  audio.onended = null;
  audio.onpause = null;
};

export function useCodexVoiceCards({ memory, onUpdateMemory }: UseCodexVoiceCardsOptions) {
  const [generatingVoiceId, setGeneratingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        clearAudioHandlers(audioRef.current);
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePlayVoice = (url: string, charId: string) => {
    if (audioRef.current) {
      clearAudioHandlers(audioRef.current);
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => setPlayingVoiceId(charId);
    audio.onended = () => setPlayingVoiceId(null);
    audio.onpause = () => setPlayingVoiceId(null);

    audio.play().catch(console.error);
  };

  const handleStopVoice = () => {
    if (audioRef.current) {
      clearAudioHandlers(audioRef.current);
      audioRef.current.pause();
      setPlayingVoiceId(null);
    }
  };

  const handleGenerateVoiceCard = async (char: Character) => {
    if (!char.signatureQuote) return;

    setGeneratingVoiceId(char.id);
    try {
      const preset = resolveKokoroVoicePreset({
        mode: 'dialogue',
        language: 'en',
        speakerName: char.name,
        speakerRole: char.role,
        savedVoicePresetId: char.voicePresetId,
      });

      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: char.signatureQuote,
          speakerVoice: preset.providerVoiceId,
        }),
      });

      if (!res.ok) throw new Error('Audio generation failed');
      const data = await res.json();
      const generatedAudio = data.audioUrl
        || (typeof data.base64Audio === 'string' && data.base64Audio
          ? `data:audio/mp3;base64,${data.base64Audio}`
          : undefined);
      if (!generatedAudio) throw new Error('Audio generation returned no playable media.');
      const state = useAppStore.getState();
      const activeStory = state.stories.find(story => story.id === state.activeStoryId);
      if (!activeStory) throw new Error('Select a synchronized story before saving a voice card.');
      const storyId = requirePersistenceUuid(activeStory.persistenceId ?? activeStory.id, 'Story');
      const entityId = requirePersistenceUuid(char.persistenceId ?? char.id, 'Character');
      const asset = await saveMediaAsset({
        source: generatedAudio,
        assetType: 'AUDIO',
        purpose: MEDIA_PURPOSE.VOICE_CARD,
        association: {
          targetKind: MEDIA_TARGET_KIND.CHARACTER,
          targetKey: entityId,
          storyId,
          entityId,
          entityType: 'character',
          label: char.signatureQuote,
        },
        replacesAssetId: char.voiceAssetId,
        idempotencyKey: generateUUID(),
      });
      const voiceClipUrl = (await resolveMediaAssetForDisplay(asset)).url;
      if (char.voiceAssetId && char.voiceAssetId !== asset.id) {
        await discardCachedMedia(char.voiceAssetId);
      }

      const updatedChars = memory.characters.map(c => {
        if (c.id === char.id) {
          return {
            ...c,
            voicePresetId: preset.id,
            voiceClipUrl,
            voiceAssetId: asset.id,
          };
        }
        return c;
      });

      onUpdateMemory({ ...memory, characters: updatedChars });
      handlePlayVoice(voiceClipUrl, char.id);
    } catch (e) {
      console.error(e);
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
