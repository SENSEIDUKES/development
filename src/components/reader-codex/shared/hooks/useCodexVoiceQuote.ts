import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Character } from '../types';
import { handleDownload } from '../codexCompatibility';
import { codexVoiceTrackId, useCodexVoiceCards } from './useCodexVoiceCards';

/**
 * The signature-quote voice control has one visible state per Character.
 *
 * `ready` is the state before any audio has been heard this session: the
 * quote offers the interaction, and every tap calls ElevenLabs again. Nothing
 * is stored, so there is no artifact to reuse between taps.
 */
export type CodexVoiceQuoteState =
  | 'ready'
  | 'generating'
  | 'playing'
  | 'stopping'
  | 'unavailable'
  | 'error';

export interface CodexVoiceQuoteStatus {
  state: CodexVoiceQuoteState;
  /** Present only in the `error` state, and safe to show to a reader. */
  message?: string;
  /** True when the last attempt failed and the reader can tap to retry. */
  canRetry: boolean;
}

/** The synthesized audio for one tap, ready for immediate client-side playback. */
export interface CodexVoiceAudio {
  base64: string;
  mimeType: string;
}

export interface CodexVoiceResolution {
  characterId: string;
  voiceKey: string;
  audio: CodexVoiceAudio;
}

export interface UseCodexVoiceQuoteOptions {
  /** Persist the server-resolved voice identity onto the Codex Character. */
  onVoiceResolved?: (resolution: CodexVoiceResolution) => void;
  /** Test/Workshop override for the server endpoint call. */
  requestVoice?: (character: Character) => Promise<CodexVoiceResolution>;
}

const VOICE_QUOTE_ENDPOINT = '/api/codex-voice-quote';

/**
 * Server synthesis is bounded at 45–120s, so a stalled request must abort or
 * the Character stays stuck in `generating`.
 */
const VOICE_QUOTE_TIMEOUT_MS = 130_000;

const GENERIC_ERROR = 'That voice could not be prepared. Tap to try again.';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

/**
 * A Character is eligible for the control when it is a named individual whose
 * Codex identity carries a stored signature quote. Bestiary species, unnamed
 * entities, and non-intelligent Characters never reach this surface.
 */
export const isCodexVoiceQuoteEligible = (character: Character): boolean => (
  Boolean(character.id?.trim())
  && Boolean(character.name?.trim())
  && Boolean(character.signatureQuote?.trim())
);

const nonEmpty = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

/** Turn the server's base64 audio bytes into a directly playable data URI. */
export const audioDataUri = (audio: CodexVoiceAudio): string => (
  `data:${audio.mimeType};base64,${audio.base64}`
);

/**
 * Every field of the server response is validated before it can reach
 * playback. A partial response would fail silently instead of playing.
 */
const parseResolution = (payload: unknown): CodexVoiceResolution => {
  const voice = isRecord(payload) && isRecord(payload.voice) ? payload.voice : undefined;
  const audio = voice && isRecord(voice.audio) ? voice.audio : undefined;
  if (
    !voice
    || !audio
    || !nonEmpty(voice.characterId)
    || !nonEmpty(voice.voiceKey)
    || !nonEmpty(audio.base64)
    || !nonEmpty(audio.mimeType)
  ) {
    throw new Error('The server returned an unusable Character voice.');
  }
  return {
    characterId: voice.characterId,
    voiceKey: voice.voiceKey,
    audio: {
      base64: audio.base64,
      mimeType: audio.mimeType,
    },
  };
};

/**
 * The stored Codex fields the server needs to resolve one canonical Character:
 * its identity, its persisted signature quote, its existing voice identity,
 * and the metadata that decides whether it is an eligible speaking Character.
 */
export const codexVoiceIdentity = (character: Character) => ({
  id: character.id,
  name: character.name,
  signatureQuote: character.signatureQuote,
  ...(character.voiceKey ? { voiceKey: character.voiceKey } : {}),
  ...(character.portraitKind ? { portraitKind: character.portraitKind } : {}),
  ...(character.isBeast === undefined ? {} : { isBeast: character.isBeast }),
  ...(character.creatureProfile ? { creatureProfile: character.creatureProfile } : {}),
  ...(character.speciesId ? { speciesId: character.speciesId } : {}),
});

const defaultRequestVoice = async (
  character: Character,
): Promise<CodexVoiceResolution> => {
  const response = await fetch(VOICE_QUOTE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(VOICE_QUOTE_TIMEOUT_MS),
    // The persisted Codex identity the server validates. It carries no free
    // text, provider voice, or model: the server owns all of those, and the
    // endpoint rejects the request if any appear.
    body: JSON.stringify({ character: codexVoiceIdentity(character) }),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : GENERIC_ERROR;
    throw new Error(message);
  }
  return parseResolution(payload);
};

const downloadFilename = (character: Character): string => (
  `${character.name.toLowerCase().replace(/\s+/g, '_')}_voice.mp3`
);

/**
 * Owns the Reader Codex signature-quote voice interaction.
 *
 * Nothing happens while the Codex is opened, scrolled, or viewed. Only a tap
 * calls the server, and every tap calls ElevenLabs again — nothing is stored
 * or reused. The audio for the Character's most recent successful tap stays
 * available this session for direct download.
 */
export function useCodexVoiceQuote(options: UseCodexVoiceQuoteOptions = {}) {
  const {
    autoplayBlocked,
    currentTrackId,
    playingVoiceId,
    handlePlayVoice,
    handleStopVoice,
    retryBlockedVoice,
  } = useCodexVoiceCards();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [audioByCharacterId, setAudioByCharacterId] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const { onVoiceResolved, requestVoice: requestVoiceOverride } = options;
  const requestVoice = useCallback(
    (character: Character) => (
      requestVoiceOverride
        ? requestVoiceOverride(character)
        : defaultRequestVoice(character)
    ),
    [requestVoiceOverride],
  );

  // The stopping state clears once the shared audio owner has actually
  // released this Character's track.
  useEffect(() => {
    if (stoppingId && currentTrackId !== codexVoiceTrackId(stoppingId)) setStoppingId(null);
  }, [currentTrackId, stoppingId]);

  const clearError = useCallback((characterId: string) => {
    setErrors(current => {
      if (!(characterId in current)) return current;
      const { [characterId]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  const handleQuoteTap = useCallback(async (character: Character) => {
    const characterId = character.id;
    if (!isCodexVoiceQuoteEligible(character)) return;
    if (playingVoiceId === characterId) {
      setStoppingId(characterId);
      handleStopVoice();
      return;
    }
    // A second tap while the first is still generating must not start a
    // second generation.
    if (inFlight.current.has(characterId)) return;

    // The source is already in the shared queue, but browser autoplay policy
    // rejected the delayed post-synthesis start. This explicit retry is a
    // direct user gesture, so replay the same in-memory quote rather than
    // charging another provider request for identical audio.
    if (audioByCharacterId[characterId] && retryBlockedVoice(characterId)) return;

    inFlight.current.add(characterId);
    clearError(characterId);
    setGeneratingId(characterId);
    try {
      const resolution = await requestVoice(character);
      onVoiceResolved?.(resolution);
      const source = audioDataUri(resolution.audio);
      setAudioByCharacterId(current => ({ ...current, [characterId]: source }));
      handlePlayVoice(source, characterId);
    } catch (error) {
      setErrors(current => ({
        ...current,
        [characterId]: error instanceof Error && error.message ? error.message : GENERIC_ERROR,
      }));
    } finally {
      inFlight.current.delete(characterId);
      setGeneratingId(current => (current === characterId ? null : current));
    }
  }, [
    audioByCharacterId,
    clearError,
    handlePlayVoice,
    handleStopVoice,
    onVoiceResolved,
    playingVoiceId,
    requestVoice,
    retryBlockedVoice,
  ]);

  const voiceStatus = useCallback((character: Character): CodexVoiceQuoteStatus => {
    if (!isCodexVoiceQuoteEligible(character)) {
      return { state: 'unavailable', canRetry: false };
    }
    if (generatingId === character.id) return { state: 'generating', canRetry: false };
    if (stoppingId === character.id) return { state: 'stopping', canRetry: false };
    if (playingVoiceId === character.id) return { state: 'playing', canRetry: false };
    if (autoplayBlocked
      && currentTrackId === codexVoiceTrackId(character.id)
      && audioByCharacterId[character.id]) {
      return {
        state: 'error',
        message: 'Your browser needs one more tap to start this voice.',
        canRetry: true,
      };
    }
    const message = errors[character.id];
    if (message) return { state: 'error', message, canRetry: true };
    return { state: 'ready', canRetry: false };
  }, [
    audioByCharacterId,
    autoplayBlocked,
    currentTrackId,
    errors,
    generatingId,
    playingVoiceId,
    stoppingId,
  ]);

  /** True once this Character's most recent tap produced audio this session. */
  const canDownloadVoice = useCallback((character: Character): boolean => (
    Boolean(audioByCharacterId[character.id])
  ), [audioByCharacterId]);

  const handleDownloadVoice = useCallback((character: Character) => {
    const source = audioByCharacterId[character.id];
    if (!source) return;
    void handleDownload(source, downloadFilename(character));
  }, [audioByCharacterId]);

  return useMemo(() => ({
    playingVoiceId,
    generatingVoiceId: generatingId,
    handleQuoteTap,
    handleStopVoice,
    voiceStatus,
    canDownloadVoice,
    handleDownloadVoice,
  }), [
    canDownloadVoice,
    generatingId,
    handleDownloadVoice,
    handleQuoteTap,
    handleStopVoice,
    playingVoiceId,
    voiceStatus,
  ]);
}
