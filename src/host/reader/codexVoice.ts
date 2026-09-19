import type { Character, CodexVoiceAudio, CodexVoiceResolution } from '@seihouse/sen/contracts';
const VOICE_QUOTE_ENDPOINT = '/api/codex-voice-quote';
const VOICE_QUOTE_TIMEOUT_MS = 130_000;
const GENERIC_ERROR = 'That voice could not be prepared. Tap to try again.';
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
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

export const requestCodexVoice = async (
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
