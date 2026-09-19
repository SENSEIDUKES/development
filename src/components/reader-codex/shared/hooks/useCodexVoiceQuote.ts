import type { CodexVoiceAudio, CodexVoiceResolution } from '../../../../narrative/voice';
import { useReaderRuntime } from '../../../../narrative/readerRuntime';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Character } from '../types';
import { handleDownload } from '../downloadUtils';
import { codexVoiceTrackId, useCodexVoiceCards } from './useCodexVoiceCards';

/**
 * The signature-quote voice control has one visible state per Character.
 *
 * `ready` is the state before any audio has been heard this session: the
 * quote offers the interaction, and every tap asks the host voice service again. Nothing
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

export type { CodexVoiceAudio, CodexVoiceResolution } from '../../../../narrative/voice';
export interface UseCodexVoiceQuoteOptions {
  /** Persist the server-resolved voice identity onto the Codex Character. */
  onVoiceResolved?: (resolution: CodexVoiceResolution) => void;
  /** Optional explicit voice service for this view. */
  requestVoice?: (character: Character) => Promise<CodexVoiceResolution>;
}

const GENERIC_ERROR = 'That voice could not be prepared. Tap to try again.';

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

/** Turn the server's base64 audio bytes into a directly playable data URI. */
export const audioDataUri = (audio: CodexVoiceAudio): string => (
  audio.source ?? `data:${audio.mimeType};base64,${audio.base64}`
);

const downloadFilename = (character: Character): string => (
  `${character.name.toLowerCase().replace(/\s+/g, '_')}_voice.mp3`
);

/**
 * Owns the Reader Codex signature-quote voice interaction.
 *
 * Nothing happens while the Codex is opened, scrolled, or viewed. Only a tap
 * calls the server, and every tap asks the host voice service again — nothing is stored
 * or reused. The audio for the Character's most recent successful tap stays
 * available this session for direct download.
 */
export function useCodexVoiceQuote(options: UseCodexVoiceQuoteOptions = {}) {
  const runtime = useReaderRuntime();
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
        : runtime.requestVoice ? runtime.requestVoice(character) : Promise.reject(new Error('The host has not enabled character voices.'))
    ),
    [requestVoiceOverride, runtime.requestVoice],
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
