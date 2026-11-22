/**
 * The Story Spark route: one whole Origin (premise, genre, title, tradition and
 * Pressure) for a writer facing a blank
 * Story Seed, from the server's default text model. GET reports whether a
 * model is configured, so the page can fall back to its own sparks.
 */
import { decodeFingerprint, encodeFingerprint, packFingerprint } from '@seihouse/sen/meaning-engine';
import {
  loadStoryTagFingerprints, parseStorySpark, parseStorySparkRequest, STORY_SPARK_SUGGESTED_TAGS, suggestStoryTags,
  type StorySpark, type StorySparkRequest,
} from '@seihouse/sen/story-seed';
import { resolveHarnessGenerationConfig, type HarnessGenerationEnvironment } from '../harness-generation/config';
import { createHarnessTextProvider, type HarnessTextModelProvider } from '../harness-generation/provider';
import { DEFAULT_MEANING_MODEL, missingKeyMessage, providerKey, textModelProvider } from '../model-router/catalog';
import { fingerprintWithOpenRouter } from '../model-router/openRouter';
import { buildStorySparkPrompt, STORY_SPARK_RESPONSE_SCHEMA } from './prompt';

export interface StorySparkHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface StorySparkHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface StorySparkHttpDependencies {
  environment: HarnessGenerationEnvironment;
  providerFactory?: (input: { apiKey: string; model: string }) => HarnessTextModelProvider;
  /** The premise's embedding vector, for tests; the Meaning model serves it otherwise. */
  fingerprint?: (input: { apiKey: string; model: string; texts: string[] }) => Promise<number[][]>;
  onError?: (error: unknown) => void;
}

const noStore = { 'Cache-Control': 'no-store' } as const;
const reply = (status: number, body: unknown, headers: Record<string, string> = {}): StorySparkHttpResponse =>
  ({ status, body, headers: { ...noStore, ...headers } });

/** A spark is small: answers stay short and quick. */
const SPARK_MAX_OUTPUT_TOKENS = 1_024;
const SPARK_TIMEOUT_MS = 45_000;
/** Tags are a courtesy on top of the spark: never keep a writer waiting for them. */
const SPARK_TAGS_TIMEOUT_MS = 8_000;
/**
 * The whole answer, writing and tags together, stays inside the browser's 50
 * second wait (`storySparkClient`): a spark that was written is never thrown
 * away because its tags were slow.
 */
const SPARK_TOTAL_BUDGET_MS = 47_000;
const SPARK_TAGS_MINIMUM_MS = 1_000;

/**
 * The spark with the Story Tag engine's suggestions for its premise, read by
 * meaning: the tags a planted spark starts with, beside the writer's own. With
 * no Meaning model, or when it does not answer, the spark goes out without
 * them and planting falls back to the genre and the words of the premise.
 */
const withSuggestedTags = async (spark: StorySpark, dependencies: StorySparkHttpDependencies, budgetMs: number): Promise<StorySpark> => {
  const { suggestedTags: _fromTheWriter, ...plain } = spark;
  const apiKey = providerKey(dependencies.environment, 'openrouter');
  const timeoutMs = Math.min(SPARK_TAGS_TIMEOUT_MS, budgetMs);
  if (!apiKey || timeoutMs < SPARK_TAGS_MINIMUM_MS) return plain;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const outOfTime = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Spark tags ran out of time.')), timeoutMs); });
  try {
    const request = { apiKey, model: DEFAULT_MEANING_MODEL, texts: [spark.premise] };
    const [[vector], tags] = await Promise.race([Promise.all([
      dependencies.fingerprint ? dependencies.fingerprint(request) : fingerprintWithOpenRouter({ ...request, timeoutMs }),
      loadStoryTagFingerprints(),
    ]), outOfTime]);
    // Packed and read back exactly as a browser would receive it, so both suggest the same tags.
    const synopsis = decodeFingerprint(encodeFingerprint(packFingerprint(vector)));
    const suggestedTags = suggestStoryTags({
      synopsis: spark.premise, genre: spark.genre, style: spark.style, picked: spark.tags,
      limit: STORY_SPARK_SUGGESTED_TAGS, meaning: { tags, synopsis },
    }).map(tag => tag.label);
    return suggestedTags.length ? { ...plain, suggestedTags } : plain;
  } catch (error) {
    dependencies.onError?.(error);
    return plain;
  } finally {
    clearTimeout(timer);
  }
};

export const handleStorySparkHttp = async (
  request: StorySparkHttpRequest,
  dependencies: StorySparkHttpDependencies,
): Promise<StorySparkHttpResponse> => {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method !== 'GET' && method !== 'POST') return reply(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST' });

  let config: ReturnType<typeof resolveHarnessGenerationConfig>;
  try {
    config = resolveHarnessGenerationConfig(dependencies.environment);
  } catch (error) {
    dependencies.onError?.(error);
    return reply(503, { error: 'The spark model configuration is invalid.' });
  }
  const model = config.defaultModel;
  const provider = textModelProvider(model);
  const apiKey = provider ? config.keys[provider] : undefined;
  if (method === 'GET') return reply(200, { configured: Boolean(apiKey) });

  let parsed: StorySparkRequest;
  try {
    parsed = parseStorySparkRequest(typeof request.body === 'string' ? JSON.parse(request.body) : request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid spark request.';
    return reply(400, { error: message === 'Unexpected end of JSON input' ? 'The spark request body is empty.' : message });
  }
  if (!apiKey) return reply(503, { error: missingKeyMessage(model) });

  const startedAt = Date.now();
  try {
    const textProvider = dependencies.providerFactory
      ? dependencies.providerFactory({ apiKey, model })
      : createHarnessTextProvider(model, config);
    const result = await textProvider.generate({
      ...buildStorySparkPrompt(parsed),
      // Sparks are meant to surprise; shaping a writer's idea stays closer to it.
      temperature: parsed.idea ? 0.8 : 1.1,
      maxOutputTokens: SPARK_MAX_OUTPUT_TOKENS,
      timeoutMs: SPARK_TIMEOUT_MS,
      responseJsonSchema: STORY_SPARK_RESPONSE_SCHEMA,
    });
    const raw = result.rawProviderResponse.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    return reply(200, await withSuggestedTags(parseStorySpark(JSON.parse(raw), parsed), dependencies, SPARK_TOTAL_BUDGET_MS - (Date.now() - startedAt)));
  } catch (error) {
    dependencies.onError?.(error);
    return reply(502, { error: 'The Dao was silent. Seek again.' });
  }
};
