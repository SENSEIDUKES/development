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

const nonEmpty = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

/**
 * Every persisted artifact field is validated before it can reach the Codex.
 * A partial artifact would still look playable but would fail the reuse check,
 * silently regenerating on each later tap.
 */
const parseResolution = (payload: unknown): CodexVoiceResolution => {
  const voice = isRecord(payload) && isRecord(payload.voice) ? payload.voice : undefined;
  const artifact = voice && isRecord(voice.artifact) ? voice.artifact : undefined;
  if (
    !voice
    || !artifact
    || !nonEmpty(voice.characterId)
    || !nonEmpty(voice.voiceKey)
    || !nonEmpty(artifact.publicUrl)
    || !nonEmpty(artifact.quote)
    || !nonEmpty(artifact.voiceKey)
    || !nonEmpty(artifact.model)
    || !nonEmpty(artifact.artifactVersion)
    || !isApplicationOwnedVoiceArtifactUrl(artifact.publicUrl)
  ) {
    throw new Error('The server returned an unusable Character voice.');
  }
  return {
    characterId: voice.characterId,
    voiceKey: voice.voiceKey,
    artifact: {
      publicUrl: artifact.publicUrl,
      quote: artifact.quote,
      voiceKey: artifact.voiceKey,
      model: artifact.model,
      artifactVersion: artifact.artifactVersion,
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
    // text, provider voice, object key, model, or playback URL: the server
    // owns all of those, and the endpoint rejects the request if any appear.
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
