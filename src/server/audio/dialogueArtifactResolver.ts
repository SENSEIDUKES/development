import { createHash } from 'node:crypto';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import {
  DIALOGUE_ARTIFACT_PUBLIC_ORIGIN,
  DIALOGUE_ARTIFACT_PATH_PREFIX,
} from '../../audio/dialogueArtifacts';
import { extractReaderVisibleAudioText } from '../../audio/readerVisibleText';
import type { ChapterContent } from '../../components/chapter-generation/shared/types';
import {
  canonicalLivingStoryEntityKey,
  type LivingStoryRecord,
} from '../../components/chapter-generation/shared/packets/livingStoryEntityIdentity';
import type {
  DialogueArtifactResolver,
  DialogueArtifactResolverInput,
} from '../chapter-generation/execute';
import { isCharacterVoiceEligible } from './characterVoiceAssignments';
import type { CompletedDialogueArtifactCandidate } from './resolvedDialogueAudio';
import { resolveVoiceKeyToProviderId } from './voiceCatalog';

const ELEVENLABS_API_ORIGIN = 'https://api.elevenlabs.io';
const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2';
const ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128';
const DIALOGUE_OBJECT_PREFIX = DIALOGUE_ARTIFACT_PATH_PREFIX.replace(/^\/+|\/+$/gu, '');
const DIALOGUE_ARTIFACT_VERSION = 'v1';
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_QUOTE_LENGTH = 240;
const MAX_CONCURRENT_ARTIFACTS = 4;
const DEFAULT_TIMEOUT_MS = 45_000;
const QUOTED_PHRASE = /"[^"\r\n]+"|“[^”\r\n]+”|(?<![\p{L}\p{N}])'[^'\r\n]+'(?![\p{L}\p{N}])|‘[^’\r\n]+’/gu;

export type DialogueAudioEnvironment = Record<string, string | undefined>;

export interface DialogueSpeechSynthesisRequest {
  /** Server-private provider voice ID. */
  providerVoiceId: string;
  /** Exact spoken text with only the surrounding quotation marks removed. */
  text: string;
}

export interface DialogueSpeechProvider {
  synthesize(request: DialogueSpeechSynthesisRequest): Promise<Uint8Array>;
}

export interface DialogueAudioArtifactStore {
  has(objectKey: string): Promise<boolean>;
  put(input: {
    objectKey: string;
    bytes: Uint8Array;
    checksumSha256: string;
  }): Promise<void>;
  publicUrl(objectKey: string): string;
}

export interface DialogueArtifactResolverDependencies {
  fetch?: typeof fetch;
  objectStore?: DialogueAudioArtifactStore;
  provider?: DialogueSpeechProvider;
  onError?: (error: unknown) => void;
}

interface DialogueAudioConfig {
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

interface ExactDialogueQuote {
  triggerPhrase: string;
  spokenText: string;
  occurrenceIndex: number;
}

const nonEmptyString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const record = (value: unknown): Record<string, unknown> | undefined => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
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
  environment: DialogueAudioEnvironment,
  name: string,
): string => {
  if (name.startsWith('VITE_')) {
    throw new Error('Dialogue audio credentials must remain server-side.');
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

/** Missing infrastructure disables enrichment; a partially configured adapter is rejected. */
export function loadDialogueAudioConfig(
  environment: DialogueAudioEnvironment,
): DialogueAudioConfig | null {
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
    throw new Error('Dialogue audio infrastructure is only partially configured.');
  }

  const resolvedPublicBaseUrl = safeHttpsUrl(publicBaseUrl!, 'R2_PUBLIC_AUDIO_URL');
  if (resolvedPublicBaseUrl !== DIALOGUE_ARTIFACT_PUBLIC_ORIGIN) {
    throw new Error('R2_PUBLIC_AUDIO_URL must use the SEIHouse dialogue artifact origin.');
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

export const isDialogueAudioConfigured = (
  environment: DialogueAudioEnvironment,
): boolean => {
  try {
    return loadDialogueAudioConfig(environment) !== null;
  } catch {
    return false;
  }
};

export class ElevenLabsDialogueSpeechProvider implements DialogueSpeechProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_ELEVENLABS_MODEL,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async synthesize(request: DialogueSpeechSynthesisRequest): Promise<Uint8Array> {
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
        body: JSON.stringify({
          text: request.text,
          model_id: this.model,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Dialogue speech provider returned HTTP ${response.status}.`);
      }
      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES) {
        throw new Error('Dialogue speech provider returned an oversized artifact.');
      }
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (contentType && !contentType.startsWith('audio/')) {
        throw new Error('Dialogue speech provider returned a non-audio response.');
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_BYTES) {
        throw new Error('Dialogue speech provider returned an invalid audio artifact.');
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

export const assertDialogueObjectKey = (objectKey: string): void => {
  const prefix = `${DIALOGUE_OBJECT_PREFIX}/${DIALOGUE_ARTIFACT_VERSION}/`;
  if (
    !objectKey.startsWith(prefix)
    || !/^[a-f0-9]{64}\.mp3$/u.test(objectKey.slice(prefix.length))
  ) {
    throw new Error('Dialogue artifacts are restricted to the immutable dialogue namespace.');
  }
};

export class R2DialogueAudioArtifactStore implements DialogueAudioArtifactStore {
  private readonly client: S3Client;

  constructor(
    private readonly config: DialogueAudioConfig['r2'],
    client?: S3Client,
  ) {
    const clientConfig: S3ClientConfig = {
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };
    this.client = client ?? new S3Client(clientConfig);
  }

  async has(objectKey: string): Promise<boolean> {
    assertDialogueObjectKey(objectKey);
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
    assertDialogueObjectKey(input.objectKey);
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
    assertDialogueObjectKey(objectKey);
    return `${this.config.publicBaseUrl}/${encodeObjectKey(objectKey)}`;
  }
}

/** Extract exact, persisted quote spans and retain their zero-based occurrence identity. */
export function extractExactDialogueQuotes(text: string): ExactDialogueQuote[] {
  const cleanText = extractReaderVisibleAudioText(text).cleanText;
  const occurrences = new Map<string, number>();
  return [...cleanText.matchAll(QUOTED_PHRASE)].flatMap(match => {
    const triggerPhrase = match[0];
    if (triggerPhrase.length > MAX_QUOTE_LENGTH) return [];
    const spokenText = triggerPhrase.slice(1, -1);
    if (!spokenText.trim()) return [];
    const occurrenceIndex = occurrences.get(triggerPhrase) ?? 0;
    occurrences.set(triggerPhrase, occurrenceIndex + 1);
    return [{ triggerPhrase, spokenText, occurrenceIndex }];
  });
}

const characterNames = (character: LivingStoryRecord): string[] => [
  character.name,
  ...(Array.isArray(character.aliases) ? character.aliases : []),
  ...(Array.isArray(character.alternateNames) ? character.alternateNames : []),
].flatMap(value => {
  const name = nonEmptyString(value);
  return name ? [name] : [];
});

const findCanonicalCharacter = (
  characters: readonly LivingStoryRecord[],
  speakerName: string,
): LivingStoryRecord | undefined => {
  const speakerKey = canonicalLivingStoryEntityKey(speakerName);
  const matches = characters.filter(character => (
    characterNames(character)
      .some(name => canonicalLivingStoryEntityKey(name) === speakerKey)
  ));
  return matches.length === 1 ? matches[0] : undefined;
};

const characterId = (character: LivingStoryRecord): string | undefined => (
  nonEmptyString(character.id) ?? nonEmptyString(character.persistenceId)
);

const artifactObjectKey = (input: {
  voiceKey: string;
  spokenText: string;
  model: string;
}): string => {
  const digest = createHash('sha256')
    .update([
      'seihouse-dialogue-audio',
      DIALOGUE_ARTIFACT_VERSION,
      input.voiceKey,
      input.model,
      ELEVENLABS_OUTPUT_FORMAT,
      input.spokenText,
    ].join('\u001f'))
    .digest('hex');
  return `${DIALOGUE_OBJECT_PREFIX}/${DIALOGUE_ARTIFACT_VERSION}/${digest}.mp3`;
};

const dialogueBlocks = (chapter: ChapterContent) => (
  (chapter.blocks ?? []).filter(block => block.type === 'dialogue' && !block.system)
);

const runBounded = async <T>(
  tasks: readonly (() => Promise<T>)[],
  limit: number,
): Promise<T[]> => {
  const results = new Array<T>(tasks.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    async () => {
      while (cursor < tasks.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await tasks[index]();
      }
    },
  );
  await Promise.all(workers);
  return results;
};

export function createDialogueArtifactResolver(input: {
  model: string;
  objectStore: DialogueAudioArtifactStore;
  provider: DialogueSpeechProvider;
  onError?: (error: unknown) => void;
}): DialogueArtifactResolver {
  return async ({ chapter, characters }: DialogueArtifactResolverInput) => {
    const artifactRequests = new Map<string, {
      providerVoiceId: string;
      spokenText: string;
    }>();
    const pending: Array<Omit<CompletedDialogueArtifactCandidate, 'publicUrl'> & {
      objectKey: string;
    }> = [];

    for (const block of dialogueBlocks(chapter)) {
      const metadata = record(block.metadata);
      const speakerName = nonEmptyString(metadata?.speakerName);
      if (!speakerName || (metadata?.mode !== undefined && metadata.mode !== 'dialogue')) continue;
      const character = findCanonicalCharacter(characters, speakerName);
      if (!character || !isCharacterVoiceEligible(character)) continue;
      const id = characterId(character);
      const voiceKey = nonEmptyString(character.voiceKey);
      if (!id || !voiceKey) continue;
      const providerVoiceId = resolveVoiceKeyToProviderId(voiceKey);
      if (!providerVoiceId) continue;

      for (const quote of extractExactDialogueQuotes(block.text)) {
        const objectKey = artifactObjectKey({
          voiceKey,
          spokenText: quote.spokenText,
          model: input.model,
        });
        if (!artifactRequests.has(objectKey)) {
          artifactRequests.set(objectKey, {
            providerVoiceId,
            spokenText: quote.spokenText,
          });
        }
        pending.push({
          characterId: id,
          blockId: block.id,
          triggerPhrase: quote.triggerPhrase,
          occurrenceIndex: quote.occurrenceIndex,
          objectKey,
          semanticTags: ['dialogue'],
        });
      }
    }

    const completedArtifacts = await runBounded(
      [...artifactRequests].map(([objectKey, request]) => async () => {
        try {
          if (!await input.objectStore.has(objectKey)) {
            const bytes = await input.provider.synthesize({
              providerVoiceId: request.providerVoiceId,
              text: request.spokenText,
            });
            await input.objectStore.put({
              objectKey,
              bytes,
              checksumSha256: createHash('sha256').update(bytes).digest('hex'),
            });
          }
          return [objectKey, input.objectStore.publicUrl(objectKey)] as const;
        } catch (error) {
          input.onError?.(error);
          return [objectKey, null] as const;
        }
      }),
      MAX_CONCURRENT_ARTIFACTS,
    );
    const publicUrls = new Map(completedArtifacts);
    return pending.flatMap(({ objectKey, ...candidate }) => {
      const publicUrl = publicUrls.get(objectKey);
      return publicUrl ? [{ ...candidate, publicUrl }] : [];
    });
  };
}

/** Create the production adapter only when every private provider/storage input exists. */
export function createConfiguredDialogueArtifactResolver(
  environment: DialogueAudioEnvironment,
  dependencies: DialogueArtifactResolverDependencies = {},
): DialogueArtifactResolver | undefined {
  const config = loadDialogueAudioConfig(environment);
  if (!config) return undefined;
  return createDialogueArtifactResolver({
    model: config.elevenLabsModel,
    objectStore: dependencies.objectStore ?? new R2DialogueAudioArtifactStore(config.r2),
    provider: dependencies.provider ?? new ElevenLabsDialogueSpeechProvider(
      config.elevenLabsApiKey,
      config.elevenLabsModel,
      config.elevenLabsTimeoutMs,
      dependencies.fetch,
    ),
    onError: dependencies.onError,
  });
}
