/**
 * Codex signature-quote voice — server only.
 *
 * This module owns the one place where a Character's stored signature quote is
 * turned into audio. It is never reached by chapter generation: only a
 * deliberate Reader Codex tap on a named, intelligent Character Portrait card
 * calls it.
 *
 * The provider API key, the provider voice ID, and the model all stay here.
 * The browser sends a Character identity and receives the synthesized audio
 * bytes for immediate playback; it never chooses text, a voice, or a key.
 * Nothing is stored: every tap calls ElevenLabs again.
 */

import type { LivingStoryRecord } from '../../components/chapter-generation/shared/packets/livingStoryEntityIdentity';
import { assignCharacterVoices, isCharacterVoiceEligible } from './characterVoiceAssignments';
import { resolveVoiceKeyToProviderId } from './voiceCatalog';

const ELEVENLABS_API_ORIGIN = 'https://api.elevenlabs.io';
const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2';
const ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128';
const ELEVENLABS_AUDIO_MIME_TYPE = 'audio/mpeg';
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_SIGNATURE_QUOTE_LENGTH = 320;
const DEFAULT_TIMEOUT_MS = 45_000;

export type CodexVoiceEnvironment = Record<string, string | undefined>;

export interface VoiceSynthesisRequest {
  /** Server-private provider voice ID. */
  providerVoiceId: string;
  /** The Character's exact stored signature quote. */
  text: string;
}

export interface VoiceSpeechProvider {
  synthesize(request: VoiceSynthesisRequest): Promise<Uint8Array>;
}

export interface CodexVoiceConfig {
  elevenLabsApiKey: string;
  elevenLabsModel: string;
  elevenLabsTimeoutMs: number;
}

const nonEmptyString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const boundedInteger = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number => {
  const parsed = value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed)
    ? Math.max(min, Math.min(max, Math.floor(parsed)))
    : fallback;
};

export const requiredServerValue = (
  environment: CodexVoiceEnvironment,
  name: string,
): string => {
  if (name.startsWith('VITE_')) {
    throw new Error('Voice credentials must remain server-side.');
  }
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Missing required server environment variable ${name}.`);
  return value;
};

/** Missing infrastructure disables the control. */
export function loadCodexVoiceConfig(
  environment: CodexVoiceEnvironment,
): CodexVoiceConfig | null {
  if (!environment.ELEVENLABS_API_KEY?.trim()) return null;

  const model = environment.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_ELEVENLABS_MODEL;
  if (!/^[a-z0-9][a-z0-9._-]{1,79}$/iu.test(model)) {
    throw new Error('ELEVENLABS_MODEL_ID is invalid.');
  }

  return {
    elevenLabsApiKey: requiredServerValue(environment, 'ELEVENLABS_API_KEY'),
    elevenLabsModel: model,
    elevenLabsTimeoutMs: boundedInteger(
      environment.ELEVENLABS_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      5_000,
      120_000,
    ),
  };
}

export const isCodexVoiceConfigured = (environment: CodexVoiceEnvironment): boolean => {
  try {
    return loadCodexVoiceConfig(environment) !== null;
  } catch {
    return false;
  }
};

export class ElevenLabsVoiceSpeechProvider implements VoiceSpeechProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_ELEVENLABS_MODEL,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async synthesize(request: VoiceSynthesisRequest): Promise<Uint8Array> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const endpoint = new URL(
        `/v1/text-to-speech/${encodeURIComponent(request.providerVoiceId)}`,
        ELEVENLABS_API_ORIGIN,
      );
      endpoint.searchParams.set('output_format', ELEVENLABS_OUTPUT_FORMAT);
      const response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({ text: request.text, model_id: this.model }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Voice provider returned HTTP ${response.status}.`);
      }
      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES) {
        throw new Error('Voice provider returned an oversized artifact.');
      }
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (contentType && !contentType.startsWith('audio/')) {
        throw new Error('Voice provider returned a non-audio response.');
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_BYTES) {
        throw new Error('Voice provider returned an invalid audio artifact.');
      }
      return bytes;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export type CodexVoiceQuoteFailureReason =
  | 'invalid-character'
  | 'missing-signature-quote'
  | 'ineligible-character'
  | 'no-available-voice'
  | 'synthesis-failed';

export interface CodexVoiceQuoteRequest {
  /** Canonical Character identity, never a Bestiary species record. */
  character: LivingStoryRecord;
}

/** The synthesized audio bytes for one tap. Never persisted server-side. */
export interface CodexVoiceAudio {
  /** Base64-encoded audio bytes, ready for immediate client-side playback. */
  base64: string;
  mimeType: string;
}

export interface CodexVoiceQuoteSuccess {
  ok: true;
  characterId: string;
  /** Provider-neutral voice identity to persist on the Codex Character. */
  voiceKey: string;
  audio: CodexVoiceAudio;
}

export interface CodexVoiceQuoteFailure {
  ok: false;
  reason: CodexVoiceQuoteFailureReason;
  message: string;
}

export type CodexVoiceQuoteResult = CodexVoiceQuoteSuccess | CodexVoiceQuoteFailure;

const characterIdentity = (character: LivingStoryRecord): string | undefined => (
  nonEmptyString(character.id) ?? nonEmptyString(character.persistenceId)
);

/**
 * Resolve one Character's signature quote to synthesized audio.
 *
 * Every tap calls ElevenLabs again — nothing is stored, cached, or reused
 * between taps.
 */
export class CodexVoiceQuoteService {
  constructor(private readonly dependencies: {
    model: string;
    provider: VoiceSpeechProvider;
    onError?: (error: unknown) => void;
  }) {}

  async resolve(request: CodexVoiceQuoteRequest): Promise<CodexVoiceQuoteResult> {
    const character = request.character;
    const characterId = characterIdentity(character);
    const name = nonEmptyString(character.name);
    if (!characterId || !name) {
      return {
        ok: false,
        reason: 'invalid-character',
        message: 'A Codex voice requires a persisted, named Character.',
      };
    }
    if (!isCharacterVoiceEligible(character)) {
      return {
        ok: false,
        reason: 'ineligible-character',
        message: 'Only named, intelligent Characters can speak their signature quote.',
      };
    }
    const quote = nonEmptyString(character.signatureQuote);
    if (!quote || quote.length > MAX_SIGNATURE_QUOTE_LENGTH) {
      return {
        ok: false,
        reason: 'missing-signature-quote',
        message: 'This Character has no stored signature quote to speak.',
      };
    }

    const assignment = assignCharacterVoices({
      characters: [character],
      dialogueSpeakers: [{ speakerName: name, characterId }],
    });
    const resolution = assignment.resolutions[0];
    if (!resolution) {
      return {
        ok: false,
        reason: 'no-available-voice',
        message: assignment.warnings[0]?.message
          ?? 'No catalog voice is currently available for this Character.',
      };
    }
    const providerVoiceId = resolveVoiceKeyToProviderId(resolution.voiceKey);
    if (!providerVoiceId) {
      return {
        ok: false,
        reason: 'no-available-voice',
        message: 'This Character’s voice is not currently synthesizable.',
      };
    }

    try {
      const bytes = await this.dependencies.provider.synthesize({
        providerVoiceId,
        text: quote,
      });
      return {
        ok: true,
        characterId,
        voiceKey: resolution.voiceKey,
        audio: {
          base64: Buffer.from(bytes).toString('base64'),
          mimeType: ELEVENLABS_AUDIO_MIME_TYPE,
        },
      };
    } catch (error) {
      this.dependencies.onError?.(error);
      return {
        ok: false,
        reason: 'synthesis-failed',
        message: 'The Character voice could not be prepared right now.',
      };
    }
  }
}

/** Create the production service only when the ElevenLabs credential exists. */
export function createConfiguredCodexVoiceQuoteService(
  environment: CodexVoiceEnvironment,
  dependencies: {
    fetch?: typeof fetch;
    provider?: VoiceSpeechProvider;
    onError?: (error: unknown) => void;
  } = {},
): CodexVoiceQuoteService | undefined {
  const config = loadCodexVoiceConfig(environment);
  if (!config) return undefined;
  return new CodexVoiceQuoteService({
    model: config.elevenLabsModel,
    provider: dependencies.provider ?? new ElevenLabsVoiceSpeechProvider(
      config.elevenLabsApiKey,
      config.elevenLabsModel,
      config.elevenLabsTimeoutMs,
      dependencies.fetch,
    ),
    onError: dependencies.onError,
  });
}
