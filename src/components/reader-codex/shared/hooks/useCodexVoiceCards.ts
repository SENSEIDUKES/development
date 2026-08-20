import { useCallback, useEffect, useRef, useState } from 'react';
import { useDevAudioPlayback } from '../../../../audio/DevAudioPlayback';
import { isApplicationOwnedDialogueArtifactUrl } from '../../../../audio/dialogueArtifacts';

const LEGACY_WORKSHOP_VOICE_PREFIX = 'workshop-voice:';

/**
 * A Character's voiceKey is only an identity. Reader playback is available
 * only after server synthesis has produced a real audio artifact.
 */
export const isPlayableCodexVoiceSource = (value?: string): boolean => {
  const source = value?.trim();
  if (!source || source.startsWith(LEGACY_WORKSHOP_VOICE_PREFIX)) return false;
  return isApplicationOwnedDialogueArtifactUrl(source);
};

/**
 * Plays completed Character voice artifacts through DEV's one shared audio
 * owner. It never assigns a voice, synthesizes in the browser, or autoplays.
 */
export function useCodexVoiceCards() {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const {
    currentTrackId,
    isPlaying,
    replace,
    stop,
  } = useDevAudioPlayback();
  const activeTrackIdRef = useRef<string | null>(null);
  const activeCharacterIdRef = useRef<string | null>(null);

  const stopCurrentVoice = useCallback(() => {
    if (activeTrackIdRef.current) stop(activeTrackIdRef.current);
    activeTrackIdRef.current = null;
    activeCharacterIdRef.current = null;
    setPlayingVoiceId(null);
  }, [stop]);

  useEffect(() => () => {
    if (activeTrackIdRef.current) stop(activeTrackIdRef.current);
  }, [stop]);

  useEffect(() => {
    const activeTrackId = activeTrackIdRef.current;
    const activeCharacterId = activeCharacterIdRef.current;
    if (!activeTrackId || !activeCharacterId) return;

    if (currentTrackId && currentTrackId !== activeTrackId) {
      activeTrackIdRef.current = null;
      activeCharacterIdRef.current = null;
      setPlayingVoiceId(null);
      return;
    }
    setPlayingVoiceId(currentTrackId === activeTrackId && isPlaying ? activeCharacterId : null);
  }, [currentTrackId, isPlaying]);

  const handlePlayVoice = useCallback((source: string, characterId: string) => {
    stopCurrentVoice();
    if (!isPlayableCodexVoiceSource(source)) return;

    const trackId = `codex-voice:${characterId}`;
    activeTrackIdRef.current = trackId;
    activeCharacterIdRef.current = characterId;
    replace({
      id: trackId,
      source: source.trim(),
      title: 'Reader Codex voice',
    });
  }, [replace, stopCurrentVoice]);

  return {
    playingVoiceId,
    handlePlayVoice,
    handleStopVoice: stopCurrentVoice,
  };
}
