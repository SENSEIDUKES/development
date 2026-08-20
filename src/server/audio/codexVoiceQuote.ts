/**
 * Codex signature-quote voice — server only.
 *
 * This module owns the one place where a Character's stored signature quote is
 * turned into audio. It is never reached by chapter generation: only a
 * deliberate Reader Codex tap on a named, intelligent Character Portrait card
 * calls it.
 *
 * The provider API key, the provider voice ID, the storage credentials, and
 * the object key all stay here. The browser sends a Character identity and
 * receives an application-owned public URL; it never chooses text, a voice, a
 * key, or a playback URL.
 */

import { createHash } from 'node:crypto';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import {
  CODEX_VOICE_ARTIFACT_VERSION,
  VOICE_ARTIFACT_PATH_PREFIX,
  VOICE_ARTIFACT_PUBLIC_ORIGIN,
  type CodexVoiceArtifact,
} from '../../audio/voiceArtifacts';
import type { LivingStoryRecord } from '../../components/chapter-generation/shared/packets/livingStoryEntityIdentity';
import { assignCharacterVoices, isCharacterVoiceEligible } from './characterVoiceAssignments';
import { resolveVoiceKeyToProviderId } from './voiceCatalog';

const ELEVENLABS_API_ORIGIN = 'https://api.elevenlabs.io';
const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2';
const ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128';
const VOICE_OBJECT_PREFIX = VOICE_ARTIFACT_PATH_PREFIX.replace(/^\/+|\/+$/gu, '');
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_SIGNATURE_QUOTE_LENGTH = 320;
const DEFAULT_TIMEOUT_MS = 45_000;
const R2_CONNECTION_TIMEOUT_MS = 5_000;
const R2_REQUEST_TIMEOUT_MS = 30_000;
const R2_MAX_ATTEMPTS = 3;

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

export interface VoiceArtifactStore {
  has(objectKey: string): Promise<boolean>;
  put(input: { objectKey: string; bytes: Uint8Array; checksumSha256: string }): Promise<void>;
  publicUrl(objectKey: string): string;
}

export interface CodexVoiceConfig {
  elevenLabsApiKey: string;
  elevenLabsModel: string;
  elevenLabsTimeoutMs: number;
  r2: {
    accessKeyId: string;
    bucket: string;
    endpoint: string;
    publicBaseUrl: string;
    region: string;
    secretAccessKey: string;
  };
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

const safeHttpsUrl = (value: string, label: string): string => {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error(`${label} must be an HTTPS URL without embedded credentials.`);
  }
  return parsed.href.replace(/\/+$/u, '');
};

const configurationFields = [
  'ELEVENLABS_API_KEY',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT_URL',
] as const;

/** Missing infrastructure disables the control; partial configuration is rejected. */
export function loadCodexVoiceConfig(
  environment: CodexVoiceEnvironment,
): CodexVoiceConfig | null {
  const bucket = environment.R2_PUBLIC_BUCKET_NAME?.trim()
    || environment.R2_BUCKET_NAME?.trim();
  const publicBaseUrl = environment.R2_PUBLIC_AUDIO_URL?.trim();
  const supplied = [
    ...configurationFields.map(name => environment[name]?.trim()),
    bucket,
    publicBaseUrl,
  ].filter(Boolean).length;
  if (supplied === 0) return null;
  if (supplied < configurationFields.length + 2) {
    throw new Error('Character voice infrastructure is only partially configured.');
  }

  const resolvedPublicBaseUrl = safeHttpsUrl(publicBaseUrl!, 'R2_PUBLIC_AUDIO_URL');
  if (resolvedPublicBaseUrl !== VOICE_ARTIFACT_PUBLIC_ORIGIN) {
    throw new Error('R2_PUBLIC_AUDIO_URL must use the SEIHouse audio artifact origin.');
  }

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
    r2: {
      accessKeyId: requiredServerValue(environment, 'R2_ACCESS_KEY_ID'),
      bucket: bucket!,
      endpoint: safeHttpsUrl(
        requiredServerValue(environment, 'R2_ENDPOINT_URL'),
        'R2_ENDPOINT_URL',
      ),
      publicBaseUrl: resolvedPublicBaseUrl,
      region: environment.AWS_REGION?.trim() || 'auto',
      secretAccessKey: requiredServerValue(environment, 'R2_SECRET_ACCESS_KEY'),
    },
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

const encodeObjectKey = (key: string): string => (
  key.split('/').map(encodeURIComponent).join('/')
);

export const assertVoiceObjectKey = (objectKey: string): void => {
  const prefix = `${VOICE_OBJECT_PREFIX}/${CODEX_VOICE_ARTIFACT_VERSION}/`;
  if (
    !objectKey.startsWith(prefix)
    || !/^[a-f0-9]{64}\.mp3$/u.test(objectKey.slice(prefix.length))
  ) {
    throw new Error('Voice artifacts are restricted to the immutable voice namespace.');
  }
};

export class R2VoiceArtifactStore implements VoiceArtifactStore {
  private readonly client: S3Client;

  constructor(
    private readonly config: CodexVoiceConfig['r2'],
    client?: S3Client,
  ) {
    // A stalled storage call would hold the reader's tap open indefinitely,
    // so connection and request lifetimes and retries are all bounded.
    const clientConfig: S3ClientConfig = {
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      maxAttempts: R2_MAX_ATTEMPTS,
      requestHandler: {
        connectionTimeout: R2_CONNECTION_TIMEOUT_MS,
        requestTimeout: R2_REQUEST_TIMEOUT_MS,
        throwOnRequestTimeout: true,
      },
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };
    this.client = client ?? new S3Client(clientConfig);
  }

  async has(objectKey: string): Promise<boolean> {
    assertVoiceObjectKey(objectKey);
    try {
      const result = await this.client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      }));
      return (result.ContentLength ?? 0) > 0
        && (!result.ContentType || result.ContentType.startsWith('audio/'));
    } catch (error) {
      const candidate = error as { $metadata?: { httpStatusCode?: number }; name?: string };
      if (
        candidate.$metadata?.httpStatusCode === 404
        || candidate.name === 'NotFound'
        || candidate.name === 'NoSuchKey'
      ) return false;
      throw error;
    }
  }

  async put(input: {
    objectKey: string;
    bytes: Uint8Array;
    checksumSha256: string;
  }): Promise<void> {
    assertVoiceObjectKey(input.objectKey);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await this.client.send(new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: input.objectKey,
          Body: input.bytes,
          ContentLength: input.bytes.byteLength,
          ContentType: 'audio/mpeg',
          CacheControl: IMMUTABLE_CACHE_CONTROL,
          IfNoneMatch: '*',
          Metadata: { sha256: input.checksumSha256 },
        }));
        return;
      } catch (error) {
        const candidate = error as { $metadata?: { httpStatusCode?: number }; name?: string };
        const preconditionFailed = candidate.$metadata?.httpStatusCode === 412
          || candidate.name === 'PreconditionFailed';
        const conditionalConflict = candidate.$metadata?.httpStatusCode === 409
          || candidate.name === 'ConditionalRequestConflict';
        if (!preconditionFailed && !conditionalConflict) throw error;
        if (await this.has(input.objectKey)) return;
        if (!conditionalConflict || attempt === 1) throw error;
      }
    }
  }

  publicUrl(objectKey: string): string {
    assertVoiceObjectKey(objectKey);
    return `${this.config.publicBaseUrl}/${encodeObjectKey(objectKey)}`;
  }
}

/**
 * Deterministic object identity. Character, exact quote, voiceKey, model, and
 * artifact version are all part of the digest, so a changed quote or a
 * reassigned voice can never reuse an outdated recording.
 */
export const codexVoiceObjectKey = (input: {
  characterId: string;
  voiceKey: string;
  quote: string;
  model: string;
}): string => {
  const digest = createHash('sha256')
    .update([
      'seihouse-codex-voice',
      CODEX_VOICE_ARTIFACT_VERSION,
      input.characterId,
      input.voiceKey,
      input.model,
      ELEVENLABS_OUTPUT_FORMAT,
      input.quote,
    ].join('\u001f'))
    .digest('hex');
  return `${VOICE_OBJECT_PREFIX}/${CODEX_VOICE_ARTIFACT_VERSION}/${digest}.mp3`;
};

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

export interface CodexVoiceQuoteSuccess {
  ok: true;
  characterId: string;
  /** Provider-neutral voice identity to persist on the Codex Character. */
  voiceKey: string;
  artifact: CodexVoiceArtifact;
  /** True only when this call actually called the speech provider. */
  generated: boolean;
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
 * Resolve one Character's signature quote to a stored voice artifact.
 *
 * Reuse is checked before synthesis, concurrent taps on the same artifact
 * share a single in-flight generation, and an existing object is never
 * regenerated.
 */
export class CodexVoiceQuoteService {
  private readonly inFlight = new Map<string, Promise<CodexVoiceQuoteResult>>();

  constructor(private readonly dependencies: {
    model: string;
    objectStore: VoiceArtifactStore;
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

    const objectKey = codexVoiceObjectKey({
      characterId,
      voiceKey: resolution.voiceKey,
      quote,
      model: this.dependencies.model,
    });

    const pending = this.inFlight.get(objectKey);
    if (pending) return pending;

    const work = this.produce({
      characterId,
      objectKey,
      providerVoiceId,
      quote,
      voiceKey: resolution.voiceKey,
    }).finally(() => {
      this.inFlight.delete(objectKey);
    });
    this.inFlight.set(objectKey, work);
    return work;
  }

  private async produce(input: {
    characterId: string;
    objectKey: string;
    providerVoiceId: string;
    quote: string;
    voiceKey: string;
  }): Promise<CodexVoiceQuoteResult> {
    const { objectStore, provider, model } = this.dependencies;
    try {
      let generated = false;
      if (!await objectStore.has(input.objectKey)) {
        const bytes = await provider.synthesize({
          providerVoiceId: input.providerVoiceId,
          text: input.quote,
        });
        await objectStore.put({
          objectKey: input.objectKey,
          bytes,
          checksumSha256: createHash('sha256').update(bytes).digest('hex'),
        });
        generated = true;
      }
      return {
        ok: true,
        characterId: input.characterId,
        voiceKey: input.voiceKey,
        generated,
        artifact: {
          publicUrl: objectStore.publicUrl(input.objectKey),
          quote: input.quote,
          voiceKey: input.voiceKey,
          model,
          artifactVersion: CODEX_VOICE_ARTIFACT_VERSION,
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

/** Create the production service only when every private input exists. */
export function createConfiguredCodexVoiceQuoteService(
  environment: CodexVoiceEnvironment,
  dependencies: {
    fetch?: typeof fetch;
    objectStore?: VoiceArtifactStore;
    provider?: VoiceSpeechProvider;
    onError?: (error: unknown) => void;
  } = {},
): CodexVoiceQuoteService | undefined {
  const config = loadCodexVoiceConfig(environment);
  if (!config) return undefined;
  return new CodexVoiceQuoteService({
    model: config.elevenLabsModel,
    objectStore: dependencies.objectStore ?? new R2VoiceArtifactStore(config.r2),
    provider: dependencies.provider ?? new ElevenLabsVoiceSpeechProvider(
      config.elevenLabsApiKey,
      config.elevenLabsModel,
      config.elevenLabsTimeoutMs,
      dependencies.fetch,
    ),
    onError: dependencies.onError,
  });
}
