import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Character } from '../types';
import {
  isApplicationOwnedVoiceArtifactUrl,
  isCurrentCodexVoiceArtifact,
  type CodexVoiceArtifact,
} from '../../../../audio/voiceArtifacts';
import { codexVoiceTrackId, useCodexVoiceCards } from './useCodexVoiceCards';

/**
 * The signature-quote voice control has one visible state per Character.
 *
 * `ready` is the state before any recording exists: the quote offers the
 * interaction, and the first tap is what creates the artifact.
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

export interface CodexVoiceResolution {
  characterId: string;
  voiceKey: string;
  artifact: CodexVoiceArtifact;
}

export interface UseCodexVoiceQuoteOptions {
  /** Persist the server-resolved voice identity onto the Codex Character. */
  onVoiceResolved?: (resolution: CodexVoiceResolution) => void;
  /** Development access token for the server-only voice endpoint. */
  accessToken?: string;
  /** Test/Workshop override for the server endpoint call. */
  requestVoice?: (character: Character) => Promise<CodexVoiceResolution>;
}

const VOICE_QUOTE_ENDPOINT = '/api/codex-voice-quote';

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

/** The stored artifact for this Character, only while it still matches the quote. */
export const currentCodexVoiceArtifact = (
  character: Character,
): CodexVoiceArtifact | undefined => (
  isCurrentCodexVoiceArtifact(character.voiceClip, {
    quote: character.signatureQuote,
    voiceKey: character.voiceKey,
  })
    ? character.voiceClip
    : undefined
);

const parseResolution = (payload: unknown): CodexVoiceResolution => {
  const voice = isRecord(payload) && isRecord(payload.voice) ? payload.voice : undefined;
  const artifact = voice && isRecord(voice.artifact) ? voice.artifact : undefined;
  if (
    !voice
    || !artifact
    || typeof voice.characterId !== 'string'
    || typeof voice.voiceKey !== 'string'
    || typeof artifact.publicUrl !== 'string'
    || !isApplicationOwnedVoiceArtifactUrl(artifact.publicUrl)
  ) {
    throw new Error('The server returned an unusable Character voice.');
  }
  return {
    characterId: voice.characterId,
    voiceKey: voice.voiceKey,
    artifact: artifact as unknown as CodexVoiceArtifact,
  };
};

const defaultRequestVoice = async (
  character: Character,
  accessToken?: string,
): Promise<CodexVoiceResolution> => {
  const response = await fetch(VOICE_QUOTE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken?.trim() ? { Authorization: `Bearer ${accessToken.trim()}` } : {}),
    },
    // The client sends identity only: never text, a voice, a key, or a URL.
    body: JSON.stringify({ character: { id: character.id, name: character.name } }),
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

/**
 * Owns the Reader Codex signature-quote voice interaction.
 *
 * Nothing happens while the Codex is opened, scrolled, or viewed. Only a tap
 * calls the server, only the first tap for a given quote generates, and every
 * later tap replays the stored artifact through the one shared audio owner.
 */
export function useCodexVoiceQuote(options: UseCodexVoiceQuoteOptions = {}) {
  const {
    currentTrackId,
    playingVoiceId,
    handlePlayVoice,
    handleStopVoice,
  } = useCodexVoiceCards();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const { accessToken, onVoiceResolved, requestVoice: requestVoiceOverride } = options;
  const requestVoice = useCallback(
    (character: Character) => (
      requestVoiceOverride
        ? requestVoiceOverride(character)
        : defaultRequestVoice(character, accessToken)
    ),
    [accessToken, requestVoiceOverride],
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

  const play = useCallback((artifact: CodexVoiceArtifact, characterId: string) => {
    handlePlayVoice(artifact.publicUrl, characterId);
  }, [handlePlayVoice]);

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

    const stored = currentCodexVoiceArtifact(character);
    if (stored) {
      clearError(characterId);
      play(stored, characterId);
      return;
    }

    inFlight.current.add(characterId);
    clearError(characterId);
    setGeneratingId(characterId);
    try {
      const resolution = await requestVoice(character);
      onVoiceResolved?.(resolution);
      play(resolution.artifact, characterId);
    } catch (error) {
      setErrors(current => ({
        ...current,
        [characterId]: error instanceof Error && error.message ? error.message : GENERIC_ERROR,
      }));
    } finally {
      inFlight.current.delete(characterId);
      setGeneratingId(current => (current === characterId ? null : current));
    }
  }, [clearError, handleStopVoice, onVoiceResolved, play, playingVoiceId, requestVoice]);

  const voiceStatus = useCallback((character: Character): CodexVoiceQuoteStatus => {
    if (!isCodexVoiceQuoteEligible(character)) {
      return { state: 'unavailable', canRetry: false };
    }
    if (generatingId === character.id) return { state: 'generating', canRetry: false };
    if (stoppingId === character.id) return { state: 'stopping', canRetry: false };
    if (playingVoiceId === character.id) return { state: 'playing', canRetry: false };
    const message = errors[character.id];
    if (message) return { state: 'error', message, canRetry: true };
    return { state: 'ready', canRetry: false };
  }, [errors, generatingId, playingVoiceId, stoppingId]);

  return useMemo(() => ({
    playingVoiceId,
    generatingVoiceId: generatingId,
    handleQuoteTap,
    handleStopVoice,
    voiceStatus,
  }), [generatingId, handleQuoteTap, handleStopVoice, playingVoiceId, voiceStatus]);
}
