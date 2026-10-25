/**
 * The Story Spark route: one whole Origin (premise, genre, title, tradition and
 * Pressure) for a writer facing a blank
 * Story Seed, from the server's default text model. GET reports whether a
 * model is configured, so the page can fall back to its own sparks.
 */
import { parseStorySpark, parseStorySparkRequest, type StorySparkRequest } from '@seihouse/sen/story-seed';
import { resolveHarnessGenerationConfig, type HarnessGenerationEnvironment } from '../harness-generation/config';
import { createHarnessTextProvider, type HarnessTextModelProvider } from '../harness-generation/provider';
import { missingKeyMessage, textModelProvider } from '../model-router/catalog';
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
  onError?: (error: unknown) => void;
}

const noStore = { 'Cache-Control': 'no-store' } as const;
const reply = (status: number, body: unknown, headers: Record<string, string> = {}): StorySparkHttpResponse =>
  ({ status, body, headers: { ...noStore, ...headers } });

/** A spark is small: answers stay short and quick. */
const SPARK_MAX_OUTPUT_TOKENS = 1_024;
const SPARK_TIMEOUT_MS = 45_000;

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
    return reply(200, parseStorySpark(JSON.parse(raw), parsed));
  } catch (error) {
    dependencies.onError?.(error);
    return reply(502, { error: 'The Dao was silent. Seek again.' });
  }
};
