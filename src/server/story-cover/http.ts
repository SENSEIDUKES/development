import type { StoryCoverRequest } from '@seihouse/library/stories';
import { createModelRouter, DEFAULT_IMAGE_MODEL, IMAGE_MODELS, ModelRouterError } from '@seihouse/library/model-router-server';
import { MODEL_PROVIDERS, providerKey, type ModelEnvironment } from '../model-router/catalog';
import { buildStoryCoverPrompt, STORY_COVER_ASPECT_RATIO, STORY_COVER_FIELD_LIMITS } from './prompt';

export interface StoryCoverHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface StoryCoverHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface StoryCoverHttpDependencies {
  environment: ModelEnvironment;
  /** Tests supply the provider; the server uses the Model Router. */
  generate?: ReturnType<typeof createModelRouter>['generate'];
  onError?: (error: unknown) => void;
  /** One line per cover: which model made it and how long it took. Never the story. */
  onAnswer?: (answer: { model: string; durationMs: number }) => void;
}

export { STORY_COVER_VISITOR_LIMIT } from './limits';

/** A cover is one image; Nano Banana 2 usually answers in well under a minute. */
export const STORY_COVER_TIMEOUT_MS = 120_000;

const LIMITS = STORY_COVER_FIELD_LIMITS;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const errorResponse = (status: number, error: string): StoryCoverHttpResponse => ({
  status, body: { error }, headers: { 'Cache-Control': 'no-store' },
});

const clip = (value: unknown, limit: number): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error('Each cover field must be text.');
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, limit) : undefined;
};

/** Reads a cover request: the story's own words, each clipped to its limit, and an optional model. */
const parseRequest = (body: unknown): { story: StoryCoverRequest; model?: string } => {
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  if (!isRecord(parsed) || !isRecord(parsed.story)) throw new Error('The cover request must contain the story.');
  const source = parsed.story;
  const title = clip(source.title, LIMITS.title);
  if (!title) throw new Error('The cover request needs the story\'s title.');
  const story: StoryCoverRequest = { title };
  for (const field of ['genre', 'style', 'synopsis', 'mainCharacter', 'tone', 'world'] as const) {
    const text = clip(source[field], LIMITS[field]);
    if (text) story[field] = text;
  }
  if (source.tags !== undefined) {
    if (!Array.isArray(source.tags)) throw new Error('Story tags must be a list.');
    const tags = source.tags.slice(0, LIMITS.tags).flatMap(tag => clip(tag, LIMITS.tag) ?? []);
    if (tags.length) story.tags = tags;
  }
  if (parsed.model !== undefined && typeof parsed.model !== 'string') throw new Error('Choose an image model from the Model Router.');
  return { story, ...(parsed.model ? { model: parsed.model as string } : {}) };
};

/**
 * The story cover route: one image made from the story's own words, with the
 * image model chosen in the Model Router (Nano Banana 2 when none is). The
 * reply is the image itself, in base64; the host keeps it.
 */
export async function handleStoryCoverHttp(
  request: StoryCoverHttpRequest,
  dependencies: StoryCoverHttpDependencies,
): Promise<StoryCoverHttpResponse> {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method !== 'POST') return { ...errorResponse(405, 'Method not allowed.'), headers: { Allow: 'POST', 'Cache-Control': 'no-store' } };
  let parsed: ReturnType<typeof parseRequest>;
  try {
    parsed = parseRequest(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON request.';
    return errorResponse(400, message === 'Unexpected end of JSON input' ? 'The cover request body is empty.' : message);
  }
  const model = parsed.model ?? (dependencies.environment.STORY_COVER_DEFAULT_MODEL?.trim() || DEFAULT_IMAGE_MODEL);
  const option = IMAGE_MODELS.find(item => item.id === model);
  if (!option || (option.provider !== 'gemini' && option.provider !== 'openrouter')) return errorResponse(400, `Model '${model}' cannot make covers.`);
  const key = providerKey(dependencies.environment, option.provider);
  if (!key) return errorResponse(503, `${MODEL_PROVIDERS[option.provider].keyVariable} is not configured on the Development server.`);

  const generate = dependencies.generate ?? createModelRouter({ credentials: { [option.provider]: key } }).generate;
  const started = Date.now();
  try {
    const result = await generate({
      capability: 'image', model, prompt: buildStoryCoverPrompt(parsed.story), aspectRatio: STORY_COVER_ASPECT_RATIO, timeoutMs: STORY_COVER_TIMEOUT_MS,
    });
    if (result.capability !== 'image') throw new ModelRouterError('provider-error', 'The configured model returned no image.');
    dependencies.onAnswer?.({ model, durationMs: Date.now() - started });
    return { status: 200, body: { image: result.data, mimeType: result.mimeType, model }, headers: { 'Cache-Control': 'no-store' } };
  } catch (error) {
    dependencies.onError?.(error);
    if (error instanceof ModelRouterError && error.code === 'timeout') {
      return errorResponse(502, `The cover was still being made after ${Math.ceil(STORY_COVER_TIMEOUT_MS / 1000)} seconds, so it was stopped. Try again, or choose another image model in the Model Router.`);
    }
    return errorResponse(502, 'The cover could not be made. Nothing was changed; please try again.');
  }
}
