import { useCallback, useEffect, useRef, useState } from 'react';
import { useDevAudioPlayback } from '../../../../audio/DevAudioPlayback';

const LEGACY_WORKSHOP_VOICE_PREFIX = 'workshop-voice:';

/** The only source shape the server's synthesized response ever produces. */
const PLAYABLE_VOICE_DATA_URI = /^data:audio\/mpeg;base64,[a-z0-9+/]+=*$/iu;

/** One shared-queue track identity per Character, so voices can never overlap. */
export const codexVoiceTrackId = (characterId: string): string => `codex-voice:${characterId}`;

/**
 * A Character's voiceKey is only an identity. Reader playback is available
 * only for the exact audio data URI the server's synthesis response produced
 * this session; nothing else is ever accepted as a playback source.
 */
export const isPlayableCodexVoiceSource = (value?: string): boolean => {
  const source = value?.trim();
  if (!source || source.startsWith(LEGACY_WORKSHOP_VOICE_PREFIX)) return false;
  return PLAYABLE_VOICE_DATA_URI.test(source);
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

    const trackId = codexVoiceTrackId(characterId);
    activeTrackIdRef.current = trackId;
    activeCharacterIdRef.current = characterId;
    replace({
      id: trackId,
      source: source.trim(),
      title: 'Reader Codex voice',
    });
  }, [replace, stopCurrentVoice]);

  return {
    /** Track currently owned by the shared audio session, if any. */
    currentTrackId,
    codexVoiceTrackId,
    playingVoiceId,
    handlePlayVoice,
    handleStopVoice: stopCurrentVoice,
  };
}
